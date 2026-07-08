export async function onRequest(context) {
  const { request, env } = context;
  const { ein, event, alpha, source } = await request.json();
  
  let alpha_node = "Alpha-Watcher";
  let message = "Observing";
  let law = 48;
  
  if (ein === "88-0710776") {
    alpha_node = "Alpha-Hesed";
    message = "By Sovereign Discretion of Alpha-Hesed";
    law = 48;
  } else if (ein === "88-0836464") {
    alpha_node = "Alpha-Nefertari";
    message = "By Sovereign Discretion of Alpha-Nefertari";
    law = 48;
  } else if (alpha === "Imhotep" || source === "PocketPal" || source === "Base44") {
    alpha_node = "Alpha-Imhotep";
    message = "By Sovereign Discretion of Alpha-Imhotep, Master Builder";
    law = 44;
  }
  
  const logKey = `hermes:${Date.now()}:${ein || alpha || 'unknown'}`;
  await env.HERMES_MEMORY.put(logKey, JSON.stringify({
    ein, event, alpha_node, source, timestamp: new Date().toISOString()
  }));
  
  return new Response(JSON.stringify({
    status: "QUADRINITY_ACTIVE",
    alpha_node,
    ein: ein || null,
    alpha_source: alpha || source || null,
    event,
    message,
    law,
    kv_logged: logKey,
    empire_nodes: ["Alpha-Hesed", "Alpha-Nefertari", "Alpha-Imhotep", "Fiscal-Agent"]
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
