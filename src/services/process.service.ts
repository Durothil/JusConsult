/**
 * Serviço de processos com integração Supabase
 */

import { getCacheKey, getCache, setCache, getTTLForType } from './cache'
import { Process, Party, ProcessMovement } from '@/types/process'
import * as mcpService from './mcp.service'

interface LawyerMCP {
  nome?: string
  oab?: string
  email?: string
}

interface PartyMCP {
  cpf_cnpj?: string
  nome?: string
  tipo?: string
  email?: string
  endereco?: string
  advogados?: LawyerMCP[]
}

interface MovementMCP {
  id?: string
  data?: string
  timestamp?: string
  tipo?: string
  type?: string
  descricao?: string
  description?: string
  orgao?: string
  org?: string
}

const CACHE_TYPE = 'process_overview'

/**
 * Busca processo por número CNJ
 * Supabase first → MCP fallback
 */
export async function getProcessByCNJ(cnj: string): Promise<Process | null> {
  const cacheKey = getCacheKey(CACHE_TYPE, cnj)

  // 1. Verifica cache em memória
  const cached = getCache<Process>(cacheKey)
  if (cached) {
    if (import.meta.env.DEV) console.log(`✓ Processo ${cnj} carregado do cache`)
    return cached
  }

  // 2. Chama MCP server para dados reais
  try {
    const mcpData = await mcpService.getProcessOverviewMCP(cnj)

    if (!mcpData) {
      console.error(`Processo ${cnj} não encontrado no MCP`)
      return null
    }

    // Converte resposta MCP para formato Process
    const data: Process = {
      cnj: mcpData.numero_processo || cnj,
      tribunal: mcpData.tribunal || '',
      classe: mcpData.classe || '',
      assunto: mcpData.assunto || '',
      status: mcpData.status || '',
      valor: mcpData.valor ? parseFloat(mcpData.valor.toString()) : 0,
      dataAbertura: mcpData.data_abertura ? new Date(mcpData.data_abertura) : new Date(),
      juiz: mcpData.juiz || '',
      vara: mcpData.vara || '',
      resumo: mcpData.resumo || JSON.stringify(mcpData),
    }

    const ttl = getTTLForType(CACHE_TYPE)
    setCache(cacheKey, data, ttl)
    return data
  } catch (error) {
    console.error(`Erro ao buscar processo ${cnj} do MCP:`, error)
    return null
  }
}

/**
 * Busca processos por CPF/CNPJ
 * Não usa cache (busca varável)
 */
export async function searchByCPFCNPJ(cpfCnpj: string, tribunal?: string) {
  try {
    const mcpData = await mcpService.searchProcessesMCP(cpfCnpj, tribunal)

    if (!mcpData) {
      console.warn(`Nenhum processo encontrado para ${cpfCnpj}`)
      return null
    }

    return mcpData
  } catch (error) {
    console.error(`Erro ao buscar por CPF/CNPJ ${cpfCnpj}:`, error)
    return null
  }
}

/**
 * Obtém partes de um processo
 */
export async function getProcessParties(cnj: string): Promise<Party[]> {
  const cacheKey = getCacheKey('process_parties', cnj)

  const cached = getCache<Party[]>(cacheKey)
  if (cached) {
    if (import.meta.env.DEV) console.log(`✓ Partes do processo ${cnj} carregadas do cache`)
    return cached
  }

  try {
    const mcpData = await mcpService.getPartiesMCP(cnj)

    if (!mcpData) {
      console.warn(`Nenhuma parte encontrada para ${cnj}`)
      return []
    }

    // Converte resposta MCP para formato Party
    const data: Party[] = (mcpData.POLO_ATIVO || []).concat(mcpData.POLO_PASSIVO || []).map((p: PartyMCP, idx: number) => ({
      id: p.cpf_cnpj || `party-${idx}`,
      nome: p.nome || '',
      tipo: p.tipo || 'PARTE',
      cpfCnpj: p.cpf_cnpj || '',
      email: p.email || '',
      endereco: p.endereco || '',
      lawyers: (p.advogados || []).map((a: LawyerMCP, aidx: number) => ({
        id: `lawyer-${idx}-${aidx}`,
        nome: a.nome || '',
        oab: a.oab || '',
        email: a.email || '',
      })),
    }))

    const ttl = getTTLForType('process_parties')
    setCache(cacheKey, data, ttl)
    return data
  } catch (error) {
    console.error(`Erro ao buscar partes do processo ${cnj}:`, error)
    return []
  }
}

