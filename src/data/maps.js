// 맵 데이터
// 글자 하나 = 타일 하나 (16x16 픽셀). 좌표는 모두 "타일 칸" 단위이다.
//
//  .  풀        ,  꽃밭       :  흙길       ~  물(막힘)
//  T  나무(막힘) B  덤불(막힘) #  집 벽(막힘) ^  지붕(막힘)
//  D  문(막힘)   F  울타리(막힘) W 우물(막힘) =  다리
//  t  밭        c  동굴 바닥   X  동굴 벽(막힘) *  수정(막힘)
//  f  돌바닥     r  붉은 카펫   H  성 벽(막힘)   P  기둥(막힘)
//  s  늪 풀      m  진흙       d  마른 나무(막힘) R  갈대(막힘)  w  늪 물(막힘)
//  n  눈        i  얼음       p  눈 덮인 소나무(막힘)  o  눈 바위(막힘)

// 타일셋 이미지 안에서의 순서 (gfx.js 의 TILE_ORDER 와 같아야 한다)
export const T = {
  grass: 0, flowers: 1, path: 2, water: 3, tree: 4, bush: 5, wall: 6, roof: 7,
  door: 8, fence: 9, well: 10, bridge: 11, farm: 12, caveFloor: 13, caveWall: 14,
  crystal: 15, stone: 16, carpet: 17, castleWall: 18, pillar: 19, grass2: 20, caveFloor2: 21,
  swampGrass: 22, mud: 23, deadTree: 24, reeds: 25, swampWater: 26, snow: 27, ice: 28, pine: 29, snowRock: 30,
};

// 글자 -> { 바닥 타일, 위 타일(막힘) }
export const LEGEND = {
  '.': { g: T.grass },
  ',': { g: T.flowers },
  ':': { g: T.path },
  '~': { g: T.water, t: T.water },
  'T': { g: T.grass, t: T.tree },
  'B': { g: T.grass, t: T.bush },
  '#': { g: T.grass, t: T.wall },
  '^': { g: T.grass, t: T.roof },
  'D': { g: T.grass, t: T.door },
  'F': { g: T.grass, t: T.fence },
  'W': { g: T.grass, t: T.well },
  '=': { g: T.bridge },
  't': { g: T.farm },
  'c': { g: T.caveFloor },
  'X': { g: T.caveFloor, t: T.caveWall },
  '*': { g: T.caveFloor, t: T.crystal },
  'f': { g: T.stone },
  'r': { g: T.carpet },
  'H': { g: T.stone, t: T.castleWall },
  'P': { g: T.stone, t: T.pillar },
  's': { g: T.swampGrass },
  'm': { g: T.mud },
  'd': { g: T.swampGrass, t: T.deadTree },
  'R': { g: T.swampGrass, t: T.reeds },
  'w': { g: T.swampWater, t: T.swampWater },
  'n': { g: T.snow },
  'i': { g: T.ice },
  'p': { g: T.snow, t: T.pine },
  'o': { g: T.snow, t: T.snowRock },
};

