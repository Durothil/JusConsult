/**
 * Lógica de TTL e cache
 */

const CACHE_TTL = {
  PROCESS_OVERVIEW: 24 * 60 * 60, // 24 horas
  PROCESS_MOVEMENTS: 6 * 60 * 60, // 6 horas
  PROCESS_DOCUMENTS: 6 * 60 * 60, // 6 horas
  PROCESS_PARTIES: 24 * 60 * 60, // 24 horas
  PRECEDENTS: 7 * 24 * 60 * 60, // 7 dias
}

interface CacheEntry {
  timestamp: number
  ttl: number
  data: any
}

const memoryCache = new Map<string, CacheEntry>()

/**
 * Gera chave de cache
 */
export function getCacheKey(tipo: string, id: string): string {
  return `${tipo}:${id}`
}

/**
 * Verifica se cache é válido
 */
export function isCacheValid(key: string): boolean {
  const entry = memoryCache.get(key)
  if (!entry) return false

  const now = Date.now()
  const age = (now - entry.timestamp) / 1000
  return age < entry.ttl
}

/**
 * Obtém dados do cache
 */
export function getCache<T>(key: string): T | null {
  if (!isCacheValid(key)) {
    memoryCache.delete(key)
    return null
  }

  const entry = memoryCache.get(key)
  return entry ? (entry.data as T) : null
}

/**
 * Salva dados no cache
 */
export function setCache<T>(key: string, data: T, ttl: number): void {
  memoryCache.set(key, {
    timestamp: Date.now(),
    ttl,
    data,
  })
}

/**
 * Limpa cache específico
 */
export function clearCache(key: string): void {
  memoryCache.delete(key)
}

/**
 * Limpa todo cache
 */
export function clearAllCache(): void {
  memoryCache.clear()
}

/**
 * Retorna TTL apropriado por tipo
 */
export function getTTLForType(tipo: string): number {
  return CACHE_TTL[tipo as keyof typeof CACHE_TTL] || 3600
}
