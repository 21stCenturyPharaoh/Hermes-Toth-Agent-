
/**
 * HERMES-TOTH AGENT
 * Backend Worker API
 *
 * Intended hostname:
 * https://toth-agent.pharaoh-conglomerate.org
 *
 * Version: 1.0.0
 *
 * Initial safe release:
 * - API health checks
 * - Service information
 * - CORS for approved frontends
 * - JSON responses
 * - Safe handling of unknown routes
 *
 * No email, membership, payment, or database writes
 * are enabled in this initial release.
 */

const SERVICE_NAME = "Hermes-Toth-Agent";
const VERSION = "1.0.0";

const ALLOWED_ORIGINS = new Set([
  "https://micdom-records.pharaoh-conglomerate.org",
  "https://56df31dd.hermes-toth-agent.pages.dev",
  "https://275860d9.hermes-toth-agent.pages.dev",
  "https://21stcenturypharaoh.github.io"
]);

function makeHeaders(origin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Vary": "Origin"
  };

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
    headers["Access-Control-Allow-Headers"] =
      "Content-Type, Authorization";
    headers["Access-Control-Max-Age"] = "86400";
  }

  return headers;
}

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: makeHeaders(origin)
  });
}

function getHealthData() {
  return {
    ok: true,
    service: SERVICE_NAME,
    version: VERSION,
    status: "online",
    role: "backend-api",
    timestamp: new Date().toISOString()
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const path = url.pathname;
    const origin = request.headers.get("Origin");

    try {
      // Browser CORS preflight
      if (method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: makeHeaders(origin)
        });
      }

      // Backend root: service identification
      if (path === "/" && method === "GET") {
        return jsonResponse({
          ok: true,
          service: SERVICE_NAME,
          version: VERSION,
          message: "Hermes-Toth Agent backend is running.",
          health: "/api/health"
        }, 200, origin);
      }

      // Health endpoint
      if (
        (path === "/api/health" || path === "/health") &&
        method === "GET"
      ) {
        return jsonResponse(getHealthData(), 200, origin);
      }

      // Reject unsupported methods on known health endpoints
      if (
        (path === "/api/health" || path === "/health") &&
        method !== "GET"
      ) {
        return jsonResponse({
          ok: false,
          error: "Method not allowed",
          allowed: ["GET", "OPTIONS"]
        }, 405, origin);
      }

      // Unknown API route
      if (path.startsWith("/api/")) {
        return jsonResponse({
          ok: false,
          error: "API route not implemented",
          path: path
        }, 404, origin);
      }

      // Unknown non-API route
      return jsonResponse({
        ok: false,
        error: "Not found"
      }, 404, origin);

    } catch (error) {
      // Do not expose internal errors or secrets to callers
      console.error("Hermes Worker error:", error);

      return jsonResponse({
        ok: false,
        error: "Internal server error"
      }, 500, origin);
    }
  }
};
