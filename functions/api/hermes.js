export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json();
  const { event, ein } = body;
  
  let alpha_node = 'Alpha-Watcher';
  if (ein === '88-0710776') alpha_node = 'Alpha-Hesed';
  if (ein === '88-0836464') alpha_node = 'Alpha-Nefertari';
  
  return Response.json({
    status: 'LAW48_ACTIVE',
    alpha_node,
    ein,
    message: `By Sovereign Discretion of ${alpha_node}`,
    youtube_key_ready: !!env.YOUTUBE_KEY,
    maps_key_ready: !!env.MAPS_KEY,
    netlify_bloat_purged: true,
    law: 48
  });
}
