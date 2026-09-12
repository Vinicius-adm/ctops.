async function testLogin() {
  try {
    console.log('Testando login com:');
    console.log('Email: master@ctops.com');
    console.log('Senha: ChangeMeInProduction123!@#');
    console.log('---');

    const response = await fetch('http://localhost:5433/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'master@ctops.com',
        password: 'ChangeMeInProduction123!@#'
      })
    });

    console.log('Status:', response.status);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCESSO!');
      console.log('Resposta:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ ERRO!');
      console.log('Erro:', JSON.stringify(data, null, 2));
    }
  } catch (error: any) {
    console.log('❌ ERRO DE CONEXÃO!');
    console.log('Mensagem:', error.message);
  }
}

testLogin();
