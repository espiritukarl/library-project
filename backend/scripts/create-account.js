/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-require-imports */
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
function isValidUsername(username) {
  return /^[a-zA-Z0-9_\-.]{3,50}$/.test(username);
}

async function main() {
  const { email, password, username } = parseArgs(process.argv);
  if (!username || !password) {
    console.error('Usage: node scripts/create-account.js --username <username> --password <password> [--email <email>]');
    process.exit(1);
  }
  if (email && !isValidEmail(email)) {
    console.error('Invalid email format');
    process.exit(1);
  }
  if (!isValidUsername(username)) {
    console.error('Invalid username. Use 3-50 chars [a-zA-Z0-9_.-]');
    process.exit(1);
  }
  if (String(password).length < 8) {
    console.error('Password must be at least 8 characters');
    process.exit(1);
  }
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.error(`User with username ${username} already exists (id=${existing.id}).`);
    process.exit(2);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email: email || null, username, passwordHash } });
  console.log('Created user:', { id: user.id, username: user.username, email: user.email });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
