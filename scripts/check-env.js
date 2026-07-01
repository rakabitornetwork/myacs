#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const production = process.argv.includes('--production');
const envFile = process.argv.find((a) => a.startsWith('--env='))?.slice(6) || '.env';

dotenv.config({ path: path.join(root, envFile) });
if (production) process.env.NODE_ENV = 'production';

const { validateConfig } = await import('../app/config/validate.js');

const { errors, warnings, ok } = validateConfig({ production });

console.log('MyACS — Environment Check');
console.log(`file: ${envFile}${production ? ' (production mode)' : ''}\n`);

if (process.env.APP_URL) console.log(`APP_URL=${process.env.APP_URL}`);
if (process.env.ACS_MODE) console.log(`ACS_MODE=${process.env.ACS_MODE}`);
console.log('');

for (const w of warnings) console.log(`⚠  ${w}`);
for (const e of errors) console.log(`✗  ${e}`);

if (!ok) {
  console.log('\n✗  Perbaiki error di atas sebelum deploy');
  if (production && errors.some((e) => e.includes('SESSION_SECRET'))) {
    console.log(`\n   Generate secret: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`);
  }
  process.exit(1);
}

console.log(warnings.length ? '\n✓  Bisa deploy (ada peringatan)' : '\n✓  Konfigurasi siap deploy');
