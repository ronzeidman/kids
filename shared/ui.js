window.GameUI = {
  goHome() { location.href = '/'; },
  showScreen(name) {
    if (name === 'menu') { window.GameUI.goHome(); return; }
    const target = document.getElementById(`${name}-screen`);
    if (target) target.classList.add('active');
  },
};

document.addEventListener('click', (e) => {
  const back = e.target.closest('[data-back]');
  if (back) { e.preventDefault(); window.GameUI.goHome(); }
});
