// 아이템 정보. 숫자나 설명을 바꾸면 게임에 바로 반영된다.
// type: consumable(소모품) / weapon(무기) / armor(방어구) / key(중요 아이템, 팔 수 없음)

export const ITEMS = {
  red_potion: {
    name: '빨간 포션', type: 'consumable', heal: 30, price: 15,
    desc: 'HP를 30 회복한다.',
  },
  big_potion: {
    name: '큰 빨간 포션', type: 'consumable', heal: 80, price: 40,
    desc: 'HP를 80 회복한다.',
  },
  mana_potion: {
    name: '마나 포션', type: 'consumable', mana: 20, price: 25,
    desc: 'MP를 20 회복한다.',
  },
  feather: {
    name: '귀환의 깃털', type: 'consumable', warp: true, price: 30,
    desc: '사용하면 즉시 햇살골 여관 앞으로 돌아간다.',
  },

  wood_sword: {
    name: '나무칼', type: 'weapon', atk: 2, price: 4,
    desc: '연습용 나무칼. 공격력 +2',
  },
  iron_sword: {
    name: '철검', type: 'weapon', atk: 6, price: 60,
    desc: '브론이 만든 튼튼한 철검. 공격력 +6',
  },
  steel_sword: {
    name: '강철검', type: 'weapon', atk: 12, price: 150,
    desc: '단단한 강철로 벼린 검. 공격력 +12',
  },
  crystal_sword: {
    name: '수정검', type: 'weapon', atk: 20, price: 400,
    desc: '수정 동굴의 빛을 머금은 전설의 검. 공격력 +20',
  },
  // style: 공격 방식 (sword 기본 / dagger 빠름 / spear 길게 찌르기 / axe 느리고 넓게)
  venom_dagger: {
    name: '독니 단검', type: 'weapon', atk: 7, price: 120, style: 'dagger', poison: 0.3,
    desc: '아주 빠르게 찌르는 단검. 30% 확률로 적을 독에 빠뜨린다. 공격력 +7',
  },
  wind_spear: {
    name: '바람의 창', type: 'weapon', atk: 15, price: 260, style: 'spear',
    desc: '멀리까지 닿는 가벼운 창. 공격력 +15',
  },
  hydra_fang: {
    name: '히드라의 송곳니', type: 'weapon', atk: 24, price: 600, style: 'dagger', poison: 0.45,
    desc: '독룡 히드라의 송곳니로 만든 단검. 45% 확률로 독. 공격력 +24',
  },
  frost_axe: {
    name: '서리 도끼', type: 'weapon', atk: 30, price: 500, style: 'axe',
    desc: '느리지만 넓게 내려치는 얼음 도끼. 공격력 +30',
  },

  cloth: {
    name: '천 옷', type: 'armor', def: 1, price: 4,
    desc: '평범한 천 옷. 방어력 +1',
  },
  leather_armor: {
    name: '가죽 갑옷', type: 'armor', def: 4, price: 60,
    desc: '가볍고 질긴 가죽 갑옷. 방어력 +4',
  },
  iron_armor: {
    name: '철 갑옷', type: 'armor', def: 9, price: 180,
    desc: '무겁지만 믿음직한 철 갑옷. 방어력 +9',
  },

  frost_armor: {
    name: '서리 갑옷', type: 'armor', def: 15, price: 500,
    desc: '서리 골렘의 얼음으로 만든 갑옷. 방어력 +15',
  },

  hero_armor: {
    name: '용사의 갑옷', type: 'armor', def: 20, price: 800,
    desc: '브론이 얼음 결정으로 벼려 낸 최고의 갑옷. 방어력 +20',
  },

  // material: 퀘스트 재료 (여러 개 겹쳐짐)
  ice_crystal: {
    name: '얼음 결정', type: 'material', price: 20,
    desc: '얼음 정령에게서 얻은 차가운 결정. 대장장이 브론이 찾고 있다.',
  },

  shadow_key: {
    name: '그림자 열쇠', type: 'key', price: 0,
    desc: '마왕의 방 문을 여는 검은 열쇠.',
  },
  crown: {
    name: '빛의 왕관', type: 'key', price: 0,
    desc: '루미엘 왕국을 지켜 온 빛의 왕관.',
  },
};

export const SHOPS = {
  blacksmith: {
    name: '브론의 대장간',
    items: ['iron_sword', 'steel_sword', 'wind_spear', 'leather_armor', 'iron_armor'],
  },
  general: {
    name: '미나의 잡화점',
    items: ['red_potion', 'big_potion', 'mana_potion', 'feather'],
  },
};

// 무기별 공격 방식: 쿨다운(ms), 칼이 닿는 범위(가로x세로), 몸에서 떨어진 거리, 이펙트 크기
export const WEAPON_STYLES = {
  sword: { cooldown: 400, w: 22, h: 22, reach: 11, fx: 0.85 },
  dagger: { cooldown: 300, w: 16, h: 16, reach: 9, fx: 0.6 },
  spear: { cooldown: 430, w: 34, h: 12, reach: 18, fx: 0.7, thrust: true },
  axe: { cooldown: 650, w: 32, h: 30, reach: 12, fx: 1.25 },
};

export function sellPrice(id) {
  return Math.floor(ITEMS[id].price / 2);
}
