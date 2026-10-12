// 모든 그래픽을 코드로 직접 그린다 (외부 이미지 파일 없음).
// 작은 픽셀 버퍼(Pix)에 점을 찍고, 자동으로 외곽선을 두른 뒤 Phaser 텍스처로 등록한다.

// ---------------------------------------------------------------- 도우미

function rng(seed) {
  // 항상 같은 결과가 나오는 난수 (타일 무늬가 매번 같도록)
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + amt * 255)));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

class Pix {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.d = new Array(w * h).fill(null);
  }
  set(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c;
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.d[y * this.w + x];
  }
  rect(x, y, w, h, c) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
  }
  ellipse(cx, cy, rx, ry, c, test) {
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) {
      for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1 && (!test || test(x, y))) this.set(x, y, c);
      }
    }
  }
  fill(c) {
    this.d.fill(c);
  }
  outline(c) {
    const src = this.d.slice();
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (src[y * this.w + x]) continue;
        const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
          const xx = x + dx, yy = y + dy;
          return xx >= 0 && yy >= 0 && xx < this.w && yy < this.h && src[yy * this.w + xx];
        });
        if (n) this.d[y * this.w + x] = c;
      }
    }
    return this;
  }
  flipX() {
    const p = new Pix(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) p.d[y * this.w + (this.w - 1 - x)] = this.d[y * this.w + x];
    return p;
  }
  drawTo(ctx, ox, oy) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.d[y * this.w + x];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  }
}

// 여러 프레임을 가로로 이어 붙여 하나의 텍스처로 등록
function addSheet(scene, key, frames) {
  const w = frames[0].w, h = frames[0].h;
  const canvas = document.createElement('canvas');
  canvas.width = w * frames.length;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  frames.forEach((p, i) => p.drawTo(ctx, i * w, 0));
  const tex = scene.textures.addCanvas(key, canvas);
  frames.forEach((_, i) => tex.add(i, 0, i * w, 0, w, h));
  return tex;
}

const OUT = '#1a1424';

// ---------------------------------------------------------------- 사람

export const LOOKS = {
  player: { skin: '#f5c9a0', hair: '#7a4a24', shirt: '#3d7fd6', pants: '#3b3b5c', shoes: '#5a3a22', style: 'short' },
  chief: { skin: '#eebd96', hair: '#e8e8e8', shirt: '#8d5aa8', pants: '#4a3a5a', shoes: '#4a3022', style: 'short', beard: '#f0f0f0' },
  smith: { skin: '#d9a070', hair: '#3a2a20', shirt: '#7a5236', pants: '#3a3a3a', shoes: '#2a2a2a', style: 'short', beard: '#3a2a20', apron: '#5a3a26' },
  mina: { skin: '#f8d0b0', hair: '#e07aa0', shirt: '#f0e0a0', pants: '#c0507a', shoes: '#7a3a4a', style: 'long' },
  innkeeper: { skin: '#eab890', hair: '#9a6030', shirt: '#e8e0d0', pants: '#5a6a3a', shoes: '#4a3022', style: 'short', apron: '#c8b890' },
  kid: { skin: '#f8d0b0', hair: '#e0a030', shirt: '#e05050', pants: '#3a5aa0', shoes: '#4a3022', style: 'short' },
  farmer: { skin: '#e8b088', hair: '#b05a2a', shirt: '#5aa05a', pants: '#8a6a3a', shoes: '#4a3022', style: 'long', hat: '#e8c860' },
  guard: { skin: '#eebd96', hair: '#a8b0c0', shirt: '#7088a8', pants: '#4a5468', shoes: '#2a2a3a', style: 'helmet' },
  wizard: { skin: '#eebd96', hair: '#c8c8d8', shirt: '#4a3a9a', pants: '#3a2a7a', shoes: '#2a2050', style: 'short', beard: '#dcdce8', hat: '#4a3a9a', pointy: true },
  skeleton: { skin: '#ebe5cf', hair: null, shirt: '#d6cfb3', pants: '#c4bc9e', shoes: '#8d8670', style: 'bald', ribs: true, eyes: '#3a0a0a' },
  herbalist: { skin: '#e2b08a', hair: '#b8b8b0', shirt: '#5a7a3a', pants: '#4a5a2a', shoes: '#3a2a1a', style: 'long', hat: '#3e6a30', apron: '#8a7a50' },
  climber: { skin: '#e8b890', hair: '#4a3020', shirt: '#c84a3a', pants: '#3a4a6a', shoes: '#3a2a1a', style: 'short', hat: '#3a6ac8' },
};

