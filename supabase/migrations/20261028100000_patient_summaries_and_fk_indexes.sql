-- ============================================================
-- SOMA — Resumen de pacientes en una sola consulta e índices de FKs
-- ============================================================

-- Resumen por paciente vinculado (total de entradas y última entrada) para la
-- lista del psicólogo. SECURITY INVOKER: las políticas RLS siguen aplicando,
-- así que solo devuelve datos de pacientes con vínculo ACCEPTED.
CREATE OR REPLACE FUNCTION public.psychologist_patient_summaries()
RETURNS TABLE (
  patient_id UUID,
  total_entries BIGINT,
  last_mood INTEGER,
  last_entry_date DATE
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    pp.patient_id,
    COUNT(je.id) AS total_entries,
    (ARRAY_AGG(je.mood_score ORDER BY je.entry_date DESC, je.created_at DESC))[1] AS last_mood,
    MAX(je.entry_date) AS last_entry_date
  FROM public.patient_psychologists AS pp
  LEFT JOIN public.journal_entries AS je ON je.patient_id = pp.patient_id
  WHERE pp.psychologist_id = (SELECT auth.uid())
    AND pp.status = 'ACCEPTED'
  GROUP BY pp.patient_id;
$$;

REVOKE ALL ON FUNCTION public.psychologist_patient_summaries() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psychologist_patient_summaries() TO authenticated;

-- Foreign keys sin índice (advisor de Supabase).
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_psychologists_psych ON public.patient_psychologists (psychologist_id, status);
CREATE INDEX IF NOT EXISTS idx_goals_psych ON public.therapy_goals (psychologist_id);
