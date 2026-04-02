import { useQuery } from '@tanstack/react-query'
import { listarContratosCliente } from '@/services/zapsign.service'

interface Props {
  clienteId: string
}

function formatarData(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('pt-BR')
}

export function ContratosZapsign({ clienteId }: Props) {
  const { data: contratos, isLoading, isError } = useQuery({
    queryKey: ['zapsign-contratos', clienteId],
    queryFn: () => listarContratosCliente(clienteId),
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2].map(i => (
          <div key={i} className="h-14 animate-pulse rounded-md bg-gray-100" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className="py-2 text-sm text-gray-500">
        Não foi possível carregar os contratos.
      </p>
    )
  }

  if (!contratos || contratos.length === 0) {
    return (
      <p className="py-2 text-sm text-gray-500">Nenhum contrato assinado.</p>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      {contratos.map(c => (
        <div
          key={c.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
              {c.tipo_contrato}
            </span>
            <span className="text-sm font-medium text-gray-800">
              {c.signatario_nome}
            </span>
            <span className="text-xs text-gray-500">
              {formatarData(c.data_assinatura)}
            </span>
            {c.status_zapsign === 'SIGNED' ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Assinado
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {c.status_zapsign}
              </span>
            )}
          </div>
          {c.url_contrato_assinado && (
            <a
              href={c.url_contrato_assinado}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-slate-600 underline-offset-2 hover:underline"
            >
              Ver documento
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