// dir: 0=아래, 1=위, 2=옆(오른쪽)  frame: 0=서기, 1/2=걷기
function human(look, dir, frame) {
  const p = new Pix(16, 16);
  const { skin, hair, shirt, pants, shoes } = look;
  const belt = shade(shirt, -0.25);
  const sleeve = shade(shirt, -0.08);
  const bob = frame === 0 ? 0 : 0;

  // 다리
  const legY = 12 + bob;
  if (dir === 2) {
    if (frame === 0) {
      p.rect(6, legY, 2, 2, pants); p.rect(8, legY, 2, 2, pants);
      p.rect(6, 14, 2, 1, shoes); p.rect(8, 14, 3, 1, shoes);
    } else if (frame === 1) {
      p.rect(9, legY, 2, 2, pants); p.rect(5, legY, 2, 2, pants);
      p.rect(9, 14, 3, 1, shoes); p.rect(4, 14, 3, 1, shoes);
    } else {
      p.rect(7, legY, 2, 2, pants); p.rect(7, legY, 2, 2, pants);
      p.rect(7, 14, 3, 1, shoes);
    }
  } else {
    const lUp = frame === 1 ? 1 : 0, rUp = frame === 2 ? 1 : 0;
    p.rect(5, legY, 2, 2 - lUp, pants); p.rect(5, 14 - lUp, 2, 1, shoes);
    p.rect(9, legY, 2, 2 - rUp, pants); p.rect(9, 14 - rUp, 2, 1, shoes);
  }

  // 몸통
  p.rect(5, 8, 6, 3, shirt);
  p.rect(5, 11, 6, 1, belt);
  if (look.apron && dir !== 1) p.rect(6, 9, 4, 3, look.apron);
  if (look.ribs && dir !== 1) {
    p.rect(6, 8, 4, 1, '#9a947c'); p.rect(6, 10, 4, 1, '#9a947c');
  }

  // 팔
  if (dir === 2) {
    const ax = frame === 1 ? 9 : frame === 2 ? 6 : 7;
    p.rect(ax, 8, 2, 2, sleeve); p.rect(ax, 10, 2, 1, skin);
  } else {
    const sw1 = frame === 1 ? -1 : frame === 2 ? 1 : 0;
    p.rect(4, 8 + Math.max(0, sw1), 1, 2, sleeve); p.set(4, 10 + Math.max(0, sw1), skin);
    p.rect(11, 8 + Math.max(0, -sw1), 1, 2, sleeve); p.set(11, 10 + Math.max(0, -sw1), skin);
  }

  // 머리
  p.rect(4, 2, 8, 6, skin);
  p.rect(5, 1, 6, 1, skin);
  if (hair) {
    if (dir === 1) {
      p.rect(4, 1, 8, 7, hair);
      p.rect(5, 0, 6, 1, hair);
      if (look.style === 'long') p.rect(4, 8, 8, 2, hair);
    } else if (dir === 0) {
      p.rect(4, 1, 8, 2, hair);
      p.rect(5, 0, 6, 1, hair);
      p.set(4, 3, hair); p.set(11, 3, hair);
      if (look.style === 'long') { p.rect(3, 3, 1, 6, hair); p.rect(12, 3, 1, 6, hair); p.rect(4, 4, 1, 4, hair); p.rect(11, 4, 1, 4, hair); }
      if (look.style === 'helmet') { p.rect(4, 1, 8, 3, hair); p.rect(3, 3, 1, 3, hair); p.rect(12, 3, 1, 3, hair); p.set(7, 0, shade(hair, 0.2)); p.set(8, 0, shade(hair, 0.2)); }
    } else {
      p.rect(4, 1, 8, 2, hair);
      p.rect(5, 0, 6, 1, hair);
      p.rect(4, 3, 3, 3, hair);
      if (look.style === 'long') p.rect(3, 3, 3, 6, hair);
      if (look.style === 'helmet') { p.rect(4, 1, 8, 3, hair); p.rect(3, 3, 3, 3, hair); }
    }
  }
  // 얼굴
  const eye = look.eyes || '#2a1a1a';
  if (dir === 0) {
    p.set(6, 5, eye); p.set(9, 5, eye);
    if (look.style === 'bald') { p.rect(6, 4, 1, 2, eye); p.rect(9, 4, 1, 2, eye); p.rect(6, 7, 4, 1, '#9a947c'); }
    else p.set(7, 7, shade(skin, -0.12)), p.set(8, 7, shade(skin, -0.12));
  } else if (dir === 2) {
    p.set(10, 5, eye);
    if (look.style === 'bald') p.rect(10, 4, 1, 2, eye);
    p.set(12, 5, skin);
  }
  // 수염
  if (look.beard && dir !== 1) {
    if (dir === 0) { p.rect(5, 6, 6, 2, look.beard); p.rect(6, 8, 4, 2, look.beard); p.set(6, 5, eye); p.set(9, 5, eye); }
    else { p.rect(8, 6, 4, 2, look.beard); p.rect(9, 8, 2, 1, look.beard); }
  }
  // 모자
  if (look.hat) {
    const hc = look.hat;
    if (look.pointy) {
      p.rect(3, 2, 10, 1, hc); p.rect(4, 1, 8, 1, hc); p.rect(5, 0, 6, 1, hc);
      p.rect(4, 0, 8, 1, null);
      p.rect(5, 0, 6, 1, hc);
      p.set(dir === 2 ? 4 : 11, 0, shade(hc, 0.15));
      p.set(7, 1, '#f0d040');
    } else {
      p.rect(2, 2, 12, 1, hc); p.rect(4, 0, 8, 2, hc); p.rect(4, 1, 8, 1, shade(hc, -0.2));
    }
  }
  return p.outline(OUT);
}

function makeHuman(scene, key, look) {
  const frames = [];
  for (let dir = 0; dir < 3; dir++) for (let f = 0; f < 3; f++) frames.push(human(look, dir, f));
  addSheet(scene, key, frames);
}

// ---------------------------------------------------------------- 몬스터

function slime(frame) {
  const p = new Pix(16, 16);
  const c = '#5cd65c';
  if (frame === 0) p.ellipse(8, 10.5, 6.2, 4.6, c);
  else p.ellipse(8, 11.5, 7, 3.6, c);
  const top = frame === 0 ? 7 : 9;
  p.ellipse(8, top + 0.5, 2, 1.5, c);
  p.ellipse(8, frame === 0 ? 12.5 : 13, 5, 1.6, shade(c, -0.15));
  p.set(5, top + 1, '#e8ffe8'); p.set(6, top + 1, '#e8ffe8'); p.set(5, top + 2, '#e8ffe8');
  const ey = frame === 0 ? 10 : 11;
  p.rect(6, ey, 1, 2, '#1a3a1a'); p.rect(9, ey, 1, 2, '#1a3a1a');
  return p.outline('#1d4a22');
}

function mushroom(frame) {
  const p = new Pix(16, 16);
  const cap = '#d94a4a', stem = '#f0dcb0';
  if (frame === 2) {
    // 숨은 상태: 땅에 박힌 갓만 보임
    p.ellipse(8, 14, 6.5, 4.5, cap, (x, y) => y < 14);
    p.set(5, 11, '#fff'); p.set(9, 10, '#fff'); p.set(11, 12, '#fff');
    p.rect(3, 13, 10, 1, shade(cap, -0.2));
    return p.outline('#4a1418');
  }
  const off = frame === 1 ? 1 : 0;
  p.rect(5, 8, 6, 5, stem);
  p.rect(6, 10, 1, 2, '#2a1a1a'); p.rect(9, 10, 1, 2, '#2a1a1a');
  p.rect(4 + off, 13, 3, 1, shade(stem, -0.25)); p.rect(9 - off, 13, 3, 1, shade(stem, -0.25));
  p.ellipse(8, 7.5, 6.8, 5.5, cap, (x, y) => y < 8);
  p.rect(2, 7, 12, 1, shade(cap, -0.2));
  p.set(5, 4, '#fff'); p.set(6, 4, '#fff'); p.set(10, 3, '#fff'); p.set(11, 5, '#fff'); p.set(4, 6, '#fff'); p.set(8, 5, '#fff');
  return p.outline('#4a1418');
}

