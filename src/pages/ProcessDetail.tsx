import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Card, { CardContent, CardHeader } from '@/components/common/Card'
import Badge from '@/components/common/Badge'
import Tabs from '@/components/common/Tabs'
import { PageLoading, Spinner } from '@/components/common/Loading'
import Empty from '@/components/common/Empty'
import Button from '@/components/common/Button'
import { getProcessByCNJ, getProcessParties, getProcessMovements } from '@/services/process.service'
import { listDocuments } from '@/services/document.service'
import type { Process, Party, ProcessMovement } from '@/types/process'
import type { Document } from '@/types/document'

interface ProcessState {
  process: Process | null
  parties: Party[]
  movements: ProcessMovement[]
  documents: Document[]
  loading: boolean
  error: string | null
}

const ProcessDetail: React.FC = () => {
  const { cnj } = useParams<{ cnj: string }>()
  const [state, setState] = useState<ProcessState>({
    process: null,
    parties: [],
    movements: [],
    documents: [],
    loading: true,
    error: null,
  })
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const loadData = async () => {
      if (!cnj) return

      try {
        setState((s) => ({ ...s, loading: true, error: null }))
        const [process, parties, movements, documents] = await Promise.all([
          getProcessByCNJ(cnj),
          getProcessParties(cnj),
          getProcessMovements(cnj),
          listDocuments(cnj),
        ])

        if (!process) {
          setState((s) => ({ ...s, error: 'Processo não encontrado', loading: false }))
          return
        }

        setState({
          process,
          parties,
          movements,
          documents,
          loading: false,
          error: null,
        })
      } catch (err) {
        setState((s) => ({
          ...s,
          error: 'Erro ao carregar processo',
          loading: false,
        }))
        console.error(err)
      }
    }

    loadData()
  }, [cnj])

  if (state.loading) return <PageLoading />

  if (state.error || !state.process) {
    return (
      <div className="flex items-center justify-center py-16">
        <Empty
          title={state.error || 'Processo não encontrado'}
          description="Verifique o número do CNJ e tente novamente"
        />
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    if (status.toLowerCase().includes('tramitação')) return 'success'
    if (status.toLowerCase().includes('encerrado')) return 'default'
    if (status.toLowerCase().includes('suspenso')) return 'warning'
    return 'info'
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card className="border-l-4 border-l-blue-600 shadow-lg">
        <CardContent className="py-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2 font-serif">
                {state.process.cnj}
              </h1>
              <p className="text-gray-600 text-lg">
                {state.process.tribunal} • {state.process.classe}
              </p>
            </div>
            <Badge variant={getStatusColor(state.process.status)}>
              {state.process.status}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-200">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">
                Assunto
              </p>
              <p className="text-gray-900 font-medium mt-2">{state.process.assunto}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">
                Valor
              </p>
              <p className="text-gray-900 font-medium mt-2">
                {state.process.valor ? `R$ ${state.process.valor.toLocaleString('pt-BR')}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">
                Juiz
              </p>
              <p className="text-gray-900 font-medium mt-2">{state.process.juiz || '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Card>
        <Tabs
          items={[
            { label: 'Visão Geral', value: 'overview', content: null },
            { label: 'Partes', value: 'parties', content: null },
            { label: 'Movimentos', value: 'movements', content: null },
            { label: 'Documentos', value: 'documents', content: null },
          ]}
          defaultValue={activeTab}
          onChange={setActiveTab}
        />

        <CardContent className="pt-6">
          {/* Visão Geral */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Tribunal</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{state.process.tribunal}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Classe</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {state.process.classe?.split(' ')[0]}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Status</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{state.process.status}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Aberto em</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {state.process.dataAbertura
                      ? new Date(state.process.dataAbertura).toLocaleDateString('pt-BR')
                      : '—'}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Última movimentação</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {state.movements[0]
                      ? new Date(state.movements[0].data).toLocaleDateString('pt-BR')
                      : '—'}
                  </p>
                </div>
              </div>

              {state.process.descricao && (
                <div className="p-6 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Resumo</h3>
                  <p className="text-gray-700 leading-relaxed">{state.process.descricao}</p>
                </div>
              )}
            </div>
          )}

          {/* Partes */}
          {activeTab === 'parties' && (
            <>
              {state.parties.length === 0 ? (
                <Empty title="Nenhuma parte encontrada" />
              ) : (
                <div className="space-y-4">
                  {state.parties.map((party) => (
                    <div key={party.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{party.nome}</h4>
                        <Badge variant="info">{party.tipo}</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mt-3">
                        {party.cpfCnpj && (
                          <div>
                            <span className="text-gray-500">CPF/CNPJ: </span>
                            <span className="font-mono">{party.cpfCnpj}</span>
                          </div>
                        )}
                        {party.email && (
                          <div>
                            <span className="text-gray-500">Email: </span>
                            <a href={`mailto:${party.email}`} className="text-blue-600 hover:underline">
                              {party.email}
                            </a>
                          </div>
                        )}
                      </div>
                      {party.lawyers && party.lawyers.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Advogados</p>
                          <div className="space-y-2">
                            {party.lawyers.map((lawyer) => (
                              <div key={lawyer.id} className="text-sm text-gray-700 pl-4">
                                <span className="font-medium">{lawyer.nome}</span>
                                {lawyer.oab && <span className="text-gray-500 ml-2">OAB {lawyer.oab}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Movimentos */}
          {activeTab === 'movements' && (
            <>
              {state.movements.length === 0 ? (
                <Empty title="Nenhuma movimentação encontrada" />
              ) : (
                <div className="space-y-4">
                  {state.movements.map((movement, idx) => (
                    <div key={movement.id || idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-4 h-4 bg-blue-600 rounded-full mt-1.5"></div>
                        {idx < state.movements.length - 1 && (
                          <div className="w-0.5 h-12 bg-gray-300 my-1"></div>
                        )}
                      </div>
                      <div className="pb-4 flex-1 pt-1">
                        <p className="text-sm text-gray-500 font-medium">
                          {new Date(movement.data).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-gray-900 font-medium mt-1">{movement.descricao}</p>
                        {movement.orgao && (
                          <p className="text-sm text-gray-600 mt-1">Órgão: {movement.orgao}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Documentos */}
          {activeTab === 'documents' && (
            <>
              {state.documents.length === 0 ? (
                <Empty title="Nenhum documento encontrado" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Título</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Tipo</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Data</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-900">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.documents.map((doc) => (
                        <tr key={doc.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-900 font-medium">{doc.titulo}</td>
                          <td className="py-3 px-4 text-gray-600">{doc.tipo}</td>
                          <td className="py-3 px-4 text-gray-600">
                            {doc.dataCriacao
                              ? new Date(doc.dataCriacao).toLocaleDateString('pt-BR')
                              : '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                window.open(`/document/${doc.id}`, '_blank')
                              }
                            >
                              Ler
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ProcessDetail
