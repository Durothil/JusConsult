import { apiClient } from './api'

export interface MensagemChat {
  role: 'user' | 'assistant'
  content: string
}

export interface RespostaChat {
  resposta: string
  provedor?: string
}

export interface StatusIA {
  configurado: boolean
  provedor: string | null
}

export async function enviarMensagem(
  pergunta: string,
  cnj?: string,
  historico: MensagemChat[] = []
): Promise<RespostaChat> {
  const res = await apiClient.post<RespostaChat>('/api/ia/chat', {
    pergunta,
    cnj: cnj || undefined,
    historico,
  })
  return res.data
}

export async function verificarStatusIA(): Promise<StatusIA> {
  const res = await apiClient.get<StatusIA>('/api/ia/status')
  return res.data
}
