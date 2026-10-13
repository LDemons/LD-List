import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { lazy, Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'

import { Campo } from '@/components/Campo'
import SplitText from '@/components/reactbits/SplitText'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { mensajeError } from '@/lib/errores'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/lib/tema'
import { loginSchema } from '@/lib/validacion'

// El fondo animado (WebGL) se carga aparte para no pesar en el resto de la app.
const Aurora = lazy(() => import('@/components/reactbits/Aurora'))

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) throw redirect({ to: '/' })
  },
  component: Login,
})

function Login() {
  const navigate = useNavigate()
  const { resolvedTheme } = useTheme()
  const [error, setError] = useState<string | null>(null)
  const reducirMovimiento =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const form = useForm<z.input<typeof loginSchema>, unknown, z.output<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })
  const errores = form.formState.errors

  const entrar = form.handleSubmit(async ({ email, password }) => {
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      // Mensaje genérico: no revela si el email existe.
      setError(error.status === 429 ? mensajeError(error) : 'Email o contraseña incorrectos.')
      form.resetField('password')
      return
    }
    await navigate({ to: '/' })
  })

  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70" aria-hidden>
        <Suspense fallback={null}>
          <Aurora
            colorStops={['#7c3aed', '#c084fc', '#4f46e5']}
            lightMode={resolvedTheme === 'light'}
            paused={reducirMovimiento}
            amplitude={1.1}
            blend={0.6}
          />
        </Suspense>
      </div>

      <Card className="w-full max-w-sm bg-card/80 backdrop-blur">
        <CardHeader className="text-center">
          <SplitText text="LD-List" tag="h1" className="text-4xl font-bold tracking-tight" splitType="chars" delay={40} />
          <CardDescription>Tu registro personal de películas, series, juegos, anime y música.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={entrar} noValidate className="grid gap-4">
            <Campo id="email" etiqueta="Email" error={errores.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                aria-invalid={!!errores.email}
                {...form.register('email')}
              />
            </Campo>
            <Campo id="password" etiqueta="Contraseña" error={errores.password?.message}>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                maxLength={128}
                aria-invalid={!!errores.password}
                {...form.register('password')}
              />
            </Campo>
            {error && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
