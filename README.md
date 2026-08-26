# Aplikasi Naskah Dinas (Memorandum, Nota Dinas, Surat Tugas, Surat Dinas)

Aplikasi web untuk membuat naskah dinas dari template Word (.docx) yang sudah berisi
placeholder `{seperti_ini}`, dengan folder hasil & rekap terpisah dan terkunci per
Tim Kerja. Dibangun dengan Next.js (App Router) — siap di-deploy ke **Vercel** dan
dihubungkan ke **GitHub**.

## Fitur Pratinjau & Edit (Baru)

Alur pembuatan naskah sekarang 2 langkah:

1. **Isi Form** → klik "Lanjut ke Pratinjau". Sistem mengisi template `.docx`
   asli dengan data form lalu menampilkannya sebagai **pratinjau HTML yang
   bisa langsung diedit** (klik di teks manapun pada lembar pratinjau untuk
   memperbaikinya).
2. Dari layar pratinjau tersedia 3 aksi:
   - **Unduh DOCX** — mengunduh hasil pratinjau (termasuk editan Anda)
     sebagai file `.docx`, tanpa menyimpan ke Drive.
   - **Unduh PDF** — mengunduh hasil pratinjau sebagai `.pdf` (diproses di
     browser, tanpa perlu server tambahan).
   - **Simpan ke Drive & Catat Rekap** — mengunggah hasil akhir ke folder
     Drive tim dan mencatat baris baru di rekap, seperti alur sebelumnya.

**Catatan penting soal kop surat/letterhead:** pratinjau dibuat dengan
membaca isi **body/isi dokumen** dari template `.docx` (termasuk gambar
yang ditempel langsung di body). Jika kop surat/logo instansi di template
Anda diletakkan di **Header/Footer bawaan Word** (menu *Insert > Header*),
bagian tersebut **tidak ikut tampil** di pratinjau maupun di hasil
unduhan/simpanan akhir. Supaya kop surat ikut terbawa dan bisa diedit,
letakkan kop surat sebagai tabel/paragraf biasa di **awal body** dokumen,
bukan di Header/Footer.

## Cara Kerja Singkat

1. Setiap **Tim Kerja** punya akun login sendiri (username & password). Tim A tidak
   bisa login sebagai Tim B, sehingga otomatis tidak bisa melihat/membuat naskah
   milik tim lain.
2. Setelah login, tim memilih jenis naskah: **Memorandum**, **Nota Dinas**,
   **Surat Tugas**, atau **Surat Dinas**.
3. Form pengisian **dibuat otomatis** berdasarkan placeholder `{...}` yang terdeteksi
   di dalam file template `.docx` masing-masing jenis naskah — jadi kalau kamu ubah
   template dan menambah/mengurangi placeholder, form ikut menyesuaikan otomatis,
   tanpa perlu ubah kode.
4. Khusus **Surat Tugas**, form mewajibkan unggahan file **Surat Perintah** yang
   menjadi dasarnya. Tanpa file ini, sistem menolak membuat Surat Tugas.
5. Naskah yang sudah jadi otomatis diunggah ke **folder Google Drive milik tim
   tersebut** (folder yang sudah kamu siapkan), dan datanya dicatat sebagai baris
   baru di **spreadsheet rekap milik tim tersebut**.
6. Dasar Surat Perintah untuk Surat Tugas disimpan di subfolder
   `Dasar Surat Perintah - Surat Tugas` di dalam folder tim yang sama, sebagai bukti.

Karena penyimpanan naskah & rekap memakai folder/spreadsheet Google Drive yang
**sudah kamu buat dan susun per nama tim**, kamu tidak perlu database tambahan.
Isolasi antar-tim dijamin di level server: server hanya pernah menyentuh
`driveFolderId` dan `spreadsheetId` milik tim yang sedang login (diambil dari sesi
login, bukan dari input dari browser), jadi tidak mungkin tim membaca/menulis ke
folder tim lain lewat aplikasi ini.

