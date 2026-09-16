import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { validateEnv } from '@/lib/env'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import App from '@/App'
import '@/styles/globals.css'

// Validate all required environment variables before mounting. In development
// this throws immediately with a readable message; in production it logs a
// warning and continues rather than crashing the live deployment.
validateEnv()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/*
      Root-level boundary: catches catastrophic errors before the Router or
      any provider has mounted. Uses window.location for navigation because
      React Router is not yet available at this level.
    */}
    <ErrorBoundary name="App">
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
