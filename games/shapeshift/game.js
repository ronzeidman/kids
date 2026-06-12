// משנה צורות (Shapeshift) — a transform puzzle-platformer.
// A boy turns into animals to solve each gate. There are no enemies — just
// puzzles: pick the right animal to get past each wall.
//   🧒 boy  — walks and jumps. Can't pass the special doors.
//   🐦 bird — floaty; flap (space) to fly UP through the high gap in a wall.
//   🐟 fish — swim (arrows) through water channels; everyone else drowns.
// Press 1 / 2 / 3 to change form anywhere.

const k = kaplay({
  canvas: document.getElementById("game-canvas"),
  width: 900,
  height: 500,
  background: [135, 206, 235],
  letterbox: true,
  global: false,
});

// --- Physics ---
const GRAVITY        = 1800;
const FALL_MULT      = 1.6;
const CUT_JUMP_SPEED = 250;
const COYOTE_TIME    = 0.10;
const JUMP_BUFFER    = 0.10;
const FLAP_FORCE     = 500;   // bird upward impulse per flap (gravity is low for the bird)
const SWIM_SPEED     = 170;   // fish swim speed in water

k.setGravity(GRAVITY);

const TILE = 48;

// --- Forms ---
const FORMS = {
  boy:  { sprite: "boy",       speed: 240, jump: 900, gravity: 1,    canFlap: false, swimmer: false, icon: "🧒" },
  bird: { sprite: "bird",      speed: 240, jump: 700, gravity: 0.45, canFlap: true,  swimmer: false, icon: "🐦" },
  fish: { sprite: "fish-form", speed: 210, jump: 700, gravity: 1,    canFlap: false, swimmer: true,  icon: "🐟" },
};

// --- Sprites ---
k.loadSprite("boy",       "assets/boy.png",       { sliceX: 4, anims: { idle: 0, run: { from: 1, to: 3, loop: true, speed: 10 } } });
k.loadSprite("bird",      "assets/bird.png",      { sliceX: 4, anims: { idle: 0, run: { from: 1, to: 3, loop: true, speed: 12 } } });
k.loadSprite("fish-form", "assets/fish-form.png", { sliceX: 4, anims: { idle: 0, run: { from: 1, to: 3, loop: true, speed: 10 } } });
k.loadSprite("ground", "../../shared/assets/ground.png");
k.loadSprite("brick",  "../../shared/assets/brick.png");
k.loadSprite("flag",   "../../shared/assets/flag.png");

// --- Levels ---
// '=' ground · '#' brick · 'w' water · 'P' spawn · 'F' goal flag.
// Each wall has ONE door: a top gap (rows 1-2) only the bird flies through,
// or a water channel only the fish swims through. Row 0 is a brick ceiling.
const LEVELS = [
  // level 1 — bird door, then water door
  [
    "#####################################",
    "                        ##           ",
    "                        ##           ",
    "          ##            ##           ",
    "          ##            ##           ",
    "          ##            ww           ",
    "          ##            ww           ",
    "          ##            ww           ",
    "   P      ##            ww       F   ",
    "========================ww===========",
  ],
  // level 2 — bird, water, bird
  [
    "###############################################",
    "                      ##                       ",
    "                      ##                       ",
    "          ##          ##          ##           ",
    "          ##          ##          ##           ",
    "          ##          ww          ##           ",
    "          ##          ww          ##           ",
    "          ##          ww          ##           ",
    "   P      ##          ww          ##       F   ",
    "======================ww=======================",
  ],
];

const statusEl = document.getElementById("status");
const totalLevels = LEVELS.length;

