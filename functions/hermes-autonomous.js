/**
 * HERMES-TOTH AUTONOMOUS SYNTHETIC WORKFLOW
 * -----------------------------------------
 * Central orchestration layer for the Pharaoh ecosystem.
 *
 * PURPOSE:
 *   Hermes-Toth is the command/orchestration brain.
 *   It does NOT blindly auto-post.
 *
 * PILLARS:
 *   commercial:
 *     - Pharaoh Library
 *     - Microphone Kingdom
 *     - Pharaoh Registry
 *
 *   nonprofit:
 *     - H.A.L.L.EL
 *
 * WORKERS:
 *   AUTO_DELIVERY
 *   ANGELS_HOSTS
 *
 * SECURITY:
 *   - No EINs
 *   - No tax IDs
 *   - No secrets in responses
 *   - No public "firewall" claims
 *   - Entity identity uses internal labels only
 *
 * EXPECTED ENV BINDINGS:
 *
 *   env.AUTO_DELIVERY
 *      Service Binding to pharaoh-auto-delivery
 *
 *   env.ANGELS_HOSTS
 *      Service Binding to angels-hosts-api3
 *
 *   env.HERMES_MEMORY
 *      Cloudflare KV namespace
 *
 * This module is intentionally autonomous in orchestration,
 * but conservative in external distribution.
 */

// ---------------------------------------------------------
// HERMES IDENTITY
// ---------------------------------------------------------

const HERMES = {
  name: "Hermes-Toth",
  role: "orchestrator",
  mode: "autonomous-synthetic-workflow",
  version: "1.0.0"
};

// ---------------------------------------------------------
// ENTITY BOUNDARIES
// ---------------------------------------------------------

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

// ---------------------------------------------------------
// EVENT TYPES
// ---------------------------------------------------------

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

// ---------------------------------------------------------
// SAFE JSON RESPONSE
// ---------------------------------------------------------

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

// ---------------------------------------------------------
// REQUEST ID
// ---------------------------------------------------------

function requestId() {
  return crypto.randomUUID();
}

// ---------------------------------------------------------
// TIMESTAMP
// ---------------------------------------------------------

function now() {
  return new Date().toISOString();
}

// ---------------------------------------------------------
// ENTITY VALIDATION
// ---------------------------------------------------------

function normalizeEntity(entity) {
  if (entity === ENTITIES.NONPROFIT) {
    return ENTITIES.NONPROFIT;
  }

  return ENTITIES.COMMERCIAL;
}

// ---------------------------------------------------------
// PILLAR VALIDATION
// ---------------------------------------------------------

function normalizePillar(pillar) {
  if (
    [...COMMERCIAL_PILLARS, ...NONPROFIT_PILLARS]
      .includes(pillar)
  ) {
    return pillar;
  }

  return "pharaoh-registry";
}

// ---------------------------------------------------------
// EVENT NORMALIZATION
// ---------------------------------------------------------

function normalizeEvent(input = {}) {

  const entity = normalizeEntity(input.entity);

  const pillar = normalizePillar(input.pillar);

  const event = String(
    input.event || EVENTS.CONTENT_CREATED
  );

  return {
    id: requestId(),
    timestamp: now(),

    entity,
    pillar,
    event,

    campaign: input.campaign || null,
    source: input.source || "hermes",

    payload:
      input.payload &&
      typeof input.payload === "object"
        ? input.payload
        : {},

    approved:
      input.approved === true
  };
}

// ---------------------------------------------------------
// MEMORY
// ---------------------------------------------------------

async function remember(env, key, value) {

  if (!env.HERMES_MEMORY) {
    return {
      stored: false,
      reason: "HERMES_MEMORY binding unavailable"
    };
  }

  await env.HERMES_MEMORY.put(
    key,
    JSON.stringify(value)
  );

  return {
    stored: true,
    key
  };
}

// ---------------------------------------------------------
// LOAD MEMORY
// ---------------------------------------------------------

