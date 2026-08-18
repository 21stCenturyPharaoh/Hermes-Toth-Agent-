// DASHBOARD.JS V26.8 - H.A.L.EL COMMAND DASHBOARD
import AGENTS from "./agents.js";
import BRIDGE from "./bridge.js";

const escapeHTML = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export async function loadDashboard() {
  const dashboard = document.getElementById("dashboard");
  if (!dashboard) return;

  dashboard.innerHTML = "<p>H.A.L.EL is connecting to the Worker...</p>";

  const [statusResult, affiliateResult] = await Promise.allSettled([
    BRIDGE.healthCheck(),
    BRIDGE.getAffiliates()
  ]);

  const status =
    statusResult.status === "fulfilled"
      ? statusResult.value
      : { error: statusResult.reason?.message || "Health check unavailable" };

  const affiliates =
    affiliateResult.status === "fulfilled" && Array.isArray(affiliateResult.value)
      ? affiliateResult.value
      : [];

  const sorted = [...affiliates].sort(
    (a, b) =>
      AGENTS.TOTH.getAffiliateScore(b) -
      AGENTS.TOTH.getAffiliateScore(a)
  );

  dashboard.innerHTML = `
    <section>
      <h2>ASA LEADERBOARD</h2>
      ${
        sorted.length
          ? sorted.slice(0, 10).map((a) => `
              <div class="asa-card">
                <b>${escapeHTML(a.affiliate_id || "Unknown")}</b>
                | Score: ${AGENTS.TOTH.getAffiliateScore(a)}
                | Clicks: ${Number(a.clicks) || 0}
                | Conversions: ${Number(a.conversions) || 0}
                <button type="button"
                  class="ha-voice"
                  data-affiliate="${escapeHTML(a.affiliate_id || "Unknown")}">
                  VOICE
                </button>
              </div>
            `).join("")
          : "<p>No affiliate records returned yet. Worker/KV integration can be connected next.</p>"
      }
    </section>

    <section>
      <h2>WORKER STATUS</h2>
      <pre>${escapeHTML(JSON.stringify(status, null, 2))}</pre>
    </section>
  `;

  dashboard.querySelectorAll(".ha-voice").forEach((button) => {
    button.addEventListener("click", () => {
      AGENTS.HALEL.speak(
        `Affiliate ${button.dataset.affiliate} active`
      );
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadDashboard);
} else {
  loadDashboard();
}
