// ============================================================
// save.js — localStorage save system
// ============================================================

const Save = {
  KEY: 'fnaf-save',

  defaults: {
    night: 1,        // highest night unlocked
    stars: 0,        // bitmask: bit 0 = night1 star, etc.
    customDifficulty: { freddy: 0, bonnie: 0, chica: 0, foxy: 0 }
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return Object.assign({}, this.defaults);
      return Object.assign({}, this.defaults, JSON.parse(raw));
    } catch { return Object.assign({}, this.defaults); }
  },

  save(data) {
    try { localStorage.setItem(this.KEY, JSON.stringify(data)); }
    catch { console.warn('Save failed'); }
  },

  reset() {
    localStorage.removeItem(this.KEY);
    return Object.assign({}, this.defaults);
  },

  // Award a star for completing a night
  awardStar(data, night) {
    data.stars |= (1 << (night - 1));
    // Unlock next night
    if (night >= data.night && night < 7) data.night = night + 1;
    this.save(data);
    return data;
  },

  hasStar(data, night) {
    return !!(data.stars & (1 << (night - 1)));
  },

  isNightUnlocked(data, night) {
    if (night <= 1) return true;
    return data.night >= night;
  }
};
