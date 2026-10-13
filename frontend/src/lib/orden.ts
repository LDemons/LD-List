/**
 * Combina el nuevo orden de las entradas visibles con el grupo de empate
 * completo: las visibles ocupan, en su nuevo orden, los mismos lugares que ya
 * tenían; las demás (otras categorías con la misma nota) no se mueven.
 */
export function fusionarOrden(grupoCompleto: number[], visiblesEnOrden: number[]): number[] {
  const visibles = new Set(visiblesEnOrden)
  if (visiblesEnOrden.some((id) => !grupoCompleto.includes(id))) {
    throw { code: '22023', message: 'El ranking cambió mientras lo editabas. Vuelve a intentarlo.' }
  }
  const cola = [...visiblesEnOrden]
  return grupoCompleto.map((id) => (visibles.has(id) ? cola.shift()! : id))
}
