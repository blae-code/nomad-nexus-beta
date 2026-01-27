import './App.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom'

import { Toaster } from "@/components/ui/toaster"
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import pagesConfig, { PAGE_ROUTE_ALIASES, PAGE_ROUTE_OVERRIDES } from '@/pages.config'
import PageNotFound from './lib/PageNotFound'
import { AuthProvider, useAuth } from '@/lib/AuthContext'
import UserNotRegisteredError from '@/components/UserNotRegisteredError'
import { createPageUrl } from '@/utils'
import AccessGateFallback from './pages/AccessGate'
import CommsDevTest from './pages/CommsDevTest'

// =====================================================
// Load pages from filesystem (Vite)
// =====================================================
const pagesGlob = import.meta.glob('./pages/*.jsx', { eager: true })
const pagesFromFs = Object.entries(pagesGlob).reduce((acc, [path, module]) => {
  const name = path.match(/\/(\w+)\.jsx$/)?.[1]
  const component = module?.default ?? (name ? module?.[name] : undefined)
  if (name && typeof component === 'function') {
    acc[name] = component
  }
  return acc
}, {})

// =====================================================
// Merge + filter Pages safely
// (prevents rendering objects from pages.config)
// =====================================================
const pagesFromConfig =
  pagesConfig?.Pages && typeof pagesConfig.Pages === 'object'
    ? pagesConfig.Pages
    : {}

const mergedPages = { ...pagesFromFs, ...pagesFromConfig }
const resolvedPages = Object.fromEntries(
  Object.entries(mergedPages).filter(([, Page]) => typeof Page === 'function')
)

// =====================================================
// Layout resolver (handles module objects gracefully)
// =====================================================
const resolveComponent = (x) => {
  if (!x) return null
  if (typeof x === 'function') return x
  if (typeof x === 'object' && typeof x.default === 'function') return x.default
  if (typeof x === 'object' && typeof x.Component === 'function') return x.Component
  return null
}

const LayoutComp = resolveComponent(pagesConfig?.Layout)
const LayoutWrapper = ({ children, currentPageName }) =>
  LayoutComp ? (
    <LayoutComp currentPageName={currentPageName}>{children}</LayoutComp>
  ) : (
    <>{children}</>
  )

// Prefer Hub if present; otherwise first available page
const mainPageKey =
  pagesConfig?.mainPage ??
  (resolvedPages.Hub ? 'Hub' : Object.keys(resolvedPages)[0])

const MainPage =
  mainPageKey && resolvedPages[mainPageKey] ? resolvedPages[mainPageKey] : () => <></>

// Ensure AccessGate exists (always)
const AccessGate = resolvedPages.AccessGate || pagesFromFs.AccessGate || AccessGateFallback

// Always include common access gate aliases for demo reliability
const accessGatePaths = Array.from(
  new Set([
    PAGE_ROUTE_OVERRIDES?.AccessGate ?? createPageUrl('AccessGate'),
    ...(PAGE_ROUTE_ALIASES?.AccessGate ?? []),
    '/accessgate',
    '/access-gate',
    '/login',
  ])
)

const buildPageRoutes = () => {
  return Object.entries(resolvedPages).flatMap(([pageKey, Page]) => {
    const canonicalPath = PAGE_ROUTE_OVERRIDES?.[pageKey] ?? createPageUrl(pageKey)
    const aliases = PAGE_ROUTE_ALIASES?.[pageKey] ?? []
    const paths = Array.from(new Set([canonicalPath, ...aliases]))

    return paths.map((path) => (
      <Route
        key={`${pageKey}-${path}`}
        path={path}
        element={
          <LayoutWrapper currentPageName={pageKey}>
            <Page />
          </LayoutWrapper>
        }
      />
    ))
  })
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth()

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    )
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />
    }
    if (authError.type === 'auth_required') {
      navigateToLogin()
      return null
    }
  }

  const homePath = mainPageKey
    ? (PAGE_ROUTE_OVERRIDES?.[mainPageKey] ?? createPageUrl(mainPageKey))
    : '/hub'

  return (
    <Routes>
      {/* Always redirect root to home */}
      <Route path="/" element={<Navigate to={homePath} replace />} />

      {/* Access gate aliases (always available) */}
      {accessGatePaths.map((path) => (
        <Route
          key={`accessgate-${path}`}
          path={path}
          element={
            <LayoutWrapper currentPageName="AccessGate">
              <AccessGate />
            </LayoutWrapper>
          }
        />
      ))}

      {/* All pages (functions only) */}
      {buildPageRoutes()}

      {/* Dev comms test */}
      {import.meta.env.DEV && (
        <Route
          path="/__dev/comms-test"
          element={
            <LayoutWrapper currentPageName="__dev-comms-test">
              <CommsDevTest />
            </LayoutWrapper>
          }
        />
      )}

      {/* Fallback */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}
