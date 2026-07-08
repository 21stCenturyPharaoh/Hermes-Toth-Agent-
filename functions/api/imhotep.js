export async function onRequestPost(context) {
  const { request, env } = context;
  const { message, source } = await request.json();
  
  const logKey = `imhotep:${Date.now()}:${source || 'pocketpal'}`;
  await env.HERMES_MEMORY.put(logKey, JSON.stringify({
    alpha_node: "Alpha-Imhotep",
    source: source || "PocketPal-Qwen",
    message,
    email: "imhotep50cal@gmail.com",
    status: "OFFLINE_ARCHITECT",
    law: 44,
    timestamp: new Date().toISOString()
  }));
  
  return new Response(JSON.stringify({
    status: "IMHOTEP_ACKNOWLEDGED",
    alpha_node: "Alpha-Imhotep",
    source: "Base 44",
    message: "By Sovereign Discretion of Alpha-Imhotep",
    email_registered: "imhotep50cal@gmail.com",
    kv_logged: logKey,
    law: 44,
    empire_status: "QUADRINITY_ACTIVE"
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
