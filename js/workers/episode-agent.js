// METATRON AUTONOMOUS EPISODE AGENT
// Episode 001: Who Is Melchizedek?
// Creative authority: delegated by Micdom owner.
// Protected stage controls remain owner-authenticated.

const ROOT = "/api/v1/micdom/episode";
const SESSION = "stage:micdom:session";
const HALT = "stage:micdom:halt";
const CUE = "stage:micdom:cue";
const EPISODE = "episode:micdom:current";

const EXPRESSIONS = [
  "welcome", "thinking", "neutral", "nodding",
  "shocked", "breaking", "signoff"
];


export const DEFAULT_CTA_FIELDS = {
  live_ctas: [
    { segment: 1, id: "follow", text: "Follow Micdom AI Records so you do not miss our next broadcast." },
    { segment: 2, id: "gift_rose", text: "Tap the screen, share the Live, and send DJ Dehrtay Dog a Rose if you would like. Gifts are always optional." },
    { segment: 3, id: "audience_registry", text: "Where are you watching from? Put your country in the chat. Explore the Human Rights Angels Registry and its affiliate programs at registry.pharaoh-conglomerate.org." },
    { segment: 4, id: "rumble_youtube", text: "Find Micdom AI Records on Rumble and YouTube at @MicdomAIRecords." },
    { segment: 5, id: "stripe_routenote", text: "Support our work voluntarily through our official Stripe link, and discover our music on RouteNote by searching MicdomAIRecords." }
  ],
  gift_ctas: [
    { id: "rose", gift: "Rose", optional: true, text: "Send DJ Dehrtay Dog a Rose if you would like. Gifts are optional." }
  ],
  traffic_ctas: [
    { id: "registry", platform: "Human Rights Angels Registry", url: "https://registry.pharaoh-conglomerate.org", text: "Explore the Registry and its affiliate programs." },
    { id: "rumble", platform: "Rumble", handle: "@MicdomAIRecords", text: "Find Micdom AI Records on Rumble at @MicdomAIRecords." },
    { id: "stripe", platform: "Stripe", url: "https://donate.stripe.com/6oUdR80s82gJ1nx8N2f7i00", voluntary: true, text: "Support our work voluntarily through our official Stripe link." },
    { id: "routenote", platform: "RouteNote", artist: "MicdomAIRecords", text: "Discover Micdom AI Records music on RouteNote by searching MicdomAIRecords." },
    { id: "youtube", platform: "YouTube", handle: "@MicdomAIRecords", text: "Subscribe to Micdom AI Records on YouTube at @MicdomAIRecords." }
  ],
  closing_cta: "Follow, share, and join us again. This is Nefertiti with DJ Dehrtay Dog, broadcasting from Monrovia to the world.",
  pinned_comments: [
    "Follow Micdom AI Records. Registry and affiliate programs: https://registry.pharaoh-conglomerate.org | Rumble + YouTube: @MicdomAIRecords | RouteNote: MicdomAIRecords",
    "Optional support: https://donate.stripe.com/6oUdR80s82gJ1nx8N2f7i00. Gifts are voluntary; no Gift is required to participate."
  ],
  cta_rotation: { strategy: "per-segment", repeat_consecutive: false, segment_order: [1, 2, 3, 4, 5] }
};

const HALLEL_DISCLAIMER = "The LARP is a game. The real Volunteer Exchange Portal remains the operational system for actual volunteer registration, missions, records, and recognition. The LARP adds the story; the Portal provides the structure. LARP points, badges, titles, and ranks are fictional heraldry — they carry no real-world authority, status, or guaranteed income. Actual volunteer activity and records remain subject to their actual terms, documentation, and responsible parties.";

function withDefaultCtas(value) {
  const result = { ...value };
  for (const [key, fallback] of Object.entries(DEFAULT_CTA_FIELDS)) {
    if (result[key] === undefined || result[key] === null) result[key] = fallback;
  }
  return result;
}

