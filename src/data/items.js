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
    items: ['iron_sword', 'steel_sword', 'leather_armor', 'iron_armor'],
  },
  general: {
    name: '미나의 잡화점',
    items: ['red_potion', 'big_potion', 'feather'],
  },
};

export function sellPrice(id) {
  return Math.floor(ITEMS[id].price / 2);
}
