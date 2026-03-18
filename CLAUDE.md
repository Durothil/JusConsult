# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**RPAtec** (Reactive Process Analysis - TecJustica) is a React/TypeScript MVP frontend for querying Brazilian judicial processes via the TecJustica MCP server. It integrates with Supabase for intelligent caching, reducing MCP calls and accelerating repeated queries.

## Development Commands

```bash
# Start dev server (Vite, localhost:5173 or next available port)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Type checking
npm run type-check

# Linting (configured with ESLint)
npm run lint

# Testing (when configured)
npm run test
```

## Project Structure

```
src/
├── components/
│   ├── layout/           # Header, Navigation, Layout wrapper
│   ├── common/           # Reusable UI: Button, Card, Badge, Loading, Empty, Tabs
│   └── process/          # Process-specific (not yet componentized from pages)
├── pages/
│   ├── Home.tsx          # Landing/search entry point
│   ├── ProcessDetail.tsx # Full process view with 4 tabs
│   ├── DocumentViewer.tsx # Document text viewer with copy/PDF actions
│   ├── PrecedentsPage.tsx # Legal precedent search interface
│   └── NotFound.tsx      # 404 fallback
├── services/
│   ├── api.ts            # Axios HTTP client with baseURL
│   ├── supabase.ts       # Supabase client initialization
│   ├── cache.ts          # TTL/cache logic utilities
│   ├── process.service.ts
│   ├── document.service.ts
│   ├── precedent.service.ts
│   └── mock/             # Mock data for dev (mockProcessData.ts, etc.)
├── types/
│   ├── process.ts        # Process, Party, Movement interfaces
│   ├── document.ts       # Document interface
│   └── precedent.ts      # Precedent interface
├── hooks/                # React Query hooks (useProcess, useDocuments, etc.)
├── App.tsx               # Router setup with React Router v6
└── main.tsx
```

## Routing

Defined in `src/App.tsx` with React Router v6:

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Home.tsx | Search entry point |
| `/process/:cnj` | ProcessDetail.tsx | Full process details + tabs |
| `/document/:documentId` | DocumentViewer.tsx | Document text + actions |
| `/precedents` | PrecedentsPage.tsx | Precedent search |
| `*` | NotFound.tsx | 404 |

## High-Level Architecture

### Data Flow Pattern

1. **Request**: Component/hook calls service function (e.g., `getProcessByCNJ(cnj)`)
2. **Cache Check**: Service checks Supabase `cache_metadata` table for TTL validity
3. **Cache Hit**: If TTL valid, return data from `processes` table (or relevant table)
4. **Cache Miss**: Call MCP server via HTTP, store result in Supabase, update TTL metadata
5. **Return**: Component receives data + renders

**Key files**:
- `src/services/cache.ts` — `checkCache()`, `updateCacheMetadata()` logic
- `src/services/process.service.ts` — Implements pattern for process queries
- `src/services/supabase.ts` — Supabase client + utilities

### State Management

- **React Query** (TanStack Query) for server state + caching
- **useState** for local UI state (tabs, form inputs, loading flags)
- **useParams** for route params (e.g., CNJ number from `/process/:cnj`)
- **useNavigate** for programmatic navigation

### Page State Patterns

All pages follow this interface pattern:

```typescript
interface PageState {
  data: DataType | null
  loading: boolean
  error: string | null
  [otherFields]: any
}
```

Example: `ProcessDetail` uses `ProcessState` with process, parties, movements, documents fields.

**Always use**:
- `useEffect` with `Promise.all()` for parallel loads
- Mock data as fallback during dev (toggle via `VITE_USE_MOCK` env var)
- Proper error boundaries + Empty/PageLoading components for UX

## Supabase Integration

### Caching Strategy

**TTL by Data Type** (defined in `cache_metadata` table):

| Type | TTL | Reason |
|------|-----|--------|
| `process_overview` | 24h | Stable, rarely changes |
| `process_movements` | 6h | Frequent updates |
| `process_documents` | 6h | New attachments added |
| `precedents` | 7d | Jurisprudence stable |

