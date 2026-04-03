-- 021_clientes_email_unique_full.sql
-- Substitui indice parcial por indice unico completo
-- Motivo: PostgREST ON CONFLICT nao suporta indices parciais (WHERE clause)
-- PostgreSQL permite multiplos NULLs em indice unico, entao clientes sem email continuam OK

DROP INDEX IF EXISTS clientes_email_unique_idx;

CREATE UNIQUE INDEX clientes_email_unique_full_idx ON clientes (email);
