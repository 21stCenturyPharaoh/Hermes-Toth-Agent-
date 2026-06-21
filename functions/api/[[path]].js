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
      