## Struktur Proyek

```
app/
  login/                    # Halaman login tim
  dashboard/                # Pilihan jenis naskah setelah login
  dashboard/[docType]/      # Form dinamis sesuai placeholder template
  documents/                # Rekap naskah milik tim yang login
  api/generate/             # Proses isi template -> upload Drive -> catat Sheets
  api/templates/[docType]/fields/  # Ekstrak daftar placeholder dari template
  api/documents/            # Baca rekap milik tim yang login
lib/
  teams.ts                  # Loader konfigurasi tim
  documentTypes.ts          # Loader konfigurasi 4 jenis naskah
  docxTemplate.ts           # Ekstrak placeholder & isi template docx
  googleDrive.ts            # Upload/list file ke Google Drive
  googleSheets.ts           # Tulis/baca baris rekap ke Google Sheets
  auth.ts                   # Konfigurasi NextAuth (login per tim)
config/
  teams.example.json        # Contoh konfigurasi tim (salin jadi teams.json)
  documentTypes.json        # Definisi 4 jenis naskah & nama file template
templates/                  # Taruh 4 file .docx template di sini
```

## Langkah Setup

### 1. Siapkan file template

Unduh 4 template `.docx` yang sudah kamu buat (dengan placeholder `{...}`) dari
Google Drive, lalu simpan di folder `templates/` pada proyek ini dengan nama
persis seperti berikut (bisa diganti asal disesuaikan juga di
`config/documentTypes.json`):

```
templates/memorandum.docx
templates/nota-dinas.docx
templates/surat-tugas.docx
templates/surat-dinas.docx
```

**Penting soal placeholder:** saat mengetik `{nama_pegawai}` dsb di Word, ketik
dalam satu gaya format yang sama (jangan ganti bold/italic/font di tengah-tengah
mengetik tanda kurung kurawal), supaya Word tidak memecah teks tersebut jadi
beberapa bagian internal — kalau terpecah, sistem tidak akan mengenalinya sebagai
placeholder.

### 2. Setup Google Cloud (untuk akses Drive & Sheets)

