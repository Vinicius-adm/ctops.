import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "master@ctops.com";
  const password = "12345678";

  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password_hash: hash,
      role: "ADMIN",
      name: "Master Admin",
    },
    create: {
      email,
      password_hash: hash,
      role: "ADMIN",
      name: "Master Admin",
    },
  });

  console.log("OK:", user.email);
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());
