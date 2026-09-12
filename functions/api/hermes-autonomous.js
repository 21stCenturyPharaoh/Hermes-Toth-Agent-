/**
 * ============================================================
 * HERMES-TOTH AGENT
 * AUTONOMOUS SYNTHETIC WORKFLOW ORCHESTRATOR
 * ============================================================
 *
 * HERMES = Brain / Orchestrator / Router
 * TOTH   = Command / Scribe / Human-facing control surface
 * MEMORY = HERMES_MEMORY KV
 *
 * CONNECTED WORKERS
 * -----------------
 * ANGELS_HOSTS
 *   -> angels-hosts-api3
 *   -> engines
 *   -> media
 *   -> missions
 *   -> platform status
 *
 * AUTO_DELIVERY
 *   -> pharaoh-auto-delivery
 *   -> email
 *   -> notifications
 *
 * TWO OPERATING ENTITIES
 * ----------------------
 * commercial
 *   https://registry.pharaoh-conglomerate.org/
 *
 * nonprofit
 *   https://pharaoh-conglomerate.org/
 *
 * TOTH
 * ----
 * https://soloist.ai/toth
 *
 * IMPORTANT
 * ---------
 * soloist.ai/toth is treated as the human-facing command
 * surface. This Worker does NOT pretend that the Soloist
 * webpage is itself an authenticated machine API.
 *
 * Internal machine-to-machine traffic is authenticated with:
 *
 *   X-Internal-Secret
 *
 * and should preferably travel through Cloudflare Service
 * Bindings rather than public URLs.
 * ============================================================
 */


/* ============================================================
   HERMES IDENTITY
   ============================================================ */

const HERMES = {
  name: "Hermes-Toth",

  role: "autonomous-orchestration-agent",

  mode: "controlled-autonomous-synthetic-workflow",

  version: "2.1.0",

  commandSurface: {
    name: "TOTH",
    url: "https://soloist.ai/toth"
  },

  operatingPrinciple:
    "TOTH SPEAKS. HERMES ROUTES. ENGINES EXECUTE. MEMORY REMEMBERS."
};


/* ============================================================
   ENTITY REGISTRY
   ============================================================ */

const ENTITIES = {
  COMMERCIAL: "commercial",
  NONPROFIT: "nonprofit"
};


const ENTITY_CONFIG = {

  commercial: {
    name: "Pharaoh Registry",
    url: "https://registry.pharaoh-conglomerate.org/"
  },

  nonprofit: {
    name: "Pharaoh Conglomerate",
    url: "https://pharaoh-conglomerate.org/"
  }

};


/* ============================================================
   COMMERCIAL PILLARS
   ============================================================ */

const COMMERCIAL_PILLARS = [
  "pharaoh-library",
  "microphone-kingdom",
  "pharaoh-registry"
];


/* ============================================================
   NONPROFIT PILLARS
   ============================================================ */

const NONPROFIT_PILLARS = [
  "hall-el"
];


/* ============================================================
   EVENT REGISTRY
   ============================================================ */

const EVENTS = {

  CONTENT_CREATED:
    "content.created",

  CAMPAIGN_CREATED:
    "campaign.created",

  EMAIL_REQUESTED:
    "email.requested",

  NOTIFICATION_REQUESTED:
    "notification.requested",

  MEDIA_REQUESTED:
    "media.requested",

  ENGINE_REQUESTED:
    "engine.requested",

  TRACKING_EVENT:
    "tracking.event",

  LEAD_CREATED:
    "lead.created",

  REGISTRY_SIGNUP:
    "registry.signup",

  ALERT_REQUESTED:
    "alert.requested"

};


/* ============================================================
   WORKFLOW STATES
   ============================================================ */

const STATES = {

  PROPOSED:
    "PROPOSED",

  APPROVED:
    "APPROVED",

  QUEUED:
    "QUEUED",

  EXECUTING:
    "EXECUTING",

  COMPLETED:
    "COMPLETED",

  FAILED:
    "FAILED",

  REQUIRES_HUMAN:
    "REQUIRES_HUMAN",

  BLOCKED:
    "BLOCKED"

};


/* ============================================================
   RESPONSE HELPER
   ============================================================ */

function json(data, status = 200) {

  return new Response(

    JSON.stringify(
      data,
      null,
      2
    ),

    {
      status,

      headers: {

        "content-type":
          "application/json; charset=UTF-8",

        "cache-control":
          "no-store",

        "x-hermes-agent":
          HERMES.name,

        "x-hermes-version":
          HERMES.version

      }

    }

  );

}


