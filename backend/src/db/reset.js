import pool from './pool.js';

async function reset() {
  console.log('Mengosongkan seluruh data (struktur tabel tetap ada)...');
  await pool.query(`
    TRUNCATE TABLE
      activity_logs, notifications, comments, subtugas_files,
      subtugas_updates, subtugas, tugas, periodes,
      team_members, teams, auth_tokens, users
    RESTART IDENTITY CASCADE;
  `);
  console.log('Selesai. Semua tabel sekarang kosong (ID mulai dari 1 lagi).');
  await pool.end();
}

reset().catch((err) => {
  console.error('Reset gagal:', err);
  process.exit(1);
});