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

-- Tabel Catatan & Rincian Transaksi Belanja
CREATE TABLE IF NOT EXISTS public.rab_transactions (
    id TEXT PRIMARY KEY,                              -- ID Unik Transaksi
    date TEXT NOT NULL,                               -- Tanggal Belanja (YYYY-MM-DD)
    category_id TEXT NOT NULL,                        -- ID Kategori (cat_sayur, cat_protein, cat_bumbu)
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
CREATE INDEX IF NOT EXISTS idx_rab_tx_date ON public.rab_transactions (date);
CREATE INDEX IF NOT EXISTS idx_rab_tx_category ON public.rab_transactions (category_id);
CREATE INDEX IF NOT EXISTS idx_rab_tx_created_at ON public.rab_transactions (created_at DESC);

-- --------------------------------------------------------------------
-- 3. KONFIGURASI ROW LEVEL SECURITY (RLS) - STANDAR KEAMANAN SUPABASE
-- --------------------------------------------------------------------
ALTER TABLE public.rab_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rab_transactions ENABLE ROW LEVEL SECURITY;

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
-- 5. VERIFIKASI DATA (QUERY STATUS HASIL EKSEKUSI)
-- --------------------------------------------------------------------
SELECT 
    'public.rab_budgets' AS nama_tabel, 
    count(*) AS jumlah_data 
FROM public.rab_budgets
UNION ALL
SELECT 
    'public.rab_transactions' AS nama_tabel, 
    count(*) AS jumlah_data 
FROM public.rab_transactions;