/* ============================================================
   HELPERS
   ============================================================ */

function requestId() {

  return crypto.randomUUID();

}


function now() {

  return new Date().toISOString();

}


function safeString(
  value,
  fallback = null
) {

  if (
    value === undefined ||
    value === null
  ) {

    return fallback;

  }

  return String(value).trim();

}


/* ============================================================
   ENTITY NORMALIZATION
   ============================================================ */

function normalizeEntity(entity) {

  if (
    entity === ENTITIES.NONPROFIT
  ) {

    return ENTITIES.NONPROFIT;

  }

  return ENTITIES.COMMERCIAL;

}


/* ============================================================
   PILLAR NORMALIZATION
   ============================================================ */

function normalizePillar(
  pillar,
  entity
) {

  const allowed =
    entity === ENTITIES.NONPROFIT

      ? NONPROFIT_PILLARS

      : COMMERCIAL_PILLARS;


  if (
    allowed.includes(pillar)
  ) {

    return pillar;

  }


  return entity === ENTITIES.NONPROFIT

    ? "hall-el"

    : "pharaoh-registry";

}


/* ============================================================
   EVENT NORMALIZATION
   ============================================================ */

function normalizeEvent(
  input = {}
) {

  const entity =
    normalizeEntity(
      input.entity
    );


  const pillar =
    normalizePillar(
      input.pillar,
      entity
    );


  const event =
    safeString(
      input.event,
      EVENTS.CONTENT_CREATED
    );


  return {

    id:
      requestId(),

    timestamp:
      now(),

    entity,

    entityInfo:
      ENTITY_CONFIG[entity],

    pillar,

    event,

    campaign:
      safeString(
        input.campaign
      ),

    source:
      safeString(
        input.source,
        "hermes"
      ),

    command:
      safeString(
        input.command
      ),

    payload:

      input.payload &&
      typeof input.payload === "object"

        ? input.payload

        : {},

    approved:
      input.approved === true,

    state:

      input.approved === true

        ? STATES.APPROVED

        : STATES.PROPOSED

  };

}


/* ============================================================
   HERMES MEMORY
   ============================================================ */

async function remember(
  env,
  key,
  value
) {

  if (
    !env.HERMES_MEMORY
  ) {

    return {

      stored: false,

      reason:
        "HERMES_MEMORY binding unavailable"

    };

  }


  try {

    await env.HERMES_MEMORY.put(

      key,

      JSON.stringify(value)

    );


    return {

      stored: true,

      key

    };

  } catch (error) {

    return {

      stored: false,

      key,

      error:
        error?.message ||
        "Memory write failed"

    };

  }

}


/* ============================================================
   MEMORY RECALL
   ============================================================ */

async function recall(
  env,
  key
) {

  if (
    !env.HERMES_MEMORY
  ) {

    return null;

  }


  try {

    const value =
      await env.HERMES_MEMORY.get(
        key
      );


    if (!value) {

      return null;

    }


    try {

      return JSON.parse(value);

    } catch {

      return value;

    }

  } catch {

    return null;

  }

}


/* ============================================================
   INTERNAL AUTHORIZATION
   ============================================================ */

function authorize(
  request,
  env
) {

  const expected =
    env.INTERNAL_SHARED_SECRET;


  const supplied =
    request.headers.get(
      "X-Internal-Secret"
    );


  if (
    !expected ||
    !supplied
  ) {

    return false;

  }


  return supplied === expected;

}


/* ============================================================
   SERVICE-BINDING CALL
   ============================================================ */

async function callWorker(
  binding,
  path,
  payload,
  env
) {

  if (!binding) {

    return {

      ok: false,

      error:
        "Service binding unavailable",

      path

    };

  }


  try {

    const headers = {

      "content-type":
        "application/json"

    };


    if (
      env.INTERNAL_SHARED_SECRET
    ) {

      headers[
        "X-Internal-Secret"
      ] =
        env.INTERNAL_SHARED_SECRET;

    }


    const response =
      await binding.fetch(

        new Request(

          `https://internal${path}`,

          {

            method:
              "POST",

            headers,

            body:
              JSON.stringify(
                payload
              )

          }

        )

      );


    const text =
      await response.text();


    let data;


    try {

      data =
        JSON.parse(text);

    } catch {

      data = {

        response:
          text

      };

    }


    return {

      ok:
        response.ok,

      status:
        response.status,

      data

    };

  } catch (error) {

    return {

      ok: false,

      error:
        error?.message ||
        "Worker call failed"

    };

  }

}


