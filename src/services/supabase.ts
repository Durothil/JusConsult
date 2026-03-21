/**
 * Cliente Supabase — somente leitura no frontend.
 * Todas as escritas são feitas pelo backend com service_role key.
 */

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

const supabase: SupabaseClient | null = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

export { supabase }

/**
 * Verifica se o cache ainda é válido para evitar chamada ao MCP
 */
export async function getFromCacheMetadata(
  tipo: string,
  chaveId: string
): Promise<boolean> {
  if (!supabase) return false

  try {
    const { data: cacheMeta } = await supabase
      .from('cache_metadata')
      .select('proxima_atualizacao_em')
      .eq('tipo_dado', tipo)
      .eq('chave_id', chaveId)
      .single()

    if (!cacheMeta) return false

    return new Date() < new Date(cacheMeta.proxima_atualizacao_em)
  } catch {
    return false
  }
}
