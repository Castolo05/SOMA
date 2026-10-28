# Scripts SQL históricos

Estos archivos se ejecutaron a mano en el SQL Editor de Supabase antes de
adoptar `supabase/migrations/`. Se conservan solo como historial.

- No son una secuencia lineal y varios se pisan entre sí.
- Algunos no coinciden con producción (por ejemplo, `supabase_week_window_migration.sql`
  imponía 7 días para el diario y la regla vigente no tiene límite).
- **No volver a ejecutarlos.** El estado real está en
  `../migrations/20261028000000_baseline.sql`.
