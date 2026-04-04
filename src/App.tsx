import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import Layout from '@/components/layout/Layout'
import Home from '@/pages/Home'
import ProcessDetail from '@/pages/ProcessDetail'
import DocumentViewer from '@/pages/DocumentViewer'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'

// Lazy-loaded pages
const PrecedentsPage = lazy(() => import('@/pages/PrecedentsPage'))
const SearchCPF = lazy(() => import('@/pages/SearchCPF'))
const MeusProcessos = lazy(() => import('@/pages/MeusProcessos'))
const FilaDiligencias = lazy(() => import('@/pages/FilaDiligencias'))
const DashboardOperacional = lazy(() => import('@/pages/DashboardOperacional'))
const DashboardTempos = lazy(() => import('@/pages/DashboardTempos'))
const ChatIA = lazy(() => import('@/pages/ChatIA'))
const Clientes = lazy(() => import('@/pages/Clientes'))
const Configuracoes = lazy(() => import('@/pages/Configuracoes'))
const Financeiro = lazy(() => import('@/pages/Financeiro'))
const Comunicacao = lazy(() => import('@/pages/Comunicacao'))
const ClientesFechados = lazy(() => import('@/pages/ClientesFechados'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10_000),
    },
  },
})

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-600">Carregando...</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="/process/:cnj" element={<ProcessDetail />} />
                <Route path="/document/:documentId" element={<DocumentViewer />} />
                <Route path="/precedents" element={<Suspense fallback={<PageLoader />}><PrecedentsPage /></Suspense>} />
                <Route path="/search-cpf" element={<Suspense fallback={<PageLoader />}><SearchCPF /></Suspense>} />
                <Route path="/meus-processos" element={<Suspense fallback={<PageLoader />}><MeusProcessos /></Suspense>} />
                <Route path="/diligencias" element={<Suspense fallback={<PageLoader />}><FilaDiligencias /></Suspense>} />
                <Route path="/dashboard-operacional" element={<Suspense fallback={<PageLoader />}><DashboardOperacional /></Suspense>} />
                <Route path="/dashboard-tempos" element={<Suspense fallback={<PageLoader />}><DashboardTempos /></Suspense>} />
                <Route path="/ia" element={<Suspense fallback={<PageLoader />}><ChatIA /></Suspense>} />
                <Route path="/clientes" element={<Suspense fallback={<PageLoader />}><Clientes /></Suspense>} />
                <Route path="/comunicacao" element={<Suspense fallback={<PageLoader />}><Comunicacao /></Suspense>} />
                <Route path="/financeiro" element={<Suspense fallback={<PageLoader />}><Financeiro /></Suspense>} />
                <Route path="/clientes-fechados" element={<Suspense fallback={<PageLoader />}><ClientesFechados /></Suspense>} />
                <Route path="/configuracoes" element={<Suspense fallback={<PageLoader />}><Configuracoes /></Suspense>} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
