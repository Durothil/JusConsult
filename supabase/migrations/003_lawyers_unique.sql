-- Migration 003: adiciona constraint única em process_lawyers para evitar duplicatas no upsert
-- Sem esta constraint, o upsert em supabase.ts insere duplicatas a cada recarga de processo.

ALTER TABLE process_lawyers
  ADD CONSTRAINT unique_lawyer_party_nome UNIQUE (party_id, nome);

GRANT SELECT, INSERT, UPDATE, DELETE ON process_lawyers TO anon, authenticated, service_role;
