// games/shooter/game.js — ES module

const W = 640;
const H = 480;

const PLAYER_SPEED = 200;
const BULLET_SPEED = 500;
const PLAYER_RADIUS = 18;
const ENEMY_RADIUS = 16;
const BULLET_RADIUS = 6;
const POWERUP_RADIUS = 16;
const FIRE_COOLDOWN = 300; // ms between shots (normal)
const POWERUP_DURATION = 5000; // ms

const DIFFICULTY = [
  { score: 0,  interval: 1500, speed: 100 },
  { score: 10, interval: 1200, speed: 130 },
  { score: 25, interval: 900,  speed: 165 },
  { score: 50, interval: 650,  speed: 200 },
  { score: 80, interval: 450,  speed: 240 },
];

const POWERUP_TYPES = ['shield', 'rapid', 'spread', 'bomb'];
const POWERUP_COLORS = { shield: 0x4488ff, rapid: 0xffdd00, spread: 0x44cc44, bomb: 0xff8800 };
const POWERUP_LABELS = { shield: '🛡️', rapid: '⚡', spread: '💥', bomb: '💣' };

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // Generate player texture: white circle + gun barrel
    const pg = this.make.graphics({ x: 0, y: 0, add: false });
    pg.fillStyle(0xffffff);
    pg.fillCircle(PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_RADIUS);
    pg.fillStyle(0xaaaaaa);
    pg.fillRect(PLAYER_RADIUS, PLAYER_RADIUS - 4, PLAYER_RADIUS + 6, 8);
    pg.generateTexture('player', PLAYER_RADIUS * 2, PLAYER_RADIUS * 2);
    pg.destroy();

    // Enemy texture: red circle
    const eg = this.make.graphics({ x: 0, y: 0, add: false });
    eg.fillStyle(0xdd2222);
    eg.fillCircle(ENEMY_RADIUS, ENEMY_RADIUS, ENEMY_RADIUS);
    eg.fillStyle(0xff5555);
    eg.fillCircle(ENEMY_RADIUS - 4, ENEMY_RADIUS - 4, 6);
    eg.generateTexture('enemy', ENEMY_RADIUS * 2, ENEMY_RADIUS * 2);
    eg.destroy();

    // Bullet texture: yellow circle
    const bg = this.make.graphics({ x: 0, y: 0, add: false });
    bg.fillStyle(0xffee00);
    bg.fillCircle(BULLET_RADIUS, BULLET_RADIUS, BULLET_RADIUS);
    bg.generateTexture('bullet', BULLET_RADIUS * 2, BULLET_RADIUS * 2);
    bg.destroy();

    // Power-up textures
    for (const type of POWERUP_TYPES) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(POWERUP_COLORS[type]);
      g.fillCircle(POWERUP_RADIUS, POWERUP_RADIUS, POWERUP_RADIUS);
      g.generateTexture(`powerup_${type}`, POWERUP_RADIUS * 2, POWERUP_RADIUS * 2);
      g.destroy();
    }
  }

  create() {
    this.physics.world.setBounds(0, 0, W, H);

    // Background
    this.add.rectangle(W / 2, H / 2, W, H, 0x1a1a2e);

    // Grid lines for atmosphere
    const gridG = this.add.graphics();
    gridG.lineStyle(1, 0x2a2a4e, 0.5);
    for (let x = 0; x <= W; x += 40) gridG.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 40) gridG.lineBetween(0, y, W, y);

    // Player
    this.player = this.physics.add.image(W / 2, H / 2, 'player');
    this.player.setOrigin(0.5);
    this.player.setCollideWorldBounds(true);

    // Groups
    this.bullets = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.powerups = this.physics.add.group();

    // Colliders
    this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHitEnemy, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.onPlayerHitEnemy, null, this);
    this.physics.add.overlap(this.player, this.powerups, this.onPlayerCollectPowerup, null, this);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.on('pointerdown', this.tryShoot, this);

    // State
    this.score = 0;
    this.lives = 3;
    this.invincible = false;
    this.lastFired = 0;
    this.activePowerup = null;
    this.powerupExpiry = 0;
    this.spawnTimer = null;
    this.gameOver = false;

    // HUD
    const hudStyle = { fontSize: '20px', fill: '#ffffff', fontFamily: 'Arial', stroke: '#000000', strokeThickness: 3 };
    this.scoreText = this.add.text(12, 10, 'ניקוד: 0', hudStyle).setScrollFactor(0).setDepth(10);
    this.livesText = this.add.text(W - 12, 10, '❤️❤️❤️', { fontSize: '20px', fontFamily: 'Arial' })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(10);
    this.powerupText = this.add.text(W / 2, H - 24, '', { fontSize: '18px', fill: '#ffffff', fontFamily: 'Arial', stroke: '#000000', strokeThickness: 3 })
      .setOrigin(0.5, 1).setScrollFactor(0).setDepth(10);

    this.startSpawning();
  }

  getDifficulty() {
    let cfg = DIFFICULTY[0];
    for (const d of DIFFICULTY) {
      if (this.score >= d.score) cfg = d;
    }
    return cfg;
  }

  startSpawning() {
    if (this.spawnTimer) this.spawnTimer.remove();
    const { interval } = this.getDifficulty();
    this.spawnTimer = this.time.addEvent({
      delay: interval,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true,
    });
  }

  spawnEnemy() {
    if (this.gameOver) return;
    const edge = Phaser.Math.Between(0, 3);
    let x, y;
    if (edge === 0) { x = Phaser.Math.Between(0, W); y = -ENEMY_RADIUS; }
    else if (edge === 1) { x = W + ENEMY_RADIUS; y = Phaser.Math.Between(0, H); }
    else if (edge === 2) { x = Phaser.Math.Between(0, W); y = H + ENEMY_RADIUS; }
    else { x = -ENEMY_RADIUS; y = Phaser.Math.Between(0, H); }

    const enemy = this.enemies.create(x, y, 'enemy');
    enemy.setOrigin(0.5);
    enemy.body.setCircle(ENEMY_RADIUS);
  }

  tryShoot() {
    if (this.gameOver) return;
    this.shootTowardPointer();
  }

  shootTowardPointer() {
    if (this.gameOver) return;
    const now = this.time.now;
    const cooldown = this.activePowerup === 'rapid' ? FIRE_COOLDOWN / 3 : FIRE_COOLDOWN;
    if (now - this.lastFired < cooldown) return;
    this.lastFired = now;

    const pointer = this.input.activePointer;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.x, pointer.y);

    if (this.activePowerup === 'spread') {
      for (const offset of [-0.25, 0, 0.25]) {
        this.fireBullet(angle + offset);
      }
    } else {
      this.fireBullet(angle);
    }
  }

  fireBullet(angle) {
    const bullet = this.bullets.create(this.player.x, this.player.y, 'bullet');
    bullet.setOrigin(0.5);
    bullet.body.setCircle(BULLET_RADIUS);
    this.physics.velocityFromAngle(Phaser.Math.RadToDeg(angle), BULLET_SPEED, bullet.body.velocity);
    bullet.setDepth(5);
  }

  onBulletHitEnemy(bullet, enemy) {
    bullet.destroy();
    enemy.destroy();
    this.score++;
    this.scoreText.setText(`ניקוד: ${this.score}`);

    // Re-calibrate spawn rate on score milestones
    const thresholds = DIFFICULTY.map(d => d.score);
    if (thresholds.includes(this.score)) this.startSpawning();

    // Maybe drop powerup
    if (Math.random() < 0.2) {
      const type = Phaser.Utils.Array.GetRandom(POWERUP_TYPES);
      const pu = this.powerups.create(enemy.x, enemy.y, `powerup_${type}`);
      pu.setOrigin(0.5);
      pu.body.setCircle(POWERUP_RADIUS);
      pu.powerupType = type;
      // Add label
      this.add.text(enemy.x, enemy.y, POWERUP_LABELS[type], { fontSize: '16px', fontFamily: 'Arial' })
        .setOrigin(0.5).setDepth(6).setName(`label_${pu.id}`);
      // Drift downward
      pu.setVelocityY(40);
      // Destroy after 6 seconds
      this.time.delayedCall(6000, () => { if (pu.active) pu.destroy(); });
    }
  }

  onPlayerHitEnemy(player, enemy) {
    if (this.invincible) { enemy.destroy(); return; }
    enemy.destroy();
    this.lives--;
    this.updateLivesHUD();

    if (this.lives <= 0) {
      this.triggerGameOver();
      return;
    }

    // Invincibility flash
    this.invincible = true;
    this.tweens.add({
      targets: this.player,
      alpha: 0.2,
      yoyo: true,
      repeat: 7,
      duration: 100,
      onComplete: () => {
        this.player.setAlpha(1);
        this.invincible = false;
      },
    });
  }

  onPlayerCollectPowerup(player, powerup) {
    const type = powerup.powerupType;
    powerup.destroy();

    if (type === 'bomb') {
      this.enemies.clear(true, true);
      this.showFlash(0xff8800);
      return;
    }

    this.activePowerup = type;
    this.powerupExpiry = this.time.now + POWERUP_DURATION;

    if (type === 'shield') {
      this.invincible = true;
      this.player.setTint(0x4488ff);
    } else if (type === 'rapid') {
      this.player.setTint(0xffdd00);
    } else if (type === 'spread') {
      this.player.setTint(0x44cc44);
    }
  }

  showFlash(color) {
    const flash = this.add.rectangle(W / 2, H / 2, W, H, color, 0.5).setDepth(20);
    this.tweens.add({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
  }

  updateLivesHUD() {
    this.livesText.setText('❤️'.repeat(Math.max(0, this.lives)));
  }

  triggerGameOver() {
    this.gameOver = true;
    if (this.spawnTimer) this.spawnTimer.remove();
    this.physics.pause();
    this.player.setTint(0xff0000);

    // Overlay
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.65).setDepth(30);
    this.add.text(W / 2, H / 2 - 60, 'המשחק נגמר!', { fontSize: '40px', fill: '#ff4444', fontFamily: 'Arial', stroke: '#000', strokeThickness: 4 })
      .setOrigin(0.5).setDepth(31);
    this.add.text(W / 2, H / 2, `ניקוד: ${this.score}`, { fontSize: '30px', fill: '#ffffff', fontFamily: 'Arial', stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5).setDepth(31);

    const restartBtn = this.add.text(W / 2, H / 2 + 70, '[ התחלה מחדש ]', { fontSize: '24px', fill: '#ffee00', fontFamily: 'Arial', stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5).setDepth(31).setInteractive({ useHandCursor: true });
    restartBtn.on('pointerdown', () => this.scene.restart());
    restartBtn.on('pointerover', () => restartBtn.setStyle({ fill: '#ffffff' }));
    restartBtn.on('pointerout', () => restartBtn.setStyle({ fill: '#ffee00' }));
  }

  update(time) {
    if (this.gameOver) return;

    // Movement
    const vx = (this.cursors.left.isDown || this.wasd.left.isDown ? -1 : 0)
             + (this.cursors.right.isDown || this.wasd.right.isDown ? 1 : 0);
    const vy = (this.cursors.up.isDown || this.wasd.up.isDown ? -1 : 0)
             + (this.cursors.down.isDown || this.wasd.down.isDown ? 1 : 0);
    const len = Math.sqrt(vx * vx + vy * vy) || 1;
    this.player.setVelocity((vx / len) * PLAYER_SPEED, (vy / len) * PLAYER_SPEED);

    // Aim
    const pointer = this.input.activePointer;
    this.player.setRotation(Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.x, pointer.y));

    // Shoot with Space (held)
    if (this.spaceKey.isDown) this.shootTowardPointer();

    // Enemy tracking
    const { speed } = this.getDifficulty();
    this.enemies.getChildren().forEach(enemy => {
      this.physics.moveToObject(enemy, this.player, speed);
    });

    // Destroy out-of-bounds bullets
    this.bullets.getChildren().forEach(b => {
      if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) b.destroy();
    });

    // Powerup timer
    if (this.activePowerup && time > this.powerupExpiry) {
      if (this.activePowerup === 'shield') this.invincible = false;
      this.activePowerup = null;
      this.player.clearTint();
    }

    // Powerup HUD
    if (this.activePowerup) {
      const remaining = Math.ceil((this.powerupExpiry - time) / 1000);
      this.powerupText.setText(`${POWERUP_LABELS[this.activePowerup]} ${remaining}ש`);
    } else {
      this.powerupText.setText('');
    }
  }
}

export function initShooter() {
  const screen = document.getElementById('shooter-screen');
  let game = null;

  const startGame = () => {
    if (game) return;
    const container = document.getElementById('shooter-canvas-container');
    game = new Phaser.Game({
      type: Phaser.AUTO,
      width: W,
      height: H,
      parent: container,
      backgroundColor: '#1a1a2e',
      physics: {
        default: 'arcade',
        arcade: { debug: false },
      },
      scene: GameScene,
    });
  };

  const stopGame = () => {
    if (!game) return;
    game.destroy(true);
    game = null;
  };

  new MutationObserver(() => {
    if (screen.classList.contains('active')) startGame();
    else stopGame();
  }).observe(screen, { attributes: true, attributeFilter: ['class'] });

  // Also handle back buttons
  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', stopGame);
  });
}
