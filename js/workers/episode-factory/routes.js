import {
  makeEpisode,
  makeRelease,
  makeMedia,
  validateCreateInput,
  clean
} from "./schema.js";

const ROOT = "/api/v1/micdom/factory/episodes";
const PREFIX = "micdom:factory:episodes:";
const MAX_ITEMS = 100;

function key(id) {
  return PREFIX + id;
}

function json(data, status, origin, d) {
  return d.jsonResponse(data, status, origin);
}

async function readRecord(kv, id) {
  const raw = await kv.get(key(id));
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveRecord(kv, record) {
  await kv.put(key(record.episode.episodeId), JSON.stringify(record));
}

async function audit(d, env, action, id) {
  await d.writeAudit(
    env,
    "micdom-owner",
    "factory." + action,
    "factory-episode",
    id
  );
}

function owner(request, env, d) {
  return d.authenticateOwner(request, env);
}

function recordStatus(record) {
  return {
    episode: record.episode.status,
    media: record.media.validation.status,
    release: record.release.distributionStatus,
    approval: record.release.ownerApproval.status
  };
}

function validateRecord(record) {
  const errors = [];

  if (!record.episode.idea) errors.push("Episode idea is missing.");
  if (!record.episode.musicVideo.filename) errors.push("Video filename is missing.");
  if (!record.episode.musicVideo.filename.toLowerCase().endsWith(".mp4")) {
    errors.push("Video must be MP4.");
  }

  if (record.media.sizeBytes <= 0) {
    errors.push("Media size must be provided.");
  }

  if (!record.episode.title) {
    errors.push("Episode title is not yet generated.");
  }

  return errors;
}

export async function handleEpisodeFactoryRoute(
  request, env, path, method, origin, d
) {
  if (!path.startsWith(ROOT)) return null;

  if (!d.requireKV(env)) {
    return json({ ok: false, error: "Storage is not configured" }, 503, origin, d);
  }

  if (!owner(request, env, d)) {
    return json({ ok: false, error: "Owner authorization required" }, 403, origin, d);
  }

  const kv = d.getEvidenceVault(env);

  // POST /factory/episodes
  if (path === ROOT && method === "POST") {
    const body = await d.readJSONBody(request);
    if (body.error) return json({ ok: false, error: body.error }, 400, origin, d);

    const input = body.value;
    const errors = validateCreateInput(input);

    if (errors.length) {
      return json({ ok: false, errors }, 400, origin, d);
    }

    const episode = makeEpisode(input);
    const release = makeRelease(episode);
    const media = makeMedia(input, episode);

    const record = {
      episode,
      release,
      media,
      package: null,
      createdAt: episode.createdAt,
      updatedAt: episode.updatedAt
    };

    await saveRecord(kv, record);
    await audit(d, env, "created", episode.episodeId);

    return json({
      ok: true,
      episodeId: episode.episodeId,
      status: recordStatus(record),
      record
    }, 201, origin, d);
  }

  // GET /factory/episodes
  if (path === ROOT && method === "GET") {
    const result = await kv.list({ prefix: PREFIX, limit: MAX_ITEMS });
    const records = [];

    for (const item of result.keys || []) {
      const record = await readRecord(kv, item.name.slice(PREFIX.length));
      if (record) records.push(record);
    }

    records.sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt))
    );

    return json({ ok: true, count: records.length, records }, 200, origin, d);
  }

  const match = path.match(
    /^\/api\/v1\/micdom\/factory\/episodes\/([A-Za-z0-9-]+)(?:\/(validate|package|approve|status))?$/
  );

  if (!match) {
    return json({ ok: false, error: "Factory route not found" }, 404, origin, d);
  }

  const id = match[1];
  const action = match[2] || "";
  const record = await readRecord(kv, id);

  if (!record) {
    return json({ ok: false, error: "Episode not found" }, 404, origin, d);
  }

  // GET /factory/episodes/:id
  if (!action && method === "GET") {
    return json({ ok: true, record }, 200, origin, d);
  }

  // GET /factory/episodes/:id/status
  if (action === "status" && method === "GET") {
    return json({
      ok: true,
      episodeId: id,
      status: recordStatus(record),
      updatedAt: record.updatedAt
    }, 200, origin, d);
  }

  // PATCH /factory/episodes/:id
  if (!action && method === "PATCH") {
    if (record.episode.status !== "draft") {
      return json({
        ok: false,
        error: "Only draft episodes can be edited."
      }, 409, origin, d);
    }

    const body = await d.readJSONBody(request);
    if (body.error) return json({ ok: false, error: body.error }, 400, origin, d);

    const input = body.value;

    if (input.idea !== undefined) {
      record.episode.idea = clean(input.idea, 3000);
    }

    if (input.title !== undefined) {
      record.episode.title = clean(input.title, 160);
    }

    if (input.series !== undefined) {
      record.episode.series = clean(input.series, 120);
    }

    if (input.cast !== undefined && Array.isArray(input.cast)) {
      record.episode.cast = input.cast.slice(0, 20).map(x => clean(x, 120));
    }

    if (input.filename !== undefined) {
      const filename = clean(input.filename, 255);
      if (!filename.toLowerCase().endsWith(".mp4")) {
        return json({ ok: false, error: "Video must be MP4." }, 400, origin, d);
      }

      record.episode.musicVideo.filename = filename;
      record.media.filename = filename;
    }

    if (input.sizeBytes !== undefined) {
      const size = Number(input.sizeBytes);
      if (!Number.isFinite(size) || size <= 0) {
        return json({ ok: false, error: "Invalid media size." }, 400, origin, d);
      }
      record.media.sizeBytes = size;
    }

    record.updatedAt = new Date().toISOString();
    record.episode.updatedAt = record.updatedAt;

    await saveRecord(kv, record);
    await audit(d, env, "updated", id);

    return json({ ok: true, record }, 200, origin, d);
  }

  // POST /factory/episodes/:id/validate
  if (action === "validate" && method === "POST") {
    const errors = validateRecord(record);

    record.media.validation = {
      status: errors.length ? "failed" : "passed",
      checks: [
        { name: "idea_present", passed: !!record.episode.idea },
        { name: "filename_mp4", passed: record.media.filename.toLowerCase().endsWith(".mp4") },
        { name: "media_size", passed: record.media.sizeBytes > 0 },
        { name: "title_present", passed: !!record.episode.title }
      ]
    };

    record.episode.status = errors.length ? "draft" : "validated";
    record.updatedAt = new Date().toISOString();
    record.episode.updatedAt = record.updatedAt;

    await saveRecord(kv, record);
    await audit(d, env, "validated", id);

    return json({
      ok: errors.length === 0,
      errors,
      record
    }, errors.length ? 422 : 200, origin, d);
  }

  // POST /factory/episodes/:id/package
  if (action === "package" && method === "POST") {
    if (record.episode.status !== "validated") {
      return json({
        ok: false,
        error: "Episode must pass validation before packaging."
      }, 409, origin, d);
    }

    record.package = {
      schemaVersion: "1.0.0",
      episode: record.episode,
      release: record.release,
      media: record.media,
      generatedAt: new Date().toISOString()
    };

    record.episode.status = "packaged";
    record.release.distributionStatus = "ready";
    record.updatedAt = new Date().toISOString();

    await saveRecord(kv, record);
    await audit(d, env, "packaged", id);

    return json({
      ok: true,
      episodeId: id,
      package: record.package
    }, 200, origin, d);
  }

  // POST /factory/episodes/:id/approve
  if (action === "approve" && method === "POST") {
    if (record.episode.status !== "packaged") {
      return json({
        ok: false,
        error: "Only packaged episodes can be approved."
      }, 409, origin, d);
    }

    record.release.ownerApproval = {
      status: "approved",
      approvedAt: new Date().toISOString()
    };

    record.release.distributionStatus = "approved";
    record.episode.status = "approved";
    record.updatedAt = new Date().toISOString();

    await saveRecord(kv, record);
    await audit(d, env, "approved", id);

    return json({
      ok: true,
      episodeId: id,
      status: recordStatus(record)
    }, 200, origin, d);
  }

  return json({ ok: false, error: "Method not allowed" }, 405, origin, d);
}
