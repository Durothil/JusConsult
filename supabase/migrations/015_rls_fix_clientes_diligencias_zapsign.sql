-- 015_rls_fix_clientes_diligencias_zapsign.sql
-- Adicionar RLS (Row Level Security) às tabelas sem proteção
-- Corrige vulnerabilidade crítica detectada pelo Supabase

-- ============================================================
-- 1. TABELA: clientes
-- ============================================================

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT gen_random_uuid();

UPDATE clientes SET user_id = gen_random_uuid() WHERE user_id IS NULL;

ALTER TABLE clientes
  ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS clientes_user_id_idx ON clientes(user_id);

REVOKE ALL ON clientes FROM anon;

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clientes_select_own" ON clientes;
DROP POLICY IF EXISTS "clientes_insert_own" ON clientes;
DROP POLICY IF EXISTS "clientes_update_own" ON clientes;
DROP POLICY IF EXISTS "clientes_delete_own" ON clientes;

CREATE POLICY "clientes_select_own" ON clientes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "clientes_insert_own" ON clientes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clientes_update_own" ON clientes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clientes_delete_own" ON clientes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 2. TABELA: diligencias
-- ============================================================

ALTER TABLE diligencias
  ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT gen_random_uuid();

UPDATE diligencias SET user_id = gen_random_uuid() WHERE user_id IS NULL;

ALTER TABLE diligencias
  ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS diligencias_user_id_idx ON diligencias(user_id);

REVOKE ALL ON diligencias FROM anon;

ALTER TABLE diligencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diligencias_select_own" ON diligencias;
DROP POLICY IF EXISTS "diligencias_insert_own" ON diligencias;
DROP POLICY IF EXISTS "diligencias_update_own" ON diligencias;
DROP POLICY IF EXISTS "diligencias_delete_own" ON diligencias;

CREATE POLICY "diligencias_select_own" ON diligencias
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "diligencias_insert_own" ON diligencias
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "diligencias_update_own" ON diligencias
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "diligencias_delete_own" ON diligencias
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 3. TABELA: zapsign_contratos (se existir)
-- ============================================================

ALTER TABLE IF EXISTS zapsign_contratos
  ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS zapsign_contratos_user_id_idx ON zapsign_contratos(user_id);

ALTER TABLE IF EXISTS zapsign_contratos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PERMISSÕES FINAIS
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON clientes TO service_role, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON diligencias TO service_role, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON zapsign_contratos TO service_role, authenticated;
