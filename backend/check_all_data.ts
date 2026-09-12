import { prisma } from '@/lib/prisma';

async function checkAllData() {
  console.log('\n=== VERIFICANDO TODOS OS DADOS ===\n');

  // Contar usuários
  const userCount = await prisma.user.count();
  console.log(`👤 Total de usuários: ${userCount}`);

  // Contar containers
  const containerCount = await prisma.container.count();
  console.log(`📦 Total de containers: ${containerCount}`);
  if (containerCount > 0) {
    const containers = await prisma.container.findMany({
      select: { id: true, name: true, provider: true, created_by: true }
    });
    containers.forEach(c => console.log(`   - ${c.name} (${c.provider}) criado por: ${c.created_by}`));
  }

  // Contar databases
  const dbCount = await prisma.database.count();
  console.log(`🗄️  Total de databases: ${dbCount}`);
  if (dbCount > 0) {
    const dbs = await prisma.database.findMany({
      select: { id: true, name: true, type: true, created_by: true }
    });
    dbs.forEach(db => console.log(`   - ${db.name} (${db.type}) criado por: ${db.created_by}`));
  }

  // Contar APIs
  try {
    const apiCount = await prisma.api.count();
    console.log(`🔌 Total de APIs: ${apiCount}`);
    if (apiCount > 0) {
      const apis = await prisma.api.findMany({
        select: { id: true, name: true, endpoint: true, created_by: true }
      });
      apis.forEach(api => console.log(`   - ${api.name} (${api.endpoint}) criado por: ${api.created_by}`));
    }
  } catch (e) {
    console.log(`🔌 Total de APIs: ? (erro ao consultar)`);
  }

  // Contar Jobs
  try {
    const jobCount = await prisma.job.count();
    console.log(`⏱️  Total de jobs: ${jobCount}`);
  } catch (e) {
    console.log(`⏱️  Total de jobs: ? (erro ao consultar)`);
  }

  // Contar Agents
  try {
    const agentCount = await prisma.agent.count();
    console.log(`🤖 Total de agents: ${agentCount}`);
  } catch (e) {
    console.log(`🤖 Total de agents: ? (erro ao consultar)`);
  }

  console.log('\n');
}

checkAllData()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch((e) => {
    console.error('Erro:', e);
    process.exit(1);
  });
