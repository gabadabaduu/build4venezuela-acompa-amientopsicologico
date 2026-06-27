# Supabase local

## Requisitos

- Docker en ejecución
- Node.js 20+

## Arrancar

```bash
cd psicologiaapoyo
npm run supabase:start
```

Primera vez descarga imágenes (~2 min). Cuando termine:

| Servicio | URL |
|----------|-----|
| API | http://127.0.0.1:54321 |
| Studio (UI) | http://127.0.0.1:54323 |
| Mailpit (emails) | http://127.0.0.1:54324 |
| Postgres | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

## Credenciales locales

Copia `.env.local` (ya incluido, gitignored) o usa:

```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

Las claves locales de Supabase son públicas y solo sirven en tu máquina.

## Aplicar migraciones

```bash
npm run supabase:reset
```

Recrea la DB y aplica `supabase/migrations/`.

## Probar el flujo SOS

```bash
npm run smoke:sos
```

Ejecuta: submit → consulta por tracking code → dedup por teléfono.

## Tests SQL

```bash
npm run supabase:test
```

## Parar

```bash
npm run supabase:stop
```

## Operador de prueba

1. Abre Studio: http://127.0.0.1:54323  
2. Authentication → Add user (email + password)  
3. En **App Metadata** del usuario: `{ "role": "operator" }`  
4. Con ese usuario autenticado, el cliente puede `select`/`update` en `sos_requests`.

Contrato RPC completo: [api/sos-requests.md](./api/sos-requests.md).
