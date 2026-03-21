-- Migration: 003_rls_restrict_writes.sql
-- Remove permissões de escrita para anon. Apenas service_role (backend) pode escrever.
-- service_role bypassa RLS por padrão no Supabase — esta migration apenas remove as políticas abertas.

-- ── processes ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_insert_all" ON processes;
DROP POLICY IF EXISTS "allow_update_all" ON processes;

-- ── process_parties ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_insert_all" ON process_parties;
DROP POLICY IF EXISTS "allow_update_all" ON process_parties;

-- ── process_lawyers ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_insert_all" ON process_lawyers;
DROP POLICY IF EXISTS "allow_update_all" ON process_lawyers;

-- ── process_movements ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_insert_all" ON process_movements;
DROP POLICY IF EXISTS "allow_update_all" ON process_movements;

-- ── process_documents ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_insert_all" ON process_documents;
DROP POLICY IF EXISTS "allow_update_all" ON process_documents;

-- ── precedents_cache ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_insert_all" ON precedents_cache;
DROP POLICY IF EXISTS "allow_update_precedents" ON precedents_cache;

-- ── cache_metadata ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_insert_all" ON cache_metadata;
DROP POLICY IF EXISTS "allow_update_cache" ON cache_metadata;

-- ── audit_logs ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_insert_all" ON audit_logs;

-- ── escritorio_processos ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_insert_escritorio" ON escritorio_processos;
DROP POLICY IF EXISTS "allow_update_escritorio" ON escritorio_processos;
DROP POLICY IF EXISTS "allow_delete_escritorio" ON escritorio_processos;

-- ── escritorio_alertas ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "allow_insert_alertas" ON escritorio_alertas;
DROP POLICY IF EXISTS "allow_update_alertas" ON escritorio_alertas;

-- Leitura continua aberta para anon (frontend busca dados para exibir)
-- service_role bypassa RLS e pode escrever em todas as tabelas sem políticas explícitas
