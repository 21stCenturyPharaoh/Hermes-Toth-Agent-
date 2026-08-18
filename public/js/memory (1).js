// MEMORY.JS V26.8 - LOCAL MEMORY
const MEMORY = {
  set: (key, val) => {
    localStorage.setItem(`pharaoh_${key}`, JSON.stringify(val));
  },

  get: (key) => {
    const item = localStorage.getItem(`pharaoh_${key}`);
    if (!item) return null;
    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  },

  remove: (key) => localStorage.removeItem(`pharaoh_${key}`),

  explainerPref: () => MEMORY.get("explainer") || "full",

  setExplainer: (mode) => MEMORY.set("explainer", mode)
};

export default MEMORY;
