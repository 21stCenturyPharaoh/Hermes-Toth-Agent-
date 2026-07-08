export async function onRequest(context) {
  const { env } = context;
  const keys = await env.HERMES_MEMORY.list({ prefix: "hermes:", limit: 10 });
  const logs = await Promise.all(
    keys.keys.map(async k => ({
      key: k.name,
      data: await env.HERMES_MEMORY.get(k.name, { type: "json" })
    }))
  );
  
  return new Response(JSON.stringify({
    status: "TRINITY_ACTIVE",
    sovereign: "21stCenturyPharaoh",
    nodes: {
      "Alpha-Watcher": "Observer node",
      "Alpha-Hesed": "88-0710776 - Military command",
      "Alpha-Nefertari": "88-0836464 - Intelligence"
    },
    recent_commands: logs.reverse(),
    google_apis: {
      youtube: !!env.YOUTUBE_API_KEY,
      maps: !!env.GOOGLE_MAPS_API_KEY
    },
    law: 48
  }, null, 2), {
    status: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
