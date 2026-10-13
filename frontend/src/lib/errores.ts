// Traduce errores de Supabase a mensajes para el usuario sin exponer detalles
// internos de la base de datos.

const LIMITE = 'Demasiadas solicitudes. Espera un minuto e intenta de nuevo.'

type ErrorConCodigo = {
  code?: unknown
  status?: unknown
  message?: unknown
  context?: unknown
}

export function mensajeError(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Ocurrió un error inesperado.'
  const e = error as ErrorConCodigo
  const code = typeof e.code === 'string' ? e.code : undefined
  const status = typeof e.status === 'number' ? e.status : undefined
  const contexto = e.context instanceof Response ? e.context : undefined

  if (status === 429 || contexto?.status === 429 || code === 'rate_limit' || code === 'P0429') return LIMITE
  if (code === 'invalid_credentials') return 'Email o contraseña incorrectos.'
  if (code === '42501' || status === 401 || status === 403 || contexto?.status === 401) {
    return 'No tienes permiso para hacer esto o tu sesión expiró.'
  }
  // Los mensajes 22023 los escriben nuestras funciones SQL y son seguros de mostrar.
  if (code === '22023' && typeof e.message === 'string') return e.message
  if (code === '23505') return 'Ese elemento ya existe.'
  if (code === '23503') return 'No se puede completar: hay datos relacionados.'
  if (code === '23514' || code?.startsWith('22')) return 'Algún dato no es válido. Revisa el formulario.'
  if (e instanceof TypeError || code === 'FunctionsFetchError') return 'No hay conexión con el servidor.'
  return 'Ocurrió un error inesperado.'
}
