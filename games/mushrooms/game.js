(() => {
  const screen     = document.getElementById('mushrooms-screen');
  const stage      = document.querySelector('#mushrooms-screen .mush-stage');
  const player     = document.getElementById('mush-player');
  const doorEl     = document.getElementById('mush-door');
  const status     = document.getElementById('mush-status');
  const restartBtn = document.getElementById('restart-mush');

  if (!screen || !stage || !player || !doorEl || !status || !restartBtn) return;

  // ── Constants ──────────────────────────────────────────────────────────────
  const FLOOR_Y  = 60;
  const GRAVITY  = -1.05;
  const JUMP_F   = 18.5;
  const BOUNCE_F = 22;
  const MOVE_SPD = 5.5;
  const PLR_W = 56, PLR_H = 64, HIT_W = 42, HIT_H = 56;
  const PLR_OFF_X = (PLR_W - HIT_W) / 2;
  const ENEMY_W = 40, ENEMY_H = 40;
  const FLY_W   = 48, FLY_H   = 40;
  const STOMP_F = 16;
  const DOOR_W       = 60, DOOR_H = 90;
  const SUPER_FRAMES = 300; // ~5 seconds at 60fps

  // ── Level definitions ──────────────────────────────────────────────────────
  // Each level is a function(pct) that returns { mushrooms, enemies, flying }
  const LEVELS = [
    (pct) => ({
      mushrooms: [
        { x: pct(0.08), y: FLOOR_Y,        w: 44, h: 44 },
        { x: pct(0.28), y: FLOOR_Y,        w: 44, h: 44 },
        { x: pct(0.52), y: FLOOR_Y,        w: 44, h: 44 },
        { x: pct(0.18), y: FLOOR_Y + 58,   w: 44, h: 44 },
        { x: pct(0.65), y: FLOOR_Y + 58,   w: 44, h: 44 },
        { x: pct(0.40), y: FLOOR_Y + 125,  w: 44, h: 44 },
      ],
      enemies: [
        { x: pct(0.35), y: FLOOR_Y, vx: -2.2 },
        { x: pct(0.60), y: FLOOR_Y, vx:  2.2 },
      ],
      flying: [
        { x: pct(0.55), y: FLOOR_Y + 80,  vx: -2.8 },
        { x: pct(0.20), y: FLOOR_Y + 140, vx:  2.5 },
      ],
    }),
    (pct) => ({
      mushrooms: [
        { x: pct(0.06), y: FLOOR_Y,        w: 44, h: 44 },
        { x: pct(0.20), y: FLOOR_Y,        w: 44, h: 44 },
        { x: pct(0.38), y: FLOOR_Y,        w: 44, h: 44 },
        { x: pct(0.60), y: FLOOR_Y,        w: 44, h: 44 },
        { x: pct(0.12), y: FLOOR_Y + 70,   w: 44, h: 44 },
        { x: pct(0.45), y: FLOOR_Y + 70,   w: 44, h: 44 },
        { x: pct(0.72), y: FLOOR_Y + 70,   w: 44, h: 44 },
        { x: pct(0.30), y: FLOOR_Y + 140,  w: 44, h: 44 },
      ],
      enemies: [
        { x: pct(0.25), y: FLOOR_Y, vx: -2.5 },
        { x: pct(0.65), y: FLOOR_Y, vx:  2.5 },
      ],
      flying: [],
    }),
    (pct) => ({
      mushrooms: [
        { x: pct(0.05), y: FLOOR_Y,        w: 44, h: 44 },
        { x: pct(0.18), y: FLOOR_Y,        w: 44, h: 44 },
        { x: pct(0.32), y: FLOOR_Y,        w: 44, h: 44 },
        { x: pct(0.48), y: FLOOR_Y,        w: 44, h: 44 },
        { x: pct(0.65), y: FLOOR_Y,        w: 44, h: 44 },
        { x: pct(0.10), y: FLOOR_Y + 65,   w: 44, h: 44 },
        { x: pct(0.30), y: FLOOR_Y + 65,   w: 44, h: 44 },
        { x: pct(0.55), y: FLOOR_Y + 65,   w: 44, h: 44 },
        { x: pct(0.75), y: FLOOR_Y + 65,   w: 44, h: 44 },
        { x: pct(0.40), y: FLOOR_Y + 140,  w: 44, h: 44 },
      ],
      enemies: [
        { x: pct(0.20), y: FLOOR_Y, vx: -3.0 },
        { x: pct(0.60), y: FLOOR_Y, vx:  3.0 },
      ],
      flying: [
        { x: pct(0.45), y: FLOOR_Y + 120, vx: -3.0 },
      ],
    }),
  ];

  // ── World state ────────────────────────────────────────────────────────────
  const world = { width: 700 };
  let mushrooms     = [];
  let enemies       = [];
  let flyingEnemies = [];
  let door          = { x: 0, y: FLOOR_Y, visible: false };
  let currentLevel  = 0; // 0-indexed

  // ── Setup for a given level ────────────────────────────────────────────────
  const setup = (levelIdx) => {
    world.width = stage.offsetWidth || 700;
    const pct   = f => Math.floor(world.width * f);
    const cfg   = LEVELS[levelIdx](pct);

    // Mushrooms
    stage.querySelectorAll('.mushroom').forEach(el => el.remove());
    mushrooms = cfg.mushrooms.map(m => ({ ...m, popped: false, el: null }));
    for (const m of mushrooms) {
      const el = document.createElement('div');
      el.className    = 'mushroom';
      el.style.left   = `${m.x}px`;
      el.style.bottom = `${m.y}px`;
      stage.appendChild(el);
      m.el = el;
    }

    // Ground enemies
    stage.querySelectorAll('.enemy').forEach(el => el.remove());
    enemies = cfg.enemies.map(e => ({ ...e, alive: true, el: null }));
    for (const en of enemies) {
      const el = document.createElement('div');
      el.className = 'enemy';
      stage.appendChild(el);
      en.el = el;
    }

    // Flying enemies
    stage.querySelectorAll('.flying-enemy').forEach(el => el.remove());
    flyingEnemies = cfg.flying.map(fe => ({ ...fe, alive: true, el: null }));
    for (const fe of flyingEnemies) {
      const el = document.createElement('div');
      el.className = 'flying-enemy';
      stage.appendChild(el);
      fe.el = el;
    }

    // Door
    door.x = world.width - pct(0.12);
    door.y = FLOOR_Y;
    door.visible = false;
    doorEl.classList.remove('visible');
    doorEl.style.left   = `${door.x}px`;
    doorEl.style.bottom = `${door.y}px`;
  };

  // ── Player state ───────────────────────────────────────────────────────────
  const state = {
    running: true, won: false,
    x: 40, y: FLOOR_Y,
    vx: 0, vy: 0,
    onGround: true, facing: 1,
    superFrames: 0, // >0 = super mode active
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const playerRect  = ()   => ({ x: state.x, y: state.y, w: HIT_W, h: HIT_H });
  const enemyRect   = (en) => ({ x: en.x, y: en.y, w: ENEMY_W, h: ENEMY_H });
  const rectsOverlap = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  const landOnMushroom = (m) => {
    if (m.popped || state.vy > 0) return false;
    const p = playerRect(), top = m.y + m.h;
    return p.x + p.w > m.x && p.x < m.x + m.w
      && p.y <= top + 2 && p.y >= top - Math.abs(state.vy) - 4;
  };

  const isStomping = (rect) => {
    if (state.vy > 0) return false;
    const p = playerRect(), top = rect.y + rect.h;
    return p.x + p.w > rect.x && p.x < rect.x + rect.w
      && p.y <= top + 2 && p.y >= top - Math.abs(state.vy) - 4;
  };

  // ── Draw ───────────────────────────────────────────────────────────────────
  const draw = () => {
    player.style.left      = `${state.x - PLR_OFF_X}px`;
    player.style.bottom    = `${state.y}px`;
    player.style.transform = `scaleX(${state.facing})`;
    for (const en of enemies) {
      if (!en.alive) continue;
      en.el.style.left      = `${en.x}px`;
      en.el.style.bottom    = `${en.y}px`;
      en.el.style.transform = `scaleX(${en.vx > 0 ? -1 : 1})`;
    }
    for (const fe of flyingEnemies) {
      if (!fe.alive) continue;
      fe.el.style.left      = `${fe.x}px`;
      fe.el.style.bottom    = `${fe.y}px`;
      fe.el.style.transform = `scaleX(${fe.vx > 0 ? -1 : 1})`;
    }
  };

  // ── Next level / reset ─────────────────────────────────────────────────────
  const startLevel = (levelIdx) => {
    currentLevel = levelIdx;
    setup(levelIdx);
    state.running = true;
    state.won     = false;
    state.x = 40; state.y = FLOOR_Y;
    state.vx = 0; state.vy = 0;
    state.onGround = true; state.facing = 1;
    state.superFrames = 0;
    player.classList.remove('super-mode');
    screen.classList.remove('game-won');
    status.textContent = `שלב ${levelIdx + 1} — קפצו על הפטריות!`;
    draw();
  };

  const reset = () => startLevel(0);

  // ── Input ──────────────────────────────────────────────────────────────────
  const jump       = () => { if (!state.running || !state.onGround) return; state.vy = JUMP_F; state.onGround = false; };
  const activateSuper = () => { if (!state.running) return; state.superFrames = SUPER_FRAMES; player.classList.add('super-mode'); };
  const moveLeft  = () => { if (!state.running) return; state.vx = -MOVE_SPD; state.facing = -1; };
  const moveRight = () => { if (!state.running) return; state.vx =  MOVE_SPD; state.facing =  1; };
  const stopH     = (dir) => {
    if (dir === 'left'  && state.vx < 0) state.vx = 0;
    if (dir === 'right' && state.vx > 0) state.vx = 0;
  };

  const handleKeyDown = (e) => {
    if (!screen.classList.contains('active') || e.repeat) return;
    if (e.key === 'ArrowLeft')  moveLeft();
    if (e.key === 'ArrowRight') moveRight();
    if (e.key === 'ArrowUp')    activateSuper();
    if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); jump(); }
  };
  const handleKeyUp = (e) => {
    if (e.key === 'ArrowLeft')  stopH('left');
    if (e.key === 'ArrowRight') stopH('right');
  };

  // ── Update loop ────────────────────────────────────────────────────────────
  const update = () => {
    if (!state.running) { draw(); return requestAnimationFrame(update); }

    state.x  = GameUtils.clamp(state.x + state.vx, 0, world.width - HIT_W);
    state.vy += GRAVITY;
    state.y  += state.vy;

    // Mushroom bounces
    let bounced = false;
    for (const m of mushrooms) {
      if (landOnMushroom(m)) {
        state.y = m.y + m.h;
        state.vy = BOUNCE_F;
        state.onGround = false;
        m.popped = true; m.el.classList.add('popped');
        bounced = true;
        const left = mushrooms.filter(x => !x.popped).length;
        if (left > 0) status.textContent = `נשארו עוד ${left} פטריות!`;
        break;
      }
    }

    // Super power timer
    if (state.superFrames > 0) {
      state.superFrames--;
      if (state.superFrames === 0) player.classList.remove('super-mode');
    }

    // Floor
    if (!bounced && state.y <= FLOOR_Y) {
      state.y = FLOOR_Y; state.vy = 0; state.onGround = true;
    }

    // Move enemies
    for (const en of enemies) {
      if (!en.alive) continue;
      en.x += en.vx;
      if (en.x <= 0 || en.x >= world.width - ENEMY_W) en.vx *= -1;
    }
    for (const fe of flyingEnemies) {
      if (!fe.alive) continue;
      fe.x += fe.vx;
      if (fe.x <= 0 || fe.x >= world.width - FLY_W) fe.vx *= -1;
    }

    // Collisions
    const p = playerRect();

    for (const en of enemies) {
      if (!en.alive) continue;
      if (isStomping(enemyRect(en))) {
        en.alive = false; en.el.classList.add('stomped');
        state.vy = STOMP_F; state.onGround = false;
      } else if (!state.superFrames && rectsOverlap(p, enemyRect(en))) {
        state.running = false; state.vx = 0;
        status.textContent = 'אוי! נגעתם באויב. לחצו התחלה מחדש.';
      }
    }

    for (const fe of flyingEnemies) {
      if (!fe.alive) continue;
      const r = { x: fe.x, y: fe.y, w: FLY_W, h: FLY_H };
      if (isStomping(r)) {
        fe.alive = false; fe.el.classList.add('stomped');
        state.vy = STOMP_F; state.onGround = false;
      } else if (!state.superFrames && rectsOverlap(p, r)) {
        state.running = false; state.vx = 0;
        status.textContent = 'אוי! נגעתם בציפור. לחצו התחלה מחדש.';
      }
    }

    // Show door when all mushrooms collected
    if (!door.visible && mushrooms.every(m => m.popped)) {
      door.visible = true;
      doorEl.classList.add('visible');
      status.textContent = '✨ כל הפטריות! לכו לדלת!';
    }

    // Enter door → next level or final win
    if (door.visible && !state.won) {
      const doorRect = { x: door.x, y: door.y, w: DOOR_W, h: DOOR_H };
      if (rectsOverlap(p, doorRect)) {
        const nextLevel = currentLevel + 1;
        if (nextLevel < LEVELS.length) {
          startLevel(nextLevel);
          return requestAnimationFrame(update);
        } else {
          state.won = true; state.running = false; state.vx = 0;
          status.textContent = '🏆 כל הכבוד! עברתם את כל השלבים!';
          screen.classList.add('game-won');
        }
      }
    }

    draw();
    requestAnimationFrame(update);
  };

  // ── Init ───────────────────────────────────────────────────────────────────
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup',   handleKeyUp);
  restartBtn.addEventListener('click', () => { restartBtn.blur(); reset(); });

  requestAnimationFrame(() => { reset(); requestAnimationFrame(update); });
})();
