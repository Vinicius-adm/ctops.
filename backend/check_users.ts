import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Total users:', users.length);
  console.log('\n=== USERS IN DATABASE ===');
  users.forEach(u => {
    console.log(`Email: ${u.email}, Role: ${u.role}, Active: ${u.is_active}`);
  });
  await prisma.$disconnect();
}

main().catch(console.error);
