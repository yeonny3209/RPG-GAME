// 몬스터 능력치와 레벨업 경험치표
// ai 종류:
//   chaser  - 배회하다가 플레이어를 발견하면 쫓아온다 (슬라임)
//   charger - 숨어 있다가 가까이 오면 튀어나와 돌진한다 (버섯돌이)
//   flyer   - 지그재그로 날아서 쫓아온다 (박쥐)
//   knight  - 쫓아오다가 가까워지면 멈칫한 뒤 베기 돌진 (해골 병사)

export const MONSTERS = {
  slime: {
    name: '슬라임', ai: 'chaser',
    hp: 18, atk: 6, def: 0,
    speed: 22, chaseSpeed: 38, detect: 72,
    exp: 3, gold: [2, 4],
    drops: [{ item: 'red_potion', chance: 0.08 }],
  },
  mushroom: {
    name: '버섯돌이', ai: 'charger',
    hp: 30, atk: 9, def: 2,
    speed: 0, chaseSpeed: 0, dashSpeed: 150, detect: 60,
    exp: 6, gold: [4, 8],
    drops: [{ item: 'red_potion', chance: 0.12 }],
  },
  bat: {
    name: '박쥐', ai: 'flyer',
    hp: 30, atk: 12, def: 1,
    speed: 35, chaseSpeed: 60, detect: 96,
    exp: 9, gold: [6, 10],
    drops: [{ item: 'red_potion', chance: 0.12 }],
  },
  skeleton: {
    name: '해골 병사', ai: 'knight',
    hp: 60, atk: 18, def: 5,
    speed: 20, chaseSpeed: 36, dashSpeed: 140, detect: 88,
    exp: 16, gold: [12, 18],
    drops: [{ item: 'big_potion', chance: 0.1 }],
  },
  boss: {
    name: '그림자 군주 모르그', ai: 'boss',
    hp: 900, atk: 26, def: 12,
    speed: 42, chaseSpeed: 42,
    exp: 100, gold: [200, 200],
    drops: [],
  },
};

// LEVELS[레벨] = 다음 레벨이 되기 위한 누적 경험치
export const LEVELS = [0, 10, 25, 50, 85, 135, 200, 290, 400, 550];