// 테두리 + 사각형 + 무작위 장식으로 맵을 만드는 도우미 (늪, 서리 봉우리)
// keep: 장식이 놓이지 않을 지점 [x, y] (주변 1칸 포함)
function build({ w, h, fill, border, rects = [], clear = [], scatter = [], keep = [] }) {
  const grid = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => (x === 0 || y === 0 || x === w - 1 || y === h - 1 ? border : fill)));
  for (const [x, y, rw, rh, ch] of rects) {
    for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) if (grid[j] && grid[j][i] !== undefined) grid[j][i] = ch;
  }
  const blocked = (x, y) =>
    clear.some(([cx, cy, cw, chh]) => x >= cx && x < cx + cw && y >= cy && y < cy + chh) ||
    keep.some(([kx, ky]) => Math.abs(kx - x) <= 1 && Math.abs(ky - y) <= 1);
  for (const { ch, n, seed, size = 1 } of scatter) {
    let a = seed * 9301 + 49297;
    const rnd = () => { a = (a * 9301 + 49297) % 233280; return a / 233280; };
    let placed = 0;
    for (let tries = 0; placed < n && tries < n * 40; tries++) {
      const x = 1 + Math.floor(rnd() * (w - 2));
      const y = 1 + Math.floor(rnd() * (h - 2));
      let ok = true;
      for (let j = y; j < y + size; j++) for (let i = x; i < x + size; i++) {
        if (i >= w - 1 || j >= h - 1 || grid[j][i] !== fill || blocked(i, j)) ok = false;
      }
      if (!ok) continue;
      for (let j = y; j < y + size; j++) for (let i = x; i < x + size; i++) grid[j][i] = ch;
      placed++;
    }
  }
  return grid.map((r) => r.join(''));
}

// 사각형을 파서 맵을 만드는 도우미 (동굴, 마왕의 방)
function carve(w, h, fill, rects) {
  const grid = Array.from({ length: h }, () => Array(w).fill(fill));
  for (const [x, y, rw, rh, ch] of rects) {
    for (let j = y; j < y + rh; j++) {
      for (let i = x; i < x + rw; i++) {
        if (j >= 0 && j < h && i >= 0 && i < w) grid[j][i] = ch;
      }
    }
  }
  return grid.map((r) => r.join(''));
}

const VILLAGE = [
  'TTTTTTTTTTTTTTTTTTT::TTTTTTTTTTTTTTTTTTT',
  'TT.....,.......T...::...T.......,.....TT',
  'T..^^^^^^^.........::.........^^^^^^^..T',
  'T..^^^^^^^...,.....::.....,...^^^^^^^..T',
  'T..#######.........::.........#######..T',
  'T..###D###.........::.........###D###..T',
  'T.....:............::............:.....T',
  'T.....::::::::::::::::::::::::::::.....T',
  'T.,................::..............,...T',
  'T..................::..................T',
  'TB.....,...........::...........,.....BT',
  'T..................::..................T',
  'T..^^^^^^^......::::::::......^^^^^^^..T',
  'T..^^^^^^^......::::::::......^^^^^^^..T',
  'T..#######......:::WW:::......#######..T',
  'T..###D###......:::WW:::......###D###..T',
  'T.....:.........::::::::.........:.....T',
  'T.....::::::::::::::::::::::::::::::::::',
  'T..................::..................:',
  'T.,................::...............,..T',
  'T..................::..................T',
  'T..^^^^^^^.........::.....FFFFFFFFFF...T',
  'T..^^^^^^^.........::.....FttttttttF...T',
  'T..#######.........::.....FttttttttF...T',
  'T..###D###.........::.....FttttttttF...T',
  'T.....:............::.....FFFF::FFFF...T',
  'T.....::::::::::::::::::::::::::.......T',
  'T........~~~~~~.....,..................T',
  'TT.......~~~~~~.........,.............TT',
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
];

