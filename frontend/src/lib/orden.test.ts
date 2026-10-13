import { describe, expect, it } from 'vitest'

import { fusionarOrden } from '@/lib/orden'

describe('fusionarOrden', () => {
  it('con el grupo completo visible, usa el orden nuevo', () => {
    expect(fusionarOrden([1, 2, 3], [3, 1, 2])).toEqual([3, 1, 2])
  })

  it('solo mueve las visibles y respeta los lugares de las demás', () => {
    // Grupo con nota 9.5: 10 (film), 20 (game), 30 (film), 40 (anime)
    // En la pestaña Películas se ven 10 y 30; se invierte su orden.
    expect(fusionarOrden([10, 20, 30, 40], [30, 10])).toEqual([30, 20, 10, 40])
  })

  it('rechaza ids que ya no pertenecen al grupo', () => {
    expect(() => fusionarOrden([1, 2], [2, 9])).toThrow()
  })
})
