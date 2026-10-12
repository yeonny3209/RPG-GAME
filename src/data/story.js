// NPC 정보, 퀘스트, 대사.
// talk(id, w) 는 NPC에게 말을 걸었을 때의 대사와 대화가 끝난 뒤 할 일을 돌려준다.
// w 는 WorldScene (상점 열기, 아이템 주기 등의 기능을 가지고 있다).

import { G, questState, startQuest, addItem, equipIfBetter } from '../state.js';

export const PLAYER_NAME = '리오';

export const NPCS = {
  chief: { name: '촌장', look: 'chief' },
  smith: { name: '대장장이 브론', look: 'smith' },
  mina: { name: '잡화상 미나', look: 'mina' },
  inn: { name: '여관 주인', look: 'innkeeper' },
  toto: { name: '꼬마 토토', look: 'kid', wander: true },
  farmer: { name: '농부 아줌마', look: 'farmer', wander: true },
  guard: { name: '경비병', look: 'guard' },
  wizard: { name: '은둔 마법사 엘든', look: 'wizard' },
  cat: { name: '나비', look: 'cat' },
  cat_home: { name: '나비', look: 'cat' },
};

export const QUESTS = {
  main: { title: '빛의 왕관을 찾아서', main: true },
  slime: { title: '슬라임 퇴치', goal: 5 },
  cat: { title: '잃어버린 고양이' },
};

// 지금 해야 할 일 (화면 오른쪽 위에 표시)
export function objective(id) {
  const st = questState(id);
  const f = G.flags;
  if (id === 'main') {
    if (st === 'none') return '촌장님 댁에 가 보자 (마을 왼쪽 위)';
    if (st === 'done') return null;
    if (!f.got_sword) return '대장장이 브론을 찾아가자 (마을 오른쪽 위)';
    if (!f.rock_removed) return '숲 서쪽의 은둔 마법사를 찾아가자';
    if (!f.door_open && !G.inventory.some((s) => s.id === 'shadow_key')) return '수정 동굴에서 그림자 열쇠를 찾자';
    if (!f.door_open) return '동굴 북쪽의 잠긴 문을 열자';
    if (!f.boss_defeated) return '마왕의 방에서 모르그를 쓰러뜨리자';
    if (!f.crown) return '빛의 왕관을 줍자';
    return '촌장님께 왕관을 전해 드리자';
  }
  if (id === 'slime') {
    if (st === 'active') return `슬라임 퇴치 ${G.progress.slime || 0}/5`;
    if (st === 'ready') return '농부 아줌마에게 보고하자';
    return null;
  }
  if (id === 'cat') {
    if (st === 'active') return f.cat_found ? '토토에게 돌아가자' : '숲 동쪽 덤불에서 나비 찾기';
    return null;
  }
  return null;
}

// NPC 머리 위 표시: '!' = 새 이야기, '?' = 보고할 것 있음
export function marker(id) {
  const f = G.flags;
  const main = questState('main');
  switch (id) {
    case 'chief': return main === 'none' ? '!' : f.crown && main !== 'done' ? '?' : null;
    case 'smith': return main === 'active' && !f.got_sword ? '!' : null;
    case 'wizard': return main === 'active' && f.got_sword && !f.rock_removed ? '!' : null;
    case 'toto': {
      const st = questState('cat');
      return st === 'none' ? '!' : st === 'active' && f.cat_found ? '?' : null;
    }
    case 'farmer': {
      const st = questState('slime');
      return st === 'none' ? '!' : st === 'ready' ? '?' : null;
    }
    case 'cat': return questState('cat') === 'active' ? '?' : null;
    default: return null;
  }
}

const L = (speaker, text) => ({ speaker, text });

