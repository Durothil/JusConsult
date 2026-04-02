-- Migration 019: adiciona código sequencial à tabela clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS codigo SERIAL;

GRANT SELECT, INSERT, UPDATE, DELETE ON clientes TO anon, authenticated, service_role;