const FOREST = [
  'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTXccXTTTTTT',
  'TT..........TTTT.......,..........TTTT..XccX....TT',
  'T..^^^^^^^...TT...........,.......TT.....::.....,T',
  'T..^^^^^^^...........B...................::......T',
  'T..#######.....,.......TT................::...T..T',
  'T..###D###.............TT.....,..........::......T',
  'T.....:..................................::......T',
  'T.....:::::::::::::::::::::::::::::::::::::......T',
  'T..,....T......B........::.......TT.....,........T',
  'T....TT.................::..............B........T',
  'T..........,............::......,................T',
  'T.......................::.......................T',
  '~~~~~~~~~~~~~~~~~~~~~~~~==~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~==~~~~~~~~~~~~~~~~~~~~~~~~',
  'T.......................::.......................T',
  'T...B...................::.........TT............T',
  'T.......................::.......................T',
  'T....,..................::...............TT......T',
  'T.....~~~~~~~...........::..............BBBBB....T',
  'T.....~~~~~~~...........::..............B........T',
  'T....~~~~~~~~~..........::..............B...B....T',
  'T.....~~~~~~~...........::..............B...B....T',
  'T.......................::..............B...BBBBBT',
  'T..T....................::.......................T',
  'T.......................::....,..................T',
  'T........B..............::..........TT...........T',
  'T.......................::.......................:',
  'TTT.....................::...........,...........:',
  'T.......................::.......................T',
  'T...,...................::................T......T',
  'T.......................::.......................T',
  'T......B................::.......................T',
  'T.......................::.....B.................T',
  'T.........,.............::.......................T',
  'TT......................::......................TT',
  'TTTTTTTTTTTTTTTTTTTTTTTT::TTTTTTTTTTTTTTTTTTTTTTTT',
];

const CAVE = carve(44, 36, 'X', [
  [15, 28, 14, 7, 'c'], // 입구 홀
  [21, 35, 2, 1, 'c'],  // 숲으로 나가는 길
  [21, 22, 2, 6, 'c'],  // 입구 홀 -> 중앙 홀
  [14, 12, 16, 11, 'c'], // 중앙 홀
  [21, 0, 2, 12, 'c'],  // 마왕의 방으로 가는 통로
  [2, 20, 10, 11, 'c'], // 왼쪽 방
  [12, 29, 3, 2, 'c'],
  [33, 24, 9, 10, 'c'], // 오른쪽 방
  [29, 29, 4, 2, 'c'],
  [2, 2, 11, 8, 'c'],   // 왼쪽 위 방 (열쇠)
  [7, 10, 2, 6, 'c'],
  [9, 14, 5, 2, 'c'],
  [31, 2, 11, 8, 'c'],  // 오른쪽 위 방
  [35, 10, 2, 6, 'c'],
  [30, 14, 5, 2, 'c'],
  // 수정 장식 (막힘)
  [17, 15, 1, 1, '*'], [26, 15, 1, 1, '*'], [17, 19, 1, 1, '*'], [26, 19, 1, 1, '*'],
  [17, 31, 1, 1, '*'], [26, 31, 1, 1, '*'],
  [2, 20, 1, 1, '*'], [11, 20, 1, 1, '*'], [2, 30, 1, 1, '*'],
  [41, 24, 1, 1, '*'], [33, 33, 1, 1, '*'],
  [12, 2, 1, 1, '*'], [2, 9, 1, 1, '*'], [31, 9, 1, 1, '*'], [41, 9, 1, 1, '*'],
  [6, 5, 1, 1, '*'], [36, 5, 1, 1, '*'],
]);

const THRONE = carve(20, 15, 'H', [
  [1, 1, 18, 13, 'f'],
  [9, 2, 2, 13, 'r'],
  [4, 4, 1, 1, 'P'], [15, 4, 1, 1, 'P'],
  [4, 10, 1, 1, 'P'], [15, 10, 1, 1, 'P'],
]);

