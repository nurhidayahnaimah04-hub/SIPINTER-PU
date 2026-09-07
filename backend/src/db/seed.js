import bcrypt from 'bcryptjs';
import pool from './pool.js';

const ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

async function createUser(client, { name, nip, email, role, jabatan }) {
  const hash = await bcrypt.hash('password', ROUNDS);
  const { rows } = await client.query(
    `INSERT INTO users (name, nip, email, password, role, jabatan, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING *`,
    [name, nip, email, hash, role, jabatan]
  );
  return rows[0];
}

async function createTeam(client, { nama_tim, kode_tim, katim_id }) {
  const { rows } = await client.query(
    `INSERT INTO teams (nama_tim, kode_tim, katim_id) VALUES ($1,$2,$3) RETURNING *`,
    [nama_tim, kode_tim, katim_id]
  );
  return rows[0];
}

async function syncMembers(client, teamId, userIds) {
  for (const uid of userIds) {
    await client.query(
      `INSERT INTO team_members (team_id, user_id) VALUES ($1,$2)
       ON CONFLICT (team_id, user_id) DO NOTHING`,
      [teamId, uid]
    );
  }
}

async function createTugas(client, { judul, deskripsi, periode_id, created_by, team_id }) {
  const { rows } = await client.query(
    `INSERT INTO tugas (judul, deskripsi, periode_id, deadline, status, progress, created_by, team_id)
     VALUES ($1,$2,$3,NULL,'Belum Dimulai',0,$4,$5) RETURNING *`,
    [judul, deskripsi, periode_id, created_by, team_id]
  );
  return rows[0];
}

// Progres acak untuk data demo -- sengaja dibatasi di bawah 100% (tidak pernah penuh),
// supaya kelihatan "sedang berjalan" dan bukan seolah-olah sudah selesai semua.
function randomProgress() {
  return Math.floor(Math.random() * 86) + 10; // 10 - 95
}

