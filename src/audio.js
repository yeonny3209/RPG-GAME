// 효과음과 배경음악을 Web Audio로 직접 합성한다 (외부 소리 파일 없음).

let ctx = null;
let master, musicGain, sfxGain;
let muted = false;
try { muted = localStorage.getItem('lost-crown-muted') === '1'; } catch (e) { /* 저장소 사용 불가 */ }

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.8;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.32;
  musicGain.connect(master);
  sfxGain = ctx.createGain();
  sfxGain.gain.value = 0.55;
  sfxGain.connect(master);
  if (pendingTrack) playMusic(pendingTrack);
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('lost-crown-muted', muted ? '1' : '0'); } catch (e) { /* 무시 */ }
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.02);
  return muted;
}

// ---------------------------------------------------------------- 기본 소리 재료

function tone(freq, dur, { type = 'square', vol = 0.3, slide = null, when = 0, out = sfxGain, attack = 0.005 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

let noiseBuf = null;
function noise(dur, { vol = 0.3, freq = 2000, q = 1, type = 'bandpass', when = 0, slide = null } = {}) {
  if (!ctx) return;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ctx.currentTime + when;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (slide) f.frequency.exponentialRampToValueAtTime(slide, t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f);
  f.connect(g);
  g.connect(sfxGain);
  s.start(t);
  s.stop(t + dur + 0.02);
}

// ---------------------------------------------------------------- 효과음

export const sfx = {
  swing() { noise(0.12, { vol: 0.35, freq: 800, slide: 3000, q: 0.8 }); },
  hit() { tone(220, 0.09, { type: 'square', vol: 0.25, slide: 90 }); noise(0.06, { vol: 0.3, freq: 1500 }); },
  hurt() { tone(330, 0.18, { type: 'sawtooth', vol: 0.22, slide: 110 }); },
  kill() { tone(520, 0.08, { vol: 0.2 }); tone(260, 0.2, { vol: 0.2, slide: 60, when: 0.05 }); noise(0.25, { vol: 0.2, freq: 600, slide: 150 }); },
  coin() { tone(988, 0.06, { vol: 0.18 }); tone(1319, 0.14, { vol: 0.18, when: 0.06 }); },
  item() { [523, 659, 784].forEach((f, i) => tone(f, 0.1, { vol: 0.18, when: i * 0.07 })); },
  chest() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, { vol: 0.16, type: 'triangle', when: i * 0.06 })); },
  levelup() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.14, { vol: 0.17, when: i * 0.08 })); },
  heal() { [440, 554, 659, 880].forEach((f, i) => tone(f, 0.16, { vol: 0.14, type: 'triangle', when: i * 0.07 })); },
  blip() { tone(660, 0.025, { vol: 0.06, type: 'square' }); },
  cursor() { tone(880, 0.04, { vol: 0.12 }); },
  select() { tone(660, 0.05, { vol: 0.15 }); tone(990, 0.08, { vol: 0.15, when: 0.05 }); },
  cancel() { tone(440, 0.06, { vol: 0.12 }); tone(330, 0.08, { vol: 0.12, when: 0.05 }); },
  error() { tone(150, 0.15, { vol: 0.2, type: 'square' }); },
  buy() { tone(1319, 0.05, { vol: 0.15 }); tone(1760, 0.12, { vol: 0.15, when: 0.05 }); },
  door() { noise(0.5, { vol: 0.3, freq: 300, slide: 80, type: 'lowpass' }); tone(80, 0.5, { vol: 0.2, type: 'sawtooth', slide: 50 }); },
  rock() { noise(0.7, { vol: 0.4, freq: 400, slide: 60, type: 'lowpass' }); },
  orb() { tone(600, 0.15, { type: 'sine', vol: 0.12, slide: 300 }); },
  dash() { noise(0.15, { vol: 0.25, freq: 500, slide: 1500 }); },
  spike() { noise(0.08, { vol: 0.2, freq: 4000 }); },
  warp() { tone(300, 0.5, { type: 'sine', vol: 0.18, slide: 1200 }); },
  roar() { tone(110, 0.8, { type: 'sawtooth', vol: 0.25, slide: 55 }); noise(0.8, { vol: 0.25, freq: 300, type: 'lowpass' }); },
  bossDie() { for (let i = 0; i < 6; i++) noise(0.4, { vol: 0.3, freq: 600 - i * 80, when: i * 0.15, type: 'lowpass' }); tone(200, 1.5, { type: 'sawtooth', vol: 0.2, slide: 40 }); },
  gameover() { [392, 349, 330, 262].forEach((f, i) => tone(f, 0.35, { vol: 0.18, type: 'triangle', when: i * 0.3 })); },
};

// ---------------------------------------------------------------- 배경음악
// 한 칸 = 8분음표. '.' 은 쉼표. 각 줄은 따로 반복된다.

