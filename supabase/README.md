# Base de datos de SOMA

- `migrations/`: fuente de verdad del esquema. La primera (`..._baseline.sql`) es
  el estado de producción al 2026-10-28; las siguientes son cambios incrementales.
- `tests/rls_audit.sql`: pruebas de seguridad (RLS, permisos por columna, códigos
  de invitación). Se corren contra una base local, nunca producción; ver el
  encabezado del archivo.
- Storage: la app **no usa buckets**. Los avatares se guardan como data URL
  (validada por `profiles_avatar_url_check`). Si algún día se agrega un bucket,
  sus políticas deben versionarse acá.

## Configuración de Supabase que no vive en el repositorio

Revisar en el panel (Authentication):

- **Confirm email**: activado.
- **Password minimum length**: 8 o más (el cliente ya pide 8).
- **Leaked password protection**: activada (plan Pro).
- **Rate limits** de Auth (inicio de sesión, registro, recuperación): conservar los valores por defecto o más estrictos.
- Extensión **pg_cron** (opcional): si está habilitada, la migración
  `20261124000000_audit_fixes.sql` agenda la renovación diaria de códigos vencidos.
  Si no, se renuevan al abrir la app del psicólogo y los vencidos dejan de funcionar igual.
