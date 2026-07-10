// MAILERSEND v1 | SOR-03 RECRUIT-ANGEL
if (pathname === '/api/belsidus/send' && request.method === 'POST') {
  const { to, subject, html } = await request.json();
  const res = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.MAILERSEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: { email: 'noreply@trial-xyz.mlsend.com', name: 'Nefetari β | Hermes-Toth Agent' },
      to: [{ email: to }],
      subject: subject,
      html: html
    })
  });
  return Response.json({ status: res.ok ? 'EMAIL SENT' : 'FAILED', tier: '3,000/month Free' });
}