function bat(frame) {
  const p = new Pix(16, 16);
  const body = '#6b4a9e', wing = '#4a3270';
  if (frame === 0) {
    for (let i = 0; i < 5; i++) { p.rect(1 + i, 4 + i, 1, 4 - Math.floor(i / 2), wing); p.rect(14 - i, 4 + i, 1, 4 - Math.floor(i / 2), wing); }
    p.rect(1, 3, 2, 2, wing); p.rect(13, 3, 2, 2, wing);
  } else {
    for (let i = 0; i < 5; i++) { p.rect(1 + i, 9 - Math.floor(i / 3), 1, 3, wing); p.rect(14 - i, 9 - Math.floor(i / 3), 1, 3, wing); }
    p.rect(1, 11, 1, 2, wing); p.rect(14, 11, 1, 2, wing);
  }
  p.ellipse(8, 8.5, 3.5, 3.5, body);
  p.set(5, 4, body); p.set(6, 5, body); p.set(10, 4, body); p.set(9, 5, body);
  p.set(6, 8, '#ff4a4a'); p.set(9, 8, '#ff4a4a');
  p.set(7, 10, '#fff'); p.set(8, 10, '#fff');
  return p.outline('#1a1030');
}

function boss(frame) {
  const p = new Pix(32, 32);
  const cloak = '#3b2a5c', dark = '#251a3c', armor = '#5a4a7a', metal = '#b8b8c8';
  // 칼
  p.rect(27, 6, 2, 18, metal); p.rect(27, 6, 1, 18, '#e8e8f0'); p.rect(25, 22, 6, 2, '#c8a040'); p.rect(27, 24, 2, 4, '#5a3a22');
  // 망토
  for (let y = 12; y < 30; y++) {
    const half = 6 + Math.floor((y - 12) * 0.55);
    p.rect(16 - half, y, half * 2, 1, cloak);
  }
  // 망토 끝자락 (펄럭임)
  for (let x = 5; x < 27; x++) {
    const up = ((x + frame * 2) % 4 < 2) ? 1 : 0;
    p.set(x, 29 - up, cloak);
    if (up) p.set(x, 29, null);
  }
  for (let y = 16; y < 29; y += 1) { p.set(12, y, dark); p.set(19, y, dark); }
  // 갑옷 몸통
  p.rect(11, 13, 10, 8, armor);
  p.rect(9, 12, 4, 3, shade(armor, 0.1)); p.rect(19, 12, 4, 3, shade(armor, 0.1));
  p.rect(15, 15, 2, 2, '#ff4060'); p.set(15, 15, '#ffa0b0');
  // 머리 (투구)
  p.ellipse(16, 8.5, 5.2, 5, dark);
  p.rect(12, 9, 8, 2, '#100818');
  p.rect(13, 9, 2, 1, '#ff3030'); p.rect(17, 9, 2, 1, '#ff3030');
  // 뿔
  const horn = '#d8d0b8';
  [[11, 5], [10, 4], [9, 3], [9, 2], [8, 1]].forEach(([x, y]) => p.set(x, y, horn));
  [[20, 5], [21, 4], [22, 3], [22, 2], [23, 1]].forEach(([x, y]) => p.set(x, y, horn));
  // 팔
  p.rect(23, 14, 3, 6, armor); p.rect(25, 19, 3, 3, armor);
  p.rect(6, 14, 3, 6, armor); p.rect(6, 20, 3, 2, armor);
  return p.outline('#0a0610');
}

function toad(frame) {
  const p = new Pix(16, 16);
  const c = '#6a8a3a', belly = '#c8c070';
  const squash = frame === 1 ? 1 : 0;
  p.ellipse(8, 10.5 + squash * 0.5, 6, 4.2 - squash * 0.6, c);
  p.ellipse(8, 12, 4, 2, belly);
  // 눈 (튀어나옴)
  p.ellipse(5, 6.5 + squash, 2, 2, c); p.ellipse(11, 6.5 + squash, 2, 2, c);
  p.set(5, 6 + squash, '#f0e060'); p.set(11, 6 + squash, '#f0e060');
  p.set(5, 7 + squash, '#1a1a0a'); p.set(11, 7 + squash, '#1a1a0a');
  // 점박이
  p.set(4, 10, '#4a6a2a'); p.set(11, 9, '#4a6a2a'); p.set(9, 11, '#4a6a2a');
  p.rect(6, 10, 4, 1, '#3a4a1a');
  // 발
  p.rect(2, 13, 2, 2, c); p.rect(12, 13, 2, 2, c);
  return p.outline('#1e2a10');
}

function wisp(frame) {
  const p = new Pix(16, 16);
  const outer = '#5ab0e8', mid = '#a8e0ff', core = '#ffffff';
  const sway = frame === 0 ? 0 : 1;
  p.ellipse(8, 9.5, 4.5, 4.5, outer);
  for (let y = 2; y < 8; y++) {
    const half = Math.max(1, Math.floor((y - 1) * 0.6));
    p.rect(8 - half + (y < 5 ? sway : 0), y, half * 2, 1, outer);
  }
  p.ellipse(8, 10, 3, 3, mid);
  p.ellipse(8, 10.5, 1.6, 1.6, core);
  p.set(6, 9, '#1a3a5a'); p.set(10, 9, '#1a3a5a');
  return p.outline('#183048');
}

function wolf(frame) {
  // 옆모습 (오른쪽을 봄)
  const p = new Pix(16, 16);
  const fur = '#e8eef4', shade2 = '#b8c4d4';
  p.ellipse(7, 9, 5.5, 3, fur);
  p.ellipse(12, 7, 3, 2.6, fur);
  p.rect(13, 7, 3, 2, fur); p.set(15, 8, '#2a2a3a');
  p.set(11, 4, fur); p.set(12, 3, fur); p.set(10, 4, fur);
  p.set(12, 6, '#2a6ad0');
  // 꼬리
  p.rect(1, 6, 2, 2, fur); p.set(0, 5, fur);
  // 다리
  const a = frame === 0 ? 0 : 1;
  p.rect(3 + a, 11, 2, 3, shade2); p.rect(9 - a, 11, 2, 3, shade2);
  p.rect(5 - a, 11, 1, 3, fur); p.rect(11 + a, 11, 1, 3, fur);
  p.rect(4, 10, 6, 1, shade2);
  return p.outline('#2a3040');
}

function iceSpirit(frame) {
  const p = new Pix(16, 16);
  const c = '#7ad8f8', light = '#d8f8ff', dark = '#3a90c8';
  const bob = frame === 0 ? 0 : 1;
  // 다이아몬드 몸통
  for (let y = 2; y < 14; y++) {
    const d = y < 8 ? y - 2 : 13 - y;
    p.rect(8 - d, y - bob, d * 2, 1, y < 8 ? light : c);
  }
  p.rect(7, 4 - bob, 1, 6, '#ffffff');
  p.rect(5, 8 - bob, 1, 1, dark); p.rect(10, 8 - bob, 1, 1, dark);
  // 주변을 도는 작은 조각
  const orbit = frame === 0 ? [[1, 4], [14, 11]] : [[2, 11], [13, 4]];
  for (const [x, y] of orbit) { p.set(x, y, c); p.set(x, y + 1, dark); }
  return p.outline('#183850');
}

