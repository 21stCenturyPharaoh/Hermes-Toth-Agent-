// ROUTES.JS V26.8 - MOSETTA ATTRIBUTION INJECTOR
import AGENTS from "./agents.js";
import BRIDGE from "./bridge.js";

const captureReferral = () => {
  const urlRef = new URLSearchParams(window.location.search).get("ref");
  if (urlRef) AGENTS.MOSETTA.setRef(urlRef);
};

const tagAll = () => {
  document.querySelectorAll("a[href]").forEach((a) => {
    if (a.dataset.mosettaBound === "1") return;

    let href;
    try {
      href = new URL(a.href, window.location.origin);
    } catch {
      return;
    }

    const isPharaohLink =
      href.hostname === "pharaoh-conglomerate.org" ||
      href.hostname.endsWith(".pharaoh-conglomerate.org");

    if (!isPharaohLink) return;

    a.href = AGENTS.MOSETTA.tag(a.href);
    a.dataset.mosettaBound = "1";

    a.addEventListener("click", () => {
      const path = a.href.toLowerCase();
      const type =
        path.includes("/music") ? "music" :
        path.includes("/books") ? "book" :
        path.includes("/store") ? "store" :
        "service";

      BRIDGE.track(a.href, type);
    });
  });
};

captureReferral();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", tagAll);
} else {
  tagAll();
}

const observer = new MutationObserver(tagAll);
observer.observe(document.documentElement, { childList: true, subtree: true });
