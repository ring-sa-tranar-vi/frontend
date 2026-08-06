import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ClerkProvider } from '@clerk/react'

import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './i18n'
import {
  faro,
  getWebInstrumentations,
  initializeFaro,
  ReactIntegration,
} from '@grafana/faro-react'
import { TracingInstrumentation } from '@grafana/faro-web-tracing'

const faroUrl = import.meta.env.VITE_FARO_URL

if (faroUrl) {
  initializeFaro({
    url: import.meta.env.VITE_FARO_URL,
    app: {
      name: 'ringsatranarvi-frontend',
      version: '1.0.0',
      environment: import.meta.env.MODE || 'production',
    },
    instrumentations: [
      ...getWebInstrumentations(),
      new TracingInstrumentation(),
      new ReactIntegration(),
    ],
  })
} else {
  console.warn('Faro URL not found.')
}

const router = createRouter({ routeTree })
const queryClient = new QueryClient()

router.subscribe('onResolved', (search) => {
  const currentPath = search.toLocation.pathname
  faro.api.setView({ name: currentPath })
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      appearance={{
        variables: {
          colorPrimary: 'var(--brand-primary)',
          colorPrimaryForeground: 'var(--brand-on-primary)',
          colorBackground: 'var(--brand-page)',
          colorForeground: 'var(--brand-ink)',
          colorMutedForeground: 'var(--brand-muted)',
          colorNeutral: 'var(--brand-border)',
          colorInput: 'var(--brand-surface-soft)',
          colorInputForeground: 'var(--brand-ink)',
        },
        elements: {
          cardBox: 'shadow-none',
          card: 'shadow-none',
          socialButtonsBlockButton: 'shadow-none',
          formFieldInput: 'shadow-none',
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ClerkProvider>
  </StrictMode>,
)
