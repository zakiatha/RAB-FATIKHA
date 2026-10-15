-- ====================================================================
-- SKRIP SUPABASE SQL EDITOR: TABEL KATEGORI BELANJA DINAMIS (CUSTOM)
-- ====================================================================
-- Petunjuk:
-- 1. Buka Supabase Dashboard > SQL Editor
-- 2. Klik "New Query"
-- 3. Tempel seluruh isi skrip ini lalu klik "Run"
-- ====================================================================

-- 1. Buat Tabel public.rab_categories
CREATE TABLE IF NOT EXISTS public.rab_categories (
    id TEXT PRIMARY KEY,                              -- ID unik (contoh: 'cat_sayur', 'cat_protein', 'cat_...')
    name TEXT NOT NULL,                               -- Nama kategori
    color TEXT NOT NULL DEFAULT '#10b981',            -- Kode warna hex (#10b981, dll)
    icon TEXT NOT NULL DEFAULT '🏷️',                  -- Ikon emoji ('🥦', '🥩', '🧄', dll)
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Indexing untuk Performa
CREATE INDEX IF NOT EXISTS idx_rab_categories_created_at ON public.rab_categories (created_at ASC);

-- 3. Konfigurasi Row Level Security (RLS)
ALTER TABLE public.rab_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon Select Categories" ON public.rab_categories;
CREATE POLICY "Anon Select Categories" ON public.rab_categories
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Anon Insert Categories" ON public.rab_categories;
CREATE POLICY "Anon Insert Categories" ON public.rab_categories
    FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anon Update Categories" ON public.rab_categories;
CREATE POLICY "Anon Update Categories" ON public.rab_categories
    FOR UPDATE TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anon Delete Categories" ON public.rab_categories;
CREATE POLICY "Anon Delete Categories" ON public.rab_categories
    FOR DELETE TO public USING (true);

-- 4. Masukkan Data Awal (3 Kategori Utama Standar)
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

-- 5. Dokumentasi Kolom (PostgreSQL Comments)
COMMENT ON TABLE public.rab_categories IS 'Tabel Kategori Belanja Dinamis yang dapat ditambah, diedit, dan dihapus';
COMMENT ON COLUMN public.rab_categories.id IS 'ID Kategori unik';
COMMENT ON COLUMN public.rab_categories.name IS 'Nama Kategori Belanja';
COMMENT ON COLUMN public.rab_categories.color IS 'Kode Warna Hex Kategori';
COMMENT ON COLUMN public.rab_categories.icon IS 'Ikon Emoji Kategori';

-- 6. Verifikasi Tabel
SELECT * FROM public.rab_categories ORDER BY created_at ASC;
