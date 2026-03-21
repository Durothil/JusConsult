import { z } from 'zod'

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default('http://localhost:3001'),
  VITE_USE_MOCK: z.enum(['true', 'false']).default('false'),
  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_KEY: z.string().optional(),
  VITE_API_SECRET: z.string().optional(),
})

const _parsed = envSchema.safeParse(import.meta.env)
if (!_parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:', _parsed.error.flatten().fieldErrors)
}

export const env = _parsed.success ? _parsed.data : envSchema.parse({}) // fall back to defaults
