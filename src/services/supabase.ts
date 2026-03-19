/**
 * Cliente Supabase para cache layer
 */

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not configured. Cache will be disabled.')
}

const supabase: SupabaseClient | null = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

export { supabase }

/**
 * Verifica e retorna dados em cache se válido
 */
export async function getFromCache<T>(
  tipo: string,
  chaveId: string
): Promise<T | null> {
  if (!supabase) return null

  try {
    // Verifica metadados de cache
    const { data: cacheMeta } = await supabase
      .from('cache_metadata')
      .select('proxima_atualizacao_em')
      .eq('tipo_dado', tipo)
      .eq('chave_id', chaveId)
      .single()

    if (!cacheMeta) return null

    const agora = new Date()
    const proximaAtualizacao = new Date(cacheMeta.proxima_atualizacao_em)

    if (agora < proximaAtualizacao) {
      // Cache ainda é válido
      return null // Será implementado com dados reais
    }

    return null
  } catch (error) {
    console.error('Cache check error:', error)
    return null
  }
}

/**
 * Atualiza metadados de cache
 */
export async function updateCacheMetadata(
  tipo: string,
  chaveId: string,
  ttlSegundos = 3600
): Promise<void> {
  if (!supabase) return

  try {
    const agora = new Date()
    const proximaAtualizacao = new Date(agora.getTime() + ttlSegundos * 1000)

    await supabase.from('cache_metadata').upsert(
      {
        tipo_dado: tipo,
        chave_id: chaveId,
        last_fetch_from_mcp: agora.toISOString(),
        ttl_segundos: ttlSegundos,
        proxima_atualizacao_em: proximaAtualizacao.toISOString(),
      },
      { onConflict: 'tipo_dado,chave_id' }
    )
  } catch (error) {
    console.error('Cache metadata update error:', error)
  }
}

/**
 * Log de auditoria
 */
export async function logAccess(
  acao: string,
  tipoDado: string,
  referenciaId: string
): Promise<void> {
  if (!supabase) return

  try {
    await supabase.from('audit_logs').insert({
      acao,
      tipo_dado: tipoDado,
      referencia_id: referenciaId,
      user_ip: 'browser',
      user_agent: navigator.userAgent,
    })
  } catch (error) {
    console.error('Audit log error:', error)
  }
}
