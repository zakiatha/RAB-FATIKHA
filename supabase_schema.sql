-- ====================================================================
-- SKRIP FULL SQL: SKEMA, KEAMANAN RLS, & DATA AWAL SISTEM RAB FATIKHA
-- ====================================================================
-- Petunjuk Penggunaan:
-- 1. Buka dashboard Supabase Anda: https://supabase.com/dashboard/project/xisddretdjwbrmwstgsk
-- 2. Pilih menu "SQL Editor" di bilah navigasi sebelah kiri.
-- 3. Klik "New query", tempel (paste) seluruh isi skrip ini, lalu klik tombol "Run".
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. PEMBUATAN TABEL UTAMA (TABLES DDL)
-- --------------------------------------------------------------------

-- Tabel Pagu Anggaran Bulanan
CREATE TABLE IF NOT EXISTS public.rab_budgets (
    month_key TEXT PRIMARY KEY,                       -- Format: 'YYYY-MM' (contoh: '2026-09')
    initial_amount NUMERIC NOT NULL DEFAULT 0,        -- Nominal Pagu Anggaran (Rp)
    period_name TEXT,                                 -- Nama Periode (contoh: 'September 2026')
    notes TEXT,                                       -- Catatan Peruntukan
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabel Daftar Kategori Belanja (Dinamis / Custom)
CREATE TABLE IF NOT EXISTS public.rab_categories (
    id TEXT PRIMARY KEY,                              -- ID Unik Kategori (cat_sayur, cat_protein, cat_bumbu, dll)
    name TEXT NOT NULL,                               -- Nama Kategori (contoh: Sayur & Mayur)
    color TEXT NOT NULL DEFAULT '#10b981',            -- Kode Warna Hex (#10b981)
    icon TEXT NOT NULL DEFAULT '🏷️',                  -- Ikon Emoji ('🥦', '🥩', '🧄', dll)
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabel Catatan & Rincian Transaksi Belanja
CREATE TABLE IF NOT EXISTS public.rab_transactions (
    id TEXT PRIMARY KEY,                              -- ID Unik Transaksi
    date TEXT NOT NULL,                               -- Tanggal Belanja (YYYY-MM-DD)
    category_id TEXT NOT NULL,                        -- ID Kategori (cat_sayur, cat_protein, cat_bumbu, dll)
    item_name TEXT NOT NULL,                          -- Nama Belanja / Rincian Barang
    qty NUMERIC DEFAULT 1,                            -- Jumlah / Kuantitas
    unit TEXT DEFAULT 'paket',                        -- Satuan (paket, ikat, kg, sak, dll)
    amount NUMERIC NOT NULL DEFAULT 0,                -- Nominal Biaya Belanja (Rp)
    note TEXT,                                        -- Keterangan / Catatan Tambahan
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- --------------------------------------------------------------------
-- 2. INDEXING UNTUK PERFORMA QUERY MAKSIMAL
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_rab_categories_created_at ON public.rab_categories (created_at ASC);
CREATE INDEX IF NOT EXISTS idx_rab_tx_date ON public.rab_transactions (date);
CREATE INDEX IF NOT EXISTS idx_rab_tx_category ON public.rab_transactions (category_id);
CREATE INDEX IF NOT EXISTS idx_rab_tx_created_at ON public.rab_transactions (created_at DESC);

-- --------------------------------------------------------------------
-- 3. KONFIGURASI ROW LEVEL SECURITY (RLS) - STANDAR KEAMANAN SUPABASE
-- --------------------------------------------------------------------
ALTER TABLE public.rab_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rab_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rab_transactions ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS untuk rab_categories (Akses Publik / Anon Key & Authenticated)
DROP POLICY IF EXISTS "Anon Select Categories" ON public.rab_categories;
CREATE POLICY "Anon Select Categories" ON public.rab_categories
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Anon Insert Categories" ON public.rab_categories;
CREATE POLICY "Anon Insert Categories" ON public.rab_categories
    FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anon Update Categories" ON public.rab_categories;
CREATE POLICY "Anon Update Categories" ON public.rab_categories
    FOR UPDATE TO public USING (true);

DROP POLICY IF EXISTS "Anon Delete Categories" ON public.rab_categories;
CREATE POLICY "Anon Delete Categories" ON public.rab_categories
    FOR DELETE TO public USING (true);

-- Kebijakan RLS untuk rab_budgets (Akses Publik / Anon Key & Authenticated)
DROP POLICY IF EXISTS "Anon Select Budgets" ON public.rab_budgets;
CREATE POLICY "Anon Select Budgets" ON public.rab_budgets
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Anon Insert Budgets" ON public.rab_budgets;
CREATE POLICY "Anon Insert Budgets" ON public.rab_budgets
    FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anon Update Budgets" ON public.rab_budgets;
CREATE POLICY "Anon Update Budgets" ON public.rab_budgets
    FOR UPDATE TO public USING (true);

DROP POLICY IF EXISTS "Anon Delete Budgets" ON public.rab_budgets;
CREATE POLICY "Anon Delete Budgets" ON public.rab_budgets
    FOR DELETE TO public USING (true);

-- Kebijakan RLS untuk rab_transactions (Akses Publik / Anon Key & Authenticated)
DROP POLICY IF EXISTS "Anon Select Transactions" ON public.rab_transactions;
CREATE POLICY "Anon Select Transactions" ON public.rab_transactions
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Anon Insert Transactions" ON public.rab_transactions;
CREATE POLICY "Anon Insert Transactions" ON public.rab_transactions
    FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anon Update Transactions" ON public.rab_transactions;
CREATE POLICY "Anon Update Transactions" ON public.rab_transactions
    FOR UPDATE TO public USING (true);

DROP POLICY IF EXISTS "Anon Delete Transactions" ON public.rab_transactions;
CREATE POLICY "Anon Delete Transactions" ON public.rab_transactions
    FOR DELETE TO public USING (true);

-- --------------------------------------------------------------------
-- 4. INSERT DATA AWAL (SEED SAMPLE DATA)
-- --------------------------------------------------------------------

-- Data Kategori Awal (3 Kategori Utama Standar)
INSERT INTO public.rab_categories (id, name, color, icon, created_at)
VALUES 
    ('cat_sayur', 'Sayur & Mayur', '#10b981', '🥦', NOW()),
    ('cat_protein', 'Protein (Daging, Ikan, Telur)', '#f97316', '🥩', NOW()),
    ('cat_bumbu', 'Bumbu & Minyak Dapur', '#8b5cf6', '🧄', NOW())
ON CONFLICT (id) 
DO UPDATE SET 
    name = EXCLUDED.name,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon;

-- Data Pagu Anggaran Awal Bulan Ini (September 2026: Rp 300.000 / 300k)
INSERT INTO public.rab_budgets (month_key, initial_amount, period_name, notes, updated_at)
VALUES 
    ('2026-09', 300000, 'September 2026', 'Anggaran belanja dapur bulanan keluarga', NOW())
ON CONFLICT (month_key) 
DO UPDATE SET 
    initial_amount = EXCLUDED.initial_amount,
    period_name = EXCLUDED.period_name,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- Data Catatan Belanja Harian Awal (Sesuai Contoh Catatan Saldo Berjalan)
INSERT INTO public.rab_transactions (id, date, category_id, item_name, qty, unit, amount, note, created_at)
VALUES
    (
        'tx_seed_1',
        '2026-09-01',
        'cat_bumbu',
        'ebi+empon 7,5k, paket lodeh 5k',
        1,
        'paket',
        12500,
        'Belanja bumbu & sayur lodeh pasar pagi',
        '2026-09-01 07:00:00+00'
    ),
    (
        'tx_seed_2',
        '2026-09-02',
        'cat_sayur',
        'kacang, lebu siam, tomat ijo, cabe merah besar, daun so',
        1,
        'paket',
        16500,
        'Bahan sayur segar harian',
        '2026-09-02 07:30:00+00'
    ),
    (
        'tx_seed_3',
        '2026-09-03',
        'cat_protein',
        'Dada ayam fillet 500gr & telur 1/2 kg',
        1,
        'paket',
        32000,
        'Lauk protein keluarga',
        '2026-09-03 08:15:00+00'
    ),
    (
        'tx_seed_4',
        '2026-09-04',
        'cat_bumbu',
        'Minyak kelapa 1L, bawang merah, bawang putih',
        1,
        'paket',
        28000,
        'Stok bumbu dasar dapur',
        '2026-09-04 09:00:00+00'
    )
ON CONFLICT (id) 
DO UPDATE SET 
    date = EXCLUDED.date,
    category_id = EXCLUDED.category_id,
    item_name = EXCLUDED.item_name,
    qty = EXCLUDED.qty,
    unit = EXCLUDED.unit,
    amount = EXCLUDED.amount,
    note = EXCLUDED.note;

-- --------------------------------------------------------------------
-- 5. KOMENTAR DOKUMENTASI DATABASE (POSTGRESQL COMMENTS AGAR LEBIH RAPI)
-- --------------------------------------------------------------------
COMMENT ON TABLE public.rab_budgets IS 'Tabel Pagu Anggaran Multi-Month Bulanan Keluarga Fatikha';
COMMENT ON COLUMN public.rab_budgets.month_key IS 'Format YYYY-MM (Kunci Primer Periode Bulan)';
COMMENT ON COLUMN public.rab_budgets.initial_amount IS 'Nominal Pagu Anggaran dalam Rupiah';
COMMENT ON COLUMN public.rab_budgets.period_name IS 'Label teks periode bulan (contoh: September 2026)';
COMMENT ON COLUMN public.rab_budgets.notes IS 'Keterangan peruntukan pagu anggaran atau penanda anggaran khusus di luar bulan berjalan';

COMMENT ON TABLE public.rab_categories IS 'Tabel Kategori Belanja Dinamis yang dapat ditambah, diedit, dan dihapus';
COMMENT ON COLUMN public.rab_categories.id IS 'ID unik kategori (contoh: cat_sayur, cat_protein, cat_bumbu, dll)';
COMMENT ON COLUMN public.rab_categories.name IS 'Nama Kategori Belanja';
COMMENT ON COLUMN public.rab_categories.color IS 'Kode Warna Hex Kategori (#10b981)';
COMMENT ON COLUMN public.rab_categories.icon IS 'Ikon Emoji Kategori (🥦, 🥩, 🧄)';

COMMENT ON TABLE public.rab_transactions IS 'Tabel Catatan Realisasi Belanja Harian Keluarga Fatikha';
COMMENT ON COLUMN public.rab_transactions.id IS 'ID unik transaksi belanja';
COMMENT ON COLUMN public.rab_transactions.date IS 'Tanggal transaksi (YYYY-MM-DD)';
COMMENT ON COLUMN public.rab_transactions.category_id IS 'ID Kategori belanja';
COMMENT ON COLUMN public.rab_transactions.item_name IS 'Rincian belanja barang/bahan pangan';
COMMENT ON COLUMN public.rab_transactions.amount IS 'Nominal biaya belanja (Rp)';
COMMENT ON COLUMN public.rab_transactions.note IS 'Keterangan belanja. Jika dicatat di luar bulan aktif, otomatis diberi awalan tag [Luar Bulan Aktif: ...] agar database rapi';

-- --------------------------------------------------------------------
-- 6. VIEW PEMBANTU: MONITORING TRANSAKSI DI LUAR BULAN AKTIF / PERIODE
-- --------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_rab_transactions_out_of_month AS
SELECT 
    t.id,
    t.date,
    substring(t.date from 1 for 7) AS transaction_month,
    t.category_id,
    t.item_name,
    t.amount,
    t.note,
    CASE 
        WHEN t.note LIKE '[Luar Bulan Aktif:%' THEN 'Ditandai Otomatis di Luar Bulan'
        ELSE 'Standar Periode'
    END AS status_periode
FROM public.rab_transactions t
ORDER BY t.date DESC;

COMMENT ON VIEW public.v_rab_transactions_out_of_month IS 'View pembantu untuk memantau transaksi belanja yang diberi catatan penanda di luar bulan pilihan';

-- --------------------------------------------------------------------
-- 7. VERIFIKASI DATA (QUERY STATUS HASIL EKSEKUSI)
-- --------------------------------------------------------------------
SELECT 
    'public.rab_categories' AS nama_tabel, 
    count(*) AS jumlah_data 
FROM public.rab_categories
UNION ALL
SELECT 
    'public.rab_budgets' AS nama_tabel, 
    count(*) AS jumlah_data 
FROM public.rab_budgets
UNION ALL
SELECT 
    'public.rab_transactions' AS nama_tabel, 
    count(*) AS jumlah_data 
FROM public.rab_transactions;
