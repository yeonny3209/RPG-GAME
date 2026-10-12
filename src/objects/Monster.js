// 일반 몬스터. 상태(배회/추격/준비/돌진/휴식/피격)에 따라 움직인다.

import { MONSTERS } from '../data/monsters.js';
import { sfx } from '../audio.js';
import { bus } from '../state.js';

const BODY = {
  slime: [12, 8, 2, 7],
  mushroom: [10, 8, 3, 7],
  bat: [10, 8, 3, 5],
  skeleton: [10, 7, 3, 9],
  toad: [12, 8, 2, 7],
  wisp: [10, 10, 3, 4],
  wolf: [12, 7, 2, 8],
  icespirit: [10, 10, 3, 4],
};

export class Monster extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type, textureKey) {
    super(scene, x, y, textureKey || type, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.kind = type;
    this.stats = MONSTERS[type];
    this.hp = this.stats.hp;
    this.maxHp = this.stats.hp;
    this.dead = false;
    this.home = { x, y };
    this.stateUntil = 0;
    this.nextThink = 0;
    this.wobble = Math.random() * 10;
    this.target = { x, y };

    const b = BODY[type];
    if (b) this.body.setSize(b[0], b[1]).setOffset(b[2], b[3]);
    this.setCollideWorldBounds(true);

    if (this.stats.ai === 'charger') {
      this.state = 'hidden';
      this.setFrame(2);
    } else {
      this.state = 'wander';
      this.playMove();
    }
  }

  playMove() {
    if (this.kind === 'skeleton') return; // 걷는 방향에 따라 update에서 처리
    this.play(`${this.kind}-move`, true);
  }

  setState2(s, duration = 0) {
    this.state = s;
    this.stateUntil = this.scene.time.now + duration;
    if (s !== 'windup') this.clearTint();
  }

  update(time) {
    if (this.dead || !this.body) return;
    const p = this.scene.player;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.hypot(dx, dy);
    const d = this.stats;
    const ai = d.ai;
    const playerGone = p.dead;

    switch (this.state) {
      case 'hidden':
        this.setVelocity(0);
        if (!playerGone && dist < d.detect) {
          this.play('mushroom-move');
          sfx.cursor();
          this.setState2('popup', 300);
          this.scene.tweens.add({ targets: this, scaleY: 1.25, duration: 120, yoyo: true });
        }
        break;

      case 'popup':
        this.setVelocity(0);
        if (time > this.stateUntil) this.startWindup(450);
        break;

      case 'wander':
        if (!playerGone && dist < d.detect) {
          this.setState2('chase');
          this.scene.alertMark(this);
          break;
        }
        if (time > this.nextThink) {
          this.nextThink = time + 900 + Math.random() * 1600;
          const homeDist = Phaser.Math.Distance.Between(this.x, this.y, this.home.x, this.home.y);
          if (homeDist > 56) {
            const a = Phaser.Math.Angle.Between(this.x, this.y, this.home.x, this.home.y);
            this.setVelocity(Math.cos(a) * d.speed, Math.sin(a) * d.speed);
          } else if (Math.random() < 0.4) {
            this.setVelocity(0);
          } else {
            const a = Math.random() * Math.PI * 2;
            this.setVelocity(Math.cos(a) * d.speed, Math.sin(a) * d.speed);
          }
        }
        break;

      case 'chase': {
        if (playerGone || dist > d.detect * 2.2) {
          this.setState2('wander');
          this.setVelocity(0);
          break;
        }
        if (ai === 'knight' && dist < (d.lungeRange || 30)) {
          this.startWindup(d.windup || 500);
          break;
        }
        if (ai === 'spitter' || ai === 'turret') {
          // 너무 가까우면 뒤로 물러나고, 아니면 멈춰서 쏜다
          if (ai === 'spitter' && dist < 40) this.setVelocity((-dx / dist) * d.chaseSpeed, (-dy / dist) * d.chaseSpeed);
          else this.setVelocity(0);
          if (this.nextShot === undefined) this.nextShot = time + 500;
          if (time > this.nextShot) {
            this.nextShot = time + (ai === 'turret' ? 2300 : 1700);
            this.startWindup(ai === 'turret' ? 600 : 450);
          }
          break;
        }
        if (ai === 'blinker') {
          if (this.nextBlink === undefined) this.nextBlink = time + 1500;
          if (time > this.nextBlink) {
            this.nextBlink = time + 3200 + Math.random() * 1500;
            this.blink();
            break;
          }
        }
        let vx = (dx / dist) * d.chaseSpeed;
        let vy = (dy / dist) * d.chaseSpeed;
        if (ai === 'flyer' || ai === 'blinker') {
          const w = Math.sin(time / 140 + this.wobble) * 45;
          vx += (-dy / dist) * w;
          vy += (dx / dist) * w;
        }
        if (ai === 'chaser') {
          // 통통 튀듯이 이동 (속도가 주기적으로 바뀜)
          const hop = 0.45 + 0.75 * Math.max(0, Math.sin(time / 160 + this.wobble));
          vx *= hop;
          vy *= hop;
        }
        this.setVelocity(vx, vy);
        break;
      }

      case 'windup':
        this.setVelocity(0);
        if (Math.floor(time / 70) % 2) this.setTint(0xff6060);
        else this.clearTint();
        if (time > this.stateUntil) {
          this.clearTint();
          if (ai === 'spitter' || ai === 'turret') {
            this.shoot();
            this.setState2('rest', 400);
            break;
          }
          const a = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
          this.setVelocity(Math.cos(a) * d.dashSpeed, Math.sin(a) * d.dashSpeed);
          sfx.dash();
          this.setState2('dash', 330);
        }
        break;

      case 'dash':
        if (time > this.stateUntil) {
          this.setVelocity(0);
          this.setState2('rest', ai === 'knight' ? 700 : 650);
        }
        break;

      case 'rest':
        this.setVelocity(0);
        if (time > this.stateUntil) this.afterRest(dist);
        break;

      case 'hurt':
        if (time > this.stateUntil) {
          this.setVelocity(0);
          if (ai === 'charger') this.afterRest(dist);
          else this.setState2('chase');
        }
        break;
    }

    this.animate();
    this.setDepth(this.y);
  }

