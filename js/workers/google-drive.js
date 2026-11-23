/**
 * MICDOM GOOGLE DRIVE MEDIA VAULT
 * OAuth scope: drive.file
 * Refresh token encrypted using AES-GCM.
 */
const ROOT_KEY = "micdom:drive:root";
const TOKEN_KEY = "micdom:drive:oauth";
const STATE_PREFIX = "micdom:drive:state:";
const FOLDER_PREFIX = "micdom:drive:folder:";

const FOLDERS = [
  { key: "incoming", name: "01 — Incoming Media" },
  { key: "masters", name: "02 — Production Masters" },
  { key: "approved", name: "03 — Approved Releases" },
  { key: "distribution", name: "04 — Distribution" },
  { key: "archive", name: "05 — Archive" }
];

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const MAX_UPLOAD = 25 * 1024 * 1024;

function b64(bytes) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function unb64(value) {
  // Base64URL + padding fix: base64url() strips '=' padding on encode,
  // atob() requires length % 4 == 0. Restore padding + convert URL chars.
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (normalized.length % 4)) % 4;
  const binary = atob(normalized + "=".repeat(pad));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function base64url(bytes) {
  return b64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function randomString(size = 32) {
  return base64url(crypto.getRandomValues(new Uint8Array(size)));
}

async function signState(env, payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    unb64(env.GOOGLE_TOKEN_ENCRYPTION_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const bytes = new TextEncoder().encode(payload);
  const signature = await crypto.subtle.sign("HMAC", key, bytes);

  return base64url(bytes) + "." + base64url(signature);
}

async function verifyStateWhy(env, state) {
  try {
    const parts = String(state || "").split(".");
    if (parts.length !== 2) return "shape_" + parts.length;
    let payloadBytes, signatureBytes;
    try {
      payloadBytes = unb64(parts[0]);
      signatureBytes = unb64(parts[1]);
    } catch {
      return "decode";
    }
    const key = await crypto.subtle.importKey(
      "raw",
      unb64(env.GOOGLE_TOKEN_ENCRYPTION_KEY),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const valid = await crypto.subtle.verify(
      "HMAC", key, signatureBytes, payloadBytes
    );
    if (!valid) return "signature";
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    if (!payload.nonce) return "nonce";
    const age = Date.now() - payload.issuedAt;
    if (!Number.isFinite(age)) return "time_field";
    if (age < -60000 || age > 600000) return "expired";
    return null;
  } catch (e) {
    return "exception_" + (e && e.name);
  }
}

async function verifyState(env, state) {
  return (await verifyStateWhy(env, state)) === null;
}

async function cryptoKey(env) {
  if (!env.GOOGLE_TOKEN_ENCRYPTION_KEY) {
    throw new Error("Encryption key is not configured");
  }

  const raw = unb64(env.GOOGLE_TOKEN_ENCRYPTION_KEY);

  if (raw.length !== 32) {
    throw new Error("Encryption key must contain 32 bytes");
  }

  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(env, value) {
  const key = await cryptoKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(value))
  );

  return {
    version: 1,
    iv: b64(iv),
    ciphertext: b64(ciphertext)
  };
}

async function decrypt(env, record) {
  const key = await cryptoKey(env);

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(record.iv) },
    key,
    unb64(record.ciphertext)
  );

  return JSON.parse(new TextDecoder().decode(plaintext));
}

function callbackUrl(request) {
  return new URL(
    "/api/v1/micdom/drive/callback",
    request.url
  ).toString();
}

function response(helpers, data, status, origin) {
  return helpers.jsonResponse(data, status, origin);
}

async function googleFetch(token, path, options = {}) {
  const res = await fetch(path.startsWith("https://") ? path : DRIVE_API + path, {
    ...options,
    headers: {
      Authorization: "Bearer " + token,
      ...(options.headers || {})
    }
  });

  const text = await res.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!res.ok) {
    throw new Error(
      data?.error?.message || "Google Drive request failed"
    );
  }

  return data;
}

async function getToken(env, kv) {
  const raw = await kv.get(TOKEN_KEY);

  if (!raw) return null;

  const stored = JSON.parse(raw);
  const token = await decrypt(env, stored);

  if (
    token.access_token &&
    token.expires_at > Date.now() + 60000
  ) {
    return token;
  }

  if (!token.refresh_token) {
    throw new Error("Refresh token unavailable");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: token.refresh_token,
      grant_type: "refresh_token"
    })
  });

  const refreshed = await res.json();

  if (!res.ok || !refreshed.access_token) {
    throw new Error(
      refreshed.error_description ||
      refreshed.error ||
      "Google token refresh failed"
    );
  }

  const updated = {
    ...token,
    ...refreshed,
    refresh_token: token.refresh_token,
    expires_at:
      Date.now() + Number(refreshed.expires_in || 3600) * 1000
  };

  await kv.put(TOKEN_KEY, JSON.stringify(await encrypt(env, updated)));

  return updated;
}

