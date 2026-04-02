export interface ContratoFechado {
  id: string
  cliente_id: string
  cod_cliente: number
  nome: string
  contato: string
  demanda: string
  fase: string
  data_assinatura: string
  valor_contrato: number | null
  pagamento_inicial: boolean
  boleto_emitido: boolean
  observacoes: string
  status_operacional: string
}

export interface MesFechado {
  mes: string
  label: string
  total: number
  valor_total: number
  contratos: ContratoFechado[]
}

export interface ClientesFechadosData {
  totais: {
    total_ano: number
    este_mes: number
    media_mes: number
    valor_total_ano: number
    valor_total_mes: number
  }
  meses: MesFechado[]
}
