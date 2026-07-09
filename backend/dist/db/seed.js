"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding database...');
    // 1. Clean existing data
    await prisma.workAssignment.deleteMany();
    await prisma.work.deleteMany();
    await prisma.worker.deleteMany();
    await prisma.user.deleteMany();
    // 2. Seed default admin user
    const hashedPassword = await bcryptjs_1.default.hash('2525', 10);
    const adminUser = await prisma.user.create({
        data: {
            email: 'admin@brahmi.com',
            password: hashedPassword,
            name: 'Prakash Holla',
            avatarUrl: null,
        },
    });
    console.log(`Created admin user: ${adminUser.email}`);
    console.log('Database seeding completed successfully.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