async function recall(env, key) {

  if (!env.HERMES_MEMORY) {
    return null;
  }

  const value =
    await env.HERMES_MEMORY.get(key);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// ---------------------------------------------------------
// INTERNAL WORKER CALL
// ---------------------------------------------------------

async function callWorker(
  binding,
  path,
  payload
) {

  if (!binding) {
    return {
      ok: false,
      error: "Service binding unavailable"
    };
  }

  try {

    const response = await binding.fetch(
      new Request(
        `https://internal${path}`,
        {
          method: "POST",

          headers: {
            "content-type":
              "application/json"
          },

          body: JSON.stringify(payload)
        }
      )
    );

    const text =
      await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = {
        response: text
      };
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

// ---------------------------------------------------------
// DELIVERY ROUTER
// ---------------------------------------------------------

async function routeDelivery(event, env) {

  switch (event.event) {

    case EVENTS.EMAIL_REQUESTED:

      return await callWorker(
        env.AUTO_DELIVERY,
        "/internal/email",
        event
      );

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

// ---------------------------------------------------------
// HOSTING / LOOKUP ROUTER
// ---------------------------------------------------------

async function routeHosting(event, env) {

  switch (event.event) {

    case EVENTS.MEDIA_REQUESTED:

      return await callWorker(
        env.ANGELS_HOSTS,
        "/internal/media",
        event
      );

    default:

      return {
        ok: true,
        routed: false,
        reason: "No hosting action required"
      };
  }
}

// ---------------------------------------------------------
// ANALYTICS EVENT
// ---------------------------------------------------------

async function recordAnalytics(
  event,
  result,
  env
) {

  const record = {

    id: event.id,

    timestamp: event.timestamp,

    entity: event.entity,

    pillar: event.pillar,

    event: event.event,

    campaign: event.campaign,

    source: event.source,

    approved: event.approved,

    result: {

      ok: result?.ok ?? true,

      status:
        result?.status ?? null
    }
  };

  return await remember(
    env,
    `event:${event.id}`,
    record
  );
}

// ---------------------------------------------------------
// AUTONOMOUS DECISION ENGINE
// ---------------------------------------------------------

async function execute(event, env) {

  const actions = [];

  /*
   * Hermes can autonomously decide which
   * internal subsystem needs to act.
   */

  if (
    event.event === EVENTS.EMAIL_REQUESTED ||
    event.event === EVENTS.NOTIFICATION_REQUESTED
  ) {

    actions.push({
      type: "delivery",
      result:
        await routeDelivery(
          event,
          env
        )
    });
  }

  if (
    event.event === EVENTS.MEDIA_REQUESTED
  ) {

    actions.push({
      type: "hosting",
      result:
        await routeHosting(
          event,
          env
        )
    });
  }

  /*
   * Tracking always happens.
   */

  const tracking =
    await recordAnalytics(
      event,
      {
        ok: true
      },
      env
    );

  return {
    actions,
    tracking
  };
}

// ---------------------------------------------------------
// PUBLIC WORKFLOW HANDLER
// ---------------------------------------------------------

export async function runHermesWorkflow(
  input,
  env
) {

  const event =
    normalizeEvent(input);

  /*
   * Safety rule:
   *
   * Hermes may orchestrate automatically,
   * but external publishing requires approval.
   */

  if (
    event.event === EVENTS.CONTENT_CREATED &&
    !event.approved
  ) {

    const stored =
      await remember(
        env,
        `pending:${event.id}`,
        event
      );

    return {
      hermes: HERMES,
      status: "awaiting-approval",
      event,
      memory: stored
    };
  }

  const result =
    await execute(
      event,
      env
    );

  return {
    hermes: HERMES,

    status: "executed",

    event,

    result
  };
}

// ---------------------------------------------------------
// FETCH HANDLER
// ---------------------------------------------------------

export default {

  async fetch(request, env) {

    const url =
      new URL(request.url);

    if (
      request.method === "GET" &&
      url.pathname === "/internal/hermes"
    ) {

      return json({
        hermes: HERMES,
        status: "online",

        capabilities: [
          "orchestration",
          "campaign-memory",
          "event-routing",
          "delivery-routing",
          "analytics",
          "alert-routing"
        ],

        pillars: {
          commercial:
            COMMERCIAL_PILLARS,

          nonprofit:
            NONPROFIT_PILLARS
        },

        workers: [
          "AUTO_DELIVERY",
          "ANGELS_HOSTS"
        ]
      });
    }

    if (
      request.method === "POST" &&
      url.pathname === "/internal/hermes"
    ) {

      let input;

      try {

        input =
          await request.json();

      } catch {

        return json(
          {
            error:
              "Invalid JSON request"
          },
          400
        );
      }

      const result =
        await runHermesWorkflow(
          input,
          env
        );

      return json(result);
    }

    return json(
      {
        error: "Not found"
      },
      404
    );
  }
};