function golem(frame) {
  const p = new Pix(32, 32);
  const ice = '#9ad0f0', light = '#e0f6ff', dark = '#5a90c0', rock = '#6a7688';
  const arm = frame === 0 ? 0 : 1;
  // 다리
  p.rect(9, 24, 6, 6, rock); p.rect(17, 24, 6, 6, rock);
  p.rect(9, 24, 6, 1, dark); p.rect(17, 24, 6, 1, dark);
  // 몸통
  p.ellipse(16, 17, 10, 8.5, ice);
  p.ellipse(13, 13, 5, 3.5, light);
  p.rect(12, 20, 8, 1, dark); p.rect(14, 22, 4, 1, dark);
  // 머리
  p.rect(12, 3, 8, 7, rock); p.rect(13, 2, 6, 1, rock);
  p.rect(13, 4, 6, 1, light);
  p.rect(13, 6, 2, 2, '#40e0ff'); p.rect(17, 6, 2, 2, '#40e0ff');
  // 얼음 뿔
  p.rect(11, 0, 1, 3, light); p.rect(20, 0, 1, 3, light);
  // 팔 (주먹)
  p.rect(3, 12 + arm, 5, 9, ice); p.rect(2, 20 + arm, 7, 5, rock);
  p.rect(24, 12 - arm, 5, 9, ice); p.rect(23, 20 - arm, 7, 5, rock);
  p.rect(4, 13 + arm, 1, 5, light); p.rect(25, 13 - arm, 1, 5, light);
  // 어깨 수정
  p.rect(6, 9, 3, 3, '#40c0f0'); p.rect(23, 9, 3, 3, '#40c0f0');
  p.set(7, 8, light); p.set(24, 8, light);
  return p.outline('#102030');
}

function herb(frame) {
  const p = new Pix(16, 16);
  const leaf = '#3a8a4a', glow = frame === 0 ? '#c8f0ff' : '#ffffff';
  p.rect(7, 8, 2, 6, leaf);
  p.ellipse(5, 10, 2.5, 1.4, leaf); p.ellipse(11, 9, 2.5, 1.4, leaf);
  p.ellipse(8, 5, 2.6, 2.6, '#7ad0ff');
  p.ellipse(8, 5, 1.4, 1.4, glow);
  p.set(4, 4, frame === 0 ? '#a8e8ff' : null); p.set(12, 3, frame === 1 ? '#a8e8ff' : null);
  return p.outline('#143a2a');
}

function poison() {
  const p = new Pix(8, 8);
  p.ellipse(4, 4, 3.4, 3.4, '#6ad040');
  p.ellipse(3.5, 3.5, 1.4, 1.4, '#c8ff90');
  return p.outline('#1e4a10');
}

function shard() {
  // 오른쪽을 향한 얼음 조각
  const p = new Pix(10, 6);
  p.rect(1, 2, 7, 2, '#a8e8ff');
  p.rect(3, 1, 4, 4, '#a8e8ff');
  p.rect(8, 2, 1, 2, '#ffffff'); p.set(9, 3, '#ffffff');
  p.rect(3, 2, 4, 1, '#ffffff');
  return p.outline('#2a6a9a');
}

function snowflake() {
  const p = new Pix(3, 3);
  p.set(1, 0, '#ffffff'); p.set(0, 1, '#ffffff'); p.set(1, 1, '#ffffff'); p.set(2, 1, '#ffffff'); p.set(1, 2, '#ffffff');
  return p;
}

function firefly() {
  const p = new Pix(3, 3);
  p.set(1, 1, '#f8ffa0'); p.set(0, 1, 'rgba(200,255,120,0.5)'); p.set(2, 1, 'rgba(200,255,120,0.5)');
  p.set(1, 0, 'rgba(200,255,120,0.5)'); p.set(1, 2, 'rgba(200,255,120,0.5)');
  return p;
}

function cat(frame) {
  const p = new Pix(16, 16);
  const c = '#f0a040', d = '#c87828';
  p.ellipse(8, 11.5, 4.2, 3.5, c);
  p.ellipse(8, 6.5, 3.5, 3, c);
  p.set(5, 3, c); p.set(5, 4, c); p.set(11, 3, c); p.set(11, 4, c);
  p.set(6, 4, '#f8c8c8'); p.set(10, 4, '#f8c8c8');
  p.set(7, 6, '#2a1a1a'); p.set(9, 6, '#2a1a1a'); p.set(8, 7, '#e07070');
  p.rect(6, 10, 1, 3, d); p.rect(9, 10, 1, 3, d);
  if (frame === 0) { p.rect(12, 10, 1, 3, c); p.rect(13, 8, 1, 3, c); }
  else { p.rect(12, 11, 2, 1, c); p.rect(14, 9, 1, 3, c); }
  return p.outline('#4a2a14');
}

// ---------------------------------------------------------------- 소품 / 아이템

function chest(open) {
  const p = new Pix(16, 16);
  const wood = '#a0662a', dk = '#6e4218', gold = '#f0c040';
  if (!open) {
    p.rect(2, 7, 12, 7, wood);
    p.rect(2, 4, 12, 3, shade(wood, 0.08));
    p.rect(3, 3, 10, 1, shade(wood, 0.08));
    p.rect(2, 7, 12, 1, dk);
    p.rect(2, 4, 1, 10, gold); p.rect(13, 4, 1, 10, gold);
    p.rect(7, 7, 2, 3, gold); p.set(7, 9, dk);
  } else {
    p.rect(2, 8, 12, 6, wood);
    p.rect(3, 2, 10, 5, shade(wood, 0.08));
    p.rect(3, 6, 10, 2, '#2a1808');
    p.rect(2, 8, 12, 1, dk);
    p.rect(2, 8, 1, 6, gold); p.rect(13, 8, 1, 6, gold);
    p.rect(3, 2, 1, 5, gold); p.rect(12, 2, 1, 5, gold);
  }
  return p.outline('#2a1808');
}

function rock() {
  const p = new Pix(16, 16);
  p.ellipse(8, 9, 6.8, 6, '#8a8a92');
  p.ellipse(7, 7.5, 4, 3.5, '#a4a4ac');
  p.set(5, 5, '#c8c8d0'); p.set(6, 5, '#c8c8d0');
  p.rect(9, 11, 3, 1, '#6a6a72'); p.set(4, 10, '#6a6a72');
  return p.outline('#2a2a30');
}