  afterRest(dist) {
    const d = this.stats;
    if (d.ai === 'charger') {
      if (!this.scene.player.dead && dist < d.detect * 1.6) this.startWindup(450);
      else {
        this.stop();
        this.setFrame(2);
        this.setState2('hidden');
      }
    } else {
      this.setState2('chase');
    }
  }

  shoot() {
    const d = this.stats;
    if (d.ai === 'turret') {
      // 십자(+)와 대각선(x) 방향을 번갈아 쏜다
      this.volley = (this.volley || 0) + 1;
      const off = this.volley % 2 ? 0 : Math.PI / 4;
      for (let i = 0; i < 4; i++) this.scene.fireOrb(this.x, this.y, off + (i * Math.PI) / 2, d.shotSpeed, d.shotTex, d.atk);
    } else {
      const p = this.scene.player;
      const a = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
      this.scene.fireOrb(this.x, this.y + 2, a, d.shotSpeed, d.shotTex, d.atk);
    }
    sfx.orb();
  }

  // 사라졌다가 플레이어 근처(벽이 아닌 곳)에 다시 나타남
  blink() {
    this.setState2('blink');
    this.setVelocity(0);
    this.scene.tweens.add({
      targets: this, alpha: 0, duration: 250,
      onComplete: () => {
        if (this.dead || !this.body) return;
        const p = this.scene.player;
        for (let i = 0; i < 8; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = 36 + Math.random() * 14;
          const nx = Phaser.Math.Clamp(p.x + Math.cos(a) * r, 12, this.scene.mapW - 12);
          const ny = Phaser.Math.Clamp(p.y + Math.sin(a) * r, 12, this.scene.mapH - 12);
          if (!this.scene.top.getTileAtWorldXY(nx, ny)) {
            this.body.reset(nx, ny);
            break;
          }
        }
        this.scene.tweens.add({
          targets: this, alpha: 1, duration: 250,
          onComplete: () => { if (!this.dead) this.setState2('rest', 350); },
        });
      },
    });
  }

  startWindup(ms) {
    const p = this.scene.player;
    this.target = { x: p.x, y: p.y };
    this.setState2('windup', ms);
  }

  animate() {
    const vx = this.body.velocity.x;
    const vy = this.body.velocity.y;
    if (this.kind === 'skeleton') {
      const moving = Math.abs(vx) + Math.abs(vy) > 1;
      let d = this._dir || 'down';
      if (moving) d = Math.abs(vx) > Math.abs(vy) ? 'side' : vy > 0 ? 'down' : 'up';
      this._dir = d;
      if (d === 'side' && moving) this.setFlipX(vx < 0);
      this.play(`skeleton-${moving ? 'walk' : 'idle'}-${d}`, true);
    } else if (Math.abs(vx) > 1) {
      this.setFlipX(vx < 0);
    } else if (this.kind === 'wolf') {
      this.setFlipX(this.scene.player.x < this.x);
    }
  }

  takeHit(dmg, fromX, fromY) {
    if (this.dead) return false;
    this.hp -= dmg;
    this.scene.floatText(this.x, this.y - 10, String(dmg), '#ffffff');
    sfx.hit();
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => { if (this.active) this.clearTint(); });
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    if (this.state === 'hidden') this.play('mushroom-move');
    const a = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y);
    const kb = this.stats.ai === 'turret' ? 0 : 150; // 얼음 정령은 밀려나지 않음
    this.setVelocity(Math.cos(a) * kb, Math.sin(a) * kb);
    this.state = 'hurt';
    this.stateUntil = this.scene.time.now + 160;
    return true;
  }

  // 독: 0.6초마다 4번 피해 (이미 걸려 있으면 횟수만 다시 채움)
  applyPoison(perTick) {
    if (this.dead) return;
    this.poisonLeft = 4;
    this.setTint(0x90ff70);
    if (this.poisonTimer) return;
    this.poisonTimer = this.scene.time.addEvent({
      delay: 600, loop: true,
      callback: () => {
        if (this.dead || !this.active || this.poisonLeft <= 0) {
          if (this.poisonTimer) this.poisonTimer.remove();
          this.poisonTimer = null;
          if (this.active && !this.dead) this.clearTint();
          return;
        }
        this.poisonLeft--;
        this.hp = Math.max(0, this.hp - perTick);
        this.scene.floatText(this.x + 4, this.y - 8, String(perTick), '#9aff70');
        if (this.isBoss) bus.emit('boss', { show: true, name: this.stats.name, hp: this.hp, max: this.maxHp });
        if (this.hp <= 0) this.die();
      },
    });
  }

  die() {
    this.dead = true;
    this.body.enable = false;
    this.setVelocity(0);
    sfx.kill();
    this.scene.onMonsterKilled(this);
    this.scene.tweens.add({
      targets: this, alpha: 0, scaleX: 1.4, scaleY: 0.3, duration: 260,
      onComplete: () => this.destroy(),
    });
  }
}
