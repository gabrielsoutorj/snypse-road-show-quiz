import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ErrorPage, LoadingPage } from './components/PageState'

const PinEntryPage = lazy(() =>
  import('./pages/PinEntryPage').then((module) => ({ default: module.PinEntryPage })),
)
const NicknamePage = lazy(() =>
  import('./pages/NicknamePage').then((module) => ({ default: module.NicknamePage })),
)
const ParticipantLobbyPage = lazy(() =>
  import('./pages/ParticipantLobbyPage').then((module) => ({ default: module.ParticipantLobbyPage })),
)
const HostStartPage = lazy(() =>
  import('./pages/HostStartPage').then((module) => ({ default: module.HostStartPage })),
)
const HostLobbyPage = lazy(() =>
  import('./pages/HostLobbyPage').then((module) => ({ default: module.HostLobbyPage })),
)
const ScreenLobbyPage = lazy(() =>
  import('./pages/ScreenLobbyPage').then((module) => ({ default: module.ScreenLobbyPage })),
)
const DesignPreviewPage = lazy(() =>
  import('./pages/DesignPreviewPage').then((module) => ({ default: module.DesignPreviewPage })),
)

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingPage message="Carregando…" />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  { path: '/', element: <LazyPage><PinEntryPage /></LazyPage> },
  { path: '/join/:pin', element: <LazyPage><NicknamePage /></LazyPage> },
  { path: '/play/:sessionId', element: <LazyPage><ParticipantLobbyPage /></LazyPage> },
  { path: '/host', element: <LazyPage><HostStartPage /></LazyPage> },
  { path: '/host/:sessionId', element: <LazyPage><HostLobbyPage /></LazyPage> },
  { path: '/screen/:sessionId', element: <LazyPage><ScreenLobbyPage /></LazyPage> },
  ...(import.meta.env.DEV
    ? [{ path: '/design-preview/:stage', element: <LazyPage><DesignPreviewPage /></LazyPage> }]
    : []),
  {
    path: '/session-invalid',
    element: (
      <ErrorPage
        title="Sala indisponível"
        message="Confira o código exibido no telão e tente novamente."
      />
    ),
  },
  { path: '*', element: <Navigate to="/session-invalid" replace /> },
], { basename: import.meta.env.BASE_URL })
