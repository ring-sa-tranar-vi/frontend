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

initializeFaro({
  url: 'https://faro-collector-prod-eu-north-0.grafana.net/collect/9e36dac7f625728f41392c8e7a905770',
  app: {
    name: 'ringsatranarvi-frontend',
    version: '1.0.0',
    environment: 'production',
  },
  instrumentations: [
    ...getWebInstrumentations(),
    new TracingInstrumentation(),
    new ReactIntegration(),
  ],
})

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
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ClerkProvider>
  </StrictMode>,
)
