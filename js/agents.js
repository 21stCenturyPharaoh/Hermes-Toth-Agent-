// HERMES-TOTH-AGENT | AGENTS.JS | v1.0 | Full Angel Profiles
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('angels-full');

  try{
    const res = await fetch('data/agents.json');
    const angels = await res.json();
    
    container.innerHTML = angels.map(angel => `
      <div class="p-6 border rounded-2xl" style="border-color: ${angel.color}50; background: linear-gradient(135deg, ${angel.color}15, transparent);">
        <div class="flex items-center gap-4 mb-4">
          <div class="text-5xl">${angel.emoji}</div>
          <div>
            <h2 class="text-2xl font-black" style="color: ${angel.color}">${angel.name}</h2>
            <p class="text-gray-400">${angel.title}</p>
          </div>
        </div>
        <p class="text-gray-300 mb-4">${angel.capability}</p>
        <div class="border-t border-slate-700 pt-3">
          <p class="text-xs text-gray-500 mb-2">Trigger Keywords:</p>
          <div class="flex flex-wrap gap-2">
            ${angel.keywords.map(k => `<span class="px-3 py-1 text-xs rounded-full" style="background: ${angel.color}20; color: ${angel.color};">${k}</span>`).join('')}
          </div>
        </div>
      </div>
    `).join('');

  }catch(err){
    container.innerHTML = `<p class="text-red-400 text-center">⚠️ Failed to load angels.json: ${err.message}</p>`;
  }
});