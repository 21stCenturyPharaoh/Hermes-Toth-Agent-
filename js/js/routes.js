// HERMES-TOTH-AGENT | ROUTES.JS | v1.0 | Auto-index all pages
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('routes-grid');
  
  const routes = [
    {file: 'index.html', name: 'Command Center', emoji: '🏛️', color: '#FBBF24', desc: 'Main HQ'},
    {file: 'angels.html', name: 'Angel Team', emoji: '👼', color: '#22C55E', desc: '7 Specialists'},
    {file: 'nodes.html', name: 'Capabilities', emoji: '🧠', color: '#3B82F6', desc: 'System Matrix'},
    {file: 'missions.html', name: 'Mission Queue', emoji: '📋', color: '#EC4899', desc: 'Build Roadmap'},
    {file: 'memory.html', name: 'Memory Vault', emoji: '💾', color: '#A855F7', desc: 'KV Storage'},
    {file: 'api.html', name: 'API Bridge', emoji: '🌉', color: '#06B6D4', desc: 'Workers Endpoint'},
    {file: 'termux.html', name: 'Termux Throne', emoji: '📯', color: '#F97316', desc: 'Blackview Bridge'},
    {file: 'legal.html', name: 'Legal Firewall', emoji: '⚖️', color: '#EF4444', desc: '501c3 Compliance'},
    {file: 'links.html', name: 'Empire Links', emoji: '🔗', color: '#64748B', desc: 'External Doors'}
  ];

  grid.innerHTML = routes.map(r => `
    <a href="${r.file}" class="p-5 border rounded-xl transition hover:scale-105 block" style="border-color: ${r.color}40; background: ${r.color}10;">
      <div class="text-3xl mb-2">${r.emoji}</div>
      <h3 class="font-bold text-lg" style="color: ${r.color}">${r.name}</h3>
      <p class="text-xs text-gray-400">${r.file}</p>
      <p class="text-sm text-gray-300 mt-1">${r.desc}</p>
    </a>
  `).join('');
});