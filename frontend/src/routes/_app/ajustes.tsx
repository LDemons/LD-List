import { createFileRoute } from '@tanstack/react-router'
import { LogOut, Settings } from 'lucide-react'

import { TEMAS } from '@/components/layout/SelectorTema'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/tema'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/ajustes')({
  component: Ajustes,
})

function Ajustes() {
  const { usuario } = Route.useRouteContext()
  const { theme, setTheme } = useTheme()

  return (
    <div className="grid max-w-xl gap-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <Settings className="size-6 text-primary" aria-hidden /> Ajustes
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Apariencia</CardTitle>
          <CardDescription>Con “Sistema” se usa el tema de tu dispositivo.</CardDescription>
        </CardHeader>
        <CardContent>
          <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-2">
            {TEMAS.map(({ valor, texto, icono: Icono }) => (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={(theme ?? 'system') === valor}
                onClick={() => setTheme(valor)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm transition-colors hover:bg-accent',
                  (theme ?? 'system') === valor && 'border-primary bg-primary/10 text-primary',
                )}
              >
                <Icono className="size-5" aria-hidden />
                {texto}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cuenta</CardTitle>
          <CardDescription>Sesión iniciada como {usuario.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>
            <LogOut /> Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
