// HEALTH.JS V26.8 - SIMPLE WORKER HEALTH PANEL
import BRIDGE from "./bridge.js";

export async function checkWorkerHealth(targetId = "worker-health") {
  const target = document.getElementById(targetId);
  if (!target) return;

  try {
    const data = await BRIDGE.healthCheck();
    target.textContent = `WORKER ONLINE: ${JSON.stringify(data)}`;
  } catch (error) {
    target.textContent = `WORKER CHECK FAILED: ${error.message}`;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => checkWorkerHealth());
} else {
  checkWorkerHealth();
}
