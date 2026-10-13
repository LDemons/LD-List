// Genera frontend/.env.local con la URL del proyecto y la clave publishable de
// Supabase, leyéndolas del CLI vinculado. No imprime ningún valor.
//
// Uso (desde frontend/): node scripts/generar-env.mjs
//
// Solo se escribe la clave publishable, que está pensada para el navegador y
// queda protegida por RLS. La clave secret/service_role nunca se toca.

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const raiz = fileURLToPath(new URL('../../', import.meta.url))
const destino = fileURLToPath(new URL('../.env.local', import.meta.url))

function salir(mensaje) {
  console.error(`generar-env: ${mensaje}`)
  process.exit(1)
}

let ref
try {
  ref = readFileSync(`${raiz}supabase/.temp/project-ref`, 'utf8').trim()
} catch {
  salir('el repo no está vinculado. Ejecuta antes: npx supabase link')
}
if (!/^[a-z]{20}$/.test(ref)) salir('project-ref con formato inesperado')

let claves
try {
  const salida = execFileSync(
    'npx',
    ['--yes', 'supabase@2.120.0', 'projects', 'api-keys', '--project-ref', ref, '-o', 'json'],
    { cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], shell: process.platform === 'win32' },
  )
  claves = JSON.parse(salida)
} catch {
  salir('no se pudieron leer las claves (¿sesión del CLI iniciada? npx supabase login)')
}

const publishable = Array.isArray(claves) ? claves.find((c) => c.type === 'publishable') : undefined
const valor = publishable?.api_key
if (typeof valor !== 'string' || !valor.startsWith('sb_publishable_')) {
  salir('no se encontró una clave publishable válida')
}

writeFileSync(
  destino,
  [
    '# Generado por scripts/generar-env.mjs. No se sube a git.',
    `VITE_SUPABASE_URL=https://${ref}.supabase.co`,
    `VITE_SUPABASE_PUBLISHABLE_KEY=${valor}`,
    '',
  ].join('\n'),
  { encoding: 'utf8' },
)
console.log('generar-env: .env.local actualizado (valores no mostrados).')
