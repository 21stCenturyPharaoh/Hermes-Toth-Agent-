// AGENTS.JS V26.8 - PLATFORM CORE
const AGENTS = {
  HALEL: {
    name: "H.A.L.EL",
    role: "Chief Operations Node",
    speak: (msg) => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(msg);
        u.lang = "en-US";
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
      }
      console.log(`[H.A.L.EL]: ${msg}`);
    },
    alert: (type, data = {}) => {
      AGENTS.HALEL.speak(`New ${type} activated. ID ${data.id || "pending"}`);
    }
  },
  TOTH: {
    name: "TOTH",
    role: "Algorithm + Acceleration",
    getAffiliateScore: (aff = {}) =>
      (Number(aff.clicks) || 0) * 1.5 + (Number(aff.conversions) || 0) * 10,
    routeToNode: (category) => {
      const map = { Tech: "NodeB", Beauty: "NodeC", Pharma: "NodeD", Landscaping: "NodeE" };
      return map[category] || "NodeB";
    }
  },
  MOSETTA: {
    name: "MOSETTA",
    role: "Eternal Attribution",
    getRef: () => localStorage.getItem("pharaoh_ref"),
    setRef: (ref) => {
      if (ref) localStorage.setItem("pharaoh_ref", String(ref).trim());
    },
    tag: (url) => {
      const ref = AGENTS.MOSETTA.getRef();
      if (!ref) return url;
      const u = new URL(url, window.location.origin);
      u.searchParams.set("ref", ref);
      return u.toString();
    }
  }
};
export default AGENTS;
