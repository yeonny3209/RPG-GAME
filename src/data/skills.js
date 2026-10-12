// 스킬 정보. 레벨이 오르면 자동으로 배운다.
// power: 공격력의 몇 배로 피해를 주는지, cooldown: 다시 쓰기까지 걸리는 시간(밀리초)

export const SKILLS = [
  {
    id: 'spin', name: '회전베기', key: 'Z', level: 2, mp: 6, cooldown: 1500, power: 1.5,
    desc: '칼을 크게 휘둘러 주변의 모든 적을 벤다.',
  },
  {
    id: 'fireball', name: '파이어볼', key: 'X', level: 4, mp: 8, cooldown: 1200, power: 2.0,
    desc: '바라보는 방향으로 불덩이를 날린다. 방어력을 일부 무시한다.',
  },
  {
    id: 'heal', name: '치유의 빛', key: 'C', level: 6, mp: 12, cooldown: 5000, power: 0.4,
    desc: '최대 HP의 40%를 회복한다.',
  },
  {
    id: 'lightning', name: '번개', key: 'V', level: 9, mp: 16, cooldown: 4000, power: 2.2,
    desc: '가까운 적 최대 4마리에게 번개를 떨어뜨린다.',
  },
];
