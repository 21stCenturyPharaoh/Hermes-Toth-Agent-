import { handleStageRoute } from "./stage-cue.js";
/**
 * HERMES-TOTH AGENT
 * Hybrid Authority API — development release
 *
 * Separate legal authority:
 * - Micdom AI Records: Pharaoh Angels Incorporated DBA
 * - Human Rights Angels Registry Incorporated: separate corporation
 * - CWOIC: outside these API authority domains
 *
 * Storage: EVIDENCE_VAULT KV
 *
 * No Registry client records, orders, payments, or webhooks
 * are enabled in this release.
 */

const SERVICE_NAME = "Hermes-Toth-Agent";
const VERSION = "2.0.0";

const ALLOWED_ORIGINS = new Set([
  "https://micdom-records.pharaoh-conglomerate.org",
  "https://56df31dd.hermes-toth-agent.pages.dev",
  "https://275860d9.hermes-toth-agent.pages.dev",
  "https://21stcenturypharaoh.github.io",
  "http://localhost:8080"
]);

const MAX_BODY_BYTES = 16 * 1024;
const MAX_LIST_ITEMS = 100;

function makeHeaders(origin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Vary": "Origin"
  };

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] =
      "Content-Type, Authorization";
    headers["Access-Control-Max-Age"] = "86400";
  }

  return headers;
}

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: makeHeaders(origin)
  });
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;

  let difference = 0;

  for (let i = 0; i < a.length; i++) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return difference === 0;
}

function bearerToken(request) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function authenticateOrg(request, env) {
  const token = bearerToken(request);
  if (!token) return null;

  const micdom = env.MICDOM_API_TOKEN || "";
  const registry = env.REGISTRY_API_TOKEN || "";

  // Never permit one shared credential to represent both organizations.
  if (micdom && registry && safeEqual(micdom, registry)) {
    return null;
  }

  const isMicdom = micdom && safeEqual(token, micdom);
  const isRegistry = registry && safeEqual(token, registry);

  if (isMicdom && !isRegistry) return "micdom";
  if (isRegistry && !isMicdom) return "registry";

  return null;
}

function authenticateOwner(request, env) {
  const token = bearerToken(request);
  const owner = env.MICDOM_OWNER_TOKEN || "";
  const micdom = env.MICDOM_API_TOKEN || "";
  const registry = env.REGISTRY_API_TOKEN || "";

  if (!token || !owner) return false;

  // The approval credential must be distinct from both organization tokens.
  if (safeEqual(owner, micdom) || safeEqual(owner, registry)) {
    return false;
  }

  return safeEqual(token, owner);
}

function getEvidenceVault(env) {
  if (!env) return null;

  if (env.ENVIRONMENT === "preview") {
    return env.EVIDENCE_PREVIEW_VAULT || null;
  }

  if (env.ENVIRONMENT === "production") {
    return env.EVIDENCE_VAULT || null;
  }

  return null;
}

function requireKV(env) {
  const kv = getEvidenceVault(env);

  return !!kv &&
    typeof kv.put === "function" &&
    typeof kv.get === "function" &&
    typeof kv.list === "function";
}

async function readJSONBody(request) {
  const contentType = request.headers.get("Content-Type") || "";
  const mediaType = contentType.split(";")[0].trim().toLowerCase();

  if (mediaType !== "application/json") {
    return { error: "Content-Type must be application/json" };
  }

  const declaredLength = request.headers.get("Content-Length");
  if (declaredLength !== null) {
    if (!/^\d+$/.test(declaredLength)) {
      return { error: "Invalid Content-Length" };
    }
    if (Number(declaredLength) > MAX_BODY_BYTES) {
      return { error: "Request body is too large" };
    }
  }

  if (!request.body) return { error: "JSON body is required" };

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return { error: "Request body is too large" };
      }

      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch {
    return { error: "Unable to read request body" };
  }

  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { error: "JSON body must be an object" };
    }
    return { value };
  } catch {
    return { error: "Invalid JSON body" };
  }
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function makeId() {
  return crypto.randomUUID();
}

