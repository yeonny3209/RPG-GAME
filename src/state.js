// 게임 전체 상태 (레벨, 골드, 인벤토리, 퀘스트, 진행 플래그)와 저장/불러오기

import { ITEMS } from './data/items.js';
import { LEVELS } from './data/monsters.js';
import { SAVE_KEY, MAX_LEVEL, INVENTORY_SIZE, STACK_MAX } from './config.js';

// 화면(UI)에 알림을 보내는 통로: bus.emit('toast', '문구') 등
export const bus = new Phaser.Events.EventEmitter();

function fresh() {
  return {
    level: 1,
    exp: 0,
    hp: 50,
    mp: 20,
    gold: 0,
    inventory: [{ id: 'red_potion', count: 2 }],
    equipment: { weapon: 'wood_sword', armor: 'cloth' },
    quests: {},        // id -> 'active' | 'ready' | 'done'
    progress: {},      // id -> 숫자 (예: 슬라임 처치 수)
    flags: {},         // 진행 상황 기록
    map: 'village',
    spawn: 'home',
    pos: null,         // 저장 시점의 정확한 위치 { x, y }
    playTime: 0,       // 밀리초
  };
}

export const G = fresh();

export function newGame() {
  for (const k of Object.keys(G)) delete G[k];
  Object.assign(G, fresh());
}

// ---------------------------------------------------------------- 능력치

export function maxHp() { return 50 + 12 * (G.level - 1); }
export function maxMp() { return 20 + 4 * (G.level - 1); }
export function atk() { return 5 + 2 * (G.level - 1) + (ITEMS[G.equipment.weapon]?.atk || 0); }
export function def() { return 2 + (G.level - 1) + (ITEMS[G.equipment.armor]?.def || 0); }

// 다음 레벨까지 필요한 누적 경험치 (최대 레벨이면 null)
export function nextExp() { return G.level >= MAX_LEVEL ? null : LEVELS[G.level]; }
export function prevExp() { return G.level <= 1 ? 0 : LEVELS[G.level - 1]; }

export function addExp(n) {
  if (G.level >= MAX_LEVEL) return 0;
  G.exp += n;
  let gained = 0;
  while (G.level < MAX_LEVEL && G.exp >= LEVELS[G.level]) {
    G.level++;
    gained++;
  }
  if (gained) {
    G.hp = maxHp();
    G.mp = maxMp();
  }
  return gained;
}

export function restoreMp(n) {
  const before = G.mp;
  G.mp = Math.min(maxMp(), G.mp + n);
  return G.mp - before;
}

export function heal(n) {
  const before = G.hp;
  G.hp = Math.min(maxHp(), G.hp + n);
  return G.hp - before;
}

export function calcDamage(attack, defense) {
  const base = Math.max(1, attack - defense / 2);
  return Math.max(1, Math.round(base * Phaser.Math.FloatBetween(0.9, 1.1)));
}

// ---------------------------------------------------------------- 인벤토리

export function countItem(id) {
  return G.inventory.filter((s) => s.id === id).reduce((a, s) => a + s.count, 0);
}

export function hasItem(id) {
  return countItem(id) > 0 || G.equipment.weapon === id || G.equipment.armor === id;
}

export function canAdd(id, count = 1) {
  const stackable = ITEMS[id].type === 'consumable';
  if (stackable) {
    const s = G.inventory.find((x) => x.id === id && x.count < STACK_MAX);
    if (s && s.count + count <= STACK_MAX) return true;
  }
  return G.inventory.length < INVENTORY_SIZE;
}

export function addItem(id, count = 1) {
  if (!canAdd(id, count)) return false;
  if (ITEMS[id].type === 'consumable') {
    const s = G.inventory.find((x) => x.id === id && x.count + count <= STACK_MAX);
    if (s) s.count += count;
    else G.inventory.push({ id, count });
  } else {
    for (let i = 0; i < count; i++) G.inventory.push({ id, count: 1 });
  }
  return true;
}

export function removeItem(id, count = 1) {
  for (let i = G.inventory.length - 1; i >= 0 && count > 0; i--) {
    const s = G.inventory[i];
    if (s.id !== id) continue;
    const take = Math.min(count, s.count);
    s.count -= take;
    count -= take;
    if (s.count <= 0) G.inventory.splice(i, 1);
  }
}

// 인벤토리 칸 번호의 장비를 장착. 원래 장비는 그 칸으로 돌아간다.
export function equipFromSlot(index) {
  const s = G.inventory[index];
  if (!s) return false;
  const it = ITEMS[s.id];
  const slot = it.type === 'weapon' ? 'weapon' : it.type === 'armor' ? 'armor' : null;
  if (!slot) return false;
  const old = G.equipment[slot];
  G.equipment[slot] = s.id;
  if (old) G.inventory[index] = { id: old, count: 1 };
  else G.inventory.splice(index, 1);
  return true;
}

// 받은 장비가 지금 것보다 좋으면 바로 장착
export function equipIfBetter(id) {
  const it = ITEMS[id];
  const slot = it.type === 'weapon' ? 'weapon' : 'armor';
  const stat = slot === 'weapon' ? 'atk' : 'def';
  const cur = ITEMS[G.equipment[slot]];
  if (cur && cur[stat] >= it[stat]) return false;
  const idx = G.inventory.findIndex((s) => s.id === id);
  if (idx < 0) return false;
  return equipFromSlot(idx);
}

// ---------------------------------------------------------------- 퀘스트

export function questState(id) { return G.quests[id] || 'none'; }

export function startQuest(id) {
  G.quests[id] = 'active';
  G.progress[id] = 0;
}

// ---------------------------------------------------------------- 저장

export function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, data: G }));
    return true;
  } catch (e) {
    return false;
  }
}

export function hasSave() {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch (e) {
    return false;
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    newGame();
    Object.assign(G, parsed.data);
    G.hp = Math.min(Math.max(1, G.hp), maxHp());
    G.mp = Math.min(G.mp ?? maxMp(), maxMp()); // 예전 저장 데이터에는 MP가 없을 수 있다
    return true;
  } catch (e) {
    return false;
  }
}