// --- Audio (synth, no files) ---
const AC = window.AudioContext || window.webkitAudioContext;
let ac;
function tone(f, type, dur, vol, sweep) {
  try {
    if (!ac) ac = new AC();
    const o = ac.createOscillator(), g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.type = type; o.frequency.value = f;
    if (sweep) o.frequency.exponentialRampToValueAtTime(sweep, ac.currentTime + dur * 0.6);
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.start(); o.stop(ac.currentTime + dur);
  } catch {}
}
const sfx = {
  transform: () => [380, 580, 900].forEach((f, i) => setTimeout(() => tone(f, "triangle", 0.18, 0.14), i * 70)),
  flap:      () => tone(520, "sine", 0.09, 0.10, 760),
  jump:      () => tone(320, "sine", 0.14, 0.16, 640),
  splash:    () => { tone(700, "sine", 0.18, 0.12, 200); tone(300, "sine", 0.2, 0.1, 120); },
  win:       () => [520, 660, 880, 1100].forEach((f, i) => setTimeout(() => tone(f, "triangle", 0.18, 0.16), i * 110)),
  die:       () => [300, 200, 120].forEach((f, i) => setTimeout(() => tone(f, "sawtooth", 0.16, 0.12), i * 90)),
};

// --- Particle burst (emoji ok for short-lived effects) ---
function burst(pos, glyphs, n = 12) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 180;
    k.add([
      k.text(glyphs[(Math.random() * glyphs.length) | 0], { size: 24 }),
      k.pos(pos), k.anchor("center"), k.opacity(1), k.z(50),
      { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: 0.6 },
      "fx",
    ]);
  }
}
k.onUpdate("fx", (p) => {
  p.pos.x += p.vx * k.dt();
  p.pos.y += p.vy * k.dt();
  p.vy += 600 * k.dt();
  p.life -= k.dt();
  p.opacity = Math.max(0, p.life / 0.6);
  if (p.life <= 0) k.destroy(p);
});

