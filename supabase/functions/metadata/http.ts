import { ErrorPublico, type Fetcher } from './tipos.ts'

const TIEMPO_MAXIMO_MS = 8000

/** GET/POST con tiempo máximo; los fallos del proveedor no exponen detalles. */
export async function pedirJson<T>(fetcher: Fetcher, url: string, init: RequestInit = {}): Promise<T> {
  let respuesta: Response
  try {
    respuesta = await fetcher(url, { ...init, signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS) })
  } catch {
    throw new ErrorPublico('El servicio externo no respondió. Intenta de nuevo.', 502)
  }
  if (respuesta.status === 404) throw new ErrorPublico('No se encontró ese elemento en el servicio externo.', 404)
  if (respuesta.status === 429 || respuesta.status === 503) {
    throw new ErrorPublico('El servicio externo está ocupado. Espera unos segundos.', 503)
  }
  if (!respuesta.ok) throw new ErrorPublico('El servicio externo devolvió un error.', 502)
  try {
    return (await respuesta.json()) as T
  } catch {
    throw new ErrorPublico('Respuesta inválida del servicio externo.', 502)
  }
}
