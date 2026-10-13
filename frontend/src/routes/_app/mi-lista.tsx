import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ListChecks } from 'lucide-react'
import { z } from 'zod'

import { useMisEntradas } from '@/api/entradas'
import { claseSelect } from '@/components/Campo'
import { NotaBadge } from '@/components/items/NotaBadge'
import { Portada } from '@/components/items/Portada'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { anio, ENTRY_STATUSES, ESTADO, MEDIA_TYPES, TIPO, type EntryStatus, type MediaType } from '@/lib/dominio'
import { mensajeError } from '@/lib/errores'

const busqueda = z.object({
  estado: z.enum(['todos', ...ENTRY_STATUSES]).default('todos').catch('todos'),
  tipo: z.enum(['todos', ...MEDIA_TYPES]).default('todos').catch('todos'),
})

export const Route = createFileRoute('/_app/mi-lista')({
  validateSearch: busqueda,
  component: MiLista,
})

function MiLista() {
  const filtros = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const entradas = useMisEntradas(filtros)

  return (
    <div className="grid gap-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <ListChecks className="size-6 text-primary" aria-hidden /> Mi lista
      </h1>

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="grid gap-1.5">
          <Label htmlFor="filtro-estado">Estado</Label>
          <select
            id="filtro-estado"
            className={claseSelect}
            value={filtros.estado}
            onChange={(e) => navigate({ search: (s) => ({ ...s, estado: e.target.value as EntryStatus | 'todos' }) })}
          >
            <option value="todos">Todos</option>
            {ENTRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ESTADO[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="filtro-tipo">Categoría</Label>
          <select
            id="filtro-tipo"
            className={claseSelect}
            value={filtros.tipo}
            onChange={(e) => navigate({ search: (s) => ({ ...s, tipo: e.target.value as MediaType | 'todos' }) })}
          >
            <option value="todos">Todas</option>
            {MEDIA_TYPES.map((t) => (
              <option key={t} value={t}>
                {TIPO[t].plural}
              </option>
            ))}
          </select>
        </div>
      </div>

      {entradas.isPending ? (
        <div className="grid gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : entradas.isError ? (
        <p role="alert" className="text-destructive">
          {mensajeError(entradas.error)}
        </p>
      ) : entradas.data.length === 0 ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          No hay nada con estos filtros.{' '}
          <Link to="/agregar" className="text-primary underline-offset-4 hover:underline">
            Agregar algo
          </Link>
        </p>
      ) : (
        <ul className="grid gap-2">
          {entradas.data.map((e) => {
            const m = e.media_item
            return (
              <li key={e.id}>
                <Link
                  to="/item/$id"
                  params={{ id: m.id }}
                  className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-accent/40"
                >
                  <Portada url={m.cover_url} tipo={m.type} titulo={m.title} className="w-10" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {TIPO[m.type].singular}
                      {anio(m.release_date) && ` · ${anio(m.release_date)}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="hidden sm:inline-flex">
                    {ESTADO[e.status]}
                  </Badge>
                  <NotaBadge nota={e.score} />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
