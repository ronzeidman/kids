(() => {
  const screen   = document.getElementById('banana-screen');
  if (!screen) return;

  const stage    = screen.querySelector('.bn-stage');
  const personEl = screen.querySelector('.bn-person');
  if (!stage || !personEl) return;

  const PERSON_W   = 64;
  const BANANA_W   = 48;
  const PERSON_SPD = 6;

  let px = 0;
  let isMonkey = false;
  const keys = { left: false, right: false };

  const statusEl = screen.querySelector('.bn-status');

  // Place one banana on the ground
  const bananaEl = document.createElement('div');
  bananaEl.className = 'bn-banana';
  stage.appendChild(bananaEl);

  const reset = () => {
    px = 0;
    isMonkey = false;
    keys.left = keys.right = false;
    personEl.className = 'bn-person';
    personEl.style.transform = 'scaleX(1)';
    bananaEl.style.display = '';
    const sw = stage.offsetWidth || 600;
    bananaEl.style.left = `${Math.floor(sw * 0.85)}px`;
    if (statusEl) statusEl.textContent = '';
  };

  const turnMonkey = () => {
    isMonkey = true;
    bananaEl.style.display = 'none';
    personEl.classList.add('is-monkey');
    if (statusEl) statusEl.textContent = '🐒 הפכת לקוף! אוי אוי אוי!';
  };

  const draw = () => {
    const sw = stage.offsetWidth || 600;
    px = Math.max(0, Math.min(px, sw - PERSON_W));
    personEl.style.left = `${px}px`;
    personEl.classList.toggle('walking', keys.left || keys.right);
    if (keys.left)       personEl.style.transform = `scaleX(-1)`;
    else if (keys.right) personEl.style.transform = `scaleX(1)`;
  };

  const update = () => {
    requestAnimationFrame(update);
    if (keys.left)  px -= PERSON_SPD;
    if (keys.right) px += PERSON_SPD;
    draw();

    // Check touch with banana
    if (!isMonkey) {
      const bx = parseInt(bananaEl.style.left) || 0;
      if (px + PERSON_W > bx && px < bx + BANANA_W) {
        turnMonkey();
      }
    }
  };

  document.addEventListener('keydown', (e) => {
    if (!screen.classList.contains('active')) return;
    if (e.key === 'ArrowLeft')  keys.left  = true;
    if (e.key === 'ArrowRight') keys.right = true;
  });
  document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft')  keys.left  = false;
    if (e.key === 'ArrowRight') keys.right = false;
  });

  // Reset every time the screen becomes active
  const observer = new MutationObserver(() => {
    if (screen.classList.contains('active')) reset();
  });
  observer.observe(screen, { attributes: true, attributeFilter: ['class'] });

  reset();
  requestAnimationFrame(update);
})();