function validLiveCtaFields(value) {
  if (!value || !Array.isArray(value.live_ctas) || value.live_ctas.length !== 5) return false;
  if (!Array.isArray(value.gift_ctas) || !value.gift_ctas.some(item =>
    item && item.id === "rose" && item.gift === "Rose" && item.optional === true && clean(item.text, 300))) return false;
  if (!Array.isArray(value.traffic_ctas)) return false;
  const traffic = new Map(value.traffic_ctas.map(item => [item && item.id, item]));
  const registry = traffic.get("registry"), rumble = traffic.get("rumble");
  const stripe = traffic.get("stripe"), routenote = traffic.get("routenote");
  const youtube = traffic.get("youtube");
  if (!registry || registry.url !== "https://registry.pharaoh-conglomerate.org") return false;
  if (!rumble || rumble.handle !== "@MicdomAIRecords") return false;
  if (!stripe || stripe.url !== "https://donate.stripe.com/6oUdR80s82gJ1nx8N2f7i00" || stripe.voluntary !== true) return false;
  if (!routenote || routenote.artist !== "MicdomAIRecords") return false;
  if (!youtube || youtube.handle !== "@MicdomAIRecords") return false;
  if (!value.live_ctas.every((item, index) => item && item.segment === index + 1 && clean(item.id, 60) && clean(item.text, 400))) return false;
  if (!clean(value.closing_cta, 400)) return false;
  if (!Array.isArray(value.pinned_comments) || value.pinned_comments.length < 1 || !value.pinned_comments.every(item => clean(item, 700))) return false;
  if (!value.cta_rotation || value.cta_rotation.repeat_consecutive !== false ||
      !Array.isArray(value.cta_rotation.segment_order) ||
      value.cta_rotation.segment_order.join(",") !== "1,2,3,4,5") return false;
  return true;
}

function validLarpPosts(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (!Number.isInteger(value.day) || value.day < 1) return false;
  if (!Number.isInteger(value.episode) || value.episode < 0) return false;
  if (!clean(value.title, 100) || !clean(value.opening_lines, 1200)) return false;
  if (!Array.isArray(value.play_today) || value.play_today.length < 1 || value.play_today.length > 12 ||
      !value.play_today.every(item => clean(item, 300))) return false;
  return !!clean(value.chat_poll, 300) && !!clean(value.pinned_comment, 1000) && !!clean(value.closing_cta, 500);
}

const FALLBACK = {
  title: "WHO IS MELCHIZEDEK?",
  subtitle: "King of Salem • Priest of God Most High",
  ...DEFAULT_CTA_FIELDS,
  segments: [
    {
      role: "welcome",
      volume: 70,
      title: "THE QUESTION",
      expression: "welcome",
      dialogue: "Welcome to the Pharaoh Chamber. Nefertiti here with DJ Dehrtay Dog. Tonight, we investigate a remarkable biblical figure: Melchizedek. Who was this king and priest, and why does his name appear in the story of Abraham?"
    },
    {
      role: "scripture_question",
      volume: 70,
      title: "THE FIRST APPEARANCE",
      expression: "thinking",
      dialogue: "Genesis chapter 14, verses 18 to 20, introduces Melchizedek as king of Salem and priest of God Most High. He brings bread and wine, blesses Abram, and receives a tenth from him. That is what the passage explicitly tells us."
    },
    {
      role: "history_context",
      volume: 70,
      title: "THE ROYAL PRIEST",
      expression: "neutral",
      dialogue: "Notice the combination: king and priest. Melchizedek blesses Abram in the name of God Most High, possessor of heaven and earth. The text presents him as a priest before the later account of the Levitical priesthood."
    },
    {
      role: "hebrews_teaching",
      volume: 70,
      title: "THE ORDER",
      expression: "breaking",
      dialogue: "Psalm 110, verse 4, declares: You are a priest forever according to the order of Melchizedek. Hebrews chapter 7 develops this theme. It compares the priesthood of Melchizedek with the priesthood associated with Levi. We should distinguish what the scripture says from later interpretations about his identity."
    },
    {
      role: "signoff",
      volume: 70,
      title: "THE OPEN QUESTION",
      expression: "signoff",
      dialogue: "So who is Melchizedek? The biblical text identifies him as king of Salem and priest of God Most High. Hebrews presents him as a significant figure in its teaching about priesthood. His identity has been interpreted in different ways. Read the passages, examine the evidence, and join the discussion. This is Nefertiti and DJ Dehrtay Dog, from Monrovia to Zion."
    }
  ]
};