async function createSubtugasUntukTugas(client, { tugas, assignedTo, createdBy }) {
  const progress = randomProgress();
  const status = progress > 0 ? 'Sedang Berjalan' : 'Belum Dimulai';

  const { rows } = await client.query(
    `INSERT INTO subtugas (tugas_id, judul, deskripsi, assigned_to, deadline, progress, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [
      tugas.id,
      `Pelaksanaan ${tugas.judul}`,
      `Rincian pelaksanaan untuk: ${tugas.judul}.`,
      assignedTo,
      null,
      progress,
      status,
      createdBy,
    ]
  );
  const subtugasId = rows[0].id;

  // Histori semester (speedometer) baca dari subtugas_updates, bukan dari kolom progress
  // di tabel subtugas -- jadi setiap subtugas demo juga perlu 1 baris "riwayat update" ini.
  await client.query(
    `INSERT INTO subtugas_updates (subtugas_id, user_id, persentase, catatan, status, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5, now(), now())`,
    [subtugasId, assignedTo, progress, 'Update progres awal (data demo).', status]
  );

  return progress;
}

async function recalculateProgress(client, tugasId) {
  const { rows: subtugasRows } = await client.query(
    `SELECT progress, status FROM subtugas WHERE tugas_id = $1`,
    [tugasId]
  );
  const { rows: tugasRows } = await client.query(`SELECT * FROM tugas WHERE id = $1`, [tugasId]);
  const tugas = tugasRows[0];

  let progress = 0;
  let status = tugas.status;

  if (subtugasRows.length > 0) {
    const avg = subtugasRows.reduce((s, r) => s + Number(r.progress), 0) / subtugasRows.length;
    progress = Math.round(avg * 100) / 100;

    const allSelesai = subtugasRows.every((s) => s.status === 'Selesai');
    if (allSelesai) {
      if (status !== 'Selesai') status = 'Menunggu Verifikasi';
    } else if (progress > 0 && ['Belum Dimulai', 'Menunggu Verifikasi'].includes(status)) {
      status = 'Sedang Berjalan';
    }
  }

  await client.query(`UPDATE tugas SET progress = $1, status = $2, updated_at = now() WHERE id = $3`, [
    progress,
    status,
    tugasId,
  ]);
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const kabalai = await createUser(client, {
      name: 'Sri Martha Hizkhi Sembiring, S.E., M.T.',
      nip: '198809202010122003',
      email: 'kabalai@pu.go.id',
      role: 'kabalai',
      jabatan: 'Kepala Balai Pengembangan Kompetensi PU Wilayah I Medan',
    });

    // ---- 2 Kepala Sub Bagian/Seksi, langsung di bawah Kepala Balai (sesuai bagan struktur) ----
    // NIP keduanya tidak tertera di bagan, jadi ditetapkan sendiri (placeholder).
    const kasubagNurbaiti = await createUser(client, {
      name: 'Nurbaiti, S.ST., M.M.',
      nip: '198705182010122004',
      email: 'nurbaiti@pu.go.id',
      role: 'kasubag',
      jabatan: 'Kepala Seksi Penyelenggaraan',
    });

    const kasubag = await createUser(client, {
      name: 'Christanto Youstra Valentino, S.E., M.H.',
      nip: '199112312019031010',
      email: 'kasubag@pu.go.id',
      role: 'kasubag',
      jabatan: 'Kepala Sub Bagian Umum & Tata Usaha',
    });

    // ---- 3 Ketua Tim Kerja, sesuai SK Kepala Balai No. 20/KPTS/Bpkpu1/2026 (1 Juli 2026) ----
    const katimKpa = await createUser(client, {
      name: 'Irawaty S.R. Simarmata, S.E., M.M.',
      nip: '198606192010122001',
      email: 'katim.kpa@pu.go.id',
      role: 'katim',
      jabatan: 'Ketua Tim Bidang Program, Keuangan dan Anggaran (Katim KPA)',
    });

    const katimKoi = await createUser(client, {
      name: 'Hendra Muliawan, S.E.',
      nip: '198808282023211024',
      email: 'katim.koi@pu.go.id',
      role: 'katim',
      jabatan: 'Ketua Tim Bidang Kepegawaian, Organisasi dan Informasi (Katim KOI)',
    });

    const katimUpb = await createUser(client, {
      name: 'Yohana Kartika, S.Sos., M.M.',
      nip: '197010212007012001',
      email: 'katim.upb@pu.go.id',
      role: 'katim',
      jabatan: 'Ketua Tim Bidang Umum, Pengadaan dan BMN (Katim UPB)',
    });

    // ---- 6 anggota "kerja" -- dipakai untuk tim & tugas/subtugas demo, TIDAK diubah ----
    const anggotaData = [
      ['Rudi Hartono', '199001012015011001', 'rudi@pu.go.id'],
      ['Dewi Lestari', '199203152016022002', 'dewi@pu.go.id'],
      ['Fajar Nugroho', '199105202017011003', 'fajar@pu.go.id'],
      ['Maya Anggraini', '199308122018022004', 'maya@pu.go.id'],
      ['Yusuf Pratama', '199206182019011005', 'yusuf@pu.go.id'],
      ['Nita Kurniawati', '199410102020022006', 'nita@pu.go.id'],
    ];
    const anggota = [];
    for (const [name, nip, email] of anggotaData) {
      anggota.push(
        await createUser(client, { name, nip, email, role: 'anggota', jabatan: 'Staf Teknik' })
      );
    }

    // ---- Sisa pegawai sesuai bagan struktur organisasi (gambar 2) ----
    // Terdaftar sebagai 'anggota' saja, TIDAK dimasukkan ke team_members apa pun --
    // penempatan ke tim dilakukan manual lewat website nantinya. NIP tidak tertera di
    // bagan, jadi dibiarkan NULL (bukan angka karangan).
    const staffLain = [
      ['Lasni Siahaan, S.Sos', 'Pengolah Data dan Informasi', 'lasni@pu.go.id'],
      ['Khairunnisa, S.M.', 'Analis Pengembangan Kompetensi ASN Ahli Pertama', 'khairunnisa@pu.go.id'],
      ['Ragil Adi Fitra, S.E.', 'Analis Pengembangan Kompetensi Ahli Pertama', 'ragil@pu.go.id'],
      ['Dini Atika Rahmi, S.Psi.', 'Analis Pengembangan Kompetensi Ahli Pertama', 'dini@pu.go.id'],
      ['Permana Putra, S.T.', 'Penata Layanan Operasional', 'permana@pu.go.id'],
      ['Syahri Ramadani, S.Sos', 'Penata Layanan Operasional', 'syahri@pu.go.id'],
      ['Supono, S.Sos', 'Penata Layanan Operasional', 'supono@pu.go.id'],
      ['Agus Setiawan, S.Sos', 'Penata Layanan Operasional', 'agus@pu.go.id'],
      ['Ahmad Kholidi Nasution, S.ST., M.T.', 'Pengembang Teknologi Pembelajaran Ahli Madya', 'kholidi@pu.go.id'],
      ['Hajamuddin, S.Sos', 'Pranata Keuangan APBN Mahir', 'hajamuddin@pu.go.id'],
      ['Praptiwi Hidayati, A.Md.', 'Pranata Keuangan APBN Mahir', 'praptiwi@pu.go.id'],
      ['Alwan Setiawan, S.Sos', 'Analis SDM Aparatur Pertama', 'alwan@pu.go.id'],
      ['Ika Rafiana Siregar, S.T.', 'Pengelola Pengadaan Barang/Jasa Ahli Pertama', 'ika@pu.go.id'],
      ['Suhandri, S.H.', 'Arsiparis Ahli Pertama', 'suhandri@pu.go.id'],
      ['Ifroh Dalimunthe, S.E.', 'Penata Layanan Operasional', 'ifroh@pu.go.id'],
      ['Riyanda Arnaz, S.Kom.', 'Penata Layanan Operasional', 'riyanda@pu.go.id'],
      ['Antoni Pilli', 'Operator Layanan Operasional', 'antoni@pu.go.id'],
      ['Jhon Roy Saragi', 'Pengadministrasi Perkantoran', 'jhonroy@pu.go.id'],
      ['Andi Kuncoro, S.Sos., M.M.', 'Penata Layanan Operasional', 'andi@pu.go.id'],
      ['Sumawan', 'Pengadministrasi Perkantoran', 'sumawan@pu.go.id'],
      ['Mutiara Hasugian, A.Md.', 'Pranata Keuangan APBN Terampil', 'mutiara@pu.go.id'],
      ['Yusri Lubis, S.E.', 'Penata Layanan Operasional', 'yusri@pu.go.id'],
      ['Mahlafina Chairunnisa Siregar, A.Md.', 'Pranata Komputer Terampil', 'mahlafina@pu.go.id'],
      ['Mutia Elisabeth Ginting, S.H.', 'Penata Layanan Operasional', 'mutia@pu.go.id'],
      ['Azhari Lubis, S.I.Kom.', 'Pranata Humas Ahli Pertama', 'azhari@pu.go.id'],
      ['Marwedi, S.Kom.', 'Penata Layanan Operasional', 'marwedi@pu.go.id'],
      ['Joko Praseno, S.E.', 'Penata Layanan Operasional', 'joko@pu.go.id'],
      ['Dewi K. S. Palupi, S.Kep., Ns.', 'Pengadministrasi Perkantoran', 'dewipalupi@pu.go.id'],
      ['Siswandi', 'Operator Layanan Operasional', 'siswandi@pu.go.id'],
    ];
    for (const [name, jabatan, email] of staffLain) {
      await createUser(client, { name, nip: null, email, role: 'anggota', jabatan });
    }

    const teamKpa = await createTeam(client, {
      nama_tim: 'Tim Program, Keuangan dan Anggaran',
      kode_tim: 'KPA',
      katim_id: katimKpa.id,
    });
    await syncMembers(client, teamKpa.id, [anggota[0].id, anggota[1].id]);

    const teamKoi = await createTeam(client, {
      nama_tim: 'Tim Kepegawaian, Organisasi dan Informasi',
      kode_tim: 'KOI',
      katim_id: katimKoi.id,
    });
    await syncMembers(client, teamKoi.id, [anggota[2].id, anggota[3].id]);

    const teamUpb = await createTeam(client, {
      nama_tim: 'Tim Umum, Pengadaan dan BMN',
      kode_tim: 'UPB',
      katim_id: katimUpb.id,
    });
    await syncMembers(client, teamUpb.id, [anggota[4].id, anggota[5].id]);

    // Hanya periode Tahun 2026, langsung berstatus aktif.
    const { rows: periodeRows } = await client.query(
      `INSERT INTO periodes (tahun, status, dibuat_oleh) VALUES (2026,'aktif',$1) RETURNING *`,
      [kasubag.id]
    );
    const periode = periodeRows[0];

    // Uraian tugas persis mengikuti kolom "Uraian Tugas" pada SK.
    const uraianTugas = {
      [teamKpa.id]: {
        anggota: [anggota[0].id, anggota[1].id],
        katim: katimKpa.id,
        daftar: [
          'Perencanaan dan Penyusunan Program/Anggaran',
          'Pengelolaan dan Pengendalian Keuangan',
          'Penyusunan Laporan Keuangan dan Akuntabilitas',
          'Pemantauan, Evaluasi, dan Pelaporan Kinerja (Monev)',
        ],
      },
      [teamKoi.id]: {
        anggota: [anggota[2].id, anggota[3].id],
        katim: katimKoi.id,
        daftar: [
          'Pelaksanaan Layanan Kepegawaian',
          'Pelaksanaan Tata Kelola Informasi',
          'Pelayanan dan Penyebarluasan Informasi Publik',
          'Pemantauan Terpenuhinya Pengembangan Kompetensi Pegawai',
          'Mengoordinasikan Penyiapan Bahan, Pelaksanaan, dan Pemantauan Program Reformasi Birokrasi melalui Pembangunan Zona Integritas (ZI), Penerapan Sistem Manajemen Mutu (SMM), serta Penguatan Sistem Manajemen Anti Penyuapan (SMAP)',
        ],
      },
      [teamUpb.id]: {
        anggota: [anggota[4].id, anggota[5].id],
        katim: katimUpb.id,
        daftar: [
          'Pelaksanaan Urusan Umum, Persuratan dan Rumah Tangga',
          'Pengelolaan dan Penatausahaan Barang Milik Negara',
          'Pelaksanaan Pengadaan Barang dan Jasa',
        ],
      },
    };

    // Setiap tugas (1 item uraian tugas) dibuatkan TEPAT 1 subtugas, dengan progres acak
    // (tidak pernah 100%), anggota di-assign bergantian.
    for (const [teamId, cfg] of Object.entries(uraianTugas)) {
      let idx = 0;
      for (const judul of cfg.daftar) {
        const tugas = await createTugas(client, {
          judul,
          deskripsi: `Uraian tugas sesuai SK Kepala Balai No. 20/KPTS/Bpkpu1/2026, Tahun Anggaran ${periode.tahun}.`,
          periode_id: periode.id,
          created_by: kasubag.id,
          team_id: Number(teamId),
        });

        const assignedTo = cfg.anggota[idx % cfg.anggota.length];
        idx += 1;

        await createSubtugasUntukTugas(client, { tugas, assignedTo, createdBy: cfg.katim });
        await recalculateProgress(client, tugas.id);
      }
    }

    await client.query('COMMIT');
    console.log('Seeding selesai. Semua akun demo memakai password: "password"');
    console.log('Login: kabalai@pu.go.id / nurbaiti@pu.go.id / kasubag@pu.go.id / katim.kpa@pu.go.id / rudi@pu.go.id / dst.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seeding gagal:', err);
  process.exit(1);
});