function door() {
  const p = new Pix(32, 16);
  p.rect(0, 0, 32, 16, '#3a3048');
  p.rect(0, 0, 32, 2, '#5a4a6a');
  for (let x = 3; x < 32; x += 6) p.rect(x, 2, 1, 14, '#2a2038');
  p.rect(0, 7, 32, 1, '#5a4a6a');
  p.rect(14, 5, 4, 7, '#7a4ab0');
  p.rect(15, 7, 2, 3, '#120818');
  p.set(15, 5, '#c890ff'); p.set(16, 5, '#c890ff');
  return p;
}

function spikes(up) {
  const p = new Pix(16, 16);
  p.rect(1, 1, 14, 14, '#4a4a58');
  p.rect(1, 1, 14, 1, '#5a5a6a');
  const pts = [[3, 4], [9, 4], [6, 9], [12, 9], [3, 13], [9, 13]];
  for (const [x, y] of pts) {
    if (up) {
      p.set(x + 1, y - 3, '#f0f0f8'); p.rect(x + 1, y - 2, 1, 1, '#d8d8e0');
      p.rect(x, y - 1, 3, 1, '#b8b8c8'); p.rect(x, y, 3, 1, '#8a8a9a');
    } else {
      p.rect(x, y, 3, 1, '#2a2a34');
    }
  }
  return p;
}

function potion(color) {
  const p = new Pix(16, 16);
  p.rect(6, 2, 4, 2, '#c8a070');
  p.rect(7, 4, 2, 2, '#d8e8f0');
  p.ellipse(8, 10, 4.5, 4.5, '#d8e8f0');
  p.ellipse(8, 10.8, 3.6, 3.4, color);
  p.set(6, 9, '#ffffff'); p.set(6, 10, '#ffffff');
  return p.outline(OUT);
}

function sword(blade, hilt) {
  const p = new Pix(16, 16);
  for (let i = 0; i < 9; i++) { p.set(4 + i, 11 - i, blade); p.set(5 + i, 11 - i, shade(blade, -0.18)); }
  p.set(13, 2, blade);
  p.rect(2, 10, 5, 1, hilt); p.rect(5, 9, 1, 5, hilt);
  p.set(3, 12, '#6a4020'); p.set(2, 13, '#6a4020');
  return p.outline(OUT);
}

function armor(color) {
  const p = new Pix(16, 16);
  p.rect(4, 3, 8, 10, color);
  p.rect(2, 3, 3, 4, color); p.rect(11, 3, 3, 4, color);
  p.rect(6, 3, 4, 2, null);
  p.rect(6, 3, 4, 1, shade(color, -0.25));
  p.rect(4, 8, 8, 1, shade(color, -0.2));
  p.set(5, 5, shade(color, 0.25)); p.set(5, 6, shade(color, 0.25));
  return p.outline(OUT);
}

function feather() {
  const p = new Pix(16, 16);
  for (let i = 0; i < 10; i++) {
    const x = 4 + i, y = 13 - i;
    p.set(x, y, '#d0d8e8');
    if (i > 1) { p.set(x - 1, y - 1, '#f0f4ff'); p.set(x - 2, y - 1, '#f0f4ff'); p.set(x + 1, y + 1, '#c0c8e0'); p.set(x + 1, y + 2, '#c0c8e0'); }
  }
  p.set(3, 14, '#a08060');
  return p.outline(OUT);
}

function keyIcon() {
  const p = new Pix(16, 16);
  const c = '#5a4a8a';
  p.ellipse(5, 6, 3.5, 3.5, c);
  p.set(4, 5, '#120818'); p.set(5, 5, '#120818'); p.set(4, 6, '#120818'); p.set(5, 6, '#120818');
  p.rect(7, 6, 7, 2, c);
  p.rect(11, 8, 1, 3, c); p.rect(13, 8, 1, 2, c);
  p.set(4, 3, '#a890e0');
  return p.outline(OUT);
}

function crown() {
  const p = new Pix(16, 16);
  const g = '#f6c83a';
  p.rect(2, 8, 12, 5, g);
  p.rect(2, 4, 2, 4, g); p.rect(7, 3, 2, 5, g); p.rect(12, 4, 2, 4, g);
  p.rect(5, 6, 2, 2, g); p.rect(9, 6, 2, 2, g);
  p.rect(2, 12, 12, 1, shade(g, -0.25));
  p.set(7, 10, '#ff4a6a'); p.set(8, 10, '#ff4a6a'); p.set(4, 10, '#4ab0ff'); p.set(11, 10, '#4ab0ff');
  p.set(3, 9, '#fff6c0');
  return p.outline('#5a3a08');
}

function coin() {
  const p = new Pix(8, 8);
  p.ellipse(4, 4, 3, 3, '#f6c83a');
  p.set(3, 3, '#fff6c0');
  p.rect(4, 3, 1, 2, '#c89a20');
  return p.outline('#6a4a08');
}

function heart() {
  const p = new Pix(16, 16);
  const c = '#e83a4a';
  p.ellipse(5.5, 6, 3.5, 3.5, c); p.ellipse(10.5, 6, 3.5, 3.5, c);
  for (let y = 7; y < 14; y++) { const h = 13 - y; p.rect(8 - h - 1, y, (h + 1) * 2, 1, c); }
  p.set(4, 4, '#ffb0b8'); p.set(4, 5, '#ffb0b8');
  return p.outline('#4a0a14');
}

function orb() {
  const p = new Pix(10, 10);
  p.ellipse(5, 5, 4.5, 4.5, '#6a2ab0');
  p.ellipse(5, 5, 3, 3, '#b060ff');
  p.ellipse(4.5, 4.5, 1.4, 1.4, '#ffffff');
  return p;
}

function slash() {
  // 오른쪽을 향해 휘두르는 초승달 모양
  const p = new Pix(24, 24);
  for (let a = -70; a <= 70; a += 3) {
    const r = (a * Math.PI) / 180;
    for (let rad = 7; rad <= 11; rad++) {
      const fade = Math.abs(a) > 55 ? 0.6 : 1;
      const c = rad >= 10 ? '#ffffff' : rad >= 9 ? '#e0f0ff' : fade < 1 ? '#80b0e0' : '#a8d0ff';
      p.set(12 + Math.cos(r) * rad, 12 + Math.sin(r) * rad, c);
    }
  }
  return p;
}

function sparkle() {
  const p = new Pix(5, 5);
  p.set(2, 0, '#fff6a0'); p.set(2, 4, '#fff6a0'); p.set(0, 2, '#fff6a0'); p.set(4, 2, '#fff6a0');
  p.rect(1, 1, 3, 3, '#fff6a0'); p.set(2, 2, '#ffffff');
  return p;
}

