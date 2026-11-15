import test from "node:test";
import assert from "node:assert/strict";
import api from "../js/workers/api.js";
import { DEFAULT_CTA_FIELDS } from "../js/workers/episode-agent.js";

class MockKV {
  constructor() {
    this.data = new Map();
  }

  async put(key, value) {
    this.data.set(key, value);
  }

  async get(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  }

  async list({ prefix = "", limit = 100 } = {}) {
    const keys = [...this.data.keys()]
      .filter(key => key.startsWith(prefix))
      .slice(0, limit)
      .map(name => ({ name }));

    return { keys, list_complete: true };
  }
}

function setup() {
  return {
    ENVIRONMENT: "production",
    MICDOM_API_TOKEN: "micdom-test-token",
    REGISTRY_API_TOKEN: "registry-test-token",
    MICDOM_OWNER_TOKEN: "owner-test-token",
    EVIDENCE_VAULT: new MockKV(),
    EVIDENCE_PREVIEW_VAULT: new MockKV()
  };
}

function request(path, options = {}) {
  return new Request("https://worker.test" + path, options);
}

function auth(token) {
  return { Authorization: "Bearer " + token };
}

async function call(env, path, options = {}) {
  return api.fetch(request(path, options), env, {});
}

test("health endpoint remains public", async () => {
  const response = await call(setup(), "/api/health");
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.service, "Hermes-Toth-Agent");
});

test("Registry service information is public and does not enable transactions", async () => {
  const response = await call(setup(), "/api/v1/registry/services");
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.services.find(x => x.id === "payments").status, "not-enabled");
});

test("private API rejects missing credentials", async () => {
  const response = await call(setup(), "/api/v1/status");
  assert.equal(response.status, 401);
});

test("Micdom credential cannot enter Registry status", async () => {
  const response = await call(setup(), "/api/v1/registry/status", {
    headers: auth("micdom-test-token")
  });

  assert.equal(response.status, 403);
});

test("Registry credential cannot enter Micdom status", async () => {
  const response = await call(setup(), "/api/v1/micdom/status", {
    headers: auth("registry-test-token")
  });

  assert.equal(response.status, 403);
});

test("Micdom can create a release draft but it is not public", async () => {
  const env = setup();

  const response = await call(env, "/api/v1/micdom/releases", {
    method: "POST",
    headers: {
      ...auth("micdom-test-token"),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: "Test Release",
      artist: "Micdom AI Records"
    })
  });

  const data = await response.json();

  assert.equal(response.status, 201);
  assert.equal(data.record.status, "draft");

  const publicResponse = await call(
    env,
    "/api/v1/public/micdom/releases"
  );

  const publicData = await publicResponse.json();
  assert.equal(publicData.records.length, 0);
});

test("only the separate owner credential can approve a release", async () => {
  const env = setup();

  const createResponse = await call(env, "/api/v1/micdom/releases", {
    method: "POST",
    headers: {
      ...auth("micdom-test-token"),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title: "Approval Test" })
  });

  const created = await createResponse.json();
  const id = created.record.id;

  const denied = await call(
    env,
    `/api/v1/micdom/releases/${id}/approve`,
    {
      method: "POST",
      headers: auth("micdom-test-token")
    }
  );

  assert.equal(denied.status, 403);

  const approved = await call(
    env,
    `/api/v1/micdom/releases/${id}/approve`,
    {
      method: "POST",
      headers: auth("owner-test-token")
    }
  );

  assert.equal(approved.status, 200);

  const publicResponse = await call(
    env,
    "/api/v1/public/micdom/releases"
  );

  const publicData = await publicResponse.json();
  assert.equal(publicData.records.length, 1);
  assert.equal(publicData.records[0].status, "approved");
});

test("Registry applications remain disabled", async () => {
  const response = await call(setup(), "/api/v1/registry/applications", {
    method: "POST",
    headers: {
      ...auth("registry-test-token"),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name: "Test" })
  });

  assert.equal(response.status, 501);
});

test("draft creation writes an audit event", async () => {
  const env = setup();

  await call(env, "/api/v1/micdom/announcements", {
    method: "POST",
    headers: {
      ...auth("micdom-test-token"),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: "Test Announcement",
      body: "A test announcement."
    })
  });

  const audit = await env.EVIDENCE_VAULT.list({
    prefix: "audit:micdom:"
  });

  assert.equal(audit.keys.length, 1);
});

