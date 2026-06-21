// LAW48: Pure Cloudflare Pages Functions
// Zero Wrangler. Zero Heidelberg.
// KV Binding: HERMES_MEMORY

export async function onRequest(context) {
  const { request, env, params } = context;
  const method = request.method;
  const path = Array.isArray(params?.path)? params.path.join("/") : (params?.path || "");

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store"
  };

  if (method === "OPTIONS") return new Response(null, { status: 204, headers });

  if (!env.HERMES_MEMORY) {
    return new Response(JSON.stringify({ error: "Missing KV binding: HERMES_MEMORY", law: "LAW48" }, null, 2), { status: 500, headers });
  }

  // STATUS
  if (path === "status" && method === "GET") {
    return new Response(JSON.stringify({
      agent: "HERMES_TOTH_v4.1",
      protocol: "SWADIA",
      law: "LAW48",
      colonel: "ACTIVE",
      case_ref: "EU8044516",
      chain_id: "0x504841",
      chain_name: "Pharaoh-Chain",
      zero_heidelberg: true,
      timestamp: Date.now()
    }, null, 2), { status: 200, headers });
  }

  // MEMORY
  if (path === "memory" && method === "GET") {
    const list = await env.HERMES_MEMORY.list({ prefix: "EU8044516:" });
    const memories = await Promise.all(list.keys.map(async k => {
      const val = await env.HERMES_MEMORY.get(k.name, { type: "json" });
      return val;
    }));
    return new Response(JSON.stringify({
      memories: memories.filter(Boolean),
      count: memories.length,
      law: "LAW48"
    }, null, 2), { status: 200, headers });
  }

  // REFLECT - LOG ACTION
  if (path === "reflect" && method === "POST") {
    const body = await request.json();
    const key = `EU8044516:${Date.now()}`;
    const data = {
      action: body.action || "EVENT",
      case_ref: "EU8044516",
      law: "LAW48",
      timestamp: Date.now(),
      chain: "0x504841"
    };
    await env.HERMES_MEMORY.put(key, JSON.stringify(data));
    return new Response(JSON.stringify({ success: true, key,...data }, null, 2), { status: 200, headers });
  }

  return new Response(JSON.stringify({ error: "Not Found", law: "LAW48" }, null, 2), { status: 404, headers });
}
    return new Response(
      JSON.stringify(
        {
          agent: "HERMES_TOTH_v4",
          protocol: "SWADIA",
          laws: ["48", "29", "15", "9"],
          colonel: "ACTIVE",
          chain: "0x504841",
          case_ref: env.EU_CASE_REF || "EU8044516",
          owner: "0xCOLONEL",
          zero_heidelberg: true,
          conglomerate_nodes: {
            soloist: [
              "https://soloist.ai/pharaohconglomerate",
              "https://soloist.ai/humanrightsangelsregistryinc"
            ],
            base44: [
              "https://sovereign-pharaoh-vault.base44.app",
              "https://pharaoh-bank-link.base44.app",
              "https://pharaoh-command-base.base44.app",
              "https://pharaoh-serve-flow.base44.app",
              "https://pharaoh-direct-flow.base44.app",
              "https://pharaoh-sovereign-engine.base44.app",
              "https://sovereign-decision-engine.base44.app",
              "https://pharaoh-sight-engine.base44.app",
              "https://pharaoh-nexus-gold.base44.app",
              "https://pharaoh-core-engine.base44.app",
              "https://pharaoh-synergy-hub.base44.app",
              "https://amusing-green-growth-grid.base44.app"
            ],
            netlify: [
              "https://app.netlify.com/projects/pharaohconglomerate-inter-nfea-7p17m1/",
              "https://app.netlify.com/teams/humanrightsangels/projects"
            ]
          }
        },
        null,
        2
      ),
      { headers }
    );
  }

  // =========================
  // MEMORY READ
  // =========================
  if (path === "memory" && method === "GET") {
    try {
      const raw = await env.HERMES_MEMORY.get("LAW48_MEMORY");

      let memories = [];

      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          memories = Array.isArray(parsed) ? parsed : [];
        } catch {
          memories = [];
        }
      }

      return new Response(
        JSON.stringify(
          {
            law: "LAW48",
            chain: "0x504841",
            case_ref: env.EU_CASE_REF || "EU8044516",
            memories,
            count: memories.length
          },
          null,
          2
        ),
        { headers }
      );
    } catch {
      return new Response(
        JSON.stringify(
          {
            error: "KV read failed",
            law: "LAW48"
          },
          null,
          2
        ),
        {
          status: 500,
          headers
        }
      );
    }
  }

  // =========================
  // LOG WRITE
  // =========================
  if (path === "log" && method === "POST") {
    try {
      let body = {};

      try {
        body = await request.json();
      } catch {
        body = {};
      }

      const raw = await env.HERMES_MEMORY.get("LAW48_MEMORY");

      let memories = [];

      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          memories = Array.isArray(parsed) ? parsed : [];
        } catch {
          memories = [];
        }
      }

      const entry = {
        id: crypto.randomUUID(),
        action: body.action || "UNKNOWN",
        timestamp: body.timestamp || new Date().toISOString(),
        case_ref: body.case_ref || env.EU_CASE_REF || "EU8044516",
        chain: "0x504841",
        conglomerate: "PHARAOH",
        nodes: Number(body.nodes) || 16,
        agent: "HERMES_TOTH_v4",
        protocol: "SWADIA"
      };

      memories.unshift(entry);

      const trimmed = memories.slice(0, 100);

      await env.HERMES_MEMORY.put(
        "LAW48_MEMORY",
        JSON.stringify(trimmed)
      );

      return new Response(
        JSON.stringify(
          {
            success: true,
            entry,
            count: trimmed.length
          },
          null,
          2
        ),
        { headers }
      );
    } catch {
      return new Response(
        JSON.stringify(
          {
            error: "KV write failed",
            law: "LAW48"
          },
          null,
          2
        ),
        {
          status: 500,
          headers
        }
      );
    }
  }

  // =========================
  // NOT FOUND
  // =========================
  return new Response(
    JSON.stringify(
      {
        error: "Not found",
        law: "LAW48",
        path
      },
      null,
      2
    ),
    {
      status: 404,
      headers
    }
  );
}