function marker(ch) {
  const p = new Pix(8, 12);
  const c = ch === '!' ? '#ffd23a' : '#7ad0ff';
  if (ch === '!') { p.rect(3, 1, 2, 6, c); p.rect(3, 9, 2, 2, c); }
  else { p.rect(2, 1, 4, 1, c); p.rect(5, 2, 1, 3, c); p.rect(3, 5, 2, 1, c); p.rect(3, 6, 2, 1, c); p.rect(3, 9, 2, 2, c); p.set(1, 2, c); }
  return p.outline('#1a1424');
}

function shadow() {
  const p = new Pix(12, 5);
  p.ellipse(6, 2.5, 5.5, 2.2, 'rgba(0,0,0,0.28)');
  return p;
}

// ---------------------------------------------------------------- 타일

function tile(index) {
  const p = new Pix(16, 16);
  const r = rng(index * 977 + 13);
  const speck = (base, cols, n) => {
    p.fill(base);
    for (let i = 0; i < n; i++) p.set(r() * 16, r() * 16, cols[Math.floor(r() * cols.length)]);
  };
  const grass = () => speck('#5aa64a', ['#4e9640', '#68b656', '#4e9640'], 22);
  const caveFloor = () => speck('#3a3f52', ['#33374a', '#454a60', '#2e3242'], 26);
  const stone = () => {
    p.fill('#5e5a6a');
    for (let y = 0; y < 16; y += 8) p.rect(0, y, 16, 1, '#4a4656');
    p.rect(8, 0, 1, 8, '#4a4656'); p.rect(0, 8, 1, 8, '#4a4656');
    p.set(3, 3, '#6a6676'); p.set(12, 11, '#6a6676');
  };

  switch (index) {
    case 0: grass(); for (let i = 0; i < 4; i++) { const x = r() * 14, y = 2 + r() * 12; p.set(x, y, '#3e8434'); p.set(x + 1, y - 1, '#3e8434'); } break;
    case 20: grass(); break;
    case 1: {
      grass();
      const cols = ['#ffffff', '#ffd84a', '#ff7ab0', '#a0c8ff'];
      for (let i = 0; i < 4; i++) {
        const x = 2 + Math.floor(r() * 12), y = 2 + Math.floor(r() * 12), c = cols[i % cols.length];
        p.set(x, y, c); p.set(x + 1, y, c); p.set(x, y + 1, c); p.set(x - 1, y, c); p.set(x, y - 1, c); p.set(x, y, '#ffe060');
      }
      break;
    }
    case 2: speck('#c8a46a', ['#b8945a', '#d6b47c', '#a8844e'], 30); break;
    case 3: {
      p.fill('#3a7bd5');
      for (let i = 0; i < 4; i++) { const x = Math.floor(r() * 12), y = 2 + i * 4; p.rect(x, y, 4, 1, '#6aa8f0'); }
      p.set(r() * 16, r() * 16, '#a8d4ff');
      break;
    }
    case 4: {
      grass();
      p.rect(7, 11, 3, 5, '#6a4424'); p.rect(7, 11, 1, 5, '#7e5430');
      const can = '#2e7a34';
      const q = new Pix(16, 16);
      q.ellipse(8.5, 7, 7, 6.3, can);
      q.ellipse(7, 5.5, 4, 3.5, '#3e9444');
      q.set(5, 4, '#5ab060'); q.set(6, 3, '#5ab060'); q.set(4, 5, '#5ab060');
      q.set(11, 9, '#22602a'); q.set(10, 10, '#22602a');
      q.outline('#163a1a');
      for (let i = 0; i < 256; i++) if (q.d[i]) p.d[i] = q.d[i];
      break;
    }
    case 5: {
      grass();
      const q = new Pix(16, 16);
      q.ellipse(8, 9.5, 7, 5.5, '#3e9444');
      q.ellipse(6, 8, 3, 2.5, '#52a858');
      q.set(4, 8, '#e04a4a'); q.set(10, 7, '#e04a4a'); q.set(9, 11, '#e04a4a');
      q.outline('#1a4a20');
      for (let i = 0; i < 256; i++) if (q.d[i]) p.d[i] = q.d[i];
      break;
    }
    case 6: {
      p.fill('#d8c49a');
      for (let y = 3; y < 16; y += 4) p.rect(0, y, 16, 1, '#b8a47a');
      p.rect(0, 0, 16, 1, '#8a6a4a');
      p.rect(4, 5, 8, 6, '#6a4a2a'); p.rect(5, 6, 6, 4, '#8ac8f0'); p.rect(7, 6, 1, 4, '#6a4a2a'); p.rect(5, 8, 6, 1, '#6a4a2a');
      p.set(6, 7, '#d0f0ff');
      break;
    }
    case 7: {
      p.fill('#c0503a');
      for (let y = 0; y < 16; y += 4) {
        p.rect(0, y + 3, 16, 1, '#8a3424');
        for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) p.rect(x, y, 1, 3, '#a03e2c');
      }
      p.rect(0, 0, 16, 1, '#d86a50');
      break;
    }
    case 8: {
      p.fill('#d8c49a');
      p.rect(3, 2, 10, 14, '#6a4424');
      p.rect(4, 3, 8, 13, '#8a5a30');
      p.rect(7, 3, 1, 13, '#6a4424');
      p.set(10, 9, '#f0c040'); p.set(5, 9, '#f0c040');
      break;
    }
    case 9: {
      grass();
      p.rect(0, 5, 16, 2, '#b88a50'); p.rect(0, 10, 16, 2, '#b88a50');
      p.rect(2, 3, 3, 11, '#a07440'); p.rect(11, 3, 3, 11, '#a07440');
      p.rect(2, 3, 3, 1, '#c89a60'); p.rect(11, 3, 3, 1, '#c89a60');
      p.rect(0, 7, 16, 1, '#6a4a2a'); p.rect(0, 12, 16, 1, '#6a4a2a');
      break;
    }
    case 10: {
      p.fill('#8a8a96');
      for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < 16; x += 5) p.rect(x, y, 1, 4, '#6a6a76');
      for (let y = 3; y < 16; y += 4) p.rect(0, y, 16, 1, '#6a6a76');
      p.rect(3, 3, 10, 10, '#4a4a56');
      p.rect(4, 4, 8, 8, '#3a7bd5');
      p.rect(5, 5, 3, 1, '#8ac0f8');
      break;
    }
    case 11: {
      p.fill('#3a7bd5');
      p.rect(2, 0, 12, 16, '#b0844c');
      for (let y = 0; y < 16; y += 3) p.rect(2, y, 12, 1, '#8a6434');
      p.rect(1, 0, 1, 16, '#6a4424'); p.rect(14, 0, 1, 16, '#6a4424');
      break;
    }
    case 12: {
      p.fill('#8a5a34');
      for (let y = 1; y < 16; y += 4) { p.rect(0, y, 16, 2, '#6e4426'); }
      for (let x = 2; x < 16; x += 5) { p.set(x, 3, '#5ab83a'); p.set(x + 1, 2, '#6ac84a'); p.set(x, 11, '#5ab83a'); p.set(x - 1, 10, '#6ac84a'); }
      break;
    }
    case 13: caveFloor(); break;
    case 21: caveFloor(); p.set(4, 4, '#4e5470'); p.set(11, 10, '#4e5470'); break;
    case 14: {
      p.fill('#262838');
      for (let i = 0; i < 6; i++) { const x = Math.floor(r() * 12), y = Math.floor(r() * 14); p.rect(x, y, 4, 2, '#323548'); p.rect(x, y, 4, 1, '#3e4258'); }
      p.rect(0, 15, 16, 1, '#1a1c28');
      break;
    }
    case 15: {
      caveFloor();
      const q = new Pix(16, 16);
      q.rect(6, 3, 4, 11, '#5ae0f0'); q.rect(7, 1, 2, 2, '#5ae0f0');
      q.rect(2, 7, 3, 7, '#3ab0d8'); q.set(3, 6, '#3ab0d8');
      q.rect(11, 6, 3, 8, '#3ab0d8'); q.set(12, 5, '#3ab0d8');
      q.rect(7, 3, 1, 9, '#c8fbff'); q.set(3, 8, '#a0f0ff'); q.set(12, 7, '#a0f0ff');
      q.outline('#10303e');
      for (let i = 0; i < 256; i++) if (q.d[i]) p.d[i] = q.d[i];
      break;
    }
    case 16: stone(); break;
    case 17: {
      p.fill('#a02838');
      p.rect(0, 0, 1, 16, '#e0b040'); p.rect(15, 0, 1, 16, '#e0b040');
      for (let y = 2; y < 16; y += 6) { p.set(7, y, '#c84050'); p.set(8, y + 1, '#c84050'); }
      break;
    }
    case 18: {
      p.fill('#2e2838');
      for (let y = 0; y < 16; y += 4) {
        p.rect(0, y + 3, 16, 1, '#1e1828');
        for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) p.rect(x, y, 1, 3, '#1e1828');
        p.rect(0, y, 16, 1, '#3a3446');
      }
      break;
    }
    case 19: {
      stone();
      const q = new Pix(16, 16);
      q.rect(4, 1, 8, 14, '#8a8498'); q.rect(5, 1, 2, 14, '#a8a2b8'); q.rect(3, 0, 10, 2, '#a8a2b8'); q.rect(3, 13, 10, 2, '#6a6478');
      q.outline('#1e1828');
      for (let i = 0; i < 256; i++) if (q.d[i]) p.d[i] = q.d[i];
      break;
    }
    case 22: speck('#4a6a3a', ['#40603a', '#567a44', '#3a5432'], 26); break;
    case 23: {
      speck('#6a5a3a', ['#5e4e32', '#7a6a48', '#54462c'], 30);
      p.ellipse(5, 11, 2.5, 1.2, '#5a4a2e'); p.ellipse(11, 4, 2, 1, '#5a4a2e');
      break;
    }
    case 24: {
      speck('#4a6a3a', ['#40603a', '#567a44'], 18);
      const q = new Pix(16, 16);
      const bark = '#5a4632';
      q.rect(7, 4, 2, 12, bark); q.rect(6, 13, 4, 3, bark);
      [[6, 7], [5, 6], [4, 5], [3, 5], [9, 9], [10, 8], [11, 7], [12, 6], [12, 5], [7, 3], [8, 2], [8, 1], [6, 2]].forEach(([x, y]) => q.set(x, y, bark));
      q.set(7, 6, '#6e5a42'); q.set(7, 10, '#6e5a42');
      q.outline('#1e1a14');
      for (let i = 0; i < 256; i++) if (q.d[i]) p.d[i] = q.d[i];
      break;
    }
    case 25: {
      speck('#4a6a3a', ['#40603a', '#567a44'], 18);
      const q = new Pix(16, 16);
      for (let i = 0; i < 6; i++) {
        const x = 2 + i * 2 + (i % 2);
        const top = 3 + ((i * 5) % 4);
        q.rect(x, top, 1, 15 - top, i % 2 ? '#7a9a4a' : '#6a8a3a');
        if (i % 2 === 0) { q.rect(x, top - 2, 1, 3, '#8a6a3a'); }
      }
      q.outline('#1e2a14');
      for (let i = 0; i < 256; i++) if (q.d[i]) p.d[i] = q.d[i];
      break;
    }
    case 26: {
      p.fill('#2e4a3e');
      for (let i = 0; i < 3; i++) { const x = Math.floor(r() * 11), y = 3 + i * 5; p.rect(x, y, 5, 1, '#46685a'); }
      p.set(r() * 16, r() * 16, '#7a9a6a');
      p.ellipse(11, 11, 2.2, 1.4, '#4a8a4a'); p.set(11, 11, '#e080a0');
      break;
    }
    case 27: speck('#e8eef6', ['#dce4f0', '#f4f8ff', '#d0dae8'], 22); break;
    case 28: {
      p.fill('#a8d4ec');
      p.rect(2, 3, 5, 1, '#d8f0ff'); p.rect(9, 9, 4, 1, '#d8f0ff'); p.rect(4, 12, 2, 1, '#d8f0ff');
      p.set(12, 3, '#ffffff'); p.set(3, 8, '#8ac0e0'); p.set(13, 13, '#8ac0e0');
      break;
    }
    case 29: {
      speck('#e8eef6', ['#dce4f0', '#f4f8ff'], 14);
      const q = new Pix(16, 16);
      q.rect(7, 12, 2, 4, '#6a4424');
      for (let y = 1; y < 13; y++) {
        const half = Math.min(6, 1 + Math.floor((y - 1) * 0.55) + ((y % 4 === 0) ? -1 : 0));
        q.rect(8 - half, y, half * 2, 1, y % 4 === 1 ? '#f4f8ff' : '#2e6a4a');
      }
      q.set(8, 0, '#f4f8ff');
      q.outline('#163028');
      for (let i = 0; i < 256; i++) if (q.d[i]) p.d[i] = q.d[i];
      break;
    }
    case 30: {
      speck('#e8eef6', ['#dce4f0', '#f4f8ff'], 14);
      const q = new Pix(16, 16);
      q.ellipse(8, 9.5, 6.8, 5.6, '#8a96a8');
      q.ellipse(7, 6.5, 5, 2.6, '#f4f8ff');
      q.set(10, 11, '#6a7688'); q.set(11, 10, '#6a7688'); q.set(4, 10, '#6a7688');
      q.outline('#2a3040');
      for (let i = 0; i < 256; i++) if (q.d[i]) p.d[i] = q.d[i];
      break;
    }
    default: p.fill('#ff00ff');
  }
  return p;
}

