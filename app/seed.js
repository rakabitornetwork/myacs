import dotenv from 'dotenv';
import { connectDatabase } from './database.js';
import User from './models/User.js';

dotenv.config();

const SEED_EMAIL = 'amon@teslatech.my.id';
const SEED_PASSWORD = 'gantengmax';
const SEED_NAME = 'Amon';

export async function ensureDefaultUser() {
  const existing = await User.findOne({ email: SEED_EMAIL });
  if (existing) return;

  const password = await User.hashPassword(SEED_PASSWORD);
  await User.create({
    name: SEED_NAME,
    email: SEED_EMAIL,
    password,
    role: 'admin',
  });
  console.log(`[seed] created default admin: ${SEED_EMAIL}`);
}

async function main() {
  await connectDatabase();
  await ensureDefaultUser();
  console.log('[seed] done');
  process.exit(0);
}

const isMain = process.argv[1]?.endsWith('seed.js');
if (isMain) {
  main().catch((err) => {
    console.error('[seed] failed:', err.message);
    process.exit(1);
  });
}
