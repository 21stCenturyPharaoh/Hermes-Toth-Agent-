// HERMES-TOTH-AGENT | MEMORY.JS | v1.0 | Renders Missions
document.addEventListener('DOMContentLoaded', async () => {
  const list = document.getElementById('missions-list');

  try{
    const res = await fetch('data/missions.json');
    const missions = await res.json();
    
    list.innerHTML = missions.map(m => `
      <div class="p-6 border rounded-2xl" style="border-color: ${m.color}50; background: ${m.color}10;">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-xl font-black" style="color: ${m.color}">${m.block}: ${m.title}</h3>
          <span class="px-3 py-1 text-xs font-bold rounded-full" style="background: ${m.color}30; color: ${m.color};">${m.status}</span>
        </div>
        <ul class="space-y-1">
          ${m.tasks.map(t => `<li class="text-gray-300 text-sm flex gap-2"><span style="color: ${m.color};">✓</span> ${t}</li>`).join('')}
        </ul>
      </div>
    `).join('');

  }catch(err){
    list.innerHTML = `<p class="text-red-400 text-center">⚠️ Failed to load missions.json: ${err.message}</p>`;
  }
});