/**
 * Safe admin user creation script.
 * Creates the default admin account if it doesn't already exist.
 * Does NOT delete any existing data.
 */
import { connectDB } from './mongoose.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

async function main() {
  const EMAIL = 'admin@brahmi.com';
  const PASSWORD = '2525';
  const NAME = 'Prakash Holla';

  await connectDB();

  const existing = await User.findOne({ email: EMAIL });

  if (existing) {
    console.log(`✅ Admin user already exists: ${EMAIL}`);
    await mongoose.disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash(PASSWORD, 10);
  const user = new User({
    email: EMAIL,
    password: hashedPassword,
    name: NAME,
    avatarUrl: null,
  });
  await user.save();

  console.log(`✅ Admin user created: ${user.email}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
