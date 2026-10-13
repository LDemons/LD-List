import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link } from '@tanstack/react-router'
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import { useMemo, type ComponentProps, type ReactNode } from 'react'
import { toast } from 'sonner'

import { useReordenarEmpate, type FilaRanking } from '@/api/ranking'
import { NotaBadge } from '@/components/items/NotaBadge'
import { Portada } from '@/components/items/Portada'
import { Button } from '@/components/ui/button'
import { anio, formatearNota, TIPO, type MediaType } from '@/lib/dominio'
import { mensajeError } from '@/lib/errores'
import { cn } from '@/lib/utils'

type Props = { filas: FilaRanking[]; tipo: MediaType | 'global' }

/** Agrupa filas consecutivas con la misma nota. */
function agruparPorNota(filas: FilaRanking[]): FilaRanking[][] {
  const grupos: FilaRanking[][] = []
  for (const f of filas) {
    const ultimo = grupos.at(-1)
    if (ultimo && ultimo[0].score === f.score) ultimo.push(f)
    else grupos.push([f])
  }
  return grupos
}

export function RankingLista({ filas, tipo }: Props) {
  const grupos = useMemo(() => agruparPorNota(filas), [filas])
  const reordenar = useReordenarEmpate(tipo)

  const mover = (grupo: FilaRanking[], ids: number[]) => {
    reordenar.mutate(
      { nota: grupo[0].score, idsEnOrden: ids },
      { onError: (error) => toast.error(mensajeError(error)) },
    )
  }

  return (
    <ol className="grid gap-2" aria-label="Ranking">
      {grupos.map((grupo) =>
        grupo.length > 1 ? (
          <GrupoEmpate
            key={`${grupo[0].score}-${grupo[0].entry_id}`}
            grupo={grupo}
            mostrarTipo={tipo === 'global'}
            ocupado={reordenar.isPending}
            onMover={(ids) => mover(grupo, ids)}
          />
        ) : (
          <FilaItem key={grupo[0].entry_id} fila={grupo[0]} mostrarTipo={tipo === 'global'} />
        ),
      )}
    </ol>
  )
}

function GrupoEmpate({
  grupo,
  mostrarTipo,
  ocupado,
  onMover,
}: {
  grupo: FilaRanking[]
  mostrarTipo: boolean
  ocupado: boolean
  onMover: (ids: number[]) => void
}) {
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = grupo.map((f) => f.entry_id)

  const alSoltar = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    onMover(arrayMove(ids, ids.indexOf(Number(active.id)), ids.indexOf(Number(over.id))))
  }

  const desplazar = (indice: number, delta: -1 | 1) => onMover(arrayMove(ids, indice, indice + delta))

  return (
    <li className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-1.5">
      <p className="px-2 pb-1.5 text-xs text-muted-foreground">
        Empate en {formatearNota(grupo[0].score)}: arrastra o usa las flechas para decidir el orden
      </p>
      <DndContext sensors={sensores} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={alSoltar}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol className="grid gap-1.5">
            {grupo.map((fila, i) => (
              <FilaOrdenable
                key={fila.entry_id}
                fila={fila}
                mostrarTipo={mostrarTipo}
                ocupado={ocupado}
                primero={i === 0}
                ultimo={i === grupo.length - 1}
                onSubir={() => desplazar(i, -1)}
                onBajar={() => desplazar(i, 1)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </li>
  )
}

function FilaOrdenable({
  fila,
  mostrarTipo,
  ocupado,
  primero,
  ultimo,
  onSubir,
  onBajar,
}: {
  fila: FilaRanking
  mostrarTipo: boolean
  ocupado: boolean
  primero: boolean
  ultimo: boolean
  onSubir: () => void
  onBajar: () => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: fila.entry_id,
    disabled: ocupado,
  })

  return (
    <FilaItem
      ref={setNodeRef}
      fila={fila}
      mostrarTipo={mostrarTipo}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'z-10 shadow-lg ring-2 ring-primary')}
      inicio={
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Arrastrar ${fila.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      }
      fin={
        <div className="flex flex-col">
          <Button variant="ghost" size="icon" className="size-6" disabled={primero || ocupado} onClick={onSubir} aria-label={`Subir ${fila.title}`}>
            <ChevronUp />
          </Button>
          <Button variant="ghost" size="icon" className="size-6" disabled={ultimo || ocupado} onClick={onBajar} aria-label={`Bajar ${fila.title}`}>
            <ChevronDown />
          </Button>
        </div>
      }
    />
  )
}

const MEDALLA = ['text-amber-500 dark:text-amber-300', 'text-zinc-400 dark:text-zinc-300', 'text-orange-700 dark:text-orange-400']

function FilaItem({
  fila,
  mostrarTipo,
  inicio,
  fin,
  className,
  ...resto
}: {
  fila: FilaRanking
  mostrarTipo: boolean
  inicio?: ReactNode
  fin?: ReactNode
} & Omit<ComponentProps<'li'>, 'children'>) {
  const Icono = TIPO[fila.type].icono
  return (
    <li
      className={cn('flex items-center gap-3 rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-accent/40', className)}
      {...resto}
    >
      {inicio}
      <span
        className={cn('w-8 shrink-0 text-center text-lg font-bold tabular-nums', MEDALLA[fila.position - 1] ?? 'text-muted-foreground')}
        aria-label={`Posición ${fila.position}`}
      >
        {fila.position}
      </span>
      <Portada url={fila.cover_url} tipo={fila.type} titulo={fila.title} className="w-10" />
      <div className="min-w-0 flex-1">
        <Link
          to="/item/$id"
          params={{ id: fila.media_item_id }}
          className="line-clamp-1 font-medium hover:underline focus-visible:underline"
        >
          {fila.title}
        </Link>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {mostrarTipo && (
            <>
              <Icono className="size-3" aria-hidden />
              {TIPO[fila.type].singular}
            </>
          )}
          {mostrarTipo && anio(fila.release_date) && <span aria-hidden>·</span>}
          {anio(fila.release_date)}
        </p>
      </div>
      <NotaBadge nota={fila.score} />
      {fin}
    </li>
  )
}
