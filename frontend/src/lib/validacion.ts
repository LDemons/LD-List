// Validación de todo lo que escribe el usuario. Refleja los CHECK de la base de
// datos (supabase/migrations) para dar errores claros antes de enviar; la BD
// vuelve a validar todo de todos modos.

import { z } from 'zod'

import type { Json } from '@/lib/database.types'
import {
  ALBUM_KINDS,
  ANIME_FORMATS,
  ENTRY_STATUSES,
  MEDIA_TYPES,
  type CreditRole,
  type MediaType,
} from '@/lib/dominio'

// 1.0 a 10.0 con un decimal como máximo; acepta coma o punto. Se rechaza en vez
// de redondear porque numeric(3,1) redondearía en silencio (9.85 -> 9.9).
const NOTA_RE = /^(10([.,]0)?|[1-9]([.,]\d)?)$/
const NOTA_MENSAJE = 'La nota va de 1.0 a 10.0 con un decimal como máximo'

export function parsearNota(valor: string): number | null {
  const v = valor.trim()
  return NOTA_RE.test(v) ? Number(v.replace(',', '.')) : null
}

export const notaSchema = z
  .string()
  .trim()
  .regex(NOTA_RE, NOTA_MENSAJE)
  .transform((v) => Number(v.replace(',', '.')))

export const notaOpcionalSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === '') return null
    const nota = parsearNota(v)
    if (nota === null) {
      ctx.addIssue({ code: 'custom', message: NOTA_MENSAJE })
      return z.NEVER
    }
    return nota
  })

function textoOpcional(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .transform((v) => (v === '' ? null : v))
}

function fechaOpcional(desde = '1800-01-01', hasta = '2200-12-31') {
  return z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === '') return null
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`))) {
        ctx.addIssue({ code: 'custom', message: 'Fecha inválida' })
        return z.NEVER
      }
      if (v < desde || v > hasta) {
        ctx.addIssue({ code: 'custom', message: `La fecha debe estar entre ${desde.slice(0, 4)} y ${hasta.slice(0, 4)}` })
        return z.NEVER
      }
      return v
    })
}

function enteroOpcional(min: number, max: number) {
  return z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === '') return null
      const n = Number(v)
      if (!/^\d+$/.test(v) || n < min || n > max) {
        ctx.addIssue({ code: 'custom', message: `Debe ser un número entero entre ${min} y ${max}` })
        return z.NEVER
      }
      return n
    })
}

/** Lista separada por comas: "Acción, Drama". */
function listaTexto(maxElementos: number, maxLargo: number) {
  return z
    .string()
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )
    .refine((l) => l.length <= maxElementos, `Máximo ${maxElementos} elementos`)
    .refine((l) => l.every((s) => s.length <= maxLargo), `Cada elemento admite hasta ${maxLargo} caracteres`)
}

const urlHttpsOpcional = z
  .string()
  .trim()
  .max(2048, 'Máximo 2048 caracteres')
  .transform((v, ctx) => {
    if (v === '') return null
    let url: URL
    try {
      url = new URL(v)
    } catch {
      ctx.addIssue({ code: 'custom', message: 'URL inválida' })
      return z.NEVER
    }
    if (url.protocol !== 'https:') {
      ctx.addIssue({ code: 'custom', message: 'La portada debe ser una URL https://' })
      return z.NEVER
    }
    return url.toString()
  })

/** "3:45" o "225" (segundos) -> segundos. */
const duracionOpcional = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === '') return null
    const m = /^(?:(\d{1,3}):)?(\d{1,5})$/.exec(v)
    const segundos = m ? Number(m[1] ?? 0) * 60 + Number(m[2]) : NaN
    if (!m || (m[1] !== undefined && Number(m[2]) > 59) || segundos < 1 || segundos > 86400) {
      ctx.addIssue({ code: 'custom', message: 'Usa minutos:segundos, por ejemplo 3:45' })
      return z.NEVER
    }
    return segundos
  })

export const loginSchema = z.object({
  email: z.string().trim().max(254, 'Email demasiado largo').pipe(z.email('Email inválido')),
  password: z.string().min(1, 'Escribe tu contraseña').max(128, 'Contraseña demasiado larga'),
})

export const entradaSchema = z
  .object({
    status: z.enum(ENTRY_STATUSES),
    score: notaOpcionalSchema,
    started_on: fechaOpcional('1900-01-01'),
    finished_on: fechaOpcional('1900-01-01'),
    notes: textoOpcional(5000),
  })
  .refine((d) => !d.started_on || !d.finished_on || d.finished_on >= d.started_on, {
    message: 'La fecha de término no puede ser anterior a la de inicio',
    path: ['finished_on'],
  })

export const busquedaSchema = z
  .string()
  .trim()
  .min(2, 'Escribe al menos 2 caracteres')
  .max(100, 'Máximo 100 caracteres')

export const ROL_PRINCIPAL: Record<MediaType, CreditRole> = {
  film: 'director',
  series: 'creator',
  game: 'developer',
  anime: 'studio',
  album: 'artist',
  song: 'artist',
}

export const itemManualSchema = z.object({
  type: z.enum(MEDIA_TYPES),
  title: z.string().trim().min(1, 'El título es obligatorio').max(300, 'Máximo 300 caracteres'),
  original_title: textoOpcional(300),
  release_date: fechaOpcional(),
  cover_url: urlHttpsOpcional,
  synopsis: textoOpcional(5000),
  creators: listaTexto(20, 200),
  genres: listaTexto(20, 50),
  runtime_minutes: enteroOpcional(1, 2000),
  season_count: enteroOpcional(1, 500),
  episode_count: enteroOpcional(1, 20000),
  end_date: fechaOpcional(),
  platforms: listaTexto(30, 50),
  anime_format: z.union([z.enum(ANIME_FORMATS), z.literal('')]).transform((v) => v || null),
  album_kind: z.enum(ALBUM_KINDS),
  track_count: enteroOpcional(1, 1000),
  duration: duracionOpcional,
  track_number: enteroOpcional(1, 1000),
})

export type ItemManualEntrada = z.input<typeof itemManualSchema>
export type ItemManual = z.output<typeof itemManualSchema>

/** Convierte el formulario manual al formato de public.create_media_item. */
export function itemManualAPayload(v: ItemManual): Json {
  const detalles: Record<MediaType, Record<string, Json>> = {
    film: { runtime_minutes: v.runtime_minutes },
    series: { season_count: v.season_count, episode_count: v.episode_count, end_date: v.end_date },
    game: { platforms: v.platforms },
    anime: { format: v.anime_format, episode_count: v.episode_count, end_date: v.end_date },
    album: { kind: v.album_kind, track_count: v.track_count },
    song: { duration_seconds: v.duration, track_number: v.track_number },
  }
  return {
    type: v.type,
    title: v.title,
    original_title: v.original_title,
    release_date: v.release_date,
    cover_url: v.cover_url,
    synopsis: v.synopsis,
    details: detalles[v.type],
    creators: v.creators.map((name) => ({ name, role: ROL_PRINCIPAL[v.type] })),
    genres: v.genres,
  }
}

/** Escapa los comodines de ILIKE para buscar el texto tal cual. */
export function escaparIlike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`)
}
