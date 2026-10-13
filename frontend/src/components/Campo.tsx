import type { ReactNode } from 'react'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type Props = {
  id: string
  etiqueta: string
  error?: string
  ayuda?: string
  className?: string
  children: ReactNode
}

/** Etiqueta + control + mensaje de error accesible. */
export function Campo({ id, etiqueta, error, ayuda, className, children }: Props) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : ayuda ? (
        <p className="text-xs text-muted-foreground">{ayuda}</p>
      ) : null}
    </div>
  )
}

/** Select nativo con el estilo de los inputs de shadcn. */
export const claseSelect =
  'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30 [&>option]:bg-popover'
