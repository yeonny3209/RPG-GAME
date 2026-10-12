// 게임 시작점: Phaser 설정과 장면(Scene) 등록

import { GAME_W, GAME_H } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { WorldScene } from './scenes/WorldScene.js';
import { UIScene } from './scenes/UIScene.js';
import { DialogScene } from './scenes/DialogScene.js';
import { InventoryScene } from './scenes/InventoryScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { PauseScene } from './scenes/PauseScene.js';
import { QuestScene } from './scenes/QuestScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { EndingScene } from './scenes/EndingScene.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#0d0b14',
  // 주소에 ?timer 를 붙이면 화면이 숨겨진 상태에서도 게임이 돌아간다 (자동 테스트용)
  fps: { target: 60, forceSetTimeOut: new URLSearchParams(location.search).has('timer') },
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  input: {
    keyboard: { capture: [32, 37, 38, 39, 40] }, // 스페이스·방향키로 페이지가 스크롤되지 않게
  },
  scene: [
    BootScene, TitleScene, WorldScene, UIScene, DialogScene, InventoryScene,
    ShopScene, PauseScene, QuestScene, GameOverScene, EndingScene,
  ],
});

window.game = game;