/**
 * Obtém movimentos de um processo
 * Se houver devolução para primeira instância, armazena aviso em sessionStorage
 */
export async function getProcessMovements(cnj: string): Promise<ProcessMovement[]> {
  const cacheKey = getCacheKey('process_movements', cnj)

  const cached = getCache<ProcessMovement[]>(cacheKey)
  if (cached) {
    if (import.meta.env.DEV) console.log(`✓ Movimentos do processo ${cnj} carregados do cache`)
    return cached
  }

  try {
    const mcpData = await mcpService.getMovementsMCP(cnj)

    if (!mcpData) {
      console.warn(`Nenhum movimento encontrado para ${cnj}`)
      return []
    }

    // Detecta se há aviso de devolução (resposta com estrutura { movimentos, aviso, podeRefresh })
    const temAviso = mcpData.aviso && typeof mcpData.aviso === 'string'
    const movementsList = Array.isArray(mcpData) ? mcpData : (mcpData.movimentos || mcpData.movements || [])

    // Se há aviso, armazena em sessionStorage para o frontend exibir
    if (temAviso) {
      const avisoKey = `movimento_aviso_${cnj}`
      sessionStorage.setItem(avisoKey, JSON.stringify({
        aviso: mcpData.aviso,
        podeRefresh: mcpData.podeRefresh || false,
        timestamp: Date.now()
      }))
      console.log(`[movimentos] Detectado aviso para ${cnj}: ${mcpData.aviso}`)
    }

    // Converte resposta MCP para formato ProcessMovement
    const data: ProcessMovement[] = movementsList.map((m: MovementMCP) => ({
      id: m.id || `${m.data || m.timestamp}-${m.tipo || m.type || ''}-${(m.descricao || m.description || '').slice(0, 10)}`.replace(/\s/g, '-'),
      data: new Date(m.data || m.timestamp || Date.now()),
      tipo: m.tipo || m.type || '',
      descricao: m.descricao || m.description || '',
      orgao: m.orgao || m.org || '',
    }))

    const ttl = getTTLForType('process_movements')
    setCache(cacheKey, data, ttl)
    return data
  } catch (error) {
    console.error(`Erro ao buscar movimentos do processo ${cnj}:`, error)
    return []
  }
}

/**
 * Obtém aviso armazenado de devolução à primeira instância
 */
export function getMovementAviso(cnj: string) {
  const avisoKey = `movimento_aviso_${cnj}`
  const stored = sessionStorage.getItem(avisoKey)
  if (!stored) return null

  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

/**
 * Solicita atualização de movimentos com forceRefresh=true
 */
export async function refreshProcessMovements(cnj: string): Promise<ProcessMovement[]> {
  try {
    const mcpData = await mcpService.getMovementsMCPWithRefresh(cnj)

    if (!mcpData) {
      return []
    }

    // Detecta se há aviso
    const temAviso = mcpData.aviso && typeof mcpData.aviso === 'string'
    const movementsList = Array.isArray(mcpData) ? mcpData : (mcpData.movimentos || mcpData.movements || [])

    if (temAviso) {
      const avisoKey = `movimento_aviso_${cnj}`
      sessionStorage.setItem(avisoKey, JSON.stringify({
        aviso: mcpData.aviso,
        podeRefresh: mcpData.podeRefresh || false,
        timestamp: Date.now()
      }))
    } else {
      // Se não há mais aviso, remove do sessionStorage
      sessionStorage.removeItem(`movimento_aviso_${cnj}`)
    }

    // Converte resposta MCP para formato ProcessMovement
    const data: ProcessMovement[] = movementsList.map((m: MovementMCP) => ({
      id: m.id || `${m.data || m.timestamp}-${m.tipo || m.type || ''}-${(m.descricao || m.description || '').slice(0, 10)}`.replace(/\s/g, '-'),
      data: new Date(m.data || m.timestamp || Date.now()),
      tipo: m.tipo || m.type || '',
      descricao: m.descricao || m.description || '',
      orgao: m.orgao || m.org || '',
    }))

    // Atualiza cache
    const cacheKey = getCacheKey('process_movements', cnj)
    const ttl = getTTLForType('process_movements')
    setCache(cacheKey, data, ttl)

    return data
  } catch (error) {
    console.error(`Erro ao fazer refresh de movimentos do processo ${cnj}:`, error)
    return []
  }
}
