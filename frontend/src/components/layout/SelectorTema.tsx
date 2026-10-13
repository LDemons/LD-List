import { Monitor, Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useTheme, type Tema } from '@/lib/tema'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export const TEMAS = [
  { valor: 'system', texto: 'Sistema', icono: Monitor },
  { valor: 'light', texto: 'Claro', icono: Sun },
  { valor: 'dark', texto: 'Oscuro', icono: Moon },
] as const

export function SelectorTema() {
  const { theme, setTheme } = useTheme()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Cambiar tema">
          <Sun className="dark:hidden" />
          <Moon className="hidden dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme ?? 'system'} onValueChange={(v) => setTheme(v as Tema)}>
          {TEMAS.map(({ valor, texto, icono: Icono }) => (
            <DropdownMenuRadioItem key={valor} value={valor}>
              <Icono className="size-4" aria-hidden />
              {texto}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
