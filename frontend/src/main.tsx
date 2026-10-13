import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { supabase } from '@/lib/supabase'
import { ProveedorTema } from '@/lib/tema'
import { routeTree } from '@/routeTree.gen'

import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
})

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Al cerrar sesión se borra todo lo cacheado del usuario.
supabase.auth.onAuthStateChange((evento) => {
  if (evento === 'SIGNED_OUT') {
    queryClient.clear()
    void router.navigate({ to: '/login' })
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProveedorTema>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster richColors closeButton />
        </TooltipProvider>
      </QueryClientProvider>
    </ProveedorTema>
  </StrictMode>,
)
