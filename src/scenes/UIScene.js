// 게임 화면 위에 항상 떠 있는 정보 (HP, 레벨, 골드, 퀘스트, 알림)

import { GAME_W, GAME_H } from '../config.js';
import { G, bus, maxHp, maxMp, nextExp, prevExp, countItem } from '../state.js';
import { QUESTS, objective } from '../data/story.js';
import { SKILLS } from '../data/skills.js';

const SLOT = 64;
const SKILL_Y = GAME_H - 82;
const SKILL_X = GAME_W / 2 - (SKILLS.length * SLOT + (SKILLS.length - 1) * 10) / 2;
import { text, panel, COLORS } from '../ui.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    this.toasts = [];
    this.cache = {};

    // 왼쪽 위: HP / MP / 레벨 / 경험치
    panel(this, 16, 16, 340, 126);
    this.add.image(46, 46, 'heart', 0).setScale(2.4);
    this.hpBar = this.add.graphics();
    this.hpText = text(this, 206, 46, '', { size: 18, bold: true, origin: 0.5, stroke: '#000', strokeThickness: 3 });
    text(this, 46, 75, 'MP', { size: 15, bold: true, color: '#7ab0ff', origin: 0.5 });
    this.mpBar = this.add.graphics();
    this.mpText = text(this, 206, 75, '', { size: 14, bold: true, origin: 0.5, stroke: '#000', strokeThickness: 3 });
    this.lvText = text(this, 30, 102, '', { size: 20, bold: true, color: COLORS.gold });
    this.expBar = this.add.graphics();
    this.expText = text(this, 340, 104, '', { size: 14, color: COLORS.dim, origin: [1, 0] });

    // 오른쪽 위: 골드
    panel(this, GAME_W - 196, 16, 180, 54);
    this.add.image(GAME_W - 166, 43, 'coin', 0).setScale(2.8);
    this.goldText = text(this, GAME_W - 32, 43, '', { size: 22, bold: true, color: COLORS.gold, origin: [1, 0.5] });

    // 퀘스트 안내
    this.questText = text(this, GAME_W - 24, 84, '', {
      size: 17, color: '#fff4d0', origin: [1, 0], align: 'right', stroke: '#000', strokeThickness: 4, lineSpacing: 8,
    });

    // 왼쪽 아래: 포션 단축키
    panel(this, 16, GAME_H - 78, 290, 62);
    this.potionIcon = this.add.image(52, GAME_H - 47, 'icon_red_potion', 0).setScale(2.6);
    this.potionText = text(this, 80, GAME_H - 47, '', { size: 20, bold: true, origin: [0, 0.5] });
    text(this, 156, GAME_H - 47, '[1]', { size: 15, color: COLORS.dim, origin: [1, 0.5] });
    this.manaIcon = this.add.image(192, GAME_H - 47, 'icon_mana_potion', 0).setScale(2.6);
    this.manaText = text(this, 220, GAME_H - 47, '', { size: 20, bold: true, origin: [0, 0.5] });
    text(this, 294, GAME_H - 47, '[2]', { size: 15, color: COLORS.dim, origin: [1, 0.5] });

    // 아래 가운데: 스킬
    this.skillSlots = SKILLS.map((sk, i) => {
      const x = SKILL_X + i * (SLOT + 10);
      const bg = this.add.graphics();
      bg.fillStyle(0x1b1626, 0.92);
      bg.fillRoundedRect(x, SKILL_Y, SLOT, SLOT, 8);
      bg.lineStyle(2, 0xd8b860, 0.9);
      bg.strokeRoundedRect(x, SKILL_Y, SLOT, SLOT, 8);
      const ic = this.add.image(x + SLOT / 2, SKILL_Y + SLOT / 2, 'skill_' + sk.id, 0).setScale(2.6);
      const cd = this.add.graphics();
      const key = text(this, x + 6, SKILL_Y + 3, sk.key, { size: 15, bold: true, color: '#ffffff', stroke: '#000', strokeThickness: 3 });
      const mp = text(this, x + SLOT - 5, SKILL_Y + SLOT - 3, String(sk.mp), { size: 13, bold: true, color: '#9ac0ff', origin: [1, 1], stroke: '#000', strokeThickness: 3 });
      const lock = text(this, x + SLOT / 2, SKILL_Y + SLOT / 2, `Lv${sk.level}`, { size: 16, bold: true, color: '#ffffff', origin: 0.5, stroke: '#000', strokeThickness: 4 });
      return { sk, x, ic, cd, key, mp, lock };
    });

    // 오른쪽 아래: 조작 안내
    text(this, GAME_W - 20, GAME_H - 20, 'I 가방   Q 퀘스트   Esc 메뉴', { size: 15, color: '#d8d0c0', origin: [1, 1], stroke: '#000', strokeThickness: 4 });

    // 아래 가운데: 상호작용 안내
    this.hintBox = this.add.container(GAME_W / 2, GAME_H - 120).setVisible(false);
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
    const mm = maxMp();
    const mpKey = G.mp + ',' + mm;
    if (mpKey !== this.cache.mp) {
      this.cache.mp = mpKey;
      const r = Math.max(0, Math.min(1, G.mp / mm));
      const g = this.mpBar;
      g.clear();
      g.fillStyle(0x000000, 0.6);
      g.fillRoundedRect(72, 66, 268, 18, 5);
      if (r > 0) {
        g.fillStyle(0x3a7aff, 1);
        g.fillRoundedRect(74, 68, Math.max(6, 264 * r), 14, 4);
      }
      this.mpText.setText(`MP ${G.mp} / ${mm}`);
    }
    this.updateSkills();

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
      e.fillRoundedRect(96, 110, 160, 12, 4);
      e.fillStyle(0xf0d060, 1);
      e.fillRoundedRect(97, 111, Math.max(4, 158 * Math.min(1, er)), 10, 4);
      this.expText.setText(ne === null ? 'MAX' : `EXP ${G.exp}/${ne}`);

      this.goldText.setText(`${G.gold} G`);
    }

    const red = countItem('red_potion');
    const big = countItem('big_potion');
    const mana = countItem('mana_potion');
    const pkey = red + ',' + big + ',' + mana;
    if (pkey !== this.cache.potion) {
      this.cache.potion = pkey;
      const id = red ? 'red_potion' : big ? 'big_potion' : 'red_potion';
      this.potionIcon.setTexture('icon_' + id).setAlpha(red || big ? 1 : 0.35);
      this.potionText.setText(`x ${red || big}`);
      this.manaIcon.setAlpha(mana ? 1 : 0.35);
      this.manaText.setText(`x ${mana}`);
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

  updateSkills() {
    const world = this.scene.get('World');
    const now = this.game.loop.time;
    for (const s of this.skillSlots) {
      const i = SKILLS.indexOf(s.sk);
      const learned = G.level >= s.sk.level;
      const readyAt = (world && world.skillReadyAt && world.skillReadyAt[i]) || 0;
      const left = Math.max(0, readyAt - now);
      const noMp = G.mp < s.sk.mp;
      const k = [learned, Math.ceil(left / 50), noMp].join(',');
      if (k === s.cacheKey) continue;
      s.cacheKey = k;
      s.lock.setVisible(!learned);
      s.mp.setVisible(learned);
      s.ic.setAlpha(learned ? (noMp ? 0.45 : 1) : 0.25);
      s.mp.setColor(noMp ? '#ff7070' : '#9ac0ff');
      s.cd.clear();
      if (learned && left > 0) {
        const r = left / s.sk.cooldown;
        s.cd.fillStyle(0x000000, 0.6);
        s.cd.fillRect(s.x + 2, SKILL_Y + 2 + (SLOT - 4) * (1 - r), SLOT - 4, (SLOT - 4) * r);
      }
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
    const c = this.add.container(GAME_W / 2, GAME_H - 190);
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
    let y = GAME_H - 190;
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
