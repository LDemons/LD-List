import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Outlet,
  notFoundComponent: NoEncontrado,
})

function NoEncontrado() {
  return (
    <main className="grid min-h-svh place-items-center p-6 text-center">
      <div className="grid gap-4">
        <p className="text-6xl font-bold text-primary">404</p>
        <p className="text-muted-foreground">Esta página no existe.</p>
        <Button asChild>
          <Link to="/">Volver al ranking</Link>
        </Button>
      </div>
    </main>
  )
}
