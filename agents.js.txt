// HERMES-TOTH-AGENT | AGENTS.JS | v27.0 | Full Angel Profiles + Autonomous Synthetic Asset Registry
// Merge of V26.8 loader + V27 asset registry + Sphinx symbolism + Entity Firewall

const AGENTS = {
  HALEL: {
    name: "H.A.L.EL",
    role: "Chief Operations Node",
    emoji: "🧠",
    speaks: true,
    speak(message) {
      if ("speechSynthesis" in window) {
        const voice = new SpeechSynthesisUtterance(message);
        voice.lang = "en-US";
        voice.rate = 0.9;
        window.speechSynthesis.speak(voice);
      }
      console.log("[H.A.L.EL]", message);
    },
    steps: ["Choose Order", "Council assigns Team", "Choose Persona", "Choose Lane"],
    endpoint: "https://angels-hosts-api3.pharangels.workers.dev/"
  },

  TOTH: {
    name: "TOTH",
    role: "Algorithm + Acceleration",
    emoji: "⚡",
    getAffiliateScore(affiliate = {}) {
      return (Number(affiliate.clicks) || 0) * 1.5 + (Number(affiliate.conversions) || 0) * 10;
    },
    routeToNode(category) {
      const routes = {
        Tech: "NodeB",
        Beauty: "NodeC",
        Pharma: "NodeD",
        Landscaping: "NodeE",
        Restaurant: "NodeF",
        Fashion: "NodeG",
        BusinessCenter: "NodeH"
      };
      return routes[category] || "NodeB";
    },
    pipeline() {
      return ["MATCH", "CONNECT", "TRANSACT", "CONFIRM", "REWARD"];
    },
    acceleratorVideo: "https://www.youtube.com/embed/mHBJN0QA8Fo"
  },

  MOSETTA: {
    name: "MOSETTA",
    role: "Eternal Attribution",
    emoji: "🌹",
    getRef() {
      try { return localStorage.getItem("pharaoh_ref"); } catch { return null; }
    },
    setRef(ref) {
      if (!ref) return;
      try { localStorage.setItem("pharaoh_ref", ref); } catch {}
      // also set from URL ?ref= or ?aff_id=
      const params = new URLSearchParams(window.location.search);
      const urlRef = params.get("ref") || params.get("aff_id") || params.get("aff");
      if (urlRef) {
        try { localStorage.setItem("pharaoh_ref", urlRef); } catch {}
      }
    },
    tag(url) {
      const ref = this.getRef();
      if (!ref) return url;
      try {
        const target = new URL(url, window.location.origin);
        target.searchParams.set("ref", ref);
        return target.toString();
      } catch { return url; }
    },
    // Liberia examples
    liberianAffiliates: {
      "MAMAS": "+231886557664",
      "FE_BUSINESS": "+231760953952",
      "V2_BUSINESS": "+231775875765",
      "TECH_BLESSING": "+231775220707",
      "DRUG_STORE": "+231770507876",
      "DERRINAS": "231770734721",
      "MOSETTAS_RESTAURANT": "+231776961800"
    }
  },

  HERMES: {
    name: "Hermes-Toth-Agent",
    role: "Command Orchestration",
    version: "V27.0",
    assets: ["H.A.L.EL", "TOTH", "MOSETTA", "IMHOTEP"],
    entities: {
      commercial: "registry.pharaoh-conglomerate.org",
      charitable: "pharaoh-conglomerate.org",
      creative: "media"
    },
    entityFirewall: true,
    zones: {
      C_CORP: {
        hosts: ["registry.pharaoh-conglomerate.org"],
        allowed: ["Registry data", "Affiliates", "Commercial referrals", "Attribution", "Commercial transaction-status"],
        blocked: ["Volunteer records", "Donation records", "501(c)(3) funds"]
      },
      NGO: {
        hosts: ["pharaoh-conglomerate.org"],
        allowed: ["Volunteer records", "Charitable programs", "Humanitarian projects", "Support records"],
        blocked: ["C-Corp revenue", "Affiliate compensation", "Commercial ledger"]
      }
    },
    workers: {
      delivery: "https://pharaoh-auto-delivery.pharangels.workers.dev/",
      api: "https://angels-hosts-api3.pharangels.workers.dev/",
      commandCenter: "https://21stcenturypharaoh.github.io/Hermes-Toth-Agent-/"
    },
    videoHierarchy: {
      architecture: "dhLboOnPljo",
      centerpiece: "mHBJN0QA8Fo",
      accelerator: "Dk2nBc8_97M"
    }
  },

  IMHOTEP: {
    name: "Imhotep",
    role: "Specialized Autonomous Synthetic Asset",
    emoji: "🏛️",
    symbolism: "Sphinx", // Ankh replaced with Sphinx per build lock
    description: "Autonomous synthetic asset designed for specialized role within ecosystem. Hermes does not replace human organizations. Provides orchestration layer."
  }
};

