import { apiClient } from './api'
import type { ZapsignContrato } from '../types/zapsign'

export async function listarContratosCliente(clienteId: string): Promise<ZapsignContrato[]> {
  const { data } = await apiClient.get<ZapsignContrato[]>(`/api/zapsign/contratos/${clienteId}`)
  return data
}
