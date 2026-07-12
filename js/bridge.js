// HERMES-TOTH-AGENT | API.JS | v1.0 | Connects dashboard to angels-hosts-api3
const API_BASE = 'https://angels-hosts-api3.pharangels.workers.dev';

document.getElementById('news-fetch-btn').addEventListener('click', async () => {
  const query = document.getElementById('news-query').value || 'top';
  const resultsEl = document.getElementById('news-results');
  resultsEl.innerHTML = 'Fetching...';

  try {
    const res = await fetch(`${API_BASE}/news?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (!data.articles || data.articles.length === 0) {
      resultsEl.innerHTML = 'No results found.';
      return;
    }

    resultsEl.innerHTML = data.articles.slice(0, 5).map(a => `
      <div class="border border-gray-800 rounded p-3">
        <a href="${a.url}" target="_blank" class="font-medium text-blue-400 hover:underline">${a.title}</a>
        <p class="text-gray-500 text-xs mt-1">${a.source?.name || ''}</p>
      </div>
    `).join('');
  } catch (err) {
    resultsEl.innerHTML = `⚠️ Failed to fetch news: ${err.message}`;
  }
});

document.getElementById('alert-send-btn').addEventListener('click', async () => {
  const to = document.getElementById('alert-to').value;
  const subject = document.getElementById('alert-subject').value;
  const text = document.getElementById('alert-text').value;
  const statusEl = document.getElementById('alert-status');

  if (!to || !subject || !text) {
    statusEl.textContent = '⚠️ Fill in all fields.';
    return;
  }

  statusEl.textContent = 'Sending...';

  try {
    const res = await fetch(`${API_BASE}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, text })
    });
    const data = await res.json();
    statusEl.textContent = data.ok ? '✅ Sent!' : '❌ Failed to send.';
  } catch (err) {
    statusEl.textContent = `⚠️ Error: ${err.message}`;
  }
});
