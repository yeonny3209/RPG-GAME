// 게임 전체에서 쓰는 공통 설정값

export const GAME_W = 1280;
export const GAME_H = 720;
export const TILE = 16;
export const ZOOM = 4; // 월드 카메라 확대 배율 (화면에 320x180 픽셀 영역이 보임)

export const FONT = '"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
export const SAVE_KEY = 'lost-crown-save-v1';

// 주소 뒤에 ?debug 를 붙이면 개발용 단축키가 켜진다
export const DEBUG = new URLSearchParams(location.search).has('debug');

export const PLAYER = {
  speed: 85,
  attackCooldown: 400,
  attackDuration: 220,
  invuln: 1000,
  knockback: 150,
};

export const MAX_LEVEL = 15;
export const FROST_MIN_LEVEL = 5; // 서리 봉우리 입장 레벨
export const INVENTORY_SIZE = 20;
export const STACK_MAX = 99;
export const INN_PRICE = 10;
