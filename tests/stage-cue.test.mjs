import test from "node:test";
import assert from "node:assert/strict";
import { handleStageRoute, pickExpression } from "../js/workers/stage-cue.js";

function makeDeps() {
  const store = new Map(); const audits = [];
  const kv = { get: async k => store.get(k) ?? null, put: async (k, v) => { store.set(k, v); }, delete: async k => { store.delete(k); } };
  return { store, audits, d: {
    jsonResponse: (data, status) => ({ data, status }),
    authenticateOwner: r => r.headers.get("authorization") === "Bearer OWNER",
    getEvidenceVault: () => kv, requireKV: () => true,
    readJSONBody: async r => { try { return { value: await r.json() }; } catch { return { error: "bad json" }; } },
    cleanText: (v, n) => String(v ?? "").trim().slice(0, n),
    writeAudit: async (...a) => { audits.push(a); }
  }};
}
const call = (h, method, path, body, owner) => handleStageRoute(
  new Request("https://x" + path, { method, headers: owner ? { authorization: "Bearer OWNER" } : {}, body: body ? JSON.stringify(body) : undefined }),
  {}, path, method, "o", h.d);
const R = "/api/v1/micdom/stage";

test("rules pick sensible expressions", () => {
  assert.equal(pickExpression("Hello everyone!"), "welcome");
  assert.equal(pickExpression("why is the sky blue"), "thinking");
  assert.equal(pickExpression("bye for now"), "signoff");
  assert.equal(pickExpression("new release dropping"), "breaking");
  assert.equal(pickExpression("random words"), "neutral");
});
test("disarmed stage: public state is idle, events refused", async () => {
  const h = makeDeps();
  const s = await call(h, "GET", R + "/state");
  assert.equal(s.data.active, false); assert.equal(s.data.expression, "idle");
  assert.equal((await call(h, "POST", R + "/event", { text: "hi" })).status, 409);
});
test("arm/halt/event require owner where they should", async () => {
  const h = makeDeps();
  assert.equal((await call(h, "POST", R + "/arm", {})).status, 403);
  assert.equal((await call(h, "POST", R + "/halt", {})).status, 403);
  assert.equal((await call(h, "POST", R + "/arm", { minutes: 10 }, true)).status, 200);
  assert.equal((await call(h, "POST", R + "/event", { command: "breaking" })).status, 403);
  assert.equal((await call(h, "POST", R + "/event", { command: "evil" }, true)).status, 400);
});
test("armed: audience text becomes an allowlisted cue, rate limited", async () => {
  const h = makeDeps();
  await call(h, "POST", R + "/arm", { minutes: 10, audio: true }, true);
  const e = await call(h, "POST", R + "/event", { text: "Hello DJ!" });
  assert.equal(e.data.expression, "welcome");
  const s = await call(h, "GET", R + "/state");
  assert.equal(s.data.expression, "welcome"); assert.equal(s.data.audio, true); assert.equal(s.data.seq, 1);
  assert.equal((await call(h, "POST", R + "/event", { text: "why?" })).status, 429);
  assert.ok(!JSON.stringify(s.data).includes("Hello DJ"));   // audience text never echoed
});
test("halt returns stage to safe idle and blocks events", async () => {
  const h = makeDeps();
  await call(h, "POST", R + "/arm", { minutes: 10 }, true);
  await call(h, "POST", R + "/event", { command: "shocked" }, true);
  await call(h, "POST", R + "/halt", {}, true);
  const s = await call(h, "GET", R + "/state");
  assert.equal(s.data.active, false); assert.equal(s.data.halted, true); assert.equal(s.data.expression, "idle");
  assert.equal((await call(h, "POST", R + "/event", { text: "hi" })).status, 409);
  await call(h, "POST", R + "/arm", { minutes: 5 }, true);   // re-arm clears halt
  assert.equal((await call(h, "GET", R + "/state")).data.active, true);
});
test("expired session falls back to idle", async () => {
  const h = makeDeps();
  await call(h, "POST", R + "/arm", { minutes: 1 }, true);
  const s = JSON.parse(h.store.get("stage:micdom:session")); s.expiresAt = new Date(Date.now() - 1000).toISOString();
  h.store.set("stage:micdom:session", JSON.stringify(s));
  const r = await call(h, "GET", R + "/state");
  assert.equal(r.data.active, false); assert.equal(r.data.expression, "idle");
});

test("owner hold keeps an expression past the default 20s; visitors cannot extend it", async () => {
  const h = makeDeps();
  await call(h, "POST", R + "/arm", { minutes: 10 }, true);
  await call(h, "POST", R + "/event", { command: "WELCOME", hold: 185 }, true);   // case-insensitive
  const c = JSON.parse(h.store.get("stage:micdom:cue"));
  const secs = (Date.parse(c.expiresAt) - Date.parse(c.at)) / 1000;
  assert.ok(secs >= 184 && secs <= 186, "held ~185s, got " + secs);
  assert.equal((await call(h, "GET", R + "/state")).data.expression, "welcome");
  await call(h, "POST", R + "/event", { command: "idle", hold: 99999 }, true);
  const c2 = JSON.parse(h.store.get("stage:micdom:cue"));
  assert.ok((Date.parse(c2.expiresAt) - Date.parse(c2.at)) / 1000 <= 601, "hold is capped at 600s");
  h.store.set("stage:micdom:cue", JSON.stringify({ ...c2, at: new Date(Date.now() - 5000).toISOString() }));
  await call(h, "POST", R + "/event", { text: "hello", hold: 600 });   // visitor tries to hold
  const c3 = JSON.parse(h.store.get("stage:micdom:cue"));
  assert.ok((Date.parse(c3.expiresAt) - Date.parse(c3.at)) / 1000 <= 21, "visitor hold ignored");
});
