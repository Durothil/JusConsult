CREATE TABLE zapsign_contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  zapsign_doc_id TEXT NOT NULL UNIQUE,
  tipo_contrato TEXT NOT NULL,
  signatario_nome TEXT NOT NULL,
  signatario_email TEXT,
  signatario_telefone TEXT,
  signatario_cpf_cnpj TEXT,
  url_contrato_assinado TEXT,
  data_assinatura TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_assinatura INET,
  status_zapsign TEXT DEFAULT 'SIGNED',
  payload_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT zapsign_telefone_valido CHECK (signatario_telefone ~ '^\+?[\d\s\-()]+$' OR signatario_telefone IS NULL)
);

CREATE INDEX idx_zapsign_cliente ON zapsign_contratos(cliente_id);
CREATE INDEX idx_zapsign_email ON zapsign_contratos(signatario_email);
CREATE INDEX idx_zapsign_data ON zapsign_contratos(data_assinatura DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON zapsign_contratos TO anon, authenticated, service_role;