const TILE_COUNT = 31;

function makeTileset(scene) {
  // 각 타일 둘레에 1픽셀씩 같은 색을 덧대어(extrude) 확대 시 틈이 보이지 않게 한다
  const canvas = document.createElement('canvas');
  canvas.width = TILE_COUNT * 18;
  canvas.height = 18;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < TILE_COUNT; i++) {
    const ox = 1 + i * 18;
    const t = tile(i);
    t.drawTo(ctx, ox, 1);
    ctx.drawImage(canvas, ox, 1, 1, 16, ox - 1, 1, 1, 16);
    ctx.drawImage(canvas, ox + 15, 1, 1, 16, ox + 16, 1, 1, 16);
    ctx.drawImage(canvas, ox - 1, 1, 18, 1, ox - 1, 0, 18, 1);
    ctx.drawImage(canvas, ox - 1, 16, 18, 1, ox - 1, 17, 18, 1);
  }
  scene.textures.addCanvas('tiles', canvas);
}

// ---------------------------------------------------------------- 등록

export function buildTextures(scene) {
  makeTileset(scene);

  for (const [key, look] of Object.entries(LOOKS)) makeHuman(scene, key, look);

  addSheet(scene, 'slime', [slime(0), slime(1)]);
  addSheet(scene, 'mushroom', [mushroom(0), mushroom(1), mushroom(2)]);
  addSheet(scene, 'bat', [bat(0), bat(1)]);
  addSheet(scene, 'boss', [boss(0), boss(1)]);
  addSheet(scene, 'cat', [cat(0), cat(1)]);
  addSheet(scene, 'toad', [toad(0), toad(1)]);
  addSheet(scene, 'wisp', [wisp(0), wisp(1)]);
  addSheet(scene, 'wolf', [wolf(0), wolf(1)]);
  addSheet(scene, 'icespirit', [iceSpirit(0), iceSpirit(1)]);
  addSheet(scene, 'golem', [golem(0), golem(1)]);
  addSheet(scene, 'herb', [herb(0), herb(1)]);
  addSheet(scene, 'poison', [poison()]);
  addSheet(scene, 'shard', [shard()]);
  addSheet(scene, 'snowflake', [snowflake()]);
  addSheet(scene, 'firefly', [firefly()]);

  addSheet(scene, 'chest', [chest(false), chest(true)]);
  addSheet(scene, 'rock', [rock()]);
  addSheet(scene, 'door', [door()]);
  addSheet(scene, 'spikes', [spikes(false), spikes(true)]);
  addSheet(scene, 'coin', [coin()]);
  addSheet(scene, 'heart', [heart()]);
  addSheet(scene, 'orb', [orb()]);
  addSheet(scene, 'slash', [slash()]);
  addSheet(scene, 'sparkle', [sparkle()]);
  addSheet(scene, 'mark_quest', [marker('!')]);
  addSheet(scene, 'mark_report', [marker('?')]);
  addSheet(scene, 'shadow', [shadow()]);

  // 아이템 아이콘: 텍스처 이름은 'icon_' + 아이템 id
  addSheet(scene, 'icon_red_potion', [potion('#e83a4a')]);
  addSheet(scene, 'icon_big_potion', [potion('#ff6a2a')]);
  addSheet(scene, 'icon_feather', [feather()]);
  addSheet(scene, 'icon_wood_sword', [sword('#c8965a', '#7a5030')]);
  addSheet(scene, 'icon_iron_sword', [sword('#c0c4cc', '#8a6a3a')]);
  addSheet(scene, 'icon_steel_sword', [sword('#e0e8f4', '#3a4a8a')]);
  addSheet(scene, 'icon_crystal_sword', [sword('#7af0ff', '#b060ff')]);
  addSheet(scene, 'icon_cloth', [armor('#d8d0b8')]);
  addSheet(scene, 'icon_leather_armor', [armor('#a06a3a')]);
  addSheet(scene, 'icon_iron_armor', [armor('#9aa4b4')]);
  addSheet(scene, 'icon_frost_armor', [armor('#8ad8f8')]);
  addSheet(scene, 'icon_shadow_key', [keyIcon()]);
  addSheet(scene, 'icon_crown', [crown()]);
}

