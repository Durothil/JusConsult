import { apiClient } from './api'
import type { ClientesFechadosData, ContratoFechado } from '../types/clientesFechados'

export async function getClientesFechados(ano: number): Promise<ClientesFechadosData> {
  const { data } = await apiClient.get(`/api/clientes-fechados?ano=${ano}`)
  return data
}

export async function atualizarContrato(
  id: string,
  campos: Partial<Pick<ContratoFechado, 'demanda' | 'fase' | 'valor_contrato' | 'pagamento_inicial' | 'boleto_emitido' | 'observacoes' | 'status_operacional'>>
): Promise<ContratoFechado> {
  const { data } = await apiClient.put(`/api/zapsign/contratos/${id}`, campos)
  return data
}

export async function emitirBoleto(id: string): Promise<{ boleto_url: string; boleto_id: string; vencimento: string }> {
  const { data } = await apiClient.post(`/api/zapsign/contratos/${id}/emitir-boleto`)
  return data
}

export async function getDemandas(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>('/api/demandas')
  return data
}

export async function salvarDemandas(demandas: string[]): Promise<string[]> {
  const { data } = await apiClient.put<string[]>('/api/demandas', { demandas })
  return data
}

export async function lancarContratoManual(payload: {
  cliente_id?: string
  novo_cliente_nome?: string
  novo_cliente_whatsapp?: string
  novo_cliente_email?: string
  novo_cliente_cpf_cnpj?: string
  demanda: string
  fase: string
  data_assinatura: string
  valor_contrato?: number
  observacoes?: string
  status_operacional?: string
}): Promise<ContratoFechado> {
  const { data } = await apiClient.post('/api/zapsign/contratos/manual', payload)
  return data
}
