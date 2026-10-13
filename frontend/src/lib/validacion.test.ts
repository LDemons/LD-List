import { describe, expect, it } from 'vitest'

import {
  entradaSchema,
  escaparIlike,
  itemManualAPayload,
  itemManualSchema,
  loginSchema,
  notaOpcionalSchema,
  notaSchema,
  type ItemManualEntrada,
} from '@/lib/validacion'

describe('nota', () => {
  it.each([
    ['9.8', 9.8],
    ['9,8', 9.8],
    ['10', 10],
    ['10.0', 10],
    ['1', 1],
    [' 5.5 ', 5.5],
  ])('acepta %s', (entrada, esperado) => {
    expect(notaSchema.parse(entrada)).toBe(esperado)
  })

  it.each(['9.85', '10.5', '0.9', '0', '11', 'abc', '', '9.', '.5', '-5', '1e1'])('rechaza %s', (entrada) => {
    expect(notaSchema.safeParse(entrada).success).toBe(false)
  })

  it('opcional: vacío es null', () => {
    expect(notaOpcionalSchema.parse('')).toBeNull()
    expect(notaOpcionalSchema.safeParse('9.85').success).toBe(false)
  })
})

describe('entrada', () => {
  const base = { status: 'completed', score: '9.5', started_on: '', finished_on: '', notes: '' } as const

  it('normaliza vacíos a null', () => {
    expect(entradaSchema.parse(base)).toEqual({
      status: 'completed',
      score: 9.5,
      started_on: null,
      finished_on: null,
      notes: null,
    })
  })

  it('rechaza término antes del inicio', () => {
    expect(entradaSchema.safeParse({ ...base, started_on: '2024-05-02', finished_on: '2024-05-01' }).success).toBe(false)
  })

  it('rechaza notas de más de 5000 caracteres y estados inválidos', () => {
    expect(entradaSchema.safeParse({ ...base, notes: 'x'.repeat(5001) }).success).toBe(false)
    expect(entradaSchema.safeParse({ ...base, status: 'otro' }).success).toBe(false)
  })
})

describe('login', () => {
  it('valida email', () => {
    expect(loginSchema.safeParse({ email: 'no-es-email', password: 'x' }).success).toBe(false)
    expect(loginSchema.safeParse({ email: ' yo@ejemplo.com ', password: 'x' }).success).toBe(true)
  })
})

describe('ítem manual', () => {
  const vacio: ItemManualEntrada = {
    type: 'film',
    title: 'Interstellar',
    original_title: '',
    release_date: '2014-11-07',
    cover_url: '',
    synopsis: '',
    creators: 'Christopher Nolan',
    genres: 'Ciencia ficción, Drama',
    runtime_minutes: '169',
    season_count: '',
    episode_count: '',
    end_date: '',
    platforms: '',
    anime_format: '',
    album_kind: 'album',
    track_count: '',
    duration: '',
    track_number: '',
  }

  it('arma el payload de create_media_item', () => {
    const payload = itemManualAPayload(itemManualSchema.parse(vacio))
    expect(payload).toMatchObject({
      type: 'film',
      title: 'Interstellar',
      details: { runtime_minutes: 169 },
      creators: [{ name: 'Christopher Nolan', role: 'director' }],
      genres: ['Ciencia ficción', 'Drama'],
    })
  })

  it('solo acepta portadas https', () => {
    expect(itemManualSchema.safeParse({ ...vacio, cover_url: 'http://x.com/a.jpg' }).success).toBe(false)
    expect(itemManualSchema.safeParse({ ...vacio, cover_url: 'javascript:alert(1)' }).success).toBe(false)
    expect(itemManualSchema.safeParse({ ...vacio, cover_url: 'https://x.com/a.jpg' }).success).toBe(true)
  })

  it('valida longitudes y rangos', () => {
    expect(itemManualSchema.safeParse({ ...vacio, title: 'x'.repeat(301) }).success).toBe(false)
    expect(itemManualSchema.safeParse({ ...vacio, title: '   ' }).success).toBe(false)
    expect(itemManualSchema.safeParse({ ...vacio, runtime_minutes: '0' }).success).toBe(false)
    expect(itemManualSchema.safeParse({ ...vacio, runtime_minutes: '12.5' }).success).toBe(false)
    expect(itemManualSchema.safeParse({ ...vacio, release_date: '2020-13-45' }).success).toBe(false)
    expect(itemManualSchema.safeParse({ ...vacio, genres: Array(21).fill('g').join(',') }).success).toBe(false)
  })

  it('convierte la duración de una canción', () => {
    const v = itemManualSchema.parse({ ...vacio, type: 'song', duration: '3:45' })
    expect(itemManualAPayload(v)).toMatchObject({ details: { duration_seconds: 225 } })
    expect(itemManualSchema.safeParse({ ...vacio, type: 'song', duration: '3:75' }).success).toBe(false)
  })
})

describe('escaparIlike', () => {
  it('escapa comodines', () => {
    expect(escaparIlike('100%_a\\b')).toBe('100\\%\\_a\\\\b')
  })
})
