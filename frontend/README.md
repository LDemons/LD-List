# LD-List · Frontend

React 19 + Vite + TypeScript, Tailwind CSS v4, shadcn/ui, React Bits y TanStack Router/Query.
El backend es Supabase (ver `../supabase`).

## Puesta en marcha

```bash
npm install
npm run env    # genera .env.local con la URL y la clave publishable del proyecto vinculado
npm run dev    # http://localhost:5173
```

`npm run env` necesita la sesión del CLI de Supabase (`npx supabase login`) y el repo vinculado
(`npx supabase link`). `.env.local` nunca se sube a git.

## Scripts

| Script | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Chequeo de tipos y build de producción |
| `npm test` | Tests unitarios (Vitest) |
| `npm run lint` | Linter (oxlint) |

Tipos de la base de datos: `npx supabase gen types typescript --linked --schema public > src/lib/database.types.ts`.
