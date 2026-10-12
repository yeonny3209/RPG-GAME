// 보스 (종류별 설정은 아래 BOSSES)
// 「그림자 군주 모르그」
//   1페이즈: 베기 돌진, 3방향 구슬, (가까이 붙으면) 충격파
//   2페이즈 (HP 50% 이하): 빨라짐 + 순간이동 기습, 8방향 구슬, 슬라임 소환
// 「서리 골렘」 (중간 보스)
//   1페이즈: 몸통 박치기, 3방향 얼음 조각, (가까이 붙으면) 땅 내려치기
//   2페이즈: 빨라짐 + 8방향 얼음 조각, 박치기 연속
// 모든 공격 전에는 깜빡이는 예고 동작이 있다.

import { Monster } from './Monster.js';
import { sfx } from '../audio.js';
import { bus } from '../state.js';

export const BOSSES = {
  boss: {
    room: { x1: 28, y1: 30, x2: 292, y2: 206 }, // 마왕의 방 안쪽 (픽셀)
    shotTex: 'orb',
    novaColor: 0xc070ff,
    phase2Tint: 0xff9a9a,
    flag: 'boss_defeated',
    intro: 'bossIntro',
    options(phase, dist, summons) {
      if (phase === 1) return dist < 48 ? ['nova', 'nova', 'slash', 'orbs3'] : ['slash', 'orbs3', 'orbs3'];
      const o = ['slash', 'orbs8', 'teleport', summons < 2 ? 'summon' : 'orbs3'];
      if (dist < 48) o.push('nova', 'nova', 'nova');
      return o;
    },
  },
  golem: {
    room: { x1: 188, y1: 60, x2: 452, y2: 180 }, // 서리 봉우리 투기장 안쪽 (픽셀)
    shotTex: 'shard',
    novaColor: 0x80e0ff,
    phase2Tint: 0x9ad8ff,
    flag: 'golem_defeated',
    intro: 'golemIntro',
    options(phase, dist) {
      if (phase === 1) return dist < 52 ? ['nova', 'nova', 'slash'] : ['slash', 'orbs3', 'orbs3'];
      return dist < 52 ? ['nova', 'nova', 'slash', 'orbs8'] : ['slash', 'slash', 'orbs8', 'orbs3'];
    },
  },
};

export class Boss extends Monster {
  constructor(scene, x, y, kind = 'boss') {
    super(scene, x, y, kind, kind);
    this.isBoss = true;
    this.cfg = BOSSES[kind];
    this.body.setSize(18, 14).setOffset(7, 16);
    this.state = 'sleep';
    this.phase = 1;
    this.mult = 1;
    this.pending = null;
    this.play(`${kind}-move`);
  }

  playMove() {}

  update(time) {
    if (this.dead || !this.body) return;
    const p = this.scene.player;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.hypot(dx, dy);
    this.setDepth(this.y + 8);

    if (this.state === 'sleep') {
      this.setVelocity(0);
      if (!p.dead && dist < 100) {
        this.state = 'intro';
        this.scene.bossWake(this);
      }
      return;
    }
    if (this.state === 'intro' || this.state === 'busy') {
      this.setVelocity(0);
      return;
    }
    if (p.dead) {
      this.setVelocity(0);
      return;
    }

    if (this.phase === 1 && this.hp <= this.maxHp / 2) this.enterPhase2();

    switch (this.state) {
      case 'chase': {
        const sp = this.stats.speed * this.mult;
        if (dist > 20) this.setVelocity((dx / dist) * sp, (dy / dist) * sp);
        else this.setVelocity(0);
        if (time > this.stateUntil || (dist < 40 && time > this.stateUntil - 500)) this.chooseAttack(dist);
        break;
      }
      case 'windup':
        this.setVelocity(0);
        if (Math.floor(time / 70) % 2) this.setTint(0xff4040);
        else this.applyBaseTint();
        if (time > this.stateUntil) {
          this.applyBaseTint();
          this.execute();
        }
        break;
      case 'dash':
        if (time > this.stateUntil) {
          this.setVelocity(0);
          this.recover(550);
        }
        break;
      case 'recover':
        this.setVelocity(0);
        if (time > this.stateUntil) {
          this.state = 'chase';
          this.stateUntil = time + Phaser.Math.Between(900, 1500) / this.mult;
        }
        break;
    }
    if (Math.abs(this.body.velocity.x) > 1) this.setFlipX(this.body.velocity.x < 0);
  }

  applyBaseTint() {
    if (this.phase === 2) this.setTint(this.cfg.phase2Tint);
    else this.clearTint();
  }

  recover(ms) {
    this.state = 'recover';
    this.stateUntil = this.scene.time.now + ms / this.mult;
  }