export function talk(id, w) {
  const f = G.flags;
  const P = PLAYER_NAME;

  switch (id) {
    case 'chief': {
      const C = '촌장';
      const main = questState('main');
      if (main === 'none') {
        return {
          lines: [
            L(C, `오, ${P}! 마침 잘 왔구나.`),
            L(C, '어젯밤 그림자 군주 모르그가 나타나 「빛의 왕관」을 훔쳐 갔단다.'),
            L(C, '왕관의 힘이 사라지자 숲에 몬스터들이 들끓기 시작했어.'),
            L(P, '제가 왕관을 되찾아 올게요!'),
            L(C, '허허, 역시 용감하구나. 하지만 그 나무칼로는 위험해.'),
            L(C, '먼저 마을 오른쪽 위 대장간의 브론에게 들르거라.'),
            L(C, '그리고 북쪽 숲 서쪽에 사는 마법사 엘든이 길을 알려 줄 게다.'),
          ],
          onDone: () => {
            startQuest('main');
            w.toast('퀘스트 시작: 빛의 왕관을 찾아서');
          },
        };
      }
      if (main === 'done') return { lines: [L(C, `${P}, 너는 우리 마을의 영웅이란다.`)] };
      if (f.crown) {
        return {
          lines: [
            L(C, '오오…! 그것은 빛의 왕관!'),
            L(C, `정말로 해냈구나, ${P}!`),
            L(C, '이제 왕국에 다시 빛이 돌아올 게야. 고맙다, 정말 고맙다.'),
          ],
          onDone: () => w.startEnding(),
        };
      }
      return {
        lines: [L(C, '왕관을 부탁한다. 힘들면 여관에서 쉬어 가거라.'), L(C, '몬스터를 쓰러뜨리며 강해지는 것도 잊지 말고.')],
      };
    }

    case 'smith': {
      const S = '브론';
      if (questState('main') === 'active' && !f.got_sword) {
        return {
          lines: [
            L(S, '촌장님 얘기 들었다! 왕관을 찾으러 간다며?'),
            L(S, '나무칼로는 슬라임도 못 잡지. 이 철검을 가져가라!'),
            L(S, '내 자신작이다. 공짜니까 걱정 말고!'),
          ],
          onDone: () => {
            f.got_sword = true;
            addItem('iron_sword');
            equipIfBetter('iron_sword');
            w.itemGot('iron_sword', 1, '철검을 받아 장착했다!');
          },
        };
      }
      return {
        lines: [L(S, '어서 와! 더 좋은 무기와 갑옷이 필요하면 골라 봐.')],
        onDone: () => w.openShop('blacksmith'),
      };
    }

    case 'mina':
      return {
        lines: [L('미나', '어서 오세요~ 오늘의 추천은 빨간 포션이에요!')],
        onDone: () => w.openShop('general'),
      };

    case 'inn':
      return {
        lines: [L('여관 주인', '어서 오게. 10골드면 HP를 모두 회복하고 모험 기록도 남겨 주지.')],
        choices: ['쉰다 (10G)', '그만둔다'],
        onDone: (c) => { if (c === 0) w.innRest(); },
      };

    case 'toto': {
      const T = '토토';
      const st = questState('cat');
      if (st === 'none') {
        return {
          lines: [
            L(T, '흑흑… 내 고양이 나비가 숲으로 도망갔어…'),
            L(T, '주황색 고양이야. 숲 동쪽 덤불 근처에서 봤다는 사람이 있었어.'),
            L(T, `${P} 형, 나비 좀 찾아 줄래?`),
          ],
          onDone: () => { startQuest('cat'); w.toast('퀘스트 시작: 잃어버린 고양이'); },
        };
      }
      if (st === 'active' && f.cat_found) {
        return {
          lines: [
            L(T, '나비가 돌아왔어! 고마워, 형!'),
            L(T, '이거 우리 아빠가 쓰던 가죽 갑옷인데… 형한테 줄게!'),
          ],
          onDone: () => {
            if (!addItem('leather_armor')) { w.toast('인벤토리가 가득 찼다! 칸을 비우고 다시 말을 걸자.'); return; }
            G.quests.cat = 'done';
            equipIfBetter('leather_armor');
            w.itemGot('leather_armor', 1, '가죽 갑옷을 받았다!');
            w.toast('퀘스트 완료: 잃어버린 고양이');
          },
        };
      }
      if (st === 'active') return { lines: [L(T, '나비는 숲 동쪽 덤불 속에 있을지도 몰라…')] };
      return { lines: [L(T, '나비랑 놀고 있어! 헤헤.')] };
    }

    case 'farmer': {
      const F = '농부 아줌마';
      const st = questState('slime');
      if (st === 'none') {
        return {
          lines: [
            L(F, '아이고, 숲에서 슬라임들이 내려와서 밭을 엉망으로 만들고 있어!'),
            L(F, '숲에 있는 슬라임 5마리만 혼내 주겠니? 보답은 꼭 할게.'),
          ],
          onDone: () => { startQuest('slime'); w.toast('퀘스트 시작: 슬라임 퇴치'); },
        };
      }
      if (st === 'active') return { lines: [L(F, `슬라임 ${G.progress.slime || 0}/5 마리… 조금만 더 부탁해!`)] };
      if (st === 'ready') {
        return {
          lines: [L(F, '정말 고마워! 이건 감사의 표시야.')],
          onDone: () => {
            G.quests.slime = 'done';
            G.gold += 50;
            addItem('red_potion', 3);
            w.itemGot('red_potion', 3, '50골드와 빨간 포션 3개를 받았다!');
            w.toast('퀘스트 완료: 슬라임 퇴치');
          },
        };
      }
      return { lines: [L(F, '덕분에 올해 농사는 풍년이겠어!')] };
    }

    case 'guard':
      if (questState('main') === 'none') return { lines: [L('경비병', '숲은 위험해. 촌장님께 먼저 인사드리고 가렴.')] };
      return { lines: [L('경비병', '조심해서 다녀와! 숲에는 슬라임이 많아.'), L('경비병', '공격은 스페이스바, 포션은 1번 키야.')] };

    case 'wizard': {
      const W = '엘든';
      if (f.rock_removed) return { lines: [L(W, '그림자 열쇠를 찾아 마왕의 방을 열거라. 몸조심하고.')] };
      if (questState('main') === 'none') return { lines: [L(W, '…누구냐? 볼일이 없다면 돌아가거라.')] };
      return {
        lines: [
          L(W, '오, 촌장이 보낸 아이로구나.'),
          L(W, '왕관의 기운이 북동쪽 수정 동굴 너머에서 느껴진다.'),
          L(W, '동굴 입구는 큰 바위로 막혀 있지. 내가 치워 주마.'),
          L(W, '동굴 깊은 곳 어딘가에 마왕의 방을 여는 「그림자 열쇠」가 있을 게다.'),
        ],
        onDone: () => w.removeRock(),
      };
    }

    case 'cat':
      if (questState('cat') === 'active') {
        return {
          lines: [L('나비', '야옹~'), L(P, '(나비를 찾았다! 토토에게 데려다주자.)')],
          onDone: () => w.catFound(),
        };
      }
      return { lines: [L('???', '야옹?'), L(P, '(주황색 고양이다. 누군가 찾고 있을지도…)')] };

    case 'cat_home':
      return { lines: [L('나비', '야옹~ (만족스러워 보인다)')] };

    default:
      return { lines: [L('???', '…')] };
  }
}

export const NARRATION = {
  intro: [
    L('', '평화로운 왕국 루미엘.'),
    L('', '어느 날 밤, 왕국을 지켜 온 「빛의 왕관」이 사라졌다.'),
    L('', '시골 마을 햇살골의 견습 모험가 리오의 모험이 지금 시작된다.'),
    L('엄마', `${PLAYER_NAME}, 촌장님이 너를 찾으셨단다! 어서 가 보렴.`),
  ],
  bossIntro: [
    L('모르그', '감히 여기까지 오다니… 하찮은 꼬마로구나.'),
    L('모르그', '빛의 왕관은 이제 내 것이다. 사라져라!'),
  ],
  crown: [
    L('', '빛의 왕관을 되찾았다!'),
    L(PLAYER_NAME, '(이제 마을로 돌아가 촌장님께 전해 드리자.)'),
  ],
  doorLocked: [L('', '거대한 문이 굳게 잠겨 있다.'), L(PLAYER_NAME, '(어딘가에 열쇠가 있을 것 같아.)')],
  doorOpen: [L('', '그림자 열쇠를 사용했다! 문이 열린다…')],
  guardBlock: [L('경비병', '잠깐! 숲은 위험해. 촌장님께 먼저 인사드리고 가렴.')],
};
