# HERMES-TOTH-AGENT V26.8

Autonomous Synthetic Assets command-center foundation.

## Core modules
- `public/js/agents.js` — H.A.L.EL, TOTH, MOSETTA
- `public/js/dashboard.js` — affiliate/business dashboard
- `public/js/bridge.js` — Auto-Delivery Worker bridge
- `public/js/memory.js` — local preference memory
- `public/js/routes.js` — referral capture, link tagging and click tracking

## Worker
Primary bridge target:
`https://pharaoh-auto-delivery.pharangels.workers.dev`

Expected routes:
- `/health`
- `/register-affiliate`
- `/register-business`
- `/track-click`
- `/affiliates`

The `/affiliates` read is intentionally tolerant: if it is not implemented by the Worker yet, the dashboard shows an empty-state instead of crashing.

## Deployment
Deploy this repository as a Cloudflare Pages project or GitHub Pages static site. For Cloudflare Pages, the repository root is the project root and `index.html` is the entry point.

## Important
This package does not claim that the Auto-Delivery Worker endpoints or KV bindings are deployed/working. They must be verified against the actual Worker source/configuration.
