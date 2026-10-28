-- Rendimiento y alcance de las políticas RLS (avisos auth_rls_initplan y
-- multiple_permissive_policies del linter de Supabase).
--
-- 1. auth.uid() va dentro de (select ...): Postgres lo evalúa una vez por
--    consulta en lugar de una vez por fila.
-- 2. Las políticas se aplican solo a "authenticated". Con "public" también se
--    evaluaban para "anon", que nunca tiene filas propias.
--
-- La lógica de cada política no cambia; ALTER POLICY conserva sus nombres.

-- ── appointments ─────────────────────────────────────────
ALTER POLICY "appointments: paciente ve las suyas" ON public.appointments
  TO authenticated
  USING (((select auth.uid()) = patient_id) AND (date >= now()));

ALTER POLICY "appointments: psicologo CRUD" ON public.appointments
  TO authenticated
  USING ((select auth.uid()) = psychologist_id);

-- ── habits ───────────────────────────────────────────────
ALTER POLICY "habits: paciente CRUD" ON public.habits
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "habits: psychologist views accepted patients" ON public.habits
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patient_psychologists pp
    WHERE pp.patient_id = habits.user_id
      AND pp.psychologist_id = (select auth.uid())
      AND pp.status = 'ACCEPTED'
  ));

-- ── journal_entries ──────────────────────────────────────
ALTER POLICY "journal: paciente actualiza (1 semana)" ON public.journal_entries
  TO authenticated
  USING (((select auth.uid()) = patient_id)
    AND (entry_date <= ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'))::date))
  WITH CHECK (((select auth.uid()) = patient_id)
    AND (entry_date <= ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'))::date));

ALTER POLICY "journal: paciente crea" ON public.journal_entries
  TO authenticated
  WITH CHECK (((select auth.uid()) = patient_id)
    AND (entry_date <= ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'))::date));

ALTER POLICY "journal: paciente elimina (1 semana)" ON public.journal_entries
  TO authenticated
  USING (((select auth.uid()) = patient_id)
    AND (entry_date <= ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'))::date));

ALTER POLICY "journal: paciente ve sus entradas" ON public.journal_entries
  TO authenticated
  USING ((select auth.uid()) = patient_id);

ALTER POLICY "journal: psychologist views accepted patients entries" ON public.journal_entries
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patient_psychologists pp
    WHERE pp.patient_id = journal_entries.patient_id
      AND pp.psychologist_id = (select auth.uid())
      AND pp.status = 'ACCEPTED'
  ));

-- ── patient_psychologists ────────────────────────────────
ALTER POLICY "Patients can delete their links" ON public.patient_psychologists
  TO authenticated
  USING ((select auth.uid()) = patient_id);

ALTER POLICY "Patients can view their own links" ON public.patient_psychologists
  TO authenticated
  USING ((select auth.uid()) = patient_id);

ALTER POLICY "Psychologists can delete links to them" ON public.patient_psychologists
  TO authenticated
  USING ((select auth.uid()) = psychologist_id);

ALTER POLICY "Psychologists can update their links" ON public.patient_psychologists
  TO authenticated
  USING (((select auth.uid()) = psychologist_id) AND (status = 'PENDING'))
  WITH CHECK (((select auth.uid()) = psychologist_id) AND (status = 'ACCEPTED'));

ALTER POLICY "Psychologists can view links to them" ON public.patient_psychologists
  TO authenticated
  USING ((select auth.uid()) = psychologist_id);

-- ── profiles ─────────────────────────────────────────────
ALTER POLICY "profiles: actualizar propio" ON public.profiles
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

ALTER POLICY "profiles: patient views accepted psychologist" ON public.profiles
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patient_psychologists pp
    WHERE pp.patient_id = (select auth.uid())
      AND pp.psychologist_id = profiles.id
      AND pp.status = 'ACCEPTED'
  ));

ALTER POLICY "profiles: psychologist views accepted patients" ON public.profiles
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patient_psychologists pp
    WHERE pp.patient_id = profiles.id
      AND pp.psychologist_id = (select auth.uid())
      AND pp.status = 'ACCEPTED'
  ));

ALTER POLICY "profiles: psychologist views pending patients" ON public.profiles
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.patient_psychologists pp
    WHERE pp.patient_id = profiles.id
      AND pp.psychologist_id = (select auth.uid())
      AND pp.status = 'PENDING'
  ));

ALTER POLICY "profiles: ver propio" ON public.profiles
  TO authenticated
  USING ((select auth.uid()) = id);

-- ── session_notes ────────────────────────────────────────
ALTER POLICY "session_notes: solo el psicologo" ON public.session_notes
  TO authenticated
  USING ((select auth.uid()) = psychologist_id);

-- ── therapy_goals ────────────────────────────────────────
ALTER POLICY "goals: paciente lee sus metas" ON public.therapy_goals
  TO authenticated
  USING ((select auth.uid()) = patient_id);

ALTER POLICY "goals: psicologo CRUD" ON public.therapy_goals
  TO authenticated
  USING ((select auth.uid()) = psychologist_id);
