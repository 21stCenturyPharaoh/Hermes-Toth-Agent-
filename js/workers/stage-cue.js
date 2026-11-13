// Metatron stage automation for the Pharaoh Chamber.
// Owner ARMS a time-boxed session; Metatron (this Worker) picks expressions
// from a fixed allowlist; the stage page polls a public, read-only state.
// No owner token ever reaches browser code beyond the existing owner login.

export const EXPRESSIONS = ["idle", "welcome", "shocked", "neutral",
  "nodding", "breaking", "thinking", "signoff"];

const ROOT = "/api/v1/micdom/stage";
const K_SESSION = "stage:micdom:session";
const K_HALT = "stage:micdom:halt";
const K_CUE = "stage:micdom:cue";
const MIN_GAP_MS = 3000;     // best-effort rate limit between cues
const CUE_TTL_MS = 20000;    // a cue shows this long, then stage returns to idle
const MAX_HOLD_S = 600;       // owner commands may hold an expression up to 10 minutes

export function pickExpression(text) {
  const t = String(text || "").toLowerCase();
  if (/\b(bye|goodbye|goodnight|sign ?off|see you|thanks for watching)\b/.test(t)) return "signoff";
  if (/\b(breaking|new release|dropping|announce|announcement)\b/.test(t)) return "breaking";
  if (/\b(hello|hi|hey|welcome|greetings)\b/.test(t)) return "welcome";
  if (/\b(wow|shock|shocked|no way|amazing|unbelievable)\b/.test(t)) return "shocked";
  if (/\?/.test(t) || /\b(why|how|think|maybe|wonder)\b/.test(t)) return "thinking";
  if (/\b(yes|agree|true|right|okay|ok|good|great|amen)\b/.test(t)) return "nodding";
  return "neutral";
}

async function aiPick(env, text) {
  if (!env.AI || !env.STAGE_AI_MODEL) return null;   // opt-in via env vars
  try {
    const run = env.AI.run(env.STAGE_AI_MODEL, {
      messages: [
        { role: "system", content: "Choose one stage expression for a DJ dog host. Reply with exactly one word from: " + EXPRESSIONS.join(", ") + "." },
        { role: "user", content: String(text).slice(0, 200) }
      ],
      max_tokens: 6
    });
    const out = await Promise.race([run, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))]);
    const word = String(out && (out.response || out.result || "")).toLowerCase().match(/[a-z]+/);
    return word && EXPRESSIONS.includes(word[0]) ? word[0] : null;   // allowlist only
  } catch { return null; }
}

