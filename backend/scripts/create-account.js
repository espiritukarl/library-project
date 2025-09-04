/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (next && !next.startsWith('--')) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function main() {
  const { email, password, username } = parseArgs(process.argv);
  if (!email || !password) {
    console.error('Usage: node scripts/create-account.js --email <email> --password <password> [--username <name>]');
    process.exit(1);
  }
  if (!isValidEmail(email)) {
    console.error('Invalid email format');
    process.exit(1);
  }
  if (String(password).length < 8) {
    console.error('Password must be at least 8 characters');
    process.exit(1);
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`User with email ${email} already exists (id=${existing.id}).`);
    process.exit(2);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, username: username || null, passwordHash } });
  console.log('Created user:', { id: user.id, email: user.email, username: user.username });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

