// 타이틀 화면: 새 게임 / 이어하기

import { GAME_W, GAME_H } from '../config.js';
import { T } from '../data/maps.js';
import { G, newGame, load, hasSave } from '../state.js';
import { text, bindMenuKeys, COLORS } from '../ui.js';
import { sfx, initAudio, playMusic } from '../audio.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.buildBackdrop();

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0a0614, 0.18).setOrigin(0);
    const crown = this.add.image(GAME_W / 2, 150, 'icon_crown', 0).setScale(6);
    this.tweens.add({ targets: crown, y: 140, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    text(this, GAME_W / 2, 270, '잃어버린 왕관', { size: 92, bold: true, color: '#ffe08a', origin: 0.5, stroke: '#2a1408', strokeThickness: 12 });
    text(this, GAME_W / 2, 350, 'THE LOST CROWN', { size: 24, bold: true, color: '#fff4d0', origin: 0.5, stroke: '#2a1408', strokeThickness: 6 });

    this.saveExists = hasSave();
    this.sel = this.saveExists ? 1 : 0;
    this.confirmNew = false;
    this.menu = [0, 1].map((i) => text(this, GAME_W / 2, 450 + i * 60, '', { size: 30, bold: true, origin: 0.5, stroke: '#000', strokeThickness: 6 }));
    this.note = text(this, GAME_W / 2, 580, '', { size: 18, color: '#ffb0a0', origin: 0.5, stroke: '#000', strokeThickness: 4 });
    text(this, GAME_W / 2, GAME_H - 34, '↑↓ 선택   Enter 결정        © 2026 yeonny3209', { size: 16, color: '#e0d8c8', origin: 0.5, stroke: '#000', strokeThickness: 4 });
    this.redraw();

    // 브라우저 정책상 소리는 첫 키 입력 이후에만 낼 수 있다
    this.input.keyboard.on('keydown', () => {
      initAudio();
      playMusic('title');
    });
    this.input.on('pointerdown', () => {
      initAudio();
      playMusic('title');
    });
    playMusic('title');

    bindMenuKeys(this, {
      up: () => this.move(-1),
      down: () => this.move(1),
      ok: () => this.choose(),
    });
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  buildBackdrop() {
    // 타일로 만든 숲 배경 + 걸어다니는 주인공과 슬라임
    const w = 21;
    const h = 12;
    const map = this.make.tilemap({ tileWidth: 16, tileHeight: 16, width: w, height: h });
    const ts = map.addTilesetImage('tiles', 'tiles', 16, 16, 1, 2);
    const layer = map.createBlankLayer('bg', ts);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const edge = y < 2 || y > 10 || x < 1 || x > 19;
        const r = (x * 7 + y * 13) % 11;
        let t = r === 0 ? T.flowers : r === 5 ? T.grass2 : T.grass;
        if (y === 9 || y === 10) t = T.path;
        if (edge && (x + y) % 3 !== 0) t = T.tree;
        layer.putTileAt(t, x, y);
      }
    }
    layer.setScale(4);
    layer.setPosition(-32, -40);

    const hero = this.add.sprite(-60, 588, 'player', 0).setScale(4);
    hero.play('player-walk-side');
    this.tweens.add({ targets: hero, x: GAME_W + 120, duration: 14000, repeat: -1 });
    const slime = this.add.sprite(-220, 600, 'slime', 0).setScale(4);
    slime.play('slime-move');
    this.tweens.add({ targets: slime, x: GAME_W - 40, duration: 14000, repeat: -1 });
  }

  move(d) {
    this.sel = (this.sel + d + 2) % 2;
    this.confirmNew = false;
    sfx.cursor();
    this.redraw();
  }

  redraw() {
    const labels = ['새 게임', '이어하기'];
    this.menu.forEach((t, i) => {
      const disabled = i === 1 && !this.saveExists;
      const on = i === this.sel;
      t.setText((on ? '▶  ' : '') + labels[i] + (on ? '  ◀' : ''));
      t.setColor(disabled ? '#6a6070' : on ? COLORS.gold : '#ffffff');
    });
    this.note.setText(this.confirmNew ? '저장된 모험이 있어요. 새로 시작하면 덮어씁니다. 한 번 더 Enter!' : '');
  }

  choose() {
    initAudio();
    if (this.sel === 1) {
      if (!this.saveExists || !load()) {
        sfx.error();
        return;
      }
      sfx.select();
      this.go({ map: G.map, spawn: G.spawn, usePos: true });
      return;
    }
    if (this.saveExists && !this.confirmNew) {
      this.confirmNew = true;
      sfx.cursor();
      this.redraw();
      return;
    }
    sfx.select();
    newGame();
    this.go({ map: 'village', spawn: 'home' });
  }

  go(data) {
    this.input.keyboard.enabled = false;
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.input.keyboard.enabled = true;
      this.scene.start('World', data);
    });
  }
}
