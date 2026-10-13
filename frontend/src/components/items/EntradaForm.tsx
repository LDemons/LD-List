import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'

import { useGuardarEntrada } from '@/api/entradas'
import { Campo, claseSelect } from '@/components/Campo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ENTRY_STATUSES, ESTADO, formatearNota, type EntryStatus } from '@/lib/dominio'
import { mensajeError } from '@/lib/errores'
import { entradaSchema, parsearNota } from '@/lib/validacion'

export type EntradaExistente = {
  id: number
  status: EntryStatus
  score: number | null
  started_on: string | null
  finished_on: string | null
  notes: string | null
} | null

type Props = {
  mediaItemId: number
  entrada: EntradaExistente
  estadoInicial?: EntryStatus
  onGuardado?: () => void
}

export function EntradaForm({ mediaItemId, entrada, estadoInicial = 'completed', onGuardado }: Props) {
  const guardar = useGuardarEntrada(mediaItemId)
  const form = useForm<z.input<typeof entradaSchema>, unknown, z.output<typeof entradaSchema>>({
    resolver: zodResolver(entradaSchema),
    defaultValues: {
      status: entrada?.status ?? estadoInicial,
      score: entrada?.score != null ? formatearNota(entrada.score) : '',
      started_on: entrada?.started_on ?? '',
      finished_on: entrada?.finished_on ?? '',
      notes: entrada?.notes ?? '',
    },
  })
  const { register, formState, watch, setValue } = form
  const errores = formState.errors
  const notaTexto = watch('score')
  const notaSlider = parsearNota(notaTexto) ?? 5.5
  const notasLargo = watch('notes')?.length ?? 0

  const enviar = form.handleSubmit(async (datos) => {
    try {
      await guardar.mutateAsync({ entradaId: entrada?.id ?? null, datos })
      toast.success(entrada ? 'Cambios guardados' : 'Agregado a tu lista')
      onGuardado?.()
    } catch (error) {
      toast.error(mensajeError(error))
    }
  })

  return (
    <form onSubmit={enviar} noValidate className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="status" etiqueta="Estado" error={errores.status?.message}>
          <select id="status" className={claseSelect} {...register('status')}>
            {ENTRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ESTADO[s]}
              </option>
            ))}
          </select>
        </Campo>

        <Campo id="score" etiqueta="Nota (1.0 a 10.0)" error={errores.score?.message} ayuda="Déjala vacía si aún no la tienes">
          <div className="flex items-center gap-3">
            <Input
              id="score"
              inputMode="decimal"
              autoComplete="off"
              placeholder="9.5"
              maxLength={4}
              className="w-20 text-center font-semibold tabular-nums"
              aria-invalid={!!errores.score}
              aria-describedby={errores.score ? 'score-error' : undefined}
              {...register('score')}
            />
            <input
              type="range"
              min={1}
              max={10}
              step={0.1}
              value={notaSlider}
              onChange={(e) => setValue('score', Number(e.target.value).toFixed(1), { shouldValidate: true })}
              aria-label="Ajustar nota"
              className="h-2 flex-1 cursor-pointer accent-primary"
            />
          </div>
        </Campo>

        <Campo id="started_on" etiqueta="Empecé" error={errores.started_on?.message}>
          <Input id="started_on" type="date" min="1900-01-01" max="2200-12-31" {...register('started_on')} />
        </Campo>

        <Campo id="finished_on" etiqueta="Terminé" error={errores.finished_on?.message}>
          <Input id="finished_on" type="date" min="1900-01-01" max="2200-12-31" {...register('finished_on')} />
        </Campo>
      </div>

      <Campo id="notes" etiqueta="Notas personales" error={errores.notes?.message} ayuda={`${notasLargo}/5000`}>
        <Textarea id="notes" rows={4} maxLength={5000} placeholder="¿Qué te pareció?" {...register('notes')} />
      </Campo>

      <div className="flex justify-end">
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : entrada ? 'Guardar cambios' : 'Agregar a mi lista'}
        </Button>
      </div>
    </form>
  )
}