test("owner can view Micdom drafts", async () => {
  const env = setup();

  await call(env, "/api/v1/micdom/releases", {
    method: "POST",
    headers: {
      ...auth("micdom-test-token"),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title: "Private Draft" })
  });

  const response = await call(env, "/api/v1/micdom/releases", {
    headers: auth("owner-test-token")
  });

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.records.length, 1);
  assert.equal(data.records[0].status, "draft");
});

test("owner can read Micdom audit records", async () => {
  const env = setup();

  await call(env, "/api/v1/micdom/announcements", {
    method: "POST",
    headers: {
      ...auth("micdom-test-token"),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: "Audit Test",
      body: "Test body"
    })
  });

  const response = await call(env, "/api/v1/micdom/audit", {
    headers: auth("owner-test-token")
  });

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.events.length, 1);
});

test("owner credential cannot enter Registry", async () => {
  const response = await call(setup(), "/api/v1/registry/status", {
    headers: auth("owner-test-token")
  });

  assert.equal(response.status, 403);
});

test("Micdom draft creation rejects missing title", async () => {
  const response = await call(setup(), "/api/v1/micdom/releases", {
    method: "POST",
    headers: {
      ...auth("micdom-test-token"),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ artist: "Test Artist" })
  });

  assert.equal(response.status, 400);
});

test("Micdom draft creation rejects non-JSON requests", async () => {
  const response = await call(setup(), "/api/v1/micdom/releases", {
    method: "POST",
    headers: {
      ...auth("micdom-test-token"),
      "Content-Type": "text/plain"
    },
    body: "not json"
  });

  assert.equal(response.status, 400);
});


test("Preview writes use Preview KV and never Production KV", async () => {
  const env = setup();
  env.ENVIRONMENT = "preview";

  const response = await call(env, "/api/v1/micdom/releases", {
    method: "POST",
    headers: {
      ...auth("micdom-test-token"),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title: "Preview Isolation Test" })
  });

  assert.equal(response.status, 201);
  assert.equal(env.EVIDENCE_PREVIEW_VAULT.data.size, 2);
  assert.equal(env.EVIDENCE_VAULT.data.size, 0);
});

test("Preview fails closed when Preview KV is missing", async () => {
  const env = setup();
  env.ENVIRONMENT = "preview";
  delete env.EVIDENCE_PREVIEW_VAULT;

  const response = await call(env, "/api/v1/micdom/releases", {
    method: "POST",
    headers: {
      ...auth("micdom-test-token"),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title: "Missing Preview KV Test" })
  });

  assert.equal(response.status, 503);
  assert.equal(env.EVIDENCE_VAULT.data.size, 0);
});

test("Unknown environment fails closed without using Production KV", async () => {
  const env = setup();
  env.ENVIRONMENT = "staging";

  const response = await call(env, "/api/v1/micdom/releases", {
    method: "POST",
    headers: {
      ...auth("micdom-test-token"),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title: "Unknown Environment Test" })
  });

  assert.equal(response.status, 503);
  assert.equal(env.EVIDENCE_VAULT.data.size, 0);
});


test("device pairing requires the separate owner credential", async () => {
  const response = await call(setup(), "/api/v1/micdom/device/pairing", {
    method: "POST", headers: auth("micdom-test-token")
  });
  assert.equal(response.status, 403);
});

test("owner can pair a device, queue an allowlisted task, and receive its result", async () => {
  const env = setup();
  const pairResponse = await call(env, "/api/v1/micdom/device/pairing", {
    method: "POST", headers: auth("owner-test-token")
  });
  const pair = await pairResponse.json();
  assert.equal(pairResponse.status, 201);
  assert.match(pair.pairingToken, /^[a-f0-9]{64}$/);

  const deviceToken = "a".repeat(64);
  const enrollResponse = await call(env, "/api/v1/micdom/device/enroll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pairingToken: pair.pairingToken, deviceToken, deviceName: "Blackview A52 Pro" })
  });
  const enrolled = await enrollResponse.json();
  assert.equal(enrollResponse.status, 201);

  const stored = JSON.parse(await env.EVIDENCE_VAULT.get("device:micdom:devices:" + enrolled.deviceId));
  assert.notEqual(stored.tokenHash, deviceToken);
  assert.equal(stored.organization, "micdom");

  const queueResponse = await call(env, `/api/v1/micdom/device/${enrolled.deviceId}/tasks`, {
    method: "POST",
    headers: { ...auth("owner-test-token"), "Content-Type": "application/json" },
    body: JSON.stringify({ type: "device.status" })
  });
  const queued = await queueResponse.json();
  assert.equal(queueResponse.status, 201);

  const pollResponse = await call(env, `/api/v1/micdom/device/${enrolled.deviceId}/tasks/next`, {
    headers: auth(deviceToken)
  });
  const polled = await pollResponse.json();
  assert.equal(pollResponse.status, 200);
  assert.equal(polled.task.id, queued.task.id);

  const resultResponse = await call(env,
    `/api/v1/micdom/device/${enrolled.deviceId}/tasks/${queued.task.id}/result`, {
      method: "POST",
      headers: { ...auth(deviceToken), "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, result: { architecture: "aarch64", mode: "READ_ONLY" } })
    });
  const result = await resultResponse.json();
  assert.equal(resultResponse.status, 200);
  assert.equal(result.status, "completed");
});

