// Animal Rider — Kaplay platformer with multiple levels + boss fight.
// Hero boy can mount horse (faster) or dragon (higher jump + double jump).
// Ground enemies: snakes. Sky enemies: bats. Powers: star shield, fire flower.

const k = kaplay({
  canvas: document.getElementById("game-canvas"),
  width: 900,
  height: 500,
  background: [135, 206, 235],
  letterbox: true,
  global: false,
});

// --- Physics defaults ---
const GRAVITY        = 1800;
const FALL_MULT      = 1.6;
const JUMP_FORCE     = 900;
const MOVE_SPEED     = 240;
const CUT_JUMP_SPEED = 250;
const COYOTE_TIME    = 0.10;
const JUMP_BUFFER    = 0.10;

const HORSE_SPEED_MULT = 1.7;
const DRAGON_JUMP_MULT = 1.35;
const SNAKE_SPEED      = 50;
const FIREBALL_SPEED   = 500;
const SHIELD_DURATION  = 5;
const BOSS_HP          = 3;
const BOSS_SPEED       = 55;

k.setGravity(GRAVITY);

// --- Sprites ---
k.loadSprite("hero",   "assets/hero.png",   { sliceX: 4, anims: { idle: 0, run: { from: 1, to: 3, loop: true, speed: 10 } } });
k.loadSprite("horse",  "assets/horse.png",  { sliceX: 4, anims: { idle: 0, run: { from: 1, to: 3, loop: true, speed: 12 } } });
k.loadSprite("dragon", "assets/dragon.png", { sliceX: 4, anims: { idle: 0, run: { from: 1, to: 3, loop: true, speed: 8 } } });
k.loadSprite("snake",  "assets/snake.png",  { sliceX: 2, anims: { walk: { from: 0, to: 1, loop: true, speed: 5 } } });
k.loadSprite("bat",    "assets/bat.png",    { sliceX: 2, anims: { fly:  { from: 0, to: 1, loop: true, speed: 8 } } });
k.loadSprite("boss",   "assets/boss.png",   { sliceX: 3, anims: { roar: { from: 0, to: 2, loop: true, speed: 3 } } });
k.loadSprite("coin",     "assets/coin.png");
k.loadSprite("star",     "assets/star.png");
k.loadSprite("fire",     "assets/fire.png");
k.loadSprite("fireball", "assets/fireball.png");
k.loadSprite("flag",     "assets/flag.png");
k.loadSprite("ground",   "assets/ground.png");
k.loadSprite("stone",    "assets/stone.png");

const TILE = 48;

// --- Levels ---
// = ground, # stone, P player, H horse, D dragon, s snake, b bat,
// c coin, * star, f fire flower, F flag, B boss
const LEVELS = [
  // Level 1 — easy intro
  [
    "                                                                ",
    "                                                                ",
    "                                                                ",
    "                                                                ",
    "             cccc                       ccccc                   ",
    "      *                                                       F ",
    "    #####          ######          ###########                 #",
    "                                                               #",
    "  P    H        c    s   c       D    c     s    c      s    ###",
    "==============================================================#",
  ],
  // Level 2 — sky bats appear, fire flower
  [
    "                                                                              ",
    "                                                                              ",
    "                       b              b              ccc        b             ",
    "                                                                              ",
    "          cccc      *           ccccc       f                                F",
    "        ######            ###########                  ###         ##### # # #",
    "                  cc                       cc                                #",
    "             cc                                              cc              #",
    "  P     H        c   s  c        D       s  c     c   s   c       c   s    ##",
    "============================  =====  =================  ====================#",
  ],
  // Level 3 — harder, more enemies, gaps
  [
    "                                                                                              ",
    "                                                                                              ",
    "        b           ccc          b           cccc          b          ccccc                   ",
    "                                                                                              ",
    "    f          ccc           *                                              ccc              F",
    "  #####     ########       ########       ########      ########        #########         ## #",
    "                                                                                             #",
    "         cc       cc                cc           cc            cc            cc              #",
    "  P  H        s  D    s  b     s    D    b   s     D    b    s     D    b   s    s          #",
    "===  ====  ===========  ====  =========  ====  =========  ====  =========  ===============   #",
    "                                                                                             #",
  ],
  // Level 4 — boss arena (compact, walls, boss + fire flower)
  [
    "                                                                ",
    "                                                                ",
    "                                                                ",
    "                                                                ",
    "                                                                ",
    "        f                                       *               ",
    "      #####                                  #####              ",
    "                                                                ",
    "                                              B                 ",
    "  P                                                             ",
    "================================================================",
  ],
];

