import { prisma } from '@/lib/prisma';

async function listAllUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      avatar_url: true
    }
  });

  console.log('\n=== TODOS OS USUÁRIOS NO BANCO ===\n');
  console.log(`Total de usuários: ${users.length}\n`);
  
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Ativo: ${user.is_active}`);
    console.log(`   Avatar: ${user.avatar_url || 'nenhum'}`);
    console.log(`   Criado em: ${user.created_at}`);
    console.log(`   Atualizado em: ${user.updated_at}`);
    console.log('');
  });
}

listAllUsers()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch((e) => {
    console.error('Erro:', e);
    process.exit(1);
  });