test("device task queue rejects arbitrary shell commands", async () => {
  const env = setup();
  const pairResponse = await call(env, "/api/v1/micdom/device/pairing", {
    method: "POST", headers: auth("owner-test-token")
  });
  const pair = await pairResponse.json();
  const token = "b".repeat(64);
  const enrollResponse = await call(env, "/api/v1/micdom/device/enroll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pairingToken: pair.pairingToken, deviceToken: token })
  });
  const enrolled = await enrollResponse.json();
  const response = await call(env, `/api/v1/micdom/device/${enrolled.deviceId}/tasks`, {
    method: "POST",
    headers: { ...auth("owner-test-token"), "Content-Type": "application/json" },
    body: JSON.stringify({ type: "shell.exec", command: "rm -rf /" })
  });
  assert.equal(response.status, 400);
});

test("device polling rejects an incorrect device token", async () => {
  const env = setup();
  const pairResponse = await call(env, "/api/v1/micdom/device/pairing", {
    method: "POST", headers: auth("owner-test-token")
  });
  const pair = await pairResponse.json();
  const enrollResponse = await call(env, "/api/v1/micdom/device/enroll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pairingToken: pair.pairingToken, deviceToken: "c".repeat(64) })
  });
  const enrolled = await enrollResponse.json();
  const response = await call(env, `/api/v1/micdom/device/${enrolled.deviceId}/tasks/next`, {
    headers: auth("wrong-device-token")
  });
  assert.equal(response.status, 401);
});


function previewFixture() {
  return {
    title: "CTA Preview Test",
    subtitle: "Nefertiti + DJ Dehrtay Dog",
    segments: [
      { role: "welcome", title: "Welcome", expression: "welcome", volume: 70, dialogue: "Welcome to the Chamber." },
      { role: "scripture_question", title: "Question", expression: "thinking", volume: 70, dialogue: "What does the passage say?" },
      { role: "history_context", title: "Context", expression: "neutral", volume: 70, dialogue: "Here is the verified context." },
      { role: "hebrews_teaching", title: "Teaching", expression: "breaking", volume: 70, dialogue: "Let us examine the teaching." },
      { role: "signoff", title: "Signoff", expression: "signoff", volume: 70, dialogue: "Thank you for joining us." }
    ],
    ...DEFAULT_CTA_FIELDS,
    standing_disclaimer: "The LARP is a game. The real Volunteer Exchange Portal remains the operational system.",
    larp_posts: { day:1, episode:0, title:"WELCOME TO HALLEL", opening_lines:"Travelers of the Chamber.",
      play_today:["Read all twelve Steps of the Hallel framework."], chat_poll:"OBSERVER / LIGHT / FULL + your name",
      pinned_comment:"Choose your depth. The LARP is a game.", closing_cta:"Choose your depth. Keep one foot in the real." }
  };
}
test("preview fixture endpoint stores only an isolated preview fixture and accepts LARP Episode 0", async () => {
  const env=setup(); env.ENVIRONMENT="preview";
  const response=await call(env,"/api/v1/micdom/episode/fixture-test",{method:"POST",
    headers:{...auth("owner-test-token"),"Content-Type":"application/json"},body:JSON.stringify(previewFixture())});
  const data=await response.json();
  assert.equal(response.status,201); assert.equal(data.previewOnly,true); assert.equal(data.totalSegments,5);
  assert.equal(data.larpPosts.episode,0);
  assert.deepEqual(data.ctaDestinations.sort(),["registry","rumble","stripe","routenote","youtube"].sort());
  assert.equal(env.EVIDENCE_PREVIEW_VAULT.data.size,1); assert.equal(env.EVIDENCE_VAULT.data.size,0);
  const key=[...env.EVIDENCE_PREVIEW_VAULT.data.keys()][0];
  assert.match(key,/^episode:micdom:fixture:/);
  assert.equal(env.EVIDENCE_PREVIEW_VAULT.data.has("episode:micdom:current"),false);
  assert.equal(env.EVIDENCE_PREVIEW_VAULT.data.has("stage:micdom:cue"),false);
});
test("production cannot access the preview fixture endpoint", async () => {
  const env=setup();
  const response=await call(env,"/api/v1/micdom/episode/fixture-test",{method:"POST",
    headers:{...auth("owner-test-token"),"Content-Type":"application/json"},body:JSON.stringify(previewFixture())});
  assert.equal(response.status,404); assert.equal(env.EVIDENCE_VAULT.data.size,0);
  assert.equal(env.EVIDENCE_PREVIEW_VAULT.data.size,0);
});
test("preview fixture rejects negative LARP episode numbers without writing", async () => {
  const env=setup(); env.ENVIRONMENT="preview"; const fixture=previewFixture(); fixture.larp_posts.episode=-1;
  const response=await call(env,"/api/v1/micdom/episode/fixture-test",{method:"POST",
    headers:{...auth("owner-test-token"),"Content-Type":"application/json"},body:JSON.stringify(fixture)});
  assert.equal(response.status,400); assert.equal(env.EVIDENCE_PREVIEW_VAULT.data.size,0);
});


