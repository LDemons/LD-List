import { useState } from 'react'

import { TIPO, type MediaType } from '@/lib/dominio'
import { cn } from '@/lib/utils'

type Props = {
  url: string | null | undefined
  tipo: MediaType
  titulo: string
  className?: string
}

/** Portada del ítem. Solo carga URLs https; si falla, muestra el icono del tipo. */
export function Portada({ url, tipo, titulo, className }: Props) {
  const [fallo, setFallo] = useState(false)
  const Icono = TIPO[tipo].icono
  const segura = !!url && url.startsWith('https://') && !fallo
  const cuadrada = tipo === 'album' || tipo === 'song'

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-md bg-muted',
        cuadrada ? 'aspect-square' : 'aspect-[2/3]',
        className,
      )}
    >
      {segura ? (
        <img
          src={url}
          alt={`Portada de ${titulo}`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFallo(true)}
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground" aria-hidden>
          <Icono className="size-1/3" />
        </div>
      )}
    </div>
  )
}