/* ============================================================
   DELIVERY ROUTER
   ============================================================ */

async function routeDelivery(
  event,
  env
) {

  switch (
    event.event
  ) {


    case EVENTS.EMAIL_REQUESTED:

      return await callWorker(

        env.AUTO_DELIVERY,

        "/internal/email",

        {

          entity:
            event.entity,

          pillar:
            event.pillar,

          campaign:
            event.campaign,

          eventId:
            event.id,

          source:
            "Hermes-Toth",

          ...event.payload

        },

        env

      );


    case EVENTS.NOTIFICATION_REQUESTED:

      return await callWorker(

        env.AUTO_DELIVERY,

        "/internal/notification",

        {

          entity:
            event.entity,

          pillar:
            event.pillar,

          campaign:
            event.campaign,

          eventId:
            event.id,

          source:
            "Hermes-Toth",

          ...event.payload

        },

        env

      );


    default:

      return {

        ok: true,

        routed: false,

        reason:
          "No delivery action required"

      };

  }

}


/* ============================================================
   ANGELS-HOSTS ROUTER
   ============================================================
 *
 * IMPORTANT:
 * angels-hosts-api3 currently exposes ONE authenticated
 * Hermes interface:
 *
 *   /internal/hermes
 *
 * Therefore engine/media/mission requests are routed through
 * that endpoint.
 * ============================================================ */

async function routeAngelsHosts(
  event,
  env
) {

  switch (
    event.event
  ) {


    /* ----------------------------------------
       ENGINE REQUEST
       ---------------------------------------- */

    case EVENTS.ENGINE_REQUESTED:

      return await callWorker(

        env.ANGELS_HOSTS,

        "/internal/hermes",

        {

          action:
            "engine.lookup",

          entity:
            event.entity,

          pillar:
            event.pillar,

          eventId:
            event.id,

          engine:
            event.payload?.engine ||
            event.payload?.engineKey ||
            null

        },

        env

      );


    /* ----------------------------------------
       MEDIA REQUEST
       ---------------------------------------- */

    case EVENTS.MEDIA_REQUESTED:

      return await callWorker(

        env.ANGELS_HOSTS,

        "/internal/hermes",

        {

          action:
            "media.lookup",

          entity:
            event.entity,

          pillar:
            event.pillar,

          eventId:
            event.id,

          videoId:
            event.payload?.videoId ||
            null,

          slot:
            event.payload?.slot ||
            null

        },

        env

      );


    /* ----------------------------------------
       MISSION LOOKUP
       ---------------------------------------- */

    case EVENTS.REGISTRY_SIGNUP:

      return await callWorker(

        env.ANGELS_HOSTS,

        "/internal/hermes",

        {

          action:
            "mission.lookup",

          entity:
            event.entity,

          pillar:
            event.pillar,

          eventId:
            event.id

        },

        env

      );


    default:

      return {

        ok: true,

        routed: false,

        reason:
          "No Angels Hosts action required"

      };

  }

}


/* ============================================================
   ALERT ROUTER
   ============================================================ */

async function routeAlert(
  event,
  env
) {

  if (
    event.event !==
    EVENTS.ALERT_REQUESTED
  ) {

    return {

      ok: true,

      routed: false

    };

  }


  return await callWorker(

    env.AUTO_DELIVERY,

    "/internal/notification",

    {

      entity:
        event.entity,

      pillar:
        event.pillar,

      campaign:
        event.campaign ||
        "hermes-alert",

      eventId:
        event.id,

      alert: true,

      source:
        "Hermes-Toth",

      ...event.payload

    },

    env

  );

}


/* ============================================================
   ANALYTICS / AUDIT
   ============================================================ */

async function recordAnalytics(
  event,
  result,
  env
) {

  const record = {

    id:
      event.id,

    timestamp:
      event.timestamp,

    completedAt:
      now(),

    entity:
      event.entity,

    pillar:
      event.pillar,

    event:
      event.event,

    campaign:
      event.campaign,

    source:
      event.source,

    command:
      event.command,

    approved:
      event.approved,

    state:
      result?.state ||
      STATES.COMPLETED,

    result: {

      ok:
        result?.ok ??
        true,

      status:
        result?.status ??
        null

    }

  };


  return await remember(

    env,

    `event:${event.id}`,

    record

  );

}


/* ============================================================
   QUEUE
   ============================================================ */

