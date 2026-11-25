// angel-host-api3 - Micdom Press Promoter (no scraping)
const OWNER_KEY = "CHANGE_ME_OWNER_KEY";
function json(data, status=200){
  return new Response(JSON.stringify(data), {status, headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
}
function pressReleaseText(d){
  return `FOR IMMEDIATE RELEASE\n${d.title}\n${d.artist} | Micdom AI Records | ${d.date}\n\n${d.body}\n\nLINKS:\n${(d.links||[]).map(l=>`- ${l}`).join("\n")}\n\nCONTACT:\nMicdom AI Records - MicdomAIRecords\nTikTok / YouTube / Rumble: @MicdomAIRecords\nRegistry: https://registry.pharaoh-conglomerate.org\n`;
}
export default {
  async fetch(req, env){
    const url = new URL(req.url);
    if(req.method==="OPTIONS") return new Response(null,{headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type"}});
    if(url.pathname==="/api/press/signup" && req.method==="POST"){
      const b = await req.json().catch(()=>({}));
      if(!b.email || !b.consent) return json({ok:false, error:"email + consent:true required"},400);
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) return json({ok:false, error:"invalid email"},400);
      const entry = {name:b.name||"", email:b.email.toLowerCase(), outlet:b.outlet||"", country:b.country||"", created:new Date().toISOString(), source:"opt-in"};
      if(env.PRESS_KV) await env.PRESS_KV.put(`press:${b.email.toLowerCase()}`, JSON.stringify(entry));
      return json({ok:true, message:"Subscribed to Micdom press releases.", entry});
    }
    if(url.pathname==="/api/press/list" && req.method==="GET"){
      if(url.searchParams.get("key")!==OWNER_KEY) return json({ok:false, error:"owner key required"},401);
      if(!env.PRESS_KV) return json({ok:true, note:"KV not bound - connect PRESS_KV", contacts:[]});
      const list = await env.PRESS_KV.list({prefix:"press:"});
      let contacts=[];
      for(const k of list.keys){ const v=await env.PRESS_KV.get(k.name); if(v) contacts.push(JSON.parse(v)); }
      return json({ok:true, count:contacts.length, contacts});
    }
    if(url.pathname==="/api/press/release" && req.method==="POST"){
      const b = await req.json().catch(()=>({}));
      if(!b.title || !b.body) return json({ok:false, error:"title + body required"},400);
      const data = {title:b.title, artist:b.artist||"Micdom AI Records", date:b.date||new Date().toISOString().slice(0,10), body:b.body, links:b.links||[]};
      const text = pressReleaseText(data);
      return json({ok:true, text});
    }
    return json({ok:true, service:"angel-host-api3 press promoter"});
  }
}
