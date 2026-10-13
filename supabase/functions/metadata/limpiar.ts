// Ajusta los datos de los proveedores a los límites de la base de datos
// (CHECK de supabase/migrations) para que create_media_item no los rechace.

export function texto(valor: unknown, max: number): string | null {
  if (typeof valor !== 'string') return null
  const limpio = valor.replace(/\s+/g, ' ').trim()
  if (!limpio) return null
  return limpio.length > max ? `${limpio.slice(0, max - 1)}…` : limpio
}

/** Quita etiquetas HTML simples (AniList) y normaliza saltos de línea. */
export function sinHtml(valor: unknown, max: number): string | null {
  if (typeof valor !== 'string') return null
  const plano = valor
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (!plano) return null
  return plano.length > max ? `${plano.slice(0, max - 1)}…` : plano
}

export function entero(valor: unknown, min: number, max: number): number | null {
  const n = typeof valor === 'string' ? Number(valor) : valor
  return typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max ? n : null
}

/** "1997", "1997-05" o "1997-05-21" -> "1997-05-21" (completa con 01); fuera de rango -> null. */
export function fecha(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(valor.trim())
  if (!m) return null
  const iso = `${m[1]}-${m[2] ?? '01'}-${m[3] ?? '01'}`
  if (Number.isNaN(Date.parse(`${iso}T00:00:00Z`))) return null
  return iso >= '1800-01-01' && iso <= '2200-12-31' ? iso : null
}

export function fechaUnix(segundos: unknown): string | null {
  if (typeof segundos !== 'number' || !Number.isFinite(segundos)) return null
  return fecha(new Date(segundos * 1000).toISOString())
}

export function anio(iso: string | null): string | null {
  return iso ? iso.slice(0, 4) : null
}

/** Solo URLs https válidas y de longitud razonable. */
export function urlHttps(valor: unknown): string | null {
  if (typeof valor !== 'string' || valor.length > 2048) return null
  try {
    const url = new URL(valor)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

/** Lista de textos únicos, recortada a los límites dados. */
export function lista(valores: unknown[], maxElementos: number, maxLargo: number): string[] {
  const vistos = new Set<string>()
  const resultado: string[] = []
  for (const v of valores) {
    const t = texto(v, maxLargo)
    if (!t || vistos.has(t.toLowerCase())) continue
    vistos.add(t.toLowerCase())
    resultado.push(t)
    if (resultado.length >= maxElementos) break
  }
  return resultado
}

export function creditos(nombres: unknown[], rol: string, max = 10) {
  return lista(nombres, max, 200).map((name) => ({ name, role: rol }))
}
