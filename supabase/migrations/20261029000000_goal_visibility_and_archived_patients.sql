-- ============================================================
-- SOMA — Objetivos visibles a elección del psicólogo y pacientes archivados
-- ============================================================

-- 1. Cada objetivo terapéutico es privado salvo que el psicólogo lo comparta.
--    Por defecto false: hasta ahora la app del paciente no mostraba objetivos,
--    así que ninguno existente pasa a verse sin que el profesional lo decida.
ALTER TABLE public.therapy_goals
  ADD COLUMN IF NOT EXISTS visible_to_patient boolean NOT NULL DEFAULT false;

ALTER POLICY "goals: paciente lee sus metas" ON public.therapy_goals
  TO authenticated
  USING ((SELECT auth.uid()) = patient_id AND visible_to_patient);

-- 2. Pacientes archivados: al desvincularse, el perfil deja de ser visible
--    para el psicólogo, pero él conserva sus notas y objetivos (RLS por
--    psychologist_id). Esta función devuelve nombre y avatar solo de pacientes
--    sobre los que el psicólogo que llama tiene registros propios y ya no
--    tiene vínculo ACCEPTED.
CREATE OR REPLACE FUNCTION public.psychologist_archived_patients()
RETURNS TABLE (
  patient_id UUID,
  name TEXT,
  avatar_url TEXT,
  notes_count BIGINT,
  goals_count BIGINT,
  last_record_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH records AS (
    SELECT sn.patient_id, 1 AS is_note, 0 AS is_goal, sn.session_date AS at
    FROM public.session_notes AS sn
    WHERE sn.psychologist_id = (SELECT auth.uid())
    UNION ALL
    SELECT tg.patient_id, 0, 1, tg.created_at
    FROM public.therapy_goals AS tg
    WHERE tg.psychologist_id = (SELECT auth.uid())
  )
  SELECT
    r.patient_id,
    p.name,
    p.avatar_url,
    SUM(r.is_note)::BIGINT AS notes_count,
    SUM(r.is_goal)::BIGINT AS goals_count,
    MAX(r.at) AS last_record_at
  FROM records AS r
  JOIN public.profiles AS p ON p.id = r.patient_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.patient_psychologists AS pp
    WHERE pp.patient_id = r.patient_id
      AND pp.psychologist_id = (SELECT auth.uid())
      AND pp.status = 'ACCEPTED'
  )
  GROUP BY r.patient_id, p.name, p.avatar_url;
$$;

REVOKE ALL ON FUNCTION public.psychologist_archived_patients() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.psychologist_archived_patients() TO authenticated;
