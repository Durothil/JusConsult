import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Card, { CardContent, CardHeader } from '@/components/common/Card'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import { PageLoading } from '@/components/common/Loading'
import Empty from '@/components/common/Empty'
import { readDocument, getDocumentURL } from '@/services/document.service'
import type { Document } from '@/types/document'

interface DocumentViewerState {
  document: Document | null
  content: string | null
  loading: boolean
  error: string | null
  copied: boolean
}

const DocumentViewer: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>()
  const navigate = useNavigate()
  const [state, setState] = useState<DocumentViewerState>({
    document: null,
    content: null,
    loading: true,
    error: null,
    copied: false,
  })

  useEffect(() => {
    const loadDocument = async () => {
      if (!documentId) return

      try {
        setState((s) => ({ ...s, loading: true, error: null }))

        // Em produção, buscar documento real
        // const doc = await getDocument(documentId)
        // const content = await readDocument(documentId)

        // Mock data para desenvolvimento
        const mockDoc: Document = {
          id: documentId,
          titulo: 'Sentença - Processo Condenatório',
          tipo: 'Sentença',
          dataCriacao: new Date('2024-06-15'),
          paginas: 12,
          url: '#',
        }

        const mockContent = `PODER JUDICIÁRIO
TRIBUNAL DE JUSTIÇA DO ESTADO DE SÃO PAULO
COMARCA DE SÃO PAULO

Sentença

Vistos, etc.

${Array(8)
  .fill(null)
  .map(
    (_, i) => `Considerando que o presente feito trata de ${
      ['questão de direito civil', 'matéria contratual', 'obrigação de fazer', 'indenização por danos', 'responsabilidade extracontratual'][i % 5]
    }, e que os autos se encontram em condições de serem julgados, passo a análise das questões controvertidas.

Dos fatos, extrai-se que ${
      ['a autora comprou bens do réu', 'houve inadimplemento contratual', 'ocorreu dano material', 'a conduta foi negligente', 'havia cláusula penal'
      ][i % 5]
    }. A prova documental e testemunhal deixa clara a ${['culpa do demandado', 'boa-fé da autora', 'ocorrência do fato lesivo', 'nexo causal', 'quantia devida'][i % 5]}.`
  )
  .join('\n\n')}

Em face do exposto, JULGO procedente o pedido para condenar o réu ao pagamento de R$ 15.000,00 (quinze mil reais) a título de indenização pelos danos materiais, corrigidos monetariamente desde a data do fato e acrescidos de juros moratórios de 1% ao mês.

Condeno o réu ao pagamento das custas processuais e honorários advocatícios, que arbitro em 10% do valor da condenação.

Certifico que extraí cópia dessa sentença, a qual será enviada aos interessados via sistema eletrônico de processamento de autos.

São Paulo, 15 de junho de 2024.

Desembargador João Silva
Matrícula: 12345`

        setState({
          document: mockDoc,
          content: mockContent,
          loading: false,
          error: null,
          copied: false,
        })
      } catch (err) {
        setState((s) => ({
          ...s,
          error: 'Erro ao carregar documento',
          loading: false,
        }))
        console.error(err)
      }
    }

    loadDocument()
  }, [documentId])

  const handleCopyText = async () => {
    if (!state.content) return

    try {
      await navigator.clipboard.writeText(state.content)
      setState((s) => ({ ...s, copied: true }))
      setTimeout(() => {
        setState((s) => ({ ...s, copied: false }))
      }, 2000)
    } catch (err) {
      console.error('Erro ao copiar:', err)
    }
  }

  const handleOpenPDF = () => {
    if (state.document?.url) {
      window.open(state.document.url, '_blank')
    }
  }

  if (state.loading) return <PageLoading />

  if (state.error || !state.document || !state.content) {
    return (
      <div className="flex items-center justify-center py-16">
        <Empty
          title={state.error || 'Documento não encontrado'}
          description="Volte e tente novamente"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-b-4 border-b-amber-600">
        <CardContent className="py-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-3 font-serif">
                {state.document.titulo}
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="info">{state.document.tipo}</Badge>
                <span className="text-sm text-gray-500">
                  {state.document.dataCriacao
                    ? new Date(state.document.dataCriacao).toLocaleDateString('pt-BR')
                    : '—'}
                </span>
                {state.document.paginas && (
                  <span className="text-sm text-gray-500">
                    {state.document.paginas} página{state.document.paginas !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
              aria-label="Fechar visualizador"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyText}
              className="transition-all duration-200"
            >
              {state.copied ? '✓ Copiado!' : 'Copiar texto'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenPDF}
            >
              Abrir PDF original ↗
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Document Content */}
      <Card>
        <CardContent className="p-0">
          <div className="bg-white rounded-lg">
            <div className="prose prose-sm max-w-none overflow-hidden">
              <div className="p-8 bg-white text-gray-800 leading-relaxed space-y-4">
                {state.content.split('\n\n').map((paragraph, idx) => (
                  <p
                    key={idx}
                    className="text-justify text-base text-gray-700 whitespace-pre-wrap font-serif"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metadata Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2">
            Tipo
          </p>
          <p className="font-medium text-gray-900">{state.document.tipo}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2">
            Data
          </p>
          <p className="font-medium text-gray-900">
            {state.document.dataCriacao
              ? new Date(state.document.dataCriacao).toLocaleDateString('pt-BR')
              : '—'}
          </p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2">
            Extensão
          </p>
          <p className="font-medium text-gray-900">
            {state.document.paginas ? `PDF (${state.document.paginas}p)` : 'PDF'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default DocumentViewer
