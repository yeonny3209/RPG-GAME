// 퀘스트 목록 (Q)

import { GAME_W, GAME_H } from '../config.js';
import { QUESTS, objective } from '../data/story.js';
import { questState, G } from '../state.js';
import { text, panel, bindMenuKeys, COLORS } from '../ui.js';
import { sfx } from '../audio.js';

export class QuestScene extends Phaser.Scene {
  constructor() {
    super('Quest');
  }

  create() {
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.55).setOrigin(0);
    panel(this, 240, 40, 800, 640);
    text(this, 280, 62, '퀘스트', { size: 30, bold: true, color: COLORS.gold });
    text(this, GAME_W - 280, 74, 'Q · Esc · E: 닫기', { size: 16, color: COLORS.dim, origin: [1, 0] });

    // 진행 중인 퀘스트를 먼저, 완료한 퀘스트는 아래에 한 줄로
    const order = Object.entries(QUESTS).sort(([a], [b]) => (questState(a) === 'done') - (questState(b) === 'done'));
    let y = 120;
    let shown = 0;
    for (const [id, q] of order) {
      const st = questState(id);
      if (st === 'none' && !q.main) continue;
      shown++;
      const label = st === 'done' ? '완료' : st === 'ready' ? '보고하기' : st === 'none' ? '시작 전' : '진행 중';
      const col = st === 'done' ? COLORS.good : st === 'ready' ? COLORS.accent : COLORS.gold;
      text(this, 290, y, (q.main ? '★ ' : '· ') + q.title, { size: 22, bold: true, color: st === 'done' ? COLORS.dim : COLORS.text });
      text(this, GAME_W - 290, y + 2, label, { size: 18, bold: true, color: col, origin: [1, 0] });
      const o = objective(id);
      if (o) text(this, 320, y + 32, '→ ' + o, { size: 17, color: '#d8d0c0' });
      y += o ? 66 : 40;
    }
    if (!shown) text(this, 290, y, '아직 받은 퀘스트가 없다.', { size: 20, color: COLORS.dim });

    const mins = Math.floor(G.playTime / 60000);
    text(this, 280, 648, `플레이 시간 ${mins}분`, { size: 16, color: COLORS.dim });

    const close = () => {
      sfx.cancel();
      this.scene.resume('World');
      this.scene.stop();
    };
    bindMenuKeys(this, { ok: close, cancel: close, extra: { Q: close } });
  }
}
