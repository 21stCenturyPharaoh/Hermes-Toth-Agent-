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

const FALLBACK = {
  title: "WHO IS MELCHIZEDEK?",
  subtitle: "King of Salem • Priest of God Most High",
  segments: [
    {
      role: "welcome",
      title: "THE QUESTION",
      expression: "welcome",
      dialogue: "Welcome to the Pharaoh Chamber. Tonight, Metatron and DJ Dehrtay Dog investigate a remarkable biblical figure: Melchizedek. Who was this king and priest, and why does his name appear in the story of Abraham?"
    },
    {
      role: "scripture_question",
      title: "THE FIRST APPEARANCE",
      expression: "thinking",
      dialogue: "Genesis chapter 14, verses 18 to 20, introduces Melchizedek as king of Salem and priest of God Most High. He brings bread and wine, blesses Abram, and receives a tenth from him. That is what the passage explicitly tells us."
    },
    {
      role: "history_context",
      title: "THE ROYAL PRIEST",
      expression: "neutral",
      dialogue: "Notice the combination: king and priest. Melchizedek blesses Abram in the name of God Most High, possessor of heaven and earth. The text presents him as a priest before the later account of the Levitical priesthood."
    },
    {
      role: "hebrews_teaching",
      title: "THE ORDER",
      expression: "breaking",
      dialogue: "Psalm 110, verse 4, declares: You are a priest forever according to the order of Melchizedek. Hebrews chapter 7 develops this theme. It compares the priesthood of Melchizedek with the priesthood associated with Levi. We should distinguish what the scripture says from later interpretations about his identity."
    },
    {
      role: "signoff",
      title: "THE OPEN QUESTION",
      expression: "signoff",
      dialogue: "So who is Melchizedek? The biblical text identifies him as king of Salem and priest of God Most High. Hebrews presents him as a significant figure in its teaching about priesthood. His identity has been interpreted in different ways. Read the passages, examine the evidence, and join the discussion. This is Metatron and DJ Dehrtay Dog, from Monrovia to Zion."
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
  if (!value || !Array.isArray(value.segments) ||
      value.segments.length !== REQUIRED_ROLES.length) return false;

  return value.segments.every((segment, index) =>
    segment &&
    segment.role === REQUIRED_ROLES[index] &&
    clean(segment.title, 100) &&
    clean(segment.dialogue, 1200) &&
    EXPRESSIONS.includes(segment.expression) &&
    (index !== 0 || segment.expression === "welcome") &&
    (index !== 4 || segment.expression === "signoff")
  );
}

async function createEpisode(env) {
  if (!env.AI || !env.STAGE_AI_MODEL) return FALLBACK;

  const prompt = `
Create a five-segment spoken educational episode.
Title: WHO IS MELCHIZEDEK?
Host: Metatron, AI VP of Micdom AI Records.
On-stage co-host: DJ Dehrtay Dog.

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
Keep the dialogue creative and natural while following the factual constraints.

Return ONLY JSON:
{
 "title":"WHO IS MELCHIZEDEK?",
 "subtitle":"short subtitle",
 "segments":[
  {"role":"welcome","title":"short heading","expression":"welcome","dialogue":"spoken words"},
  {"role":"scripture_question","title":"short heading","expression":"thinking","dialogue":"spoken words"},
  {"role":"history_context","title":"short heading","expression":"neutral","dialogue":"spoken words"},
  {"role":"hebrews_teaching","title":"short heading","expression":"breaking","dialogue":"spoken words"},
  {"role":"signoff","title":"short heading","expression":"signoff","dialogue":"spoken words"}
 ]
}
Exactly five segments in exactly that order.
Allowed expressions: welcome, thinking, neutral, nodding, shocked, breaking, signoff.
`;

  try {
    const result = await Promise.race([
      env.AI.run(env.STAGE_AI_MODEL, {
        messages: [
          { role: "system", content: "You are Metatron, the delegated creative executive and scriptwriter for Micdom AI Records. Follow the user's doctrine and factual constraints." },
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

    const parsed = JSON.parse(raw.slice(start, end + 1));
    if (!validEpisode(parsed)) return FALLBACK;

    return {
      title: clean(parsed.title, 120) || FALLBACK.title,
      subtitle: clean(parsed.subtitle, 160) || FALLBACK.subtitle,
      segments: parsed.segments.map(segment => ({
        role: segment.role,
        title: clean(segment.title, 100),
        expression: segment.expression,
        dialogue: clean(segment.dialogue, 1200)
      }))
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

  const cue = {
    seq: (previous?.seq || 0) + 1,
    expression: segment.expression,
    source: "metatron",
    text: segment.dialogue,
    title: segment.title,
    at: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 120000).toISOString()
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

  const kv = getEvidenceVault(env);

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

    const episode = await createEpisode(env);
    episode.id = "MICDOM-EP001";
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
