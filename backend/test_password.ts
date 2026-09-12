import bcryptjs from 'bcryptjs';
import { prisma } from '@/lib/prisma';

async function testPassword() {
  const testPassword = 'ChangeMeInProduction123!@#';
  
  // Obter o usuário do banco
  const user = await prisma.user.findUnique({
    where: { email: 'master@ctops.com' }
  });

  if (!user) {
    console.log('❌ Usuário não encontrado');
    return;
  }

  console.log('=== TESTE DE SENHA ===');
  console.log(`Email: ${user.email}`);
  console.log(`Password Hash no BD: ${user.password_hash.substring(0, 50)}...`);
  console.log(`Senha testada: ${testPassword}`);
  
  // Verificar se a senha bate
  const matches = await bcryptjs.compare(testPassword, user.password_hash);
  console.log(`✅ Senha correta? ${matches}`);
  
  // Gerar um novo hash da mesma senha
  const newHash = await bcryptjs.hash(testPassword, 10);
  console.log(`Hash novo: ${newHash.substring(0, 50)}...`);
  
  // Testar se o novo hash também funciona
  const newMatches = await bcryptjs.compare(testPassword, newHash);
  console.log(`✅ Novo hash funciona? ${newMatches}`);
}

testPassword()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch((e) => {
    console.error('Erro:', e);
    process.exit(1);
  });
