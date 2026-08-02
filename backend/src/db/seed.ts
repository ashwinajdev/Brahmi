import { connectDB } from './mongoose.js';
import User from '../models/User.js';
import Worker from '../models/Worker.js';
import Work from '../models/Work.js';
import WorkAssignment from '../models/WorkAssignment.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

async function main() {
  console.log('Seeding database...');

  await connectDB();

  // 1. Clean existing data
  await WorkAssignment.deleteMany({});
  await Work.deleteMany({});
  await Worker.deleteMany({});
  await User.deleteMany({});

  // 2. Seed default admin user
  const hashedPassword = await bcrypt.hash('2525', 10);
  const adminUser = new User({
    email: 'admin@brahmi.com',
    password: hashedPassword,
    name: 'Prakash Holla',
    avatarUrl: null,
  });
  await adminUser.save();
  console.log(`Created admin user: ${adminUser.email}`);

  console.log('Database seeding completed successfully.');

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