const SWAMP_KEEP = [
  [2, 14], [37, 6], [4, 4], [40, 27], [6, 27], [20, 13], [41, 20],
  [6, 9], [14, 23], [24, 22], [36, 12], [38, 24], [20, 3],
  [5, 20], [26, 3], [35, 18], [12, 28], [27, 28], [40, 9], [3, 10],
];
const SWAMP = build({
  w: 44, h: 32, fill: 's', border: 'd',
  rects: [
    [0, 14, 11, 2, 'm'],  // 서쪽 입구 -> 숲
    [9, 5, 2, 11, 'm'],
    [9, 5, 23, 2, 'm'],
    [30, 5, 2, 21, 'm'],
    [17, 24, 15, 2, 'm'],
    [13, 8, 14, 12, 'w'], // 가운데 늪
    [18, 12, 4, 4, 's'],  // 작은 섬
    [22, 13, 8, 2, '='],  // 섬으로 가는 다리
    [34, 2, 7, 2, '^'],   // 약초꾼 오두막
    [34, 4, 7, 2, '#'],
    [37, 5, 1, 1, 'D'],
    [31, 6, 8, 2, 'm'],
    [24, 26, 2, 6, 'm'],  // 남쪽 -> 독안개 소굴
  ],
  clear: [[0, 13, 13, 4], [8, 4, 26, 4], [29, 4, 4, 23], [16, 23, 18, 4], [33, 1, 9, 9], [17, 11, 6, 6], [23, 25, 4, 7]],
  scatter: [
    { ch: 'd', n: 45, seed: 11 },
    { ch: 'R', n: 40, seed: 22 },
    { ch: 'w', n: 10, seed: 33, size: 2 },
  ],
  keep: SWAMP_KEEP,
});

const DEN = build({
  w: 26, h: 20, fill: 'm', border: 'd',
  rects: [
    [12, 0, 2, 1, 'm'],   // 입구 -> 안개 늪
    [1, 1, 4, 3, 'w'], [21, 1, 4, 3, 'w'], [1, 16, 4, 3, 'w'], [21, 16, 4, 3, 'w'],
    [5, 1, 6, 1, 's'], [15, 1, 6, 1, 's'], [5, 18, 16, 1, 's'],
  ],
  clear: [[3, 3, 20, 14], [10, 0, 6, 4]],
  scatter: [{ ch: 'R', n: 12, seed: 7 }, { ch: 'd', n: 6, seed: 8 }],
});

const FROST_KEEP = [
  [2, 33], [35, 35], [35, 15],
  [8, 28], [12, 24], [28, 30], [30, 16], [6, 10], [34, 8],
  [26, 23], [8, 20], [32, 25], [16, 30],
];
const FROST = build({
  w: 40, h: 40, fill: 'n', border: 'p',
  rects: [
    [0, 33, 1, 2, 'n'],     // 서쪽 입구 -> 마을
    [10, 2, 20, 11, 'o'],   // 골렘의 투기장 (바위로 둘러쌈)
    [11, 3, 18, 9, 'n'],
    [19, 12, 2, 1, 'n'],    // 투기장 입구
    [24, 20, 10, 7, 'i'],   // 얼어붙은 호수
    [6, 14, 6, 5, 'i'],
  ],
  clear: [[0, 31, 22, 5], [17, 12, 6, 22], [9, 1, 22, 13]],
  scatter: [
    { ch: 'p', n: 130, seed: 44 },
    { ch: 'o', n: 35, seed: 55 },
  ],
  keep: FROST_KEEP,
});

