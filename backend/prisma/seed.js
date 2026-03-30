/* eslint-disable @typescript-eslint/no-var-requires */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
  const email = (
    process.env.SEED_ADMIN_EMAIL || 'admin@example.com'
  ).toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
  const firstName = process.env.SEED_ADMIN_FIRST_NAME || 'Admin';
  const lastName = process.env.SEED_ADMIN_LAST_NAME || 'User';

  const role = await prisma.role.upsert({
    where: { name: 'Admin' },
    create: { name: 'Admin' },
    update: {},
  });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Seed: admin user ${email} already exists — skipping create`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      roleId: role.id,
      isActive: true,
    },
  });

  console.log(`Seed: created admin user ${email}`);
  console.log(
    'Use POST /auth/login with that email and password (override via SEED_ADMIN_* in .env)',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
