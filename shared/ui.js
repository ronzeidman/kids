window.GameUI = {
  showScreen(name) {
    document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
    const target = document.getElementById(`${name}-screen`);
    if (target) target.classList.add('active');
  },

  bindNavigation() {
    document.querySelectorAll('[data-game]').forEach((btn) => {
      btn.addEventListener('click', () => window.GameUI.showScreen(btn.dataset.game));
    });
    document.querySelectorAll('[data-back]').forEach((btn) => {
      btn.addEventListener('click', () => window.GameUI.showScreen('menu'));
    });
  },
};

window.GameUI.bindNavigation();