// --- Scene ---
k.scene("game", ({ levelIndex }) => {
  const LEVEL = LEVELS[levelIndex];
  let levelDone = false;
  let player;

  const level = k.addLevel(LEVEL, {
    tileWidth: TILE,
    tileHeight: TILE,
    tiles: {
      "=": () => [k.sprite("ground", { width: TILE, height: TILE }), k.area(), k.body({ isStatic: true }), "solid"],
      "#": () => [k.sprite("brick",  { width: TILE, height: TILE }), k.area(), k.body({ isStatic: true }), "solid"],
      "w": () => [
        k.rect(TILE, TILE),
        k.color(60, 150, 235),
        k.opacity(0.5),
        k.area(),               // overlap trigger only — no body, you can swim in
        "water",
      ],
      "F": () => [
        k.sprite("flag", { width: TILE, height: TILE * 2 }),
        k.area({ shape: new k.Rect(k.vec2(0, 0), TILE * 0.6, TILE * 2) }),
        "flag",
      ],
      "P": () => [
        k.sprite("boy", { width: TILE, height: TILE * 1.3 }),
        k.area({ shape: new k.Rect(k.vec2(10, 10), TILE - 20, TILE * 1.25) }),
        k.body(),
        k.z(5),                 // draw above the translucent water
        { form: "boy", jumpBufferT: 0, coyoteT: 0, facing: 1, dead: false },
        "player",
      ],
    },
  });

  player = level.get("player")[0];
  player.play("idle");

  const cur = () => FORMS[player.form];
  // Tree/water tiles are children of the level — get() must be recursive.
  const inWater = () => k.get("water", { recursive: true }).some((w) => player.isColliding(w));

  // --- Transform ---
  function setForm(name) {
    if (player.dead || player.form === name) return;
    player.form = name;
    player.use(k.sprite(FORMS[name].sprite, { width: TILE, height: TILE * 1.3 }));
    player.flipX = player.facing < 0;
    player.play("idle");
    burst(player.pos.add(TILE / 2, -TILE * 0.4), ["✨", "💫", "⭐"]);
    sfx.transform();
    updateStatus();
  }

  // --- Input ---
  k.onKeyDown("left",  () => { if (!player.dead) { player.move(-cur().speed, 0); player.facing = -1; player.flipX = true;  } });
  k.onKeyDown("right", () => { if (!player.dead) { player.move( cur().speed, 0); player.facing =  1; player.flipX = false; } });

  // Up / Down: swim when fish-in-water, otherwise Up is a jump.
  k.onKeyDown("up",   () => { if (!player.dead && cur().swimmer && inWater()) player.move(0, -SWIM_SPEED); });
  k.onKeyDown("down", () => { if (!player.dead && cur().swimmer && inWater()) player.move(0,  SWIM_SPEED); });

  function jumpPress() {
    if (player.dead) return;
    if (cur().swimmer && inWater()) return;           // fish swims, no jump
    // player.jump() ungrounds the body and works mid-air, so repeated taps
    // climb. Setting vel.y directly fails to lift off when grounded.
    if (cur().canFlap) { player.jump(FLAP_FORCE); burst(player.pos.add(TILE / 2, TILE * 0.4), ["💨"], 5); sfx.flap(); return; }
    player.jumpBufferT = JUMP_BUFFER;
  }
  k.onKeyPress("space", jumpPress);
  k.onKeyPress("up", jumpPress);
  k.onKeyRelease("space", () => { if (player.vel.y < -CUT_JUMP_SPEED) player.vel.y = -CUT_JUMP_SPEED; });

  k.onKeyPress("1", () => setForm("boy"));
  k.onKeyPress("2", () => setForm("bird"));
  k.onKeyPress("3", () => setForm("fish"));

  // --- Player update ---
  player.onUpdate(() => {
    if (player.dead) return;

    const wet = inWater();
    if (wet && !cur().swimmer) { drown(); return; }   // boy/bird in water → drown

    if (wet && cur().swimmer) {
      player.gravityScale = 0;                         // float / swim freely
      player.vel.y *= 0.85;                            // water drag
      player.vel.x *= 0.9;
    } else {
      player.gravityScale = cur().gravity;
      if (!cur().canFlap && player.vel.y > 0) player.vel.y += GRAVITY * (FALL_MULT - 1) * k.dt();
    }

    if (player.isGrounded()) {
      player.coyoteT = COYOTE_TIME;
    } else {
      player.coyoteT = Math.max(0, player.coyoteT - k.dt());
    }
    player.jumpBufferT = Math.max(0, player.jumpBufferT - k.dt());
    if (player.jumpBufferT > 0 && player.coyoteT > 0) {
      player.jump(cur().jump);
      player.jumpBufferT = 0;
      player.coyoteT = 0;
      sfx.jump();
    }

    const moving = Math.abs(player.vel.x) > 5 && (player.isGrounded() || wet);
    const want = moving ? "run" : "idle";
    if (player.curAnim() !== want) player.play(want);

    if (player.pos.y > 1200) die();
  });

  // --- Goal ---
  player.onCollide("flag", () => {
    if (player.dead || levelDone) return;
    levelDone = true;
    sfx.win();
    if (levelIndex + 1 < totalLevels) {
      showOverlay(`✅ שלב ${levelIndex + 1} עבר!`, () => k.go("game", { levelIndex: levelIndex + 1 }));
    } else {
      showOverlay(`🎉 ניצחת!`, () => k.go("game", { levelIndex: 0 }));
    }
  });

  function drown() {
    if (player.dead) return;
    burst(player.pos.add(TILE / 2, 0), ["💦", "💧", "🫧"], 16);
    sfx.splash();
    die(true);
  }
  function die(silent) {
    if (player.dead) return;
    player.dead = true;
    player.use(k.color(180, 90, 90));
    player.vel.x = 0;
    player.gravityScale = 1;
    if (!silent) sfx.die();
    k.wait(1.0, () => k.go("game", { levelIndex }));
  }

  // --- Camera ---
  k.onUpdate(() => {
    const cam = k.getCamPos();
    k.setCamPos(cam.lerp(player.pos, 0.15));
  });

  // --- Debug ---
  k.onKeyPress("d", () => { k.debug.inspect = !k.debug.inspect; });
  if (location.search.includes("debug")) k.debug.inspect = true;

  updateStatus();
  function updateStatus() {
    statusEl.textContent = `שלב ${levelIndex + 1}/${totalLevels} · ${cur().icon}`;
  }
});

// --- Overlay (outside scene so it survives the scene switch) ---
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
  setTimeout(() => { overlay.remove(); after?.(); }, 1800);
}

k.go("game", { levelIndex: 0 });
