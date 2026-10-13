import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { useCrearItem } from '@/api/catalogo'
import { Campo, claseSelect } from '@/components/Campo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ALBUM_KINDS, ANIME_FORMATS, FORMATO_ANIME, ROL, TIPO, TIPO_ALBUM, type MediaType } from '@/lib/dominio'
import { mensajeError } from '@/lib/errores'
import {
  itemManualAPayload,
  itemManualSchema,
  ROL_PRINCIPAL,
  type ItemManual,
  type ItemManualEntrada,
} from '@/lib/validacion'

type Props = {
  tipo: MediaType
  tituloInicial?: string
  onCreado: (mediaItemId: number) => void
}

export function ItemManualForm({ tipo, tituloInicial = '', onCreado }: Props) {
  const crear = useCrearItem()
  const form = useForm<ItemManualEntrada, unknown, ItemManual>({
    resolver: zodResolver(itemManualSchema),
    defaultValues: {
      type: tipo,
      title: tituloInicial,
      original_title: '',
      release_date: '',
      cover_url: '',
      synopsis: '',
      creators: '',
      genres: '',
      runtime_minutes: '',
      season_count: '',
      episode_count: '',
      end_date: '',
      platforms: '',
      anime_format: '',
      album_kind: 'album',
      track_count: '',
      duration: '',
      track_number: '',
    },
  })
  const { register } = form
  const e = form.formState.errors

  const enviar = form.handleSubmit(async (valores) => {
    try {
      const id = await crear.mutateAsync(itemManualAPayload(valores))
      onCreado(id)
    } catch (error) {
      toast.error(mensajeError(error))
    }
  })

  const numero = (campo: keyof ItemManualEntrada, etiqueta: string, max: number) => (
    <Campo id={campo} etiqueta={etiqueta} error={e[campo]?.message}>
      <Input id={campo} inputMode="numeric" maxLength={String(max).length} {...register(campo)} />
    </Campo>
  )

  return (
    <form onSubmit={enviar} noValidate className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="title" etiqueta="Título *" error={e.title?.message} className="sm:col-span-2">
          <Input id="title" maxLength={300} {...register('title')} />
        </Campo>
        <Campo id="original_title" etiqueta="Título original" error={e.original_title?.message}>
          <Input id="original_title" maxLength={300} {...register('original_title')} />
        </Campo>
        <Campo id="release_date" etiqueta="Fecha de estreno" error={e.release_date?.message}>
          <Input id="release_date" type="date" {...register('release_date')} />
        </Campo>
        <Campo
          id="creators"
          etiqueta={ROL[ROL_PRINCIPAL[tipo]]}
          error={e.creators?.message}
          ayuda="Separa varios nombres con comas"
        >
          <Input id="creators" maxLength={2000} {...register('creators')} />
        </Campo>
        <Campo id="genres" etiqueta="Géneros" error={e.genres?.message} ayuda="Separados por comas">
          <Input id="genres" maxLength={1000} {...register('genres')} />
        </Campo>

        {tipo === 'film' && numero('runtime_minutes', 'Duración (minutos)', 2000)}
        {tipo === 'series' && (
          <>
            {numero('season_count', 'Temporadas', 500)}
            {numero('episode_count', 'Episodios', 20000)}
          </>
        )}
        {tipo === 'game' && (
          <Campo id="platforms" etiqueta="Plataformas" error={e.platforms?.message} ayuda="Ej.: PC, Switch">
            <Input id="platforms" maxLength={1500} {...register('platforms')} />
          </Campo>
        )}
        {tipo === 'anime' && (
          <>
            <Campo id="anime_format" etiqueta="Formato" error={e.anime_format?.message}>
              <select id="anime_format" className={claseSelect} {...register('anime_format')}>
                <option value="">Sin especificar</option>
                {ANIME_FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {FORMATO_ANIME[f]}
                  </option>
                ))}
              </select>
            </Campo>
            {numero('episode_count', 'Episodios', 20000)}
          </>
        )}
        {tipo === 'album' && (
          <>
            <Campo id="album_kind" etiqueta="Tipo de álbum" error={e.album_kind?.message}>
              <select id="album_kind" className={claseSelect} {...register('album_kind')}>
                {ALBUM_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {TIPO_ALBUM[k]}
                  </option>
                ))}
              </select>
            </Campo>
            {numero('track_count', 'Número de pistas', 1000)}
          </>
        )}
        {tipo === 'song' && (
          <>
            <Campo id="duration" etiqueta="Duración" error={e.duration?.message} ayuda="minutos:segundos, ej. 3:45">
              <Input id="duration" maxLength={9} {...register('duration')} />
            </Campo>
            {numero('track_number', 'Número de pista', 1000)}
          </>
        )}
        {(tipo === 'series' || tipo === 'anime') && (
          <Campo id="end_date" etiqueta="Fecha de finalización" error={e.end_date?.message}>
            <Input id="end_date" type="date" {...register('end_date')} />
          </Campo>
        )}

        <Campo id="cover_url" etiqueta="URL de la portada" error={e.cover_url?.message} ayuda="Solo https://" className="sm:col-span-2">
          <Input id="cover_url" type="url" maxLength={2048} placeholder="https://" {...register('cover_url')} />
        </Campo>
        <Campo id="synopsis" etiqueta="Sinopsis" error={e.synopsis?.message} className="sm:col-span-2">
          <Textarea id="synopsis" rows={3} maxLength={5000} {...register('synopsis')} />
        </Campo>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={crear.isPending}>
          {crear.isPending ? 'Creando…' : `Crear ${TIPO[tipo].singular.toLowerCase()}`}
        </Button>
      </div>
    </form>
  )
}
