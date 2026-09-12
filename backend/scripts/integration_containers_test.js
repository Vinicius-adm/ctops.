(async () => {
  const base = 'http://localhost:3001';
  const creds = { email: 'master@ctops.com', password: 'ChangeMeInProduction123!@#' };

  console.log('Logging in...');
  const loginRes = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(creds) });
  const loginJson = await loginRes.json().catch(() => ({}));
  console.log('LOGIN', loginRes.status, loginJson);
  if (loginRes.status !== 200) return process.exit(2);
  const token = loginJson.access_token || loginJson.token || loginJson.accessToken || loginJson.accessToken;
  if (!token) { console.error('no token in login response'); return process.exit(3); }

  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  console.log('Creating container with invalid host (expect 400)...');
  const badCreate = await fetch(`${base}/containers`, { method: 'POST', headers, body: JSON.stringify({ name: 't-invalid', image: 'nginx:latest', host: 'badhost' }) });
  console.log('BAD CREATE STATUS', badCreate.status);
  if (badCreate.status !== 400) { console.error('Expected 400 for invalid host'); return process.exit(4); }

  console.log('Creating container without host (expect 200)...');
  const createRes = await fetch(`${base}/containers`, { method: 'POST', headers, body: JSON.stringify({ name: 't-valid', image: 'nginx:latest' }) });
  console.log('CREATE STATUS', createRes.status);
  if (createRes.status !== 200) { console.error('Expected 200 when creating without host'); return process.exit(5); }

  console.log('Integration tests passed');
  process.exit(0);
})().catch(e=>{ console.error('ERROR', e); process.exit(1); });