async function queueEvent(
  event,
  env
) {

  const queued = {

    ...event,

    state:
      STATES.QUEUED,

    queuedAt:
      now()

  };


  return await remember(

    env,

    `queue:${event.id}`,

    queued

  );

}


/* ============================================================
   EXECUTION ENGINE
   ============================================================ */

async function execute(
  event,
  env
) {

  const actions = [];


  event.state =
    STATES.EXECUTING;


  await remember(

    env,

    `running:${event.id}`,

    event

  );


  /* ----------------------------------------
     DELIVERY
     ---------------------------------------- */

  if (

    event.event ===
      EVENTS.EMAIL_REQUESTED ||

    event.event ===
      EVENTS.NOTIFICATION_REQUESTED

  ) {

    actions.push({

      type:
        "delivery",

      result:
        await routeDelivery(
          event,
          env
        )

    });

  }


  /* ----------------------------------------
     ANGELS HOSTS
     ---------------------------------------- */

  if (

    event.event ===
      EVENTS.ENGINE_REQUESTED ||

    event.event ===
      EVENTS.MEDIA_REQUESTED ||

    event.event ===
      EVENTS.REGISTRY_SIGNUP

  ) {

    actions.push({

      type:
        "angels-hosts",

      result:
        await routeAngelsHosts(
          event,
          env
        )

    });

  }


  /* ----------------------------------------
     ALERT
     ---------------------------------------- */

  if (

    event.event ===
    EVENTS.ALERT_REQUESTED

  ) {

    actions.push({

      type:
        "alert",

      result:
        await routeAlert(
          event,
          env
        )

    });

  }


  /* ----------------------------------------
     CHECK FAILURE
     ---------------------------------------- */

  const failed =
    actions.some(

      action =>

        action.result &&
        action.result.ok === false

    );


  event.state =
    failed

      ? STATES.FAILED

      : STATES.COMPLETED;


  event.completedAt =
    now();


  const resultSummary = {

    ok:
      !failed,

    state:
      event.state

  };


  const tracking =
    await recordAnalytics(

      event,

      resultSummary,

      env

    );


  /* ----------------------------------------
     FAILED EVENTS ARE RETAINED
     ---------------------------------------- */

  if (failed) {

    await remember(

      env,

      `failed:${event.id}`,

      {

        event,

        actions,

        timestamp:
          now()

      }

    );

  }


  return {

    ok:
      !failed,

    state:
      event.state,

    actions,

    tracking

  };

}


/* ============================================================
   MAIN HERMES WORKFLOW
   ============================================================ */

export async function runHermesWorkflow(
  input,
  env
) {

  const event =
    normalizeEvent(
      input
    );


  /* ----------------------------------------
     CONTENT APPROVAL GATE
     ---------------------------------------- */

  if (

    event.event ===
      EVENTS.CONTENT_CREATED &&

    !event.approved

  ) {

    event.state =
      STATES.REQUIRES_HUMAN;


    const stored =
      await remember(

        env,

        `pending:${event.id}`,

        event

      );


    return {

      hermes:
        HERMES,

      status:
        "awaiting-approval",

      state:
        STATES.REQUIRES_HUMAN,

      event,

      memory:
        stored

    };

  }


  /* ----------------------------------------
     QUEUE
     ---------------------------------------- */

  const queued =
    await queueEvent(

      event,

      env

    );


  /* ----------------------------------------
     EXECUTE
     ---------------------------------------- */

  const result =
    await execute(

      event,

      env

    );


  return {

    hermes:
      HERMES,

    status:

      result.ok

        ? "executed"

        : "failed",

    state:
      result.state,

    event,

    queue:
      queued,

    result

  };

}


/* ============================================================
   APPROVE PENDING EVENT
   ============================================================ */

async function approveEvent(
  eventId,
  env
) {

  const event =
    await recall(

      env,

      `pending:${eventId}`

    );


  if (!event) {

    return {

      ok: false,

      error:
        "Pending Hermes event not found",

      eventId

    };

  }


  event.approved =
    true;


  event.state =
    STATES.APPROVED;


  event.approvedAt =
    now();


  await remember(

    env,

    `approved:${eventId}`,

    event

  );


  return await execute(

    event,

    env

  );

}


/* ============================================================
   MEMORY STATUS
   ============================================================ */

async function memoryStatus(
  env
) {

  return {

    available:
      !!env.HERMES_MEMORY,

    system:
      "HERMES_MEMORY",

    purpose:
      "workflow memory, audit records, queues and recovery state"

  };

}


