import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Clean up database connections on process shutdown
const cleanup = async () => {
  await prisma.$disconnect();
};

process.on('SIGINT', async () => {
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});

export default prisma;

