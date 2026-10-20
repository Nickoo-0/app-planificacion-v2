# Horario Chile API para Vercel

## Variables de entorno obligatorias

- `ADMIN_USER`
- `ADMIN_PASSWORD`
- `KV_REST_API_URL` y `KV_REST_API_TOKEN`

También acepta los nombres de Upstash:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## Vercel

Configura **Root Directory** como `horario-chile-api-v2` si estos archivos están dentro de esa carpeta del repositorio.

La administración está en `/` y requiere autenticación básica. Lynn consulta públicamente `GET /api/status`.
