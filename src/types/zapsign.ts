export interface ZapsignContrato {
  id: string
  cliente_id: string
  zapsign_doc_id: string
  tipo_contrato: string
  signatario_nome: string
  signatario_email?: string
  signatario_telefone?: string
  signatario_cpf_cnpj?: string
  url_contrato_assinado?: string
  data_assinatura: string
  ip_assinatura?: string
  status_zapsign: string
  payload_json?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ZapsignWebhookPayload {
  doc_id: string
  signatario_nome: string
  signatario_email?: string
  signatario_telefone?: string
  signatario_cpf?: string
  tipo_contrato: string
  url_assinado?: string
  data_assinatura: string
}