// 걷기/대기 애니메이션 등록
export function buildAnims(scene) {
  const dirs = ['down', 'up', 'side'];
  for (const key of Object.keys(LOOKS)) {
    dirs.forEach((d, i) => {
      scene.anims.create({
        key: `${key}-walk-${d}`,
        frames: [1, 0, 2, 0].map((f) => ({ key, frame: i * 3 + f })),
        frameRate: 8, repeat: -1,
      });
      scene.anims.create({ key: `${key}-idle-${d}`, frames: [{ key, frame: i * 3 }], frameRate: 1 });
    });
  }
  scene.anims.create({ key: 'slime-move', frames: [{ key: 'slime', frame: 0 }, { key: 'slime', frame: 1 }], frameRate: 3, repeat: -1 });
  scene.anims.create({ key: 'mushroom-move', frames: [{ key: 'mushroom', frame: 0 }, { key: 'mushroom', frame: 1 }], frameRate: 6, repeat: -1 });
  scene.anims.create({ key: 'bat-move', frames: [{ key: 'bat', frame: 0 }, { key: 'bat', frame: 1 }], frameRate: 8, repeat: -1 });
  scene.anims.create({ key: 'boss-move', frames: [{ key: 'boss', frame: 0 }, { key: 'boss', frame: 1 }], frameRate: 4, repeat: -1 });
  for (const [key, rate] of [['toad', 3], ['wisp', 6], ['wolf', 8], ['icespirit', 3], ['golem', 3], ['herb', 2]]) {
    scene.anims.create({ key: `${key}-move`, frames: [{ key, frame: 0 }, { key, frame: 1 }], frameRate: rate, repeat: -1 });
  }
  scene.anims.create({ key: 'cat-move', frames: [{ key: 'cat', frame: 0 }, { key: 'cat', frame: 1 }], frameRate: 2, repeat: -1 });
}
