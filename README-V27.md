# Hermes-Toth-Agent V27.1 Patch

This is an **additive patch** for the existing Hermes-Toth-Agent repository.

## Upload these files/folders

- `v27/architecture.json`
- `v27/videos.json`
- `v27/angels.json`
- `v27/halel/index.html`
- `v27/halel/missions.html`
- `v27/halel/teams.html`
- `v27/halel/orders.html`
- `v27/halel/consulates.html`
- `v27/halel/gates.html`
- `v27/halel/corps.html`
- `v27/halel/elements.html`
- `v27/halel/lore.html`
- `public/js/halel-v27.js`

## Critical safety rule

Do **not** overwrite the existing root `index.html`, existing `missions.html`, existing `public/js/agents.js`, `dashboard.js`, `bridge.js`, `memory.js`, `routes.js`, or any production Worker source.

The existing root `missions.html` is intentionally protected by placing the new H.A.L.EL page under `v27/halel/missions.html`.

## Optional one-line integration

After the existing scripts in the current root `index.html`, add:

```html
<script src="public/js/halel-v27.js" defer></script>
```

A copy of this insertion is in `index-v27.1-insertion.html`.

## What V27.1 adds

1. REAL PLATFORM / H.A.L.EL LARP / HERMES-TOTH BRIDGE separation.
2. Seven Node Teams: Aleph–Zayin.
3. Thirteen Orders.
4. Seven Consulate roles.
5. Five Gates.
6. Three Corps.
7. Four Elements.
8. Seven Angel Specialist definitions.
9. Four video placements, including the intentional duplicate placement of the master-architecture video.
10. Restrained Asian-character UI nods: 公益, 智慧, 使命, 服务, 守护, 连接, 记.

## Worker note

The V27.1 patch does **not** replace production Workers. Merge any API additions into the existing Worker source while preserving current routes, registration, tracking and affiliate behavior.