async function saveRecord(env, prefix, record) {
  const kv = getEvidenceVault(env);
  await kv.put(prefix + record.id, JSON.stringify(record));
}

async function getRecord(env, prefix, id) {
  const kv = getEvidenceVault(env);
  const value = await kv.get(prefix + id);
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function listRecords(env, prefix) {
  const kv = getEvidenceVault(env);
  const result = await kv.list({
    prefix,
    limit: MAX_LIST_ITEMS
  });

  const records = [];

  for (const item of result.keys || []) {
    const value = await kv.get(item.name);

    if (!value) continue;

    try {
      records.push(JSON.parse(value));
    } catch {
      // Ignore malformed stored records; never expose raw KV values.
    }
  }

  return records.sort((a, b) =>
    String(b.createdAt || "").localeCompare(
      String(a.createdAt || "")
    )
  );
}

async function writeAudit(env, actor, action, resourceType, resourceId) {
  const event = {
    id: makeId(),
    organization: "micdom",
    actor,
    action,
    resourceType,
    resourceId,
    createdAt: new Date().toISOString()
  };

  const kv = getEvidenceVault(env);
  await kv.put(
    "audit:micdom:" + Date.now() + ":" + event.id,
    JSON.stringify(event)
  );
}

async function createMicdomDraft(request, env, type, actor) {
  const body = await readJSONBody(request);

  if (body.error) {
    return { status: 400, data: { ok: false, error: body.error } };
  }

  const title = cleanText(body.value.title, 160);

  if (!title) {
    return {
      status: 400,
      data: { ok: false, error: "A title is required" }
    };
  }

  const prefix = type === "release"
    ? "micdom:releases:"
    : "micdom:announcements:";

  const record = {
    id: makeId(),
    organization: "micdom",
    type,
    title,
    status: "draft",
    createdAt: new Date().toISOString()
  };

  if (type === "release") {
    record.artist = cleanText(body.value.artist, 120);
    record.releaseDate = cleanText(body.value.releaseDate, 40);
    record.description = cleanText(body.value.description, 2000);
  } else {
    record.body = cleanText(body.value.body, 5000);

    if (!record.body) {
      return {
        status: 400,
        data: { ok: false, error: "Announcement body is required" }
      };
    }
  }

  await saveRecord(env, prefix, record);
  await writeAudit(env, actor, "draft.created", type, record.id);

  return {
    status: 201,
    data: { ok: true, record }
  };
}

async function approveMicdomRecord(request, env, type, id) {
  if (!authenticateOwner(request, env)) {
    return {
      status: 403,
      data: { ok: false, error: "Owner approval credential required" }
    };
  }

  const prefix = type === "release"
    ? "micdom:releases:"
    : "micdom:announcements:";

  const record = await getRecord(env, prefix, id);

  if (!record) {
    return {
      status: 404,
      data: { ok: false, error: "Record not found" }
    };
  }

  if (record.status !== "draft") {
    return {
      status: 409,
      data: { ok: false, error: "Only draft records can be approved" }
    };
  }

  record.status = "approved";
  record.approvedAt = new Date().toISOString();

  await saveRecord(env, prefix, record);
  await writeAudit(env, "micdom-owner", "draft.approved", type, id);

  return {
    status: 200,
    data: { ok: true, record }
  };
}

async function publicMicdomRecords(env, type) {
  const prefix = type === "release"
    ? "micdom:releases:"
    : "micdom:announcements:";

  const records = await listRecords(env, prefix);

  return records.filter(record => record.status === "approved");
}


async function sha256Hex(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function randomHex(byteCount = 32) {
  return Array.from(crypto.getRandomValues(new Uint8Array(byteCount)))
    .map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function deviceKey(id) {
  return "device:micdom:devices:" + id;
}

function taskPrefix(id) {
  return "device:micdom:tasks:" + id + ":";
}

async function authenticateDevice(request, env, id) {
  const token = bearerToken(request);
  if (!token) return false;
  const raw = await getEvidenceVault(env).get(deviceKey(id));
  if (!raw) return false;
  let device;
  try { device = JSON.parse(raw); } catch { return false; }
  if (!device || device.status !== "active" || !device.tokenHash) return false;
  return safeEqual(await sha256Hex(token), device.tokenHash);
}

async function handleMicdomDeviceRoute(request, env, path, method, origin) {
  const root = "/api/v1/micdom/device";
  if (!path.startsWith(root)) return null;
  if (!requireKV(env)) {
    return jsonResponse({ ok: false, error: "Storage is not configured" }, 503, origin);
  }
  const kv = getEvidenceVault(env);

  if (path === root + "/pairing") {
    if (method !== "POST") {
      return jsonResponse({ ok: false, error: "Method not allowed" }, 405, origin);
    }
    if (!authenticateOwner(request, env)) {
      return jsonResponse({ ok: false, error: "Owner approval credential required" }, 403, origin);
    }
    const pairingToken = randomHex(32);
    const pairingHash = await sha256Hex(pairingToken);
    const expiresAt = new Date(Date.now() + 600000).toISOString();
    await kv.put("device:micdom:pairing:" + pairingHash,
      JSON.stringify({ organization: "micdom", expiresAt, used: false }),
      { expirationTtl: 600 });
    await writeAudit(env, "micdom-owner", "device.pairing.created", "device", "pending");
    return jsonResponse({
      ok: true, pairingToken, expiresAt,
      instruction: "Use once to enroll the Micdom phone within 10 minutes."
    }, 201, origin);
  }

  if (path === root + "/enroll") {
    if (method !== "POST") {
      return jsonResponse({ ok: false, error: "Method not allowed" }, 405, origin);
    }
    const body = await readJSONBody(request);
    if (body.error) return jsonResponse({ ok: false, error: body.error }, 400, origin);
    const pairingToken = cleanText(body.value.pairingToken, 128);
    const deviceToken = cleanText(body.value.deviceToken, 128);
    const name = cleanText(body.value.deviceName, 80) || "Micdom Android phone";
    if (!/^[a-f0-9]{64}$/i.test(pairingToken) ||
        !/^[a-f0-9]{64}$/i.test(deviceToken)) {
      return jsonResponse({ ok: false, error: "Both tokens must be 64 hexadecimal characters" }, 400, origin);
    }
    const pairingKey = "device:micdom:pairing:" + await sha256Hex(pairingToken);
    const pairingRaw = await kv.get(pairingKey);
    if (!pairingRaw) {
      return jsonResponse({ ok: false, error: "Pairing code is invalid or expired" }, 401, origin);
    }
    let pairing;
    try { pairing = JSON.parse(pairingRaw); } catch {
      return jsonResponse({ ok: false, error: "Pairing record is invalid" }, 401, origin);
    }
    if (pairing.organization !== "micdom" || pairing.used ||
        !pairing.expiresAt || Date.parse(pairing.expiresAt) <= Date.now()) {
      return jsonResponse({ ok: false, error: "Pairing code is invalid, expired, or already used" }, 401, origin);
    }
    // KV is eventually consistent; use this first-release pairing flow sequentially.
    pairing.used = true;
    pairing.usedAt = new Date().toISOString();
    await kv.put(pairingKey, JSON.stringify(pairing), { expirationTtl: 600 });
    const id = crypto.randomUUID();
    await kv.put(deviceKey(id), JSON.stringify({
      id, organization: "micdom", name, status: "active",
      tokenHash: await sha256Hex(deviceToken),
      enrolledAt: new Date().toISOString()
    }));
    await writeAudit(env, "micdom-device", "device.enrolled", "device", id);
    return jsonResponse({
      ok: true, deviceId: id, deviceName: name, organization: "micdom",
      message: "Phone enrolled. Keep its device token private."
    }, 201, origin);
  }

  const enqueue = path.match(/^\/api\/v1\/micdom\/device\/([a-f0-9-]+)\/tasks$/i);
  if (enqueue && method === "POST") {
    if (!authenticateOwner(request, env)) {
      return jsonResponse({ ok: false, error: "Owner approval credential required" }, 403, origin);
    }
    const id = enqueue[1];
    if (!await kv.get(deviceKey(id))) {
      return jsonResponse({ ok: false, error: "Enrolled device not found" }, 404, origin);
    }
    const body = await readJSONBody(request);
    if (body.error) return jsonResponse({ ok: false, error: body.error }, 400, origin);
    const type = cleanText(body.value.type, 40);
    if (!new Set(["device.status", "media.inventory"]).has(type)) {
      return jsonResponse({ ok: false, error: "Task type is not allowlisted" }, 400, origin);
    }
    const task = {
      id: crypto.randomUUID(), deviceId: id, organization: "micdom",
      type, payload: {}, status: "queued",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    };
    await kv.put(taskPrefix(id) + task.id, JSON.stringify(task), { expirationTtl: 86400 });
    await writeAudit(env, "micdom-owner", "device.task.queued", "device-task", task.id);
    return jsonResponse({
      ok: true, task: { id: task.id, type, status: task.status, expiresAt: task.expiresAt }
    }, 201, origin);
  }

  const next = path.match(/^\/api\/v1\/micdom\/device\/([a-f0-9-]+)\/tasks\/next$/i);
  if (next && method === "GET") {
    const id = next[1];
    if (!await authenticateDevice(request, env, id)) {
      return jsonResponse({ ok: false, error: "Device authentication failed" }, 401, origin);
    }
    const listed = await kv.list({ prefix: taskPrefix(id), limit: 50 });
    for (const item of listed.keys || []) {
      const raw = await kv.get(item.name);
      if (!raw) continue;
      let task;
      try { task = JSON.parse(raw); } catch { continue; }
      if (task.deviceId !== id || task.organization !== "micdom" ||
          task.status !== "queued") continue;
      if (Date.parse(task.expiresAt) <= Date.now()) {
        task.status = "expired";
        await kv.put(item.name, JSON.stringify(task));
        continue;
      }
      task.status = "processing";
      task.claimedAt = new Date().toISOString();
      await kv.put(item.name, JSON.stringify(task));
      await writeAudit(env, "micdom-device", "device.task.claimed", "device-task", task.id);
      return jsonResponse({
        ok: true, task: { id: task.id, type: task.type, payload: task.payload, expiresAt: task.expiresAt }
      }, 200, origin);
    }
    return jsonResponse({ ok: true, task: null }, 200, origin);
  }

  const resultRoute = path.match(/^\/api\/v1\/micdom\/device\/([a-f0-9-]+)\/tasks\/([a-f0-9-]+)\/result$/i);
  if (resultRoute && method === "POST") {
    const id = resultRoute[1];
    const taskId = resultRoute[2];
    if (!await authenticateDevice(request, env, id)) {
      return jsonResponse({ ok: false, error: "Device authentication failed" }, 401, origin);
    }
    const body = await readJSONBody(request);
    if (body.error) return jsonResponse({ ok: false, error: body.error }, 400, origin);
    if (!body.value.result || typeof body.value.result !== "object" ||
        Array.isArray(body.value.result)) {
      return jsonResponse({ ok: false, error: "Result must be a JSON object" }, 400, origin);
    }
    const key = taskPrefix(id) + taskId;
    const raw = await kv.get(key);
    if (!raw) return jsonResponse({ ok: false, error: "Task not found" }, 404, origin);
    let task;
    try { task = JSON.parse(raw); } catch {
      return jsonResponse({ ok: false, error: "Task record is invalid" }, 500, origin);
    }
    if (task.deviceId !== id || task.organization !== "micdom") {
      return jsonResponse({ ok: false, error: "Task scope denied" }, 403, origin);
    }
    if (task.status !== "processing") {
      return jsonResponse({ ok: false, error: "Task is not awaiting a result" }, 409, origin);
    }
    task.status = body.value.ok === false ? "failed" : "completed";
    task.result = body.value.result;
    task.completedAt = new Date().toISOString();
    await kv.put(key, JSON.stringify(task), { expirationTtl: 604800 });
    await writeAudit(env, "micdom-device", "device.task." + task.status, "device-task", taskId);
    return jsonResponse({ ok: true, taskId, status: task.status }, 200, origin);
  }

  return jsonResponse({ ok: false, error: "Device route not found" }, 404, origin);
}

const REGISTRY_SERVICES = [
  {
    id: "corporate-documents",
    name: "Corporate document services",
    status: "information-only"
  },
  {
    id: "registry-applications",
    name: "Registry client applications",
    status: "not-enabled"
  },
  {
    id: "commercial-orders",
    name: "Commercial service orders",
    status: "not-enabled"
  },
  {
    id: "payments",
    name: "Payment processing",
    status: "not-enabled"
  }
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const path = url.pathname;
    const origin = request.headers.get("Origin");

    try {
      if (method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: makeHeaders(origin)
        });
      }

      if (path === "/" && method === "GET") {
        return jsonResponse({
          ok: true,
          service: SERVICE_NAME,
          version: VERSION,
          message: "Hermes-Toth Agent backend is running.",
          health: "/api/health"
        }, 200, origin);
      }

      if (
        (path === "/api/health" || path === "/health") &&
        method === "GET"
      ) {
        return jsonResponse({
          ok: true,
          service: SERVICE_NAME,
          version: VERSION,
          status: "online",
          role: "backend-api",
          timestamp: new Date().toISOString()
        }, 200, origin);
      }

      if (path === "/api/v1/registry/services" && method === "GET") {
        return jsonResponse({
          ok: true,
          organization: "Human Rights Angels Registry Incorporated",
          services: REGISTRY_SERVICES
        }, 200, origin);
      }

      if (path === "/api/v1/public/micdom/releases" && method === "GET") {
        if (!requireKV(env)) {
          return jsonResponse({
            ok: false,
            error: "Storage is not configured"
          }, 503, origin);
        }

        return jsonResponse({
          ok: true,
          records: await publicMicdomRecords(env, "release")
        }, 200, origin);
      }

      if (
        path === "/api/v1/public/micdom/announcements" &&
        method === "GET"
      ) {
        if (!requireKV(env)) {
          return jsonResponse({
            ok: false,
            error: "Storage is not configured"
          }, 503, origin);
        }

        return jsonResponse({
          ok: true,
          records: await publicMicdomRecords(env, "announcement")
        }, 200, origin);
      }

      // stage-cue-applied
      const stageResponse = await handleStageRoute(request, env, path, method, origin, {
        jsonResponse, authenticateOwner, getEvidenceVault, requireKV,
        readJSONBody, cleanText, writeAudit
      });
      if (stageResponse) return stageResponse;

      const deviceResponse = await handleMicdomDeviceRoute(
        request, env, path, method, origin
      );
      if (deviceResponse) return deviceResponse;

      if (path.startsWith("/api/v1/")) {
        if (method !== "GET" && method !== "POST") {
          return jsonResponse({
            ok: false,
            error: "Method not allowed"
          }, 405, origin);
        }

        let organization = authenticateOrg(request, env);

        if (!organization && authenticateOwner(request, env)) {
          organization = "micdom-owner";
        }

        if (!organization) {
          return jsonResponse({
            ok: false,
            error: "Valid organization credential required"
          }, 401, origin);
        }

        if (path === "/api/v1/status" && method === "GET") {
          return jsonResponse({
            ok: true,
            authenticated: true,
            organization
          }, 200, origin);
        }

        if (path === "/api/v1/micdom/status" && method === "GET") {
          if (organization !== "micdom" && organization !== "micdom-owner") {
            return jsonResponse({
              ok: false,
              error: "Organization access denied"
            }, 403, origin);
          }

          return jsonResponse({
            ok: true,
            organization: "Micdom AI Records",
            legalEntity: "Pharaoh Angels Incorporated",
            relationship: "DBA",
            approvalRequiredForPublication: true
          }, 200, origin);
        }

        if (path === "/api/v1/registry/status" && method === "GET") {
          if (organization !== "registry") {
            return jsonResponse({
              ok: false,
              error: "Organization access denied"
            }, 403, origin);
          }

          return jsonResponse({
            ok: true,
            organization: "Human Rights Angels Registry Incorporated",
            legalEntity: "Human Rights Angels Registry Incorporated",
            services: "information-only",
            applications: "disabled",
            orders: "disabled",
            payments: "disabled"
          }, 200, origin);
        }

        if (path.startsWith("/api/v1/micdom/")) {
          if (organization !== "micdom" && organization !== "micdom-owner") {
            return jsonResponse({
              ok: false,
              error: "Organization access denied"
            }, 403, origin);
          }

          if (!requireKV(env)) {
            return jsonResponse({
              ok: false,
              error: "Storage is not configured"
            }, 503, origin);
          }

          const collection = path.match(
            /^\/api\/v1\/micdom\/(releases|announcements)$/
          );

          if (collection && method === "GET") {
            const type = collection[1] === "releases"
              ? "release"
              : "announcement";

            const prefix = type === "release"
              ? "micdom:releases:"
              : "micdom:announcements:";

            return jsonResponse({
              ok: true,
              records: await listRecords(env, prefix)
            }, 200, origin);
          }

          if (collection && method === "POST") {
            const type = collection[1] === "releases"
              ? "release"
              : "announcement";

            const result = await createMicdomDraft(request, env, type, organization);
            return jsonResponse(result.data, result.status, origin);
          }

          const approval = path.match(
            /^\/api\/v1\/micdom\/(releases|announcements)\/([a-f0-9-]+)\/approve$/i
          );

          if (approval && method === "POST") {
            const type = approval[1] === "releases"
              ? "release"
              : "announcement";

            const result = await approveMicdomRecord(
              request,
              env,
              type,
              approval[2]
            );

            return jsonResponse(result.data, result.status, origin);
          }

          if (path === "/api/v1/micdom/audit" && method === "GET") {
            const kv = getEvidenceVault(env);
            const result = await kv.list({
              prefix: "audit:micdom:",
              limit: MAX_LIST_ITEMS
            });

            const events = [];

            for (const item of result.keys || []) {
              const value = await kv.get(item.name);
              if (!value) continue;

              try {
                events.push(JSON.parse(value));
              } catch {
                // Do not expose malformed records.
              }
            }

            return jsonResponse({
              ok: true,
              events
            }, 200, origin);
          }
        }

        if (path.startsWith("/api/v1/registry/")) {
          if (organization !== "registry") {
            return jsonResponse({
              ok: false,
              error: "Organization access denied"
            }, 403, origin);
          }

          return jsonResponse({
            ok: false,
            error: "Registry applications, orders, and payments are not enabled"
          }, 501, origin);
        }

        return jsonResponse({
          ok: false,
          error: "API route not found"
        }, 404, origin);
      }

      return jsonResponse({
        ok: false,
        error: "Not found"
      }, 404, origin);

    } catch (error) {
      console.error("Hermes Worker error:", error);

      return jsonResponse({
        ok: false,
        error: "Internal server error"
      }, 500, origin);
    }
  }
};