1. Buka [Google Cloud Console](https://console.cloud.google.com/), buat project baru
   (atau pakai yang sudah ada).
2. Aktifkan **Google Drive API** dan **Google Sheets API** (menu "APIs & Services" →
   "Enable APIs and Services").
3. Buat **Service Account** ("APIs & Services" → "Credentials" → "Create
   Credentials" → "Service account"). Beri nama bebas, misalnya
   `naskah-dinas-service`.
4. Buka service account yang baru dibuat → tab "Keys" → "Add Key" → "Create new
   key" → pilih **JSON**. File JSON akan otomatis terunduh — **simpan baik-baik**,
   ini kredensial rahasia.
5. Catat alamat email service account tersebut (formatnya seperti
   `naskah-dinas-service@nama-project.iam.gserviceaccount.com`).

### 3. Bagikan folder & spreadsheet ke Service Account

Untuk **setiap** folder Google Drive tim dan **setiap** spreadsheet rekap tim yang
sudah kamu buat:

1. Buka folder/spreadsheet tersebut di Google Drive.
2. Klik "Share" / "Bagikan".
3. Tempel alamat email service account (langkah 2.5 di atas), beri akses
   **Editor**.

Tanpa langkah ini, aplikasi akan gagal mengunggah file atau menulis rekap dengan
pesan error izin (permission denied).

### 4. Ambil ID folder dan ID spreadsheet tiap tim

- ID folder: lihat di URL folder Drive, contoh
  `https://drive.google.com/drive/folders/INI_ID_FOLDERNYA`
- ID spreadsheet: lihat di URL spreadsheet, contoh
  `https://docs.google.com/spreadsheets/d/INI_ID_SPREADSHEETNYA/edit`

Di setiap spreadsheet rekap tim, buat baris header (baris pertama) dengan kolom:

```
Tanggal | Jenis Naskah | Nomor | Perihal | Dibuat Oleh | Link Naskah | Link Dasar Surat Perintah
```

Nama sheet/tab defaultnya `Rekap` — sesuaikan `sheetName` di konfigurasi tim kalau
nama tab kamu berbeda.

### 5. Konfigurasi tim & password

1. Salin `config/teams.example.json` menjadi `config/teams.json`.
2. Untuk setiap tim, isi `id`, `name`, `username`, `driveFolderId`, `spreadsheetId`,
   `sheetName`.
3. Buat hash password dengan perintah:
   ```bash
   npm install
   npm run hash-password -- password_rahasia_tim_sdm
   ```
   Salin hasil hash ke field `passwordHash` tim tersebut.
4. **Jangan commit `config/teams.json` ke GitHub** (sudah otomatis di-ignore lewat
   `.gitignore`) karena berisi hash password dan ID folder internal.

### 6. Environment variables

Salin `.env.example` menjadi `.env.local` untuk pengembangan lokal:

```bash
cp .env.example .env.local
```

Isi:
- `NEXTAUTH_SECRET`: string acak panjang (bisa generate dengan `openssl rand -base64 32`)
- `NEXTAUTH_URL`: `http://localhost:3000` untuk lokal, atau URL domain Vercel kamu
  saat production
- `GOOGLE_SERVICE_ACCOUNT_KEY`: isi file JSON service account (langkah 2.4), di-encode
  base64 jadi satu baris:
  ```bash
  base64 -i service-account.json | tr -d '\n'
  ```
  Salin hasilnya sebagai nilai variabel ini.

### 7. Jalankan secara lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

### 8. Deploy ke Vercel via GitHub

1. Push folder proyek ini ke repository GitHub baru.
   (`config/teams.json` tidak ikut ter-push karena di-ignore — ini yang diharapkan.)
2. Di Vercel, "Add New Project" → import repository GitHub tersebut.
3. Di pengaturan Environment Variables Vercel, tambahkan:
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (isi dengan domain Vercel kamu, contoh `https://naskah-dinas.vercel.app`)
   - `GOOGLE_SERVICE_ACCOUNT_KEY`
   - `TEAMS_CONFIG_JSON` — karena Vercel tidak memakai `config/teams.json` yang
     di-ignore tadi, isi variabel ini dengan **seluruh isi file `teams.json` kamu**
     dalam satu baris JSON (buka file, copy semua isinya, tempel sebagai value).
4. Deploy.

Setelah deploy, jangan lupa langkah 3 (share folder/spreadsheet ke service account)
sudah dilakukan — kalau belum, generate naskah akan gagal dengan error izin.

## Menambah/Mengubah Tim Kerja

Cukup tambah entri baru di `config/teams.json` (lokal) atau update env var
`TEAMS_CONFIG_JSON` (Vercel) — tidak perlu ubah kode maupun redeploy struktur.

## Menambah Jenis Naskah Baru

1. Taruh file template `.docx` baru di `templates/`.
2. Tambah entri baru di `config/documentTypes.json` (id, label, nama file
   template, dan `requiresBasisUpload` jika jenis naskah tersebut juga butuh
   dokumen dasar wajib diunggah).

Form pengisian akan otomatis terbentuk dari placeholder yang ada di template
tersebut — tidak perlu coding tambahan.

## Catatan Keamanan

- Password tim disimpan sebagai hash bcrypt (bukan teks biasa).
- Sesi login memakai JWT (NextAuth) — server selalu memakai `teamId` dari sesi
  login untuk menentukan folder/spreadsheet yang diakses, bukan dari input yang
  dikirim browser, sehingga satu tim tidak bisa mengakali aplikasi untuk membaca
  atau menulis ke folder tim lain.
- File kredensial service account (`GOOGLE_SERVICE_ACCOUNT_KEY`) bersifat sangat
  rahasia — jangan pernah commit ke GitHub, cukup simpan di Environment
  Variables Vercel / `.env.local`.