test("Preview fixture handoff loads in Preview and is rejected in Production", async () => {
  const fixtureId = "123e4567-e89b-42d3-a456-426614174000";
  const fixture = {
    title: "PREVIEW HANDOFF TEST",
    subtitle: "Isolated fixture playback",
    ...DEFAULT_CTA_FIELDS,
    segments: [
      { role: "welcome", volume: 70, title: "WELCOME", expression: "welcome", dialogue: "Preview welcome." },
      { role: "scripture_question", volume: 70, title: "QUESTION", expression: "thinking", dialogue: "Preview question." },
      { role: "history_context", volume: 70, title: "CONTEXT", expression: "neutral", dialogue: "Preview context." },
      { role: "hebrews_teaching", volume: 70, title: "TEACHING", expression: "breaking", dialogue: "Preview teaching." },
      { role: "signoff", volume: 70, title: "SIGNOFF", expression: "signoff", dialogue: "Preview signoff." }
    ],
    fixtureId,
    previewOnly: true,
    validatedAt: new Date().toISOString()
  };

  const preview = setup();
  preview.ENVIRONMENT = "preview";
  await preview.EVIDENCE_PREVIEW_VAULT.put(
    "episode:micdom:fixture:" + fixtureId,
    JSON.stringify(fixture)
  );
  await preview.EVIDENCE_PREVIEW_VAULT.put(
    "stage:micdom:session",
    JSON.stringify({
      armedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 600000).toISOString(),
      audio: false
    })
  );

  const previewResponse = await call(preview, "/api/v1/micdom/episode/start", {
    method: "POST",
    headers: { ...auth("owner-test-token"), "Content-Type": "application/json" },
    body: JSON.stringify({ fixtureId })
  });
  const previewData = await previewResponse.json();

  assert.equal(previewResponse.status, 200, JSON.stringify(previewData));
  assert.equal(previewData.ok, true);
  assert.equal(previewData.episode.title, "PREVIEW HANDOFF TEST");
  assert.equal(previewData.episode.currentSegment, 1);
  assert.equal(previewData.cue.text.includes("Preview welcome."), true);

  const production = setup();
  await production.EVIDENCE_VAULT.put(
    "stage:micdom:session",
    JSON.stringify({
      armedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 600000).toISOString(),
      audio: false
    })
  );

  const productionResponse = await call(production, "/api/v1/micdom/episode/start", {
    method: "POST",
    headers: { ...auth("owner-test-token"), "Content-Type": "application/json" },
    body: JSON.stringify({ fixtureId })
  });
  const productionData = await productionResponse.json();

  assert.equal(productionResponse.status, 404);
  assert.equal(productionData.ok, false);
  assert.equal(production.EVIDENCE_VAULT.data.has("episode:micdom:current"), false);
  assert.equal(production.EVIDENCE_PREVIEW_VAULT.data.size, 0);
});
