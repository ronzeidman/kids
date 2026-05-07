(function () {
  'use strict';

  const C = document.getElementById('adv-c');
  const ctx = C.getContext('2d');
  const screen = document.getElementById('adventure-screen');
  let W, H;

  function resize() {
    W = C.width = innerWidth;
    H = C.height = innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // ── WORLD ──────────────────────────────────────────────────────
  const WW = 4400, GY = 600, GH = 250;
  const WX = 1050, WW_ = 700, WY = GY + 15;

  const PLATS = [
    {x:170, y:GY-90,  w:115},
    {x:360, y:GY-170, w:95},
    {x:545, y:GY-110, w:125},
    {x:730, y:GY-220, w:80},
    {x:895, y:GY-140, w:115},
    {x:1060,y:GY-50,  w:65, lily:true},
    {x:1210,y:GY-90,  w:58, lily:true},
    {x:1365,y:GY-50,  w:68, lily:true},
    {x:1520,y:GY-80,  w:58, lily:true},
    {x:1665,y:GY-55,  w:62, lily:true},
    {x:1870,y:GY-110, w:115},
    {x:2060,y:GY-200, w:100},
    {x:2255,y:GY-300, w:85},
    {x:2440,y:GY-210, w:120},
    {x:2640,y:GY-130, w:100},
    {x:2860,y:GY-200, w:90},
    {x:3065,y:GY-340, w:80},
    {x:3250,y:GY-460, w:90,  cloud:true},
    {x:3460,y:GY-400, w:110, cloud:true},
    {x:3660,y:GY-540, w:90,  cloud:true},
    {x:3860,y:GY-460, w:110, cloud:true},
    {x:4030,y:GY-360, w:140},
  ];

  // ── DECORATIONS ────────────────────────────────────────────────
  const FLOWERS = ['🌸','🌼','🌺','🌷','🌻'];
  const DECO = [];
  for (let x = 60; x < 970; x += 18 + Math.random() * 28)
    DECO.push({e: FLOWERS[Math.random() * 5 | 0], x, y: GY});
  for (let x = 1800; x < 2660; x += 40 + Math.random() * 55)
    DECO.push({e: '🍄', x, y: GY});
  for (let x = 2900; x < 4400; x += 65 + Math.random() * 75)
    DECO.push({e: '⭐', x, y: GY - 350 - Math.random() * 220, float: true});
  for (let x = 50; x < 4400; x += 220 + Math.random() * 180) {
    if (x > 1000 && x < 1800) continue;
    DECO.push({e: '🌲', x, y: GY, big: true});
  }
  const BUTTS = Array.from({length: 10}, () => ({
    x: Math.random() * 900 + 80, y: GY - 110 - Math.random() * 160,
    vx: (Math.random() * 1.1 + .4) * (Math.random() < .5 ? 1 : -1),
    vy: Math.random() * .4 - .2, t: Math.random() * 6.28,
  }));
  const FISH_D = Array.from({length: 8}, () => ({
    x: WX + Math.random() * (WW_ - 60) + 30, y: WY + 30 + Math.random() * 70,
    vx: (Math.random() * 1.2 + .4) * (Math.random() < .5 ? 1 : -1), t: Math.random() * 6.28,
  }));

  // ── ENEMIES ────────────────────────────────────────────────────
  function mkWalker(x, patrolY, minX, maxX, spd, e) {
    return {type:'walker', x, y:patrolY-44, patrolY, minX, maxX, vx:spd, e,
            dead:false, deadTimer:0, deadAngle:0, hitW:40, hitH:44};
  }
  function mkFloater(bx, by, e, vx=.7, amp=30, freq=.025) {
    return {type:'floater', x:bx, y:by, baseX:bx, baseY:by, t:Math.random()*6.28,
            vx, amp, freq, e, dead:false, deadTimer:0, deadAngle:0, hitW:40, hitH:40};
  }

  function buildEnemies() {
    return [
      mkWalker(260,GY,160,380,1.3,'👾'),   mkWalker(540,GY,440,680,1.6,'🦀'),
      mkWalker(800,GY,730,960,1.2,'🐌'),   mkWalker(185,GY-90,175,270,1.0,'👺'),
      mkWalker(380,GY-170,365,440,1.4,'👾'), mkFloater(700,GY-170,'👻',.6,35,.028),
      mkFloater(1180,GY-130,'🦇',.7,40,.030), mkFloater(1420,GY-110,'👻',.5,28,.025),
      mkFloater(1600,GY-150,'🦇',.8,35,.032), mkWalker(1230,GY-50,1065,1265,1.0,'🐌'),
      mkWalker(1920,GY,1830,2060,1.8,'🤖'), mkWalker(2150,GY,2050,2300,1.5,'👺'),
      mkWalker(2500,GY,2420,2680,1.6,'👾'), mkWalker(1890,GY-110,1875,1960,1.1,'🐌'),
      mkWalker(2075,GY-200,2065,2150,1.3,'🤖'), mkWalker(2270,GY-300,2260,2330,1.0,'👺'),
      mkFloater(2350,GY-250,'🦇',.9,45,.035),
      mkWalker(2870,GY-200,2865,2940,1.2,'👾'), mkWalker(3075,GY-340,3068,3140,1.0,'🤖'),
      mkFloater(3350,GY-500,'👻',.8,50,.030), mkWalker(3265,GY-460,3255,3335,1.1,'👺'),
      mkWalker(3470,GY-400,3465,3560,1.3,'👾'), mkFloater(3700,GY-580,'🦇',1.0,45,.038),
      mkWalker(3675,GY-540,3665,3745,1.0,'🤖'), mkWalker(3870,GY-460,3860,3965,1.2,'👺'),
      mkWalker(4045,GY-360,4035,4165,1.4,'🐉'),
    ];
  }
  let ENEMIES = buildEnemies();

  const PARTICLES = [];
  function spawnParticles(x, y) {
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5;
      PARTICLES.push({x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp-3,
        life:1, e:['✨','💥','⭐','💫'][Math.random()*4|0]});
    }
  }

  // ── FORMS ──────────────────────────────────────────────────────
  const FORMS = {
    human:  {e:'🧒', spd:3.8, jf:-14, jumps:1,  grav:0.58, col:'#4488ee', nm:'אדם'},
    cat:    {e:'🐱', spd:4.8, jf:-15, jumps:2,  grav:0.50, col:'#ffaa44', nm:'חתול'},
    bird:   {e:'🦅', spd:5.5, jf:-11, jumps:99, grav:0.0,  col:'#aa7733', nm:'ציפור', fly:true},
    fish:   {e:'🐟', spd:2.0, jf:-9,  jumps:1,  grav:0.28, col:'#44aaff', nm:'דג',   swim:true},
    rabbit: {e:'🐰', spd:5.5, jf:-20, jumps:2,  grav:0.65, col:'#ddddee', nm:'ארנב'},
  };

  // ── PLAYER ─────────────────────────────────────────────────────
  let p = {
    x:80, y:GY-60, vx:0, vy:0, w:48, h:48,
    onGround:false, inWater:false, jumpsLeft:1,
    form:'human', lives:5, maxLives:5,
    spawnX:80, spawnY:GY-60,
    dead:false, deadTimer:0,
    invincible:0, txAnim:0, facing:1, prevOnGround:false,
  };

  let camX = 0, camY = 0, frameT = 0;

  // ── INPUT ──────────────────────────────────────────────────────
  const K = {}; let jumpPrev = false;
  document.addEventListener('keydown', e => {
    K[e.code] = true;
    if (e.code === 'Space' && screen.classList.contains('active')) e.preventDefault();
  });
  document.addEventListener('keyup', e => { K[e.code] = false; });

  const T = {left:false, right:false, jump:false};
  function tbind(id, prop) {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', e => { e.preventDefault(); T[prop] = true; }, {passive:false});
    el.addEventListener('touchend',   e => { e.preventDefault(); T[prop] = false; }, {passive:false});
    el.addEventListener('touchcancel', () => T[prop] = false);
  }
  tbind('adv-d-left','left'); tbind('adv-d-right','right'); tbind('adv-d-jump','jump');

  document.querySelectorAll('.adv-fbtn').forEach(b => {
    b.addEventListener('click', () => setForm(b.dataset.form));
    b.addEventListener('touchstart', e => e.stopPropagation(), {passive:true});
  });

  // ── AUDIO ──────────────────────────────────────────────────────
  const AC_ = window.AudioContext || window.webkitAudioContext;
  let ac;
  function getAC() { if (!ac) ac = new AC_(); return ac; }
  function tone(f, type, dur, vol, sweep) {
    try {
      const a = getAC(), o = a.createOscillator(), g = a.createGain();
      o.connect(g); g.connect(a.destination); o.type = type; o.frequency.value = f;
      if (sweep) o.frequency.exponentialRampToValueAtTime(sweep, a.currentTime + dur * .6);
      g.gain.setValueAtTime(vol, a.currentTime);
      g.gain.exponentialRampToValueAtTime(.001, a.currentTime + dur);
      o.start(); o.stop(a.currentTime + dur);
    } catch {}
  }
  function snd_jump()      { tone(320,'sine',.14,.18,640); }
  function snd_land()      { tone(130,'sine',.10,.14,80); }
  function snd_transform() { [380,580,900].forEach((f,i) => setTimeout(() => tone(f,'triangle',.2,.15), i*75)); }
  function snd_splash()    { tone(210,'sine',.22,.12,80); }
  function snd_die()       { [300,200,120].forEach((f,i) => setTimeout(() => tone(f,'sawtooth',.15,.1), i*90)); }
  function snd_stomp()     { [600,800,500].forEach((f,i) => setTimeout(() => tone(f,'triangle',.12,.2), i*55)); }
  function snd_hurt()      { tone(200,'sawtooth',.3,.25,80); }

  // ── HEARTS UI ──────────────────────────────────────────────────
  const heartsEl  = document.getElementById('adv-hearts');
  const nameEl    = document.getElementById('adv-form-name');
  const flashEl   = document.getElementById('adv-flash');

  function drawHearts() {
    heartsEl.innerHTML = '';
    for (let i = 0; i < p.maxLives; i++) {
      const s = document.createElement('span');
      s.textContent = i < p.lives ? '❤️' : '🖤';
      heartsEl.appendChild(s);
    }
  }
  drawHearts();

  function setForm(form) {
    if (form === p.form) return;
    p.form = form; p.txAnim = 1; p.jumpsLeft = FORMS[form].jumps;
    document.querySelectorAll('.adv-fbtn').forEach(b =>
      b.classList.toggle('active', b.dataset.form === form));
    nameEl.textContent = FORMS[form].e + ' ' + FORMS[form].nm;
    flashEl.style.background = FORMS[form].col + '99';
    flashEl.style.transition = 'none'; flashEl.style.opacity = '.55';
    setTimeout(() => { flashEl.style.transition = 'opacity .5s'; flashEl.style.opacity = '0'; }, 65);
    snd_transform();
  }

  // ── PHYSICS HELPERS ────────────────────────────────────────────
  function onGround_(pp) {
    if (pp.vy < 0 || pp.y+pp.h < GY-1 || pp.y+pp.h > GY+22) return false;
    if (pp.x+pp.w > WX-4 && pp.x < WX+WW_+4) return false;
    return true;
  }
  function inWater_(pp) {
    return pp.x+pp.w > WX && pp.x < WX+WW_ && pp.y+pp.h > WY && pp.y < WY+185;
  }
  function rectsOverlap(ax,ay,aw,ah,bx,by,bw,bh) {
    return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by;
  }

  // ── UPDATE ─────────────────────────────────────────────────────
  function updateEnemies() {
    for (const e of ENEMIES) {
      if (e.dead) { e.deadTimer--; e.deadAngle += .18; continue; }
      if (e.type === 'walker') {
        e.x += e.vx;
        if (e.x <= e.minX) { e.x = e.minX; e.vx = Math.abs(e.vx); }
        if (e.x >= e.maxX) { e.x = e.maxX; e.vx = -Math.abs(e.vx); }
        e.y = e.patrolY - e.hitH;
      } else {
        e.t += e.freq; e.x += e.vx;
        e.y = e.baseY + Math.sin(e.t) * e.amp;
        if (e.baseX - e.x > 80) e.vx =  Math.abs(e.vx);
        if (e.x - e.baseX > 80) e.vx = -Math.abs(e.vx);
      }
    }
  }

  function update() {
    if (p.dead) {
      p.deadTimer--;
      if (p.deadTimer <= 0) { p.dead=false; p.x=p.spawnX; p.y=p.spawnY; p.vx=0; p.vy=0; }
      return;
    }
    if (p.invincible > 0) p.invincible--;

    const fm   = FORMS[p.form];
    const left  = K.ArrowLeft  || K.KeyA || T.left;
    const right = K.ArrowRight || K.KeyD || T.right;
    const jump  = K.Space || K.ArrowUp || K.KeyW || T.jump;
    const down  = K.ArrowDown || K.KeyS;

    if (left)       { p.vx = Math.max(p.vx-.9, -fm.spd); p.facing = -1; }
    else if (right) { p.vx = Math.min(p.vx+.9,  fm.spd); p.facing =  1; }
    else            { p.vx *= p.inWater ? .80 : .72; if (Math.abs(p.vx) < .06) p.vx = 0; }

    if (fm.fly) {
      if (jump)      p.vy = Math.max(p.vy-.9, -fm.spd);
      else if (down) p.vy = Math.min(p.vy+.9,  fm.spd);
      else           p.vy *= .88;
    } else {
      const g = fm.grav * (p.inWater ? (p.form === 'fish' ? .18 : .42) : 1);
      p.vy = Math.min(p.vy + g, 20);
      if (jump && !jumpPrev && p.jumpsLeft > 0) {
        p.vy = fm.jf * (p.inWater && p.form !== 'fish' ? .52 : 1);
        p.jumpsLeft--; snd_jump();
      }
      if (p.form === 'fish' && p.inWater && jump) p.vy = Math.max(p.vy-.7, -fm.spd);
    }
    jumpPrev = jump;

    p.x += p.vx; p.y += p.vy;
    p.x = Math.max(0, Math.min(WW - p.w, p.x));

    const wasWater = p.inWater;
    p.inWater = inWater_(p);
    if (p.inWater && !wasWater && p.form !== 'fish') snd_splash();

    p.prevOnGround = p.onGround; p.onGround = false;
    if (onGround_(p)) { p.y=GY-p.h; p.vy=0; p.onGround=true; p.jumpsLeft=fm.jumps; }
    if (!p.onGround) {
      for (const pl of PLATS) {
        if (p.x+p.w>pl.x+5 && p.x<pl.x+pl.w-5 && p.y+p.h>pl.y && p.y+p.h<pl.y+20+p.vy+4 && p.vy>=0) {
          p.y=pl.y-p.h; p.vy=0; p.onGround=true; p.jumpsLeft=fm.jumps; break;
        }
      }
    }
    if (p.onGround && !p.prevOnGround) snd_land();

    for (const en of ENEMIES) {
      if (en.dead) continue;
      const {x:ex,y:ey,hitW:ew,hitH:eh} = en;
      if (!rectsOverlap(p.x+4,p.y+4,p.w-8,p.h-8, ex,ey,ew,eh)) continue;

      const wasAbove = (p.y+p.h-p.vy) <= ey+8;
      if (p.vy > 0 && wasAbove) {
        en.dead=true; en.deadTimer=40;
        spawnParticles(ex+ew/2, ey+eh/2);
        p.vy = -11; snd_stomp();
      } else if (p.invincible === 0) {
        p.lives = Math.max(0, p.lives-1);
        drawHearts();
        p.invincible = 90;
        p.vx = (p.x < ex+ew/2) ? -6 : 6; p.vy = -8;
        snd_hurt();
        flashEl.style.background = '#ff000088';
        flashEl.style.transition = 'none'; flashEl.style.opacity = '.5';
        setTimeout(() => { flashEl.style.transition = 'opacity .4s'; flashEl.style.opacity = '0'; }, 80);
        if (p.lives === 0) {
          p.lives = p.maxLives; drawHearts();
          p.dead=true; p.deadTimer=60; p.spawnX=80; p.spawnY=GY-64;
          ENEMIES = buildEnemies();
        }
      }
    }

    if (p.y > GY + GH + 120) {
      p.lives = Math.max(0, p.lives-1); drawHearts(); snd_die();
      p.dead=true; p.deadTimer=60;
      if (p.lives === 0) { p.lives=p.maxLives; drawHearts(); p.spawnX=80; p.spawnY=GY-64; ENEMIES=buildEnemies(); }
    }
    if (p.onGround) { p.spawnX=p.x; p.spawnY=p.y; }
    p.txAnim = Math.max(0, p.txAnim-.04);

    for (let i = PARTICLES.length-1; i >= 0; i--) {
      const pt = PARTICLES[i];
      pt.x+=pt.vx; pt.y+=pt.vy; pt.vy+=.3; pt.life-=.025;
      if (pt.life <= 0) PARTICLES.splice(i, 1);
    }
  }

  function updateCamera() {
    const tx = p.x+p.w/2 - W*.42, ty = p.y+p.h/2 - H*.55;
    camX += (tx-camX)*.10; camY += (ty-camY)*.08;
    camX = Math.max(0, Math.min(WW-W, camX));
    camY = Math.max(-400, Math.min(GY+GH-H, camY));
  }
  function updateAnim() {
    frameT++;
    for (const b of BUTTS) {
      b.t+=.035; b.x+=b.vx; b.y+=b.vy+Math.sin(b.t)*.28;
      if (b.x<55||b.x>960) b.vx*=-1;
      if (b.y<GY-310||b.y>GY-50) b.vy*=-1;
    }
    for (const f of FISH_D) { f.t+=.03; f.x+=f.vx; if(f.x<WX+12||f.x>WX+WW_-55) f.vx*=-1; }
  }

  function sv(x, y) { return {sx: x-camX, sy: y-camY}; }

  // ── DRAW ───────────────────────────────────────────────────────
  function drawSky() {
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#112ca0'); g.addColorStop(.45,'#3fa0e8'); g.addColorStop(1,'#9ad8f7');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    for (let layer=0; layer<3; layer++) {
      const px = (camX*(.15+layer*.1)) % (WW/3);
      ctx.fillStyle = `rgba(${55+layer*15},${80+layer*25},${150+layer*20},${.22-layer*.04})`;
      for (let i=-1; i<9; i++) {
        const mx=i*(W*.4)-px, mh=70+layer*35+Math.sin(i*6.1)*35, mw=200+layer*60;
        ctx.beginPath(); ctx.moveTo(mx,H*.84); ctx.lineTo(mx+mw/2,H*.84-mh); ctx.lineTo(mx+mw,H*.84); ctx.fill();
      }
    }
    const {sx:sx_,sy:sy_} = sv(3700,210);
    if (sx_>-60 && sx_<W+60) {
      const sg = ctx.createRadialGradient(sx_,sy_,5,sx_,sy_,55);
      sg.addColorStop(0,'#ffe566'); sg.addColorStop(1,'rgba(255,187,0,0)');
      ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(sx_,sy_,55,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#ffdd44'; ctx.beginPath(); ctx.arc(sx_,sy_,28,0,Math.PI*2); ctx.fill();
    }
    const {sx:mx,sy:my} = sv(180,170);
    if (mx>-40 && mx<W+40) {
      ctx.fillStyle='#ddeeff'; ctx.beginPath(); ctx.arc(mx,my,22,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#b0cce0'; ctx.beginPath(); ctx.arc(mx+7,my-5,16,0,Math.PI*2); ctx.fill();
    }
  }

  function drawWorld() {
    const {sx:wx,sy:wy} = sv(WX,WY);
    if (wx<W && wx+WW_>0) {
      const wg = ctx.createLinearGradient(0,wy,0,wy+185);
      wg.addColorStop(0,'rgba(48,155,255,.78)'); wg.addColorStop(1,'rgba(18,78,200,.93)');
      ctx.fillStyle=wg; ctx.fillRect(wx,wy,WW_,185);
      ctx.fillStyle='rgba(255,255,255,.12)';
      for (let i=0; i<5; i++) {
        const rx = (frameT*1.7+i*128)%WW_;
        ctx.fillRect(wx+rx, wy+9+i*15, 38+i*10, 5);
      }
      ctx.fillStyle='rgba(160,220,255,.55)'; ctx.fillRect(wx,wy,WW_,9);
    }
    const {sx:gx,sy:gy} = sv(0,GY);
    const gg = ctx.createLinearGradient(0,gy,0,gy+GH);
    gg.addColorStop(0,'#60b838'); gg.addColorStop(.13,'#4c9424');
    gg.addColorStop(.28,'#7a5028'); gg.addColorStop(1,'#503618');
    ctx.fillStyle=gg;
    ctx.fillRect(gx,gy,WX,GH);
    const {sx:gx2} = sv(WX+WW_,GY);
    ctx.fillRect(gx2,gy, WW-(WX+WW_), GH);
    ctx.fillStyle='#74d240';
    for (let x=0; x<WW; x+=10) {
      if (x>WX-8 && x<WX+WW_+8) continue;
      const {sx:bx,sy:by} = sv(x,GY);
      if (bx<-14||bx>W+14) continue;
      const bh = 5+Math.sin(x*.27+frameT*.04)*2;
      ctx.fillRect(bx-1,by-bh,3,bh);
    }
    for (const pl of PLATS) {
      const {sx:px,sy:py} = sv(pl.x,pl.y);
      if (px+pl.w<-10||px>W+10) continue;
      if (pl.cloud) {
        ctx.globalAlpha=.9; ctx.fillStyle='#fff';
        ctx.beginPath(); ctx.ellipse(px+pl.w/2,py+11,pl.w/2,14,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.65)';
        ctx.beginPath(); ctx.ellipse(px+pl.w*.29,py+9,pl.w*.26,10,0,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(px+pl.w*.73,py+8,pl.w*.21,9,0,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
      } else if (pl.lily) {
        ctx.fillStyle='#3aaa3a';
        ctx.beginPath(); ctx.ellipse(px+pl.w/2,py+9,pl.w/2,10,0,0,Math.PI*2); ctx.fill();
        ctx.font='13px serif'; ctx.fillText('🌸',px+pl.w/2-7,py+3);
      } else {
        const pg = ctx.createLinearGradient(px,py,px,py+18);
        pg.addColorStop(0,'#9a6432'); pg.addColorStop(1,'#6b4226');
        ctx.fillStyle=pg; ctx.fillRect(px,py,pl.w,18);
        ctx.fillStyle='#ae7440'; ctx.fillRect(px,py,pl.w,4);
        ctx.strokeStyle='#5a3010'; ctx.lineWidth=1;
        for (let xi=px+18; xi<px+pl.w-4; xi+=18) {
          ctx.beginPath(); ctx.moveTo(xi,py+2); ctx.lineTo(xi,py+18); ctx.stroke();
        }
      }
    }
    ctx.font='20px serif';
    for (const d of DECO) {
      const {sx:dx,sy:dy} = sv(d.x,d.y);
      if (dx<-30||dx>W+30) continue;
      const bob = d.float ? Math.sin(frameT*.038+d.x*.1)*6 : 0;
      if (d.big) { ctx.font='32px serif'; ctx.fillText(d.e,dx-16,dy-6); ctx.font='20px serif'; }
      else ctx.fillText(d.e, dx-10, dy-2+bob);
    }
    ctx.font='15px serif';
    for (const b of BUTTS) {
      const {sx:bx,sy:by} = sv(b.x,b.y);
      if (bx<-22||bx>W+22) continue;
      ctx.save(); ctx.translate(bx,by); ctx.rotate(Math.sin(b.t*8)*.28);
      ctx.fillText('🦋',0,0); ctx.restore();
    }
    ctx.font='17px serif';
    for (const f of FISH_D) {
      const {sx:fx,sy:fy} = sv(f.x,f.y);
      if (fx<-25||fx>W+25) continue;
      ctx.save(); ctx.translate(fx,fy); if(f.vx<0) ctx.scale(-1,1);
      ctx.fillText('🐠',0,Math.sin(f.t*3)*5); ctx.restore();
    }
    const zones = [
      {x:300,y:GY-24,l:'🌸 פרחים'},{x:1300,y:GY-85,l:'🌊 אגם'},
      {x:2150,y:GY-28,l:'🌲 יער'},{x:3300,y:GY-395,l:'⛰️ הר'},
    ];
    ctx.font='bold 14px Arial'; ctx.fillStyle='rgba(255,255,255,.38)'; ctx.textAlign='center';
    for (const z of zones) {
      const {sx:zx,sy:zy} = sv(z.x,z.y);
      if (zx>-90&&zx<W+90) ctx.fillText(z.l,zx,zy);
    }
    ctx.textAlign='left';
  }

  function drawEnemies() {
    ctx.font='36px serif';
    for (const en of ENEMIES) {
      const {sx:ex,sy:ey} = sv(en.x,en.y);
      if (ex<-60||ex>W+60) continue;
      if (en.dead) {
        if (en.deadTimer > 0) {
          ctx.save();
          ctx.globalAlpha = en.deadTimer/40;
          ctx.translate(ex+en.hitW/2, ey+en.hitH/2);
          ctx.rotate(en.deadAngle);
          ctx.scale(1+.6*(1-en.deadTimer/40), 1+.6*(1-en.deadTimer/40));
          ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillText(en.e,0,0);
          ctx.restore();
        }
        continue;
      }
      ctx.fillStyle='rgba(0,0,0,.18)';
      ctx.beginPath(); ctx.ellipse(ex+en.hitW/2, ey+en.hitH+3, en.hitW*.3, 5, 0,0,Math.PI*2); ctx.fill();
      ctx.save();
      ctx.translate(ex+en.hitW/2, ey+en.hitH/2);
      if (en.type==='walker' && en.vx<0) ctx.scale(-1,1);
      const bob = en.type==='floater' ? Math.sin(frameT*.06+en.t)*3 : 0;
      ctx.translate(0,bob);
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(en.e,0,2);
      ctx.restore();
      ctx.fillStyle='#ff2222';
      ctx.beginPath(); ctx.arc(ex+en.hitW*.35, ey+en.hitH*.28, 3,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex+en.hitW*.65, ey+en.hitH*.28, 3,0,Math.PI*2); ctx.fill();
    }
    ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    ctx.font='18px serif'; ctx.textAlign='center';
    for (const pt of PARTICLES) {
      ctx.globalAlpha = pt.life;
      const {sx:px,sy:py} = sv(pt.x,pt.y);
      ctx.fillText(pt.e,px,py);
    }
    ctx.globalAlpha=1; ctx.textAlign='left';
  }

  function drawPlayer() {
    if (p.dead) {
      if (Math.floor(frameT*.18)%2===0) return;
      const {sx:dx,sy:dy} = sv(p.spawnX,p.spawnY);
      ctx.globalAlpha=.4; ctx.font='38px serif'; ctx.textAlign='center';
      ctx.fillText('💫',dx+24,dy+36); ctx.globalAlpha=1; ctx.textAlign='left';
      return;
    }
    if (p.invincible>0 && Math.floor(frameT*.2)%2===0) return;
    const {sx:dx,sy:dy} = sv(p.x,p.y);
    const fm=FORMS[p.form], S=p.w;
    if (p.txAnim > 0) {
      ctx.save(); ctx.globalAlpha=p.txAnim*.55;
      const rg=ctx.createRadialGradient(dx+S/2,dy+S/2,S*.3,dx+S/2,dy+S/2,S*1.5);
      rg.addColorStop(0,fm.col+'cc'); rg.addColorStop(1,'transparent');
      ctx.fillStyle=rg; ctx.beginPath(); ctx.arc(dx+S/2,dy+S/2,S*(1.4+p.txAnim*.4),0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle='rgba(0,0,0,.2)';
    ctx.beginPath(); ctx.ellipse(dx+S/2,dy+S+3,S*.33,5,0,0,Math.PI*2); ctx.fill();
    const sqX=p.onGround?1.12:1, sqY=p.onGround?.90:(p.vy<-2?1.15:1);
    ctx.save();
    ctx.translate(dx+S/2,dy+S/2);
    if (p.facing<0) ctx.scale(-1,1);
    ctx.scale(sqX,sqY);
    ctx.fillStyle=fm.col;
    ctx.beginPath(); ctx.arc(0,0,S*.52,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.lineWidth=3; ctx.stroke();
    ctx.font=`${S*.62}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(fm.e,0,2);
    ctx.restore();
    ctx.font='bold 11px Arial'; ctx.textAlign='center';
    ctx.shadowColor='#0007'; ctx.shadowBlur=4;
    ctx.fillStyle='rgba(255,255,255,.9)';
    ctx.fillText(fm.nm, dx+S/2, dy-7);
    ctx.shadowBlur=0; ctx.textAlign='left';
  }

  // ── LOOP ───────────────────────────────────────────────────────
  function loop() {
    if (screen.classList.contains('active')) {
      update();
      updateEnemies();
      updateCamera();
      updateAnim();
      drawSky();
      drawWorld();
      drawEnemies();
      drawPlayer();
    }
    requestAnimationFrame(loop);
  }
  loop();
})();
