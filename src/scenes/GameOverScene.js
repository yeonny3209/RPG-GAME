// 쓰러졌을 때: 여관 앞에서 다시 시작 (골드 절반 잃음)

import { GAME_W, GAME_H } from '../config.js';
import { G, maxHp } from '../state.js';
import { text, bindMenuKeys, COLORS } from '../ui.js';
import { sfx } from '../audio.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create() {
    const bg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0a0006, 0).setOrigin(0);
    this.tweens.add({ targets: bg, fillAlpha: 0.85, duration: 700 });
    const t1 = text(this, GAME_W / 2, GAME_H / 2 - 60, '쓰러졌다…', { size: 64, bold: true, color: '#ff6a6a', origin: 0.5, stroke: '#000', strokeThickness: 8 }).setAlpha(0);
    const lost = Math.floor(G.gold / 2);
    const t2 = text(this, GAME_W / 2, GAME_H / 2 + 30, `여관 앞에서 다시 시작합니다. (골드 ${lost}G를 잃습니다)`, { size: 22, origin: 0.5 }).setAlpha(0);
    const t3 = text(this, GAME_W / 2, GAME_H / 2 + 90, 'Enter 를 눌러 계속', { size: 20, color: COLORS.gold, origin: 0.5 }).setAlpha(0);
    this.tweens.add({ targets: [t1, t2], alpha: 1, duration: 800, delay: 300 });
    this.tweens.add({ targets: t3, alpha: 1, duration: 600, delay: 1200, onComplete: () => this.tweens.add({ targets: t3, alpha: 0.4, yoyo: true, repeat: -1, duration: 600 }) });

    bindMenuKeys(this, {
      ok: () => {
        if (this.game.loop.time < this._readyAt + 1000) return;
        sfx.select();
        G.gold -= lost;
        G.hp = maxHp();
        G.map = 'village';
        G.spawn = 'inn';
        this.scene.start('World', { map: 'village', spawn: 'inn' });
      },
    });
  }
}
