-- ============================================================
-- SOMA — Migración para anotaciones de ayer y app móvil
-- Ejecutar una vez en Supabase Dashboard → SQL Editor.
-- ============================================================

-- La fecha de la experiencia se guarda separada de created_at, que queda como
-- auditoría técnica de cuándo se envió el registro.
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS entry_date DATE;

UPDATE public.journal_entries
SET entry_date = (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE
WHERE entry_date IS NULL;

ALTER TABLE public.journal_entries
  ALTER COLUMN entry_date SET DEFAULT (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE,
  ALTER COLUMN entry_date SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_one_per_patient_day
  ON public.journal_entries (patient_id, entry_date);

CREATE INDEX IF NOT EXISTS idx_journal_patient_entry_date
  ON public.journal_entries (patient_id, entry_date DESC);

-- No permitir cambiar la fecha de una anotación ya creada.
CREATE OR REPLACE FUNCTION public.prevent_journal_entry_date_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.entry_date IS DISTINCT FROM OLD.entry_date THEN
    RAISE EXCEPTION 'La fecha de una anotación no puede modificarse.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS journal_entry_date_is_immutable ON public.journal_entries;
CREATE TRIGGER journal_entry_date_is_immutable
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_journal_entry_date_change();

-- Sustituir la ventana móvil de 24 h por una regla calendario: hoy y ayer.
DROP POLICY IF EXISTS "journal: paciente crea" ON public.journal_entries;
DROP POLICY IF EXISTS "journal: paciente actualiza (24h)" ON public.journal_entries;
DROP POLICY IF EXISTS "journal: paciente elimina (24h)" ON public.journal_entries;
DROP POLICY IF EXISTS "journal: paciente actualiza hoy o ayer" ON public.journal_entries;
DROP POLICY IF EXISTS "journal: paciente elimina hoy o ayer" ON public.journal_entries;

CREATE POLICY "journal: paciente crea" ON public.journal_entries
  FOR INSERT WITH CHECK (
    auth.uid() = patient_id
    AND entry_date BETWEEN ((NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE - 1)
                       AND  (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE
  );

CREATE POLICY "journal: paciente actualiza hoy o ayer" ON public.journal_entries
  FOR UPDATE
  USING (
    auth.uid() = patient_id
    AND entry_date BETWEEN ((NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE - 1)
                       AND  (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE
  )
  WITH CHECK (
    auth.uid() = patient_id
    AND entry_date BETWEEN ((NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE - 1)
                       AND  (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE
  );

CREATE POLICY "journal: paciente elimina hoy o ayer" ON public.journal_entries
  FOR DELETE USING (
    auth.uid() = patient_id
    AND entry_date BETWEEN ((NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE - 1)
                       AND  (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE
  );
