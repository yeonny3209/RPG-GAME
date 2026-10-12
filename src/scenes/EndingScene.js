// 엔딩: 이야기 마무리 → 스태프 롤 → 기록

import { GAME_W, GAME_H } from '../config.js';
import { G } from '../state.js';
import { text, bindMenuKeys, COLORS } from '../ui.js';
import { playMusic, sfx } from '../audio.js';

const STORY = [
  '빛의 왕관이 제자리로 돌아오자',
  '루미엘 왕국에 다시 따스한 빛이 퍼져 나갔다.',
  '',
  '숲의 몬스터들은 잠잠해졌고',
  '햇살골 사람들은 밤새 축제를 열었다.',
  '',
  '견습 모험가 리오의 이름은',
  '오래도록 마을의 전설로 남았다.',
];

const CREDITS = [
  ['잃어버린 왕관', 'title'],
  ['', ''],
  ['기획 · 제작', 'head'],
  ['yeonny3209', ''],
  ['', ''],
  ['프로그래밍 · 그래픽 · 음악', 'head'],
  ['Claude', ''],
  ['', ''],
  ['게임 엔진', 'head'],
  ['Phaser 3', ''],
  ['', ''],
  ['플레이해 주셔서 감사합니다!', 'thanks'],
];

export class EndingScene extends Phaser.Scene {
  constructor() {
    super('Ending');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0814');
    this.cameras.main.fadeIn(1500, 255, 255, 255);
    playMusic('ending');
    this.done = false;

    const crown = this.add.image(GAME_W / 2, 150, 'icon_crown', 0).setScale(7).setAlpha(0);
    this.tweens.add({ targets: crown, alpha: 1, duration: 1500 });
    this.tweens.add({ targets: crown, y: 140, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    for (let i = 0; i < 30; i++) {
      const s = this.add.image(Phaser.Math.Between(0, GAME_W), Phaser.Math.Between(0, GAME_H), 'sparkle', 0).setScale(Phaser.Math.Between(2, 4)).setAlpha(0);
      this.tweens.add({ targets: s, alpha: 0.7, duration: Phaser.Math.Between(800, 2000), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 3000) });
    }

    const storyTexts = STORY.map((line, i) =>
      text(this, GAME_W / 2, 270 + i * 40, line, { size: 26, origin: 0.5, color: '#f4ecd8' }).setAlpha(0));
    storyTexts.forEach((t, i) => this.tweens.add({ targets: t, alpha: 1, duration: 900, delay: 1500 + i * 700 }));

    const storyEnd = 1500 + STORY.length * 700 + 3000;
    this.time.delayedCall(storyEnd, () => {
      this.tweens.add({ targets: [...storyTexts, crown], alpha: 0, duration: 1000 });
      this.rollCredits();
    });

    bindMenuKeys(this, { ok: () => this.toTitle() });
  }

  rollCredits() {
    const c = this.add.container(0, GAME_H + 40);
    let y = 0;
    for (const [line, kind] of CREDITS) {
      const size = kind === 'title' ? 56 : kind === 'head' ? 20 : kind === 'thanks' ? 30 : 30;
      const color = kind === 'title' ? '#ffe08a' : kind === 'head' ? COLORS.dim : kind === 'thanks' ? COLORS.gold : '#ffffff';
      if (line) c.add(text(this, GAME_W / 2, y, line, { size, bold: kind !== 'head', color, origin: 0.5 }));
      y += kind === 'title' ? 80 : 46;
    }
    this.tweens.add({
      targets: c, y: 120, duration: 13000,
      onComplete: () => this.showResult(),
    });
  }

  showResult() {
    const mins = Math.floor(G.playTime / 60000);
    const secs = Math.floor((G.playTime % 60000) / 1000);
    const t1 = text(this, GAME_W / 2, GAME_H - 220, 'THE END', { size: 64, bold: true, color: '#ffe08a', origin: 0.5, stroke: '#2a1408', strokeThickness: 8 }).setAlpha(0);
    const t2 = text(this, GAME_W / 2, GAME_H - 140, `플레이 시간 ${mins}분 ${secs}초   ·   최종 레벨 ${G.level}`, { size: 22, origin: 0.5 }).setAlpha(0);
    const t3 = text(this, GAME_W / 2, GAME_H - 80, 'Enter 를 눌러 타이틀로', { size: 18, color: COLORS.dim, origin: 0.5 }).setAlpha(0);
    this.tweens.add({ targets: [t1, t2, t3], alpha: 1, duration: 1200 });
    this.done = true;
  }

  toTitle() {
    if (!this.done) return;
    sfx.select();
    this.cameras.main.fadeOut(800, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Title'));
  }
}
