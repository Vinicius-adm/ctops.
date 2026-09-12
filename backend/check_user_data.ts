import { prisma } from '@/lib/prisma';

async function checkUserData() {
  console.log('\n=== VERIFICANDO DADOS POR USUÁRIO ===\n');

  // Listar todos os usuários
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true
    }
  });

  console.log(`📋 Total de usuários: ${users.length}\n`);

  // Para cada usuário, verificar seus dados
  for (const user of users) {
    console.log(`👤 ${user.email} (${user.role})`);
    console.log(`   ID: ${user.id}`);

    // Containers do usuário
    const containerCount = await prisma.container.count({
      where: { owner_user_id: user.id }
    });
    console.log(`   📦 Containers: ${containerCount}`);

    // Databases do usuário
    const dbCount = await prisma.database.count({
      where: { owner_user_id: user.id }
    });
    console.log(`   🗄️  Databases: ${dbCount}`);

    // APIs do usuário
    try {
      const apiCount = await prisma.api.count({
        where: { created_by: user.id }
      });
      console.log(`   🔌 APIs: ${apiCount}`);
    } catch (e) {
      console.log(`   🔌 APIs: erro`);
    }

    // Agents do usuário
    try {
      const agentCount = await prisma.agent.count({
        where: { created_by: user.id }
      });
      console.log(`   🤖 Agents: ${agentCount}`);
    } catch (e) {
      console.log(`   🤖 Agents: erro`);
    }

    // Jobs do usuário
    const jobCount = await prisma.job.count({
      where: { owner_user_id: user.id }
    });
    console.log(`   ⏱️  Jobs: ${jobCount}`);

    console.log('');
  }
}

checkUserData()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch((e) => {
    console.error('Erro:', e);
    process.exit(1);
  });
