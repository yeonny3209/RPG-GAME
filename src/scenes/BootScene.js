// 시작할 때 모든 그래픽과 애니메이션을 만든다

import { buildTextures, buildAnims } from '../gfx.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    buildTextures(this);
    buildAnims(this);
    const loading = document.getElementById('loading');
    if (loading) loading.remove();
    this.scene.start('Title');
  }
}
