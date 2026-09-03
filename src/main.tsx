import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { BackgroundMusic } from './components/BackgroundMusic'
import { router } from './router'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <BackgroundMusic />
      <RouterProvider router={router} />
    </AppErrorBoundary>
  </StrictMode>,
)
