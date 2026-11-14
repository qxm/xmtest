import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { createQueryClient } from './app/query-client'
import './index.css'
import { configureApiReadiness } from './api/readiness'
import { ensureMockApiReady } from './mocks/runtime'

async function bootstrap() {
  configureApiReadiness(ensureMockApiReady)
  try {
    await ensureMockApiReady()
  } catch (error) {
    // Render anyway so the error is visible instead of a blank page.
    console.error(
      'Mock API failed to start. Check that public/mockServiceWorker.js exists.',
      error,
    )
  }

  const queryClient = createQueryClient()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void bootstrap()
