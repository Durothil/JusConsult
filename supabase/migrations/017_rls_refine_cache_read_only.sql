-- 017_rls_refine_cache_read_only.sql
-- Refinar RLS de tabelas CACHE: manter SELECT aberto, restringir UPDATE/DELETE
-- Evita que authenticated users modifiquem dados de cache (apenas service_role/backend)

-- ============================================================
-- process_parties (Contém PII: CPF, email, telefone, endereço)
-- ============================================================

-- Remover política aberta de UPDATE
DROP POLICY IF EXISTS "allow_update_parties" ON process_parties;

-- Criar policy restritiva: apenas false (service_role bypassa automaticamente)
CREATE POLICY "process_parties_update_backend_only" ON process_parties
  FOR UPDATE USING (false);

-- ============================================================
-- process_lawyers (Contém PII: email, telefone)
-- ============================================================

DROP POLICY IF EXISTS "allow_update_lawyers" ON process_lawyers;

CREATE POLICY "process_lawyers_update_backend_only" ON process_lawyers
  FOR UPDATE USING (false);

-- ============================================================
-- process_documents (Contém PII potencial em texto_extraido)
-- ============================================================

DROP POLICY IF EXISTS "allow_update_documents" ON process_documents;

CREATE POLICY "process_documents_update_backend_only" ON process_documents
  FOR UPDATE USING (false);

-- ============================================================
-- NOTAS
-- ============================================================
-- process_movements: Dados públicos, deixar SELECT (true) aberto
-- processes: Dados públicos, deixar SELECT (true) aberto
-- SELECT policies com USING (true) são intencionais para dados públicos do Poder Judiciário
