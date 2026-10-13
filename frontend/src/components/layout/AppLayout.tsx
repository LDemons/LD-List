import { Link } from '@tanstack/react-router'
import { ListChecks, LogOut, Plus, Settings, Trophy, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { SelectorTema } from '@/components/layout/SelectorTema'
import ShinyText from '@/components/reactbits/ShinyText'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

const NAV: { to: '/' | '/agregar' | '/mi-lista' | '/ajustes'; texto: string; icono: LucideIcon }[] = [
  { to: '/', texto: 'Rankings', icono: Trophy },
  { to: '/agregar', texto: 'Agregar', icono: Plus },
  { to: '/mi-lista', texto: 'Mi lista', icono: ListChecks },
  { to: '/ajustes', texto: 'Ajustes', icono: Settings },
]

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-background focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <Link to="/" className="text-xl font-bold tracking-tight" aria-label="LD-List, ir a Rankings">
            <ShinyText text="LD-List" speed={3} />
          </Link>
          <nav className="hidden flex-1 items-center gap-1 sm:flex" aria-label="Principal">
            {NAV.map(({ to, texto, icono: Icono }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === '/' }}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                activeProps={{ className: 'bg-accent text-accent-foreground font-medium' }}
              >
                <Icono className="size-4" aria-hidden />
                {texto}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <SelectorTema />
            <Button variant="ghost" size="icon" onClick={() => supabase.auth.signOut()} aria-label="Cerrar sesión">
              <LogOut />
            </Button>
          </div>
        </div>
      </header>

      <main id="contenido" className="mx-auto max-w-5xl px-4 pt-6 pb-24 sm:pb-10">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-background/95 backdrop-blur sm:hidden"
        aria-label="Principal"
      >
        {NAV.map(({ to, texto, icono: Icono }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === '/' }}
            className="flex flex-col items-center gap-0.5 py-2 text-xs text-muted-foreground"
            activeProps={{ className: 'text-primary font-medium' }}
          >
            <Icono className="size-5" aria-hidden />
            {texto}
          </Link>
        ))}
      </nav>
    </div>
  )
}
