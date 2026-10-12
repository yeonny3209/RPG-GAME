// 주인공 리오: 이동, 공격, 피격

import { PLAYER } from '../config.js';
import { G } from '../state.js';
import { sfx } from '../audio.js';
import { ITEMS, WEAPON_STYLES } from '../data/items.js';

export function weaponStyle() {
  return WEAPON_STYLES[ITEMS[G.equipment.weapon]?.style || 'sword'];
}

export const DIR = {
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const SLASH_ANGLE = { right: 0, down: 90, left: 180, up: -90 };

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(10, 7).setOffset(3, 9);
    this.setCollideWorldBounds(true);
    this.facing = 'down';
    this.attackUntil = 0;
    this.nextAttack = 0;
    this.invulnUntil = 0;
    this.knockUntil = 0;
    this.dead = false;
    this.play('player-idle-down');
  }

  // 발 위치 (상호작용·충돌 판정 기준점)
  get footY() {
    return this.y + 4;
  }

  move(ix, iy, time) {
    if (this.dead) return;
    if (time < this.knockUntil) return;
    if (time < this.attackUntil) {
      this.setVelocity(0);
      return;
    }
    if (ix || iy) {
      const len = Math.hypot(ix, iy);
      this.setVelocity((ix / len) * PLAYER.speed, (iy / len) * PLAYER.speed);
      // 바라보는 방향: 마지막으로 누른 축 우선, 대각선이면 가로 우선
      if (ix && !iy) this.facing = ix > 0 ? 'right' : 'left';
      else if (iy && !ix) this.facing = iy > 0 ? 'down' : 'up';
      else if (!(DIR[this.facing].x === Math.sign(ix) || DIR[this.facing].y === Math.sign(iy))) {
        this.facing = ix > 0 ? 'right' : 'left';
      }
      this.anim('walk');
    } else {
      this.setVelocity(0);
      this.anim('idle');
    }
  }

  anim(kind) {
    const d = this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing;
    this.setFlipX(this.facing === 'left');
    this.play(`player-${kind}-${d}`, true);
  }

  stop() {
    this.setVelocity(0);
    if (!this.dead) this.anim('idle');
  }

  // 공격 시작. 성공하면 칼이 닿는 범위(사각형)를 돌려준다.
  tryAttack(time) {
    if (this.dead || time < this.nextAttack || time < this.knockUntil) return null;
    const st = weaponStyle();
    this.nextAttack = time + st.cooldown;
    this.attackUntil = time + Math.min(PLAYER.attackDuration, st.cooldown - 30);
    this.setVelocity(0);
    this.anim('idle');
    sfx.swing();

    const v = DIR[this.facing];
    const fx = this.x + v.x * st.reach;
    const fy = this.y + 3 + v.y * st.reach;
    const s = this.scene.add.image(fx, fy, 'slash', 0)
      .setAngle(SLASH_ANGLE[this.facing])
      .setDepth(this.y + 30)
      .setScale(st.fx);
    if (st.thrust) s.setScale(st.fx * 1.6, st.fx * 0.55); // 창: 가늘고 길게
    this.scene.tweens.add({
      targets: s, alpha: 0, scaleX: s.scaleX * 1.25, scaleY: s.scaleY * 1.25, duration: 200, ease: 'Quad.easeOut',
      onComplete: () => s.destroy(),
    });
    // 가로로 볼 때와 세로로 볼 때 범위의 가로세로가 바뀐다
    const horiz = v.x !== 0;
    const w = horiz ? st.w : st.h;
    const h = horiz ? st.h : st.w;
    return new Phaser.Geom.Rectangle(fx - w / 2, fy - h / 2, w, h);
  }

  hurt(dmg, fromX, fromY) {
    const now = this.scene.time.now;
    if (this.dead || now < this.invulnUntil || this.scene.godMode) return false;
    G.hp = Math.max(0, G.hp - dmg);
    this.invulnUntil = now + PLAYER.invuln;
    this.knockUntil = now + 150;
    const a = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y);
    this.setVelocity(Math.cos(a) * PLAYER.knockback, Math.sin(a) * PLAYER.knockback);
    sfx.hurt();
    this.scene.floatText(this.x, this.y - 10, '-' + dmg, '#ff6a6a');
    this.scene.cameras.main.shake(120, 0.004);
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.clearTint());
    this.scene.tweens.add({
      targets: this, alpha: 0.3, duration: 90, yoyo: true, repeat: Math.floor(PLAYER.invuln / 180) - 1,
      onComplete: () => this.setAlpha(1),
    });
    if (G.hp <= 0) this.scene.onPlayerDeath();
    return true;
  }
}
