-- ============================================================
-- SOMA — Los psicólogos solo crean o editan citas, notas y metas de
-- pacientes con vínculo ACCEPTED.
-- Antes bastaba con psychologist_id = auth.uid(), así que cualquier
-- psicólogo podía asignar datos a cualquier patient_id.
-- La lectura y el borrado no cambian: el profesional conserva acceso a sus
-- propios registros aunque el paciente se desvincule.
-- ============================================================

-- Citas: patient_id es opcional (citas sin paciente asignado).
ALTER POLICY "appointments: psicologo CRUD" ON public.appointments
  WITH CHECK (
    (SELECT auth.uid()) = psychologist_id
    AND (
      patient_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.patient_psychologists pp
        WHERE pp.patient_id = appointments.patient_id
          AND pp.psychologist_id = (SELECT auth.uid())
          AND pp.status = 'ACCEPTED'
      )
    )
  );

ALTER POLICY "session_notes: solo el psicologo" ON public.session_notes
  WITH CHECK (
    (SELECT auth.uid()) = psychologist_id
    AND EXISTS (
      SELECT 1 FROM public.patient_psychologists pp
      WHERE pp.patient_id = session_notes.patient_id
        AND pp.psychologist_id = (SELECT auth.uid())
        AND pp.status = 'ACCEPTED'
    )
  );

ALTER POLICY "goals: psicologo CRUD" ON public.therapy_goals
  WITH CHECK (
    (SELECT auth.uid()) = psychologist_id
    AND EXISTS (
      SELECT 1 FROM public.patient_psychologists pp
      WHERE pp.patient_id = therapy_goals.patient_id
        AND pp.psychologist_id = (SELECT auth.uid())
        AND pp.status = 'ACCEPTED'
    )
  );
