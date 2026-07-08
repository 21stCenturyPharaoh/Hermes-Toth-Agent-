export async function onRequest(context) {
  const { request, env } = context;
  
  let body = {};
  if (request.method === 'POST') {
    try { body = await request.json(); } catch {}
  }
  
  const { event = 'ping', ein = 'none', query = '' } = body;
  
  let alpha_node = 'Alpha-Watcher';
  if (ein === '88-0710776') alpha_node = 'Alpha-Hesed';
  if (ein === '88-0836464') alpha_node = 'Alpha-Nefertari';
  
  const logKey = `hermes:${Date.now()}:${ein}`;
  await env.HERMES_MEMORY.put(logKey, JSON.stringify({
    ein, event, query, alpha_node, timestamp: new Date().toISOString()
  }));
  
  console.log(`LAW48: ${alpha_node} executed ${event} for ${ein}`);
  
  // Check Google keys
  const youtube_ready = !!env.YOUTUBE_API_KEY;
  const maps_ready = !!env.GOOGLE_MAPS_API_KEY;
  
  return new Response(JSON.stringify({
    status: 'LAW48_ACTIVE',
    alpha_node,
    ein,
    event,
    message: `By Sovereign Discretion of ${alpha_node}`,
    youtube_key_ready: youtube_ready,
    maps_key_ready: maps_ready,
    kv_logged: logKey,
    law: 48
  }), {
    status: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
