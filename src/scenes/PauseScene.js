// 일시정지 메뉴 (Esc)

import { GAME_W, GAME_H } from '../config.js';
import { text, panel, bindMenuKeys, COLORS } from '../ui.js';
import { sfx, toggleMute, isMuted, stopMusic } from '../audio.js';

const CONTROLS = [
  ['방향키 / WASD', '이동'],
  ['좌클릭 / 스페이스', '공격 (클릭한 방향으로)'],
  ['E / Enter', '말 걸기, 상자 열기, 대화 넘기기'],
  ['1 / 2', 'HP 포션 / 마나 포션 마시기'],
  ['Z X C V', '스킬 (레벨이 오르면 배움)'],
  ['I', '가방 (아이템 사용, 장비 장착)'],
  ['Q', '퀘스트 목록'],
  ['M', '소리 켜기/끄기'],
  ['Esc', '메뉴'],
];

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create() {
    this.sel = 0;
    this.confirmQuit = false;
    this.showHelp = false;
    this.msg = '';
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.55).setOrigin(0);
    panel(this, GAME_W / 2 - 220, 110, 440, 500);
    text(this, GAME_W / 2, 150, '메뉴', { size: 34, bold: true, color: COLORS.gold, origin: 0.5 });
    this.dyn = this.add.container(0, 0);
    bindMenuKeys(this, {
      up: () => this.move(-1),
      down: () => this.move(1),
      ok: () => this.choose(),
      cancel: () => (this.showHelp ? this.toggleHelp() : this.close()),
    });
    this.redraw();
  }

  items() {
    return [
      '계속하기',
      '저장하기',
      '퀘스트 보기',
      '조작법',
      isMuted() ? '소리: 꺼짐' : '소리: 켜짐',
      this.confirmQuit ? '정말 나갈까요? (한 번 더)' : '타이틀로',
    ];
  }

  move(d) {
    if (this.showHelp) return;
    const n = this.items().length;
    this.sel = (this.sel + d + n) % n;
    this.confirmQuit = false;
    this.msg = '';
    sfx.cursor();
    this.redraw();
  }

  choose() {
    if (this.showHelp) { this.toggleHelp(); return; }
    const W = this.scene.get('World');
    switch (this.sel) {
      case 0: this.close(); return;
      case 1:
        if (W.bossActive) this.msg = '보스와 싸우는 중에는 저장할 수 없다.';
        else this.msg = W.saveHere() ? '저장했다!' : '저장에 실패했다.';
        sfx.select();
        break;
      case 2:
        sfx.select();
        this.scene.stop();
        this.scene.launch('Quest');
        return;
      case 3: this.toggleHelp(); return;
      case 4: toggleMute(); sfx.select(); break;
      case 5:
        if (!this.confirmQuit) { this.confirmQuit = true; sfx.cursor(); break; }
        stopMusic();
        this.scene.stop('World');
        this.scene.stop('UI');
        this.scene.start('Title');
        return;
    }
    this.redraw();
  }

  toggleHelp() {
    this.showHelp = !this.showHelp;
    sfx.select();
    this.redraw();
  }

  redraw() {
    this.dyn.removeAll(true);
    const add = (o) => { this.dyn.add(o); return o; };
    this.items().forEach((label, i) => {
      const y = 220 + i * 56;
      const on = i === this.sel;
      add(text(this, GAME_W / 2, y, (on ? '▶  ' : '') + label, { size: 24, bold: on, origin: 0.5, color: on ? COLORS.gold : COLORS.text }));
    });
    if (this.msg) add(text(this, GAME_W / 2, 575, this.msg, { size: 18, color: COLORS.accent, origin: 0.5 }));

    if (this.showHelp) {
      add(this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.5).setOrigin(0));
      add(panel(this, GAME_W / 2 - 340, 90, 680, 560));
      add(text(this, GAME_W / 2, 140, '조작법', { size: 30, bold: true, color: COLORS.gold, origin: 0.5 }));
      CONTROLS.forEach(([k, v], i) => {
        const y = 180 + i * 44;
        add(text(this, GAME_W / 2 - 290, y, k, { size: 21, bold: true, color: COLORS.accent }));
        add(text(this, GAME_W / 2 - 60, y, v, { size: 21 }));
      });
      add(text(this, GAME_W / 2, 625, 'E 또는 Esc로 닫기', { size: 16, color: COLORS.dim, origin: 0.5 }));
    }
  }

  close() {
    sfx.cancel();
    this.scene.resume('World');
    this.scene.stop();
  }
}
