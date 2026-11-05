import test from "node:test";
import assert from "node:assert/strict";
import api from "../js/workers/api.js";

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

  async delete(key) {
    this.data.delete(key);
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


test("owner storage self-test writes, reads, deletes, and verifies cleanup", async () => {
  const env = setup();

  const response = await call(
    env,
    "/api/v1/owner/storage/self-test",
    {
      method: "POST",
      headers: auth("owner-test-token")
    }
  );

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.storage, "production");
  assert.equal(data.write, true);
  assert.equal(data.read, true);
  assert.equal(data.delete, true);
  assert.equal(data.cleanupVerified, true);
  assert.equal(env.EVIDENCE_VAULT.data.size, 0);
  assert.equal(env.EVIDENCE_PREVIEW_VAULT.data.size, 0);
});

test("Micdom organization credential cannot run owner storage self-test", async () => {
  const env = setup();

  const response = await call(
    env,
    "/api/v1/owner/storage/self-test",
    {
      method: "POST",
      headers: auth("micdom-test-token")
    }
  );

  assert.equal(response.status, 403);
  assert.equal(env.EVIDENCE_VAULT.data.size, 0);
});

test("owner storage self-test uses Preview KV and leaves Production untouched", async () => {
  const env = setup();
  env.ENVIRONMENT = "preview";

  const response = await call(
    env,
    "/api/v1/owner/storage/self-test",
    {
      method: "POST",
      headers: auth("owner-test-token")
    }
  );

  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.storage, "preview");
  assert.equal(data.cleanupVerified, true);
  assert.equal(env.EVIDENCE_PREVIEW_VAULT.data.size, 0);
  assert.equal(env.EVIDENCE_VAULT.data.size, 0);
});

test("owner storage self-test fails closed when KV delete is unavailable", async () => {
  const env = setup();
  env.EVIDENCE_VAULT.delete = undefined;

  const response = await call(
    env,
    "/api/v1/owner/storage/self-test",
    {
      method: "POST",
      headers: auth("owner-test-token")
    }
  );

  assert.equal(response.status, 503);
  assert.equal(env.EVIDENCE_VAULT.data.size, 0);
});
