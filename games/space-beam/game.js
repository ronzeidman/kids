(() => {
  const canvas = document.getElementById('sb-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const W = 480, H = 288;
  const GRAVITY = 0.45;
  const JUMP_V  = -10;
  const SPEED   = 3;
  const PW = 24, PH = 40;

  /* ---- boss every 5th level (0-indexed: 4, 9, 14 …) ---- */
  const isBossLevel = lv => (lv + 1) % 5 === 0;

  /* ---- regular levels (cycled) ---- */
  const LEVELS = [
    {
      platforms: [
        {x:0,y:256,w:480,h:32},
        {x:100,y:200,w:100,h:12},
        {x:260,y:168,w:100,h:12},
        {x:380,y:128,w:90,h:12},
      ],
      enemies: [
        {x:60, y:228,dir: 1,range:80,speed:1.3},
        {x:200,y:228,dir:-1,range:80,speed:1.3},
        {x:340,y:228,dir: 1,range:80,speed:1.5},
        {x:110,y:172,dir: 1,range:55,speed:1.4},
        {x:270,y:140,dir:-1,range:55,speed:1.6},
        {x:390,y:100,dir: 1,range:50,speed:1.8},
      ],
      powerups: [{x:155,y:188,type:'⭐'},{x:295,y:155,type:'🛡️'}],
      ship: {x:400,y:88},
    },
    {
      platforms: [
        {x:0,y:256,w:180,h:32},{x:240,y:256,w:240,h:32},
        {x:80, y:206,w:90,h:12},{x:220,y:185,w:90,h:12},
        {x:360,y:155,w:90,h:12},{x:130,y:120,w:90,h:12},
      ],
      enemies: [
        {x:30, y:228,dir: 1,range:70,speed:1.4},
        {x:130,y:228,dir:-1,range:60,speed:1.5},
        {x:270,y:228,dir: 1,range:70,speed:1.6},
        {x:400,y:228,dir:-1,range:60,speed:1.4},
        {x:85, y:178,dir: 1,range:50,speed:1.7},
        {x:230,y:157,dir:-1,range:55,speed:1.8},
        {x:370,y:127,dir: 1,range:50,speed:2.0},
        {x:140,y:92, dir:-1,range:50,speed:2.0},
      ],
      powerups: [{x:105,y:194,type:'⭐'},{x:255,y:173,type:'🔥'},{x:155,y:108,type:'🛡️'}],
      ship: {x:150,y:80},
    },
    {
      platforms: [
        {x:0,y:256,w:480,h:32},
        {x:50, y:215,w:80,h:12},{x:180,y:195,w:80,h:12},
        {x:310,y:175,w:80,h:12},{x:100,y:145,w:80,h:12},
        {x:250,y:120,w:80,h:12},{x:380,y:95, w:80,h:12},
        {x:160,y:68, w:80,h:12},
      ],
      enemies: [
        {x:40, y:228,dir: 1,range:60,speed:1.6},
        {x:160,y:228,dir:-1,range:60,speed:1.7},
        {x:290,y:228,dir: 1,range:60,speed:1.8},
        {x:420,y:228,dir:-1,range:50,speed:1.9},
        {x:55, y:187,dir: 1,range:45,speed:2.0},
        {x:190,y:167,dir:-1,range:45,speed:2.0},
        {x:315,y:147,dir: 1,range:45,speed:2.1},
        {x:105,y:117,dir:-1,range:45,speed:2.1},
        {x:255,y:92, dir: 1,range:45,speed:2.2},
        {x:385,y:67, dir:-1,range:40,speed:2.3},
      ],
      powerups: [
        {x:75,y:203,type:'⭐'},{x:215,y:183,type:'🔥'},
        {x:345,y:163,type:'🛡️'},{x:270,y:108,type:'⭐'},
      ],
      ship: {x:175,y:28},
    },
    {
      platforms: [
        {x:0,y:256,w:480,h:32},
        {x:30, y:220,w:70,h:12},{x:140,y:200,w:70,h:12},
        {x:250,y:180,w:70,h:12},{x:360,y:160,w:70,h:12},
        {x:60, y:140,w:70,h:12},{x:180,y:120,w:70,h:12},
        {x:300,y:100,w:70,h:12},{x:400,y:75, w:70,h:12},
      ],
      enemies: [
        {x:40, y:228,dir: 1,range:55,speed:1.7},
        {x:140,y:228,dir:-1,range:55,speed:1.8},
        {x:250,y:228,dir: 1,range:55,speed:1.9},
        {x:370,y:228,dir:-1,range:55,speed:2.0},
        {x:40, y:208,dir: 1,range:40,speed:2.0},
        {x:155,y:188,dir:-1,range:40,speed:2.1},
        {x:265,y:168,dir: 1,range:40,speed:2.2},
        {x:375,y:148,dir:-1,range:40,speed:2.2},
        {x:70, y:128,dir: 1,range:40,speed:2.3},
        {x:195,y:108,dir:-1,range:40,speed:2.3},
        {x:315,y:88, dir: 1,range:40,speed:2.4},
      ],
      powerups: [
        {x:55,y:208,type:'⭐'},{x:200,y:168,type:'🔥'},
        {x:310,y:88,type:'🛡️'},{x:410,y:63,type:'🔥'},
      ],
      ship: {x:410,y:35},
    },
  ];

  /* ---- boss arena layout ---- */
  const BOSS_ARENA = {
    platforms: [
      {x:0,  y:256,w:480,h:32},
      {x:30, y:190,w:110,h:12},
      {x:340,y:190,w:110,h:12},
      {x:170,y:135,w:140,h:12},
    ],
    powerups: [
      {x:50, y:178,type:'⭐'},
      {x:350,y:178,type:'🔥'},
      {x:185,y:123,type:'🛡️'},
    ],
    ship: {x:210,y:95},
  };

  /* ---- state ---- */
  let level, player, enemies, powerups, fireballs, flashes, stars, lives,
      beaming, beamY, boss, bossShipVisible;

  const mkPlayer = () => {
    const plats = isBossLevel(level) ? BOSS_ARENA.platforms : LEVELS[level % LEVELS.length].platforms;
    return {
      x:40, y: plats[0].y - PH,
      vx:0, vy:0, onGround:false, facing:1, inv:0,
      power:null, powerTimer:0, shield:false,
    };
  };

  const mkBoss = () => {
    const bossNum = Math.floor((level + 1) / 5);
    const hp = 2 + bossNum;
    return {
      x:210, y:208,
      vx:2.8, vy:0,
      w:52, h:52,
      hp, maxHp:hp,
      inv:0, onGround:false,
      jumpTimer:100,
      angry: false,
    };
  };

  const startLevel = (lv) => {
    level    = lv;
    beaming  = false;
    beamY    = 0;
    boss     = null;
    bossShipVisible = false;
    fireballs = [];
    flashes   = [];
    lives     = lives ?? 3;
    stars     = stars ?? Array.from({length:55}, () => ({
      x:Math.random()*W, y:Math.random()*H,
      r:Math.random()*1.3+0.3, phase:Math.random()*Math.PI*2,
    }));
    player = mkPlayer();

    if (isBossLevel(lv)) {
      enemies  = [];
      powerups = BOSS_ARENA.powerups.map(p=>({...p,w:22,h:22,collected:false}));
      boss     = mkBoss();
    } else {
      const ld = LEVELS[lv % LEVELS.length];
      enemies  = ld.enemies.map(e=>({...e,startX:e.x,w:28,h:28,dead:false,vx:e.dir*1.4}));
      powerups = ld.powerups.map(p=>({...p,w:22,h:22,collected:false}));
    }
  };

  /* ---- input ---- */
  const keys = {left:false,right:false};
  let jumpTap=false, fireTap=false;

  document.addEventListener('keydown', e=>{
    if (!active()) return;
    if (e.key==='ArrowLeft')  keys.left =true;
    if (e.key==='ArrowRight') keys.right=true;
    if ((e.key==='ArrowUp'||e.key===' ')&&!jumpTap){jumpTap=true;e.preventDefault();}
    if (e.key==='z'||e.key==='Z') fireTap=true;
    if (['ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
  });
  document.addEventListener('keyup', e=>{
    if (e.key==='ArrowLeft')  keys.left =false;
    if (e.key==='ArrowRight') keys.right=false;
  });

  ['sb-btn-left','sb-btn-right','sb-btn-jump'].forEach(id=>{
    const el=document.getElementById(id); if (!el) return;
    el.addEventListener('pointerdown',e=>{
      e.preventDefault();
      if (id==='sb-btn-left')  keys.left=true;
      if (id==='sb-btn-right') keys.right=true;
      if (id==='sb-btn-jump')  jumpTap=true;
    });
    ['pointerup','pointerleave'].forEach(ev=>el.addEventListener(ev,e=>{
      e.preventDefault();
      if (id==='sb-btn-left')  keys.left=false;
      if (id==='sb-btn-right') keys.right=false;
    }));
  });

  /* ---- helpers ---- */
  const active = ()=>document.getElementById('spacebeam-screen')?.classList.contains('active');
  const hit=(ax,ay,aw,ah,bx,by,bw,bh)=>ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by;

  const getPlatforms = ()=> isBossLevel(level) ? BOSS_ARENA.platforms : LEVELS[level%LEVELS.length].platforms;
  const getShip      = ()=> isBossLevel(level) ? BOSS_ARENA.ship       : LEVELS[level%LEVELS.length].ship;

  /* ---- update ---- */
  const update = ()=>{
    if (beaming){beamY-=3;return;}

    const plats = getPlatforms();
    const spd   = player.power==='star'?SPEED*1.5:SPEED;
    player.vx   = keys.left?-spd:keys.right?spd:0;
    if (keys.left)  player.facing=-1;
    if (keys.right) player.facing= 1;

    if (jumpTap&&player.onGround){player.vy=JUMP_V;player.onGround=false;}
    if (fireTap&&player.power==='fire') shootFire();
    jumpTap=false; fireTap=false;

    player.vy+=GRAVITY;
    player.x +=player.vx;
    player.y +=player.vy;
    player.x  =Math.max(0,Math.min(W-PW,player.x));

    player.onGround=false;
    for (const p of plats){
      const prev=player.y+PH-player.vy;
      if (player.vy>=0&&player.x+PW>p.x&&player.x<p.x+p.w&&
          player.y+PH>=p.y&&prev<=p.y+4){
        player.y=p.y-PH;player.vy=0;player.onGround=true;
      }
    }
    if (player.y>H+60){loseLife();return;}
    if (player.inv>0) player.inv--;
    if (player.powerTimer>0){player.powerTimer--;if(player.powerTimer===0)player.power=null;}

    /* fireballs */
    for (let i=fireballs.length-1;i>=0;i--){
      const fb=fireballs[i];
      fb.x+=fb.vx;
      if (fb.x<-20||fb.x>W+20){fireballs.splice(i,1);continue;}
      let used=false;
      /* hit boss */
      if (boss&&boss.hp>0&&boss.inv===0&&hit(fb.x,fb.y,fb.w,fb.h,boss.x,boss.y,boss.w,boss.h)){
        hitBoss(1); flashes.push({x:boss.x+boss.w/2,y:boss.y+boss.h/2,t:30});
        fireballs.splice(i,1); used=true;
      }
      if (used) continue;
      /* hit enemy */
      for (const e of enemies){
        if (e.dead) continue;
        if (hit(fb.x,fb.y,fb.w,fb.h,e.x,e.y,e.w,e.h)){
          e.dead=true;flashes.push({x:e.x+e.w/2,y:e.y+e.h/2,t:35});
          fireballs.splice(i,1);used=true;break;
        }
      }
    }

    /* powerups */
    for (const p of powerups){
      if (p.collected) continue;
      if (!hit(player.x,player.y,PW,PH,p.x,p.y,p.w,p.h)) continue;
      p.collected=true;
      if (p.type==='⭐'){player.power='star';player.powerTimer=360;}
      if (p.type==='🔥'){player.power='fire';player.powerTimer=480;}
      if (p.type==='🛡️'){player.shield=true;}
    }

    /* regular enemies */
    for (const e of enemies){
      if (e.dead) continue;
      e.x+=e.vx*(e.speed||1);
      if (e.x<e.startX-e.range||e.x+e.w>e.startX+e.range) e.vx*=-1;
      if (player.inv>0) continue;
      if (!hit(player.x,player.y,PW,PH,e.x,e.y,e.w,e.h)) continue;
      if (player.power==='star'){e.dead=true;flashes.push({x:e.x+e.w/2,y:e.y+e.h/2,t:35});continue;}
      const stomp=player.vy>0&&(player.y+PH-player.vy)<=e.y+8;
      if (stomp){e.dead=true;flashes.push({x:e.x+e.w/2,y:e.y+e.h/2,t:35});player.vy=JUMP_V*0.55;}
      else loseLife();
    }

    /* boss update */
    if (boss&&boss.hp>0) updateBoss(plats);

    /* ship */
    const s=getShip();
    const shipReady = !isBossLevel(level)||(isBossLevel(level)&&bossShipVisible);
    if (shipReady&&hit(player.x,player.y,PW,PH,s.x,s.y,36,44)){
      beaming=true; beamY=player.y+PH/2;
      setTimeout(()=>startLevel(level+1),2200);
    }
  };

  const updateBoss = (plats)=>{
    boss.vy+=GRAVITY;
    boss.x +=boss.vx;
    boss.y +=boss.vy;

    boss.onGround=false;
    for (const p of plats){
      const prev=boss.y+boss.h-boss.vy;
      if (boss.vy>=0&&boss.x+boss.w>p.x&&boss.x<p.x+p.w&&
          boss.y+boss.h>=p.y&&prev<=p.y+4){
        boss.y=p.y-boss.h;boss.vy=0;boss.onGround=true;
      }
    }
    if (boss.x<0){boss.x=0;boss.vx=Math.abs(boss.vx);}
    if (boss.x+boss.w>W){boss.x=W-boss.w;boss.vx=-Math.abs(boss.vx);}
    if (boss.y>H+60) boss.y=boss.y; // never fall off

    boss.angry = boss.hp <= Math.ceil(boss.maxHp/2);
    if (boss.inv>0) boss.inv--;

    boss.jumpTimer--;
    if (boss.jumpTimer<=0&&boss.onGround){
      boss.vy=JUMP_V*(boss.angry?1.2:1.0);
      boss.vx=(player.x>boss.x?1:-1)*Math.abs(boss.vx)*(boss.angry?1.3:1.0);
      boss.jumpTimer=boss.angry?65:100;
    }

    if (player.inv>0) return;
    if (!hit(player.x,player.y,PW,PH,boss.x,boss.y,boss.w,boss.h)) return;
    if (player.power==='star'){hitBoss(1);flashes.push({x:boss.x+boss.w/2,y:boss.y+boss.h/2,t:30});return;}
    const stomp=player.vy>0&&(player.y+PH-player.vy)<=boss.y+12;
    if (stomp&&boss.inv===0){
      hitBoss(1);player.vy=JUMP_V*0.65;
      flashes.push({x:boss.x+boss.w/2,y:boss.y+boss.h/2,t:35});
    } else if (!stomp&&boss.inv===0){
      loseLife();
    }
  };

  const hitBoss = (dmg)=>{
    boss.hp-=dmg;
    boss.inv=55;
    if (boss.hp<=0){
      boss.hp=0;
      for (let i=0;i<8;i++) flashes.push({x:boss.x+boss.w/2+(Math.random()-0.5)*40,y:boss.y+boss.h/2+(Math.random()-0.5)*40,t:50+i*5});
      setTimeout(()=>{bossShipVisible=true;},800);
    }
  };

  const shootFire=()=>{
    fireballs.push({x:player.x+PW/2,y:player.y+PH/2-6,vx:player.facing*7,w:16,h:16});
  };

  const loseLife=()=>{
    if (player.shield){player.shield=false;player.inv=90;return;}
    lives=Math.max(0,lives-1);
    if (lives===0){lives=3;startLevel(level);}
    else{player=mkPlayer();player.inv=90;}
  };

  /* ---- draw ---- */
  const draw=()=>{
    const now=Date.now();
    ctx.fillStyle='#07071a';ctx.fillRect(0,0,W,H);

    /* stars */
    for (const s of stars){
      ctx.globalAlpha=0.4+0.5*Math.sin(now/800+s.phase);
      ctx.fillStyle='#fff';
      ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;

    /* platforms */
    const plats=getPlatforms();
    for (const p of plats){
      ctx.fillStyle = isBossLevel(level)?'#3a1a1a':'#1a3a6a';
      ctx.fillRect(p.x,p.y,p.w,p.h);
      ctx.fillStyle = isBossLevel(level)?'#aa3333':'#3a6aaa';
      ctx.fillRect(p.x,p.y,p.w,3);
    }

    /* boss background tint */
    if (isBossLevel(level)){
      ctx.fillStyle='rgba(80,0,0,0.18)';ctx.fillRect(0,0,W,H);
    }

    /* powerups */
    ctx.textAlign='center';ctx.textBaseline='middle';
    for (const p of powerups){
      if (p.collected) continue;
      ctx.font='20px serif';
      ctx.fillText(p.type,p.x+p.w/2,p.y+p.h/2+Math.sin(now/500+p.x)*3);
    }

    /* fireballs */
    for (const fb of fireballs){ctx.font='16px serif';ctx.fillText('🔥',fb.x,fb.y);}

    /* ship */
    const s=getShip();
    const showShip=beaming||(isBossLevel(level)?bossShipVisible:true);
    if (showShip){
      ctx.font='34px serif';
      ctx.fillText('🚀',s.x+18,s.y+22+Math.sin(now/600)*3);
      if (beaming){
        const grad=ctx.createLinearGradient(s.x+18,0,s.x+18,s.y+22);
        grad.addColorStop(0,'rgba(80,200,255,0)');
        grad.addColorStop(1,'rgba(160,230,255,0.85)');
        ctx.fillStyle=grad;ctx.fillRect(s.x+2,0,32,s.y+22);
        ctx.font='28px serif';ctx.fillText('🧍',s.x+18,beamY);
      }
    }

    /* enemies */
    for (const e of enemies){
      if (e.dead) continue;
      const emoji=e.speed<=1.5?'👾':e.speed<=1.9?'🤖':'👽';
      ctx.font='26px serif';ctx.save();
      if (e.vx<0){ctx.scale(-1,1);ctx.fillText(emoji,-(e.x+e.w/2),e.y+e.h/2);}
      else        {               ctx.fillText(emoji,  e.x+e.w/2,  e.y+e.h/2);}
      ctx.restore();
    }

    /* boss */
    if (boss&&boss.hp>0){
      const bFlicker=boss.inv>0&&Math.floor(boss.inv/6)%2===0;
      if (!bFlicker){
        ctx.font=`${boss.angry?50:44}px serif`;
        ctx.save();
        if (boss.angry){ctx.shadowColor='#ff3300';ctx.shadowBlur=16;}
        if (boss.vx<0){ctx.scale(-1,1);ctx.fillText('👹',-(boss.x+boss.w/2),boss.y+boss.h/2);}
        else           {               ctx.fillText('👹',  boss.x+boss.w/2,  boss.y+boss.h/2);}
        ctx.shadowBlur=0;ctx.restore();
      }
      /* boss HP bar */
      const bw=160, bx=(W-bw)/2, by=16;
      ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(bx-2,by-2,bw+4,16);
      const pct=boss.hp/boss.maxHp;
      ctx.fillStyle=pct>0.5?'#44ee44':pct>0.25?'#ffaa00':'#ff2200';
      ctx.fillRect(bx,by,bw*pct,12);
      ctx.strokeStyle='#ffffff';ctx.lineWidth=1;ctx.strokeRect(bx,by,bw,12);
      ctx.font='bold 10px sans-serif';ctx.fillStyle='#fff';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(`👹 בוס  ${boss.hp}/${boss.maxHp}`,W/2,by+6);
    }

    /* flashes */
    for (let i=flashes.length-1;i>=0;i--){
      const f=flashes[i];
      ctx.globalAlpha=f.t/50;ctx.font='22px serif';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('💥',f.x,f.y);f.t--;
      if (f.t<=0)flashes.splice(i,1);
    }
    ctx.globalAlpha=1;

    /* player */
    if (!beaming){
      const flicker=player.inv>0&&Math.floor(player.inv/5)%2===0;
      if (!flicker){
        if (player.power==='star'){ctx.shadowColor='#ffee00';ctx.shadowBlur=12;}
        else if (player.power==='fire'){ctx.shadowColor='#ff6600';ctx.shadowBlur=10;}
        else if (player.shield){ctx.shadowColor='#44aaff';ctx.shadowBlur=10;}
        ctx.font='28px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.save();
        if (player.facing<0){ctx.scale(-1,1);ctx.fillText('🧍',-(player.x+PW/2),player.y+PH/2);}
        else                {               ctx.fillText('🧍',  player.x+PW/2,  player.y+PH/2);}
        ctx.restore();ctx.shadowBlur=0;ctx.shadowColor='transparent';
      }
    }

    /* power bar */
    if (player.power&&player.powerTimer>0){
      const icon=player.power==='star'?'⭐':'🔥';
      const pct=player.powerTimer/(player.power==='star'?360:480);
      ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(6,22,80,12);
      ctx.fillStyle=player.power==='star'?'#ffdd00':'#ff6600';ctx.fillRect(6,22,80*pct,12);
      ctx.font='11px sans-serif';ctx.textAlign='left';ctx.textBaseline='top';
      ctx.fillStyle='#fff';ctx.fillText(icon+' כוח!',8,22);
    }
    if (player.shield){ctx.font='13px serif';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('🛡️',6,36);}

    /* HUD */
    ctx.shadowBlur=0;
    ctx.font='bold 13px sans-serif';
    ctx.fillStyle = isBossLevel(level)?'#ff8888':'#88ccff';
    ctx.textAlign='left';ctx.textBaseline='top';
    ctx.fillText(isBossLevel(level)?`👹 שלב בוס ${Math.floor((level+1)/5)}`:`שלב ${level+1}`,8,6);
    ctx.textAlign='right';ctx.font='14px serif';
    ctx.fillText('❤️'.repeat(Math.max(0,lives)),W-6,6);
  };

  /* ---- loop ---- */
  let last=0;
  const loop=ts=>{
    if (ts-last>=16){if(active()){update();draw();}last=ts;}
    requestAnimationFrame(loop);
  };

  startLevel(0);
  requestAnimationFrame(loop);
})();
