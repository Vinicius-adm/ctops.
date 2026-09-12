(async () => {
  const base = 'http://localhost:3001';
  const creds = { email: 'master@ctops.com', password: 'ChangeMeInProduction123!@#' };

  console.log('Logging in...');
  const loginRes = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(creds) });
  const loginJson = await loginRes.json().catch(() => ({}));
  console.log('LOGIN', loginRes.status, loginJson);
  if (loginRes.status !== 200) return process.exit(1);
  const token = loginJson.access_token || loginJson.token || loginJson.accessToken || loginJson.accessToken;
  if (!token) { console.error('no token in login response'); return process.exit(1); }

  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  console.log('Creating container (test-container)...');
  const createRes = await fetch(`${base}/containers`, { method: 'POST', headers, body: JSON.stringify({ name: 'test-container-nohost', image: 'nginx:latest' }) });
  const createJson = await createRes.json().catch(() => ({}));
  console.log('CREATE', createRes.status, createJson);

  console.log('Listing containers...');
  const listRes = await fetch(`${base}/containers`, { headers });
  const listJson = await listRes.json().catch(() => ({}));
  console.log('LIST', listRes.status, listJson);

  const containers = listJson.containers || [];
  if (!containers.length) { console.log('no containers found, done'); return; }

  const id = containers[0].id;
  console.log('Refreshing container:', id);
  const refreshRes = await fetch(`${base}/containers/${id}/actions/refresh`, { method: 'POST', headers });
  console.log('REFRESH', refreshRes.status, await refreshRes.json().catch(() => ({})));

  console.log('Fetching logs:');
  const logsRes = await fetch(`${base}/containers/${id}/logs?tail=50`, { headers });
  console.log('LOGS', logsRes.status, await logsRes.json().catch(() => ({})));

})().catch(e=>{ console.error('ERROR', e); process.exit(1); });