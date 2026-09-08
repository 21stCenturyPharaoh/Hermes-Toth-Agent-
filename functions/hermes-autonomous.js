/**
 * HERMES-TOTH AUTONOMOUS SYNTHETIC WORKFLOW
 * -----------------------------------------
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

const COMMERCIAL_PILLARS = [
  "pharaoh-library",
  "microphone-kingdom",
  "pharaoh-registry"
];

const NONPROFIT_PILLARS = [
  "hall-el"
];

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
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "content-type": "application/json; charset=UTF-8",
        "cache-control": "no-store"
      }
    }
  );
}

function requestId() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

function normalizeEntity(entity) {
  if (entity === ENTITIES.NONPROFIT) {
    return ENTITIES.NONPROFIT;
  }
  return ENTITIES.COMMERCIAL;
}

function normalizePillar(pillar) {
  if (
    [...COMMERCIAL_PILLARS, ...NONPROFIT_PILLARS].includes(pillar)
  ) {
    return pillar;
  }
  return "pharaoh-registry";
}

function normalizeEvent(input = {}) {
  const entity = normalizeEntity(input.entity);
  const pillar = normalizePillar(input.pillar);
  const event = String(input.event || EVENTS.CONTENT_CREATED);

  return {
    id: requestId(),
    timestamp: now(),
    entity,
    pillar,
    event,
    campaign: input.campaign || null,
    source: input.source || "hermes",
    payload:
      input.payload && typeof input.payload === "object"
        ? input.payload
        : {},
    approved: input.approved === true
  };
}

async function remember(env, key, value) {
  if (!env.HERMES_MEMORY) {
    return {
      stored: false,
      reason: "HERMES_MEMORY binding unavailable"
    };
  }

  await env.HERMES_MEMORY.put(key, JSON.stringify(value));

  return {
    stored: true,
    key
  };
}

async function recall(env, key) {
  if (!env.HERMES_MEMORY) {
    return null;
  }

  const value = await env.HERMES_MEMORY.get(key);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function callWorker(binding, path, payload) {
  if (!binding) {
    return {
      ok: false,
      error: "Service binding unavailable"
    };
  }

  try {
    const response = await binding.fetch(
      new Request(`https://internal${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      })
    );

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { response: text };
    }

    return {
      ok: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}

async function routeDelivery(event, env) {
  switch (event.event) {
    case EVENTS.EMAIL_REQUESTED:
      return await callWorker(env.AUTO_DELIVERY, "/internal/email", event);

    case EVENTS.NOTIFICATION_REQUESTED:
      return await callWorker(
        env.AUTO_DELIVERY,
        "/internal/notification",
        event
      );

    default:
      return {
        ok: true,
        routed: false,
        reason: "No delivery action required"
      };
  }
}

async function routeHosting(event, env) {
  switch (event.event) {
    case EVENTS.MEDIA_REQUESTED:
      return await callWorker(env.ANGELS_HOSTS, "/internal/media", event);

    default:
      return {
        ok: true,
        routed: false
