// 마을 사람 / 고양이. 일부는 집 근처를 천천히 돌아다닌다.

import { NPCS, marker } from '../data/story.js';

export class NPC extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, id) {
    const def = NPCS[id];
    super(scene, x, y, def.look, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.id = id;
    this.def = def;
    this.isCat = def.look === 'cat';
    this.home = { x, y };
    this.nextThink = scene.time.now + Math.random() * 2000;
    this.facing = 'down';
    this.talkingUntil = 0;
    this.body.setSize(10, 7).setOffset(3, 9);
    this.body.setImmovable(true);
    this.body.pushable = false;
    this.setCollideWorldBounds(true);
    if (this.isCat) this.play('cat-move');
    else this.play(`${def.look}-idle-down`);

    this.mark = scene.add.image(x, y - 15, 'mark_quest', 0).setVisible(false);
  }

  update(time) {
    if (!this.def.wander || this.isCat) {
      this.setVelocity(0);
    } else if (time < this.talkingUntil) {
      this.setVelocity(0);
    } else if (time > this.nextThink) {
      this.nextThink = time + 1500 + Math.random() * 2500;
      const far = Phaser.Math.Distance.Between(this.x, this.y, this.home.x, this.home.y) > 20;
      if (far) {
        const a = Phaser.Math.Angle.Between(this.x, this.y, this.home.x, this.home.y);
        this.setVelocity(Math.cos(a) * 20, Math.sin(a) * 20);
      } else if (Math.random() < 0.5) {
        this.setVelocity(0);
      } else {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const [dx, dy] = dirs[Math.floor(Math.random() * 4)];
        this.setVelocity(dx * 20, dy * 20);
      }
    }

    if (!this.isCat) {
      const vx = this.body.velocity.x;
      const vy = this.body.velocity.y;
      const moving = Math.abs(vx) + Math.abs(vy) > 1;
      if (moving) this.facing = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up';
      const d = this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing;
      this.setFlipX(this.facing === 'left');
      this.play(`${this.def.look}-${moving ? 'walk' : 'idle'}-${d}`, true);
    }

    const m = marker(this.id);
    this.mark.setVisible(!!m);
    if (m) this.mark.setTexture(m === '!' ? 'mark_quest' : 'mark_report');
    this.mark.setPosition(this.x, Math.round(this.y - 15 + Math.sin(time / 200) * 1.5));
    this.mark.setDepth(9000);
    this.setDepth(this.y);
  }

  // 플레이어 쪽을 바라보고 잠깐 멈춤
  faceTo(px, py) {
    this.talkingUntil = this.scene.time.now + 3000;
    this.setVelocity(0);
    if (this.isCat) return;
    const dx = px - this.x;
    const dy = py - this.y;
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  }

  destroy(fromScene) {
    if (this.mark) this.mark.destroy();
    super.destroy(fromScene);
  }
}
