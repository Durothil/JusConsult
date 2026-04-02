-- 016_rls_fix_client_message_tables.sql
-- Adicionar RLS a client_message_approvals e client_message_events
-- Corrige vulnerabilidades críticas de segurança

-- ============================================================
-- 1. TABELA: client_message_approvals
-- ============================================================

ALTER TABLE client_message_approvals ENABLE ROW LEVEL SECURITY;

-- Adicionar user_id se não existir
ALTER TABLE client_message_approvals
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- Preencher user_id a partir de cliente.user_id via FK
UPDATE client_message_approvals ca
SET user_id = c.user_id
FROM clientes c
WHERE ca.cliente_id = c.id AND ca.user_id IS NULL;

-- Fazer NOT NULL
ALTER TABLE client_message_approvals
  ALTER COLUMN user_id SET NOT NULL;

-- Revogar acesso de anon
REVOKE ALL ON client_message_approvals FROM anon;

-- Políticas
DROP POLICY IF EXISTS "client_message_approvals_select_own" ON client_message_approvals;
DROP POLICY IF EXISTS "client_message_approvals_insert_own" ON client_message_approvals;
DROP POLICY IF EXISTS "client_message_approvals_update_own" ON client_message_approvals;
DROP POLICY IF EXISTS "client_message_approvals_delete_own" ON client_message_approvals;

CREATE POLICY "client_message_approvals_select_own" ON client_message_approvals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "client_message_approvals_insert_own" ON client_message_approvals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "client_message_approvals_update_own" ON client_message_approvals
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "client_message_approvals_delete_own" ON client_message_approvals
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 2. TABELA: client_message_events
-- ============================================================

ALTER TABLE client_message_events ENABLE ROW LEVEL SECURITY;

-- Adicionar user_id se não existir
ALTER TABLE client_message_events
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- Preencher user_id a partir de approval.user_id via FK
UPDATE client_message_events cme
SET user_id = ca.user_id
FROM client_message_approvals ca
WHERE cme.approval_id = ca.id AND cme.user_id IS NULL;

-- Fazer NOT NULL
ALTER TABLE client_message_events
  ALTER COLUMN user_id SET NOT NULL;

-- Revogar acesso de anon
REVOKE ALL ON client_message_events FROM anon;

-- Políticas
DROP POLICY IF EXISTS "client_message_events_select_own" ON client_message_events;
DROP POLICY IF EXISTS "client_message_events_insert_own" ON client_message_events;
DROP POLICY IF EXISTS "client_message_events_update_own" ON client_message_events;
DROP POLICY IF EXISTS "client_message_events_delete_own" ON client_message_events;

CREATE POLICY "client_message_events_select_own" ON client_message_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "client_message_events_insert_own" ON client_message_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "client_message_events_update_own" ON client_message_events
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "client_message_events_delete_own" ON client_message_events
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- PERMISSÕES FINAIS
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON client_message_approvals TO service_role, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_message_events TO service_role, authenticated;
