/* Hermes-Toth-Agent V27.1 — H.A.L.EL additive bridge
   Safe by design: this module does not replace existing Hermes modules.
   Load it after the existing dashboard/route modules if desired. */
(() => {
  "use strict";
  const base = new URL("../v27/", document.currentScript?.src || location.href);
  const links = [
    ["H.A.L.EL", "halel/"], ["使命 Missions", "halel/missions.html"],
    ["Teams", "halel/teams.html"], ["Orders", "halel/orders.html"],
    ["Consulates", "halel/consulates.html"], ["Gates", "halel/gates.html"],
    ["Corps", "halel/corps.html"], ["Elements", "halel/elements.html"], ["Lore", "halel/lore.html"]
  ];
  function mount() {
    const host = document.querySelector("[data-halel-v27]") || document.querySelector("main") || document.body;
    if (document.getElementById("halel-v27-nav")) return;
    const nav = document.createElement("section");
    nav.id = "halel-v27-nav";
    nav.setAttribute("aria-label","H.A.L.EL V27.1");
    nav.style.cssText = "margin:20px 0;padding:18px;border:1px solid #3b3220;border-radius:14px;background:#111;color:#f5f0df";
    nav.innerHTML = '<div style="color:#d7b45a;letter-spacing:.12em;text-transform:uppercase;font-size:.78rem">H.A.L.EL V27.1 · 公益 · 智慧 · 连接</div><h2 style="color:#f0d88a;margin:.35rem 0">Game Mode Command Layer</h2><p style="color:#b9b29f">The LARP is a game. The real Volunteer Exchange remains the operational system.</p><div id="halel-v27-links" style="display:flex;flex-wrap:wrap;gap:8px"></div>';
    host.appendChild(nav);
    const box = nav.querySelector("#halel-v27-links");
    links.forEach(([label,path]) => {
      const a=document.createElement("a");
      a.href=new URL(path,base).href;
      a.textContent=label;
      a.style.cssText="color:#f0d88a;text-decoration:none;border:1px solid #3b3220;padding:7px 10px;border-radius:8px";
      box.appendChild(a);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();