const statusEl = document.getElementById("status");

// --- Game state across scenes ---
let coins = 0;
let totalLevels = LEVELS.length;

// --- Scene factory ---
k.scene("game", ({ levelIndex }) => {
  const isBossLevel = levelIndex === totalLevels - 1;
  const LEVEL = LEVELS[levelIndex];

  let player; // assigned after addLevel
  let boss   = null;
  let bossHits = 0;
  let levelDone = false;

  const level = k.addLevel(LEVEL, {
    tileWidth:  TILE,
    tileHeight: TILE,
    tiles: {
      "=": () => [
        k.sprite("ground", { width: TILE, height: TILE }),
        k.area(), k.body({ isStatic: true }),
        "ground",
      ],
      "#": () => [
        k.sprite("stone", { width: TILE, height: TILE }),
        k.area(), k.body({ isStatic: true }),
        "ground",
      ],
      "P": () => [
        k.sprite("hero", { width: TILE, height: TILE * 1.3 }),
        k.area({ shape: new k.Rect(k.vec2(10, 10), TILE - 20, TILE * 1.25) }),
        k.body({ jumpForce: JUMP_FORCE }),
        {
          facing: 1, jumpBufferT: 0, coyoteT: 0, dead: false,
          mount: null, mountEntity: null, power: null,
          shieldT: 0, fireCooldown: 0, jumpsLeft: 1, _spriteName: "hero",
        },
        "player",
      ],
      "H": () => [
        k.sprite("horse", { width: TILE * 1.4, height: TILE }),
        k.area({ shape: new k.Rect(k.vec2(6, 8), TILE * 1.4 - 12, TILE - 12) }),
        k.body(),
        { kind: "horse" },
        "mount",
      ],
      "D": () => [
        k.sprite("dragon", { width: TILE, height: TILE * 1.1 }),
        k.area({ shape: new k.Rect(k.vec2(8, 8), TILE - 16, TILE * 1.05) }),
        k.body(),
        { kind: "dragon" },
        "mount",
      ],
      "s": () => [
        k.sprite("snake", { width: TILE * 1.1, height: TILE * 0.7 }),
        k.area({ shape: new k.Rect(k.vec2(4, 6), TILE * 1.1 - 8, TILE * 0.7 - 8) }),
        k.body(),
        { dir: -1 },
        "snake",
      ],
      "b": () => [
        k.sprite("bat", { width: TILE * 0.9, height: TILE * 0.7 }),
        k.area({ shape: new k.Rect(k.vec2(4, 4), TILE * 0.9 - 8, TILE * 0.7 - 8) }),
        k.pos(),
        { dir: 1, baseY: 0, baseX: 0, t: Math.random() * Math.PI * 2 },
        "bat",
      ],
      "c": () => [
        k.sprite("coin", { width: TILE * 0.6, height: TILE * 0.6 }),
        k.area({ shape: new k.Rect(k.vec2(0, 0), TILE * 0.6, TILE * 0.6) }),
        "coin",
      ],
      "*": () => [
        k.sprite("star", { width: TILE * 0.7, height: TILE * 0.7 }),
        k.area({ shape: new k.Rect(k.vec2(0, 0), TILE * 0.7, TILE * 0.7) }),
        "star",
      ],
      "f": () => [
        k.sprite("fire", { width: TILE * 0.7, height: TILE * 0.7 }),
        k.area({ shape: new k.Rect(k.vec2(0, 0), TILE * 0.7, TILE * 0.7) }),
        "fire",
      ],
      "F": () => [
        k.sprite("flag", { width: TILE, height: TILE * 2 }),
        k.area({ shape: new k.Rect(k.vec2(0, 0), TILE * 0.6, TILE * 2) }),
        "flag",
      ],
      "B": () => [
        k.sprite("boss", { width: TILE * 2.5, height: TILE * 2.5 }),
        k.area({ shape: new k.Rect(k.vec2(15, 15), TILE * 2.5 - 30, TILE * 2.5 - 20) }),
        k.body(),
        { dir: -1, atkT: 2, hp: BOSS_HP, hurtT: 0 },
        "boss",
      ],
    },
  });

  player = level.get("player")[0];
  player.play("idle");
  k.get("bat").forEach((b) => { b.baseY = b.pos.y; b.baseX = b.pos.x; });
  boss = level.get("boss")[0] || null;
  if (boss) boss.play("roar");

  // --- Helpers ---
  function effSpeed() {
    return player.mount === "horse" ? MOVE_SPEED * HORSE_SPEED_MULT : MOVE_SPEED;
  }

  function mountAnimal(animal) {
    player.mount = animal.kind;
    player.mountEntity = animal;
    animal.hidden = true;
    animal.paused = true;
    try { animal.unuse("area"); } catch {}
    updateStatus();
  }

  function dismount() {
    if (!player.mountEntity) { player.mount = null; updateStatus(); return; }
    const a = player.mountEntity;
    a.pos = k.vec2(player.pos.x + 30 * player.facing, player.pos.y);
    a.hidden = false;
    a.paused = false;
    a.use(k.area({ shape: new k.Rect(k.vec2(6, 8), a.width - 12, a.height - 12) }));
    player.mount = null;
    player.mountEntity = null;
    updateStatus();
  }

  function jumpPress() {
    if (player.dead) return;
    if (player.mount === "dragon" && !player.isGrounded() && player.jumpsLeft > 0) {
      player.jump(JUMP_FORCE * DRAGON_JUMP_MULT);
      player.jumpsLeft--;
    } else {
      player.jumpBufferT = JUMP_BUFFER;
    }
  }

  // --- Input ---
  k.onKeyDown("left",  () => { if (!player.dead) { player.move(-effSpeed(), 0); player.facing = -1; player.flipX = true;  } });
  k.onKeyDown("right", () => { if (!player.dead) { player.move( effSpeed(), 0); player.facing =  1; player.flipX = false; } });
  k.onKeyPress("space", jumpPress);
  k.onKeyPress("up",    jumpPress);
  k.onKeyRelease("space", () => { if (player.vel.y < -CUT_JUMP_SPEED) player.vel.y = -CUT_JUMP_SPEED; });

  k.onKeyPress("down", () => {
    if (player.dead) return;
    if (player.mount) {
      dismount();
    } else {
      const nearby = k.get("mount").find((m) => !m.hidden && Math.abs(m.pos.x - player.pos.x) < TILE && Math.abs(m.pos.y - player.pos.y) < TILE * 1.5);
      if (nearby) mountAnimal(nearby);
    }
  });

  k.onKeyPress("x", () => {
    if (player.dead || player.power !== "fire" || player.fireCooldown > 0) return;
    player.fireCooldown = 0.35;
    const fb = k.add([
      k.sprite("fireball", { width: TILE * 0.5, height: TILE * 0.5 }),
      k.pos(player.pos.x + player.facing * 20, player.pos.y - 20),
      k.area({ shape: new k.Rect(k.vec2(0, 0), TILE * 0.5, TILE * 0.5) }),
      k.anchor("center"),
      { vx: FIREBALL_SPEED * player.facing, life: 1.5 },
      "fireball",
    ]);
    fb.onUpdate(() => {
      fb.pos.x += fb.vx * k.dt();
      fb.life -= k.dt();
      if (fb.life <= 0) k.destroy(fb);
    });
  });

  // --- Player update ---
  player.onUpdate(() => {
    if (player.dead) return;

    const wantSprite = player.mount === "horse" ? "horse" : player.mount === "dragon" ? "dragon" : "hero";
    if (player._spriteName !== wantSprite) {
      player.use(k.sprite(wantSprite, {
        width:  wantSprite === "horse" ? TILE * 1.4 : TILE,
        height: wantSprite === "horse" ? TILE       : TILE * 1.3,
      }));
      player._spriteName = wantSprite;
      player.play("idle");
    }

    if (player.isGrounded()) {
      player.coyoteT = COYOTE_TIME;
      player.jumpsLeft = player.mount === "dragon" ? 1 : 0;
    } else {
      player.coyoteT = Math.max(0, player.coyoteT - k.dt());
      if (player.vel.y > 0) player.vel.y += GRAVITY * (FALL_MULT - 1) * k.dt();
    }
    player.jumpBufferT = Math.max(0, player.jumpBufferT - k.dt());

    if (player.jumpBufferT > 0 && player.coyoteT > 0) {
      player.jump(player.mount === "dragon" ? JUMP_FORCE * DRAGON_JUMP_MULT : JUMP_FORCE);
      player.jumpBufferT = 0;
      player.coyoteT = 0;
    }

    const moving = Math.abs(player.vel.x) > 1 && player.isGrounded();
    const want = moving ? "run" : "idle";
    if (player.curAnim() !== want) player.play(want);

    if (player.shieldT > 0) {
      player.shieldT -= k.dt();
      player.opacity = (Math.floor(k.time() * 12) % 2 === 0) ? 0.5 : 1;
      if (player.shieldT <= 0) { player.opacity = 1; updateStatus(); }
    }

    player.fireCooldown = Math.max(0, player.fireCooldown - k.dt());

    if (player.pos.y > 900) die();
  });

  // --- Snakes ---
  k.onUpdate("snake", (s) => {
    s.move(SNAKE_SPEED * s.dir, 0);
    if (s.curAnim() !== "walk") s.play("walk");
    s.flipX = s.dir > 0;
  });
  k.onCollide("snake", "ground", (s, _, col) => {
    if (col?.isLeft())  s.dir =  1;
    if (col?.isRight()) s.dir = -1;
  });

  // --- Bats ---
  k.onUpdate("bat", (b) => {
    b.t += k.dt();
    b.pos.x = b.baseX + Math.sin(b.t * 1.2) * 80;
    b.pos.y = b.baseY + Math.sin(b.t * 2.4) * 25;
    if (b.curAnim() !== "fly") b.play("fly");
  });

  // --- Boss: patrols, periodically spits fireballs at player ---
  if (boss) {
    k.onUpdate("boss", (bo) => {
      bo.move(BOSS_SPEED * bo.dir, 0);
      bo.flipX = bo.dir > 0;
      bo.atkT -= k.dt();
      if (bo.hurtT > 0) {
        bo.hurtT -= k.dt();
        bo.opacity = (Math.floor(k.time() * 14) % 2 === 0) ? 0.4 : 1;
        if (bo.hurtT <= 0) bo.opacity = 1;
      }
      if (bo.atkT <= 0) {
        bo.atkT = 3.5;
        const dir = player.pos.x < bo.pos.x ? -1 : 1;
        const fb = k.add([
          k.sprite("fireball", { width: TILE * 0.7, height: TILE * 0.7 }),
          k.pos(bo.pos.x + dir * TILE, bo.pos.y - TILE * 1.5),
          k.area({ shape: new k.Rect(k.vec2(0, 0), TILE * 0.7, TILE * 0.7) }),
          k.anchor("center"),
          { vx: 380 * dir, life: 2.5 },
          "bossfire",
        ]);
        fb.onUpdate(() => {
          fb.pos.x += fb.vx * k.dt();
          fb.life -= k.dt();
          if (fb.life <= 0) k.destroy(fb);
        });
      }
    });
    k.onCollide("boss", "ground", (bo, _, col) => {
      if (col?.isLeft())  bo.dir =  1;
      if (col?.isRight()) bo.dir = -1;
    });
  }

  // --- Collectibles ---
  player.onCollide("star", (s) => { k.destroy(s); player.shieldT = SHIELD_DURATION; updateStatus(); });
  player.onCollide("fire", (f) => { k.destroy(f); player.power = "fire"; updateStatus(); });
  player.onCollide("coin", (c) => { k.destroy(c); coins += 1; updateStatus(); });

  // --- Enemy contact: stomp from above kills ---
  function enemyHit(enemy, col) {
    if (player.dead) return;
    if (col?.isBottom() || player.vel.y > 80) {
      k.destroy(enemy);
      player.jump(JUMP_FORCE * 0.7);
      coins += 1;
      updateStatus();
      return;
    }
    if (player.shieldT > 0) return;
    if (player.mount) { dismount(); player.shieldT = 1.5; updateStatus(); return; }
    die();
  }
  player.onCollide("snake", enemyHit);
  player.onCollide("bat",   enemyHit);

  // --- Boss damage: stomp from above OR fireball from player ---
  player.onCollide("boss", (bo, col) => {
    if (player.dead || bo.hurtT > 0) return;
    if (col?.isBottom() || player.vel.y > 80) {
      bossDamage(bo);
      player.jump(JUMP_FORCE * 0.9);
    } else if (player.shieldT > 0) {
      return;
    } else if (player.mount) {
      dismount(); player.shieldT = 1.5; updateStatus();
    } else {
      die();
    }
  });

  function bossDamage(bo) {
    bo.hp -= 1;
    bo.hurtT = 0.8;
    if (bo.hp <= 0) {
      k.destroy(bo);
      win();
    }
  }

  // --- Fireballs ---
  k.onCollide("fireball", "snake", (fb, s) => { k.destroy(fb); k.destroy(s); });
  k.onCollide("fireball", "bat",   (fb, b) => { k.destroy(fb); k.destroy(b); });
  k.onCollide("fireball", "ground",(fb)    => { k.destroy(fb); });
  k.onCollide("fireball", "boss",  (fb, bo)=> { k.destroy(fb); if (bo.hurtT <= 0) bossDamage(bo); });

  // --- Boss fireballs hurt player ---
  k.onCollide("bossfire", "player", (fb) => {
    k.destroy(fb);
    if (player.shieldT > 0) return;
    if (player.mount) { dismount(); player.shieldT = 1.5; updateStatus(); return; }
    die();
  });
  k.onCollide("bossfire", "ground", (fb) => { k.destroy(fb); });

  // --- Goal flag ---
  player.onCollide("flag", () => {
    if (player.dead || levelDone) return;
    levelDone = true;
    nextLevel();
  });

  // --- Camera ---
  k.onUpdate(() => {
    const cam = k.getCamPos();
    k.setCamPos(cam.lerp(player.pos, 0.15));
  });

  // --- Death ---
  function die() {
    if (player.dead) return;
    player.dead = true;
    player.use(k.color(180, 60, 60));
    player.vel.x = 0;
    player.jump(JUMP_FORCE * 1.1);
    k.wait(1.2, () => {
      // restart current level, keep coins
      k.go("game", { levelIndex });
    });
  }

  function nextLevel() {
    if (levelIndex + 1 < totalLevels) {
      showOverlay(`✅ שלב ${levelIndex + 1} נגמר!`, () => k.go("game", { levelIndex: levelIndex + 1 }));
    } else {
      win();
    }
  }

  function win() {
    if (player.dead) return;
    player.dead = true;
    showOverlay(`🎉 ניצחת! 🪙 ${coins}`, () => { coins = 0; k.go("game", { levelIndex: 0 }); });
  }

  // --- Debug ---
  k.onKeyPress("d", () => { k.debug.inspect = !k.debug.inspect; });
  if (location.search.includes("debug")) k.debug.inspect = true;

  updateStatus();

  function updateStatus() {
    const levelLabel = isBossLevel ? "👹 בוס" : `שלב ${levelIndex + 1}/${totalLevels - 1}`;
    let s = `${levelLabel} · 🪙 ${coins}`;
    if (player.mount === "horse")  s += " · 🐎";
    else if (player.mount === "dragon") s += " · 🐉";
    else s += " · 🚶";
    if (player.shieldT > 0)        s += " · ⭐";
    if (player.power === "fire")   s += " · 🔥 (X)";
    if (boss) s += ` · ❤️ ${Math.max(0, boss.hp)}`;
    statusEl.textContent = s;
  }
});

// --- Overlay helper (kept outside scene so it's not destroyed) ---
function showOverlay(text, after) {
  const overlay = document.createElement("div");
  overlay.lang = "he"; overlay.dir = "rtl";
  overlay.textContent = text;
  Object.assign(overlay.style, {
    position: "fixed", inset: "0", display: "flex", alignItems: "center",
    justifyContent: "center", background: "rgba(0,0,0,0.65)", color: "#ffe666",
    fontSize: "clamp(2rem, 6vw, 4rem)", fontWeight: "bold",
    fontFamily: "system-ui, sans-serif", textShadow: "0 3px 10px rgba(0,0,0,0.9)",
    zIndex: 9999,
  });
  document.body.appendChild(overlay);
  setTimeout(() => { overlay.remove(); after?.(); }, 2200);
}

k.go("game", { levelIndex: 0 });
