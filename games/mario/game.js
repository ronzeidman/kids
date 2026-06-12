(() => {
  const canvas = document.getElementById('mario-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 480, H = 288, TS = 32;

  /* ── audio ── */
  let ac;
  const tone = (f, type, dur, vol, sweep) => {
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.type = type; o.frequency.value = f;
      if (sweep) o.frequency.exponentialRampToValueAtTime(sweep, ac.currentTime + dur * 0.6);
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      o.start(); o.stop(ac.currentTime + dur);
    } catch (_) {}
  };
  const SFX = {
    jump:   () => tone(500, 'square', 0.13, 0.12, 900),
    coin:   () => { tone(660, 'sine', 0.08, 0.12); setTimeout(() => tone(880, 'sine', 0.1, 0.12), 80); },
    stomp:  () => tone(200, 'square', 0.1, 0.15, 80),
    block:  () => tone(220, 'sine', 0.09, 0.1),
    grow:   () => [300, 400, 600, 800].forEach((f, i) => setTimeout(() => tone(f, 'sine', 0.1, 0.1), i * 70)),
    shrink: () => [400, 280, 180].forEach((f, i) => setTimeout(() => tone(f, 'sawtooth', 0.1, 0.1), i * 60)),
    die:    () => [350, 280, 180, 100].forEach((f, i) => setTimeout(() => tone(f, 'sawtooth', 0.15, 0.1), i * 80)),
    win:    () => [330, 392, 523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 'sine', 0.2, 0.15), i * 110)),
    brick:  () => tone(180, 'square', 0.08, 0.12),
  };

  /* ── level data ── */
  // ' '=air  'X'=ground  'B'=brick  '?'=?coin  'M'=?mushroom  'Q'=used-block
  // 'T'=pipe-top  'P'=pipe-body  '|'=pole  'F'=flag  'G'=goomba  'K'=koopa
  const RAW = [
    [ // 1-1
      "                                                                                              ",
      "                                                                                         |    ",
      "                                                                                         |    ",
      "       ?  ?M?                   B?B                              G             G        F|    ",
      "                   G       G               G    G     G                                  |    ",
      "   G                                                        B?B                          |    ",
      "XXXXXXXXXXXXXX    XXXXXXXXXXXXXXXXXX    XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX    XXXXXXXXXXXX      ",
      "XXXXXXXXXXXXXX    XXXXXXXXXXXXXXXXXX    XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX    XXXXXXXXXXXX      ",
      "XXXXXXXXXXXXXX    XXXXXXXXXXXXXXXXXX    XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX    XXXXXXXXXXXX      ",
    ],
    [ // 1-2
      "                                                                                                  ",
      "                                                                                             |    ",
      "                                                                                             |    ",
      "  B?B ?M? B         B?B    M?                B?B?B?B                  G          G        F|    ",
      "             G  G G             G   G                    G   G   G                          |    ",
      "  G                        B?B                                            B?B               |    ",
      "XXXXXXXXXXX    XXXXXXXXXXXXXXXXXXXXXXXX    XXXXXXXXXXX    XXXXXXXXXXXXXXXXXXXXXXXXX    XXXXXXX    ",
      "XXXXXXXXXXX    XXXXXXXXXXXXXXXXXXXXXXXX    XXXXXXXXXXX    XXXXXXXXXXXXXXXXXXXXXXXXX    XXXXXXX    ",
      "XXXXXXXXXXX    XXXXXXXXXXXXXXXXXXXXXXXX    XXXXXXXXXXX    XXXXXXXXXXXXXXXXXXXXXXXXX    XXXXXXX    ",
    ],
    [ // 1-3
      "                                                                                                    ",
      "                                                                                               |    ",
      "                                                                                               |    ",
      " B?B M?B  B?B   B?B     M?             B?B?B?B         M?M?M              B?B?B?B?B          F|    ",
      "               G   G  G    G   G G  G            G G             G G G G                G G   |    ",
      "  G  G                               B                      B                                  |    ",
      "XXXXXXXXXX  XXXXXXXXXXXXXXXXXX  XXXXXXXXXXXXXXXXXX  XXXXXXXXXXXXXXXXXX  XXXXXXXXXXXXXXXXXXXXXXXXX    ",
      "XXXXXXXXXX  XXXXXXXXXXXXXXXXXX  XXXXXXXXXXXXXXXXXX  XXXXXXXXXXXXXXXXXX  XXXXXXXXXXXXXXXXXXXXXXXXX    ",
      "XXXXXXXXXX  XXXXXXXXXXXXXXXXXX  XXXXXXXXXXXXXXXXXX  XXXXXXXXXXXXXXXXXX  XXXXXXXXXXXXXXXXXXXXXXXXX    ",
    ],
    [ // 1-4  (harder)
      "                                                                                                          ",
      "                                                                                                     |    ",
      "                                                                                                     |    ",
      " M?  B?B  M?  B?B  M?    B?B?B      M?M          B?B?B?B?B             M?M?M?M              B     F|    ",
      "              G  G    G G      G  G      G G G              G  G  G  G              G  G  G         |    ",
      "  G  G  G                             B                              B                               |    ",
      "XXXXXXXXX  XXXXXXXXXXXXXXXXXXXXXXXXX  XXXXXXXXXXXXXXXXXXXXXXX  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  ",
      "XXXXXXXXX  XXXXXXXXXXXXXXXXXXXXXXXXX  XXXXXXXXXXXXXXXXXXXXXXX  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  ",
      "XXXXXXXXX  XXXXXXXXXXXXXXXXXXXXXXXXX  XXXXXXXXXXXXXXXXXXXXXXX  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  ",
    ],
  ];

  /* ── parse level ── */
  const parseLevel = raw => {
    const LCOLS = Math.max(...raw.map(r => r.length));
    const tiles = raw.map(row => {
      const arr = row.split('');
      while (arr.length < LCOLS) arr.push(' ');
      return arr;
    });
    const goombas = [], koopas = [];
    let poleCol = -1;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < LCOLS; c++) {
        const ch = tiles[r][c];
        if (ch === 'G') { goombas.push({ x: c * TS, y: r * TS, w: 28, h: 26, vx: -1.2, vy: 0, onGround: false, dead: false, deadTimer: 0 }); tiles[r][c] = ' '; }
        if (ch === 'K') { koopas.push({ x: c * TS, y: r * TS, w: 28, h: 30, vx: -1.0, vy: 0, onGround: false, dead: false, shell: false, shellVx: 0, deadTimer: 0 }); tiles[r][c] = ' '; }
        if (ch === 'F' || ch === '|') poleCol = Math.max(poleCol, c);
      }
    }
    return { tiles, LCOLS, goombas, koopas, poleCol };
  };

  /* ── solid tile set ── */
  const SOLID = new Set(['X', 'B', '?', 'M', 'Q', 'T', 'P']);
  const isSolid = ch => SOLID.has(ch);
  const getTile = (r, c) => (r >= 0 && r < 9 && c >= 0 && c < parsed.LCOLS) ? parsed.tiles[r][c] : (r >= 9 ? 'X' : ' ');

  /* ── state ── */
  let lvIdx, parsed, player, goombas, koopas, mushrooms, shells, popups, camX;
  let score = 0, lives = 3, gameState = 'play', stateTimer = 0, coins = 0;

  const PW_S = 18, PH_S = 26, PW_B = 20, PH_B = 44;

  const mkPlayer = () => ({
    x: 2 * TS + 4, y: 0, vx: 0, vy: 0,
    onGround: false, facing: 1, big: false, inv: 0, jumpHeld: false,
  });

  const startLevel = idx => {
    lvIdx    = idx % RAW.length;
    parsed   = parseLevel(RAW[lvIdx]);
    player   = mkPlayer();
    // place player on ground
    player.y = 5 * TS;
    goombas  = parsed.goombas.map(g => ({ ...g }));
    koopas   = parsed.koopas.map(k => ({ ...k }));
    mushrooms = []; shells = []; popups = [];
    camX     = 0;
    gameState = 'play'; stateTimer = 0;
  };

  /* ── input ── */
  const keys = { left: false, right: false, run: false, jump: false };
  let jumpPressed = false;

  document.addEventListener('keydown', e => {
    if (!active()) return;
    if (e.key === 'ArrowLeft')  keys.left  = true;
    if (e.key === 'ArrowRight') keys.right = true;
    if (e.key === 'Shift' || e.key === 'x' || e.key === 'X') keys.run = true;
    if ((e.key === 'ArrowUp' || e.key === ' ' || e.key === 'z' || e.key === 'Z') && !keys.jump) {
      keys.jump = true; jumpPressed = true; e.preventDefault();
    }
    if (gameState === 'gameover' && stateTimer > 60) { score = 0; coins = 0; lives = 3; startLevel(0); }
    if (['ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
  });
  document.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft')  keys.left  = false;
    if (e.key === 'ArrowRight') keys.right = false;
    if (e.key === 'Shift' || e.key === 'x' || e.key === 'X') keys.run = false;
    if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'z' || e.key === 'Z') keys.jump = false;
  });

  [['mario-btn-left','left'],['mario-btn-right','right'],
   ['mario-btn-run','run'],['mario-btn-jump','jump']].forEach(([id, k]) => {
    const el = document.getElementById(id); if (!el) return;
    el.addEventListener('pointerdown', e => { e.preventDefault(); keys[k] = true; if (k === 'jump') jumpPressed = true; });
    ['pointerup','pointerleave'].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); keys[k] = false; }));
  });

  const active = () => document.getElementById('mario-screen')?.classList.contains('active');

  /* ── tile collision helpers ── */
  const moveX = (e, w, h) => {
    e.x += e.vx;
    if (e.vx > 0) {
      const r1 = Math.floor((e.y + 2) / TS), r2 = Math.floor((e.y + h - 3) / TS);
      const c  = Math.floor((e.x + w) / TS);
      if (isSolid(getTile(r1, c)) || isSolid(getTile(r2, c))) { e.x = c * TS - w; e.vx = 0; }
    } else if (e.vx < 0) {
      const r1 = Math.floor((e.y + 2) / TS), r2 = Math.floor((e.y + h - 3) / TS);
      const c  = Math.floor(e.x / TS);
      if (isSolid(getTile(r1, c)) || isSolid(getTile(r2, c))) { e.x = (c + 1) * TS; e.vx = 0; }
    }
    e.x = Math.max(0, Math.min(parsed.LCOLS * TS - w, e.x));
  };

  const moveY = (e, w, h, isPlayer) => {
    e.y += e.vy;
    e.onGround = false;
    if (e.vy >= 0) {
      const c1 = Math.floor((e.x + 2) / TS), c2 = Math.floor((e.x + w - 3) / TS);
      const r  = Math.floor((e.y + h) / TS);
      if (isSolid(getTile(r, c1)) || isSolid(getTile(r, c2))) {
        e.y = r * TS - h; e.vy = 0; e.onGround = true;
      }
    } else {
      const c1 = Math.floor((e.x + 2) / TS), c2 = Math.floor((e.x + w - 3) / TS);
      const r  = Math.floor(e.y / TS);
      if (isSolid(getTile(r, c1)) || isSolid(getTile(r, c2))) {
        e.y = (r + 1) * TS; e.vy = 0;
        if (isPlayer) hitBlock(r, Math.floor((e.x + w / 2) / TS));
      }
    }
  };

  /* ── hit block from below ── */
  const hitBlock = (r, c) => {
    const ch = getTile(r, c);
    if (ch === '?' || ch === 'M') {
      SFX.block();
      parsed.tiles[r][c] = 'Q';
      if (ch === 'M') {
        mushrooms.push({ x: c * TS + 4, y: (r - 1) * TS, w: 24, h: 24, vx: 1.5, vy: 0, onGround: false });
      } else {
        spawnCoin(c * TS + TS / 2, r * TS);
      }
    } else if (ch === 'B') {
      if (player.big) {
        SFX.brick(); parsed.tiles[r][c] = ' ';
        popups.push({ x: c * TS + TS / 2, y: r * TS, text: '+50', t: 55, vy: -1.5 });
        score += 50;
      } else {
        SFX.block();
      }
    }
  };

  const spawnCoin = (x, y) => {
    SFX.coin(); score += 100; coins++;
    popups.push({ x, y, text: '🪙+100', t: 55, vy: -2 });
  };

  /* ── update ── */
  const GRAVITY = 0.48, JUMP_FORCE = -11.8;

  const update = () => {
    stateTimer++;
    if (gameState === 'win') {
      if (stateTimer > 160) startLevel(lvIdx + 1);
      return;
    }
    if (gameState === 'die') {
      if (stateTimer > 80) {
        if (lives > 0) startLevel(lvIdx);
        else gameState = 'gameover';
      }
      return;
    }
    if (gameState === 'gameover') return;

    const pw = player.big ? PW_B : PW_S;
    const ph = player.big ? PH_B : PH_S;

    /* ---- player movement ---- */
    const spd = keys.run ? 4.8 : 3.2;
    const targetVx = keys.left ? -spd : keys.right ? spd : 0;
    const accel = player.onGround ? 0.25 : 0.12;
    player.vx += (targetVx - player.vx) * accel;
    if (Math.abs(player.vx) < 0.15) player.vx = 0;
    if (keys.left)  player.facing = -1;
    if (keys.right) player.facing =  1;

    /* jump */
    if (jumpPressed && player.onGround) {
      player.vy = JUMP_FORCE - (keys.run ? 0.8 : 0);
      player.jumpHeld = true; SFX.jump();
    }
    jumpPressed = false;
    if (!keys.jump) player.jumpHeld = false;
    if (player.jumpHeld && player.vy < -4) player.vy -= 0.3; // hold for higher jump

    player.vy += GRAVITY;
    moveX(player, pw, ph);
    moveY(player, pw, ph, true);

    if (player.y > H + 40) { die(); return; }
    if (player.inv > 0) player.inv--;

    /* flag pole */
    if (parsed.poleCol >= 0) {
      for (let r = 0; r < 9; r++) {
        const ch = getTile(r, parsed.poleCol);
        if ((ch === '|' || ch === 'F') &&
            player.x + pw > parsed.poleCol * TS + 6 && player.x < (parsed.poleCol + 1) * TS - 6 &&
            player.y + ph > r * TS && player.y < (r + 1) * TS) {
          win(); return;
        }
      }
    }

    /* ---- goombas ---- */
    for (const g of goombas) {
      if (g.dead) { g.deadTimer++; continue; }
      g.vy += GRAVITY;
      const prevVx = g.vx;
      moveX(g, g.w, g.h);
      if (g.vx === 0) g.vx = -prevVx || -1.2;
      moveY(g, g.w, g.h, false);

      if (player.inv > 0) continue;
      if (player.x + pw < g.x + 4 || player.x + 4 > g.x + g.w ||
          player.y + ph < g.y + 4 || player.y + 4 > g.y + g.h) continue;

      const stomp = player.vy > 0 && (player.y + ph - player.vy) <= g.y + 8;
      if (stomp) {
        g.dead = true; g.deadTimer = 0;
        player.vy = keys.jump ? -9 : -6;
        score += 200; SFX.stomp();
        popups.push({ x: g.x + g.w / 2, y: g.y, text: '+200', t: 50, vy: -1.5 });
      } else {
        hurtPlayer();
      }
    }

    /* ---- koopas ---- */
    for (const k of koopas) {
      if (k.dead) { k.deadTimer++; continue; }
      k.vy += GRAVITY;
      if (!k.shell) {
        const prevVx = k.vx;
        moveX(k, k.w, k.h);
        if (k.vx === 0) k.vx = -prevVx || -1.0;
      } else {
        k.vx = k.shellVx;
        moveX(k, k.w, k.h);
        if (k.vx === 0) k.shellVx = -k.shellVx;
      }
      moveY(k, k.w, k.h, false);

      if (player.inv > 0) continue;
      if (player.x + pw < k.x + 4 || player.x + 4 > k.x + k.w ||
          player.y + ph < k.y + 4 || player.y + 4 > k.y + k.h) continue;

      const stomp = player.vy > 0 && (player.y + ph - player.vy) <= k.y + 8;
      if (stomp) {
        if (!k.shell) {
          k.shell = true; k.shellVx = 0; k.vx = 0;
          player.vy = keys.jump ? -9 : -6;
          score += 100; SFX.stomp();
          popups.push({ x: k.x + k.w / 2, y: k.y, text: '+100', t: 50, vy: -1.5 });
        } else {
          // kick the shell
          k.shellVx = player.x < k.x ? 7 : -7;
          player.vy = -6; SFX.stomp();
        }
      } else if (!k.shell || Math.abs(k.shellVx) > 0) {
        hurtPlayer();
      }
    }

    /* shell vs goomba */
    for (const k of koopas) {
      if (!k.shell || Math.abs(k.shellVx) === 0) continue;
      for (const g of goombas) {
        if (g.dead) continue;
        if (k.x < g.x + g.w && k.x + k.w > g.x && k.y < g.y + g.h && k.y + k.h > g.y) {
          g.dead = true; g.deadTimer = 0;
          score += 200; SFX.stomp();
        }
      }
    }

    /* ---- mushrooms ---- */
    for (let i = mushrooms.length - 1; i >= 0; i--) {
      const m = mushrooms[i];
      m.vy += GRAVITY;
      const prevVx = m.vx;
      moveX(m, m.w, m.h);
      if (m.vx === 0) m.vx = -prevVx || 1.5;
      moveY(m, m.w, m.h, false);
      if (player.x + pw > m.x && player.x < m.x + m.w && player.y + ph > m.y && player.y < m.y + m.h) {
        player.big = true; score += 500; SFX.grow();
        popups.push({ x: m.x + m.w / 2, y: m.y, text: '+500 🍄', t: 60, vy: -1.5 });
        mushrooms.splice(i, 1);
      }
    }

    /* ---- popups ---- */
    for (const p of popups) { p.y += p.vy; p.t--; }
    for (let i = popups.length - 1; i >= 0; i--) if (popups[i].t <= 0) popups.splice(i, 1);

    /* ---- camera ---- */
    const targetCam = player.x - W / 3;
    camX += (targetCam - camX) * 0.14;
    camX = Math.max(0, Math.min(parsed.LCOLS * TS - W, camX));
  };

  const hurtPlayer = () => {
    if (gameState !== 'play' || player.inv > 0) return;
    if (player.big) { player.big = false; player.inv = 100; SFX.shrink(); }
    else { die(); }
  };

  const die = () => {
    lives--; SFX.die(); gameState = 'die'; stateTimer = 0;
  };

  const win = () => {
    SFX.win(); gameState = 'win'; stateTimer = 0;
    score += 1000;
    popups.push({ x: player.x - camX + 16, y: player.y - 30, text: '+1000!', t: 100, vy: -1.2 });
  };

  /* ── draw tiles ── */
  const drawTile = (x, y, ch) => {
    switch (ch) {
      case 'X':
        ctx.fillStyle = '#c8a060'; ctx.fillRect(x, y, TS, TS);
        ctx.fillStyle = '#a07830'; ctx.fillRect(x, y, TS, 5);
        ctx.strokeStyle = '#8b6914'; ctx.lineWidth = 1;
        ctx.strokeRect(x + .5, y + .5, TS - 1, TS - 1);
        break;
      case 'B':
        ctx.fillStyle = '#cc7722'; ctx.fillRect(x, y, TS, TS);
        ctx.strokeStyle = '#9a5500'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + 14); ctx.lineTo(x + TS, y + 14);
        ctx.moveTo(x + 16, y); ctx.lineTo(x + 16, y + 14);
        ctx.moveTo(x + 8, y + 14); ctx.lineTo(x + 8, y + TS);
        ctx.moveTo(x + 24, y + 14); ctx.lineTo(x + 24, y + TS);
        ctx.stroke();
        break;
      case '?': case 'M':
        ctx.fillStyle = '#f5c518'; ctx.fillRect(x, y, TS, TS);
        ctx.fillStyle = '#ffd700'; ctx.fillRect(x + 3, y + 3, TS - 6, TS / 2);
        ctx.strokeStyle = '#b8920a'; ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, TS - 2, TS - 2);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('?', x + TS / 2, y + TS / 2 + 1);
        break;
      case 'Q':
        ctx.fillStyle = '#888'; ctx.fillRect(x, y, TS, TS);
        ctx.strokeStyle = '#666'; ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, TS - 2, TS - 2);
        break;
      case 'T':
        ctx.fillStyle = '#2e8b2e'; ctx.fillRect(x - 2, y, TS + 4, TS);
        ctx.fillStyle = '#3aaa3a'; ctx.fillRect(x - 2, y + 2, TS + 4, TS / 2);
        ctx.strokeStyle = '#1a6a1a'; ctx.lineWidth = 1;
        ctx.strokeRect(x - 2 + .5, y + .5, TS + 3, TS - 1);
        break;
      case 'P':
        ctx.fillStyle = '#2e8b2e'; ctx.fillRect(x, y, TS, TS);
        ctx.strokeStyle = '#1a6a1a'; ctx.lineWidth = 1;
        ctx.strokeRect(x + .5, y + .5, TS - 1, TS - 1);
        break;
      case '|':
        ctx.fillStyle = '#aaa'; ctx.fillRect(x + TS / 2 - 3, y, 6, TS);
        break;
      case 'F': {
        ctx.fillStyle = '#aaa'; ctx.fillRect(x + TS / 2 - 3, y, 6, TS);
        ctx.fillStyle = '#22cc44';
        ctx.beginPath();
        ctx.moveTo(x + TS / 2 + 3, y + 2);
        ctx.lineTo(x + TS / 2 + 18, y + 10);
        ctx.lineTo(x + TS / 2 + 3, y + 20);
        ctx.closePath(); ctx.fill();
        break;
      }
    }
  };

  /* ── draw mario ── */
  const drawMario = () => {
    if (gameState === 'die') return;
    if (player.inv > 0 && Math.floor(player.inv / 5) % 2 === 0) return;
    const pw = player.big ? PW_B : PW_S;
    const ph = player.big ? PH_B : PH_S;
    const x = Math.round(player.x - camX), y = Math.round(player.y);
    ctx.save();
    if (player.facing < 0) { ctx.translate(x + pw / 2, 0); ctx.scale(-1, 1); ctx.translate(-(x + pw / 2), 0); }

    // hat
    ctx.fillStyle = '#e63946';
    ctx.fillRect(x, y, pw, 5);
    ctx.fillRect(x - 2, y + 5, pw + 4, 4);
    // face
    ctx.fillStyle = '#f4a261';
    const fh = player.big ? 16 : 10;
    ctx.fillRect(x + 1, y + 9, pw - 2, fh);
    // eye
    ctx.fillStyle = '#000';
    ctx.fillRect(x + pw - 7, y + 11, 3, 3);
    // mustache
    ctx.fillStyle = '#5c2d00';
    ctx.fillRect(x + 1, y + 9 + fh - 4, pw - 2, 4);
    // overalls
    const overallH = player.big ? 22 : 10;
    ctx.fillStyle = '#1a66cc';
    ctx.fillRect(x, y + 9 + fh, pw, overallH);
    ctx.fillStyle = '#e63946';
    ctx.fillRect(x + 3, y + 9 + fh + 2, pw - 6, overallH - 4);
    // shoes
    ctx.fillStyle = '#222';
    ctx.fillRect(x - 2, y + ph - 5, pw / 2 + 1, 5);
    ctx.fillRect(x + pw / 2, y + ph - 5, pw / 2 + 2, 5);
    ctx.restore();
  };

  /* ── draw goomba ── */
  const drawGoomba = g => {
    const gx = Math.round(g.x - camX), gy = Math.round(g.y);
    const cx = gx + g.w / 2;
    if (g.dead) {
      if (g.deadTimer > 40) return;
      ctx.fillStyle = '#7a3b10';
      ctx.fillRect(gx, gy + g.h - 6, g.w, 6);
      return;
    }
    // body
    ctx.fillStyle = '#9b4e1b';
    ctx.beginPath(); ctx.ellipse(cx, gy + g.h * 0.55, g.w / 2, g.h * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    // feet
    ctx.fillStyle = '#5c2d00';
    ctx.beginPath(); ctx.ellipse(gx + 7, gy + g.h - 3, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(gx + g.w - 7, gy + g.h - 3, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    // eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(cx - 6, gy + 8, 5, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 6, gy + 8, 5, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(cx - 5, gy + 9, 2.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 7, gy + 9, 2.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    // angry eyebrows
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 11, gy + 3); ctx.lineTo(cx - 1, gy + 6);
    ctx.moveTo(cx + 1,  gy + 6); ctx.lineTo(cx + 11, gy + 3);
    ctx.stroke();
  };

  /* ── draw koopa ── */
  const drawKoopa = k => {
    const kx = Math.round(k.x - camX), ky = Math.round(k.y);
    const cx = kx + k.w / 2;
    if (k.dead) return;
    if (k.shell) {
      // shell
      ctx.fillStyle = '#22aa22';
      ctx.beginPath(); ctx.ellipse(cx, ky + k.h / 2, k.w / 2, k.h / 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(cx, ky + k.h / 2, k.w / 4, k.h / 4, 0, 0, Math.PI * 2); ctx.fill();
      return;
    }
    // body
    ctx.fillStyle = '#22aa22';
    ctx.beginPath(); ctx.ellipse(cx, ky + k.h * 0.6, k.w * 0.45, k.h * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    // head
    ctx.fillStyle = '#f4a261';
    ctx.beginPath(); ctx.ellipse(cx + (k.vx < 0 ? -5 : 5), ky + 8, 8, 9, 0, 0, Math.PI * 2); ctx.fill();
    // shell on back
    ctx.fillStyle = '#2d8b2d';
    ctx.beginPath(); ctx.ellipse(cx, ky + k.h * 0.5, k.w * 0.38, k.h * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    // feet
    ctx.fillStyle = '#f4a261';
    ctx.fillRect(kx + 2, ky + k.h - 7, 8, 7);
    ctx.fillRect(kx + k.w - 10, ky + k.h - 7, 8, 7);
  };

  /* ── draw mushroom ── */
  const drawMushroom = m => {
    const mx = Math.round(m.x - camX), my = Math.round(m.y);
    const cx = mx + m.w / 2;
    // cap
    ctx.fillStyle = '#cc2222';
    ctx.beginPath(); ctx.arc(cx, my + m.h * 0.45, m.w / 2, Math.PI, 0, false); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(cx - 6, my + m.h * 0.3, 4, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 5, my + m.h * 0.25, 3, 3, 0, 0, Math.PI * 2); ctx.fill();
    // stem
    ctx.fillStyle = '#f4e4b0';
    ctx.fillRect(mx + 4, my + m.h * 0.45, m.w - 8, m.h * 0.55);
    // eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(mx + 5, my + m.h * 0.5 + 2, 3, 3);
    ctx.fillRect(mx + m.w - 8, my + m.h * 0.5 + 2, 3, 3);
  };

  /* ── draw ── */
  const SKY_COLORS = ['#5b8cd8', '#3a4fa8', '#2a386a', '#1a2850'];

  const draw = () => {
    ctx.fillStyle = SKY_COLORS[lvIdx % SKY_COLORS.length];
    ctx.fillRect(0, 0, W, H);

    // clouds (decorative, scrolls slowly)
    const ct = camX * 0.3;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    [[60,40],[180,30],[320,50],[460,35],[600,45],[720,38]].forEach(([cx,cy]) => {
      const x = (cx - ct % (parsed.LCOLS * TS)) % W;
      ctx.beginPath(); ctx.arc(x, cy, 18, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 20, cy - 8, 13, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x - 18, cy - 5, 12, 0, Math.PI * 2); ctx.fill();
    });

    // tiles
    const startC = Math.max(0, Math.floor(camX / TS) - 1);
    const endC   = Math.min(parsed.LCOLS, startC + Math.ceil(W / TS) + 2);
    for (let r = 0; r < 9; r++) {
      for (let c = startC; c < endC; c++) {
        const ch = getTile(r, c);
        if (ch !== ' ') drawTile(c * TS - camX, r * TS, ch);
      }
    }

    // mushrooms, koopas, goombas, mario
    for (const m of mushrooms) drawMushroom(m);
    for (const k of koopas)   drawKoopa(k);
    for (const g of goombas)  drawGoomba(g);
    drawMario();

    // score popups
    for (const p of popups) {
      ctx.globalAlpha = Math.min(1, p.t / 20);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.text, p.x - camX, p.y);
    }
    ctx.globalAlpha = 1;

    // HUD bar
    ctx.fillStyle = 'rgba(0,0,20,0.55)';
    ctx.fillRect(0, 0, W, 22);
    ctx.font = 'bold 12px sans-serif'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';  ctx.fillText(`ניקוד: ${score}`, 7, 11);
    ctx.textAlign = 'center'; ctx.fillText(`שלב ${lvIdx + 1}`, W / 2, 11);
    ctx.textAlign = 'right';
    ctx.fillText('❤️'.repeat(Math.max(0, lives)), W - 7, 11);
    if (player.big) {
      ctx.fillStyle = '#ffd700';
      ctx.font = '13px serif';
      ctx.fillText('★', W - 55, 11);
    }

    // overlays
    if (gameState === 'win') {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('שלב הושלם! 🎉', W / 2, H / 2 - 14);
      ctx.font = '16px sans-serif'; ctx.fillStyle = '#fff';
      ctx.fillText(`ניקוד: ${score}`, W / 2, H / 2 + 18);
    }
    if (gameState === 'die') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('אוי! נסו שוב... ❤️', W / 2, H / 2);
    }
    if (gameState === 'gameover') {
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('GAME OVER', W / 2, H / 2 - 20);
      ctx.font = '16px sans-serif'; ctx.fillStyle = '#aaa';
      ctx.fillText('לחצו כל מקש לנסות שוב', W / 2, H / 2 + 18);
    }
  };

  /* ── loop ── */
  let last = 0;
  const loop = ts => {
    if (ts - last >= 16) { if (active()) { update(); draw(); } last = ts; }
    requestAnimationFrame(loop);
  };

  startLevel(0);
  requestAnimationFrame(loop);
})();
