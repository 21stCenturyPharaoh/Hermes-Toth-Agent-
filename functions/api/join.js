// POST /api/join  ->  stores a signup in KV (binding name: JOIN_KV). No IP addresses are stored.
const J = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export async function onRequestPost({ request, env }) {
  if (!env.JOIN_KV) return J({ error: 'Signup is not available yet.' }, 503);
  let d; try { d = await request.json(); } catch { return J({ error: 'Bad request.' }, 400); }
  if (d.website) return J({ ok: true });                       // honeypot: bots fill this, people do not
  const email = String(d.email || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return J({ error: 'Please enter a valid email.' }, 400);
  if (d.terms !== true || d.larp !== true) return J({ error: 'Please accept the Terms of Service and the LARP Agreement.' }, 400);
  const rec = { email, terms: true, larp: true, marketing: d.marketing === true, at: new Date().toISOString() };
  await env.JOIN_KV.put('join:' + email, JSON.stringify(rec));  // one record per email
  return J({ ok: true });
}
export const onRequest = () => J({ error: 'Method not allowed.' }, 405);
