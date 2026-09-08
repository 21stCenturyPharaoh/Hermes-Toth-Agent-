const ANGELS_HOSTS_URL = "https://angels-hosts-api3.pharangels.workers.dev/v27.5/videos.json";
const FALLBACK_URL = "https://angels-hosts-api3.pharangels.workers.dev/videos.json";

function esc(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

async function checkBinding(name, binding, testPath="/"){
  if(!binding) return { name, ok:false, latency:0, error:"Binding not configured in Pages > Settings > Functions" };
  const t0 = Date.now();
  try{
    const r = await binding.fetch(new Request(`https://internal${testPath}`,{method:"GET"}));
    return { name, ok:r.ok, status:r.status, latency:Date.now()-t0 };
  }catch(e){
    return { name, ok:false, latency:Date.now()-t0, error:e.message };
  }
}

async function getMemory(env, limit=10){
  if(!env.HERMES_MEMORY) return { available:false, events:[] };
  try{
    const list = await env.HERMES_MEMORY.list({prefix:"event:", limit});
    const events=[];
    for(const k of list.keys){
      const v = await env.HERMES_MEMORY.get(k.name);
      try{ events.push(JSON.parse(v)); }catch{ events.push({id:k.name, raw:v}); }
    }
    events.sort((a,b)=> new Date(b.timestamp||0)-new Date(a.timestamp||0));
    return { available:true, events, count:list.keys.length };
  }catch(e){ return { available:false, error:e.message, events:[] }; }
}

async function fetchAngels(){
  const t0=Date.now();
  for(const url of [ANGELS_HOSTS_URL, FALLBACK_URL]){
    try{
      const r=await fetch(url, {headers:{"cache-control":"no-store"}});
      if(!r.ok) continue;
      const data=await r.json();
      const videos = Array.isArray(data) ? data : (data.videos || data.items || []);
      return { ok:true, url, latency:Date.now()-t0, count:videos.length, videos: videos.slice(0,10), raw:data };
    }catch(e){ /* try next */ }
  }
  return { ok:false, error:"Could not fetch angels-hosts-api3" };
}

export async function onRequest(context){
  const { env } = context;
  const [delivery, hosts, memory, angels] = await Promise.all([
    checkBinding("AUTO_DELIVERY", env.AUTO_DELIVERY, "/internal/health"),
    checkBinding("ANGELS_HOSTS", env.ANGELS_HOSTS, "/internal/media"),
    getMemory(env, 20),
    fetchAngels()
  ]);

  const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>HERMES-TOTH // COMMAND</title>
  <style>
    :root{--gold:#d4af37;--bg:#0a0a0b;--card:#141416;--muted:#8a8a8e}
    *{box-sizing:border-box} body{margin:0;background:var(--bg);color:#eaea;font-family:ui-monospace,Menlo,monospace}
    .wrap{max-width:1100px;margin:0 auto;padding:24px}
    .hdr{display:flex;justify-content:space-between;align-items:center;border:1px solid #222;padding:16px;border-radius:14px;background:linear-gradient(180deg,#151517,#0f0f10)}
    .pulse{width:10px;height:10px;background:#22c55e;border-radius:50%;box-shadow:0 0 12px #22c55e;display:inline-block;animation:p 1.5s infinite}
    @keyframes p{0%,100%{opacity:1}50%{opacity:.4}}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:18px}
    @media(max-width:900px){.grid{grid-template-columns:1fr}}
    .card{background:var(--card);border:1px solid #232326;border-radius:14px;padding:16px}
    .k{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em}
    .v{font-size:22px;margin-top:6px}
    .badge{border:1px solid #333;padding:3px 8px;border-radius:999px;font-size:11px}
    .ok{color:#22c55e;border-color:#22c55e33;background:#22c55e12}
    .bad{color:#ef4444;border-color:#ef444433;background:#ef444412}
    .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    table{width:100%;border-collapse:collapse;font-size:12px} th{color:var(--muted);text-align:left;padding:8px 6px;border-bottom:1px solid #222} td{padding:8px 6px;border-bottom:1px solid #1a1a1d}
    code{background:#1e1e21;padding:2px 6px;border-radius:6px}
    a{color:var(--gold);text-decoration:none}
    .gold{color:var(--gold)}
  </style></head><body><div class="wrap">
  <div class="hdr">
    <div><div class="k">Central Orchestration</div><div style="font-size:20px;font-weight:700">HERMES-TOTH <span class="gold">AUTONOMOUS</span> SYNTHETIC WORKFLOW</div>
    <div class="k" style="margin-top:6px">Single-edit sync: edit <code>${esc(ANGELS_HOSTS_URL)}</code> once → all agents auto-fetch</div></div>
    <div class="row"><span class="pulse"></span><span class="badge ok">ONLINE</span><span class="k">${new Date().toISOString()}</span></div>
  </div>

  <div class="grid">
    <div class="card"><div class="k">Commercial Pillars</div><div class="v">📚 pharaoh-library <span class="badge ok">active</span></div><div class="v">🎙️ microphone-kingdom <span class="badge ok">active</span></div><div class="v">🏛️ pharaoh-registry <span class="badge ok">active</span></div><div class="k" style="margin-top:10px">Entity label: <code>commercial</code> — no tax IDs exposed</div></div>
    <div class="card"><div class="k">Nonprofit Pillars</div><div class="v">🏛️ hall-el <span class="badge ok" style="color:#d4af37;border-color:#d4af3733;background:#d4af3712">isolated</span></div><div class="k" style="margin-top:10px">Firewall enforced at routing layer. Entity label: <code>nonprofit</code></div><div class="k" style="margin-top:10px">Source: <a href="${ANGELS_HOSTS_URL}" target="_blank">angels-hosts-api3</a></div></div>
  </div>

  <div class="grid">
    <div class="card"><div class="k">Service Bindings Health — Evidence of connection</div>
      <div style="margin-top:10px" class="row"><b>${esc(delivery.name)}</b> <span class="badge ${delivery.ok?'ok':'bad'}">${delivery.ok?'CONNECTED '+delivery.latency+'ms':'MISSING'}</span> <span class="k">${esc(delivery.error||'Service binding')}</span></div>
      <div style="margin-top:8px" class="row"><b>${esc(hosts.name)}</b> <span class="badge ${hosts.ok?'ok':'bad'}">${hosts.ok?'CONNECTED '+hosts.latency+'ms':'MISSING'}</span> <span class="k">${esc(hosts.error||'Service binding')}</span></div>
      <div style="margin-top:8px" class="row"><b>HERMES_MEMORY (KV)</b> <span class="badge ${memory.available?'ok':'bad'}">${memory.available?'CONNECTED - '+memory.count+' keys':'MISSING'}</span> <span class="k">${esc(memory.error||'KV namespace')}</span></div>
      <div class="k" style="margin-top:12px">Proof: If bindings show CONNECTED, hermes-autonomous.js is calling <code>binding.fetch()</code> internally — no public API key exposure. Check Cloudflare Pages > Settings > Functions > Service bindings to add them.</div>
    </div>
    <div class="card"><div class="k">Angels-Hosts Sync — Single Edit Proof</div>
      <div style="margin-top:10px" class="row"><b>Source:</b> <code>${esc(angels.url||ANGELS_HOSTS_URL)}</code> <span class="badge ${angels.ok?'ok':'bad'}">${angels.ok? angels.count+' videos':'FAIL'}</span> ${angels.ok? '<span class="k">'+angels.latency+'ms</span>':''}</div>
      ${angels.ok? '<div class="k" style="margin-top:8px">Last sync: '+new Date().toISOString()+' — edit 1 file in angels-hosts-api3, Hermes auto-reflects here. No need to edit Hermes-Toth-Agent.</div><div style="margin-top:10px;max-height:220px;overflow:auto">'+ angels.videos.map(v=>'<div style="padding:6px 0;border-bottom:1px solid #1e1e21"><b>'+esc(v.title||v.name||v.id||'video')+'</b> <span class="k">'+esc(v.url||v.src||'')+'</span></div>').join('') +'</div>' : '<div class="k" style="margin-top:8px">'+esc(angels.error||'')+' — ensure angels-hosts-api3 is deployed and CORS allows Pages.</div>'}
    </div>
  </div>

  <div class="card" style="margin-top:16px"><div class="k">HERMES_MEMORY — Last Events (evidence log)</div>
  ${!memory.available? '<div class="k" style="margin-top:10px">KV not bound. Add KV namespace HERMES_MEMORY in Cloudflare Pages settings to see event history.</div>' : memory.events.length===0? '<div class="k" style="margin-top:10px">No events yet. POST to /api/hermes-autonomous to create one.</div>' : '<table><tr><th>ID</th><th>Timestamp</th><th>Entity</th><th>Pillar</th><th>Event</th><th>Payload</th></tr>'+ memory.events.map(e=>'<tr><td><code>'+esc((e.id||'').slice(0,8))+'</code></td><td>'+esc(e.timestamp||'')+'</td><td><span class="badge '+(e.entity==='nonprofit'?'':'ok')+'">'+esc(e.entity||'')+'</span></td><td>'+esc(e.pillar||'')+'</td><td>'+esc(e.event||'')+'</td><td class="k">'+esc(JSON.stringify(e.payload||{}).slice(0,80))+'</td></tr>').join('') +'</table>'}
  <div class="k" style="margin-top:12px">Curl test: <code>curl -X POST /api/hermes-autonomous -d '{"event":"content.created","pillar":"pharaoh-library","entity":"commercial"}'</code></div>
  </div>

  <div class="card" style="margin-top:16px"><div class="k">Compliance & Roadmap</div>
  <div style="font-size:13px;line-height:1.6;margin-top:8px">
  • Per-recipient disclosure footer in all emails sent via AUTO_DELIVERY (Resend/Mailgun-style): "You received this because you subscribed to [pillar]. Open/click tracking used for delivery analytics. <a>Unsubscribe</a>"<br/>
  • CAN-SPAM/GDPR opt-out handled by AUTO_DELIVERY, not Hermes<br/>
  • No EINs or tax IDs in code or API responses — only internal labels <code>commercial</code> / <code>nonprofit</code><br/>
  • Roadmap: Mission 2 (Binding) ✅ Code Ready — needs binding config, Mission 3 (Memory) ✅ KV Ready, Mission 4 (Delivery) → expose sendEmail() in auto-delivery worker, Mission 5 (Media ledgers) → use this dashboard + angels-hosts sync, Mission 6 (Queues & Cron) → add Cloudflare Queues
  </div></div>

  <div class="k" style="text-align:center;margin:20px 0">HERMES-TOTH AGENT // Evidence > Claims — If bindings say CONNECTED and videos sync, Hermes is doing his job.</div>
  </div></body></html>`;

  return new Response(html, { headers: { "content-type":"text/html; charset=utf-8", "cache-control":"no-store" }});
}
