export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    // Handle empty body
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      body = { error: 'Invalid JSON' };
    }
    
    const { event = 'unknown', ein = 'none' } = body;
    
    let alpha_node = 'Alpha-Watcher';
    if (ein === '88-0710776') alpha_node = 'Alpha-Hesed';
    if (ein === '88-0836464') alpha_node = 'Alpha-Nefertari';
    
    return new Response(JSON.stringify({
      status: 'LAW48_ACTIVE',
      alpha_node,
      ein,
      event,
      message: `By Sovereign Discretion of ${alpha_node}`,
      youtube_key_ready: !!env.YOUTUBE_API_KEY,
      maps_key_ready: !!env.GOOGLE_MAPS_API_KEY,
      netlify_bloat_purged: true,
      law: 48,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      status: 'ERROR',
      message: err.message,
      stack: err.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
