// HERMES-TOTH-AGENT | DASHBOARD.JS | v1.0 | Renders Angels
document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('agents-grid');
  const countEl = document.getElementById('angel-count');

  try{
    const res = await fetch('data/agents.json');
    const angels = await res.json();
    
    countEl.textContent = angels.length;
    
    grid.innerHTML = angels.map(angel => `
      <div class="p-4 border rounded-xl transition hover:scale-105" style="border-color: ${angel.color}40; background: ${angel.color}10;">
        <div class="text-3xl mb-2">${angel.emoji}</div>
        <h3 class="font-bold text-lg" style="color: ${angel.color}">${angel.name}</h3>
        <p class="text-sm text-gray-400 mb-2">${angel.title}</p>
        <p class="text-xs text-gray-300">${angel.capability}</p>
      </div>
    `).join('');

  }catch(err){
    countEl.textContent = '0';
    grid.innerHTML = `<p class="text-red-400">⚠️ Failed to load angels.json: ${err.message}</p>`;
  }
});