// 화면 UI를 그릴 때 쓰는 공통 도우미

import { FONT } from './config.js';

export const COLORS = {
  panel: 0x1b1626,
  panelEdge: 0xd8b860,
  panelInner: 0x2a2238,
  text: '#f4ecd8',
  dim: '#9a90a8',
  gold: '#ffd25a',
  good: '#7ae07a',
  bad: '#ff7070',
  accent: '#7ad0ff',
};

// 한글이 또렷하게 보이도록 해상도를 높이고 부드러운 필터를 쓴 글자
export function text(scene, x, y, str, opts = {}) {
  const t = scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: (opts.size || 22) + 'px',
    color: opts.color || COLORS.text,
    fontStyle: opts.bold ? 'bold' : 'normal',
    stroke: opts.stroke || '#000000',
    strokeThickness: opts.strokeThickness ?? (opts.stroke ? 4 : 0),
    align: opts.align || 'left',
    wordWrap: opts.wrap ? { width: opts.wrap, useAdvancedWrap: true } : undefined,
    lineSpacing: opts.lineSpacing ?? 6,
    resolution: 2,
  });
  t.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  if (opts.origin !== undefined) t.setOrigin(...[].concat(opts.origin));
  return t;
}

// 테두리가 있는 창
export function panel(scene, x, y, w, h, opts = {}) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.35);
  g.fillRoundedRect(x + 4, y + 6, w, h, 10);
  g.fillStyle(opts.color ?? COLORS.panel, opts.alpha ?? 0.98);
  g.fillRoundedRect(x, y, w, h, 10);
  g.lineStyle(3, opts.edge ?? COLORS.panelEdge, 1);
  g.strokeRoundedRect(x, y, w, h, 10);
  g.lineStyle(1, 0xffffff, 0.08);
  g.strokeRoundedRect(x + 5, y + 5, w - 10, h - 10, 7);
  return g;
}

// 아이콘 (16x16 그림을 배율로 키워서)
export function icon(scene, x, y, key, scale = 3) {
  return scene.add.image(x, y, key, 0).setScale(scale);
}

// 오버레이 장면에서 열리자마자 같은 키 입력에 반응하지 않도록 잠깐 입력을 막는다
export function guardInput(scene, ms = 150) {
  scene._readyAt = scene.game.loop.time + ms;
  return () => scene.game.loop.time >= scene._readyAt;
}

// 한국어 조사: 받침이 있으면 첫 번째, 없으면 두 번째 (예: josa('철검', '을', '를'))
export function josa(word, withBatchim, without) {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return word + without;
  return word + ((code - 0xac00) % 28 ? withBatchim : without);
}

// 위/아래/선택/취소 키를 한 번에 연결
export function bindMenuKeys(scene, handlers) {
  const ready = guardInput(scene);
  const kb = scene.input.keyboard;
  const on = (keys, fn) => keys.forEach((k) => kb.on('keydown-' + k, (e) => { if (ready() && fn) fn(e); }));
  on(['UP', 'W'], handlers.up);
  on(['DOWN', 'S'], handlers.down);
  on(['LEFT', 'A'], handlers.left);
  on(['RIGHT', 'D'], handlers.right);
  on(['ENTER', 'SPACE', 'E', 'J'], handlers.ok);
  on(['ESC', 'X'], handlers.cancel);
  if (handlers.extra) for (const [k, fn] of Object.entries(handlers.extra)) on([k], fn);
}
