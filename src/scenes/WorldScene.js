// 실제 게임 플레이 화면: 맵, 주인공, 몬스터, NPC, 상자, 출구

import { TILE, ZOOM, FONT, DEBUG, INN_PRICE, FROST_MIN_LEVEL } from '../config.js';
import { MAPS, LEGEND, T } from '../data/maps.js';
import { ITEMS } from '../data/items.js';
import { talk, NARRATION } from '../data/story.js';
import {
  G, bus, maxHp, def, calcDamage, addExp, heal, addItem, canAdd, countItem, removeItem,
  equipIfBetter, questState, hasItem, save, atk,
} from '../state.js';
import { sfx, playMusic, stopMusic, toggleMute } from '../audio.js';
import { josa } from '../ui.js';
import { Player, DIR } from '../objects/Player.js';
import { Monster } from '../objects/Monster.js';
import { Boss, BOSSES } from '../objects/Boss.js';
import { NPC } from '../objects/NPC.js';

const tileCenter = (t) => (t + 0.5) * TILE;

export class WorldScene extends Phaser.Scene {
  constructor() {
    super('World');
  }

  init(data) {
    this.mapId = data.map || G.map || 'village';
    this.spawnName = data.spawn || G.spawn;
    this.usePos = !!data.usePos;
  }

  create() {
    const mapDef = MAPS[this.mapId];
    this.mapDef = mapDef;
    G.map = this.mapId;
    this.transitioning = false;
    this.inputLockUntil = this.game.loop.time + 250;
    this.interactables = [];
    this.npcList = [];
    this.spikes = [];
    this.rocks = [];
    this.lastHint = undefined;
    this.boss = null;
    this.bossActive = false;
    this.godMode = this.godMode || false;

    this.buildMap();

    this.monsters = this.physics.add.group();
    this.npcs = this.physics.add.group();
    this.solids = this.physics.add.staticGroup();
    this.pickups = this.physics.add.group();
    this.orbs = this.physics.add.group();

    // 주인공
    const sp = mapDef.spawns[this.spawnName] || Object.values(mapDef.spawns)[0];
    let px = tileCenter(sp[0]);
    let py = tileCenter(sp[1]);
    if (this.usePos && G.pos) ({ x: px, y: py } = G.pos);
    this.player = new Player(this, px, py);
    if (this.spawnName === 'north' || this.spawnName === 'chief') this.player.facing = 'down';
    if (this.spawnName === 'south') this.player.facing = 'up';
    this.player.anim('idle');
    G.pos = null;

    this.createEntities();
    this.createExits();

    // 충돌
    this.physics.add.collider(this.player, this.top);
    this.physics.add.collider(this.player, this.solids);
    this.physics.add.collider(this.player, this.npcs);
    this.physics.add.collider(this.monsters, this.top);
    this.physics.add.collider(this.monsters, this.solids);
    this.physics.add.collider(this.npcs, this.top);
    this.physics.add.collider(this.npcs, this.solids);
    this.physics.add.overlap(this.player, this.monsters, (p, m) => this.onTouchMonster(m));
    this.physics.add.overlap(this.player, this.pickups, (p, it) => this.collect(it));
    this.physics.add.overlap(this.player, this.orbs, (p, o) => {
      if (this.player.hurt(calcDamage(o.dmg, def()), o.x, o.y)) o.destroy();
    });
    this.physics.add.collider(this.orbs, this.top, (o) => o.destroy());

    // 카메라
    const cam = this.cameras.main;
    cam.setZoom(ZOOM);
    cam.setBounds(0, 0, this.mapW, this.mapH);
    cam.startFollow(this.player, true, 0.2, 0.2);
    cam.setRoundPixels(true);
    const BG = { cave: '#120e1a', throne: '#120e1a', swamp: '#2a3a2a', frost: '#c8d4e0' };
    cam.setBackgroundColor(BG[this.mapId] || '#2a5a2a');
    cam.fadeIn(300, 0, 0, 0);

    this.setupInput();
    this.createParticles();

    if (!this.scene.isActive('UI')) this.scene.launch('UI');
    this.time.delayedCall(50, () => bus.emit('mapEnter', mapDef.name));

    playMusic(mapDef.bgm);

    if (!G.flags.intro_done) {
      G.flags.intro_done = true;
      this.time.delayedCall(600, () => this.say(NARRATION.intro, () => {
        this.toast('방향키: 이동   스페이스: 공격   E: 말 걸기   I: 가방   Esc: 메뉴');
      }));
    }

    window.world = this; // 개발자 도구에서 확인용
  }