// Global exposure for Soloist embeds + V26.8 compatibility
window.PHARAOH_AGENTS = AGENTS;
window.HERMES_TOTH = AGENTS.HERMES;
window.TOTH = AGENTS.TOTH;
window.MOSETTA = AGENTS.MOSETTA;
window.HALEL = AGENTS.HALEL;

// V26.8 Compatibility - Keep angels-full loader
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('angels-full');
  if (!container) {
    // Still init attribution from URL even if container missing
    AGENTS.MOSETTA.setRef(new URLSearchParams(window.location.search).get("ref") || new URLSearchParams(window.location.search).get("aff_id"));
    return;
  }

  // Init ref from URL first - Sphinx attribution
  const urlParams = new URLSearchParams(window.location.search);
  const incomingRef = urlParams.get("ref") || urlParams.get("aff_id") || urlParams.get("aff");
  if (incomingRef) AGENTS.MOSETTA.setRef(incomingRef);

  try {
    const res = await fetch('data/agents.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const angels = await res.json();
    
    container.innerHTML = angels.map(angel => `
      <div class="p-6 border rounded-2xl" style="border-color: ${angel.color}50; background: linear-gradient(135deg, ${angel.color}15, transparent);">
        <div class="flex items-center gap-4 mb-4">
          <div class="text-5xl">${angel.emoji || '👼'}</div>
          <div>
            <h2 class="text-2xl font-black" style="color: ${angel.color}">${angel.name}</h2>
            <p class="text-gray-400">${angel.title || AGENTS[angel.id]?.role || ''}</p>
          </div>
        </div>
        <p class="text-gray-300 mb-4">${angel.capability || ''}</p>
        <div class="border-t border-slate-700 pt-3">
          <p class="text-xs text-gray-500 mb-2">Trigger Keywords:</p>
          <div class="flex flex-wrap gap-2">
            ${(angel.keywords || []).map(k => `<span class="px-3 py-1 text-xs rounded-full" style="background: ${angel.color}20; color: ${angel.color};">${k}</span>`).join('')}
          </div>
        </div>
        ${AGENTS.TOTH ? `<div class="mt-3 text-xs text-amber-400/70">TOTH Score: ${AGENTS.TOTH.getAffiliateScore(angel)} | Route: ${AGENTS.TOTH.routeToNode(angel.category || 'Tech')}</div>` : ''}
      </div>
    `).join('');

  } catch (err) {
    container.innerHTML = `<p class="text-red-400 text-center">⚠️ Failed to load angels.json: ${err.message}</p>
    <div class="mt-4 p-4 border border-amber-500/30 rounded-xl bg-amber-500/10">
      <p class="text-amber-400 text-sm">V27 Fallback - Synthetic Assets Loaded:</p>
      <p class="text-gray-300 text-xs mt-2">${Object.values(AGENTS).map(a => `${a.emoji || '🤖'} ${a.name} - ${a.role}`).join('<br>')}</p>
    </div>`;
  }

  // Log orchestration ready
  console.log(`%c HERMES-TOTH-AGENT ${AGENTS.HERMES.version} ACTIVE `, 'background:#D4AF37;color:#000;font-weight:bold;padding:4px 8px;border-radius:4px;');
  console.log(`Entity Firewall: ${AGENTS.HERMES.entityFirewall ? 'ENFORCED' : 'OFF'} | Sphinx Symbolism Locked`);
});

export default AGENTS;
