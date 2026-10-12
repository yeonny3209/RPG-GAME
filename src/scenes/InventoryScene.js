// 가방: 아이템 보기, 포션 사용, 장비 장착

import { GAME_W, GAME_H, INVENTORY_SIZE } from '../config.js';
import { ITEMS } from '../data/items.js';
import { G, maxHp, maxMp, atk, def, nextExp, equipFromSlot } from '../state.js';
import { text, panel, icon, bindMenuKeys, COLORS, josa } from '../ui.js';
import { sfx } from '../audio.js';

const COLS = 5;
const SLOT = 88;
const GX = 190;
const GY = 170;

export class InventoryScene extends Phaser.Scene {
  constructor() {
    super('Inventory');
  }

  create() {
    this.sel = 0;
    this.msg = '';
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.55).setOrigin(0);
    panel(this, 140, 70, 1000, 590);
    text(this, 180, 96, '가방', { size: 32, bold: true, color: COLORS.gold });
    text(this, GAME_W - 180, 108, '방향키: 선택   E: 사용/장착   I·Esc: 닫기', { size: 16, color: COLORS.dim, origin: [1, 0] });

    // 빈 칸 그리기
    const g = this.add.graphics();
    for (let i = 0; i < INVENTORY_SIZE; i++) {
      const x = GX + (i % COLS) * SLOT;
      const y = GY + Math.floor(i / COLS) * SLOT;
      g.fillStyle(COLORS.panelInner, 1);
      g.fillRoundedRect(x, y, SLOT - 10, SLOT - 10, 8);
    }
    this.cursor = this.add.graphics();
    this.dyn = this.add.container(0, 0);

    bindMenuKeys(this, {
      up: () => this.move(-COLS),
      down: () => this.move(COLS),
      left: () => this.move(-1),
      right: () => this.move(1),
      ok: () => this.use(),
      cancel: () => this.close(),
      extra: { I: () => this.close() },
    });
    this.redraw();
  }

  move(d) {
    const n = this.sel + d;
    if (n < 0 || n >= INVENTORY_SIZE) return;
    if (Math.abs(d) === 1 && Math.floor(n / COLS) !== Math.floor(this.sel / COLS)) return;
    this.sel = n;
    this.msg = '';
    sfx.cursor();
    this.redraw();
  }

  use() {
    const W = this.scene.get('World');
    const s = G.inventory[this.sel];
    if (!s) { sfx.error(); return; }
    const it = ITEMS[s.id];
    if (it.type === 'consumable') {
      if (it.warp) {
        this.close();
        W.useFeather();
        return;
      }
      if (it.mana) {
        if (W.useManaPotion(s.id)) this.msg = `${josa(it.name, '을', '를')} 마셨다.`;
        else { this.msg = 'MP가 이미 가득 차 있다.'; sfx.error(); }
      } else if (W.usePotion(s.id)) this.msg = `${josa(it.name, '을', '를')} 마셨다.`;
      else { this.msg = 'HP가 이미 가득 차 있다.'; sfx.error(); }
    } else if (it.type === 'weapon' || it.type === 'armor') {
      equipFromSlot(this.sel);
      sfx.select();
      this.msg = `${josa(it.name, '을', '를')} 장착했다.`;
    } else {
      this.msg = '중요한 물건이다. 소중히 간직하자.';
    }
    this.redraw();
  }

  redraw() {
    this.dyn.removeAll(true);
    const add = (o) => { this.dyn.add(o); return o; };

    G.inventory.forEach((s, i) => {
      const x = GX + (i % COLS) * SLOT + (SLOT - 10) / 2;
      const y = GY + Math.floor(i / COLS) * SLOT + (SLOT - 10) / 2;
      add(icon(this, x, y, 'icon_' + s.id, 3));
      if (s.count > 1) add(text(this, x + 34, y + 34, String(s.count), { size: 17, bold: true, origin: [1, 1], stroke: '#000', strokeThickness: 4 }));
    });

    const cx = GX + (this.sel % COLS) * SLOT;
    const cy = GY + Math.floor(this.sel / COLS) * SLOT;
    this.cursor.clear();
    this.cursor.lineStyle(4, 0xffd25a, 1);
    this.cursor.strokeRoundedRect(cx - 2, cy - 2, SLOT - 6, SLOT - 6, 9);

    // 오른쪽: 장비와 능력치
    const RX = 690;
    add(text(this, RX, 168, '장비', { size: 22, bold: true, color: COLORS.gold }));
    [['weapon', '무기'], ['armor', '방어구']].forEach(([slot, label], i) => {
      const y = 222 + i * 70;
      const id = G.equipment[slot];
      const g = add(this.add.graphics());
      g.fillStyle(COLORS.panelInner, 1);
      g.fillRoundedRect(RX, y - 28, 56, 56, 8);
      if (id) add(icon(this, RX + 28, y, 'icon_' + id, 2.6));
      add(text(this, RX + 74, y - 22, label, { size: 15, color: COLORS.dim }));
      add(text(this, RX + 74, y - 2, id ? ITEMS[id].name : '없음', { size: 21, bold: true }));
    });

    const ne = nextExp();
    const stats = [
      ['레벨', G.level],
      ['HP', `${G.hp} / ${maxHp()}`],
      ['MP', `${G.mp} / ${maxMp()}`],
      ['공격력', atk()],
      ['방어력', def()],
      ['경험치', ne === null ? `${G.exp} (MAX)` : `${G.exp} / ${ne}`],
      ['골드', `${G.gold} G`],
    ];
    stats.forEach(([k, v], i) => {
      const y = 360 + i * 30;
      add(text(this, RX, y, k, { size: 19, color: COLORS.dim }));
      add(text(this, RX + 300, y, String(v), { size: 19, bold: true, origin: [1, 0] }));
    });

    // 아래: 선택한 아이템 설명
    const s = G.inventory[this.sel];
    let title = '';
    let desc = '빈 칸';
    let extra = '';
    if (s) {
      const it = ITEMS[s.id];
      title = it.name + (s.count > 1 ? `  x${s.count}` : '');
      desc = it.desc;
      if (it.type === 'weapon') {
        const now = atk();
        const after = now - (ITEMS[G.equipment.weapon]?.atk || 0) + it.atk;
        extra = `공격력 ${now} → ${after}`;
        this.extraColor = after > now ? COLORS.good : after < now ? COLORS.bad : COLORS.text;
      } else if (it.type === 'armor') {
        const now = def();
        const after = now - (ITEMS[G.equipment.armor]?.def || 0) + it.def;
        extra = `방어력 ${now} → ${after}`;
        this.extraColor = after > now ? COLORS.good : after < now ? COLORS.bad : COLORS.text;
      }
    }
    const DY = 548;
    add(text(this, GX, DY, title, { size: 22, bold: true, color: COLORS.gold }));
    add(text(this, GX, DY + 34, desc, { size: 18, wrap: 440 }));
    if (extra) add(text(this, RX, 584, extra, { size: 19, bold: true, color: this.extraColor }));
    if (this.msg) add(text(this, RX, 614, this.msg, { size: 18, color: COLORS.accent, wrap: 380 }));
  }

  close() {
    sfx.cancel();
    this.scene.resume('World');
    this.scene.stop();
  }
}