  // ---------------------------------------------------------------- 맵

  buildMap() {
    const rows = this.mapDef.rows;
    const h = rows.length;
    const w = rows[0].length;
    const map = this.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: w, height: h });
    const ts = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 1, 2);
    this.ground = map.createBlankLayer('ground', ts).setDepth(-20);
    this.top = map.createBlankLayer('top', ts).setDepth(-10);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const L = LEGEND[rows[y][x]] || LEGEND['.'];
        let g = L.g;
        const hash = (x * 73856093) ^ (y * 19349663);
        if (g === T.grass && Math.abs(hash) % 3 === 0) g = T.grass2;
        if (g === T.caveFloor && Math.abs(hash) % 4 === 0) g = T.caveFloor2;
        this.ground.putTileAt(g, x, y);
        if (L.t !== undefined) this.top.putTileAt(L.t, x, y);
      }
    }
    this.top.setCollisionByExclusion([-1]);
    this.mapW = w * TILE;
    this.mapH = h * TILE;
    this.physics.world.setBounds(0, 0, this.mapW, this.mapH);
  }

  createEntities() {
    const d = this.mapDef;
    const f = G.flags;

    for (const n of d.npcs) {
      if (n.flag && !f[n.flag]) continue;
      if (n.notFlag && f[n.notFlag]) continue;
      const npc = new NPC(this, tileCenter(n.x), tileCenter(n.y) - 2, n.id);
      this.npcs.add(npc);
      npc.body.setImmovable(true);
      this.npcList.push(npc);
      this.interactables.push({ kind: 'npc', obj: npc, r: 14 });
    }

    for (const m of d.monsters) this.spawnMonster(m.type, tileCenter(m.x), tileCenter(m.y));

    for (const c of d.chests) {
      const opened = !!f['chest_' + c.id];
      const img = this.solids.create(tileCenter(c.x), tileCenter(c.y), 'chest', opened ? 1 : 0);
      img.setDepth(img.y);
      img.chest = c;
      if (!opened) this.interactables.push({ kind: 'chest', obj: img, r: 14 });
    }

    if (d.rocks && !f.rock_removed) {
      for (const r of d.rocks) {
        const img = this.solids.create(tileCenter(r.x), tileCenter(r.y), 'rock', 0);
        img.setDepth(img.y);
        this.rocks.push(img);
      }
    }

    if (d.door && !f.door_open) {
      const door = this.solids.create((d.door.x + 1) * TILE, tileCenter(d.door.y), 'door', 0);
      door.setDepth(door.y);
      this.door = door;
      this.interactables.push({ kind: 'door', obj: door, r: 20 });
    }

    if (d.spikes) {
      d.spikes.forEach((s, i) => {
        const img = this.add.image(tileCenter(s.x), tileCenter(s.y), 'spikes', 0).setDepth(-5);
        img.up = false;
        img.phase = (s.x + s.y) % 2;
        this.spikes.push(img);
      });
      this.spikeTick = 0;
      this.time.addEvent({ delay: 1100, loop: true, callback: () => this.toggleSpikes() });
    }

    if (d.boss) {
      const kind = d.boss.kind;
      if (!f[BOSSES[kind].flag]) {
        this.boss = new Boss(this, tileCenter(d.boss.x), tileCenter(d.boss.y), kind);
        this.monsters.add(this.boss);
      } else if (kind === 'boss' && !f.crown) {
        this.spawnCrown(tileCenter(d.boss.x), tileCenter(d.boss.y) + 8);
      }
    }

    for (const hb of d.herbs || []) {
      if (f[hb.id]) continue;
      const img = this.add.sprite(tileCenter(hb.x), tileCenter(hb.y), 'herb', 0).setDepth(tileCenter(hb.y));
      img.play('herb-move');
      img.herbId = hb.id;
      this.interactables.push({ kind: 'herb', obj: img, r: 14 });
    }
  }

  // 날씨 효과: 눈 / 반딧불
  createParticles() {
    const kind = this.mapDef.particles;
    if (!kind) return;
    if (kind === 'snow') {
      this.add.particles(0, 0, 'snowflake', {
        x: { min: 0, max: this.mapW }, y: -4,
        lifespan: 12000, speedY: { min: 14, max: 26 }, speedX: { min: -8, max: 4 },
        alpha: { start: 0.9, end: 0.4 }, quantity: 2, frequency: 90,
      }).setDepth(9800);
    } else if (kind === 'fireflies') {
      this.add.particles(0, 0, 'firefly', {
        x: { min: 0, max: this.mapW }, y: { min: 0, max: this.mapH },
        lifespan: 4000, speedX: { min: -6, max: 6 }, speedY: { min: -6, max: 6 },
        alpha: { values: [0, 1, 0] },
        quantity: 1, frequency: 120,
      }).setDepth(9800);
    }
  }

  createExits() {
    for (const e of this.mapDef.exits) {
      const z = this.add.zone(e.x * TILE, e.y * TILE, e.w * TILE, e.h * TILE).setOrigin(0);
      this.physics.add.existing(z, true);
      this.physics.add.overlap(this.player, z, () => this.onExit(e));
    }
  }

  spawnMonster(type, x, y) {
    const m = new Monster(this, x, y, type);
    this.monsters.add(m);
    return m;
  }

  // ---------------------------------------------------------------- 입력

  setupInput() {
    const kb = this.input.keyboard;
    this.keys = kb.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', w: 'W', a: 'A', s: 'S', d: 'D',
    });
    kb.on('keydown-SPACE', () => this.attack());
    kb.on('keydown-J', () => this.attack());
    kb.on('keydown-E', () => this.interact());
    kb.on('keydown-ENTER', () => this.interact());
    kb.on('keydown-I', () => this.openOverlay('Inventory'));
    kb.on('keydown-Q', () => this.openOverlay('Quest'));
    kb.on('keydown-ESC', () => this.openOverlay('Pause'));
    kb.on('keydown-ONE', () => { if (this.canAct()) this.quickPotion(); });
    kb.on('keydown-M', () => this.toast(toggleMute() ? '소리를 껐다 (M)' : '소리를 켰다 (M)'));

    this.events.on('resume', () => {
      kb.resetKeys();
      this.inputLockUntil = this.game.loop.time + 200;
      this.player.stop();
    });

    if (DEBUG) {
      kb.on('keydown-K', () => { this.gainExp(50); });
      kb.on('keydown-G', () => { G.gold += 500; this.toast('[디버그] +500G'); });
      kb.on('keydown-N', () => { this.godMode = !this.godMode; this.toast('[디버그] 무적 ' + (this.godMode ? '켜짐' : '꺼짐')); });
      kb.on('keydown-H', () => { G.hp = maxHp(); });
      kb.on('keydown-T', () => {
        const order = ['village', 'forest', 'swamp', 'cave', 'throne', 'frost'];
        const next = order[(order.indexOf(this.mapId) + 1) % order.length];
        this.changeMap(next, Object.keys(MAPS[next].spawns)[0]);
      });
    }
  }

  canAct() {
    return !this.transitioning && !this.player.dead && this.game.loop.time >= this.inputLockUntil;
  }

  // ---------------------------------------------------------------- 매 프레임

  update(time, delta) {
    G.playTime += delta;
    const k = this.keys;
    const ix = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    const iy = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    if (this.transitioning) this.player.setVelocity(0);
    else this.player.move(ix, iy, time);
    this.player.setDepth(this.player.y);

    for (const m of this.monsters.getChildren().slice()) m.update(time, delta);
    for (const n of this.npcList) if (n.active) n.update(time);

    for (const s of this.spikes) {
      if (s.up && Math.abs(s.x - this.player.x) < 8 && Math.abs(s.y - this.player.footY) < 7) {
        this.player.hurt(calcDamage(20, def()), s.x, s.y - 10);
      }
    }

    // 상호작용 안내
    const t = this.canAct() ? this.findInteractable() : null;
    const hint = t ? (t.kind === 'npc' ? 'E  말 걸기' : t.kind === 'chest' ? 'E  상자 열기' : t.kind === 'herb' ? 'E  살펴보기' : 'E  조사하기') : null;
    if (hint !== this.lastHint) {
      this.lastHint = hint;
      bus.emit('hint', hint);
    }
  }

  // ---------------------------------------------------------------- 전투

  attack() {
    if (!this.canAct()) return;
    const rect = this.player.tryAttack(this.time.now);
    if (!rect) return;
    const hitSet = new Set();
    const check = () => {
      for (const m of this.monsters.getChildren()) {
        if (m.dead || hitSet.has(m) || !m.body) continue;
        const b = m.body;
        const mr = new Phaser.Geom.Rectangle(b.x - 2, b.y - 4, b.width + 4, b.height + 6);
        if (Phaser.Geom.Intersects.RectangleToRectangle(rect, mr)) {
          hitSet.add(m);
          m.takeHit(calcDamage(atk(), m.stats.def), this.player.x, this.player.y);
        }
      }
    };
    check();
    this.time.delayedCall(90, check);
  }

  onTouchMonster(m) {
    if (m.dead || ['hidden', 'sleep', 'intro', 'blink'].includes(m.state)) return;
    this.player.hurt(calcDamage(m.stats.atk, def()), m.x, m.y);
  }

  // 발사체 (보스 구슬, 독 침, 얼음 조각). dmg 는 공격력 값
  fireOrb(x, y, angle, speed, tex = 'orb', dmg = 18) {
    const o = this.orbs.create(x, y, tex, 0);
    o.dmg = dmg;
    if (tex === 'shard') {
      o.body.setSize(6, 4);
      o.setRotation(angle);
    } else {
      o.body.setCircle(3, tex === 'orb' ? 2 : 1, tex === 'orb' ? 2 : 1);
      this.tweens.add({ targets: o, angle: 360, duration: 600, repeat: -1 });
    }
    o.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    o.setDepth(9000);
    this.time.delayedCall(4000, () => { if (o.active) o.destroy(); });
    return o;
  }

  alertMark(m) {
    const t = this.add.text(m.x, m.y - 12, '!', {
      fontFamily: FONT, fontSize: '9px', color: '#ffe040', stroke: '#000', strokeThickness: 2, resolution: 8,
    }).setOrigin(0.5).setDepth(9500);
    t.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.tweens.add({ targets: t, y: t.y - 5, alpha: 0, duration: 600, delay: 200, onComplete: () => t.destroy() });
  }

  floatText(x, y, str, color, size = 7) {
    const t = this.add.text(x, y, str, {
      fontFamily: FONT, fontSize: size + 'px', fontStyle: 'bold', color, stroke: '#000', strokeThickness: 2, resolution: 8,
    }).setOrigin(0.5).setDepth(9500);
    t.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.tweens.add({ targets: t, y: y - 12, alpha: 0, duration: 800, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  gainExp(n) {
    const lv = addExp(n);
    if (lv) this.levelUpFx();
  }

  levelUpFx() {
    sfx.levelup();
    const p = this.player;
    this.floatText(p.x, p.y - 16, 'LEVEL UP!', '#ffe060', 9);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const s = this.add.image(p.x, p.y, 'sparkle', 0).setDepth(9400);
      this.tweens.add({
        targets: s, x: p.x + Math.cos(a) * 22, y: p.y + Math.sin(a) * 22, alpha: 0, duration: 700, ease: 'Quad.easeOut',
        onComplete: () => s.destroy(),
      });
    }
    this.toast(`레벨 ${G.level} 달성! 능력치가 오르고 HP가 모두 회복되었다.`);
  }

  onMonsterKilled(m) {
    const d = m.stats;
    if (!m.isBoss) {
      this.dropCoin(m.x, m.y, Phaser.Math.Between(d.gold[0], d.gold[1]));
      for (const dr of d.drops) if (Math.random() < dr.chance) this.dropItem(dr.item, m.x + 6, m.y + 2);
    }
    this.floatText(m.x, m.y - 16, `+${d.exp} EXP`, '#9ad8ff');
    this.gainExp(d.exp);
    if (m.kind === 'slime' && questState('slime') === 'active') {
      G.progress.slime = (G.progress.slime || 0) + 1;
      if (G.progress.slime >= 5) {
        G.quests.slime = 'ready';
        this.toast('슬라임 5마리를 모두 퇴치했다! 농부 아줌마에게 돌아가자.');
      }
    }
  }

  // ---------------------------------------------------------------- 보스

  bossWake(boss) {
    this.player.stop();
    stopMusic();
    this.say(NARRATION[boss.cfg.intro], () => {
      boss.state = 'chase';
      boss.stateUntil = this.time.now + 1200;
      this.bossActive = true;
      sfx.roar();
      this.cameras.main.shake(400, 0.006);
      playMusic('boss');
      bus.emit('boss', { show: true, name: boss.stats.name, hp: boss.hp, max: boss.maxHp });
    });
  }

  // 보스 주변 충격파: 가까이 있으면 피해
  bossNova(b) {
    const cx = b.x;
    const cy = b.y + 8;
    const R = 46;
    sfx.dash();
    this.cameras.main.shake(150, 0.004);
    const col = b.cfg.novaColor;
    const ring = this.add.circle(cx, cy, 6).setStrokeStyle(2, col, 1).setFillStyle(col, 0.25).setDepth(9000);
    this.tweens.add({ targets: ring, scale: R / 6, alpha: 0, duration: 320, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
    if (Phaser.Math.Distance.Between(cx, cy, this.player.x, this.player.footY) < R) {
      this.player.hurt(calcDamage(b.stats.atk + 4, def()), cx, cy);
    }
  }

  onBossDefeated(boss) {
    if (boss.kind === 'golem') return this.onGolemDefeated(boss);
    G.flags.boss_defeated = true;
    this.bossActive = false;
    bus.emit('boss', { show: false });
    stopMusic();
    sfx.bossDie();
    this.cameras.main.shake(1200, 0.01);
    this.cameras.main.flash(600, 255, 255, 255);
    for (const m of this.monsters.getChildren()) if (m.summoned && !m.dead) m.die();
    for (const o of this.orbs.getChildren().slice()) o.destroy();
    this.floatText(boss.x, boss.y - 20, `+${boss.stats.exp} EXP`, '#9ad8ff', 9);
    this.gainExp(boss.stats.exp);
    this.time.delayedCall(1700, () => {
      this.dropCoin(boss.x - 10, boss.y + 6, boss.stats.gold[0]);
      this.spawnCrown(boss.x, boss.y + 6);
      sfx.chest();
    });
  }

  onGolemDefeated(boss) {
    G.flags.golem_defeated = true;
    this.bossActive = false;
    bus.emit('boss', { show: false });
    stopMusic();
    sfx.bossDie();
    this.cameras.main.shake(900, 0.008);
    this.cameras.main.flash(400, 200, 240, 255);
    for (const o of this.orbs.getChildren().slice()) o.destroy();
    this.floatText(boss.x, boss.y - 20, `+${boss.stats.exp} EXP`, '#9ad8ff', 9);
    this.gainExp(boss.stats.exp);
    if (questState('golem') === 'active') {
      G.quests.golem = 'ready';
      this.toast('서리 골렘을 쓰러뜨렸다! 마을의 등산가에게 알리자.');
    } else {
      this.toast('서리 골렘을 쓰러뜨렸다!');
    }
    this.time.delayedCall(1700, () => {
      this.dropCoin(boss.x - 10, boss.y + 6, boss.stats.gold[0]);
      this.dropItem('frost_armor', boss.x + 8, boss.y + 6);
      sfx.chest();
      playMusic(this.mapDef.bgm);
    });
  }

  spawnCrown(x, y) {
    const c = this.pickups.create(x, y, 'icon_crown', 0);
    c.kind = 'crown';
    c.collectAfter = this.time.now + 400;
    c.setDepth(9000);
    this.tweens.add({ targets: c, y: y - 3, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const glow = this.add.image(x, y, 'sparkle', 0).setScale(3).setAlpha(0.6).setDepth(8999);
    this.tweens.add({ targets: glow, angle: 360, scale: 4, alpha: 0.2, duration: 1200, yoyo: true, repeat: -1 });
    c.glow = glow;
  }

  // ---------------------------------------------------------------- 줍기

  dropCoin(x, y, amount) {
    const c = this.pickups.create(x, y, 'coin', 0);
    c.kind = 'gold';
    c.amount = amount;
    this.setupPickup(c, y);
  }

  dropItem(id, x, y) {
    const c = this.pickups.create(x, y, 'icon_' + id, 0);
    c.kind = 'item';
    c.itemId = id;
    c.setScale(0.75);
    this.setupPickup(c, y);
  }

  setupPickup(c, y) {
    c.collectAfter = this.time.now + 300;
    c.setDepth(y - 1);
    c.body.setAllowGravity(false);
    c.setVelocity(Phaser.Math.Between(-30, 30), -40);
    c.setDrag(120);
    this.time.delayedCall(18000, () => {
      if (!c.active) return;
      this.tweens.add({ targets: c, alpha: 0.2, duration: 150, yoyo: true, repeat: 6, onComplete: () => c.destroy() });
    });
  }

  collect(c) {
    if (this.time.now < c.collectAfter || !c.active) return;
    if (c.kind === 'gold') {
      G.gold += c.amount;
      sfx.coin();
      this.floatText(c.x, c.y - 6, `+${c.amount}G`, '#ffd25a');
      c.destroy();
    } else if (c.kind === 'item') {
      if (!addItem(c.itemId)) {
        if (this.time.now > (this.fullWarnAt || 0)) {
          this.fullWarnAt = this.time.now + 3000;
          this.toast('가방이 가득 찼다!');
        }
        return;
      }
      sfx.item();
      this.toast(`${josa(ITEMS[c.itemId].name, '을', '를')} 주웠다.`);
      c.destroy();
    } else if (c.kind === 'crown') {
      G.flags.crown = true;
      G.inventory.push({ id: 'crown', count: 1 });
      sfx.levelup();
      if (c.glow) c.glow.destroy();
      c.destroy();
      this.say(NARRATION.crown, () => this.changeMap('village', 'chief'));
    }
  }

  // ---------------------------------------------------------------- 상호작용

  findInteractable() {
    const p = this.player;
    const v = DIR[p.facing];
    const px = p.x + v.x * 10;
    const py = p.footY + v.y * 10;
    let best = null;
    let bestD = Infinity;
    for (const it of this.interactables) {
      if (!it.obj.active) continue;
      const oy = it.kind === 'npc' ? it.obj.y + 4 : it.obj.y;
      const dd = Phaser.Math.Distance.Between(px, py, it.obj.x, oy);
      if (dd < it.r && dd < bestD) {
        best = it;
        bestD = dd;
      }
    }
    return best;
  }

  interact() {
    if (!this.canAct()) return;
    const t = this.findInteractable();
    if (!t) return;
    if (t.kind === 'npc') {
      const npc = t.obj;
      npc.faceTo(this.player.x, this.player.y);
      npc.update(this.time.now);
      const s = talk(npc.id, this);
      this.say(s.lines, s.onDone, s.choices);
    } else if (t.kind === 'chest') {
      this.openChest(t);
    } else if (t.kind === 'door') {
      this.openDoor(t);
    } else if (t.kind === 'herb') {
      this.pickHerb(t);
    }
  }

  pickHerb(t) {
    if (questState('herb') !== 'active') {
      this.say(NARRATION.herbIdle);
      return;
    }
    const img = t.obj;
    G.flags[img.herbId] = true;
    this.interactables = this.interactables.filter((x) => x !== t);
    G.progress.herb = (G.progress.herb || 0) + 1;
    sfx.item();
    this.tweens.add({ targets: img, y: img.y - 10, alpha: 0, duration: 500, onComplete: () => img.destroy() });
    if (G.progress.herb >= 3) {
      G.quests.herb = 'ready';
      this.toast('달빛 풀을 모두 모았다! 약초꾼 할머니에게 돌아가자.');
    } else {
      this.toast(`달빛 풀을 캤다! (${G.progress.herb}/3)`);
    }
  }

  say(lines, onDone, choices) {
    this.player.stop();
    bus.emit('hint', null);
    this.lastHint = null;
    this.scene.pause();
    this.scene.launch('Dialog', { lines, onDone, choices });
  }

  openOverlay(key, data = {}, force = false) {
    if (!force && !this.canAct()) return;
    this.player.stop();
    bus.emit('hint', null);
    this.lastHint = null;
    this.scene.pause();
    this.scene.launch(key, data);
  }

  openShop(id) {
    this.openOverlay('Shop', { shopId: id }, true);
  }

  openChest(t) {
    const img = t.obj;
    const c = img.chest;
    if (c.item && !canAdd(c.item, c.count)) {
      this.toast('가방이 가득 찼다! 칸을 비우고 다시 열자.');
      sfx.error();
      return;
    }
    G.flags['chest_' + c.id] = true;
    img.setFrame(1);
    this.interactables = this.interactables.filter((x) => x !== t);
    sfx.chest();
    let iconKey = 'coin';
    if (c.gold) {
      G.gold += c.gold;
      this.toast(`보물상자에서 ${c.gold}골드를 얻었다!`);
    } else {
      addItem(c.item, c.count);
      const it = ITEMS[c.item];
      iconKey = 'icon_' + c.item;
      const label = c.count > 1 ? `${it.name} ${c.count}개를` : josa(it.name, '을', '를');
      let msg = `보물상자에서 ${label} 얻었다!`;
      if ((it.type === 'weapon' || it.type === 'armor') && equipIfBetter(c.item)) msg = `보물상자에서 ${josa(it.name, '을', '를')} 얻어 장착했다!`;
      this.toast(msg);
    }
    const ic = this.add.image(img.x, img.y - 6, iconKey, 0).setDepth(9500);
    this.tweens.add({ targets: ic, y: img.y - 20, duration: 500, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: ic, alpha: 0, delay: 900, duration: 300, onComplete: () => ic.destroy() });
  }

  openDoor(t) {
    if (hasItem('shadow_key')) {
      this.say(NARRATION.doorOpen, () => {
        G.flags.door_open = true;
        removeItem('shadow_key');
        sfx.door();
        this.cameras.main.shake(500, 0.005);
        this.interactables = this.interactables.filter((x) => x !== t);
        const door = t.obj;
        door.body.enable = false;
        this.tweens.add({ targets: door, alpha: 0, y: door.y - 8, duration: 800, onComplete: () => door.destroy() });
      });
    } else {
      this.say(NARRATION.doorLocked);
    }
  }

  toggleSpikes() {
    this.spikeTick++;
    let near = false;
    for (const s of this.spikes) {
      s.up = (this.spikeTick + s.phase) % 2 === 0;
      s.setFrame(s.up ? 1 : 0);
      if (s.up && Phaser.Math.Distance.Between(s.x, s.y, this.player.x, this.player.y) < 90) near = true;
    }
    if (near) sfx.spike();
  }

  // ---------------------------------------------------------------- 이야기 진행에 쓰는 기능 (story.js 에서 호출)

  toast(msg) {
    bus.emit('toast', msg);
  }

  itemGot(id, count, msg) {
    sfx.item();
    this.toast(msg);
  }

  innRest() {
    if (G.gold < INN_PRICE) {
      this.say([{ speaker: '여관 주인', text: '골드가 모자라는군… 몬스터를 물리쳐서 골드를 모아 오게.' }]);
      return;
    }
    G.gold -= INN_PRICE;
    G.hp = maxHp();
    sfx.heal();
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.cameras.main.fadeIn(500, 0, 0, 0);
      this.saveHere();
      this.toast('HP가 모두 회복되었다. 모험이 기록되었다!');
    });
  }

  saveHere() {
    G.spawn = this.spawnName;
    G.pos = { x: Math.round(this.player.x), y: Math.round(this.player.y) };
    const ok = save();
    G.pos = null;
    return ok;
  }

  removeRock() {
    G.flags.rock_removed = true;
    sfx.rock();
    this.cameras.main.shake(500, 0.004);
    for (const r of this.rocks) {
      r.body.enable = false;
      this.tweens.add({ targets: r, alpha: 0, duration: 600, onComplete: () => r.destroy() });
    }
    this.toast('어딘가에서 커다란 바위가 굴러가는 소리가 들렸다!');
  }

  catFound() {
    G.flags.cat_found = true;
    const cat = this.npcList.find((n) => n.id === 'cat');
    if (cat) {
      this.interactables = this.interactables.filter((x) => x.obj !== cat);
      cat.body.enable = false;
      this.tweens.add({ targets: [cat, cat.mark], alpha: 0, duration: 500, onComplete: () => cat.destroy() });
    }
    sfx.item();
    this.toast('나비가 마을로 돌아갔다! 토토에게 가 보자.');
  }

  quickPotion() {
    const id = countItem('red_potion') ? 'red_potion' : countItem('big_potion') ? 'big_potion' : null;
    if (!id) {
      this.toast('포션이 없다!');
      sfx.error();
      return;
    }
    this.usePotion(id);
  }

  usePotion(id) {
    if (G.hp >= maxHp()) {
      this.toast('HP가 이미 가득 차 있다.');
      return false;
    }
    const n = heal(ITEMS[id].heal);
    removeItem(id, 1);
    sfx.heal();
    this.floatText(this.player.x, this.player.y - 10, '+' + n, '#7ae07a');
    return true;
  }

  useFeather() {
    if (this.bossActive) {
      this.toast('지금은 사용할 수 없다!');
      return false;
    }
    removeItem('feather', 1);
    sfx.warp();
    this.changeMap('village', 'inn');
    return true;
  }

  startEnding() {
    G.quests.main = 'done';
    G.flags.cleared = true;
    G.inventory = G.inventory.filter((s) => s.id !== 'crown');
    this.transitioning = true;
    stopMusic();
    this.cameras.main.fadeOut(1200, 255, 255, 255);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      G.spawn = 'chief';
      G.map = 'village';
      save();
      this.scene.stop('UI');
      this.scene.start('Ending');
    });
  }

  // ---------------------------------------------------------------- 맵 이동 / 죽음

  onExit(e) {
    if (this.transitioning || this.player.dead) return;
    if (e.gate === 'guard' && questState('main') === 'none') {
      this.player.body.reset(this.player.x, this.player.y + 12);
      this.say(NARRATION.guardBlock);
      return;
    }
    if (e.gate === 'level' && G.level < FROST_MIN_LEVEL) {
      this.player.body.reset(this.player.x - 12, this.player.y);
      this.say(NARRATION.frostBlock(G.level));
      return;
    }
    this.changeMap(e.to, e.spawn);
  }

  changeMap(to, spawn) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.player.setVelocity(0);
    bus.emit('boss', { show: false });
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      G.map = to;
      G.spawn = spawn;
      G.pos = null;
      save();
      this.scene.restart({ map: to, spawn });
    });
  }

  onPlayerDeath() {
    const p = this.player;
    p.dead = true;
    p.setVelocity(0);
    p.anims.stop();
    p.setTint(0x777777);
    bus.emit('boss', { show: false });
    stopMusic();
    sfx.gameover();
    this.tweens.add({ targets: p, angle: 90, duration: 400 });
    this.time.delayedCall(1000, () => {
      this.scene.pause();
      this.scene.launch('GameOver');
    });
  }
}