  enterPhase2() {
    this.phase = 2;
    this.mult = 1.3;
    sfx.roar();
    this.scene.cameras.main.shake(500, 0.008);
    this.scene.cameras.main.flash(300, 120, 0, 40);
    this.scene.floatText(this.x, this.y - 22, '분노!', '#ff5050', 10);
    this.applyBaseTint();
    this.anims.timeScale = 1.6;
    this.recover(700);
  }

  chooseAttack(dist) {
    const summons = this.scene.monsters.getChildren().filter((m) => m.summoned && !m.dead).length;
    const options = this.cfg.options(this.phase, dist, summons);
    const pick = Phaser.Utils.Array.GetRandom(options);
    if (pick === 'teleport') return this.teleport();
    this.pending = pick;
    this.state = 'windup';
    const base = { slash: 600, orbs3: 500, orbs8: 650, summon: 600, nova: 550 }[pick];
    this.stateUntil = this.scene.time.now + base / (this.phase === 2 ? 1.15 : 1);
  }

  execute() {
    const p = this.scene.player;
    const a = Phaser.Math.Angle.Between(this.x, this.y + 8, p.x, p.y);
    switch (this.pending) {
      case 'slash':
        sfx.dash();
        this.setVelocity(Math.cos(a) * 230 * this.mult, Math.sin(a) * 230 * this.mult);
        this.state = 'dash';
        this.stateUntil = this.scene.time.now + 320;
        break;
      case 'orbs3':
        [-0.35, 0, 0.35].forEach((o) => this.scene.fireOrb(this.x, this.y + 6, a + o, 105, this.cfg.shotTex, Math.round(this.stats.atk * 0.7)));
        sfx.orb();
        this.recover(600);
        break;
      case 'orbs8':
        for (let i = 0; i < 8; i++) this.scene.fireOrb(this.x, this.y + 6, (i * Math.PI) / 4, 95, this.cfg.shotTex, Math.round(this.stats.atk * 0.7));
        sfx.orb();
        this.scene.time.delayedCall(380, () => {
          if (this.dead) return;
          for (let i = 0; i < 8; i++) this.scene.fireOrb(this.x, this.y + 6, (i * Math.PI) / 4 + Math.PI / 8, 95, this.cfg.shotTex, Math.round(this.stats.atk * 0.7));
          sfx.orb();
        });
        this.recover(900);
        break;
      case 'nova':
        this.scene.bossNova(this);
        this.recover(500);
        break;
      case 'summon':
        sfx.roar();
        [-22, 22].forEach((ox) => {
          const m = this.scene.spawnMonster('slime', Phaser.Math.Clamp(this.x + ox, this.cfg.room.x1, this.cfg.room.x2), Phaser.Math.Clamp(this.y + 14, this.cfg.room.y1, this.cfg.room.y2));
          m.summoned = true;
          m.setState2('chase');
          m.setAlpha(0);
          this.scene.tweens.add({ targets: m, alpha: 1, duration: 300 });
        });
        this.recover(600);
        break;
    }
    this.pending = null;
  }

  teleport() {
    this.state = 'busy';
    this.setVelocity(0);
    sfx.warp();
    this.scene.tweens.add({
      targets: this, alpha: 0, duration: 280,
      onComplete: () => {
        if (this.dead) return;
        const p = this.scene.player;
        const ang = Math.random() * Math.PI * 2;
        this.body.reset(
          Phaser.Math.Clamp(p.x + Math.cos(ang) * 52, this.cfg.room.x1, this.cfg.room.x2),
          Phaser.Math.Clamp(p.y + Math.sin(ang) * 52, this.cfg.room.y1, this.cfg.room.y2),
        );
        this.scene.tweens.add({
          targets: this, alpha: 1, duration: 200,
          onComplete: () => {
            if (this.dead) return;
            this.pending = 'slash';
            this.state = 'windup';
            this.stateUntil = this.scene.time.now + 380;
          },
        });
      },
    });
  }

  takeHit(dmg) {
    if (this.dead || this.state === 'sleep' || this.state === 'intro') return false;
    this.hp = Math.max(0, this.hp - dmg);
    this.scene.floatText(this.x, this.y - 16, String(dmg), '#ffffff');
    sfx.hit();
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => { if (this.active && !this.dead) this.applyBaseTint(); });
    bus.emit('boss', { show: true, name: this.stats.name, hp: this.hp, max: this.maxHp });
    if (this.hp <= 0) this.die();
    return true;
  }

  die() {
    this.dead = true;
    this.body.enable = false;
    this.setVelocity(0);
    this.scene.onBossDefeated(this);
    this.scene.tweens.add({
      targets: this, alpha: 0, duration: 1600, ease: 'Quad.easeIn',
      onUpdate: () => this.setTintFill(Math.random() < 0.5 ? 0xffffff : 0x8040ff),
      onComplete: () => this.destroy(),
    });
  }
}
