// HERMES/TOTH AGENT v4 - CLOUDFLARE FUNCTION
// COLONEL|LAW48 SWADIA PROTOCOL

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  // Route: /api/reflect - Memory storage
  if (url.pathname === '/api/reflect' && request.method === 'POST') {
    const { action, result } = await request.json();
    const timestamp = new Date().toISOString();
    await env.HERMES_MEMORY.put(`memory:${timestamp}`, JSON.stringify({action, result}));
    return Response.json({ law: 'LAW48', status: 'reflected', timestamp });
  }

  // Route: /api/plan - Swadia Protocol planning
  if (url.pathname === '/api/plan' && request.method === 'POST') {
    const { goal } = await request.json();
    let plan = ['Think','Act','Reflect'];
    if (goal.includes('EU')) plan = ['Webform REF 8044516','Call 00800','Upload evidence','Log Tx'];
    if (goal.includes('Vault')) plan = ['Connect sovereign-pharaoh-vault','Sign Tx','Display Hash'];
    if (goal.includes('Heidelberg')) plan = ['Expose','Evidence','DG FISMA','Zero'];

    await env.HERMES_MEMORY.put(`plan:${Date.now()}`, JSON.stringify({goal, plan}));
    return Response.json({ law: 'LAW29', goal, plan });
  }

  // Route: /api/memory - Retrieve all memory
  if (url.pathname === '/api/memory' && request.method === 'GET') {
    const list = await env.HERMES_MEMORY.list({ prefix: 'memory:' });
    const memories = await Promise.all(
      list.keys.map(async (k) => JSON.parse(await env.HERMES_MEMORY.get(k.name)))
    );
    return Response.json({ law: 'LAW15', memories, count: memories.length });
  }

  // Route: /api/status - Agent health
  if (url.pathname === '/api/status') {
    return Response.json({
      agent: 'HERMES_TOTH_v4',
      protocol: 'SWADIA',
      laws: ['48','29','15','9'],
      colonel: 'ACTIVE',
      chain: env.CHAIN_ID,
      case_ref: env.EU_CASE_REF,
      zero_heidelberg: true
    });
  }

  return new Response('COLONEL|LAW48: Endpoint not found', { status: 404 });
}
