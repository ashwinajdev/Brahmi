/**
 * Safe admin user creation script.
 * Creates the default admin account if it doesn't already exist.
 * Does NOT delete any existing data.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const EMAIL = 'admin@brahmi.com';
  const PASSWORD = '2525';
  const NAME = 'Prakash Holla';

  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });

  if (existing) {
    console.log(`✅ Admin user already exists: ${EMAIL}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      password: hashedPassword,
      name: NAME,
      avatarUrl: null,
    },
  });

  console.log(`✅ Admin user created: ${user.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
