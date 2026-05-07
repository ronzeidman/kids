(() => {
  const screen     = document.getElementById('hero-key-screen');
  if (!screen) return;

  const stage      = screen.querySelector('.hk-stage');
  const statusEl   = screen.querySelector('.hk-status');
  const overlay    = screen.querySelector('.hk-powerup-overlay');
  const restartBtn = document.getElementById('hk-restart');

  // ── Constants ──────────────────────────────────────────────────────────
  const FLOOR_Y    = 60;
  const GRAVITY    = -0.88;
  const BASE_JUMP  = 16;
  const BASE_SPD   = 5;
  const STOMP_VY   = 14;
  const INV_FRAMES = 90;

  const PLR_W = 58, HIT_W = 28, HIT_H = 50;
  const PLR_OFF_X = (PLR_W - HIT_W) / 2;
  const ENEMY_W = 36, ENEMY_H = 36;
  const FLY_W   = 40, FLY_H   = 32;
  const DOOR_W  = 52, DOOR_H  = 80;
  const KEY_W   = 26, KEY_H   = 26;

  // ── Power-ups ──────────────────────────────────────────────────────────
  const POWERUPS = [
    { id: 'speed',  icon: '⚡', name: 'מהירות', desc: 'רצים מהר יותר!',    color: '#FFD700', bg: '#2a2000', cls: 'pu-speed'  },
    { id: 'jump',   icon: '🦅', name: 'קפיצה',  desc: 'קופצים גבוה יותר!', color: '#00DDFF', bg: '#002030', cls: 'pu-jump'   },
    { id: 'shield', icon: '🛡️', name: 'מגן',    desc: 'פגיעה אחת בחינם!', color: '#FF88FF', bg: '#200030', cls: 'pu-shield' },
  ];

  // ── Levels ─────────────────────────────────────────────────────────────
  const LEVELS = [
    {
      label: 'שלב 1',
      platforms: [
        { x: 90,  y: 100, w: 110, h: 16 },
        { x: 280, y: 172, w: 130, h: 16 },  // key here
        { x: 440, y: 120, w: 100, h: 16 },
        { x: 565, y: 88,  w: 85,  h: 16 },
      ],
      keyPos:  { x: 316, y: 172 + 16 },
      doorPos: { x: 618, y: FLOOR_Y },
      enemies: [
        { x: 170, y: FLOOR_Y, vx: -2.2 },
        { x: 470, y: FLOOR_Y, vx:  2.6 },
      ],
      flyers: [
        { x: 260, baseY: 210, vx: -2.8, phase: 0 },
        { x: 490, baseY: 250, vx:  2.3, phase: Math.PI },
      ],
    },
    {
      label: 'שלב 2',
      platforms: [
        { x: 60,  y: 95,  w: 80,  h: 16 },
        { x: 185, y: 145, w: 80,  h: 16 },
        { x: 318, y: 205, w: 95,  h: 16 },  // key here — higher!
        { x: 458, y: 150, w: 80,  h: 16 },
        { x: 568, y: 102, w: 80,  h: 16 },
      ],
      keyPos:  { x: 348, y: 205 + 16 },
      doorPos: { x: 618, y: FLOOR_Y },
      enemies: [
        { x: 140, y: FLOOR_Y, vx: -3.0 },
        { x: 360, y: FLOOR_Y, vx:  3.2 },
        { x: 530, y: FLOOR_Y, vx: -2.8 },
      ],
      flyers: [
        { x: 200, baseY: 190, vx: -3.2, phase: 0 },
        { x: 400, baseY: 255, vx:  2.8, phase: 1.1 },
        { x: 540, baseY: 215, vx: -2.5, phase: 2.2 },
      ],
    },
    {
      label: 'שלב 3',
      platforms: [
        { x: 50,  y: 90,  w: 70,  h: 16 },
        { x: 165, y: 155, w: 70,  h: 16 },
        { x: 285, y: 220, w: 70,  h: 16 },  // key here — very high!
        { x: 405, y: 155, w: 70,  h: 16 },
        { x: 510, y: 210, w: 60,  h: 16 },
        { x: 580, y: 115, w: 70,  h: 16 },
      ],
      keyPos:  { x: 308, y: 220 + 16 },
      doorPos: { x: 618, y: FLOOR_Y },
      enemies: [
        { x: 120, y: FLOOR_Y, vx: -3.4 },
        { x: 310, y: FLOOR_Y, vx:  3.6 },
        { x: 490, y: FLOOR_Y, vx: -3.2 },
      ],
      flyers: [
        { x: 180, baseY: 180, vx: -3.6, phase: 0 },
        { x: 350, baseY: 250, vx:  3.2, phase: 1.0 },
        { x: 490, baseY: 200, vx: -3.0, phase: 2.0 },
        { x: 580, baseY: 240, vx:  2.8, phase: 0.5 },
      ],
    },
    {
      label: 'שלב 4',
      platforms: [
        { x: 55,  y: 88,  w: 75,  h: 16 },
        { x: 175, y: 160, w: 75,  h: 16 },
        { x: 300, y: 222, w: 85,  h: 16 },  // key here — very high
        { x: 432, y: 160, w: 70,  h: 16 },
        { x: 548, y: 105, w: 75,  h: 16 },
      ],
      keyPos:  { x: 330, y: 222 + 16 },
      doorPos: { x: 618, y: FLOOR_Y },
      enemies: [
        { x: 120, y: FLOOR_Y, vx: -3.8 },
        { x: 320, y: FLOOR_Y, vx:  4.0 },
        { x: 510, y: FLOOR_Y, vx: -3.6 },
      ],
      flyers: [
        { x: 210, baseY: 205, vx: -3.0, phase: 0,        type: 'dragon', fireDelay: 60  },
        { x: 460, baseY: 245, vx:  2.8, phase: Math.PI,  type: 'dragon', fireDelay: 135 },
      ],
    },
  ];

  // ── Runtime state ─────────────────────────────────────────────────────
  let currentLevel = 0;
  let chosenPU     = null;
  let shieldUsed   = false;
  let running      = false;
  let won          = false;
  let frame        = 0;

  let state     = {};
  let playerEl  = null;
  let keyObj    = {};
  let doorObj   = {};
  let enemies   = [];
  let flyers    = [];
  let fireballs = [];
  let platforms = [];

  const FIRE_W = 22, FIRE_H = 22, FIRE_SPD = 6, FIRE_CD = 150;

  const keys = { left: false, right: false };

  // ── Helpers ────────────────────────────────────────────────────────────
  const playerRect   = () => ({ x: state.x, y: state.y, w: HIT_W, h: HIT_H });
  const rectsOverlap = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  const isStomping = (rect) => {
    if (state.vy > 0) return false;
    const p = playerRect(), top = rect.y + rect.h;
    return p.x + p.w > rect.x && p.x < rect.x + rect.w
        && p.y <= top + 5 && p.y >= top - Math.abs(state.vy) - 7;
  };

  const landsOn = (thing) => {
    if (state.vy > 0) return false;
    const p = playerRect(), top = thing.y + thing.h;
    return p.x + p.w > thing.x && p.x < thing.x + thing.w
        && p.y <= top + 5 && p.y >= top - Math.abs(state.vy) - 5;
  };

  const getSpeed = () => chosenPU === 'speed' ? BASE_SPD * 1.65 : BASE_SPD;
  const getJump  = () => chosenPU === 'jump'  ? BASE_JUMP * 1.5  : BASE_JUMP;

  // ── Create player DOM ─────────────────────────────────────────────────
  const createPlayer = () => {
    playerEl?.remove();
    playerEl = document.createElement('div');
    playerEl.className = 'hk-player';
    playerEl.innerHTML = `<div class="hk-player-img"></div>`;
    if (chosenPU) {
      const pu = POWERUPS.find(p => p.id === chosenPU);
      playerEl.classList.add(pu.cls);
      if (chosenPU === 'shield') playerEl.classList.add('shielded');
    }
    stage.appendChild(playerEl);
  };

  // ── Start a level ─────────────────────────────────────────────────────
  const startGame = () => {
    running    = false;
    won        = false;
    frame      = 0;
    shieldUsed = false;
    screen.classList.remove('game-won');

    for (const fb of fireballs) fb.el.remove();
    fireballs = [];
    stage.querySelectorAll(
      '.hk-platform, .hk-key, .hk-door, .hk-enemy, .hk-flyer, .hk-fireball'
    ).forEach(e => e.remove());

    const lvl = LEVELS[currentLevel];

    platforms = lvl.platforms.map(p => {
      const el = document.createElement('div');
      el.className = 'hk-platform';
      el.style.left   = `${p.x}px`;
      el.style.bottom = `${p.y}px`;
      el.style.width  = `${p.w}px`;
      stage.appendChild(el);
      return { ...p, el };
    });

    const keyEl = document.createElement('div');
    keyEl.className = 'hk-key';
    keyEl.textContent = '🔑';
    keyEl.style.left   = `${lvl.keyPos.x}px`;
    keyEl.style.bottom = `${lvl.keyPos.y}px`;
    stage.appendChild(keyEl);
    keyObj = { x: lvl.keyPos.x, y: lvl.keyPos.y, w: KEY_W, h: KEY_H, collected: false, el: keyEl };

    const doorEl = document.createElement('div');
    doorEl.className = 'hk-door locked';
    doorEl.textContent = '🔒';
    doorEl.style.left   = `${lvl.doorPos.x}px`;
    doorEl.style.bottom = `${lvl.doorPos.y}px`;
    stage.appendChild(doorEl);
    doorObj = { x: lvl.doorPos.x, y: lvl.doorPos.y, w: DOOR_W, h: DOOR_H, el: doorEl };

    enemies = lvl.enemies.map(def => {
      const el = document.createElement('div');
      el.className = 'hk-enemy';
      stage.appendChild(el);
      return { ...def, alive: true, el };
    });

    flyers = lvl.flyers.map(def => {
      const isDragon = def.type === 'dragon';
      const el = document.createElement('div');
      el.className = isDragon ? 'hk-flyer hk-dragon' : 'hk-flyer';
      const imgEl = document.createElement('div');
      imgEl.className = 'hk-fimg';
      el.appendChild(imgEl);
      stage.appendChild(el);
      return { x: def.x, y: def.baseY, baseY: def.baseY, vx: def.vx, phase: def.phase,
               type: def.type || 'bat', fireTimer: def.fireDelay || 0, alive: true, el, imgEl };
    });

    createPlayer();

    state = { x: 40, y: FLOOR_Y, vx: 0, vy: 0, onGround: true, facing: 1, hasKey: false, invFrames: 0 };
    keys.left = false;
    keys.right = false;

    draw();
    running = true;
    statusEl.textContent = `${lvl.label} — מצאו את המפתח 🔑 ואז לכו לדלת!`;
  };

  // ── Draw ───────────────────────────────────────────────────────────────
  const draw = () => {
    if (!playerEl) return;
    playerEl.style.left      = `${state.x - PLR_OFF_X}px`;
    playerEl.style.bottom    = `${state.y}px`;
    playerEl.style.transform = `scaleX(${state.facing})`;
    playerEl.classList.toggle('walking', Math.abs(state.vx) > 0.5 && state.onGround);
    playerEl.style.opacity = (state.invFrames > 0 && Math.floor(state.invFrames / 5) % 2 === 0) ? '0.3' : '1';

    for (const en of enemies) {
      if (!en.alive) continue;
      en.el.style.left      = `${en.x}px`;
      en.el.style.bottom    = `${en.y}px`;
      en.el.style.transform = `scaleX(${en.vx > 0 ? -1 : 1})`;
    }
    for (const fe of flyers) {
      if (!fe.alive) continue;
      fe.el.style.left   = `${fe.x}px`;
      fe.el.style.bottom = `${fe.y}px`;
      // scaleX on inner img so CSS flap/hover animation isn't overridden
      if (fe.imgEl) fe.imgEl.style.transform = `scaleX(${fe.vx > 0 ? -1 : 1})`;
    }
  };

  // ── Update loop ────────────────────────────────────────────────────────
  const update = () => {
    requestAnimationFrame(update);
    if (!running || won) return;

    frame++;
    const stageW = stage.offsetWidth || 700;
    const stageH = stage.offsetHeight || 400;

    if (keys.left)       { state.vx = -getSpeed(); state.facing = -1; }
    else if (keys.right) { state.vx =  getSpeed(); state.facing =  1; }
    else                   state.vx = 0;

    state.x = Math.max(0, Math.min(state.x + state.vx, stageW - HIT_W));
    state.vy += GRAVITY;
    state.y  += state.vy;

    if (state.y + HIT_H > stageH - 10) { state.y = stageH - 10 - HIT_H; state.vy = 0; }

    state.onGround = false;
    for (const plat of platforms) {
      if (landsOn(plat)) { state.y = plat.y + plat.h; state.vy = 0; state.onGround = true; break; }
    }
    if (state.y <= FLOOR_Y) { state.y = FLOOR_Y; state.vy = 0; state.onGround = true; }
    if (state.y < -100)     { state.y = FLOOR_Y; state.vy = 0; state.onGround = true; }

    for (const en of enemies) {
      if (!en.alive) continue;
      en.x += en.vx;
      if (en.x <= 0 || en.x >= stageW - ENEMY_W) en.vx *= -1;
    }
    for (const fe of flyers) {
      if (!fe.alive) continue;
      fe.x += fe.vx;
      if (fe.x <= 0 || fe.x >= stageW - FLY_W) fe.vx *= -1;
      fe.y = fe.baseY + Math.sin(frame * 0.055 + fe.phase) * 28;

      // Dragon fire
      if (fe.type === 'dragon') {
        fe.fireTimer--;
        if (fe.fireTimer <= 0) {
          fe.fireTimer = FIRE_CD;
          const fireEl = document.createElement('div');
          fireEl.className = 'hk-fireball';
          fireEl.textContent = '🔥';
          stage.appendChild(fireEl);
          const fvx = fe.vx > 0 ? FIRE_SPD : -FIRE_SPD;
          fireballs.push({ x: fe.x + FLY_W / 2, y: fe.y + FLY_H / 2 - FIRE_H / 2, vx: fvx, el: fireEl });
        }
      }
    }

    // Move fireballs
    const aliveFire = [];
    for (const fb of fireballs) {
      fb.x += fb.vx;
      fb.el.style.left   = `${fb.x}px`;
      fb.el.style.bottom = `${fb.y}px`;
      if (fb.x > -40 && fb.x < stageW + 40) { aliveFire.push(fb); }
      else fb.el.remove();
    }
    fireballs = aliveFire;

    if (state.invFrames > 0) state.invFrames--;

    const p = playerRect();

    // Key
    if (!keyObj.collected && rectsOverlap(p, keyObj)) {
      keyObj.collected = true;
      keyObj.el.style.display = 'none';
      state.hasKey = true;
      doorObj.el.classList.replace('locked', 'unlocked');
      doorObj.el.textContent = '🚪';
      statusEl.textContent = '🔑 יש מפתח! עכשיו לכו לדלת הירוקה!';
    }

    // Ground enemies
    for (const en of enemies) {
      if (!en.alive) continue;
      const er = { x: en.x, y: en.y, w: ENEMY_W, h: ENEMY_H };
      if (isStomping(er)) {
        en.alive = false; en.el.classList.add('stomped');
        state.vy = STOMP_VY; state.onGround = false;
      } else if (rectsOverlap(p, er) && state.invFrames === 0) { handleHit(); return; }
    }

    // Flying enemies
    for (const fe of flyers) {
      if (!fe.alive) continue;
      const fr = { x: fe.x, y: fe.y, w: FLY_W, h: FLY_H };
      if (isStomping(fr)) {
        fe.alive = false; fe.el.classList.add('stomped');
        state.vy = STOMP_VY; state.onGround = false;
      } else if (rectsOverlap(p, fr) && state.invFrames === 0) { handleHit(); return; }
    }

    // Fireballs
    for (const fb of fireballs) {
      if (rectsOverlap(p, { x: fb.x, y: fb.y, w: FIRE_W, h: FIRE_H }) && state.invFrames === 0) {
        fb.el.remove();
        fireballs = fireballs.filter(f => f !== fb);
        handleHit(); return;
      }
    }

    // Door
    if (state.hasKey && rectsOverlap(p, doorObj)) { triggerWin(); return; }

    draw();
  };

  // ── Hit / win ──────────────────────────────────────────────────────────
  const handleHit = () => {
    if (chosenPU === 'shield' && !shieldUsed) {
      shieldUsed = true;
      playerEl.classList.remove('shielded');
      state.invFrames = INV_FRAMES;
      statusEl.textContent = '🛡️ המגן הציל אתכם! עכשיו בזהירות!';
      draw();
      return;
    }
    running = false;
    keys.left = keys.right = false;
    state.vx = 0;
    draw();
    statusEl.textContent = '💀 אוי! נגעתם באויב. לחצו התחלה מחדש.';
  };

  const triggerWin = () => {
    won = true;
    running = false;
    state.vx = 0;
    draw();

    const nextIdx = currentLevel + 1;
    if (nextIdx < LEVELS.length) {
      statusEl.textContent = `🎉 כל הכבוד! עוברים לשלב הבא...`;
      screen.classList.add('game-won');
      setTimeout(() => {
        screen.classList.remove('game-won');
        currentLevel = nextIdx;
        chosenPU = null;
        showOverlay(`🎉 ${LEVELS[nextIdx].label}! בחרו כוח חדש!`);
      }, 1400);
    } else {
      statusEl.textContent = '🏆🏆 ניצחתם את כל השלבים! אלופים אמיתיים!';
      screen.classList.add('game-won');
    }
  };

  // ── Input ──────────────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (!screen.classList.contains('active')) return;
    if (e.key === 'ArrowLeft')  keys.left  = true;
    if (e.key === 'ArrowRight') keys.right = true;
    if ((e.key === ' ' || e.key === 'ArrowUp') && state.onGround && running) {
      e.preventDefault();
      state.vy = getJump();
      state.onGround = false;
    }
  };

  const handleKeyUp = (e) => {
    if (e.key === 'ArrowLeft')  keys.left  = false;
    if (e.key === 'ArrowRight') keys.right = false;
  };

  // ── Power-up overlay ───────────────────────────────────────────────────
  const showOverlay = (title = 'בחרו כוח מיוחד!') => {
    overlay.innerHTML = `
      <p class="pu-title">${title}</p>
      <p class="pu-sub">בחרו כוח אחד שיעזור לכם לעבור את השלב</p>
      <div class="hk-pu-btns">
        ${POWERUPS.map(pu => `
          <button class="hk-pu-btn" data-pu="${pu.id}"
            style="background:${pu.bg}; color:${pu.color}; border-color:${pu.color}">
            <span class="pu-icon">${pu.icon}</span>
            <span class="pu-name">${pu.name}</span>
            <span class="pu-desc">${pu.desc}</span>
          </button>
        `).join('')}
      </div>
    `;
    overlay.style.display = 'flex';

    overlay.querySelectorAll('.hk-pu-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        chosenPU = btn.dataset.pu;
        overlay.style.display = 'none';
        startGame();
      });
    });
  };

  // ── Init ───────────────────────────────────────────────────────────────
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup',   handleKeyUp);

  restartBtn?.addEventListener('click', () => {
    currentLevel = 0;
    chosenPU = null;
    screen.classList.remove('game-won');
    showOverlay();
  });

  const observer = new MutationObserver(() => {
    if (screen.classList.contains('active') && overlay.style.display !== 'flex' && !running && !won) {
      showOverlay();
    }
  });
  observer.observe(screen, { attributes: true, attributeFilter: ['class'] });

  if (screen.classList.contains('active')) showOverlay();

  requestAnimationFrame(update);
})();
