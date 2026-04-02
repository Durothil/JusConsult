import { useEffect, useState } from 'react'
import { Check, X, Plus } from 'lucide-react'
import Card, { CardContent } from '@/components/common/Card'
import Button from '@/components/common/Button'
import { enviarMensagemTesteChatwoot } from '@/services/chatwoot.service'
import {
  deleteToken,
  getTokens,
  saveTokens,
  type SecretSettingMeta,
  type SecretSettingsKey,
} from '@/services/settings.service'
import { getDemandas, salvarDemandas } from '@/services/clientesFechados.service'

type ConfigState = {
  anthropicToken: string
  openaiToken: string
  geminiToken: string
  chatwootBaseUrl: string
  chatwootAccountId: string
  chatwootInboxId: string
  chatwootApiToken: string
  chatwootEnabled: string
  chatwootMovementTypes: string
  asaasEnvironment: string
  asaasApiKey: string
  asaasWebhookToken: string
  zapsignApiToken: string
  zapsignWebhookSecret: string
}

type TestState = {
  nome: string
  whatsapp: string
  mensagem: string
}

const MOVEMENT_OPTIONS = [
  { key: 'sentenca', label: 'Sentenca e acordao' },
  { key: 'decisao', label: 'Decisao e despacho' },
  { key: 'audiencia', label: 'Audiencia e pericia' },
  { key: 'intimacao', label: 'Intimacao e expedicao' },
  { key: 'pagamento', label: 'Pagamento, RPV e precatorio' },
  { key: 'encerramento', label: 'Arquivamento e baixa' },
] as const

const DEFAULT_MOVEMENT_TYPES = MOVEMENT_OPTIONS.map(item => item.key).join(',')

const EMPTY_STATE: ConfigState = {
  anthropicToken: '',
  openaiToken: '',
  geminiToken: '',
  chatwootBaseUrl: '',
  chatwootAccountId: '',
  chatwootInboxId: '',
  chatwootApiToken: '',
  chatwootEnabled: 'true',
  chatwootMovementTypes: DEFAULT_MOVEMENT_TYPES,
  asaasEnvironment: 'sandbox',
  asaasApiKey: '',
  asaasWebhookToken: '',
  zapsignApiToken: '',
  zapsignWebhookSecret: '',
}

const EMPTY_TEST: TestState = {
  nome: '',
  whatsapp: '',
  mensagem: 'Esta e uma mensagem de teste do JusFlow via Chatwoot.',
}

const EMPTY_SECRET_META: Record<SecretSettingsKey, SecretSettingMeta> = {
  anthropicToken: { configured: false, isSecret: true },
  openaiToken: { configured: false, isSecret: true },
  geminiToken: { configured: false, isSecret: true },
  chatwootApiToken: { configured: false, isSecret: true },
  asaasApiKey: { configured: false, isSecret: true },
  asaasWebhookToken: { configured: false, isSecret: true },
  zapsignApiToken: { configured: false, isSecret: true },
  zapsignWebhookSecret: { configured: false, isSecret: true },
}

