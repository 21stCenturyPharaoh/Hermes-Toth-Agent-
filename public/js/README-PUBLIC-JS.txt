HERMES-TOTH-AGENT V26.8 PUBLIC JS

Upload these files into the GitHub repository at:

public/js/

Files:
- agents.js
- dashboard.js
- bridge.js
- memory.js
- routes.js
- health.js

IMPORTANT:
The dashboard and routes use ES modules, so the HTML pages that load them should use:
<script type="module" src="public/js/dashboard.js"></script>
<script type="module" src="public/js/routes.js"></script>

The Worker bridge currently points to:
https://pharaoh-auto-delivery.pharangels.workers.dev

This package does not claim that all Worker endpoints are already deployed. The endpoints must be verified after the GitHub/Cloudflare deployment.
