async function testAuthMe() {
  // Primeiro fazer login para obter o token
  console.log('1️⃣  Fazendo login...');
  const loginResponse = await fetch('http://localhost:5433/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'master@ctops.com',
      password: 'ChangeMeInProduction123!@#'
    })
  });

  const loginData = await loginResponse.json();
  const token = loginData.access_token;
  
  if (!token) {
    console.error('❌ Erro ao fazer login:', loginData);
    return;
  }
  
  console.log('✅ Login bem-sucedido');
  console.log(`Token: ${token.substring(0, 50)}...`);

  // Agora fazer requisição para /auth/me
  console.log('\n2️⃣  Testando /auth/me...');
  const meResponse = await fetch('http://localhost:5433/auth/me', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  const meData = await meResponse.json();
  
  console.log(`Status: ${meResponse.status}`);
  console.log('Resposta:', JSON.stringify(meData, null, 2));
}

testAuthMe();
