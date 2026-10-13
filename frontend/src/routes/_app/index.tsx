import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Plus, Trophy } from 'lucide-react'
import { z } from 'zod'

import { useRanking, type FilaRanking } from '@/api/ranking'
import { NotaBadge } from '@/components/items/NotaBadge'
import { Portada } from '@/components/items/Portada'
import CountUp from '@/components/reactbits/CountUp'
import SpotlightCard from '@/components/reactbits/SpotlightCard'
import { RankingLista } from '@/components/ranking/RankingLista'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MEDIA_TYPES, TIPO, type MediaType } from '@/lib/dominio'
import { mensajeError } from '@/lib/errores'
import { useTheme } from '@/lib/tema'

const busqueda = z.object({
  tipo: z.enum(['global', ...MEDIA_TYPES]).default('global').catch('global'),
})

export const Route = createFileRoute('/_app/')({
  validateSearch: busqueda,
  component: Rankings,
})

function Rankings() {
  const { tipo } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const ranking = useRanking(tipo)
  const filas = ranking.data ?? []
  const promedio = filas.length ? filas.reduce((s, f) => s + f.score, 0) / filas.length : 0

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Trophy className="size-6 text-primary" aria-hidden />
            {tipo === 'global' ? 'Ranking global' : `Ranking de ${TIPO[tipo].plural.toLowerCase()}`}
          </h1>
          {filas.length > 0 && (
            <p className="text-sm text-muted-foreground">
              <CountUp to={filas.length} duration={1} /> calificados · promedio {promedio.toFixed(2)}
            </p>
          )}
        </div>
        <Button asChild>
          <Link to="/agregar">
            <Plus /> Agregar
          </Link>
        </Button>
      </div>

      <Tabs value={tipo} onValueChange={(v) => navigate({ search: { tipo: v as MediaType | 'global' } })}>
        <div className="-mx-4 overflow-x-auto px-4">
          <TabsList>
            <TabsTrigger value="global">Global</TabsTrigger>
            {MEDIA_TYPES.map((t) => (
              <TabsTrigger key={t} value={t}>
                {TIPO[t].plural}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {ranking.isPending ? (
        <div className="grid gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : ranking.isError ? (
        <p role="alert" className="text-destructive">
          {mensajeError(ranking.error)}
        </p>
      ) : filas.length === 0 ? (
        <Vacio tipo={tipo} />
      ) : (
        <>
          {filas.length >= 3 && <Podio filas={filas.slice(0, 3)} />}
          <RankingLista filas={filas} tipo={tipo} />
        </>
      )}
    </div>
  )
}

function Podio({ filas }: { filas: FilaRanking[] }) {
  const { resolvedTheme } = useTheme()
  return (
    <section aria-label="Podio" className="grid grid-cols-3 gap-2 sm:gap-4">
      {filas.map((f) => (
        <SpotlightCard
          key={f.entry_id}
          theme={resolvedTheme === 'light' ? 'light' : 'dark'}
          spotlightColor="rgba(167, 139, 250, 0.35)"
          className="rounded-xl border bg-card p-2 sm:p-3"
        >
          <Link to="/item/$id" params={{ id: f.media_item_id }} className="grid gap-2">
            <div className="relative">
              <Portada url={f.cover_url} tipo={f.type} titulo={f.title} className="w-full" />
              <span className="absolute top-1.5 left-1.5 rounded-md bg-background/85 px-2 py-0.5 text-sm font-bold backdrop-blur">
                #{f.position}
              </span>
            </div>
            <div className="flex items-start justify-between gap-2">
              <p className="line-clamp-2 text-sm font-medium">{f.title}</p>
              <NotaBadge nota={f.score} className="min-w-0 px-1.5 py-0.5 text-sm" />
            </div>
          </Link>
        </SpotlightCard>
      ))}
    </section>
  )
}

function Vacio({ tipo }: { tipo: MediaType | 'global' }) {
  return (
    <div className="grid place-items-center gap-3 rounded-xl border border-dashed p-10 text-center">
      <Trophy className="size-10 text-muted-foreground" aria-hidden />
      <p className="text-muted-foreground">
        {tipo === 'global'
          ? 'Todavía no calificaste nada.'
          : `Todavía no calificaste ${TIPO[tipo].plural.toLowerCase()}.`}
      </p>
      <Button asChild variant="outline">
        <Link to="/agregar" search={tipo === 'global' ? undefined : { tipo }}>
          <Plus /> Agregar el primero
        </Link>
      </Button>
    </div>
  )
}