export const MAPS = {
  village: {
    name: '햇살골',
    rows: VILLAGE,
    bgm: 'village',
    spawns: {
      north: [19.5, 2],
      home: [6, 25],
      inn: [33, 17],
      chief: [7, 8],
      east: [37, 17.5],
    },
    exits: [
      { x: 19, y: 0, w: 2, h: 1, to: 'forest', spawn: 'south', gate: 'guard' },
      { x: 39, y: 17, w: 1, h: 2, to: 'frost', spawn: 'west', minLevel: 5, who: '바위', place: '서리 봉우리' },
    ],
    npcs: [
      { id: 'chief', x: 7, y: 6 },
      { id: 'smith', x: 34, y: 6 },
      { id: 'mina', x: 7, y: 16 },
      { id: 'inn', x: 34, y: 16 },
      { id: 'toto', x: 23, y: 19 },
      { id: 'farmer', x: 30, y: 23 },
      { id: 'guard', x: 22, y: 2 },
      { id: 'cat_home', x: 24, y: 19, flag: 'cat_found' },
      { id: 'climber', x: 37, y: 19 },
    ],
    monsters: [],
    chests: [],
  },

  forest: {
    name: '속삭이는 숲',
    rows: FOREST,
    bgm: 'forest',
    spawns: {
      south: [24.5, 33],
      north: [41.5, 2],
      east: [47, 26.5],
    },
    exits: [
      { x: 24, y: 35, w: 2, h: 1, to: 'village', spawn: 'north' },
      { x: 41, y: 0, w: 2, h: 1, to: 'cave', spawn: 'south' },
      { x: 49, y: 26, w: 1, h: 2, to: 'swamp', spawn: 'west' },
    ],
    npcs: [
      { id: 'wizard', x: 7, y: 6 },
      { id: 'cat', x: 46, y: 20, notFlag: 'cat_found' },
    ],
    monsters: [
      // 남쪽 (슬라임)
      { type: 'slime', x: 10, y: 24 }, { type: 'slime', x: 16, y: 28 },
      { type: 'slime', x: 30, y: 22 }, { type: 'slime', x: 34, y: 27 },
      { type: 'slime', x: 8, y: 31 }, { type: 'slime', x: 36, y: 31 },
      { type: 'slime', x: 19, y: 17 }, { type: 'slime', x: 31, y: 16 },
      // 북쪽 (버섯돌이 + 슬라임)
      { type: 'mushroom', x: 12, y: 9 }, { type: 'mushroom', x: 30, y: 9 },
      { type: 'mushroom', x: 37, y: 4 }, { type: 'mushroom', x: 18, y: 3 },
      { type: 'mushroom', x: 45, y: 10 }, { type: 'mushroom', x: 7, y: 10 },
      { type: 'slime', x: 20, y: 10 }, { type: 'slime', x: 36, y: 10 },
      { type: 'slime', x: 28, y: 3 },
    ],
    chests: [
      { id: 'forest_1', x: 3, y: 30, item: 'red_potion', count: 3 },
      { id: 'forest_2', x: 47, y: 3, gold: 50 },
    ],
    rocks: [{ x: 41, y: 3 }, { x: 42, y: 3 }],
  },

  cave: {
    name: '수정 동굴',
    rows: CAVE,
    bgm: 'cave',
    spawns: {
      south: [21.5, 33],
      north: [21.5, 5],
    },
    exits: [
      { x: 21, y: 35, w: 2, h: 1, to: 'forest', spawn: 'north' },
      { x: 21, y: 0, w: 2, h: 1, to: 'throne', spawn: 'south' },
    ],
    npcs: [],
    monsters: [
      { type: 'bat', x: 18, y: 31 }, { type: 'bat', x: 25, y: 32 },
      { type: 'bat', x: 6, y: 24 }, { type: 'bat', x: 8, y: 28 },
      { type: 'bat', x: 37, y: 27 }, { type: 'bat', x: 16, y: 14 },
      { type: 'bat', x: 28, y: 20 }, { type: 'bat', x: 38, y: 5 },
      { type: 'skeleton', x: 24, y: 17 }, { type: 'skeleton', x: 19, y: 20 },
      { type: 'skeleton', x: 5, y: 5 }, { type: 'skeleton', x: 9, y: 7 },
      { type: 'skeleton', x: 34, y: 6 }, { type: 'skeleton', x: 38, y: 30 },
      { type: 'skeleton', x: 6, y: 27 },
    ],
    chests: [
      { id: 'cave_key', x: 3, y: 3, item: 'shadow_key', count: 1 },
      { id: 'cave_potion', x: 40, y: 3, item: 'big_potion', count: 2 },
      { id: 'cave_sword', x: 40, y: 32, item: 'crystal_sword', count: 1 },
      { id: 'cave_gold', x: 3, y: 29, gold: 100 },
    ],
    spikes: [
      { x: 21, y: 25 }, { x: 22, y: 25 },
      { x: 7, y: 12 }, { x: 8, y: 12 },
      { x: 35, y: 12 }, { x: 36, y: 12 },
      { x: 13, y: 29 }, { x: 13, y: 30 },
    ],
    door: { x: 21, y: 2 },
  },

  throne: {
    name: '마왕의 방',
    rows: THRONE,
    bgm: 'cave',
    spawns: {
      south: [9.5, 12],
    },
    exits: [{ x: 9, y: 14, w: 2, h: 1, to: 'cave', spawn: 'north' }],
    npcs: [],
    monsters: [],
    chests: [],
    boss: { x: 9.5, y: 4.5, kind: 'boss' },
  },

  swamp: {
    name: '안개 늪',
    rows: SWAMP,
    bgm: 'swamp',
    spawns: {
      west: [2, 14.5],
      south: [24.5, 29],
    },
    exits: [
      { x: 0, y: 14, w: 1, h: 2, to: 'forest', spawn: 'east' },
      { x: 24, y: 31, w: 2, h: 1, to: 'den', spawn: 'north', minLevel: 6, who: '약초꾼 할머니', place: '독안개 소굴' },
    ],
    npcs: [{ id: 'herbalist', x: 37, y: 6 }],
    monsters: [
      { type: 'toad', x: 6, y: 9 }, { type: 'toad', x: 14, y: 23 }, { type: 'toad', x: 24, y: 22 },
      { type: 'toad', x: 36, y: 12 }, { type: 'toad', x: 38, y: 24 }, { type: 'toad', x: 20, y: 3 },
      { type: 'wisp', x: 5, y: 20 }, { type: 'wisp', x: 26, y: 3 }, { type: 'wisp', x: 35, y: 18 },
      { type: 'wisp', x: 12, y: 28 }, { type: 'wisp', x: 27, y: 28 },
      { type: 'mushroom', x: 40, y: 9 }, { type: 'mushroom', x: 3, y: 10 },
    ],
    chests: [
      { id: 'swamp_island', x: 20, y: 13, item: 'big_potion', count: 2 },
      { id: 'swamp_dagger', x: 41, y: 20, item: 'venom_dagger', count: 1 },
    ],
    herbs: [{ id: 'herb_1', x: 4, y: 4 }, { id: 'herb_2', x: 40, y: 27 }, { id: 'herb_3', x: 6, y: 27 }],
    particles: 'fireflies',
  },

  den: {
    name: '독안개 소굴',
    rows: DEN,
    bgm: 'swamp',
    spawns: {
      north: [12.5, 2],
    },
    exits: [{ x: 12, y: 0, w: 2, h: 1, to: 'swamp', spawn: 'south' }],
    npcs: [],
    monsters: [],
    chests: [],
    boss: { x: 12.5, y: 10, kind: 'hydra' },
    particles: 'fireflies',
  },

  frost: {
    name: '서리 봉우리',
    rows: FROST,
    bgm: 'frost',
    spawns: {
      west: [2, 33.5],
    },
    exits: [{ x: 0, y: 33, w: 1, h: 2, to: 'village', spawn: 'east' }],
    npcs: [],
    monsters: [
      { type: 'wolf', x: 8, y: 28 }, { type: 'wolf', x: 12, y: 24 }, { type: 'wolf', x: 28, y: 30 },
      { type: 'wolf', x: 30, y: 16 }, { type: 'wolf', x: 6, y: 10 }, { type: 'wolf', x: 34, y: 8 },
      { type: 'icespirit', x: 26, y: 23 }, { type: 'icespirit', x: 8, y: 20 },
      { type: 'icespirit', x: 32, y: 25 }, { type: 'icespirit', x: 16, y: 30 },
    ],
    chests: [
      { id: 'frost_potion', x: 35, y: 35, item: 'big_potion', count: 3 },
      { id: 'frost_axe', x: 35, y: 15, item: 'frost_axe', count: 1 },
    ],
    boss: { x: 19.5, y: 6, kind: 'golem' },
    particles: 'snow',
  },
};
