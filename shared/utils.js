window.GameUtils = {
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  randomChoice(items) {
    return items[Math.floor(Math.random() * items.length)];
  },
};
