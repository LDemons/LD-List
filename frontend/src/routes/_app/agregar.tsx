import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2, PencilLine, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

import { useBuscarMetadata, useImportarMetadata, type Candidato } from '@/api/metadata'
import { EntradaForm } from '@/components/items/EntradaForm'
import { ItemManualForm } from '@/components/items/ItemManualForm'
import { Portada } from '@/components/items/Portada'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useDebounced } from '@/hooks/useDebounced'
import { MEDIA_TYPES, PROVEEDOR, TIPO, type MediaType } from '@/lib/dominio'
import { mensajeError } from '@/lib/errores'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { busquedaSchema } from '@/lib/validacion'

const busqueda = z.object({
  tipo: z.enum(MEDIA_TYPES).default('film').catch('film'),
})

export const Route = createFileRoute('/_app/agregar')({
  validateSearch: busqueda,
  component: Agregar,
})

function Agregar() {
  const { tipo } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()
  const [texto, setTexto] = useState('')
  const [manual, setManual] = useState(false)
  const [nuevoId, setNuevoId] = useState<number | null>(null)
  const [importando, setImportando] = useState<string | null>(null)

  const consulta = useDebounced(texto.trim(), 400)
  const valida = busquedaSchema.safeParse(consulta)
  const resultados = useBuscarMetadata(tipo, valida.success ? valida.data : '')
  const importar = useImportarMetadata()

  /** Si ya está en la lista, lleva a la ficha; si no, abre el diálogo para calificar. */
  const continuarCon = async (mediaItemId: number) => {
    const { data, error } = await supabase.from('entry').select('id').eq('media_item_id', mediaItemId).maybeSingle()
    if (error) {
      toast.error(mensajeError(error))
      return
    }
    if (data) {
      toast.info('Ya está en tu lista')
      await navigate({ to: '/item/$id', params: { id: mediaItemId } })
      return
    }
    setNuevoId(mediaItemId)
  }

  const agregarCandidato = async (c: Candidato) => {
    setImportando(c.externalId)
    try {
      const id = await importar.mutateAsync(c)
      await continuarCon(id)
    } catch (error) {
      toast.error(mensajeError(error))
    } finally {
      setImportando(null)
    }
  }

  const cambiarTipo = (t: MediaType) => {
    setManual(false)
    void navigate({ search: { tipo: t } })
  }

  return (
    <div className="grid gap-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <Plus className="size-6 text-primary" aria-hidden /> Agregar
      </h1>

      <div role="radiogroup" aria-label="Categoría" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {MEDIA_TYPES.map((t) => {
          const Icono = TIPO[t].icono
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={t === tipo}
              onClick={() => cambiarTipo(t)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm transition-colors hover:bg-accent',
                t === tipo && 'border-primary bg-primary/10 font-medium text-primary',
              )}
            >
              <Icono className="size-5" aria-hidden />
              {TIPO[t].singular}
            </button>
          )
        })}
      </div>

      {!manual ? (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={100}
              placeholder={`Buscar ${TIPO[tipo].singular.toLowerCase()}…`}
              aria-label={`Buscar ${TIPO[tipo].singular.toLowerCase()}`}
              className="h-11 pl-9"
              autoFocus
            />
          </div>

          <Resultados
            consulta={valida.success ? consulta : ''}
            cargando={resultados.isFetching}
            error={resultados.error}
            candidatos={resultados.data}
            importando={importando}
            onAgregar={agregarCandidato}
          />

          <div className="flex justify-center">
            <Button variant="ghost" onClick={() => setManual(true)}>
              <PencilLine /> ¿No lo encuentras? Agrégalo a mano
            </Button>
          </div>
        </>
      ) : (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Nuevo: {TIPO[tipo].singular.toLowerCase()}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setManual(false)}>
              <Search /> Volver a buscar
            </Button>
          </CardHeader>
          <CardContent>
            <ItemManualForm key={tipo} tipo={tipo} tituloInicial={texto.trim()} onCreado={continuarCon} />
          </CardContent>
        </Card>
      )}

      <Dialog open={nuevoId !== null} onOpenChange={(abierto) => !abierto && setNuevoId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar a mi lista</DialogTitle>
            <DialogDescription>Elige el estado y, si quieres, la nota.</DialogDescription>
          </DialogHeader>
          {nuevoId !== null && (
            <EntradaForm
              mediaItemId={nuevoId}
              entrada={null}
              onGuardado={() => {
                const id = nuevoId
                setNuevoId(null)
                void queryClient.invalidateQueries({ queryKey: ['ranking'] })
                void navigate({ to: '/item/$id', params: { id } })
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Resultados(props: {
  consulta: string
  cargando: boolean
  error: unknown
  candidatos: Candidato[] | undefined
  importando: string | null
  onAgregar: (c: Candidato) => void
}) {
  if (!props.consulta) {
    return <p className="text-center text-sm text-muted-foreground">Escribe al menos 2 caracteres para buscar.</p>
  }
  if (props.error) {
    return (
      <p role="alert" className="text-center text-destructive">
        {mensajeError(props.error)}
      </p>
    )
  }
  if (props.cargando && !props.candidatos) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
        ))}
      </div>
    )
  }
  if (!props.candidatos?.length) {
    return <p className="text-center text-muted-foreground">Sin resultados para “{props.consulta}”.</p>
  }

  return (
    <ul className={cn('grid grid-cols-2 gap-3 sm:grid-cols-4', props.cargando && 'opacity-60')} aria-busy={props.cargando}>
      {props.candidatos.map((c) => (
        <li key={`${c.provider}-${c.externalId}`} className="flex flex-col gap-2 rounded-lg border bg-card p-2">
          <Portada url={c.coverUrl} tipo={c.type} titulo={c.title} className="w-full" />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-medium">{c.title}</p>
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {[c.year, c.subtitle].filter(Boolean).join(' · ') || PROVEEDOR[c.provider]}
            </p>
          </div>
          <Button size="sm" disabled={props.importando !== null} onClick={() => props.onAgregar(c)}>
            {props.importando === c.externalId ? <Loader2 className="animate-spin" /> : <Plus />}
            Agregar
          </Button>
        </li>
      ))}
    </ul>
  )
}
