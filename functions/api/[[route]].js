export async function onRequest(context){
  const url = new URL(context.request.url);
  const path = url.pathname.replace('/api/','');
  let roster = null;
  try{
    const assetUrl = new URL('/roster.json', url.origin);
    const r = await context.env.ASSETS? await context.env.ASSETS.fetch(assetUrl) : await fetch(assetUrl);
    roster = await r.json();
  }catch(e){
    return new Response(JSON.stringify({error:"THE RECORD IS INCOMPLETE - roster.json missing"}),{status:500,headers:{'content-type':'application/json'}});
  }
  const artists = roster.artists||[];
  if(path==='roster' || path==='' ){
    return new Response(JSON.stringify(roster),{headers:{'content-type':'application/json','Access-Control-Allow-Origin':'*'}});
  }
  if(path.startsWith('artist/')){
    const id = path.split('/')[1]?.toUpperCase();
    const found = artists.find(a=>a.id===id);
    if(!found) return new Response(JSON.stringify({error:"THE RECORD DOES NOT ESTABLISH THAT"}),{status:404,headers:{'content-type':'application/json'}});
    return new Response(JSON.stringify(found),{headers:{'content-type':'application/json','Access-Control-Allow-Origin':'*'}});
  }
  if(path.startsWith('duet/')){
    const key = path.split('/')[1]?.toLowerCase();
    if(key==='lamed-twins') return new Response(JSON.stringify(artists.filter(a=>['ASA-012','ASA-013'].includes(a.id))),{headers:{'content-type':'application/json','Access-Control-Allow-Origin':'*'}});
    return new Response(JSON.stringify({note:"Use lamed-twins, double-helix, trinity, etc."}),{headers:{'content-type':'application/json'}});
  }
  if(path==='sigil'){
    return new Response(JSON.stringify({sigil:roster.sigil}),{headers:{'content-type':'application/json','Access-Control-Allow-Origin':'*'}});
  }
  return new Response(JSON.stringify({endpoints:["/api/roster","/api/artist/ASA-010","/api/duet/lamed-twins","/api/sigil"]}),{headers:{'content-type':'application/json','Access-Control-Allow-Origin':'*'}});
}