/* ============================================================
   CONNECTIVITY STATUS
   ============================================================ */

async function connectivityStatus(
  env
) {

  return {

    HERMES_MEMORY:
      !!env.HERMES_MEMORY,

    ANGELS_HOSTS:
      !!env.ANGELS_HOSTS,

    AUTO_DELIVERY:
      !!env.AUTO_DELIVERY,

    INTERNAL_SHARED_SECRET:
      !!env.INTERNAL_SHARED_SECRET,

    TOTH_COMMAND_SURFACE:
      HERMES.commandSurface.url

  };

}


/* ============================================================
   HEALTH CHECK
   ============================================================ */

async function healthCheck(
  env
) {

  return {

    hermes:
      HERMES,

    status:
      "healthy",

    timestamp:
      now(),

    connectivity:
      await connectivityStatus(
        env
      ),

    memory:
      await memoryStatus(
        env
      ),

    entities:
      ENTITY_CONFIG,

    workers: {

      ANGELS_HOSTS:
        "angels-hosts-api3",

      AUTO_DELIVERY:
        "pharaoh-auto-delivery"

    }

  };

}


/* ============================================================
   TOTH COMMAND INTERPRETER
   ============================================================
 *
 * This creates a clean command contract for TOTH.
 *
 * Examples:
 *
 * {
 *   "command": "STATUS"
 * }
 *
 * {
 *   "command": "ENGINE",
 *   "engine": "VOLUNTEER_EXCHANGE"
 * }
 *
 * {
 *   "command": "MEDIA",
 *   "videoId": "SGPJWd2q2RM"
 * }
 *
 * {
 *   "command": "MISSION"
 * }
 *
 * {
 *   "command": "SEND_EMAIL",
 *   "entity": "commercial",
 *   "to": "..."
 * }
 *
 * TOTH itself remains the human-facing surface.
 * ============================================================ */

async function processTothCommand(
  input,
  env
) {

  const command =
    safeString(
      input.command,
      ""
    ).toUpperCase();


  switch (command) {


    /* ----------------------------------------
       STATUS
       ---------------------------------------- */

    case "STATUS":

      return {

        ok: true,

        command,

        result:
          await healthCheck(
            env
          )

      };


    /* ----------------------------------------
       ENGINE
       ---------------------------------------- */

    case "ENGINE":

      return await runHermesWorkflow(

        {

          entity:
            input.entity,

          pillar:
            input.pillar,

          event:
            EVENTS.ENGINE_REQUESTED,

          command,

          payload: {

            engine:
              input.engine ||
              input.engineKey

          },

          approved:
            true

        },

        env

      );


    /* ----------------------------------------
       MEDIA
       ---------------------------------------- */

    case "MEDIA":

      return await runHermesWorkflow(

        {

          entity:
            input.entity,

          pillar:
            input.pillar,

          event:
            EVENTS.MEDIA_REQUESTED,

          command,

          payload: {

            videoId:
              input.videoId,

            slot:
              input.slot

          },

          approved:
            true

        },

        env

      );


    /* ----------------------------------------
       MISSION
       ---------------------------------------- */

    case "MISSION":

      return await runHermesWorkflow(

        {

          entity:
            input.entity,

          pillar:
            input.pillar,

          event:
            EVENTS.REGISTRY_SIGNUP,

          command,

          approved:
            true

        },

        env

      );


    /* ----------------------------------------
       EMAIL
       ---------------------------------------- */

    case "SEND_EMAIL":

      return await runHermesWorkflow(

        {

          entity:
            input.entity,

          pillar:
            input.pillar,

          campaign:
            input.campaign,

          event:
            EVENTS.EMAIL_REQUESTED,

          command,

          payload: {

            to:
              input.to,

            subject:
              input.subject,

            html:
              input.html,

            text:
              input.text,

            isMarketing:
              input.isMarketing === true

          },

          approved:
            input.approved === true

        },

        env

      );


    /* ----------------------------------------
       NOTIFICATION
       ---------------------------------------- */

    case "NOTIFY":

      return await runHermesWorkflow(

        {

          entity:
            input.entity,

          pillar:
            input.pillar,

          campaign:
            input.campaign,

          event:
            EVENTS.NOTIFICATION_REQUESTED,

          command,

          payload: {

            to:
              input.to,

            message:
              input.message

          },

          approved:
            input.approved === true

        },

        env

      );


    /* ----------------------------------------
       UNKNOWN
       ---------------------------------------- */

    default:

      return {

        ok: false,

        status:
          "unknown_command",

        command,

        availableCommands: [

          "STATUS",

          "ENGINE",

          "MEDIA",

          "MISSION",

          "SEND_EMAIL",

          "NOTIFY"

        ]

      };

  }

}