**Key tables**:
- `processes` — Process summaries + metadata
- `process_parties` — Parties + lawyers (complete data, no masking)
- `process_movements` — Immutable timeline
- `process_documents` — Document metadata + extracted text
- `precedents_cache` — Search results cache
- `cache_metadata` — TTL tracking per data type
- `audit_logs` — Immutable access logs

**Setup**:
- URL: `https://jtvojfqjtwfwcvqocadk.supabase.co`
- Key: See `.env` file
- Migrations: Run SQL from `supabase/migrations/001_init.sql`

## Environment Variables

Create `.env` (not in git):

```env
# Vite
VITE_USE_MOCK=false                                    # true=mocks, false=real API

# Supabase
VITE_SUPABASE_URL=https://jtvojfqjtwfwcvqocadk.supabase.co
VITE_SUPABASE_KEY=sb_publishable_YfNnAZVWPzuS39xVgXAueQ_AND-Luk0

# API (MCP gateway)
VITE_API_BASE_URL=https://tecjusticamcp-lite-production.up.railway.app
TECJUSTICA_AUTH_TOKEN=<your-bearer-token>
```

## TecJustica MCP Integration

The MCP server exposes 8+ tools for judicial data:
- `pdpj_visao_geral_processo` — Process summary by CNJ
- `pdpj_buscar_processos` — Find by CPF/CNPJ
- `pdpj_buscar_precedentes` — Search jurisprudence
- `pdpj_list_partes`, `pdpj_list_movimentos`, `pdpj_list_documentos`
- `pdpj_read_documento`, `pdpj_read_documentos_batch`, `pdpj_get_documento_url`

**Usage in services**: Wrap MCP calls in try/catch, always check cache first, store results in Supabase.

## UI/Design Principles

- **Tailwind CSS** for utility-first styling
- **Refined minimalist aesthetic**: Clean typography, generous spacing, serif fonts for legal content
- **Consistent colors**: Blue accent (`blue-600`), gray scales for neutrals
- **Components**: Reusable Button, Card, Badge, Tab components in `src/components/common/`
- **Responsiveness**: Mobile-first with `md:` breakpoints

## Common Development Workflows

### Adding a New Page

1. Create `src/pages/NewPage.tsx` with useState/useEffect pattern
2. Add route in `src/App.tsx` under `<Route element={<Layout />}>`
3. Create service functions in `src/services/` if needed
4. Use mock data during dev (`VITE_USE_MOCK=true`)

### Adding a Service Function

1. Create in `src/services/[domain].service.ts`
2. Follow pattern: check cache → call MCP → update Supabase → return
3. Use `cache.ts` utilities for TTL management
4. Import and use in pages/hooks

### Testing Routes

```bash
npm run dev
# Navigate to http://localhost:5173 (or printed port)
# Test routes: /, /process/:cnj, /document/:id, /precedents, /404
```

### Working with Mock Data

Mock data lives in `src/services/mock/`. Use `VITE_USE_MOCK=true` in `.env` to bypass HTTP calls. Useful for rapid UI development without backend.

## Path Resolution

- Import alias `@/` resolves to `src/`
- Configured in `vite.config.ts` and `tsconfig.json`
- Always use: `import Component from '@/components/...'`

## Build & Deployment

```bash
npm run build  # Outputs to dist/
npm run preview # Test production build locally
```

Deploy `dist/` folder to static host (Vercel, Netlify, etc).

## Type Checking

TypeScript strict mode enabled. Check types locally:

```bash
npx tsc --noEmit
```

## Known Limitations (MVP)

- ❌ No user authentication (single-tenant for now)
- ❌ No real-time updates (cache TTL-based only)
- ❌ No offline support
- ⚠️ Mock data used in dev; real MCP integration pending

## Roadmap (v2+)

- User authentication + personal dashboards
- Advanced filtering (date range, tribunal, status)
- Export to PDF
- Dark mode
- Notifications on case updates
- Jurisprudence analytics/trends

---

**Last Updated**: 2026-03-18
