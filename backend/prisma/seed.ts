import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const masterEmail = process.env.MASTER_EMAIL || 'master@ctops.com';
  const masterPassword = process.env.MASTER_PASSWORD || 'ChangeMeInProduction123!@#';

  const existingMaster = await prisma.user.findUnique({
    where: { email: masterEmail }
  });

  if (!existingMaster) {
    const passwordHash = await bcryptjs.hash(masterPassword, 10);
    
    const master = await prisma.user.create({
      data: {
        email: masterEmail,
        name: 'Master Admin',
        password_hash: passwordHash,
        role: 'ADMIN_MASTER',
        is_active: true
      }
    });

    console.log(`✅ Master user created: ${master.email}`);
  } else {
    // Se o master já existe, verifique se a senha atual do .env bate com o hash no banco.
    // Se não bater, atualize o hash para sincronizar a senha do ambiente de desenvolvimento.
    const isSame = await bcryptjs.compare(masterPassword, existingMaster.password_hash);
    if (!isSame) {
      const newHash = await bcryptjs.hash(masterPassword, 10);
      await prisma.user.update({
        where: { id: existingMaster.id },
        data: { password_hash: newHash }
      });
      console.log(`🔁 Master password updated for: ${masterEmail}`);
    } else {
      console.log(`ℹ️  Master user already exists: ${masterEmail}`);
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
