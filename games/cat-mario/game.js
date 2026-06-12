(() => {
  const canvas = document.getElementById('cat-c');
  const ctx    = canvas.getContext('2d');

  let W, H, GY;
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    GY = H - 64;
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Audio ──────────────────────────────────────────────────────────────────
  const AC_ = window.AudioContext || window.webkitAudioContext;
  let ac;
  function getAC() { if (!ac) ac = new AC_(); return ac; }
  function tone(f, type, dur, vol, sweep) {
    try {
      const a = getAC(), o = a.createOscillator(), g = a.createGain();
      o.connect(g); g.connect(a.destination);
      o.type = type; o.frequency.value = f;
      if (sweep) o.frequency.exponentialRampToValueAtTime(sweep, a.currentTime + dur * .6);
      g.gain.setValueAtTime(vol, a.currentTime);
      g.gain.exponentialRampToValueAtTime(.001, a.currentTime + dur);
      o.start(); o.stop(a.currentTime + dur);
    } catch {}
  }
  const snd = {
    jump:     () => tone(350, 'square',   .13, .12, 700),
    land:     () => tone(120, 'sine',     .08, .10),
    stomp:    () => { tone(300,'triangle',.07,.2,500); setTimeout(()=>tone(500,'triangle',.07,.18),55); },
    coin:     () => tone(1046,'triangle', .15, .15, 1568),
    block:    () => tone(220, 'square',   .09, .12),
    elephant: () => [220,330,440,550].forEach((f,i)=>setTimeout(()=>tone(f,'triangle',.22,.16),i*70)),
    trunk:    () => tone(180, 'sawtooth', .10, .18, 60),
    water:    () => tone(600, 'sine',     .14, .12, 300),
    waterHit: () => tone(400, 'sine',     .10, .10, 200),
    hurt:     () => tone(180, 'sawtooth', .28, .20, 80),
    die:      () => [300,220,150].forEach((f,i)=>setTimeout(()=>tone(f,'sawtooth',.14,.10),i*90)),
    win:      () => [523,587,659,698,784,880,988,1046].forEach((f,i)=>setTimeout(()=>tone(f,'triangle',.12,.14),i*80)),
    pipe:     () => tone(200, 'sine',     .18, .10, 120),
    brickBreak: () => tone(150,'square',  .12, .15, 80),
  };

  // ── Input ──────────────────────────────────────────────────────────────────
  const K = {};
  const T = { left:false, right:false, jump:false, attack:false };
  document.addEventListener('keydown', e => {
    K[e.code] = true;
    if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
  });
  document.addEventListener('keyup', e => { K[e.code] = false; });
  function setupTouch(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart',  e=>{e.preventDefault();T[key]=true;},  {passive:false});
    el.addEventListener('touchend',    e=>{e.preventDefault();T[key]=false;}, {passive:false});
    el.addEventListener('touchcancel', e=>{e.preventDefault();T[key]=false;}, {passive:false});
  }
  setupTouch('cat-d-left','left'); setupTouch('cat-d-right','right');
  setupTouch('cat-d-jump','jump'); setupTouch('cat-d-attack','attack');

  const BS = 40;

  // ── Level defs ─────────────────────────────────────────────────────────────
  function mkDog(x, minX, maxX, spd) {
    return { x, y:0, minX, maxX, vx:spd||1.3, dead:false, deadTimer:0, facing:1 };
  }
  function mkBlock(x, row, type, content) {
    return { x, row, type, content:content||null, hit:false, hitAnim:0, broken:false };
  }
  function mkCoin(x, row) { return { x, row, taken:false }; }
  function mkElFruit(x, row) { return { x, row, taken:false }; } // standalone elephant fruit

  const LEVEL_DEFS = [
    {
      worldW: 3600,
      sky: ['#5bb8ff','#b3dfff'],
      groundColor: '#5d8a3c', dirtColor: '#8B5E3C',
      gaps: [],
      pipes: [
        {x:480, w:80, h:80}, {x:860, w:80, h:100},
        {x:1320,w:80, h:120},{x:2100,w:80, h:80 },
        {x:2800,w:80, h:100},
      ],
      blocks: [
        mkBlock(320,3,'?','coin'),   mkBlock(360,3,'brick'),
        mkBlock(400,3,'?','elephant'), mkBlock(440,3,'brick'), mkBlock(480,3,'?','coin'),
        mkBlock(720,3,'?','fish'),   mkBlock(760,3,'brick'),
        mkBlock(800,3,'brick'),      mkBlock(840,3,'?','coin'),
        mkBlock(1060,3,'brick'),     mkBlock(1100,3,'?','coin'),
        mkBlock(1140,3,'brick'),     mkBlock(1180,3,'?','fish'), mkBlock(1220,3,'brick'),
        mkBlock(1500,3,'?','coin'),  mkBlock(1540,4,'?','coin'),
        mkBlock(1580,5,'?','elephant'), mkBlock(1620,4,'?','coin'), mkBlock(1660,3,'?','coin'),
        mkBlock(1900,3,'brick'),     mkBlock(1940,3,'?','fish'), mkBlock(1980,3,'brick'),
        mkBlock(2200,3,'?','coin'),  mkBlock(2240,3,'brick'),
        mkBlock(2280,3,'?','fish'),  mkBlock(2320,3,'brick'), mkBlock(2360,3,'?','coin'),
        mkBlock(2600,3,'?','fish'),  mkBlock(2640,3,'?','coin'),
        mkBlock(2920,3,'brick'),     mkBlock(2960,3,'?','fish'),
        mkBlock(3000,3,'?','coin'),  mkBlock(3040,3,'brick'),
        mkBlock(3200,0,'solid'), mkBlock(3240,0,'solid'), mkBlock(3280,0,'solid'), mkBlock(3320,0,'solid'), mkBlock(3360,0,'solid'),
        mkBlock(3240,1,'solid'), mkBlock(3280,1,'solid'), mkBlock(3320,1,'solid'), mkBlock(3360,1,'solid'),
        mkBlock(3280,2,'solid'), mkBlock(3320,2,'solid'), mkBlock(3360,2,'solid'),
        mkBlock(3320,3,'solid'), mkBlock(3360,3,'solid'),
        mkBlock(3360,4,'solid'),
      ],
      elFruits: [ mkElFruit(600,4), mkElFruit(1700,4), mkElFruit(2700,4) ],
      coins: [ mkCoin(640,4), mkCoin(680,4), mkCoin(1400,4), mkCoin(1440,4), mkCoin(2460,4), mkCoin(2500,4) ],
      dogs: [
        mkDog(200,120,360), mkDog(560,480,700), mkDog(700,560,820),
        mkDog(1000,880,1100), mkDog(1460,1360,1560), mkDog(1780,1680,1900),
        mkDog(2440,2300,2560), mkDog(2700,2580,2820), mkDog(3080,2960,3180),
      ],
      flagX: 3520, fishTarget: 8,
    },
    {
      worldW: 3200,
      sky: ['#1a1a2e','#16213e'],
      groundColor: '#444', dirtColor: '#222',
      gaps: [{x:600,w:120},{x:1200,w:100},{x:1900,w:140},{x:2600,w:120}],
      pipes: [
        {x:360,w:80,h:90},{x:1020,w:80,h:110},
        {x:1660,w:80,h:90},{x:2360,w:80,h:100},
      ],
      blocks: [
        mkBlock(200,3,'?','elephant'),
        mkBlock(280,3,'brick'), mkBlock(320,3,'?','coin'), mkBlock(360,3,'brick'),
        mkBlock(500,3,'?','fish'),
        mkBlock(760,3,'?','coin'), mkBlock(800,3,'brick'), mkBlock(840,3,'?','fish'),
        mkBlock(900,4,'?','coin'),
        mkBlock(1080,3,'brick'), mkBlock(1120,3,'?','coin'), mkBlock(1160,3,'brick'),
        mkBlock(1340,3,'?','fish'), mkBlock(1380,3,'?','coin'),
        mkBlock(1520,3,'?','elephant'), mkBlock(1560,3,'brick'), mkBlock(1600,3,'?','coin'),
        mkBlock(1740,3,'brick'), mkBlock(1780,3,'?','fish'), mkBlock(1820,3,'brick'),
        mkBlock(2060,3,'?','coin'), mkBlock(2100,4,'?','fish'), mkBlock(2140,3,'?','coin'),
        mkBlock(2280,3,'brick'), mkBlock(2320,3,'?','coin'), mkBlock(2360,3,'brick'),
        mkBlock(2460,3,'?','fish'),
        mkBlock(2760,3,'?','coin'), mkBlock(2800,3,'brick'), mkBlock(2840,3,'?','fish'),
        mkBlock(2920,3,'?','elephant'),
        mkBlock(2960,0,'solid'), mkBlock(3000,0,'solid'), mkBlock(3040,0,'solid'), mkBlock(3080,0,'solid'),
        mkBlock(3000,1,'solid'), mkBlock(3040,1,'solid'), mkBlock(3080,1,'solid'),
        mkBlock(3040,2,'solid'), mkBlock(3080,2,'solid'),
        mkBlock(3080,3,'solid'),
      ],
      elFruits: [ mkElFruit(660,4), mkElFruit(1260,4), mkElFruit(2200,4) ],
      coins: [ mkCoin(420,4), mkCoin(460,4), mkCoin(720,5), mkCoin(1440,4), mkCoin(2200,4) ],
      dogs: [
        mkDog(160,80,320,1.5), mkDog(440,380,560,1.5), mkDog(860,780,980,1.8),
        mkDog(1100,980,1180,1.5), mkDog(1440,1320,1560,1.8), mkDog(1840,1680,1960,1.5),
        mkDog(2180,2060,2280,2.0), mkDog(2500,2380,2560,1.8),
        mkDog(2700,2580,2820,2.0), mkDog(2900,2820,3000,1.8),
      ],
      flagX: 3120, fishTarget: 10,
    },
    {
      worldW: 3800,
      sky: ['#0d0221','#3c1053'],
      groundColor: '#6a0572', dirtColor: '#3c0057',
      gaps: [{x:480,w:140},{x:1000,w:120},{x:1600,w:160},{x:2200,w:140},{x:2900,w:160}],
      pipes: [
        {x:240,w:80,h:80},{x:760,w:80,h:100},{x:1260,w:80,h:90},
        {x:1860,w:80,h:110},{x:2500,w:80,h:100},{x:3100,w:80,h:90},
      ],
      blocks: [
        mkBlock(160,3,'?','elephant'),
        mkBlock(320,3,'brick'), mkBlock(360,3,'?','coin'), mkBlock(400,3,'?','fish'), mkBlock(440,3,'brick'),
        mkBlock(640,3,'?','fish'), mkBlock(680,3,'brick'), mkBlock(720,3,'?','coin'),
        mkBlock(840,3,'?','coin'), mkBlock(880,4,'?','fish'), mkBlock(920,3,'?','coin'),
        mkBlock(1120,3,'brick'), mkBlock(1160,3,'?','fish'), mkBlock(1200,3,'brick'),
        mkBlock(1400,3,'?','elephant'), mkBlock(1440,3,'brick'), mkBlock(1480,3,'?','coin'), mkBlock(1520,3,'brick'),
        mkBlock(1740,3,'?','fish'), mkBlock(1780,3,'brick'), mkBlock(1820,3,'?','coin'),
        mkBlock(2040,3,'brick'), mkBlock(2080,3,'?','fish'), mkBlock(2120,3,'brick'), mkBlock(2160,4,'?','coin'),
        mkBlock(2360,3,'?','coin'), mkBlock(2400,3,'brick'), mkBlock(2440,3,'?','fish'),
        mkBlock(2660,3,'?','elephant'), mkBlock(2700,3,'brick'), mkBlock(2740,3,'?','coin'),
        mkBlock(3060,3,'?','fish'), mkBlock(3100,3,'brick'), mkBlock(3140,3,'?','coin'), mkBlock(3180,3,'brick'),
        mkBlock(3320,3,'?','fish'), mkBlock(3360,3,'?','coin'),
        mkBlock(3480,3,'brick'), mkBlock(3520,3,'?','fish'), mkBlock(3560,3,'brick'),
        mkBlock(3600,0,'solid'), mkBlock(3640,0,'solid'), mkBlock(3680,0,'solid'),
        mkBlock(3640,1,'solid'), mkBlock(3680,1,'solid'),
        mkBlock(3680,2,'solid'),
      ],
      elFruits: [ mkElFruit(540,4), mkElFruit(1200,4), mkElFruit(2300,4), mkElFruit(3400,4) ],
      coins: [ mkCoin(580,4), mkCoin(620,4), mkCoin(1320,4), mkCoin(2520,4), mkCoin(3240,4) ],
      dogs: [
        mkDog(120,40,240,2.0), mkDog(360,280,440,2.0), mkDog(640,560,740,2.2),
        mkDog(900,820,980,2.0), mkDog(1200,1120,1340,2.2), mkDog(1800,1700,1860,2.0),
        mkDog(2100,2040,2200,2.5), mkDog(2440,2360,2500,2.2), mkDog(2660,2560,2760,2.5),
        mkDog(3080,2980,3180,2.2), mkDog(3340,3260,3460,2.5), mkDog(3540,3460,3600,2.0),
      ],
      flagX: 3720, fishTarget: 12,
    },
  ];

  // ── Game state ─────────────────────────────────────────────────────────────
  let gameState  = 'play';
  let lvlIdx     = 0;
  let score      = 0;
  let fishCount  = 0;
  let coinCount  = 0;
  let totalLives = 3;
  let camX       = 0;
  let jumpPrev   = false;
  let attackPrev = false;

  let lvl, blocks, pipes, dogs, coins, elFruits, flagX, fishTarget;
  let popupItems = [];   // { x, y, vy, life, emoji }
  let waterBullets = []; // { x, y, vx, alive }
  let parts = [];
  let p;

  function blockY(row) { return GY - BS - row * BS; }

  function buildLevel(idx) {
    const def = LEVEL_DEFS[idx];
    lvl = def;
    blocks    = def.blocks.map(b => ({ ...b, y: blockY(b.row), origY: blockY(b.row) }));
    pipes     = def.pipes.map(pp => ({ ...pp, y: GY - pp.h }));
    dogs      = def.dogs.map(d  => ({ ...d, y: GY - 40 }));
    coins     = def.coins.map(c => ({ ...c, x:c.x, y: blockY(c.row) - 10 }));
    elFruits  = def.elFruits.map(f => ({ ...f, x:f.x, y: blockY(f.row) - 10 }));
    flagX     = def.flagX;
    fishTarget = def.fishTarget;
    fishCount  = 0;
    popupItems = []; waterBullets = []; parts = [];

    p = {
      x:60, y:GY-48, vx:0, vy:0,
      w:38, h:38,
      form: 'cat',      // 'cat' | 'elephant'
      onGround: false,
      jumpsLeft: 2,
      lives: totalLives,
      invincible: 0,
      dead: false, deadTimer: 0,
      facing: 1,
      jumpHeld: 0,
      trunkSwing: 0,    // >0 = swinging trunk
      waterHold: 0,     // frames holding attack (for water spray)
      waterFired: false,// prevent rapid-fire
    };
    camX = 0;
    updateHUD();
  }

  function respawn() {
    p.x=60; p.y=GY-48; p.vx=0; p.vy=0;
    p.form='cat'; p.w=38; p.h=38;
    p.dead=false; p.deadTimer=0;
    p.invincible=90; p.jumpsLeft=2;
    p.jumpHeld=0; p.trunkSwing=0; p.waterHold=0; p.waterFired=false;
    camX=0;
  }

  function playerW() { return p.form==='elephant' ? 52 : 38; }
  function playerH() { return p.form==='elephant' ? 52 : 38; }

  // ── Trunk hitbox ──────────────────────────────────────────────────────────
  // Active during trunkSwing frames 18-8 (peak of swing)
  function trunkHitbox() {
    const reach = p.form==='elephant' ? 64 : 0;
    const tx = p.facing===1 ? p.x + p.w : p.x - reach;
    return { x: tx, y: p.y + 6, w: reach, h: p.h - 12 };
  }

  // ── Shoot water ───────────────────────────────────────────────────────────
  function shootWater() {
    waterBullets.push({ x: p.x + p.w/2, y: p.y + p.h*0.4, vx: p.facing * 9, alive: true });
    snd.water();
  }

  // ── Popup items ───────────────────────────────────────────────────────────
  function popup(x, y, emoji) {
    popupItems.push({ x, y, vy: -9, life: 1, emoji });
  }

  // ── Block hit from below ──────────────────────────────────────────────────
  function hitBlock(bl) {
    if (bl.type==='?' && bl.hit) return;
    if (bl.type==='?') {
      bl.hit=true; bl.hitAnim=8; snd.block();
      if (bl.content==='coin')     { popup(bl.x+BS/2, bl.y,'🪙'); coinCount++; score+=10; snd.coin(); updateHUD(); }
      if (bl.content==='fish')     { popup(bl.x+BS/2, bl.y,'🐟'); fishCount++; score+=50; snd.coin(); updateHUD(); }
      if (bl.content==='elephant') {
        popup(bl.x+BS/2, bl.y,'🍑');
        // The elephant fruit drops — player picks it up when it lands near them
        elFruits.push({ x: bl.x+BS/2-12, y: bl.y, taken:false, dropping:true, vy:2 });
        snd.elephant();
      }
    } else if (bl.type==='brick') {
      if (p.form==='elephant') {
        bl.broken=true;
        spawnParticles(bl.x+BS/2, bl.y+BS/2, ['🧱','💥','⭐']);
        snd.brickBreak();
      } else {
        bl.hitAnim=6; snd.block();
      }
    }
  }

  // ── Trunk hit: block from side ────────────────────────────────────────────
  function trunkHitBlock(bl) {
    if (bl.broken) return;
    if (bl.type==='brick') { bl.broken=true; spawnParticles(bl.x+BS/2,bl.y+BS/2,['🧱','💥','⭐']); snd.brickBreak(); }
    if (bl.type==='?' && !bl.hit) hitBlock(bl);
  }

  // ── Particles ─────────────────────────────────────────────────────────────
  function spawnParticles(x, y, emojis) {
    for (let i=0;i<10;i++) {
      const a=Math.random()*Math.PI*2, sp=2+Math.random()*4;
      parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-3,life:1,e:emojis[Math.random()*emojis.length|0]});
    }
  }

  function inGap(x) {
    for (const g of lvl.gaps) if (x>g.x && x<g.x+g.w) return true;
    return false;
  }

  // ── Rects ─────────────────────────────────────────────────────────────────
  function rectsOverlap(ax,ay,aw,ah,bx,by,bw,bh) {
    return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by;
  }

  // ── Update ────────────────────────────────────────────────────────────────
  function update() {
    if (p.dead) {
      p.deadTimer--; p.vy-=0.5; p.y-=p.vy;
      if (p.deadTimer<=0) {
        if (p.lives<=0) { gameState='gameover'; showOverlay('cat-over-overlay'); }
        else respawn();
      }
      return;
    }

    const left   = K.ArrowLeft  || K.KeyA || T.left;
    const right  = K.ArrowRight || K.KeyD || T.right;
    const jump   = K.Space || K.ArrowUp || K.KeyW || T.jump;
    const attack = K.KeyZ || K.KeyX || K.ShiftLeft || K.ShiftRight || T.attack;

    // ── Movement ──────────────────────────────────────────────────────────
    const spd = p.form==='elephant' ? 4.8 : 5.5;
    if (left)       { p.vx=Math.max(p.vx-1.0,-spd); p.facing=-1; }
    else if (right) { p.vx=Math.min(p.vx+1.0, spd); p.facing= 1; }
    else p.vx *= 0.75;

    // ── Jump ──────────────────────────────────────────────────────────────
    if (jump && !jumpPrev && p.jumpsLeft>0) {
      p.vy=-14.5; p.jumpsLeft--; p.jumpHeld=0; snd.jump();
    }
    if (jump && jumpPrev && p.vy<0 && p.jumpHeld<14) { p.vy-=0.5; p.jumpHeld++; }
    jumpPrev = jump;

    // ── Trunk attack / water spray ────────────────────────────────────────
    if (p.form==='elephant') {
      if (attack && !attackPrev) {
        // Start trunk swing
        p.trunkSwing = 22;
        p.waterHold  = 0;
        p.waterFired = false;
        snd.trunk();
      }
      if (attack && attackPrev) {
        p.waterHold++;
        if (p.waterHold===28 && !p.waterFired) {
          shootWater();
          p.waterFired = true;
          p.waterHold  = 0;
        }
      }
      if (!attack) { p.waterHold=0; p.waterFired=false; }
    } else {
      p.trunkSwing=0; p.waterHold=0;
    }
    attackPrev = attack;

    if (p.trunkSwing>0) p.trunkSwing--;

    // Trunk swing active window (frames 18–8): damage blocks/enemies
    if (p.form==='elephant' && p.trunkSwing>=8 && p.trunkSwing<=18) {
      const th = trunkHitbox();
      // Hit blocks
      for (const bl of blocks) {
        if (!bl.broken && rectsOverlap(th.x,th.y,th.w,th.h,bl.x,bl.y,BS,BS))
          trunkHitBlock(bl);
      }
      // Kill dogs
      for (const d of dogs) {
        if (!d.dead && rectsOverlap(th.x,th.y,th.w,th.h,d.x,d.y,40,40)) {
          d.dead=true; d.deadTimer=40;
          spawnParticles(d.x+20,d.y,['💥','✨','⭐']);
          score+=100; snd.stomp(); updateHUD();
        }
      }
    }

    // ── Water bullets ─────────────────────────────────────────────────────
    for (let i=waterBullets.length-1;i>=0;i--) {
      const wb = waterBullets[i];
      wb.x += wb.vx;
      // Hit walls/blocks
      let hitSomething = false;
      for (const bl of blocks) {
        if (!bl.broken && rectsOverlap(wb.x-6,wb.y-6,12,12,bl.x,bl.y,BS,BS)) {
          hitSomething=true; trunkHitBlock(bl); snd.waterHit(); break;
        }
      }
      // Hit dogs
      for (const d of dogs) {
        if (!d.dead && rectsOverlap(wb.x-6,wb.y-6,12,12,d.x,d.y,40,40)) {
          d.dead=true; d.deadTimer=40;
          spawnParticles(d.x+20,d.y,['💦','💥','⭐']);
          score+=100; snd.waterHit(); updateHUD();
          hitSomething=true; break;
        }
      }
      if (hitSomething || wb.x<0 || wb.x>lvl.worldW) waterBullets.splice(i,1);
    }

    // ── Gravity ───────────────────────────────────────────────────────────
    const grav = p.vy<0 ? 0.52 : 0.75;
    p.vy = Math.min(p.vy+grav, 20);
    p.x += p.vx;
    p.y += p.vy;
    p.w = playerW(); p.h = playerH();

    if (p.x<0) { p.x=0; p.vx=0; }
    if (p.x+p.w>lvl.worldW) { p.x=lvl.worldW-p.w; p.vx=0; }

    p.onGround = false;
    const prevTopY    = p.y - p.vy;
    const prevBottomY = p.y + p.h - p.vy;

    // ── Block collisions ──────────────────────────────────────────────────
    for (const bl of blocks) {
      if (bl.broken) continue;
      const bx=bl.x, by=bl.y, bw=BS, bh=BS;
      if (p.x+p.w<=bx+2 || p.x>=bx+bw-2) continue;
      // Land on top
      if (p.vy>=0 && p.y+p.h>=by && prevBottomY<=by+8) {
        p.y=by-p.h; p.vy=0; p.onGround=true; p.jumpsLeft=2;
        if (!p.onGround) snd.land();
        continue;
      }
      // Head hit from below
      if (p.vy<0 && p.y<=by+bh && prevTopY>=by+bh-8) {
        p.y=by+bh; p.vy=0; hitBlock(bl); continue;
      }
      // Side: elephant auto-breaks bricks
      if (p.y+p.h>by+6 && p.y<by+bh-6) {
        if (p.vx>0 && p.x+p.w>bx && p.x+p.w<bx+bw+6) {
          if (p.form==='elephant' && bl.type==='brick') {
            bl.broken=true; spawnParticles(bx+BS/2,by+BS/2,['🧱','💥']); snd.brickBreak();
          } else { p.x=bx-p.w; p.vx=0; }
        }
        if (p.vx<0 && p.x<bx+bw && p.x>bx-6) {
          if (p.form==='elephant' && bl.type==='brick') {
            bl.broken=true; spawnParticles(bx+BS/2,by+BS/2,['🧱','💥']); snd.brickBreak();
          } else { p.x=bx+bw; p.vx=0; }
        }
      }
    }

    // ── Pipe collisions ───────────────────────────────────────────────────
    for (const pp of pipes) {
      const px2=pp.x,pw2=pp.w,py2=pp.y;
      if (p.x+p.w<=px2+2||p.x>=px2+pw2-2) continue;
      if (p.vy>=0&&p.y+p.h>=py2&&(p.y+p.h-p.vy)<=py2+8) {
        p.y=py2-p.h; p.vy=0; p.onGround=true; p.jumpsLeft=2; continue;
      }
      if (p.y+p.h>py2+4&&p.y<GY) {
        if (p.vx>0&&p.x+p.w>px2&&p.x+p.w<px2+pw2+4) { p.x=px2-p.w; p.vx=0; snd.pipe(); }
        if (p.vx<0&&p.x<px2+pw2&&p.x>px2-4) { p.x=px2+pw2; p.vx=0; snd.pipe(); }
      }
    }

    // ── Ground ────────────────────────────────────────────────────────────
    const midX = p.x + p.w/2;
    if (!inGap(midX)) {
      if (p.y+p.h>=GY && p.vy>=0) {
        p.y=GY-p.h; if(p.vy>2) snd.land();
        p.vy=0; p.onGround=true; p.jumpsLeft=2;
      }
    } else if (p.y>H+60) { killPlayer(); return; }

    // ── Elephant fruits (pickup) ──────────────────────────────────────────
    for (const ef of elFruits) {
      if (ef.taken) continue;
      // Dropping from block
      if (ef.dropping) {
        ef.vy = (ef.vy||2) + 0.5;
        ef.y += ef.vy;
        if (ef.y+20 >= GY) { ef.y=GY-20; ef.vy=0; ef.dropping=false; }
      }
      if (Math.abs((p.x+p.w/2)-ef.x)<28 && Math.abs((p.y+p.h/2)-ef.y)<28) {
        ef.taken=true;
        p.form='elephant'; p.w=52; p.h=52; p.y-=14;
        spawnParticles(ef.x,ef.y,['🍑','🐘','✨','🌟']);
        snd.elephant(); updateHUD();
      }
    }

    // ── Coins ────────────────────────────────────────────────────────────
    for (const c of coins) {
      if (c.taken) continue;
      if (Math.abs((p.x+p.w/2)-c.x)<22&&Math.abs((p.y+p.h/2)-c.y)<22) {
        c.taken=true; coinCount++; score+=10; snd.coin();
        spawnParticles(c.x,c.y,['🪙','✨']); updateHUD();
      }
    }

    // ── Popup items ───────────────────────────────────────────────────────
    for (let i=popupItems.length-1;i>=0;i--) {
      const pc=popupItems[i];
      pc.vy+=0.5; pc.y+=pc.vy; pc.life-=0.025;
      if (pc.life<=0) popupItems.splice(i,1);
    }

    // ── Dogs ─────────────────────────────────────────────────────────────
    for (const d of dogs) {
      if (d.dead) { d.deadTimer--; continue; }
      d.x+=d.vx;
      if (d.x<=d.minX) { d.x=d.minX; d.vx=Math.abs(d.vx); d.facing=1; }
      if (d.x+40>=d.maxX) { d.x=d.maxX-40; d.vx=-Math.abs(d.vx); d.facing=-1; }
      if (p.invincible>0) continue;
      if (!rectsOverlap(p.x+3,p.y+3,p.w-6,p.h-6,d.x,d.y,40,40)) continue;
      const wasAbove=(p.y+p.h-p.vy)<=d.y+10;
      if (p.vy>0&&wasAbove) {
        d.dead=true; d.deadTimer=40;
        spawnParticles(d.x+20,d.y,['💥','✨','⭐','🌟']);
        p.vy=-10; snd.stomp(); score+=100; updateHUD();
      } else {
        if (p.form==='elephant') {
          p.form='cat'; p.w=38; p.h=38; p.invincible=80; snd.hurt();
        } else { killPlayer(); return; }
      }
    }

    // ── Flag ─────────────────────────────────────────────────────────────
    if (p.x+p.w>=flagX && fishCount>=fishTarget) { levelComplete(); return; }

    if (p.invincible>0) p.invincible--;
    for (const bl of blocks) if (bl.hitAnim>0) bl.hitAnim--;

    // ── Particles ────────────────────────────────────────────────────────
    for (let i=parts.length-1;i>=0;i--) {
      const pt=parts[i];
      pt.x+=pt.vx; pt.y+=pt.vy; pt.vy+=0.3; pt.life-=0.03;
      if (pt.life<=0) parts.splice(i,1);
    }

    // ── Camera ───────────────────────────────────────────────────────────
    const tx = p.x+p.w/2-W*0.38;
    camX += (tx-camX)*0.12;
    camX = Math.max(0, Math.min(lvl.worldW-W, camX));
  }

  function killPlayer() {
    if (p.dead) return;
    p.dead=true; p.deadTimer=55; p.lives--; p.vy=-13;
    totalLives=p.lives; snd.die(); updateHUD();
  }

  function levelComplete() {
    gameState='levelover'; snd.win();
    if (lvlIdx>=LEVEL_DEFS.length-1) {
      showOverlay('cat-win-overlay');
    } else {
      document.getElementById('cat-level-title').textContent='🎉 כל הכבוד!';
      document.getElementById('cat-level-msg').textContent=`עברת את שלב ${lvlIdx+1}! ניקוד: ${score} 🏆`;
      showOverlay('cat-level-overlay');
    }
  }

  // ── HUD & overlays ────────────────────────────────────────────────────────
  function updateHUD() {
    document.getElementById('cat-lives').textContent = '❤️'.repeat(Math.max(0,p.lives));
    const formIcon = p && p.form==='elephant' ? '🐘 ' : '';
    document.getElementById('cat-score').textContent = `${formIcon}🪙${coinCount}  🐟${fishCount}/${fishTarget}`;
    document.getElementById('cat-level').textContent = `שלב ${lvlIdx+1}`;
  }
  function showOverlay(id) {
    ['cat-hint-overlay','cat-level-overlay','cat-over-overlay','cat-win-overlay'].forEach(oid => {
      const el=document.getElementById(oid);
      if (el) el.style.display=oid===id?'flex':'none';
    });
  }
  function hideAllOverlays() {
    ['cat-hint-overlay','cat-level-overlay','cat-over-overlay','cat-win-overlay'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.style.display='none';
    });
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  const STARS = Array.from({length:60},()=>({x:Math.random()*4000,y:Math.random()*300,r:Math.random()}));
  let frameT = 0;

  function sx(x) { return x-camX; }

  function drawBlock(bl) {
    if (bl.broken) return;
    const x=sx(bl.x), y=bl.y+(bl.hitAnim>0?-bl.hitAnim*0.8:0);
    if (x>W+BS||x<-BS) return;
    ctx.save();
    if (bl.type==='?') {
      ctx.fillStyle=bl.hit?'#999':'#f7c948';
      ctx.fillRect(x,y,BS,BS);
      ctx.fillStyle=bl.hit?'#777':'#c8a200';
      ctx.fillRect(x,y+BS-4,BS,4); ctx.fillRect(x+BS-4,y,4,BS);
      ctx.fillStyle=bl.hit?'#bbb':'#ffe680';
      ctx.fillRect(x+2,y+2,BS-6,5);
      ctx.fillStyle=bl.hit?'#555':'#8B5E00';
      ctx.font=`bold ${BS*.55}px Arial`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(bl.hit?'•':'?',x+BS/2,y+BS/2+1);
    } else if (bl.type==='brick') {
      ctx.fillStyle='#c84b16'; ctx.fillRect(x,y,BS,BS);
      ctx.fillStyle='#a33a0e';
      ctx.fillRect(x,y+BS/2-1,BS,2);
      ctx.fillRect(x+BS/4-1,y,2,BS/2-1);
      ctx.fillRect(x+BS*3/4-1,y+BS/2+1,2,BS/2-1);
      ctx.fillStyle='#e05a20';
      ctx.fillRect(x+2,y+2,BS*.45,BS/2-4);
      ctx.fillRect(x+BS/2+2,y+BS/2+2,BS*.45,BS/2-4);
    } else {
      ctx.fillStyle='#888'; ctx.fillRect(x,y,BS,BS);
      ctx.fillStyle='#aaa'; ctx.fillRect(x+2,y+2,BS-4,5);
      ctx.fillStyle='#666'; ctx.fillRect(x,y+BS-4,BS,4); ctx.fillRect(x+BS-4,y,4,BS);
    }
    ctx.restore();
    ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  }

  function drawPipe(pp) {
    const x=sx(pp.x),y=pp.y;
    if (x>W+100||x+pp.w<-10) return;
    ctx.fillStyle='#3a9e3a'; ctx.fillRect(x+5,y+14,pp.w-10,pp.h-14);
    ctx.fillStyle='#5dc85d'; ctx.fillRect(x+8,y+14,8,pp.h-18);
    ctx.fillStyle='#256525'; ctx.fillRect(x+pp.w-12,y+14,7,pp.h-14);
    ctx.fillStyle='#3a9e3a'; ctx.fillRect(x,y,pp.w,16);
    ctx.fillStyle='#5dc85d'; ctx.fillRect(x+4,y+2,14,10);
    ctx.fillStyle='#256525'; ctx.fillRect(x+pp.w-14,y,10,16);
  }

  function drawGround() {
    let drawX=0;
    for (const g of lvl.gaps) {
      const gsx=sx(g.x);
      if (gsx>W) break;
      if (drawX<gsx) {
        ctx.fillStyle=lvl.groundColor; ctx.fillRect(drawX,GY,gsx-drawX,10);
        ctx.fillStyle=lvl.dirtColor;   ctx.fillRect(drawX,GY+10,gsx-drawX,H-GY-10);
      }
      drawX=gsx+g.w;
    }
    const worldEnd=sx(lvl.worldW);
    if (drawX<Math.min(W,worldEnd)) {
      ctx.fillStyle=lvl.groundColor; ctx.fillRect(drawX,GY,Math.min(W,worldEnd)-drawX,10);
      ctx.fillStyle=lvl.dirtColor;   ctx.fillRect(drawX,GY+10,Math.min(W,worldEnd)-drawX,H-GY-10);
    }
  }

  function drawPlayer() {
    if (p.dead && p.deadTimer<=30) {
      ctx.save();
      ctx.translate(sx(p.x+p.w/2),p.y+p.h/2);
      ctx.rotate((55-p.deadTimer)*0.16);
      ctx.font='34px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('😿',0,0); ctx.restore(); return;
    }
    if (p.invincible>0 && Math.floor(frameT*0.25)%2===0) return;

    ctx.save();
    ctx.translate(sx(p.x+p.w/2), p.y+p.h/2);
    ctx.scale(p.facing,1);
    const sqX=p.onGround&&Math.abs(p.vx)>0.5?1.08:1;
    const sqY=p.onGround?0.92:(p.vy<-4?1.15:1);
    ctx.scale(sqX,sqY);

    if (p.form==='elephant') {
      // Draw trunk swing arc
      if (p.trunkSwing>0) {
        const t=p.trunkSwing;
        const swingAngle=(22-t)/22; // 0→1
        ctx.save();
        ctx.globalAlpha=0.6;
        ctx.strokeStyle='#87ceeb';
        ctx.lineWidth=8;
        ctx.lineCap='round';
        ctx.beginPath();
        // Trunk sweeps from up to forward
        const startAngle=-0.8+swingAngle*1.2;
        ctx.arc(20, 0, 34, startAngle-0.6, startAngle+0.1);
        ctx.stroke();
        ctx.globalAlpha=1;
        ctx.restore();
      }
      // Water spray charge indicator
      if (p.waterHold>10) {
        ctx.save();
        ctx.globalAlpha=p.waterHold/28;
        ctx.fillStyle='#87ceeb';
        for (let i=0;i<3;i++) {
          ctx.beginPath();
          ctx.arc(20+i*6, -8-i*4, 3+i, 0, Math.PI*2);
          ctx.fill();
        }
        ctx.globalAlpha=1;
        ctx.restore();
      }
      ctx.font='44px serif';
    } else {
      ctx.font='34px serif';
    }
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(p.form==='elephant'?'🐘':'🐱',0,0);
    ctx.restore();
  }

  function draw() {
    frameT++;
    ctx.clearRect(0,0,W,H);

    // Sky
    const grad=ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,lvl.sky[0]); grad.addColorStop(1,lvl.sky[1]);
    ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);

    // Stars
    if (['#0','#1','#2','#3'].some(p2=>lvl.sky[0].startsWith(p2))) {
      ctx.fillStyle=`rgba(255,255,255,${0.5+0.5*Math.sin(frameT*.04)})`;
      for (const s of STARS) {
        const cx2=(s.x-camX*0.3+lvl.worldW)%lvl.worldW;
        if (cx2>0&&cx2<W) { ctx.beginPath(); ctx.arc(cx2,s.y,1.5-s.r,0,Math.PI*2); ctx.fill(); }
      }
    }

    // Clouds
    ctx.font='34px serif'; ctx.globalAlpha=0.7;
    [200,500,900,1400,1900,2400,3000,3500].forEach((cx2,i)=>{
      const sx2=(cx2-camX*0.3+lvl.worldW*2)%(lvl.worldW+W)-60;
      if (sx2>-50&&sx2<W+50) ctx.fillText('☁️',sx2,40+(i%3)*20);
    });
    ctx.globalAlpha=1;

    drawGround();
    for (const bl of blocks) drawBlock(bl);
    for (const pp of pipes) drawPipe(pp);

    // Flag
    { const fx=sx(flagX);
      if (fx>-20&&fx<W+20) {
        ctx.fillStyle='#777'; ctx.fillRect(fx,GY-120,5,120);
        ctx.fillStyle='#ffd700'; ctx.beginPath(); ctx.arc(fx+2,GY-122,6,0,Math.PI*2); ctx.fill();
        ctx.font='28px serif'; ctx.fillText(fishCount>=fishTarget?'🏁':'🚩',fx-4,GY-100);
      }
    }

    // Coins
    for (const c of coins) {
      if (c.taken) continue;
      const cx2=sx(c.x); if (cx2<-20||cx2>W+20) continue;
      const bob=Math.sin(frameT*.08+c.x*.01)*3;
      ctx.font='18px serif'; ctx.fillText('🪙',cx2-9,c.y+bob);
    }

    // Elephant fruits
    for (const ef of elFruits) {
      if (ef.taken) continue;
      const ex=sx(ef.x); if (ex<-20||ex>W+20) continue;
      const bob=ef.dropping?0:Math.sin(frameT*.07+ef.x*.01)*4;
      ctx.save();
      // Glow
      ctx.shadowColor='#ff9900'; ctx.shadowBlur=12;
      ctx.font='22px serif';
      ctx.fillText('🍑',ex-11,ef.y+bob);
      ctx.restore();
    }

    // Dogs
    for (const d of dogs) {
      if (d.dead) {
        if (d.deadTimer>0) {
          ctx.globalAlpha=d.deadTimer/40;
          ctx.save(); ctx.translate(sx(d.x+20),d.y+20);
          ctx.rotate((40-d.deadTimer)*0.1);
          ctx.font='30px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillText('🐕',0,0); ctx.restore(); ctx.globalAlpha=1;
        }
        continue;
      }
      const dx2=sx(d.x); if (dx2<-50||dx2>W+50) continue;
      ctx.save(); ctx.translate(dx2+20,d.y+20);
      ctx.scale(d.vx<0?-1:1,1);
      ctx.font='30px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('🐕',0,0); ctx.restore();
    }
    ctx.textAlign='left'; ctx.textBaseline='alphabetic';

    // Water bullets
    for (const wb of waterBullets) {
      const wx=sx(wb.x);
      ctx.save();
      ctx.globalAlpha=0.85;
      // Water droplet
      ctx.fillStyle='#00aaff';
      ctx.beginPath(); ctx.arc(wx,wb.y,7,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#88ddff';
      ctx.beginPath(); ctx.arc(wx-2,wb.y-2,3,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
      ctx.restore();
    }

    // Popup items
    for (const pc of popupItems) {
      ctx.globalAlpha=pc.life; ctx.font='18px serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(pc.emoji,sx(pc.x),pc.y);
    }
    ctx.globalAlpha=1; ctx.textAlign='left'; ctx.textBaseline='alphabetic';

    // Particles
    for (const pt of parts) {
      ctx.globalAlpha=pt.life; ctx.font='17px serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(pt.e,sx(pt.x),pt.y);
    }
    ctx.globalAlpha=1; ctx.textAlign='left'; ctx.textBaseline='alphabetic';

    drawPlayer();

    // Fish reminder
    if (fishCount<fishTarget&&sx(flagX)>0&&sx(flagX)<W-60) {
      ctx.fillStyle='rgba(0,0,0,.55)';
      ctx.beginPath(); ctx.roundRect(W/2-130,22,260,34,10); ctx.fill();
      ctx.fillStyle='#fff'; ctx.font='bold 14px Arial'; ctx.textAlign='center';
      ctx.fillText(`אסוף 🐟 ${fishCount}/${fishTarget} כדי לעבור`,W/2,44);
      ctx.textAlign='left';
    }
  }

  // ── Loop ──────────────────────────────────────────────────────────────────
  function loop() {
    const screen=document.getElementById('cat-mario-screen');
    if (screen&&screen.classList.contains('active')) {
      if (gameState==='play') update();
      draw();
    }
    requestAnimationFrame(loop);
  }

  function startLevel(idx) {
    lvlIdx=idx; buildLevel(idx); gameState='play'; hideAllOverlays();
  }

  document.getElementById('cat-hint-start').addEventListener('click',()=>{hideAllOverlays();gameState='play';});
  document.getElementById('cat-next-btn').addEventListener('click',()=>startLevel(lvlIdx+1));
  document.getElementById('cat-retry-btn').addEventListener('click',()=>{score=0;coinCount=0;fishCount=0;totalLives=3;startLevel(0);});
  document.getElementById('cat-playagain-btn').addEventListener('click',()=>{score=0;coinCount=0;fishCount=0;totalLives=3;startLevel(0);});

  buildLevel(0);
  loop();
})();