function normalizeWhatsappPreview(value: string) {
  const raw = value.trim()
  if (!raw) return ''
  const hasPlusPrefix = raw.startsWith('+')
  const digits = raw.replace(/D/g, '')
  if (!digits) return ''
  if (hasPlusPrefix) return `+${digits}`
  if (digits.startsWith('00')) return `+${digits.slice(2)}`
  if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`
  return `+${digits}`
}

function parseMovementTypes(value: string) {
  return new Set(value.split(',').map(item => item.trim()).filter(Boolean))
}

function buildSecretHelper(meta?: SecretSettingMeta, currentValue?: string) {
  if (currentValue?.trim()) return 'O novo valor sera salvo quando voce clicar em salvar configuracoes.'
  if (meta?.configured) {
    if (meta.maskedValue) return `Configurado no servidor como ${meta.maskedValue}. Preencha apenas para substituir.`
    return 'Configurado no servidor. Preencha apenas para substituir.'
  }
  return 'Ainda nao configurado.'
}

function InputRow({
  label,
  value,
  placeholder,
  onChange,
  onClear,
  type = 'text',
  configured = false,
  helperText,
}: {
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
  onClear: () => void
  type?: 'text' | 'password'
  configured?: boolean
  helperText?: string
}) {
  const showClear = Boolean(value || configured)

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-900">{label}</label>
      <div className="flex gap-2">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {showClear && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-red-200 px-3 text-red-600 transition-colors hover:bg-red-50"
            title="Limpar"
          >
            <X size={18} />
          </button>
        )}
      </div>
      {helperText ? <p className="text-xs text-gray-500">{helperText}</p> : null}
    </div>
  )
}

export default function Configuracoes() {
  const [settings, setSettings] = useState<ConfigState>(EMPTY_STATE)
  const [secretMeta, setSecretMeta] = useState<Record<SecretSettingsKey, SecretSettingMeta>>(EMPTY_SECRET_META)
  const [testData, setTestData] = useState<TestState>(EMPTY_TEST)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const [demandas, setDemandas] = useState<string[]>([])
  const [novaDemanda, setNovaDemanda] = useState('')
  const [salvandoDemandas, setSalvandoDemandas] = useState(false)
  const [demandaMsg, setDemandaMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadSettings()
    const DEMANDAS_DEFAULT = ['auxílio-doença', 'auxílio-acidente', 'aposentadoria por invalidez', 'BPC/LOAS', 'pensão por morte', 'salário-maternidade']
    getDemandas().then(setDemandas).catch(() => setDemandas(DEMANDAS_DEFAULT))
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      const loaded = await getTokens()
      setSettings({
        anthropicToken: '',
        openaiToken: '',
        geminiToken: '',
        chatwootBaseUrl: loaded.chatwootBaseUrl || '',
        chatwootAccountId: loaded.chatwootAccountId || '',
        chatwootInboxId: loaded.chatwootInboxId || '',
        chatwootApiToken: '',
        chatwootEnabled: loaded.chatwootEnabled || 'true',
        chatwootMovementTypes: loaded.chatwootMovementTypes || DEFAULT_MOVEMENT_TYPES,
        asaasEnvironment: loaded.asaasEnvironment || 'sandbox',
        asaasApiKey: '',
        asaasWebhookToken: '',
        zapsignApiToken: '',
        zapsignWebhookSecret: '',
      })
      setSecretMeta({
        ...EMPTY_SECRET_META,
        ...loaded.secretMeta,
      })
    } catch {
      setError('Erro ao carregar configuracoes')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key: keyof ConfigState, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const toggleMovementType = (key: string) => {
    setSettings(prev => {
      const selected = parseMovementTypes(prev.chatwootMovementTypes)
      if (selected.has(key)) selected.delete(key)
      else selected.add(key)
      return { ...prev, chatwootMovementTypes: Array.from(selected).join(',') }
    })
    setSaved(false)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      await saveTokens(settings)
      await loadSettings()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Erro ao salvar configuracoes')
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async (key: keyof ConfigState) => {
    const fallbackMap: Partial<Record<keyof ConfigState, string>> = {
      chatwootEnabled: 'true',
      chatwootMovementTypes: DEFAULT_MOVEMENT_TYPES,
      asaasEnvironment: 'sandbox',
    }

    try {
      setError(null)
      setSettings(prev => ({ ...prev, [key]: fallbackMap[key] ?? '' }))
      await deleteToken(key)

      if (key in EMPTY_SECRET_META) {
        const secretKey = key as SecretSettingsKey
        setSecretMeta(prev => ({
          ...prev,
          [secretKey]: { configured: false, isSecret: true },
        }))
      }
    } catch {
      setError('Erro ao limpar configuracao')
    }
  }

  const handleSendTest = async () => {
    try {
      setSendingTest(true)
      setTestMessage(null)
      setError(null)
      await enviarMensagemTesteChatwoot(testData)
      setTestMessage('Mensagem de teste enviada com sucesso.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar mensagem teste pelo Chatwoot')
    } finally {
      setSendingTest(false)
    }
  }

  const selectedMovementTypes = parseMovementTypes(settings.chatwootMovementTypes)

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-gray-600">Carregando configuracoes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Configuracoes</h1>
          <p className="mt-1 text-sm text-gray-500">Central unica para IA, Asaas e Chatwoot com segredos protegidos no servidor.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={loadSettings}>Recarregar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar configuracoes'}</Button>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {saved ? (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <Check size={18} /> Configuracoes salvas com sucesso.
        </div>
      ) : null}
      {testMessage ? <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{testMessage}</div> : null}

      <Card>
        <CardContent className="space-y-5 py-5">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">IA</h2>
            <p className="text-sm text-gray-500">Tokens usados para explicacoes processuais e assistente juridico.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <InputRow
              label="Token Anthropic Claude"
              value={settings.anthropicToken}
              placeholder={secretMeta.anthropicToken.maskedValue || 'sk-ant-...'}
              onChange={value => handleChange('anthropicToken', value)}
              onClear={() => handleClear('anthropicToken')}
              type="password"
              configured={secretMeta.anthropicToken.configured}
              helperText={buildSecretHelper(secretMeta.anthropicToken, settings.anthropicToken)}
            />
            <InputRow
              label="Token OpenAI"
              value={settings.openaiToken}
              placeholder={secretMeta.openaiToken.maskedValue || 'sk-...'}
              onChange={value => handleChange('openaiToken', value)}
              onClear={() => handleClear('openaiToken')}
              type="password"
              configured={secretMeta.openaiToken.configured}
              helperText={buildSecretHelper(secretMeta.openaiToken, settings.openaiToken)}
            />
            <InputRow
              label="Token Google Gemini"
              value={settings.geminiToken}
              placeholder={secretMeta.geminiToken.maskedValue || 'AIza...'}
              onChange={value => handleChange('geminiToken', value)}
              onClear={() => handleClear('geminiToken')}
              type="password"
              configured={secretMeta.geminiToken.configured}
              helperText={buildSecretHelper(secretMeta.geminiToken, settings.geminiToken)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 py-5">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Asaas</h2>
            <p className="text-sm text-gray-500">Gateway financeiro para emissao de cobrancas e recebimento de webhooks.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">Ambiente</label>
              <select
                value={settings.asaasEnvironment}
                onChange={e => handleChange('asaasEnvironment', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="sandbox">Sandbox</option>
                <option value="production">Producao</option>
              </select>
            </div>
            <InputRow
              label="API Key do Asaas"
              value={settings.asaasApiKey}
              placeholder={secretMeta.asaasApiKey.maskedValue || '$aact_...'}
              onChange={value => handleChange('asaasApiKey', value)}
              onClear={() => handleClear('asaasApiKey')}
              type="password"
              configured={secretMeta.asaasApiKey.configured}
              helperText={buildSecretHelper(secretMeta.asaasApiKey, settings.asaasApiKey)}
            />
            <InputRow
              label="Token de validacao do webhook"
              value={settings.asaasWebhookToken}
              placeholder={secretMeta.asaasWebhookToken.maskedValue || 'token-seguro-para-validar-callback'}
              onChange={value => handleChange('asaasWebhookToken', value)}
              onClear={() => handleClear('asaasWebhookToken')}
              type="password"
              configured={secretMeta.asaasWebhookToken.configured}
              helperText={buildSecretHelper(secretMeta.asaasWebhookToken, settings.asaasWebhookToken)}
            />
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Use Sandbox durante os testes. O backend envia as requisicoes para <code>api-sandbox.asaas.com/v3</code> ou <code>api.asaas.com/v3</code> conforme o ambiente salvo.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 py-5">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Chatwoot</h2>
            <p className="text-sm text-gray-500">Integracao de comunicacao com o cliente e automacoes de envio.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">Envio automatico</label>
              <select
                value={settings.chatwootEnabled}
                onChange={e => handleChange('chatwootEnabled', e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="true">Ativado</option>
                <option value="false">Desativado</option>
              </select>
            </div>
            <InputRow
              label="URL base do Chatwoot"
              value={settings.chatwootBaseUrl}
              placeholder="https://app.seu-chatwoot.com"
              onChange={value => handleChange('chatwootBaseUrl', value)}
              onClear={() => handleClear('chatwootBaseUrl')}
            />
            <InputRow
              label="Account ID"
              value={settings.chatwootAccountId}
              placeholder="1"
              onChange={value => handleChange('chatwootAccountId', value)}
              onClear={() => handleClear('chatwootAccountId')}
            />
            <InputRow
              label="Inbox ID (API channel)"
              value={settings.chatwootInboxId}
              placeholder="12"
              onChange={value => handleChange('chatwootInboxId', value)}
              onClear={() => handleClear('chatwootInboxId')}
            />
            <InputRow
              label="API access token"
              value={settings.chatwootApiToken}
              placeholder={secretMeta.chatwootApiToken.maskedValue || 'seu-token-do-chatwoot'}
              onChange={value => handleChange('chatwootApiToken', value)}
              onClear={() => handleClear('chatwootApiToken')}
              type="password"
              configured={secretMeta.chatwootApiToken.configured}
              helperText={buildSecretHelper(secretMeta.chatwootApiToken, settings.chatwootApiToken)}
            />
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-900">Tipos de movimentacao que devem gerar mensagem ao cliente</label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {MOVEMENT_OPTIONS.map(option => (
                <label key={option.key} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedMovementTypes.has(option.key)}
                    onChange={() => toggleMovementType(option.key)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Use um inbox do tipo API no Chatwoot. O contato precisa ter WhatsApp preenchido no cadastro do cliente para receber a mensagem.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 py-5">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Demandas</h2>
            <p className="text-sm text-gray-500">Lista de tipos de demanda disponíveis nos contratos de clientes fechados.</p>
          </div>
          {demandaMsg ? (
            <div className={`rounded-lg border px-4 py-3 text-sm ${demandaMsg.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {demandaMsg.text}
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            {demandas.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={d}
                  onChange={e => {
                    const nova = [...demandas]
                    nova[i] = e.target.value
                    setDemandas(nova)
                  }}
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setDemandas(prev => prev.filter((_, idx) => idx !== i))}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Remover"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            {demandas.length === 0 && (
              <span className="text-sm text-gray-400">Nenhuma demanda cadastrada.</span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={novaDemanda}
              onChange={e => setNovaDemanda(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const v = novaDemanda.trim()
                  if (v && !demandas.includes(v)) {
                    setDemandas(prev => [...prev, v])
                    setNovaDemanda('')
                  }
                }
              }}
              placeholder="Nova demanda..."
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => {
                const v = novaDemanda.trim()
                if (v && !demandas.includes(v)) {
                  setDemandas(prev => [...prev, v])
                  setNovaDemanda('')
                }
              }}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Plus size={16} /> Adicionar
            </button>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={salvandoDemandas}
              onClick={async () => {
                setSalvandoDemandas(true)
                setDemandaMsg(null)
                try {
                  await salvarDemandas(demandas)
                  setDemandaMsg({ type: 'success', text: 'Demandas salvas com sucesso.' })
                  setTimeout(() => setDemandaMsg(null), 3000)
                } catch {
                  setDemandaMsg({ type: 'error', text: 'Erro ao salvar demandas.' })
                } finally {
                  setSalvandoDemandas(false)
                }
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {salvandoDemandas ? 'Salvando...' : 'Salvar demandas'}
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 py-5">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Integracao ZapSign</h2>
            <p className="text-sm text-gray-500">Token da API e secret do webhook para contratos digitais via ZapSign.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <InputRow
              label="API Token do ZapSign"
              value={settings.zapsignApiToken}
              placeholder={secretMeta.zapsignApiToken.maskedValue || 'live_...'}
              onChange={value => handleChange('zapsignApiToken', value)}
              onClear={() => handleClear('zapsignApiToken')}
              type="password"
              configured={secretMeta.zapsignApiToken.configured}
              helperText={buildSecretHelper(secretMeta.zapsignApiToken, settings.zapsignApiToken)}
            />
            <InputRow
              label="Webhook Secret do ZapSign"
              value={settings.zapsignWebhookSecret}
              placeholder={secretMeta.zapsignWebhookSecret.maskedValue || 'secret-para-validar-hmac'}
              onChange={value => handleChange('zapsignWebhookSecret', value)}
              onClear={() => handleClear('zapsignWebhookSecret')}
              type="password"
              configured={secretMeta.zapsignWebhookSecret.configured}
              helperText={buildSecretHelper(secretMeta.zapsignWebhookSecret, settings.zapsignWebhookSecret)}
            />
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            O webhook secret e usado para validar a assinatura HMAC dos eventos recebidos do ZapSign. O API Token e necessario para enviar documentos.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 py-5">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Teste de envio</h2>
            <p className="text-sm text-gray-500">Valide a integracao do Chatwoot antes de liberar o disparo automatico.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <input
              type="text"
              value={testData.nome}
              onChange={e => setTestData(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Nome do contato"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={testData.whatsapp}
              onChange={e => setTestData(prev => ({ ...prev, whatsapp: e.target.value }))}
              placeholder="WhatsApp com DDI, ex: 5581999999999"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {testData.whatsapp.trim() ? (
            <p className="text-xs text-gray-500">Formato enviado ao Chatwoot: {normalizeWhatsappPreview(testData.whatsapp)}</p>
          ) : null}
          <textarea
            value={testData.mensagem}
            onChange={e => setTestData(prev => ({ ...prev, mensagem: e.target.value }))}
            rows={4}
            className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Este teste valida a integracao, mas nao entra na trilha auditada da central de comunicacao.
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSendTest}
              disabled={sendingTest || !testData.nome.trim() || !testData.whatsapp.trim() || !testData.mensagem.trim()}
            >
              {sendingTest ? 'Enviando teste...' : 'Enviar mensagem teste'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
