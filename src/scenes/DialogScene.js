// 대화창: 글자가 한 글자씩 나오고, E/스페이스/Enter로 넘긴다. 마지막에 선택지가 있을 수 있다.

import { GAME_W, GAME_H } from '../config.js';
import { text, panel, bindMenuKeys, COLORS } from '../ui.js';
import { sfx } from '../audio.js';

const BOX = { x: 70, y: GAME_H - 210, w: GAME_W - 140, h: 180 };

export class DialogScene extends Phaser.Scene {
  constructor() {
    super('Dialog');
  }

  init(data) {
    this.lines = data.lines || [];
    this.choices = data.choices || null;
    this.onDone = data.onDone || null;
    this.idx = 0;
    this.choiceIdx = 0;
    this.choiceMode = false;
    this.closed = false;
  }

  create() {
    panel(this, BOX.x, BOX.y, BOX.w, BOX.h, { alpha: 0.96 });
    this.nameTag = this.add.container(BOX.x + 30, BOX.y - 6);
    this.nameBg = this.add.graphics();
    this.nameText = text(this, 18, 0, '', { size: 20, bold: true, color: COLORS.gold, origin: [0, 0.5] });
    this.nameTag.add([this.nameBg, this.nameText]);

    this.body = text(this, BOX.x + 36, BOX.y + 36, '', { size: 26, wrap: BOX.w - 80, lineSpacing: 10 });
    this.arrow = text(this, BOX.x + BOX.w - 40, BOX.y + BOX.h - 34, '▼', { size: 20, color: COLORS.gold, origin: 0.5 });
    this.tweens.add({ targets: this.arrow, y: '+=5', duration: 350, yoyo: true, repeat: -1 });

    this.choiceBox = this.add.container(0, 0).setVisible(false);

    bindMenuKeys(this, {
      ok: () => this.advance(),
      cancel: () => {
        if (this.choiceMode) this.finish(this.choices.length - 1);
        else this.advance();
      },
      up: () => this.moveChoice(-1),
      down: () => this.moveChoice(1),
    });
    this.showLine();
  }

  showLine() {
    const L = this.lines[this.idx];
    const narration = !L.speaker;
    this.nameTag.setVisible(!narration);
    if (!narration) {
      this.nameText.setText(L.speaker);
      const w = this.nameText.width + 36;
      this.nameBg.clear();
      this.nameBg.fillStyle(0x2a2238, 1);
      this.nameBg.fillRoundedRect(0, -20, w, 40, 8);
      this.nameBg.lineStyle(2, 0xd8b860, 1);
      this.nameBg.strokeRoundedRect(0, -20, w, 40, 8);
    }
    this.body.setColor(narration ? '#d8d0f0' : COLORS.text);
    this.full = L.text;
    this.shown = 0;
    this.typing = true;
    this.arrow.setVisible(false);
    this.body.setText('');
    if (this.typer) this.typer.remove();
    this.typer = this.time.addEvent({
      delay: 28,
      loop: true,
      callback: () => {
        this.shown++;
        this.body.setText(this.full.slice(0, this.shown));
        if (this.shown % 2 === 0 && this.full[this.shown - 1] !== ' ') sfx.blip();
        if (this.shown >= this.full.length) this.endTyping();
      },
    });
  }

  endTyping() {
    if (this.typer) this.typer.remove();
    this.typer = null;
    this.typing = false;
    this.body.setText(this.full);
    const last = this.idx === this.lines.length - 1;
    if (last && this.choices) this.showChoices();
    else this.arrow.setVisible(true);
  }

  advance() {
    if (this.closed) return;
    if (this.choiceMode) {
      this.finish(this.choiceIdx);
      return;
    }
    if (this.typing) {
      this.endTyping();
      return;
    }
    if (this.idx < this.lines.length - 1) {
      this.idx++;
      sfx.cursor();
      this.showLine();
    } else {
      this.finish(0);
    }
  }

  showChoices() {
    this.choiceMode = true;
    this.choiceIdx = 0;
    const w = 300;
    const h = this.choices.length * 50 + 24;
    const x = BOX.x + BOX.w - w;
    const y = BOX.y - h - 14;
    this.choiceBox.removeAll(true);
    this.choiceBox.add(panel(this, x, y, w, h));
    this.choiceTexts = this.choices.map((c, i) => {
      const t = text(this, x + 56, y + 22 + i * 50, c, { size: 22 });
      this.choiceBox.add(t);
      return t;
    });
    this.cursor = text(this, x + 22, 0, '▶', { size: 20, color: COLORS.gold });
    this.choiceBox.add(this.cursor);
    this.choiceBox.setVisible(true);
    this.moveChoice(0);
  }

  moveChoice(d) {
    if (!this.choiceMode) return;
    if (d) sfx.cursor();
    this.choiceIdx = (this.choiceIdx + d + this.choices.length) % this.choices.length;
    this.choiceTexts.forEach((t, i) => t.setColor(i === this.choiceIdx ? COLORS.gold : COLORS.text));
    this.cursor.setY(this.choiceTexts[this.choiceIdx].y + 2);
  }

  finish(choice) {
    if (this.closed) return;
    this.closed = true;
    sfx.select();
    const cb = this.onDone;
    this.scene.resume('World');
    this.scene.stop();
    if (cb) cb(choice);
  }
}
