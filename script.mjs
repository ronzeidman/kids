import { initShooter } from './games/shooter/game.js';

const files = [
  './shared/utils.js',
  './shared/ui.js',
  './games/invisible-maze/game.js',
  './games/mushrooms/game.js',
];

const loadScript = (src) => new Promise((resolve, reject) => {
  const script = document.createElement('script');
  script.src = src;
  script.onload = resolve;
  script.onerror = reject;
  document.body.appendChild(script);
});

for (const file of files) {
  // eslint-disable-next-line no-await-in-loop
  await loadScript(file);
}

initShooter();