async function readJSON(kv, key) {
  const raw = await kv.get(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function currentState(kv) {
  const [session, halt, cue] = await Promise.all([
    readJSON(kv, K_SESSION), readJSON(kv, K_HALT), readJSON(kv, K_CUE)
  ]);
  const now = Date.now();
  const armed = !!(session && Date.parse(session.expiresAt) > now);
  const halted = !!(halt && (!session || Date.parse(halt.haltedAt) >= Date.parse(session.armedAt)));
  const active = armed && !halted;
  const live = !!(active && cue && Date.parse(cue.expiresAt) > now);
  return {
    active, halted, session, cue,
    view: {
      ok: true, active, halted,
      audio: active && !!session.audio,
      expression: live ? cue.expression : "idle",
      seq: cue ? cue.seq : 0,
      sessionExpiresAt: active ? session.expiresAt : null
    }
  };
}

export async function handleStageRoute(request, env, path, method, origin, d) {
  if (!path.startsWith(ROOT)) return null;
  const { jsonResponse, authenticateOwner, getEvidenceVault, requireKV,
          readJSONBody, cleanText, writeAudit } = d;
  if (!requireKV(env)) return jsonResponse({ ok: false, error: "Storage is not configured" }, 503, origin);
  const kv = getEvidenceVault(env);

  if (path === ROOT + "/state") {
    if (method !== "GET") return jsonResponse({ ok: false, error: "Method not allowed" }, 405, origin);
    return jsonResponse((await currentState(kv)).view, 200, origin);
  }

  if (path === ROOT + "/arm") {
    if (method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed" }, 405, origin);
    if (!authenticateOwner(request, env)) return jsonResponse({ ok: false, error: "Owner approval credential required" }, 403, origin);
    const body = await readJSONBody(request);
    if (body.error) return jsonResponse({ ok: false, error: body.error }, 400, origin);
    const minutes = Math.min(120, Math.max(1, Math.floor(Number(body.value.minutes)) || 30));
    const session = {
      armedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + minutes * 60000).toISOString(),
      audio: body.value.audio === true
    };
    await kv.put(K_SESSION, JSON.stringify(session), { expirationTtl: minutes * 60 + 60 });
    await kv.delete(K_HALT);
    await writeAudit(env, "micdom-owner", "stage.armed", "stage", session.audio ? "audio" : "silent");
    return jsonResponse({ ok: true, session }, 200, origin);
  }

  if (path === ROOT + "/halt") {
    if (method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed" }, 405, origin);
    if (!authenticateOwner(request, env)) return jsonResponse({ ok: false, error: "Owner approval credential required" }, 403, origin);
    await kv.put(K_HALT, JSON.stringify({ haltedAt: new Date().toISOString() }), { expirationTtl: 86400 });
    await kv.delete(K_SESSION);
    await writeAudit(env, "micdom-owner", "stage.halted", "stage", "halt");
    return jsonResponse({ ok: true, halted: true }, 200, origin);
  }

  if (path === ROOT + "/event") {
    if (method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed" }, 405, origin);
    const st = await currentState(kv);
    if (!st.active) return jsonResponse({ ok: false, error: "Stage is not armed" }, 409, origin);
    const body = await readJSONBody(request);
    if (body.error) return jsonResponse({ ok: false, error: body.error }, 400, origin);

    const isOwner = authenticateOwner(request, env);
    let expression, source, holdMs = CUE_TTL_MS;
    const command = cleanText(body.value.command, 20).toLowerCase();
    if (command) {
      if (!isOwner) return jsonResponse({ ok: false, error: "Owner approval credential required" }, 403, origin);
      if (!EXPRESSIONS.includes(command)) return jsonResponse({ ok: false, error: "Expression is not allowlisted" }, 400, origin);
      expression = command; source = "owner";
      var ownerText = cleanText(body.value.text, 200);
      const hold = Math.floor(Number(body.value.hold));   // owner-only: keep this expression on for N seconds
      if (hold >= 5) holdMs = Math.min(MAX_HOLD_S, hold) * 1000;
    } else {
      const text = cleanText(body.value.text, 200);
      var ownerText = text;
      if (!text) return jsonResponse({ ok: false, error: "Provide text or an owner command" }, 400, origin);
      expression = (await aiPick(env, text)) || pickExpression(text);
      source = "metatron";
    }

    const prev = st.cue;
    if (source !== "owner" && prev && Date.now() - Date.parse(prev.at) < MIN_GAP_MS) {
      return jsonResponse({ ok: false, error: "Slow down: Metatron is mid-expression" }, 429, origin);
    }
    const cue = {
      seq: (prev ? prev.seq : 0) + 1, expression, source, text: (typeof ownerText !== "undefined" ? ownerText : ""),
      at: new Date().toISOString(),
      expiresAt: new Date(Date.now() + holdMs).toISOString()
    };
    await kv.put(K_CUE, JSON.stringify(cue), { expirationTtl: 3600 });
    await writeAudit(env, source === "owner" ? "micdom-owner" : "metatron", "stage.cue", "stage", expression + "#" + cue.seq);
    return jsonResponse({ ok: true, expression, seq: cue.seq, text: cue.text }, 200, origin);
  }

  return jsonResponse({ ok: false, error: "Stage route not found" }, 404, origin);
}