function clean(value, max = 1200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function readJSON(kv, key) {
  try {
    const value = await kv.get(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

const REQUIRED_ROLES = [
  "welcome",
  "scripture_question",
  "history_context",
  "hebrews_teaching",
  "signoff"
];

function validEpisode(value) {
  if (!value || !clean(value.title, 120) || !Array.isArray(value.segments) ||
      value.segments.length !== REQUIRED_ROLES.length || !validLiveCtaFields(value)) return false;
  return value.segments.every((segment, index) => {
    if (!segment || !Number.isInteger(segment.volume) || segment.volume < 55 || segment.volume > 85 ||
        segment.role !== REQUIRED_ROLES[index] || !clean(segment.title,100) || !clean(segment.dialogue,1200) ||
        !EXPRESSIONS.includes(segment.expression) || (index===0 && segment.expression!=="welcome") ||
        (index===4 && segment.expression!=="signoff")) return false;
    const cta=value.live_ctas[index], closing=index===4 ? value.closing_cta : "";
    return segment.dialogue.length + cta.text.length + closing.length + 2 <= 1200;
  });
}

async function createEpisode(env) {
  if (!env.AI || !env.STAGE_AI_MODEL) return FALLBACK;

  const prompt = `
Create a five-segment spoken educational episode.
Title: WHO IS MELCHIZEDEK?
Narrator and presenter: Nefertiti.
On-stage co-host: DJ Dehrtay Dog.
Metatron remains the AI VP and technical automation agent of Micdom AI Records; do not present Metatron as the narrator.

Use only these biblical references:
Genesis 14:18-20, Psalm 110:4, Hebrews 7.
Do not invent historical facts, quotations, dates, or identities.
Distinguish explicit biblical statements from interpretation.
Do not claim certainty where the text leaves questions open.
Write accessible spoken dialogue, 55-90 words per segment.
Make the five narrative roles appear in this exact order:
1. welcome — opening and welcome
2. scripture_question — Scripture and the central question
3. history_context — historical or textual context
4. hebrews_teaching — Hebrews and the teaching
5. signoff — thoughtful conclusion inviting discussion

Do not omit, duplicate, or reorder roles.
The first segment must use expression "welcome".
The final segment must use expression "signoff".
Choose suitable expressions for the middle segments.
For every segment choose an integer volume from 55 to 85. This single master level controls DJ clips, sound effects, and spoken narration together. Use 70 as a normal baseline, 60-68 for reflective passages, and 72-82 for emphasis. Avoid abrupt volume jumps. Keep spoken words clear.
Keep the dialogue creative and natural while following the factual constraints.

Return ONLY JSON:
{
 "title":"WHO IS MELCHIZEDEK?",
 "subtitle":"short subtitle",
 "segments":[
  {"role":"welcome","title":"short heading","expression":"welcome","volume":70,"dialogue":"spoken words"},
  {"role":"scripture_question","title":"short heading","expression":"thinking","volume":70,"dialogue":"spoken words"},
  {"role":"history_context","title":"short heading","expression":"neutral","volume":70,"dialogue":"spoken words"},
  {"role":"hebrews_teaching","title":"short heading","expression":"breaking","volume":70,"dialogue":"spoken words"},
  {"role":"signoff","title":"short heading","expression":"signoff","volume":70,"dialogue":"spoken words"}
 ]
}
Exactly five segments in exactly that order.
Allowed expressions: welcome, thinking, neutral, nodding, shocked, breaking, signoff.
`;

  try {
    const result = await Promise.race([
      env.AI.run(env.STAGE_AI_MODEL, {
        messages: [
          { role: "system", content: "You are Nefertiti, the female on-air narrator and delegated episode scriptwriter for Micdom AI Records. DJ Dehrtay Dog is your on-stage co-host. Metatron remains the AI VP and technical automation agent, not the narrator. Follow the user's doctrine and factual constraints." },
          { role: "user", content: prompt }
        ],
        max_tokens: 1800
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("AI timeout")), 12000)
      )
    ]);

    let raw = String(result?.response || result?.result || "");
    raw = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) return FALLBACK;

    const parsed = withDefaultCtas(JSON.parse(raw.slice(start, end + 1)));
    if (!validEpisode(parsed)) return FALLBACK;
    return {
      title: clean(parsed.title, 120) || FALLBACK.title,
      subtitle: clean(parsed.subtitle, 160) || FALLBACK.subtitle,
      segments: parsed.segments.map(segment => ({
        role: segment.role, title: clean(segment.title,100), expression: segment.expression,
        volume: segment.volume, dialogue: clean(segment.dialogue,1200)
      })),
      ...DEFAULT_CTA_FIELDS
    };
  } catch {
    return FALLBACK;
  }
}

async function stageIsArmed(kv) {
  const session = await readJSON(kv, SESSION);
  const halt = await readJSON(kv, HALT);
  if (!session || Date.parse(session.expiresAt) <= Date.now()) return false;
  if (halt && Date.parse(halt.haltedAt) >= Date.parse(session.armedAt)) return false;
  return true;
}

async function publishSegment(kv, episode, index) {
  const segment = episode.segments[index];
  const previous = await readJSON(kv, CUE);

  const liveCta=episode.live_ctas.find(item=>item.segment===index+1);
  const ctaText=[liveCta?.text,index===4?episode.closing_cta:""].filter(Boolean).join(" ");
  const spokenText=[segment.dialogue,ctaText].filter(Boolean).join(" ");
  const cue = {
    seq:(previous?.seq||0)+1, expression:segment.expression, volume:segment.volume,
    source:"metatron", text:spokenText.slice(0,1200), narrationText:segment.dialogue,
    ctaText, ctaIds:[liveCta?.id,index===4?"closing":null].filter(Boolean),
    title:segment.title, at:new Date().toISOString(),
    expiresAt:new Date(Date.now()+120000).toISOString()
  };

  episode.currentSegment = index;
  episode.status = "running";
  episode.updatedAt = new Date().toISOString();

  await kv.put(CUE, JSON.stringify(cue), { expirationTtl: 3600 });
  await kv.put(EPISODE, JSON.stringify(episode), { expirationTtl: 86400 });

  return cue;
}

export async function handleEpisodeRoute(request, env, path, method, origin, d) {
  if (!path.startsWith(ROOT)) return null;

  const {
    jsonResponse, authenticateOwner, getEvidenceVault,
    requireKV, readJSONBody, cleanText, writeAudit
  } = d;

  if (!requireKV(env)) {
    return jsonResponse({ ok: false, error: "Storage is not configured" }, 503, origin);
  }

  if (path === ROOT + "/fixture-test" && env?.ENVIRONMENT !== "preview") {
    return jsonResponse({ok:false,error:"Preview-only fixture route"},404,origin);
  }
  const kv = getEvidenceVault(env);

  if (path === ROOT + "/fixture-test") {
    if (method !== "POST") return jsonResponse({ok:false,error:"Method not allowed"},405,origin);
    if (!authenticateOwner(request,env)) return jsonResponse({ok:false,error:"Owner authorization required for preview fixtures"},403,origin);
    const body=await readJSONBody(request);
    if (body.error) return jsonResponse({ok:false,error:body.error},400,origin);
    const fixture=withDefaultCtas(body.value);
    if (!validEpisode(fixture)) return jsonResponse({ok:false,error:"Five-segment episode or Live CTA validation failed"},400,origin);
    if (fixture.larp_posts!==undefined && fixture.larp_posts!==null &&
        (!validLarpPosts(fixture.larp_posts) || !clean(fixture.standing_disclaimer,2000))) {
      return jsonResponse({ok:false,error:"H.A.L.L.EL LARP fields or standing disclaimer are invalid"},400,origin);
    }
    const fixtureId=crypto.randomUUID();
    const record={...fixture,fixtureId,previewOnly:true,validatedAt:new Date().toISOString()};
    await kv.put("episode:micdom:fixture:"+fixtureId,JSON.stringify(record),{expirationTtl:604800});
    return jsonResponse({ok:true,previewOnly:true,fixtureId,totalSegments:record.segments.length,
      larpPosts:record.larp_posts?{day:record.larp_posts.day,episode:record.larp_posts.episode}:null,
      ctaDestinations:record.traffic_ctas.map(item=>item.id)},201,origin);
  }

  if (path === ROOT + "/start") {
    if (method !== "POST") {
      return jsonResponse({ ok: false, error: "Method not allowed" }, 405, origin);
    }
    if (!authenticateOwner(request, env)) {
      return jsonResponse({ ok: false, error: "Owner authorization required to commission an episode" }, 403, origin);
    }
    if (!await stageIsArmed(kv)) {
      return jsonResponse({ ok: false, error: "Arm the Pharaoh Chamber before starting the episode" }, 409, origin);
    }

    const existing = await readJSON(kv, EPISODE);
    if (existing?.status === "running") {
      return jsonResponse({ ok: false, error: "An episode is already running" }, 409, origin);
    }

    const body = await readJSONBody(request);
    if (body.error) {
      return jsonResponse({ ok: false, error: body.error }, 400, origin);
    }

    let episode;
    const fixtureId = body.value && body.value.fixtureId;

    if (fixtureId !== undefined && fixtureId !== null && fixtureId !== "") {
      // A fixture handoff is never permitted in Production.
      if (env?.ENVIRONMENT !== "preview") {
        return jsonResponse({ ok: false, error: "Preview-only fixture handoff" }, 404, origin);
      }

      const id = typeof fixtureId === "string" ? fixtureId.trim() : "";
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        return jsonResponse({ ok: false, error: "Invalid Preview fixture ID" }, 400, origin);
      }

      const saved = await readJSON(kv, "episode:micdom:fixture:" + id);
      if (!saved || saved.previewOnly !== true || saved.fixtureId !== id) {
        return jsonResponse({ ok: false, error: "Preview fixture not found or expired" }, 404, origin);
      }

      episode = withDefaultCtas(saved);
      if (!validEpisode(episode)) {
        return jsonResponse({ ok: false, error: "Saved Preview fixture failed episode validation" }, 400, origin);
      }
      if (episode.larp_posts !== undefined && episode.larp_posts !== null &&
          (!validLarpPosts(episode.larp_posts) || !clean(episode.standing_disclaimer, 2000))) {
        return jsonResponse({ ok: false, error: "Saved H.A.L.L.EL LARP fields or disclaimer are invalid" }, 400, origin);
      }

      episode = { ...episode };
      delete episode.fixtureId;
      delete episode.previewOnly;
      delete episode.validatedAt;
      episode.id = "MICDOM-PREVIEW-" + id.slice(0, 8);
    } else {
      episode = await createEpisode(env);
      episode.id = "MICDOM-EP001";
    }

    episode.organization = "micdom";
    episode.status = "ready";
    episode.createdAt = new Date().toISOString();
    episode.currentSegment = -1;
    episode.lastAdvancedAt = 0;

    const cue = await publishSegment(kv, episode, 0);
    await writeAudit(env, "metatron", "episode.started", "episode", episode.id);

    return jsonResponse({
      ok: true,
      episode: {
        id: episode.id,
        title: episode.title,
        subtitle: episode.subtitle,
        totalSegments: episode.segments.length,
        currentSegment: 1,
        status: episode.status
      },
      cue
    }, 200, origin);
  }

  if (path === ROOT + "/stop") {
    if (method !== "POST") {
      return jsonResponse({ ok: false, error: "Method not allowed" }, 405, origin);
    }
    if (!authenticateOwner(request, env)) {
      return jsonResponse({ ok: false, error: "Owner authorization required to stop the episode" }, 403, origin);
    }

    const episode = await readJSON(kv, EPISODE);
    if (!episode) {
      await kv.delete(CUE);
      return jsonResponse({ ok: true, stopped: false, status: "idle" }, 200, origin);
    }

    const wasRunning = episode.status === "running";
    if (wasRunning) {
      episode.status = "halted";
      episode.haltedAt = new Date().toISOString();
      episode.updatedAt = episode.haltedAt;
      await kv.put(EPISODE, JSON.stringify(episode), { expirationTtl: 86400 });
      await writeAudit(env, "micdom-owner", "episode.halted", "episode", episode.id || "current");
    }

    await kv.delete(CUE);

    return jsonResponse({
      ok: true,
      stopped: wasRunning,
      status: episode.status || "idle"
    }, 200, origin);
  }

  if (path === ROOT + "/state") {
    if (method !== "GET") {
      return jsonResponse({ ok: false, error: "Method not allowed" }, 405, origin);
    }
    const episode = await readJSON(kv, EPISODE);
    if (!episode) return jsonResponse({ ok: true, episode: null }, 200, origin);

    const segment = episode.segments[episode.currentSegment] || null;
    return jsonResponse({
      ok: true,
      episode: {
        id: episode.id,
        title: episode.title,
        subtitle: episode.subtitle,
        status: episode.status,
        currentSegment: episode.currentSegment + 1,
        totalSegments: episode.segments.length,
        segment
      }
    }, 200, origin);
  }

  if (path === ROOT + "/advance") {
    if (method !== "POST") {
      return jsonResponse({ ok: false, error: "Method not allowed" }, 405, origin);
    }
    if (!authenticateOwner(request, env)) {
      return jsonResponse({ ok: false, error: "Owner authorization required to advance the episode" }, 403, origin);
    }
    if (!await stageIsArmed(kv)) {
      return jsonResponse({ ok: false, error: "Stage is not armed" }, 409, origin);
    }

    const episode = await readJSON(kv, EPISODE);
    if (!episode || episode.status !== "running") {
      return jsonResponse({ ok: false, error: "No running episode" }, 409, origin);
    }

    if (Date.now() - Number(episode.lastAdvancedAt || 0) < 12000) {
      return jsonResponse({ ok: false, error: "Segment is still playing" }, 429, origin);
    }

    const next = episode.currentSegment + 1;
    if (next >= episode.segments.length) {
      episode.status = "completed";
      episode.completedAt = new Date().toISOString();
      await kv.put(EPISODE, JSON.stringify(episode), { expirationTtl: 86400 });
      await writeAudit(env, "metatron", "episode.completed", "episode", episode.id);
      return jsonResponse({ ok: true, completed: true }, 200, origin);
    }

    episode.lastAdvancedAt = Date.now();
    const cue = await publishSegment(kv, episode, next);
    await writeAudit(env, "metatron", "episode.segment", "episode", episode.id + "#" + (next + 1));

    return jsonResponse({
      ok: true,
      completed: false,
      currentSegment: next + 1,
      totalSegments: episode.segments.length,
      cue
    }, 200, origin);
  }

  return jsonResponse({ ok: false, error: "Episode route not found" }, 404, origin);
}