async function createFolder(token, name, parentId) {
  const metadata = {
    name,
    mimeType: "application/vnd.google-apps.folder"
  };

  if (parentId) metadata.parents = [parentId];

  return googleFetch(
    token,
    "/files?fields=id,name,mimeType,webViewLink",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata)
    }
  );
}

async function initializeFolders(token, kv) {
  let rootId = await kv.get(ROOT_KEY);

  if (!rootId) {
    const root = await createFolder(
      token,
      "Micdom AI Records",
      null
    );

    rootId = root.id;
    await kv.put(ROOT_KEY, rootId);
  }

  const folders = {};

  for (const folder of FOLDERS) {
    let id = await kv.get(FOLDER_PREFIX + folder.key);

    if (!id) {
      const created = await createFolder(
        token,
        folder.name,
        rootId
      );

      id = created.id;
      await kv.put(FOLDER_PREFIX + folder.key, id);
    }

    folders[folder.key] = {
      id,
      name: folder.name
    };
  }

  return {
    root: {
      id: rootId,
      name: "Micdom AI Records"
    },
    folders
  };
}

function validFolder(value) {
  return FOLDERS.find(f => f.key === value) || FOLDERS[0];
}

export async function handleGoogleDriveRoute(
  request,
  env,
  path,
  method,
  origin,
  helpers
) {
  const root = "/api/v1/micdom/drive";

  if (!path.startsWith(root)) return null;

  if (!helpers.requireKV(env)) {
    return response(
      helpers,
      { ok: false, error: "Storage is not configured" },
      503,
      origin
    );
  }

  const kv = helpers.getEvidenceVault(env);

  /*
   * OAuth callback:
   * Public endpoint protected by signed, expiring OAuth state.
   */
  if (path === root + "/callback" && method === "GET") {
    const url = new URL(request.url);
    const state = (url.searchParams.get("state") || "").trim().replace(/[^A-Za-z0-9_.-]/g, "").replace(/\.+$/, "");
    const code = url.searchParams.get("code") || "";

    if (url.searchParams.has("error")) {
      return response(
        helpers,
        { ok: false, error: "Google authorization was declined" },
        400,
        origin
      );
    }

    if (!state || !code) {
      return response(
        helpers,
        { ok: false, error: "OAuth parameters missing" },
        400,
        origin
      );
    }

    const why = await verifyStateWhy(env, state);
    if (why) {
      return response(
        helpers,
        { ok: false, error: "OAuth state invalid or expired", reason: why, stateLength: state.length },
        401,
        origin
      );
    }

    const tokenResponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: callbackUrl(request),
        grant_type: "authorization_code"
      })
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok || !tokens.access_token) {
      return response(
        helpers,
        {
          ok: false,
          error: tokens.error_description ||
            tokens.error ||
            "OAuth exchange failed"
        },
        400,
        origin
      );
    }

    const expectedEmail = "micdom.media.vault@gmail.com";
    let email = "";
    let profileData;

    try {
      const profile = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: "Bearer " + tokens.access_token
          }
        }
      );

      if (!profile.ok) {
        throw new Error("Google account verification failed");
      }

      profileData = await profile.json();
    } catch {
      return response(
        helpers,
        { ok: false, error: "Could not verify the Google account" },
        502,
        origin
      );
    }

    email = String(profileData.email || "").trim().toLowerCase();

    if (email !== expectedEmail || profileData.verified_email !== true) {
      return response(
        helpers,
        { ok: false, error: "Only the verified Micdom Media Vault account is permitted" },
        403,
        origin
      );
    }

    const tokenRecord = {
      ...tokens,
      email,
      expires_at:
        Date.now() + Number(tokens.expires_in || 3600) * 1000
    };

    if (!tokenRecord.refresh_token) {
      const previous = await kv.get(TOKEN_KEY);

      if (previous) {
        try {
          const old = await decrypt(env, JSON.parse(previous));
          tokenRecord.refresh_token = old.refresh_token;
        } catch {}
      }
    }

    await kv.put(
      TOKEN_KEY,
      JSON.stringify(await encrypt(env, tokenRecord))
    );

    await helpers.writeAudit(
      env,
      "micdom-owner",
      "drive.oauth.connected",
      "google-drive",
      email || "connected"
    );

    return response(
      helpers,
      {
        ok: true,
        connected: true,
        account: email || "Google account",
        message: "Drive connected. You may close this page."
      },
      200,
      origin
    );
  }

  /*
   * All other Drive routes require the owner credential.
   */
  if (!helpers.authenticateOwner(request, env)) {
    return response(
      helpers,
      { ok: false, error: "Owner credential required" },
      403,
      origin
    );
  }

  if (
    !env.GOOGLE_CLIENT_ID ||
    !env.GOOGLE_CLIENT_SECRET ||
    !env.GOOGLE_TOKEN_ENCRYPTION_KEY
  ) {
    return response(
      helpers,
      {
        ok: false,
        error: "Google Drive credentials are not configured"
      },
      503,
      origin
    );
  }

  if (path === root + "/connect" && method === "POST") {
    const statePayload = JSON.stringify({
      issuedAt: Date.now(),
      nonce: randomString()
    });

    const state = await signState(env, statePayload);

    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: callbackUrl(request),
      response_type: "code",
      scope:
        "https://www.googleapis.com/auth/drive.file " +
        "https://www.googleapis.com/auth/userinfo.email",
      access_type: "offline",
      prompt: "consent",
      state
    });

    return response(
      helpers,
      {
        ok: true,
        authorizationUrl:
          "https://accounts.google.com/o/oauth2/v2/auth?" +
          params.toString(),
        expiresIn: 600,
        stateSelfCheck: (await verifyStateWhy(env, state)) === null,
        stateLength: state.length
      },
      200,
      origin
    );
  }

  if (path === root + "/status" && method === "GET") {
    const raw = await kv.get(TOKEN_KEY);

    if (!raw) {
      return response(
        helpers,
        { ok: true, connected: false },
        200,
        origin
      );
    }

    try {
      const token = await getToken(env, kv);

      return response(
        helpers,
        {
          ok: true,
          connected: true,
          account: token.email || null,
          tokenStatus: "valid"
        },
        200,
        origin
      );
    } catch {
      return response(
        helpers,
        {
          ok: true,
          connected: true,
          tokenStatus: "refresh-required"
        },
        200,
        origin
      );
    }
  }

  if (path === root + "/folders" && method === "POST") {
    const token = await getToken(env, kv);

    if (!token) {
      return response(
        helpers,
        { ok: false, error: "Drive is not connected" },
        401,
        origin
      );
    }

    const result = await initializeFolders(token.access_token, kv);

    await helpers.writeAudit(
      env,
      "micdom-owner",
      "drive.folders.initialized",
      "google-drive",
      result.root.id
    );

    return response(
      helpers,
      { ok: true, ...result },
      200,
      origin
    );
  }

  if (path === root + "/files" && method === "GET") {
    const token = await getToken(env, kv);
    const folder = validFolder(
      new URL(request.url).searchParams.get("folder")
    );

    const folderId = await kv.get(FOLDER_PREFIX + folder.key);

    if (!folderId) {
      return response(
        helpers,
        { ok: false, error: "Initialize folders first" },
        409,
        origin
      );
    }

    const q = encodeURIComponent(
      "'" + folderId + "' in parents and trashed=false"
    );

    const result = await googleFetch(
      token.access_token,
      "/files?q=" + q +
      "&pageSize=100&orderBy=createdTime%20desc" +
      "&fields=files(id,name,mimeType,size,createdTime,webViewLink)"
    );

    return response(
      helpers,
      { ok: true, folder: folder.key, files: result.files || [] },
      200,
      origin
    );
  }

  if (path === root + "/upload" && method === "POST") {
    const token = await getToken(env, kv);

    if (
      !(request.headers.get("Content-Type") || "")
        .toLowerCase().startsWith("multipart/form-data")
    ) {
      return response(
        helpers,
        { ok: false, error: "Use multipart/form-data" },
        400,
        origin
      );
    }

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return response(
        helpers,
        { ok: false, error: "File field required" },
        400,
        origin
      );
    }

    if (file.size < 1 || file.size > MAX_UPLOAD) {
      return response(
        helpers,
        { ok: false, error: "Maximum upload size is 25 MB" },
        413,
        origin
      );
    }

    const folder = validFolder(form.get("folder"));
    const folderId = await kv.get(FOLDER_PREFIX + folder.key);

    if (!folderId) {
      return response(
        helpers,
        { ok: false, error: "Initialize folders first" },
        409,
        origin
      );
    }

    const boundary = "micdom" + randomString(12);
    const metadata = JSON.stringify({
      name: file.name,
      parents: [folderId]
    });

    const fileBytes = await file.arrayBuffer();

    const prefix = new TextEncoder().encode(
      "--" + boundary +
      "\r\nContent-Type: application/json; charset=UTF-8" +
      "\r\n\r\n" + metadata +
      "\r\n--" + boundary +
      "\r\nContent-Type: " +
      (file.type || "application/octet-stream") +
      "\r\n\r\n"
    );

    const suffix = new TextEncoder().encode(
      "\r\n--" + boundary + "--"
    );

    const body = new Uint8Array(
      prefix.length + fileBytes.byteLength + suffix.length
    );

    body.set(prefix, 0);
    body.set(new Uint8Array(fileBytes), prefix.length);
    body.set(suffix, prefix.length + fileBytes.byteLength);

    const uploaded = await googleFetch(
      token.access_token,
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,webViewLink",
      {
        method: "POST",
        headers: {
          "Content-Type": "multipart/related; boundary=" + boundary
        },
        body
      }
    );

    await helpers.writeAudit(
      env,
      "micdom-owner",
      "drive.file.uploaded",
      "google-drive-file",
      uploaded.id
    );

    return response(
      helpers,
      { ok: true, file: uploaded, folder: folder.key },
      201,
      origin
    );
  }

  return response(
    helpers,
    { ok: false, error: "Drive route not found" },
    404,
    origin
  );
}
