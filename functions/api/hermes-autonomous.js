/**
 * HERMES-TOTH AUTONOMOUS SYNTHETIC WORKFLOW
 * Central orchestration layer for the Pharaoh ecosystem.
 */

const HERMES = {
  name: "Hermes-Toth",
  role: "orchestrator",
  mode: "autonomous-synthetic-workflow",
  version: "1.0.0"
};

const ENTITIES = {
  COMMERCIAL: "commercial",
  NONPROFIT: "nonprofit"
};

const COMMERCIAL_PILLARS = ["pharaoh-library", "microphone-kingdom", "pharaoh-registry"];
const NONPROFIT_PILLARS = ["hall-el"];

const EVENTS = {
  CONTENT_CREATED: "content.created",
  CAMPAIGN_CREATED: "campaign.created",
  EMAIL_REQUESTED: "email.requested",
  NOTIFICATION_REQUESTED: "notification.requested",
  MEDIA_REQUESTED: "media.requested",
  TRACKING_EVENT: "tracking.event",
  LEAD_CREATED: "lead.created",
  REGISTRY_SIGNUP: "registry.signup",
  ALERT_REQUESTED: "alert.requested"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=UTF-8", "cache-control": "no-store" }
  });
}
function requestId() { return crypto.randomUUID(); }
function now() { return new Date().toISOString(); }

function normalizeEntity(entity) {
  return entity === ENTITIES.NONPROFIT ? ENTITIES.NONPROFIT : ENTITIES.COMMERCIAL;
}
function normalizePillar(pillar) {
  return [...COMMERCIAL_PILLARS, ...NONPROFIT_PILLARS].includes(pillar) ? pillar : "pharaoh-registry";
}
function normalizeEvent(input = {}) {
  return {
    id: requestId(),
    timestamp: now(),
    entity: normalizeEntity(input.entity),
    pillar: normalizePillar(input.pillar),
    event: String(input.event || EVENTS.CONTENT_CREATED),
    campaign: input.campaign || null,
    source: input.source || "hermes",
    payload: input.payload && typeof input.payload === "object" ? input.payload : {},
    approved: input.approved === true
  };
}

async function remember(env, key, value) {
  if (!env.HERMES_MEMORY) return { stored: false, reason: "HERMES_MEMORY binding unavailable" };
  await env.HERMES_MEMORY.put(key, JSON.stringify(value));
  return { stored: true, key };
}
async function recall(env, key) {
  if (!env.HERMES_MEMORY) return null;
  const value = await env.HERMES_MEMORY.get(key);
  if (!value) return null;
  try { return JSON.parse(value); } catch { return value; }
}
async function callWorker(binding, path, payload) {
  if (!binding) return { ok: false, error: "Service binding unavailable" };
  try {
    const response = await binding.fetch(new Request(`https://internal${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    }));
    const text = await response.text();
    let data; try { data = JSON.parse(text); } catch { data = { response: text }; }
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
async function routeDelivery(event, env) {
  switch (event.event) {
    case EVENTS.EMAIL_REQUESTED:
      return await callWorker(env.AUTO_DELIVERY, "/internal/email", event);
    case EVENTS.NOTIFICATION_REQUESTED:
      return await callWorker(env.AUTO_DELIVERY, "/internal/notification", event);
    default:
      return { ok: true, routed: false, reason: "No delivery action required" };
  }
}
async function routeHosting(event, env) {
  switch (event.event) {
    case EVENTS.MEDIA_REQUESTED:
      return await callWorker(env.ANGELS_HOSTS, "/internal/media", event);
    default:
      return { ok: true, routed: false, reason: "No hosting action required" };
  }
}

// --- THIS IS WHAT WAS MISSING ---
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (request.method === "GET") {
    return json({
      hermes: HERMES,
      status: "online",
      timestamp: now(),
      pillars: { commercial: COMMERCIAL_PILLARS, nonprofit: NONPROFIT_PILLARS },
      endpoints: { POST: "/api/hermes-autonomous" }
    });
  }

  if (request.method === "POST") {
    try {
      const input = await request.json();
      const event = normalizeEvent(input);
      await remember(env, `event:${event.id}`, event);
      const delivery = await routeDelivery(event, env);
      const hosting = await routeHosting(event, env);
      return json({ ok: true, event, routing: { delivery, hosting } });
    } catch (err) {
      return json({ ok: false, error: err.message }, 500);
    }
  }

  return json({ ok: false, error: "Method not allowed" }, 405);
  }
