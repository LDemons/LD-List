import { useEffect, useState } from 'react'

/** Devuelve `valor` solo después de `ms` sin cambios. */
export function useDebounced<T>(valor: T, ms: number): T {
  const [retrasado, setRetrasado] = useState(valor)
  useEffect(() => {
    const id = setTimeout(() => setRetrasado(valor), ms)
    return () => clearTimeout(id)
  }, [valor, ms])
  return retrasado
}
