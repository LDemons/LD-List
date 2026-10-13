// Tema claro/oscuro/sistema. La preferencia se guarda en localStorage (si está
// disponible) y index.html aplica la clase `dark` antes del primer pintado
// para evitar parpadeos; mantener CLAVE_TEMA sincronizada con ese script.

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'

export type Tema = 'system' | 'light' | 'dark'

const CLAVE_TEMA = 'ld-tema'
const CONSULTA_OSCURO = '(prefers-color-scheme: dark)'

function leerTema(): Tema {
  try {
    const v = localStorage.getItem(CLAVE_TEMA)
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
  } catch {
    return 'system'
  }
}

type ContextoTema = { theme: Tema; resolvedTheme: 'light' | 'dark'; setTheme: (t: Tema) => void }

const Contexto = createContext<ContextoTema | null>(null)

export function ProveedorTema({ children }: { children: ReactNode }) {
  const [theme, setThemeEstado] = useState<Tema>(leerTema)
  const [sistemaOscuro, setSistemaOscuro] = useState(() => window.matchMedia(CONSULTA_OSCURO).matches)

  useEffect(() => {
    const mq = window.matchMedia(CONSULTA_OSCURO)
    const alCambiar = (e: MediaQueryListEvent) => setSistemaOscuro(e.matches)
    mq.addEventListener('change', alCambiar)
    return () => mq.removeEventListener('change', alCambiar)
  }, [])

  const resolvedTheme = theme === 'system' ? (sistemaOscuro ? 'dark' : 'light') : theme

  useLayoutEffect(() => {
    const raiz = document.documentElement
    raiz.classList.toggle('dark', resolvedTheme === 'dark')
    raiz.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  const setTheme = useCallback((t: Tema) => {
    setThemeEstado(t)
    try {
      localStorage.setItem(CLAVE_TEMA, t)
    } catch {
      // Sin almacenamiento (modo privado): el tema dura solo esta sesión.
    }
  }, [])

  const valor = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme])
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useTheme(): ContextoTema {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useTheme debe usarse dentro de ProveedorTema')
  return ctx
}
