// 게임 화면 위에 항상 떠 있는 정보 (HP, 레벨, 골드, 퀘스트, 알림)

import { GAME_W, GAME_H } from '../config.js';
import { G, bus, maxHp, nextExp, prevExp, countItem } from '../state.js';
import { QUESTS, objective } from '../data/story.js';
import { text, panel, COLORS } from '../ui.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    this.toasts = [];
    this.cache = {};

    // 왼쪽 위: HP / 레벨 / 경험치
    panel(this, 16, 16, 340, 98);
    this.add.image(46, 46, 'heart', 0).setScale(2.4);
    this.hpBar = this.add.graphics();
    this.hpText = text(this, 200, 46, '', { size: 18, bold: true, origin: 0.5, stroke: '#000', strokeThickness: 3 });
    this.lvText = text(this, 30, 76, '', { size: 20, bold: true, color: COLORS.gold });
    this.expBar = this.add.graphics();
    this.expText = text(this, 340, 76, '', { size: 14, color: COLORS.dim, origin: [1, 0] });

    // 오른쪽 위: 골드
    panel(this, GAME_W - 196, 16, 180, 54);
    this.add.image(GAME_W - 166, 43, 'coin', 0).setScale(2.8);
    this.goldText = text(this, GAME_W - 32, 43, '', { size: 22, bold: true, color: COLORS.gold, origin: [1, 0.5] });

    // 퀘스트 안내
    this.questText = text(this, GAME_W - 24, 84, '', {
      size: 17, color: '#fff4d0', origin: [1, 0], align: 'right', stroke: '#000', strokeThickness: 4, lineSpacing: 8,
    });

    // 왼쪽 아래: 포션 단축키
    panel(this, 16, GAME_H - 78, 170, 62);
    this.potionIcon = this.add.image(52, GAME_H - 47, 'icon_red_potion', 0).setScale(2.6);
    this.potionText = text(this, 82, GAME_H - 47, '', { size: 20, bold: true, origin: [0, 0.5] });
    text(this, 172, GAME_H - 47, '[1]', { size: 15, color: COLORS.dim, origin: [1, 0.5] });

    // 오른쪽 아래: 조작 안내
    text(this, GAME_W - 20, GAME_H - 20, 'I 가방   Q 퀘스트   Esc 메뉴', { size: 15, color: '#d8d0c0', origin: [1, 1], stroke: '#000', strokeThickness: 4 });

    // 아래 가운데: 상호작용 안내
    this.hintBox = this.add.container(GAME_W / 2, GAME_H - 52).setVisible(false);
    const hb = this.add.graphics();
    hb.fillStyle(0x000000, 0.65);
    hb.fillRoundedRect(-110, -22, 220, 44, 22);
    this.hintText = text(this, 0, 0, '', { size: 20, bold: true, origin: 0.5, color: '#ffffff' });
    this.hintBox.add([hb, this.hintText]);

    // 보스 체력바
    this.bossBox = this.add.container(GAME_W / 2, 34).setVisible(false);
    const bb = this.add.graphics();
    bb.fillStyle(0x000000, 0.7);
    bb.fillRoundedRect(-270, -14, 540, 58, 8);
    this.bossName = text(this, 0, -2, '', { size: 18, bold: true, color: '#ff9aa0', origin: [0.5, 0.5], stroke: '#000', strokeThickness: 3 });
    this.bossBar = this.add.graphics();
    this.bossBox.add([bb, this.bossName, this.bossBar]);

    // 지역 이름
    this.banner = text(this, GAME_W / 2, 170, '', { size: 44, bold: true, origin: 0.5, color: '#fff4d0', stroke: '#1a1424', strokeThickness: 8 }).setAlpha(0);

    const onToast = (m) => this.toast(m);
    const onHint = (h) => this.setHint(h);
    const onBoss = (b) => this.setBoss(b);
    const onMap = (n) => this.showBanner(n);
    bus.on('toast', onToast);
    bus.on('hint', onHint);
    bus.on('boss', onBoss);
    bus.on('mapEnter', onMap);
    this.events.once('shutdown', () => {
      bus.off('toast', onToast);
      bus.off('hint', onHint);
      bus.off('boss', onBoss);
      bus.off('mapEnter', onMap);
    });
  }

  update() {
    const mh = maxHp();
    const key = [G.hp, mh, G.level, G.exp, G.gold].join(',');
    if (key !== this.cache.stats) {
      this.cache.stats = key;
      const r = Math.max(0, Math.min(1, G.hp / mh));
      const g = this.hpBar;
      g.clear();
      g.fillStyle(0x000000, 0.6);
      g.fillRoundedRect(72, 32, 268, 28, 6);
      const col = r > 0.5 ? 0x4ccf5a : r > 0.25 ? 0xf0c040 : 0xe84a4a;
      if (r > 0) {
        g.fillStyle(col, 1);
        g.fillRoundedRect(74, 34, Math.max(8, 264 * r), 24, 5);
        g.fillStyle(0xffffff, 0.25);
        g.fillRect(78, 36, Math.max(0, 264 * r - 8), 5);
      }
      this.hpText.setText(`HP ${G.hp} / ${mh}`);

      this.lvText.setText(`Lv ${G.level}`);
      const ne = nextExp();
      const pe = prevExp();
      const er = ne === null ? 1 : (G.exp - pe) / (ne - pe);
      const e = this.expBar;
      e.clear();
      e.fillStyle(0x000000, 0.6);
      e.fillRoundedRect(96, 82, 160, 12, 4);
      e.fillStyle(0x5ab0ff, 1);
      e.fillRoundedRect(97, 83, Math.max(4, 158 * Math.min(1, er)), 10, 4);
      this.expText.setText(ne === null ? 'MAX' : `EXP ${G.exp}/${ne}`);

      this.goldText.setText(`${G.gold} G`);
    }

    const red = countItem('red_potion');
    const big = countItem('big_potion');
    const pkey = red + ',' + big;
    if (pkey !== this.cache.potion) {
      this.cache.potion = pkey;
      const id = red ? 'red_potion' : big ? 'big_potion' : 'red_potion';
      this.potionIcon.setTexture('icon_' + id).setAlpha(red || big ? 1 : 0.35);
      this.potionText.setText(`x ${red || big}`);
    }

    const lines = Object.keys(QUESTS).map((id) => {
      const o = objective(id);
      return o ? (QUESTS[id].main ? '★ ' : '· ') + o : null;
    }).filter(Boolean);
    const qt = lines.join('\n');
    if (qt !== this.cache.quest) {
      this.cache.quest = qt;
      this.questText.setText(qt);
    }
  }

  setHint(h) {
    this.hintBox.setVisible(!!h);
    if (h) this.hintText.setText(h);
  }

  setBoss(b) {
    if (!b.show) {
      this.bossBox.setVisible(false);
      return;
    }
    this.bossBox.setVisible(true);
    this.bossName.setText(b.name);
    const r = Math.max(0, b.hp / b.max);
    const g = this.bossBar;
    g.clear();
    g.fillStyle(0x2a0a10, 1);
    g.fillRoundedRect(-256, 12, 512, 20, 5);
    g.fillStyle(r > 0.5 ? 0xb03ae0 : 0xe8304a, 1);
    if (r > 0) g.fillRoundedRect(-254, 14, 508 * r, 16, 4);
  }

  showBanner(name) {
    this.tweens.killTweensOf(this.banner);
    this.banner.setText(name).setAlpha(0).setY(180);
    this.tweens.add({ targets: this.banner, alpha: 1, y: 170, duration: 400, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 1800, duration: 600 });
  }

  toast(msg) {
    const c = this.add.container(GAME_W / 2, GAME_H - 130);
    const t = text(this, 0, 0, msg, { size: 20, origin: 0.5, color: '#ffffff', wrap: 900, align: 'center' });
    const w = Math.min(960, t.width + 48);
    const h = t.height + 22;
    const g = this.add.graphics();
    g.fillStyle(0x1b1626, 0.92);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    g.lineStyle(2, 0xd8b860, 0.9);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    c.add([g, t]);
    c.h = h;
    c.setAlpha(0);
    this.toasts.unshift(c);
    if (this.toasts.length > 4) this.toasts.pop().destroy();
    let y = GAME_H - 130;
    for (const tc of this.toasts) {
      this.tweens.add({ targets: tc, y, duration: 150 });
      y -= tc.h + 8;
    }
    this.tweens.add({ targets: c, alpha: 1, duration: 150 });
    this.time.delayedCall(3200, () => {
      this.tweens.add({
        targets: c, alpha: 0, duration: 400,
        onComplete: () => {
          this.toasts = this.toasts.filter((x) => x !== c);
          c.destroy();
        },
      });
    });
  }
}
