import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  throw new Error('Faltan las variables de Supabase. Ejecuta en frontend/: node scripts/generar-env.mjs')
}

// Solo la clave publishable: está pensada para el navegador y la BD se
// protege con RLS. La clave secret nunca debe llegar al frontend.
export const supabase = createClient<Database>(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
