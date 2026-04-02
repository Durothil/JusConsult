import React, { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Loader2, Plus, X } from 'lucide-react'
import { getClientesFechados, atualizarContrato, getDemandas, lancarContratoManual } from '../services/clientesFechados.service'
import { criarCobranca } from '../services/financeiro.service'
import { listarClientes } from '../services/cliente.service'
import type { ContratoFechado } from '../types/clientesFechados'
import { useToast } from '../hooks/useToast'

const DEMANDAS_FALLBACK = [
  'auxílio-doença',
  'auxílio-acidente',
  'aposentadoria por invalidez',
  'BPC/LOAS',
  'pensão por morte',
  'salário-maternidade',
  'outro',
]

const FASES = ['Inicial', 'Negado', 'Restabelecimento', 'Em análise']

const STATUS_OPERACIONAL = [
  'Realizado',
  'Desistência',
  'Finalizado',
  'Aguardando Documentos',
  'Sem contato',
  'Jurídico',
  'Aguardando envio de link',
  'Contrato ineficaz',
  'Organizando pasta',
]

const formatarMoeda = (valor: number | null | undefined): string => {
  if (valor == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

function formatarData(iso: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('pt-BR')
}

function formatarTelefone(tel: string): string {
  const digits = tel.replace(/\D/g, '')
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return tel
}

interface CriarBoletoModalProps {
  contratoId: string
  clienteId: string
  clienteNome: string
  valorInicial: number | null
  demanda: string
  ano: number
  onClose: () => void
  onSuccess: (contratoId: string) => void
}

function CriarBoletoModal({ contratoId, clienteId, clienteNome, valorInicial, demanda, onClose, onSuccess }: CriarBoletoModalProps) {
  const { showToast } = useToast()
  const [salvando, setSalvando] = useState(false)
  const vencimentoPadrao = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const [descricao, setDescricao] = useState(`Pagamento inicial — ${demanda}`)
  const [valor, setValor] = useState(valorInicial != null ? String(valorInicial) : '')
  const [billingType, setBillingType] = useState<'BOLETO' | 'PIX' | 'UNDEFINED'>('BOLETO')
  const [dueDate, setDueDate] = useState(vencimentoPadrao)

  const handleEmitir = async () => {
    const valorNum = parseFloat(valor)
    if (!valor || isNaN(valorNum) || valorNum <= 0) {
      showToast('Informe um valor válido.', 'error')
      return
    }
    if (!dueDate) {
      showToast('Informe a data de vencimento.', 'error')
      return
    }
    setSalvando(true)
    try {
      await criarCobranca({ clienteId, descricao, valor: valorNum, billingType, dueDate })
      await atualizarContrato(contratoId, { boleto_emitido: true })
      onSuccess(contratoId)
      showToast('Cobrança criada com sucesso no Asaas', 'success')
      onClose()
    } catch {
      showToast('Erro ao criar cobrança. Verifique se o Asaas está configurado.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-gray-800 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
          <h2 className="text-lg font-semibold text-gray-100">Criar Cobrança</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-300">Cliente</label>
            <input
              type="text"
              value={clienteNome}
              readOnly
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-gray-400 px-2 py-1 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-300">Descrição</label>
            <input
              type="text"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 px-2 py-1 focus:outline-none focus:border-blue-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-300">Valor (R$) <span className="text-red-400">*</span></label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder="0,00"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 px-2 py-1 focus:outline-none focus:border-blue-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-300">Tipo de cobrança</label>
            <select
              value={billingType}
              onChange={e => setBillingType(e.target.value as 'BOLETO' | 'PIX' | 'UNDEFINED')}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 px-2 py-1 focus:outline-none focus:border-blue-400"
            >
              <option value="BOLETO">Boleto</option>
              <option value="PIX">Pix</option>
              <option value="UNDEFINED">Indefinido</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-300">Vencimento <span className="text-red-400">*</span></label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 px-2 py-1 focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-700 shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleEmitir}
            disabled={salvando}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {salvando ? 'Emitindo...' : 'Emitir Cobrança'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface LancarManualmenteModalProps {
  ano: number
  onClose: () => void
}

function LancarManualmenteModal({ ano, onClose }: LancarManualmenteModalProps) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [salvando, setSalvando] = useState(false)
  const [modoCliente, setModoCliente] = useState<'existente' | 'novo'>('existente')
  const [form, setForm] = useState({
    cliente_id: '',
    novo_cliente_nome: '',
    novo_cliente_whatsapp: '',
    novo_cliente_email: '',
    novo_cliente_cpf_cnpj: '',
    demanda: DEMANDAS_FALLBACK[0],
    fase: FASES[0],
    data_assinatura: new Date().toISOString().slice(0, 10),
    valor_contrato: '',
    observacoes: '',
    status_operacional: '',
  })

  const { data: clientes, isLoading: loadingClientes } = useQuery({
    queryKey: ['clientes-lista'],
    queryFn: () => listarClientes(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: demandasQuery } = useQuery({
    queryKey: ['demandas'],
    queryFn: getDemandas,
    staleTime: 5 * 60 * 1000,
  })

  const demandas = demandasQuery ?? DEMANDAS_FALLBACK

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSalvar = async () => {
    if (modoCliente === 'existente' && !form.cliente_id) {
      showToast('Selecione um cliente.', 'error')
      return
    }
    if (modoCliente === 'novo' && !form.novo_cliente_nome.trim()) {
      showToast('Informe o nome do novo cliente.', 'error')
      return
    }
    setSalvando(true)
    try {
      const payload = modoCliente === 'existente'
        ? {
            cliente_id: form.cliente_id,
            demanda: form.demanda,
            fase: form.fase,
            data_assinatura: form.data_assinatura,
            valor_contrato: form.valor_contrato ? parseFloat(form.valor_contrato) : undefined,
            observacoes: form.observacoes,
            status_operacional: form.status_operacional || undefined,
          }
        : {
            novo_cliente_nome: form.novo_cliente_nome,
            novo_cliente_whatsapp: form.novo_cliente_whatsapp || undefined,
            novo_cliente_email: form.novo_cliente_email || undefined,
            novo_cliente_cpf_cnpj: form.novo_cliente_cpf_cnpj || undefined,
            demanda: form.demanda,
            fase: form.fase,
            data_assinatura: form.data_assinatura,
            valor_contrato: form.valor_contrato ? parseFloat(form.valor_contrato) : undefined,
            observacoes: form.observacoes,
            status_operacional: form.status_operacional || undefined,
          }
      await lancarContratoManual(payload)
      showToast('Contrato lançado com sucesso.', 'success')
      queryClient.invalidateQueries({ queryKey: ['clientes-fechados', ano] })
      onClose()
    } catch {
      showToast('Erro ao lançar contrato. Verifique se o backend está ativo.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl bg-gray-800 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
          <h2 className="text-lg font-semibold text-gray-100">Lançar manualmente</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="overflow-y-auto flex-1 px-6 py-5 space-y-4" onSubmit={e => { e.preventDefault(); handleSalvar() }}>
          {/* Toggle modo cliente */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-300">Cliente</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-600">
              <button
                type="button"
                onClick={() => setModoCliente('existente')}
                className={`flex-1 px-2 py-1 text-sm font-medium transition-colors ${
                  modoCliente === 'existente'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Selecionar existente
              </button>
              <button
                type="button"
                onClick={() => setModoCliente('novo')}
                className={`flex-1 px-2 py-1 text-sm font-medium transition-colors ${
                  modoCliente === 'novo'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Criar novo
              </button>
            </div>
          </div>

          {modoCliente === 'existente' ? (
            <div className="space-y-1.5">
              {loadingClientes ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando clientes...
                </div>
              ) : (
                <select
                  value={form.cliente_id}
                  onChange={e => handleChange('cliente_id', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 px-2 py-1 focus:outline-none focus:border-blue-400"
                >
                  <option value="">Selecione um cliente...</option>
                  {(clientes || []).map((c: { id: string; nome: string }) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-300">Nome <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.novo_cliente_nome}
                  onChange={e => handleChange('novo_cliente_nome', e.target.value)}
                  placeholder="Nome completo"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 px-2 py-1 focus:outline-none focus:border-blue-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-300">WhatsApp</label>
                <input
                  type="text"
                  value={form.novo_cliente_whatsapp}
                  onChange={e => handleChange('novo_cliente_whatsapp', e.target.value)}
                  placeholder="(83) 99999-9999"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 px-2 py-1 focus:outline-none focus:border-blue-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-300">E-mail</label>
                <input
                  type="email"
                  value={form.novo_cliente_email}
                  onChange={e => handleChange('novo_cliente_email', e.target.value)}
                  placeholder="cliente@exemplo.com"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 px-2 py-1 focus:outline-none focus:border-blue-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-300">CPF/CNPJ</label>
                <input
                  type="text"
                  value={form.novo_cliente_cpf_cnpj}
                  onChange={e => handleChange('novo_cliente_cpf_cnpj', e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 px-2 py-1 focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-300">Demanda</label>
            <select
              value={form.demanda}
              onChange={e => handleChange('demanda', e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 px-2 py-1 focus:outline-none focus:border-blue-400"
            >
              {demandas.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-300">Fase</label>
            <select
              value={form.fase}
              onChange={e => handleChange('fase', e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 px-2 py-1 focus:outline-none focus:border-blue-400"
            >
              {FASES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-300">Data de assinatura</label>
            <input
              type="date"
              value={form.data_assinatura}
              onChange={e => handleChange('data_assinatura', e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 px-2 py-1 focus:outline-none focus:border-blue-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-300">Valor do contrato (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.valor_contrato}
              onChange={e => handleChange('valor_contrato', e.target.value)}
              placeholder="0,00"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 px-2 py-1 focus:outline-none focus:border-blue-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-300">Observações</label>
            <textarea
              value={form.observacoes}
              onChange={e => handleChange('observacoes', e.target.value)}
              rows={3}
              placeholder="Observações opcionais..."
              className="w-full resize-none bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 px-2 py-1 focus:outline-none focus:border-blue-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-300">Status Operacional</label>
            <select
              value={form.status_operacional}
              onChange={e => handleChange('status_operacional', e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 px-2 py-1 focus:outline-none focus:border-blue-400"
            >
              <option value="">—</option>
              {STATUS_OPERACIONAL.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-700 shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {salvando ? 'Salvando...' : 'Lançar contrato'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface TabelaContratoProps {
  contratos: ContratoFechado[]
  ano: number
}

function TabelaContratos({ contratos, ano }: TabelaContratoProps) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const [boletoModal, setBoletoModal] = useState<{ contratoId: string; clienteId: string; clienteNome: string; valor: number | null; demanda: string } | null>(null)
  const [localContratos, setLocalContratos] = useState<ContratoFechado[]>(contratos)
  const [editandoValor, setEditandoValor] = useState<{ id: string; valor: string } | null>(null)

  const { data: demandasQuery } = useQuery({
    queryKey: ['demandas'],
    queryFn: getDemandas,
    staleTime: 5 * 60 * 1000,
  })

  const demandas = demandasQuery ?? DEMANDAS_FALLBACK

  React.useEffect(() => {
    setLocalContratos(contratos)
  }, [contratos])

  const mutacao = useMutation({
    mutationFn: ({ id, campos }: { id: string; campos: Partial<ContratoFechado> }) =>
      atualizarContrato(id, campos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes-fechados', ano] })
    },
    onError: () => {
      showToast('Erro ao salvar alteração.', 'error')
    },
  })

  const salvarComDebounce = useCallback(
    (id: string, campos: Partial<ContratoFechado>, delay = 500) => {
      const key = `${id}-${Object.keys(campos).join(',')}`
      const existing = debounceTimers.current.get(key)
      if (existing) clearTimeout(existing)
      const timer = setTimeout(() => {
        mutacao.mutate({ id, campos })
        debounceTimers.current.delete(key)
      }, delay)
      debounceTimers.current.set(key, timer)
    },
    [mutacao]
  )

  const atualizarLocal = useCallback((id: string, campos: Partial<ContratoFechado>) => {
    setLocalContratos(prev =>
      prev.map(c => (c.id === id ? { ...c, ...campos } : c))
    )
  }, [])

  const handlePagamentoInicial = useCallback(
    (c: ContratoFechado, valor: string) => {
      const checked = valor === 'sim'
      atualizarLocal(c.id, { pagamento_inicial: checked })
      mutacao.mutate({ id: c.id, campos: { pagamento_inicial: checked } })
    },
    [atualizarLocal, mutacao]
  )

  const handleAbrirBoletoModal = useCallback(
    (c: ContratoFechado) => {
      setBoletoModal({
        contratoId: c.id,
        clienteId: c.cliente_id,
        clienteNome: c.nome,
        valor: c.valor_contrato ?? null,
        demanda: c.demanda,
      })
    },
    []
  )

  return (
    <>
    {boletoModal && (
      <CriarBoletoModal
        contratoId={boletoModal.contratoId}
        clienteId={boletoModal.clienteId}
        clienteNome={boletoModal.clienteNome}
        valorInicial={boletoModal.valor}
        demanda={boletoModal.demanda}
        ano={ano}
        onClose={() => setBoletoModal(null)}
        onSuccess={(id) => {
          atualizarLocal(id, { boleto_emitido: true })
          queryClient.invalidateQueries({ queryKey: ['clientes-fechados', ano] })
        }}
      />
    )}
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-gray-100">
        <thead>
          <tr className="border-b border-gray-700 text-[11px] uppercase tracking-wider text-gray-400">
            <th className="px-2 py-1 text-center font-medium">Cod</th>
            <th className="px-2 py-1 text-center font-medium">Cliente</th>
            <th className="px-2 py-1 text-center font-medium">Contato</th>
            <th className="px-2 py-1 text-center font-medium">Demanda</th>
            <th className="px-2 py-1 text-center font-medium">Fase</th>
            <th className="px-2 py-1 text-center font-medium">Fechamento</th>
            <th className="px-2 py-1 text-center font-medium">Valor</th>
            <th className="px-2 py-1 text-center font-medium">Pag. Inicial</th>
            <th className="px-2 py-1 text-center font-medium">Boleto</th>
            <th className="px-2 py-1 text-center font-medium min-w-[220px]">Obs</th>
            <th className="px-2 py-1 text-center font-medium">Status Op.</th>
          </tr>
        </thead>
        <tbody>
          {localContratos.map(c => {
            const editandoEsteValor = editandoValor?.id === c.id
            return (
              <tr key={c.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 align-middle">
                <td className="px-2 py-1 text-xs text-center text-gray-400">#{c.cod_cliente}</td>
                <td className="px-2 py-1 text-center font-semibold">{c.nome}</td>
                <td className="px-2 py-1 text-center text-gray-300 whitespace-nowrap">{formatarTelefone(c.contato)}</td>
                <td className="px-2 py-1 text-center">
                  <select
                    value={c.demanda}
                    onChange={e => {
                      atualizarLocal(c.id, { demanda: e.target.value })
                      salvarComDebounce(c.id, { demanda: e.target.value }, 0)
                    }}
                    className="bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 px-1.5 py-0.5 focus:outline-none focus:border-blue-400"
                  >
                    <option value="">Selecionar...</option>
                    {demandas.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1 text-center">
                  <select
                    value={c.fase}
                    onChange={e => {
                      atualizarLocal(c.id, { fase: e.target.value })
                      salvarComDebounce(c.id, { fase: e.target.value }, 0)
                    }}
                    className="bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 px-1.5 py-0.5 focus:outline-none focus:border-blue-400"
                  >
                    {FASES.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1 text-center text-gray-300 whitespace-nowrap">{formatarData(c.data_assinatura)}</td>
                <td className="px-2 py-1 text-center min-w-[110px]">
                  {editandoEsteValor ? (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      autoFocus
                      value={editandoValor.valor}
                      onChange={e => setEditandoValor({ id: c.id, valor: e.target.value })}
                      onBlur={e => {
                        const v = e.target.value === '' ? null : parseFloat(e.target.value)
                        atualizarLocal(c.id, { valor_contrato: v })
                        salvarComDebounce(c.id, { valor_contrato: v }, 0)
                        setEditandoValor(null)
                      }}
                      className="w-24 bg-gray-700 border border-blue-400 rounded px-1.5 py-0.5 text-sm text-gray-100 focus:outline-none"
                    />
                  ) : (
                    <span
                      onClick={() => setEditandoValor({ id: c.id, valor: c.valor_contrato != null ? String(c.valor_contrato) : '' })}
                      className="cursor-pointer text-gray-300 hover:text-gray-100 border-b border-dashed border-gray-600 hover:border-gray-400 transition-colors"
                      title="Clique para editar"
                    >
                      {formatarMoeda(c.valor_contrato)}
                    </span>
                  )}
                </td>
                <td className="px-2 py-1 text-center">
                  <select
                    value={c.pagamento_inicial ? 'sim' : 'nao'}
                    onChange={e => handlePagamentoInicial(c, e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 px-2 py-1 focus:outline-none focus:border-blue-400"
                  >
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </select>
                </td>
                <td className="px-2 py-1 text-center">
                  {c.boleto_emitido ? (
                    <span className="inline-block rounded-full bg-green-900 px-2 py-0.5 text-[11px] font-medium text-green-300">
                      Emitido ✓
                    </span>
                  ) : c.pagamento_inicial ? (
                    <button
                      onClick={() => handleAbrirBoletoModal(c)}
                      className="flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-blue-500 transition-colors mx-auto"
                    >
                      Criar Boleto
                    </button>
                  ) : (
                    <span className="text-gray-500 text-xs">—</span>
                  )}
                </td>
                <td className="px-2 py-1 min-w-[220px]">
                  <textarea
                    defaultValue={c.observacoes}
                    onBlur={e => {
                      atualizarLocal(c.id, { observacoes: e.target.value })
                      salvarComDebounce(c.id, { observacoes: e.target.value })
                    }}
                    placeholder="—"
                    rows={2}
                    className="w-full resize-none bg-transparent border border-gray-600 rounded focus:border-blue-400 outline-none text-sm text-gray-100 px-2 py-1 leading-snug break-words"
                  />
                </td>
                <td className="px-2 py-1">
                  <select
                    value={c.status_operacional || ''}
                    onChange={e => {
                      atualizarLocal(c.id, { status_operacional: e.target.value })
                      salvarComDebounce(c.id, { status_operacional: e.target.value }, 0)
                    }}
                    className="bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 px-2 py-1 w-full"
                  >
                    <option value="">—</option>
                    {STATUS_OPERACIONAL.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
    </>
  )
}

export default function ClientesFechados() {
  const anoAtual = new Date().getFullYear()
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual)
  const [mesExpandido, setMesExpandido] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const { toasts } = useToast()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['clientes-fechados', anoSelecionado],
    queryFn: () => getClientesFechados(anoSelecionado),
  })

  const anos = Array.from({ length: 5 }, (_, i) => anoAtual - i)

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
              t.type === 'error'
                ? 'bg-red-900 text-red-100'
                : 'bg-green-900 text-green-100'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Modal lançar manualmente */}
      {modalAberto && (
        <LancarManualmenteModal
          ano={anoSelecionado}
          onClose={() => setModalAberto(false)}
        />
      )}

      {/* Cabeçalho */}
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-100">Clientes Fechados</h1>
        <div className="flex items-center gap-3">
          <select
            value={anoSelecionado}
            onChange={e => setAnoSelecionado(Number(e.target.value))}
            className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 focus:border-blue-400 focus:outline-none"
          >
            {anos.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Lançar manualmente
          </button>
        </div>
      </div>

      {/* Cards de totais */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : isError ? (
        <div className="rounded-lg bg-gray-800 p-6 text-center text-gray-400">
          Erro ao carregar dados. Verifique se o backend está ativo.
        </div>
      ) : data ? (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <div className="rounded-xl bg-gray-800 p-5">
              <div className="text-3xl font-bold text-gray-100">{data.totais.total_ano}</div>
              <div className="mt-1 text-xs text-gray-400 uppercase tracking-wider">Total no ano</div>
            </div>
            <div className="rounded-xl bg-gray-800 p-5">
              <div className="text-3xl font-bold text-gray-100">{data.totais.este_mes}</div>
              <div className="mt-1 text-xs text-gray-400 uppercase tracking-wider">Este mês</div>
            </div>
            <div className="rounded-xl bg-gray-800 p-5">
              <div className="text-3xl font-bold text-gray-100">
                {data.totais.media_mes.toFixed(1)}
              </div>
              <div className="mt-1 text-xs text-gray-400 uppercase tracking-wider">Média / mês</div>
            </div>
            <div className="rounded-xl bg-gray-800 p-5">
              <div className="text-lg font-bold text-gray-100 leading-tight">
                {formatarMoeda(data.totais.valor_total_mes)}
              </div>
              <div className="mt-1 text-xs text-gray-400 uppercase tracking-wider">Valor este mês</div>
            </div>
            <div className="rounded-xl bg-gray-800 p-5">
              <div className="text-lg font-bold text-gray-100 leading-tight">
                {formatarMoeda(data.totais.valor_total_ano)}
              </div>
              <div className="mt-1 text-xs text-gray-400 uppercase tracking-wider">Valor total ano</div>
            </div>
          </div>

          {/* Lista de meses */}
          <div className="flex flex-col gap-2">
            {data.meses.length === 0 ? (
              <div className="rounded-lg bg-gray-800 p-6 text-center text-gray-400">
                Nenhum contrato encontrado para {anoSelecionado}.
              </div>
            ) : (
              data.meses.map(mes => {
                const expandido = mesExpandido === mes.mes
                return (
                  <div key={mes.mes} className="rounded-xl bg-gray-800 overflow-hidden">
                    <button
                      onClick={() => setMesExpandido(expandido ? null : mes.mes)}
                      className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-gray-700/50 transition-colors"
                    >
                      <span className="shrink-0 text-gray-400">
                        {expandido ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </span>
                      <span className="flex-1 font-semibold text-gray-100">{mes.label}</span>
                      <span className="text-sm text-gray-400 mr-2">
                        {formatarMoeda(mes.valor_total)}
                      </span>
                      <span className="rounded-full bg-gray-700 px-3 py-0.5 text-sm font-medium text-gray-300">
                        {mes.total} {mes.total === 1 ? 'cliente' : 'clientes'}
                      </span>
                    </button>

                    {expandido && mes.contratos.length > 0 && (
                      <div className="border-t border-gray-700 px-2 py-3">
                        <TabelaContratos contratos={mes.contratos} ano={anoSelecionado} />
                      </div>
                    )}

                    {expandido && mes.contratos.length === 0 && (
                      <div className="border-t border-gray-700 px-5 py-4 text-sm text-gray-400">
                        Nenhum contrato neste mês.
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
