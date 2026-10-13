import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { AppLayout } from '@/components/layout/AppLayout'
import { supabase } from '@/lib/supabase'

// Todas las rutas dentro de _app requieren sesión. La protección real de los
// datos está en el RLS de la base de datos; esto solo evita pantallas vacías.
export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) throw redirect({ to: '/login' })
    return { usuario: data.session.user }
  },
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
})