/* ============================================================
   GET
   ============================================================ */

export async function onRequestGet(
  context
) {

  const {
    request,
    env
  } = context;


  const url =
    new URL(
      request.url
    );


  /* ----------------------------------------
     PUBLIC HEALTH
     ---------------------------------------- */

  if (
    url.pathname.endsWith(
      "/health"
    )
  ) {

    return json(

      await healthCheck(
        env
      )

    );

  }


  /* ----------------------------------------
     HERMES STATUS
     ---------------------------------------- */

  return json({

    hermes:
      HERMES,

    status:
      "online",

    state:
      "READY",

    identity: {

      brain:
        "Hermes-Toth",

      command:
        "TOTH",

      memory:
        "HERMES_MEMORY",

      operations:
        "ANGELS-HOSTS-API3",

      delivery:
        "PHARAOH-AUTO-DELIVERY"

    },

    commandSurface:
      HERMES.commandSurface,

    entities:
      ENTITY_CONFIG,

    capabilities: [

      "TOTH-command-surface",

      "workflow-orchestration",

      "controlled-autonomous-execution",

      "campaign-memory",

      "workflow-queue",

      "approval-control",

      "engine-routing",

      "media-routing",

      "mission-routing",

      "email-routing",

      "notification-routing",

      "alert-routing",

      "analytics",

      "audit-recording",

      "failure-detection",

      "recovery-state",

      "entity-separation",

      "health-monitoring"

    ],

    pillars: {

      commercial:
        COMMERCIAL_PILLARS,

      nonprofit:
        NONPROFIT_PILLARS

    },

    connectedWorkers: {

      ANGELS_HOSTS:
        !!env.ANGELS_HOSTS,

      AUTO_DELIVERY:
        !!env.AUTO_DELIVERY,

      HERMES_MEMORY:
        !!env.HERMES_MEMORY

    }

  });

}


/* ============================================================
   POST
   ============================================================ */

export async function onRequestPost(
  context
) {

  const {
    request,
    env
  } = context;


  /* ----------------------------------------
     INTERNAL AUTH
     ---------------------------------------- */

  if (
    !authorize(
      request,
      env
    )
  ) {

    return json(

      {

        ok: false,

        error:
          "Unauthorized Hermes request"

      },

      401

    );

  }


  /* ----------------------------------------
     JSON
     ---------------------------------------- */

  let input;


  try {

    input =
      await request.json();

  } catch {

    return json(

      {

        ok: false,

        error:
          "Invalid JSON request"

      },

      400

    );

  }


  /* ----------------------------------------
     TOTH COMMAND
     ---------------------------------------- */

  if (
    input.command
  ) {

    return json(

      await processTothCommand(
        input,
        env
      )

    );

  }


  /* ----------------------------------------
     ACTION
     ---------------------------------------- */

  const action =
    safeString(
      input.action,
      "run"
    ).toLowerCase();


  /* ----------------------------------------
     HEALTH
     ---------------------------------------- */

  if (
    action === "health"
  ) {

    return json(

      await healthCheck(
        env
      )

    );

  }


  /* ----------------------------------------
     MEMORY RECALL
     ---------------------------------------- */

  if (
    action === "recall"
  ) {

    if (
      !input.key
    ) {

      return json(

        {

          ok: false,

          error:
            "Memory key required"

        },

        400

      );

    }


    return json({

      ok: true,

      key:
        input.key,

      value:
        await recall(
          env,
          input.key
        )

    });

  }


  /* ----------------------------------------
     APPROVE
     ---------------------------------------- */

  if (
    action === "approve"
  ) {

    if (
      !input.eventId
    ) {

      return json(

        {

          ok: false,

          error:
            "eventId required"

        },

        400

      );

    }


    return json(

      await approveEvent(

        input.eventId,

        env

      )

    );

  }


  /* ----------------------------------------
     RUN
     ---------------------------------------- */

  if (
    action === "run"
  ) {

    return json(

      await runHermesWorkflow(

        input,

        env

      )

    );

  }


  /* ----------------------------------------
     UNKNOWN ACTION
     ---------------------------------------- */

  return json(

    {

      ok: false,

      error:
        "Unknown Hermes action",

      supported: [

        "run",

        "approve",

        "recall",

        "health"

      ]

    },

    400

  );

}
