// functions/api/join.js - Cloudflare Pages Function - SAFE version that won't break deploy if KV not bound
export async function onRequestPost(context){
  try{
    const { request, env } = context;
    const data = await request.json().catch(()=>null);
    if(!data) return new Response(JSON.stringify({ok:false,error:'Invalid JSON'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    // Bot trap
    if(data.website && String(data.website).trim()!==''){
      return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    }
    const email = (data.email||'').trim().toLowerCase();
    const name = (data.name||'').trim();
    const terms = !!data.terms;
    const larp = !!data.larp;
    const marketing = !!data.marketing;
    if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      return new Response(JSON.stringify({ok:false,error:'Valid email required'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    }
    if(!terms || !larp){
      return new Response(JSON.stringify({ok:false,error:'Terms and LARP agreement required'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    }
    // SAFE: if KV not bound, log to console but still return success (don't crash build)
    const record = {email, name: name||null, terms_accepted:true, larp_accepted:true, marketing_consent:marketing, created_at:new Date().toISOString()};
    if(env.JOIN_KV){
      const id = Date.now()+'-'+Math.random().toString(36).slice(2,8);
      await env.JOIN_KV.put('join:'+id, JSON.stringify({...record, id}));
      await env.JOIN_KV.put('email:'+email, JSON.stringify({id, email, updated_at:record.created_at}));
      return new Response(JSON.stringify({ok:true,id}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    } else {
      console.log('JOIN_KV not bound - would store:', record);
      return new Response(JSON.stringify({ok:true, note:'KV not configured yet - email logged'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    }
  }catch(e){
    console.error(e);
    return new Response(JSON.stringify({ok:false,error:'Server error'}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }
}
export async function onRequestOptions(){
  return new Response(null,{headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
}
