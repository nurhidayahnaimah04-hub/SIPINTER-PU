import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.log('Menjalankan migrasi skema database...');
  await pool.query(sql);
  console.log('Migrasi selesai.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migrasi gagal:', err);
  process.exit(1);
});
