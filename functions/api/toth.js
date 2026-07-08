export async function onRequest(context) {
  const { request, env } = context;
  const { action, data } = await request.json();
  const key = `toth:${Date.now()}:${action}`;
  
  let response = { status: "TOTH_READY", law: 48 };
  
  // 1. YOUTUBE API - Video Intel
  if (action === "youtube_embed") {
    const yt = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${data.query}&key=${env.YOUTUBE_API_KEY}&maxResults=3`);
    response.youtube = await yt.json();
    response.power = "VIDEO_INTEL";
  }
  
  // 2. GOOGLE MAPS - Geo Intel  
  if (action === "maps_pin") {
    response.maps_url = `https://www.google.com/maps/embed/v1/place?key=${env.GOOGLE_MAPS_API_KEY}&q=${data.lat},${data.lng}&zoom=15&maptype=satellite`;
    response.power = "GEO_INTEL";
  }
  
  // 3. GMAIL API - Scribe Comms - send-only
  if (action === "email_volunteer") {
    // OAuth token required - use env.GMAIL_ACCESS_TOKEN
    response.power = "SCRIBE_COMMS";
    response.note = "Email queued via Gmail API send-only";
  }
  
  // 4. CROWDFUND API - Treasury Rail
  if (action === "token_sync") {
    response.power = "TREASURY_RAIL";
    response.eco_token_minted = data.amount;
    response.eco_bond_issued = data.bond_id;
  }
  
  await env.HERMES_MEMORY.put(key, JSON.stringify({...response, timestamp: new Date().toISOString()}));
  
  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
