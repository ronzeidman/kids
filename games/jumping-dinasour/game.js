(() => {
  const screen = document.getElementById('dino-screen');
  const stage = document.querySelector('#dino-screen .dino-stage');
  const dino = document.getElementById('dino');
  const status = document.getElementById('dino-status');
  const restartBtn = document.getElementById('restart-dino');

  if (!screen || !stage || !dino || !status || !restartBtn) return;

  let world, platforms, keyItem, goal;

  const setup = () => {
    const stageW = stage.offsetWidth || 700;
    const pct = (f) => Math.floor(stageW * f);

    world = {
      width: stageW,
      floorY: 60, // ground CSS: bottom=54px, height=6px → surface at 60px
      gravity: -1.05,
      jumpForce: 18.5,
      moveSpeed: 5.5,
    };

    platforms = [
      { x: pct(0.15), y: 92,  w: pct(0.17), h: 14 },
      { x: pct(0.35), y: 130, w: pct(0.19), h: 14 },
      { x: pct(0.55), y: 92,  w: pct(0.16), h: 14 },
      { x: pct(0.72), y: 152, w: pct(0.13), h: 14 },
    ];

    keyItem = { x: pct(0.80), y: 192, w: 36, h: 36 };
    goal    = { x: pct(0.88), y: 60,  w: 64, h: 96 }; // y matches floorY
  };

  const state = {
    running: true,
    won: false,
    lost: false,
    keyTaken: false,
    x: 70,
    y: 60,
    vx: 0,
    vy: 0,
    onGround: true,
    facing: 1,
  };

  // Hitbox is 48×56; the 64×64 visual is centered over it (offset by 8px left, 0px bottom)
  const DINO_W = 64, DINO_H = 64, HIT_W = 48, HIT_H = 56;
  const DINO_OFFSET_X = (DINO_W - HIT_W) / 2; // 8px: center visual over hitbox
  const playerRect = () => ({ x: state.x, y: state.y, w: HIT_W, h: HIT_H });
  const rectsOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  let platformLayer, keyLayer, goalLayer;

  const ensureLayers = () => {
    platformLayer = stage.querySelector('.platform-layer') || document.createElement('div');
    platformLayer.className = 'platform-layer';
    if (!platformLayer.parentElement) stage.appendChild(platformLayer);

    keyLayer = stage.querySelector('.key-item') || document.createElement('div');
    keyLayer.className = 'key-item';
    if (!keyLayer.parentElement) stage.appendChild(keyLayer);

    goalLayer = stage.querySelector('.goal-item') || document.createElement('div');
    goalLayer.className = 'goal-item';
    if (!goalLayer.parentElement) stage.appendChild(goalLayer);
  };

  const draw = () => {
    dino.style.left   = `${state.x - DINO_OFFSET_X}px`; // center 64px visual over 48px hitbox
    dino.style.bottom = `${state.y}px`;
    dino.style.transform = `scaleX(${state.facing})`;

    keyLayer.style.left = `${keyItem.x}px`;
    keyLayer.style.bottom = `${keyItem.y}px`;
    keyLayer.style.display = state.keyTaken ? 'none' : 'block';

    goalLayer.style.left = `${goal.x}px`;
    goalLayer.style.bottom = `${goal.y}px`;
  };

  const renderWorld = () => {
    ensureLayers();
    platformLayer.innerHTML = '';

    platforms.forEach((platform) => {
      const el = document.createElement('div');
      el.className = 'platform';
      el.style.left = `${platform.x}px`;
      el.style.bottom = `${platform.y}px`;
      el.style.width = `${platform.w}px`;
      el.style.height = `${platform.h}px`;
      platformLayer.appendChild(el);
    });

    status.textContent = 'קפצו עם מקש הרווח ותלכו עם החצים';
    restartBtn.textContent = state.won ? 'שחקו שוב' : 'התחלה מחדש';
  };

  const reset = () => {
    setup();
    state.running = true;
    state.won = false;
    state.lost = false;
    state.keyTaken = false;
    state.x = 70;
    state.y = world.floorY;
    state.vx = 0;
    state.vy = 0;
    state.onGround = true;
    state.facing = 1;
    screen.classList.remove('game-won');
    renderWorld();
    draw();
  };

  const jump = () => {
    if (!state.running || !state.onGround) return;
    state.vy = world.jumpForce;
    state.onGround = false;
  };

  const moveLeft = () => {
    if (!state.running) return;
    state.vx = -world.moveSpeed;
    state.facing = -1;
  };

  const moveRight = () => {
    if (!state.running) return;
    state.vx = world.moveSpeed;
    state.facing = 1;
  };

  const stopHorizontal = (key) => {
    if (key === 'left' && state.vx < 0) state.vx = 0;
    if (key === 'right' && state.vx > 0) state.vx = 0;
  };

  const onPlatform = (platform) => {
    const p = playerRect();
    return p.x + p.w > platform.x && p.x < platform.x + platform.w
      && p.y <= platform.y + platform.h + 2 && p.y >= platform.y + platform.h - 18
      && state.vy <= 0;
  };

  const update = () => {
    if (!state.running) {
      draw();
      return requestAnimationFrame(update);
    }

    state.x = GameUtils.clamp(state.x + state.vx, 0, world.width - HIT_W);
    state.vy += world.gravity;
    state.y += state.vy;

    let landed = false;
    for (const platform of platforms) {
      if (onPlatform(platform)) {
        state.y = platform.y + platform.h;
        state.vy = 0;
        state.onGround = true;
        landed = true;
        break;
      }
    }

    if (!landed && state.y <= world.floorY) {
      state.y = world.floorY;
      state.vy = 0;
      state.onGround = true;
    }

    const p = playerRect();

    if (!state.keyTaken && rectsOverlap(p, keyItem)) {
      state.keyTaken = true;
      status.textContent = 'יש לכם את המפתח! עכשיו לכו לסוף';
    }

    if (state.keyTaken && rectsOverlap(p, goal)) {
      state.running = false;
      state.won = true;
      status.textContent = 'ניצחתם!';
      screen.classList.add('game-won');
      state.vx = 0;
      state.vy = 0;
    }

    if (!state.keyTaken && p.x + p.w >= goal.x - 4) {
      status.textContent = 'צריך קודם לקחת את המפתח למעלה';
    }

    if (state.y < -80) {
      state.running = false;
      state.lost = true;
      status.textContent = 'נפלתם. לחצו התחלה מחדש';
    }

    draw();
    requestAnimationFrame(update);
  };

  const handleKeyDown = (e) => {
    if (!screen.classList.contains('active')) return;
    if (e.repeat) return;
    if (e.key === 'ArrowLeft') moveLeft();
    if (e.key === 'ArrowRight') moveRight();
    if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); jump(); }
  };

  const handleKeyUp = (e) => {
    if (e.key === 'ArrowLeft') stopHorizontal('left');
    if (e.key === 'ArrowRight') stopHorizontal('right');
  };

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  restartBtn.addEventListener('click', () => { restartBtn.blur(); reset(); });

  requestAnimationFrame(() => { reset(); requestAnimationFrame(update); });
})();
