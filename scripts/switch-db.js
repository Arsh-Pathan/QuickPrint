const fs = require('fs');
const path = require('path');

const target = process.argv[2]; // 'postgres' or 'sqlite'
const prismaDir = path.join(__dirname, '../apps/backend/prisma');

if (target === 'sqlite') {
  console.log('Switching to SQLite schema...');
  fs.copyFileSync(
    path.join(prismaDir, 'schema.sqlite.prisma'),
    path.join(prismaDir, 'schema.prisma')
  );
} else if (target === 'postgres') {
  console.log('Restoring Postgres schema...');
  fs.copyFileSync(
    path.join(prismaDir, 'schema.postgres.prisma'),
    path.join(prismaDir, 'schema.prisma')
  );
} else {
  console.log('Usage: node scripts/switch-db.js <postgres|sqlite>');
  process.exit(1);
}
