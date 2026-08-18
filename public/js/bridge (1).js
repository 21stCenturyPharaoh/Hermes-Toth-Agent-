// BRIDGE.JS V26.8 - WORKER API BRIDGE
const BRIDGE = {
  // Primary Worker URL supplied for the Pharaoh Auto-Delivery system.
  worker: "https://pharaoh-auto-delivery.pharangels.workers.dev",

  async request(path, options = {}) {
    const res = await fetch(`${BRIDGE.worker}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      throw new Error(data.error || data.message || `Worker returned HTTP ${res.status}`);
    }
    return data;
  },

  registerAffiliate: async (formData) => {
    const ref = localStorage.getItem("pharaoh_ref");
    return BRIDGE.request("/register-affiliate", {
      method: "POST",
      body: JSON.stringify({ ...formData, referred_by: ref })
    });
  },

  registerBusiness: async (formData) => {
    const ref = localStorage.getItem("pharaoh_ref");
    return BRIDGE.request("/register-business", {
      method: "POST",
      body: JSON.stringify({
        ...formData,
        referred_by: ref,
        pkg: localStorage.getItem("pkg")
      })
    });
  },

  track: (dest, type) => {
    const ref = localStorage.getItem("pharaoh_ref");
    const payload = JSON.stringify({
      ref,
      source: location.href,
      destination: dest,
      asset_type: type
    });

    if (navigator.sendBeacon) {
      try {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(`${BRIDGE.worker}/track-click`, blob);
        return;
      } catch {}
    }

    fetch(`${BRIDGE.worker}/track-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true
    }).catch(() => {});
  },

  healthCheck: async () => BRIDGE.request("/health"),

  getAffiliates: async () => {
    try {
      return await BRIDGE.request("/affiliates");
    } catch {
      return [];
    }
  }
};

export default BRIDGE;
