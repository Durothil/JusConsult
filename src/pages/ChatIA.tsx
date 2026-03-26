import React, { useState, useEffect, useRef, useCallback } from 'react'
import Card, { CardContent, CardHeader } from '@/components/common/Card'
import Button from '@/components/common/Button'
import { Spinner } from '@/components/common/Loading'
import { listarProcessos } from '@/services/escritorio.service'
import { enviarMensagem, verificarStatusIA } from '@/services/ia.service'
import type { MensagemChat } from '@/services/ia.service'
import type { EscritorioProcesso } from '@/types/escritorio'

const SUGESTOES = [
  'Qual é o status atual do processo?',
  'Quais foram as últimas movimentações?',
  'Há alguma decisão pendente?',
  'Quando foi a última audiência?',
]

const PROVEDOR_LABEL: Record<string, string> = {
  anthropic: '🟣 Claude (Anthropic)',
  openai: '🟢 GPT (OpenAI)',
  gemini: '🔵 Gemini (Google)',
}

const ChatIA: React.FC = () => {
  const [cnj, setCnj] = useState<string>('')
  const [processos, setProcessos] = useState<EscritorioProcesso[]>([])
  const [historico, setHistorico] = useState<MensagemChat[]>([])
  const [pergunta, setPergunta] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [statusIA, setStatusIA] = useState<{ configurado: boolean; provedor: string | null } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load processos and check IA status on mount
  useEffect(() => {
    listarProcessos()
      .then(setProcessos)
      .catch(() => setProcessos([]))

    verificarStatusIA()
      .then(setStatusIA)
      .catch(() => setStatusIA({ configurado: false, provedor: null }))
  }, [])

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [historico])

  const handleEnviar = useCallback(async () => {
    const texto = pergunta.trim()
    if (!texto || carregando) return
    setErro(null)
    const novaMensagem: MensagemChat = { role: 'user', content: texto }
    const novoHistorico = [...historico, novaMensagem]
    setHistorico(novoHistorico)
    setPergunta('')
    setCarregando(true)
    try {
      const res = await enviarMensagem(texto, cnj || undefined, historico)
      setHistorico(prev => [...prev, { role: 'assistant', content: res.resposta }])
    } catch {
      setErro('Erro ao conectar com a IA. Verifique se o backend está rodando e a chave de API está configurada.')
      setHistorico(historico) // revert
    } finally {
      setCarregando(false)
    }
  }, [pergunta, carregando, historico, cnj])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  const handleProcessoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCnj(e.target.value)
    setHistorico([])
    setErro(null)
  }

  const provedorLabel = statusIA?.provedor
    ? (PROVEDOR_LABEL[statusIA.provedor] ?? statusIA.provedor)
    : null

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto px-4 py-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assistente IA Jurídico</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tire dúvidas sobre processos com inteligência artificial</p>
        </div>
        {statusIA && (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
              statusIA.configurado
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {statusIA.configurado && provedorLabel ? provedorLabel : '⚪ IA não configurada'}
          </span>
        )}
      </div>

      {/* Warning banner */}
      {statusIA && !statusIA.configurado && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-800 text-sm">
          <span className="mt-0.5 shrink-0">⚠️</span>
          <span>
            Nenhum provedor de IA está configurado. Configure uma chave de API (Anthropic, OpenAI ou Gemini)
            nas variáveis de ambiente do backend para usar o assistente.
          </span>
        </div>
      )}

      {/* Process selector */}
      <div>
        <label htmlFor="processo-select" className="block text-sm font-medium text-gray-700 mb-1">
          Processo de contexto
        </label>
        <select
          id="processo-select"
          value={cnj}
          onChange={handleProcessoChange}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Sem processo selecionado</option>
          {processos.map(p => (
            <option key={p.cnj} value={p.cnj}>
              {p.cnj} — {p.clienteNome}
            </option>
          ))}
        </select>
      </div>

      {/* Chat card (flex-grow) */}
      <Card className="flex flex-col flex-1 min-h-0">
        <CardHeader>
          <span className="text-sm font-medium text-gray-700">
            {cnj ? `Conversa sobre ${cnj}` : 'Conversa geral'}
          </span>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 min-h-0 p-0">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {historico.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
                <p className="text-gray-400 text-sm">Faça uma pergunta ou escolha uma sugestão abaixo</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGESTOES.map(s => (
                    <button
                      key={s}
                      onClick={() => setPergunta(s)}
                      className="px-3 py-2 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-sm hover:bg-blue-100 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              historico.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-xs text-gray-400 px-1">
                    {msg.role === 'user' ? 'Você' : 'Assistente IA'}
                  </span>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {carregando && (
              <div className="flex flex-col items-start gap-1">
                <span className="text-xs text-gray-400 px-1">Assistente IA</span>
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                  <Spinner size="sm" />
                  <span className="text-sm text-gray-500">Processando...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area (sticky bottom) */}
          <div className="border-t border-gray-200 px-4 py-3 bg-white rounded-b-lg">
            {erro && (
              <p className="text-sm text-red-600 mb-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {erro}
              </p>
            )}
            <div className="flex gap-2 items-end">
              <textarea
                rows={2}
                value={pergunta}
                onChange={e => setPergunta(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={carregando}
                placeholder="Digite sua pergunta... (Enter para enviar, Shift+Enter para nova linha)"
                className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
              <Button
                onClick={handleEnviar}
                disabled={carregando || !pergunta.trim()}
                className="shrink-0 h-[4.5rem] px-4"
              >
                {carregando ? <Spinner size="sm" /> : 'Enviar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ChatIA
