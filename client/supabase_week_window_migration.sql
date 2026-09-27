-- ============================================================
-- SOMA — Migración de ventana de edición y creación a 1 semana (7 días)
-- Ejecutar en Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Permitir crear anotaciones de hoy y de hasta 7 días anteriores
DROP POLICY IF EXISTS "journal: paciente crea" ON public.journal_entries;
CREATE POLICY "journal: paciente crea" ON public.journal_entries
  FOR INSERT
  WITH CHECK (
    auth.uid() = patient_id
    AND entry_date BETWEEN ((NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE - 7)
                       AND  (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE
  );

-- 2. Sustituir la regla de 24h / ayer por una ventana de hasta 7 días (1 semana) para actualizar
DROP POLICY IF EXISTS "journal: paciente actualiza (24h)" ON public.journal_entries;
DROP POLICY IF EXISTS "journal: paciente actualiza hoy o ayer" ON public.journal_entries;
DROP POLICY IF EXISTS "journal: paciente actualiza (1 semana)" ON public.journal_entries;

CREATE POLICY "journal: paciente actualiza (1 semana)" ON public.journal_entries
  FOR UPDATE
  USING (
    auth.uid() = patient_id
    AND entry_date BETWEEN ((NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE - 7)
                       AND  (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE
  )
  WITH CHECK (
    auth.uid() = patient_id
    AND entry_date BETWEEN ((NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE - 7)
                       AND  (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE
  );

-- 3. Sustituir la regla de 24h / ayer por una ventana de hasta 7 días (1 semana) para eliminar
DROP POLICY IF EXISTS "journal: paciente elimina (24h)" ON public.journal_entries;
DROP POLICY IF EXISTS "journal: paciente elimina hoy o ayer" ON public.journal_entries;
DROP POLICY IF EXISTS "journal: paciente elimina (1 semana)" ON public.journal_entries;

CREATE POLICY "journal: paciente elimina (1 semana)" ON public.journal_entries
  FOR DELETE
  USING (
    auth.uid() = patient_id
    AND entry_date BETWEEN ((NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE - 7)
                       AND  (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE
  );
