// 상점: 사기 / 팔기

import { GAME_W, GAME_H } from '../config.js';
import { ITEMS, SHOPS, sellPrice } from '../data/items.js';
import { G, addItem, canAdd, countItem, hasItem } from '../state.js';
import { text, panel, icon, bindMenuKeys, COLORS, josa } from '../ui.js';
import { sfx } from '../audio.js';

const ROW = 62;
const LX = 180;
const LY = 210;
const VISIBLE = 6;

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  init(data) {
    this.shop = SHOPS[data.shopId];
    this.tab = 0;
    this.sel = 0;
    this.msg = '';
  }

  create() {
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.55).setOrigin(0);
    panel(this, 140, 70, 1000, 590);
    text(this, 180, 96, this.shop.name, { size: 32, bold: true, color: COLORS.gold });
    text(this, GAME_W - 180, 108, '←→: 사기/팔기   ↑↓: 선택   E: 결정   Esc: 나가기', { size: 16, color: COLORS.dim, origin: [1, 0] });
    this.dyn = this.add.container(0, 0);
    bindMenuKeys(this, {
      left: () => this.switchTab(0),
      right: () => this.switchTab(1),
      up: () => this.move(-1),
      down: () => this.move(1),
      ok: () => this.confirm(),
      cancel: () => this.close(),
    });
    this.redraw();
  }

  // 지금 탭의 목록: [{ id, slot? }]
  list() {
    if (this.tab === 0) return this.shop.items.map((id) => ({ id }));
    return G.inventory
      .map((s, i) => ({ id: s.id, slot: i, count: s.count }))
      .filter((x) => ITEMS[x.id].type !== 'key');
  }

  switchTab(t) {
    if (this.tab === t) return;
    this.tab = t;
    this.sel = 0;
    this.msg = '';
    sfx.cursor();
    this.redraw();
  }

  move(d) {
    const n = this.list().length;
    if (!n) return;
    this.sel = (this.sel + d + n) % n;
    this.msg = '';
    sfx.cursor();
    this.redraw();
  }

  confirm() {
    const items = this.list();
    const row = items[this.sel];
    if (!row) { sfx.error(); return; }
    const it = ITEMS[row.id];
    if (this.tab === 0) {
      if (G.gold < it.price) {
        this.msg = '골드가 모자란다.';
        sfx.error();
      } else if (!canAdd(row.id)) {
        this.msg = '가방이 가득 찼다.';
        sfx.error();
      } else {
        G.gold -= it.price;
        addItem(row.id);
        sfx.buy();
        this.msg = `${josa(it.name, '을', '를')} 샀다! (가방에서 장착/사용)`;
      }
    } else {
      const s = G.inventory[row.slot];
      s.count -= 1;
      if (s.count <= 0) G.inventory.splice(row.slot, 1);
      G.gold += sellPrice(row.id);
      sfx.coin();
      this.msg = `${josa(it.name, '을', '를')} ${sellPrice(row.id)}골드에 팔았다.`;
      const n = this.list().length;
      if (this.sel >= n) this.sel = Math.max(0, n - 1);
    }
    this.redraw();
  }

  redraw() {
    this.dyn.removeAll(true);
    const add = (o) => { this.dyn.add(o); return o; };

    // 탭
    ['사기', '팔기'].forEach((label, i) => {
      const x = LX + i * 150;
      const g = add(this.add.graphics());
      g.fillStyle(i === this.tab ? 0xd8b860 : COLORS.panelInner, 1);
      g.fillRoundedRect(x, 150, 136, 44, 8);
      add(text(this, x + 68, 172, label, { size: 21, bold: true, origin: 0.5, color: i === this.tab ? '#1b1626' : COLORS.dim }));
    });

    const items = this.list();
    if (!items.length) add(text(this, LX + 20, LY + 20, this.tab === 0 ? '파는 물건이 없다.' : '팔 수 있는 물건이 없다.', { size: 20, color: COLORS.dim }));
    const start = Math.max(0, Math.min(this.sel - Math.floor(VISIBLE / 2), items.length - VISIBLE));
    items.slice(start, start + VISIBLE).forEach((row, k) => {
      const i = start + k;
      const it = ITEMS[row.id];
      const y = LY + k * ROW;
      const g = add(this.add.graphics());
      g.fillStyle(i === this.sel ? 0x3a3050 : COLORS.panelInner, 1);
      g.fillRoundedRect(LX, y, 520, ROW - 8, 8);
      if (i === this.sel) {
        g.lineStyle(3, 0xffd25a, 1);
        g.strokeRoundedRect(LX, y, 520, ROW - 8, 8);
      }
      add(icon(this, LX + 32, y + (ROW - 8) / 2, 'icon_' + row.id, 2.4));
      const owned = this.tab === 0 && (it.type === 'weapon' || it.type === 'armor') && hasItem(row.id);
      add(text(this, LX + 64, y + (ROW - 8) / 2, it.name + (row.count > 1 ? `  x${row.count}` : '') + (owned ? '  (보유)' : ''), { size: 21, origin: [0, 0.5] }));
      const price = this.tab === 0 ? it.price : sellPrice(row.id);
      const afford = this.tab === 1 || G.gold >= price;
      add(text(this, LX + 500, y + (ROW - 8) / 2, `${price} G`, { size: 21, bold: true, origin: [1, 0.5], color: afford ? COLORS.gold : '#7a6a50' }));
    });

    // 오른쪽 설명
    const RX = 740;
    add(text(this, RX, 160, '가진 골드', { size: 18, color: COLORS.dim }));
    add(text(this, RX, 188, `${G.gold} G`, { size: 30, bold: true, color: COLORS.gold }));
    const row = items[this.sel];
    if (row) {
      const it = ITEMS[row.id];
      add(icon(this, RX + 40, 290, 'icon_' + row.id, 4));
      add(text(this, RX + 90, 270, it.name, { size: 24, bold: true }));
      add(text(this, RX, 340, it.desc, { size: 19, wrap: 360 }));
      const have = it.type === 'consumable' ? countItem(row.id) : hasItem(row.id) ? 1 : 0;
      add(text(this, RX, 430, `가진 개수: ${have}`, { size: 18, color: COLORS.dim }));
    }
    if (this.msg) add(text(this, RX, 500, this.msg, { size: 19, color: COLORS.accent, wrap: 360 }));
  }

  close() {
    sfx.cancel();
    this.scene.resume('World');
    this.scene.stop();
  }
}
