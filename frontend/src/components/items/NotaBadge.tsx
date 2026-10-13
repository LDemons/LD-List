import { formatearNota } from '@/lib/dominio'
import { cn } from '@/lib/utils'

export function colorNota(nota: number): string {
  if (nota >= 9) return 'bg-amber-400/15 text-amber-600 ring-amber-500/40 dark:text-amber-300'
  if (nota >= 7) return 'bg-primary/15 text-primary ring-primary/40'
  if (nota >= 5) return 'bg-muted text-foreground ring-border'
  return 'bg-destructive/10 text-destructive ring-destructive/30'
}

export function NotaBadge({ nota, className }: { nota: number | null; className?: string }) {
  if (nota == null) {
    return <span className={cn('text-sm text-muted-foreground', className)}>Sin nota</span>
  }
  return (
    <span
      className={cn(
        'inline-flex min-w-12 items-center justify-center rounded-md px-2 py-1 font-semibold tabular-nums ring-1',
        colorNota(nota),
        className,
      )}
      aria-label={`Nota ${formatearNota(nota)}`}
    >
      {formatearNota(nota)}
    </span>
  )
}
