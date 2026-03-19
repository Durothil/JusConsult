import React, { useState } from 'react'
import Card, { CardContent, CardHeader } from '@/components/common/Card'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import { Spinner, PageLoading } from '@/components/common/Loading'
import Empty from '@/components/common/Empty'
import { searchPrecedents } from '@/services/precedent.service'
import type { Precedent } from '@/types/precedent'

interface SearchState {
  query: string
  results: Precedent[]
  loading: boolean
  error: string | null
  searched: boolean
}

const PrecedentsPage: React.FC = () => {
  const [state, setState] = useState<SearchState>({
    query: '',
    results: [],
    loading: false,
    error: null,
    searched: false,
  })

  const [filters, setFilters] = useState({
    tribunal: '',
    tipo: '',
  })

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!state.query.trim()) {
      setState((s) => ({ ...s, error: 'Insira um termo para buscar' }))
      return
    }

    try {
      setState((s) => ({ ...s, loading: true, error: null }))

      // Em produção: const results = await searchPrecedents(state.query)

      // Mock data para desenvolvimento
      const mockResults: Precedent[] = [
        {
          id: '1',
          ementa: 'Responsabilidade civil do proprietário por omissão de reparos em imóvel',
          tese: 'O proprietário de imóvel é responsável civil pelos danos causados a terceiros em razão de falha estrutural que poderia ter sido evitada com manutenção adequada.',
          tribunal: 'STJ',
          tipo: 'RR',
          orgao: 'Superior Tribunal de Justiça',
          status: 'Vigente',
        },
        {
          id: '2',
          ementa: 'Dano moral por violação de privacidade em redes sociais',
          tese: 'Constitui dano moral passível de indenização a divulgação não autorizada de informações pessoais em redes sociais, independentemente de resultado econômico direto.',
          tribunal: 'TJSP',
          tipo: 'SUM',
          orgao: 'Tribunal de Justiça de São Paulo',
          status: 'Vigente',
        },
        {
          id: '3',
          ementa: 'Direito do consumidor - Juros e correção em ações de indenização',
          tese: 'Nas ações de indenização por dano moral, os juros de mora incidem desde a data do ilícito, não desde a sentença.',
          tribunal: 'STF',
          tipo: 'RG',
          orgao: 'Supremo Tribunal Federal',
          status: 'Vigente',
        },
        {
          id: '4',
          ementa: 'Responsabilidade do Estado por ação e omissão em saúde pública',
          tese: 'O Estado responde civilmente pela demora no fornecimento de medicamentos de alta complexidade a pacientes do SUS quando configurado o nexo de causalidade com dano.',
          tribunal: 'STJ',
          tipo: 'IRDR',
          orgao: 'Superior Tribunal de Justiça',
          status: 'Vigente',
        },
        {
          id: '5',
          ementa: 'Contrato eletrônico - Validade e eficácia de assinatura digital',
          tese: 'A assinatura digital com certificado de segurança reconhecido pelo ICP-Brasil possui mesma validade jurídica que a assinatura manuscrita para fins de prova em processo civil.',
          tribunal: 'TRF',
          tipo: 'SUM',
          orgao: 'Tribunal Regional Federal',
          status: 'Vigente',
        },
      ]

      // Filtrar por tribunal se selecionado
      let filtered = mockResults
      if (filters.tribunal) {
        filtered = filtered.filter((p) => p.tribunal === filters.tribunal)
      }
      if (filters.tipo) {
        filtered = filtered.filter((p) => p.tipo === filters.tipo)
      }

      setState({
        query: state.query,
        results: filtered,
        loading: false,
        error: null,
        searched: true,
      })
    } catch (err) {
      setState((s) => ({
        ...s,
        error: 'Erro ao buscar precedentes',
        loading: false,
      }))
      console.error(err)
    }
  }

  const getTypeColor = (type: string) => {
    const typeColorMap: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
      SUM: 'info',
      RG: 'success',
      IRDR: 'warning',
      RR: 'default',
      SV: 'success',
      CT: 'info',
    }
    return typeColorMap[type] || 'default'
  }

  const getTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      SUM: 'Súmula',
      RG: 'Rep. Geral',
      IRDR: 'IRDR',
      RR: 'Recursos Repetitivos',
      SV: 'Súmula Vinculante',
      CT: 'Tema',
    }
    return typeLabels[type] || type
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-gray-900 font-serif">
          Buscar Precedentes
        </h1>
        <p className="text-lg text-gray-600">
          Pesquise súmulas, teses repetitivas e jurisprudência consolidada do CNJ
        </p>
      </div>

      {/* Search Card */}
      <Card className="border-t-4 border-t-blue-600 shadow-lg">
        <CardContent className="py-8">
          <form onSubmit={handleSearch} className="space-y-6">
            {/* Search Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Tema ou ementa
              </label>
              <input
                type="text"
                value={state.query}
                onChange={(e) =>
                  setState((s) => ({ ...s, query: e.target.value, error: null }))
                }
                placeholder="Ex: responsabilidade civil, dano moral, direito do consumidor..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {state.error && (
                <p className="mt-2 text-sm text-red-600">{state.error}</p>
              )}
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Tribunal
                </label>
                <select
                  value={filters.tribunal}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, tribunal: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Todos os tribunais</option>
                  <option value="STF">Supremo Tribunal Federal</option>
                  <option value="STJ">Superior Tribunal de Justiça</option>
                  <option value="TRF">Tribunal Regional Federal</option>
                  <option value="TJSP">Tribunal de Justiça de SP</option>
                  <option value="TST">Tribunal Superior do Trabalho</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Tipo de precedente
                </label>
                <select
                  value={filters.tipo}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, tipo: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Todos os tipos</option>
                  <option value="SUM">Súmula</option>
                  <option value="SV">Súmula Vinculante</option>
                  <option value="RG">Repercussão Geral</option>
                  <option value="IRDR">IRDR</option>
                  <option value="RR">Recursos Repetitivos</option>
                  <option value="CT">Tema</option>
                </select>
              </div>
            </div>

            {/* Search Button */}
            <div className="flex gap-3">
              <Button
                type="submit"
                variant="primary"
                className="flex items-center gap-2"
                disabled={state.loading}
              >
                {state.loading ? (
                  <>
                    <Spinner size="sm" />
                    Buscando...
                  </>
                ) : (
                  'Buscar'
                )}
              </Button>
              {state.searched && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setState({
                      query: '',
                      results: [],
                      loading: false,
                      error: null,
                      searched: false,
                    })
                  }
                >
                  Limpar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results Section */}
      {state.searched && (
        <div className="space-y-4">
          {state.results.length === 0 ? (
            <Empty
              title="Nenhum precedente encontrado"
              description="Tente ajustar os filtros ou usar outros termos de busca"
            />
          ) : (
            <>
              <p className="text-sm text-gray-600 font-medium">
                {state.results.length} resultado{state.results.length !== 1 ? 's' : ''} encontrado
                {state.results.length !== 1 ? 's' : ''}
              </p>

              <div className="space-y-4">
                {state.results.map((precedent) => (
                  <Card key={precedent.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-6">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                              {precedent.ementa}
                            </h3>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={getTypeColor(precedent.tipo)}>
                                {getTypeLabel(precedent.tipo)}
                              </Badge>
                              <span className="text-xs text-gray-500 font-medium">
                                {precedent.tribunal}
                              </span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">
                                {precedent.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Tese */}
                        <div className="pt-4 border-t border-gray-200">
                          <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2">
                            Tese
                          </p>
                          <p className="text-gray-700 leading-relaxed text-sm">
                            {precedent.tese}
                          </p>
                        </div>

                        {/* Metadata */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-4">
                          <div className="p-3 bg-gray-50 rounded border border-gray-200">
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                              Tribunal
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                              {precedent.orgao}
                            </p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded border border-gray-200">
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                              Tipo
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                              {getTypeLabel(precedent.tipo)}
                            </p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded border border-gray-200">
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                              Status
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                              {precedent.status}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-4">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              // Em produção: navegar para página de detalhes
                              window.alert(`Precedente: ${precedent.ementa}`)
                            }}
                          >
                            Ver detalhes ↗
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Empty State (inicial) */}
      {!state.searched && (
        <div className="py-16 text-center">
          <div className="space-y-4">
            <svg
              className="w-16 h-16 mx-auto text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="text-gray-500 text-lg">
              Insira um tema para buscar precedentes jurídicos
            </p>
            <p className="text-gray-400 text-sm">
              Súmulas, teses repetitivas, repercussão geral e muito mais
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default PrecedentsPage
