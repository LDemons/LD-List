import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { useBorrarItem, useFicha, type Ficha } from '@/api/catalogo'
import { useEntradaDeItem, useQuitarEntrada } from '@/api/entradas'
import { EntradaForm } from '@/components/items/EntradaForm'
import { NotaBadge } from '@/components/items/NotaBadge'
import { Portada } from '@/components/items/Portada'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  anio,
  ESTADO,
  FORMATO_ANIME,
  PROVEEDOR,
  ROL,
  TIPO,
  TIPO_ALBUM,
  type CreditRole,
} from '@/lib/dominio'
import { mensajeError } from '@/lib/errores'

export const Route = createFileRoute('/_app/item/$id')({
  params: {
    parse: ({ id }) => {
      if (!/^\d{1,15}$/.test(id)) throw notFound()
      return { id: Number(id) }
    },
    stringify: ({ id }) => ({ id: String(id) }),
  },
  component: PaginaItem,
})

function PaginaItem() {
  const { id } = Route.useParams()
  const { usuario } = Route.useRouteContext()
  const ficha = useFicha(id)
  const entrada = useEntradaDeItem(id)

  if (ficha.isPending || entrada.isPending) {
    return <Skeleton className="h-96 rounded-xl" />
  }
  if (ficha.isError || entrada.isError) {
    return <p role="alert" className="text-destructive">{mensajeError(ficha.error ?? entrada.error)}</p>
  }
  if (!ficha.data) {
    return <p className="text-muted-foreground">Este ítem no existe o fue borrado.</p>
  }

  const f = ficha.data
  const e = entrada.data

  return (
    <div className="grid gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/" search={{ tipo: f.type }}>
          <ArrowLeft /> {TIPO[f.type].plural}
        </Link>
      </Button>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <Portada url={f.cover_url} tipo={f.type} titulo={f.title} className="mx-auto w-44 shadow-lg md:w-full" />
        <div className="grid content-start gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{TIPO[f.type].singular}</Badge>
            {e && <Badge variant="outline">{ESTADO[e.status]}</Badge>}
            {e?.score != null && <NotaBadge nota={e.score} className="text-lg" />}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{f.title}</h1>
          {f.original_title && f.original_title !== f.title && (
            <p className="text-muted-foreground italic">{f.original_title}</p>
          )}
          <Datos ficha={f} />
          {f.synopsis && <p className="leading-relaxed text-muted-foreground">{f.synopsis}</p>}
          {f.external_ref.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Datos de {f.external_ref.map((r) => PROVEEDOR[r.provider]).join(', ')}
            </p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{e ? 'Mi calificación' : 'Agregar a mi lista'}</CardTitle>
        </CardHeader>
        <CardContent>
          <EntradaForm key={e?.id ?? 'nueva'} mediaItemId={f.id} entrada={e ?? null} />
        </CardContent>
      </Card>

      <ZonaPeligro mediaItemId={f.id} entradaId={e?.id ?? null} esMio={f.created_by === usuario.id} />
    </div>
  )
}

function Datos({ ficha: f }: { ficha: Ficha }) {
  const filas: [string, string][] = []
  const agregar = (etiqueta: string, valor: string | number | null | undefined) => {
    if (valor !== null && valor !== undefined && valor !== '') filas.push([etiqueta, String(valor)])
  }

  agregar('Año', anio(f.release_date))
  agregar('Duración', f.film[0]?.runtime_minutes ? `${f.film[0].runtime_minutes} min` : null)
  agregar('Temporadas', f.series[0]?.season_count)
  agregar('Episodios', f.series[0]?.episode_count ?? f.anime[0]?.episode_count)
  agregar('Formato', f.anime[0]?.format ? FORMATO_ANIME[f.anime[0].format] : null)
  agregar('Plataformas', f.game[0]?.platforms.join(', '))
  agregar('Tipo', f.album[0] ? TIPO_ALBUM[f.album[0].kind] : null)
  agregar('Pistas', f.album[0]?.track_count)
  const s = f.song[0]?.duration_seconds
  agregar('Duración', s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : null)

  const porRol = new Map<CreditRole, string[]>()
  for (const c of [...f.media_credit].sort((a, b) => a.position - b.position)) {
    if (!c.creator) continue
    porRol.set(c.role, [...(porRol.get(c.role) ?? []), c.creator.name])
  }
  for (const [rol, nombres] of porRol) agregar(ROL[rol], nombres.join(', '))
  agregar('Géneros', f.genre.map((g) => g.name).join(', '))

  if (!filas.length) return null
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {filas.map(([etiqueta, valor], i) => (
        <div key={i} className="contents">
          <dt className="text-muted-foreground">{etiqueta}</dt>
          <dd>{valor}</dd>
        </div>
      ))}
    </dl>
  )
}

function ZonaPeligro({ mediaItemId, entradaId, esMio }: { mediaItemId: number; entradaId: number | null; esMio: boolean }) {
  const navigate = useNavigate()
  const quitar = useQuitarEntrada()
  const borrar = useBorrarItem()

  if (!entradaId && !esMio) return null

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {entradaId && (
        <Confirmar
          titulo="¿Quitar de tu lista?"
          descripcion="Se borrarán tu nota, fechas y notas personales de este ítem. El ítem sigue en el catálogo."
          accion="Quitar de mi lista"
          pendiente={quitar.isPending}
          onConfirmar={() =>
            quitar.mutate(entradaId, {
              onSuccess: () => toast.success('Quitado de tu lista'),
              onError: (error) => toast.error(mensajeError(error)),
            })
          }
        />
      )}
      {esMio && (
        <Confirmar
          titulo="¿Borrar del catálogo?"
          descripcion="Se borra el ítem con todos sus datos. Solo es posible si nadie lo tiene en su lista (quítalo primero de la tuya)."
          accion="Borrar del catálogo"
          pendiente={borrar.isPending}
          onConfirmar={() =>
            borrar.mutate(mediaItemId, {
              onSuccess: () => {
                toast.success('Ítem borrado')
                void navigate({ to: '/' })
              },
              onError: (error) => toast.error(mensajeError(error)),
            })
          }
        />
      )}
    </div>
  )
}

function Confirmar(props: {
  titulo: string
  descripcion: string
  accion: string
  pendiente: boolean
  onConfirmar: () => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={props.pendiente} className="text-destructive">
          <Trash2 /> {props.accion}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{props.titulo}</AlertDialogTitle>
          <AlertDialogDescription>{props.descripcion}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={props.onConfirmar}>{props.accion}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
