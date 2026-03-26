import { useState, useEffect } from 'react'
import Button from '@/components/common/Button'
import { cadastrarCliente, atualizarCliente } from '@/services/cliente.service'
import type { Cliente, CadastroClienteInput } from '@/types/cliente'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSaved: (cliente: Cliente) => void
  clienteEdit?: Cliente
}

export function CadastroClienteModal({ isOpen, onClose, onSaved, clienteEdit }: Props) {
  const [form, setForm] = useState<CadastroClienteInput>({
    nome: '',
    cpfCnpj: '',
    whatsapp: '',
    email: '',
    notas: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nomeError, setNomeError] = useState<string | null>(null)

  useEffect(() => {
    if (clienteEdit) {
      setForm({
        nome: clienteEdit.nome,
        cpfCnpj: clienteEdit.cpfCnpj ?? '',
        whatsapp: clienteEdit.whatsapp ?? '',
        email: clienteEdit.email ?? '',
        notas: clienteEdit.notas ?? '',
      })
    } else {
      setForm({ nome: '', cpfCnpj: '', whatsapp: '', email: '', notas: '' })
    }
    setError(null)
    setNomeError(null)
  }, [isOpen, clienteEdit])

  if (!isOpen) return null

  const title = clienteEdit ? 'Editar Cliente' : 'Novo Cliente'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNomeError(null)

    if (!form.nome.trim()) {
      setNomeError('Informe o nome do cliente.')
      return
    }

    const input: CadastroClienteInput = {
      nome: form.nome.trim(),
      cpfCnpj: form.cpfCnpj?.trim() || undefined,
      whatsapp: form.whatsapp?.trim() || undefined,
      email: form.email?.trim() || undefined,
      notas: form.notas?.trim() || undefined,
    }

    setLoading(true)
    try {
      let result: Cliente
      if (clienteEdit) {
        result = await atualizarCliente(clienteEdit.id, input)
      } else {
        result = await cadastrarCliente(input)
      }
      onSaved(result)
      onClose()
    } catch (err: unknown) {
      const isAxiosShape = typeof err === 'object' && err !== null && 'response' in err
      const msg = isAxiosShape
        ? ((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Erro ao salvar cliente.')
        : 'Erro ao salvar cliente.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nome}
              onChange={e => { setForm(prev => ({ ...prev, nome: e.target.value })); setNomeError(null) }}
              placeholder="Ex: João da Silva"
              className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${nomeError ? 'border-red-400' : 'border-gray-300'}`}
            />
            {nomeError && (
              <p className="mt-1 text-xs text-red-600">{nomeError}</p>
            )}
          </div>

          {/* CPF / CNPJ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CPF / CNPJ
            </label>
            <input
              type="text"
              value={form.cpfCnpj ?? ''}
              onChange={e => setForm(prev => ({ ...prev, cpfCnpj: e.target.value }))}
              placeholder="000.000.000-00 ou 00.000.000/0001-00"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp
            </label>
            <input
              type="text"
              value={form.whatsapp ?? ''}
              onChange={e => setForm(prev => ({ ...prev, whatsapp: e.target.value }))}
              placeholder="5511999999999 (com DDI)"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* E-mail */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-mail
            </label>
            <input
              type="email"
              value={form.email ?? ''}
              onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="cliente@exemplo.com"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              value={form.notas ?? ''}
              onChange={e => setForm(prev => ({ ...prev, notas: e.target.value }))}
              rows={3}
              placeholder="Notas internas sobre o cliente..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* API error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Salvando...' : clienteEdit ? 'Salvar alterações' : 'Cadastrar cliente'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
