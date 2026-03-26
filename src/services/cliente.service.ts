import { apiClient } from './api'
import type { Cliente, CadastroClienteInput } from '@/types/cliente'

export async function listarClientes(): Promise<Cliente[]> {
  const res = await apiClient.get<Cliente[]>('/api/clientes')
  return res.data
}

export async function buscarCliente(id: string): Promise<Cliente> {
  const res = await apiClient.get<Cliente>(`/api/clientes/${id}`)
  return res.data
}

export async function cadastrarCliente(input: CadastroClienteInput): Promise<Cliente> {
  const res = await apiClient.post<Cliente>('/api/clientes', input)
  return res.data
}

export async function atualizarCliente(
  id: string,
  input: Partial<CadastroClienteInput>
): Promise<Cliente> {
  const res = await apiClient.put<Cliente>(`/api/clientes/${id}`, input)
  return res.data
}

export async function removerCliente(id: string): Promise<void> {
  await apiClient.delete(`/api/clientes/${id}`)
}