const TRACKS = {
  title: {
    bpm: 84,
    lead: 'E5 . G5 . A5 . . B5 C6 . B5 . A5 . G5 . E5 . G5 . A5 . . G5 E5 . D5 . E5 . . . C5 . E5 . G5 . . A5 B5 . A5 . G5 . E5 . D5 . E5 . D5 . . C5 D5 . E5 . . . . .',
    bass: 'A2 . . . E3 . . . F2 . . . C3 . . . C3 . . . G2 . . . A2 . . . E3 . . . F2 . . . G2 . . . E2 . . . A2 . . . F2 . . . G2 . . . C3 . . . G2 . . . A2 . . . A2 . . .',
    leadType: 'triangle',
  },
  village: {
    bpm: 112,
    lead: 'C5 . E5 G5 . E5 C5 . D5 . F5 A5 . F5 D5 . E5 . G5 C6 . G5 E5 . D5 . B4 D5 . G4 . . C5 . E5 G5 . E5 C5 . F5 . A5 C6 . A5 F5 . E5 . D5 . G5 . B4 . C5 . . . . . . .',
    bass: 'C3 . G2 . C3 . G2 . D3 . A2 . D3 . A2 . E3 . B2 . E3 . B2 . G2 . D3 . G2 . D3 . C3 . G2 . C3 . G2 . F2 . C3 . F2 . C3 . G2 . D3 . G2 . D3 . C3 . G2 . C3 . . .',
    leadType: 'square',
  },
  forest: {
    bpm: 128,
    lead: 'A4 . C5 E5 . D5 C5 . B4 . D5 . E5 . . . A4 . C5 E5 . G5 F5 E5 D5 . . . E5 . . . F5 . E5 D5 . C5 D5 . E5 . C5 . A4 . . . G4 . A4 B4 . C5 D5 . E5 . . . . . . .',
    bass: 'A2 . A2 E3 A2 . A2 E3 G2 . G2 D3 G2 . G2 D3 F2 . F2 C3 F2 . F2 C3 E2 . E2 B2 E2 . E2 B2 F2 . F2 C3 F2 . F2 C3 G2 . G2 D3 G2 . G2 D3 A2 . A2 E3 A2 . E2 . A2 . . . A2 . . .',
    leadType: 'square',
  },
  cave: {
    bpm: 76,
    lead: 'D5 . . . . . F5 . E5 . . . . . A4 . D5 . . . . . F5 . G5 . . . F5 . E5 . C5 . . . . . D5 . A4 . . . . . . . A#4 . . . A4 . . . D5 . . . . . . .',
    bass: 'D2 . . . D2 . . . D2 . . . D2 . . . A#1 . . . A#1 . . . A#1 . . . A#1 . . . C2 . . . C2 . . . A1 . . . A1 . . . D2 . . . D2 . . . D2 . . . D2 . . .',
    leadType: 'triangle',
  },
  boss: {
    bpm: 156,
    lead: 'E5 . E5 G5 . E5 D5 . E5 . B4 . D5 . . . E5 . E5 G5 . A5 G5 . F#5 . D5 . E5 . . . G5 . G5 A5 . G5 F#5 . E5 . C5 . D5 . . . B4 . C5 D5 . E5 F#5 . G5 . F#5 . E5 . . .',
    bass: 'E2 E2 E3 E2 E2 E3 E2 E3 C2 C2 C3 C2 C2 C3 C2 C3 D2 D2 D3 D2 D2 D3 D2 D3 B1 B1 B2 B1 B1 B2 B1 B2 E2 E2 E3 E2 E2 E3 E2 E3 C2 C2 C3 C2 C2 C3 C2 C3 A1 A1 A2 A1 B1 B1 B2 B1 E2 E2 E3 E2 E2 . . .',
    leadType: 'sawtooth',
  },
  ending: {
    bpm: 92,
    lead: 'G4 . C5 . E5 . G5 . . . E5 . C5 . D5 . E5 . . . D5 . C5 . A4 . . . . . . . F4 . A4 . C5 . F5 . . . E5 . D5 . C5 . D5 . . . E5 . D5 . C5 . . . . . . .',
    bass: 'C3 . . . G2 . . . A2 . . . E2 . . . F2 . . . C3 . . . F2 . . . G2 . . . F2 . . . C3 . . . A2 . . . E2 . . . F2 . . . G2 . . . C3 . . . C3 . . .',
    leadType: 'triangle',
  },
};

const NOTE_INDEX = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function freqOf(n) {
  const m = n.match(/^([A-G]#?)(\d)$/);
  if (!m) return null;
  const midi = (parseInt(m[2], 10) + 1) * 12 + NOTE_INDEX[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}

let current = null;
let pendingTrack = null;
let timer = null;
let step = 0;
let nextTime = 0;
let parsed = null;

export function playMusic(name) {
  if (name === current && timer) return;
  pendingTrack = name;
  if (!ctx) return;
  stopMusic();
  current = name;
  pendingTrack = name;
  const tr = TRACKS[name];
  if (!tr) return;
  parsed = {
    lead: tr.lead.split(/\s+/),
    bass: tr.bass.split(/\s+/),
    stepDur: 60 / tr.bpm / 2,
    leadType: tr.leadType,
  };
  step = 0;
  nextTime = ctx.currentTime + 0.1;
  timer = setInterval(schedule, 40);
  schedule();
}

export function stopMusic() {
  if (timer) clearInterval(timer);
  timer = null;
  current = null;
}

function schedule() {
  if (!ctx || !parsed) return;
  // 탭이 오래 숨겨졌다 돌아오면 밀린 음을 몰아서 내지 않는다
  if (nextTime < ctx.currentTime - 0.3) nextTime = ctx.currentTime + 0.05;
  while (nextTime < ctx.currentTime + 0.2) {
    const { lead, bass, stepDur, leadType } = parsed;
    const ln = lead[step % lead.length];
    const bn = bass[step % bass.length];
    const when = nextTime - ctx.currentTime;
    const lf = freqOf(ln);
    if (lf) tone(lf, stepDur * 1.6, { type: leadType, vol: leadType === 'sawtooth' ? 0.07 : 0.1, when, out: musicGain, attack: 0.01 });
    const bf = freqOf(bn);
    if (bf) tone(bf, stepDur * 1.8, { type: 'triangle', vol: 0.22, when, out: musicGain, attack: 0.01 });
    step++;
    nextTime += stepDur;
  }
}
