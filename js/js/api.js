// HERMES-TOTH-AGENT | API.JS | v1.0 | Workers Bridge Stub
document.addEventListener('DOMContentLoaded', () => {
  const testBox = document.getElementById('api-test');
  const WORKER_URL = 'https://hermes-toth-commander.workers.dev/api';

  // Static placeholder until Block 2 deploy
  const demo = `
<span class="text-gray-500">// Status: Static Mode</span><br>
<span class="text-amber-400">Endpoint:</span> ${WORKER_URL}<br>
<span class="text-gray-500">// Block 2 will enable live fetch()</span><br>
<span class="text-emerald-400">Example:</span> query → Angel Router → Response
  `;
  
  if(testBox) testBox.innerHTML = demo;

  // Future Block 2 code:
  // async function queryAngel(q){
  //   const res = await fetch(WORKER_URL, {method: 'POST', body: JSON.stringify({query: q})});
  //   return res.json();
  // }
});