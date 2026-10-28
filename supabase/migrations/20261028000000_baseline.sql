-- ============================================================
-- SOMA — Esquema base exportado de producción (2026-10-28).
-- Refleja el estado real de la base después de todos los scripts de
-- supabase/legacy/. Es idempotente solo sobre una base vacía.
-- ============================================================

-- ── Tablas ────────────────────────────────────────────────

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  name text NOT NULL,
  role text NOT NULL,
  invite_code text,
  psychologist_id uuid,              -- Heredado: los vínculos viven en patient_psychologists
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  psychologist_status text,          -- Heredado
  first_name text,
  last_name text,
  birth_date date,
  phone text,
  specialization text
);

CREATE TABLE public.patient_psychologists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  psychologist_id uuid NOT NULL,
  status text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.journal_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  mood_score integer NOT NULL,
  content text DEFAULT ''::text,
  completed_habits text[] DEFAULT '{}'::text[],
  habit_data jsonb DEFAULT '{}'::jsonb,
  flagged_for_session boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  entry_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date
);

CREATE TABLE public.habits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  text text NOT NULL,
  icon text DEFAULT 'CheckCircle'::text,
  tracking_type text DEFAULT 'toggle'::text,
  unit text DEFAULT ''::text,
  has_note boolean DEFAULT false,
  "order" integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  psychologist_id uuid NOT NULL,
  patient_id uuid,
  title text NOT NULL,
  date timestamp with time zone NOT NULL,
  duration integer DEFAULT 50,
  notes text DEFAULT ''::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.session_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  psychologist_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  title text DEFAULT ''::text,
  content text DEFAULT ''::text,
  session_date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.therapy_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  psychologist_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  text text NOT NULL,
  completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ── Restricciones ─────────────────────────────────────────

ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_invite_code_key UNIQUE (invite_code);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['PATIENT'::text, 'PSYCHOLOGIST'::text])));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_specialization_check CHECK (((specialization IS NULL) OR (specialization = ANY (ARRAY['Psicólogo/a'::text, 'Psiquiatra'::text, 'Pediatra'::text, 'Psicopedagogo/a'::text, 'Terapeuta ocupacional'::text, 'Fonoaudiólogo/a'::text, 'Trabajador/a social'::text, 'Otro/a profesional de salud'::text]))));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_psychologist_id_fkey FOREIGN KEY (psychologist_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.patient_psychologists ADD CONSTRAINT patient_psychologists_pkey PRIMARY KEY (id);
ALTER TABLE public.patient_psychologists ADD CONSTRAINT patient_psychologists_patient_id_psychologist_id_key UNIQUE (patient_id, psychologist_id);
ALTER TABLE public.patient_psychologists ADD CONSTRAINT patient_psychologists_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'ACCEPTED'::text])));
ALTER TABLE public.patient_psychologists ADD CONSTRAINT patient_psychologists_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.patient_psychologists ADD CONSTRAINT patient_psychologists_psychologist_id_fkey FOREIGN KEY (psychologist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);
ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_mood_score_check CHECK (((mood_score >= 1) AND (mood_score <= 10)));
ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.habits ADD CONSTRAINT habits_pkey PRIMARY KEY (id);
ALTER TABLE public.habits ADD CONSTRAINT habits_tracking_type_check CHECK ((tracking_type = ANY (ARRAY['toggle'::text, 'toggle+qty'::text, 'qty'::text])));
ALTER TABLE public.habits ADD CONSTRAINT habits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.appointments ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);
ALTER TABLE public.appointments ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_psychologist_id_fkey FOREIGN KEY (psychologist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.session_notes ADD CONSTRAINT session_notes_pkey PRIMARY KEY (id);
ALTER TABLE public.session_notes ADD CONSTRAINT session_notes_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.session_notes ADD CONSTRAINT session_notes_psychologist_id_fkey FOREIGN KEY (psychologist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.therapy_goals ADD CONSTRAINT therapy_goals_pkey PRIMARY KEY (id);
ALTER TABLE public.therapy_goals ADD CONSTRAINT therapy_goals_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.therapy_goals ADD CONSTRAINT therapy_goals_psychologist_id_fkey FOREIGN KEY (psychologist_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ── Índices ───────────────────────────────────────────────

CREATE INDEX idx_profiles_invite_code ON public.profiles USING btree (invite_code) WHERE (invite_code IS NOT NULL);
CREATE INDEX idx_profiles_psychologist ON public.profiles USING btree (psychologist_id);
CREATE UNIQUE INDEX journal_entries_one_per_patient_day ON public.journal_entries USING btree (patient_id, entry_date);
CREATE INDEX idx_journal_patient_id ON public.journal_entries USING btree (patient_id);
CREATE INDEX idx_journal_created_at ON public.journal_entries USING btree (created_at DESC);
CREATE INDEX idx_journal_patient_entry_date ON public.journal_entries USING btree (patient_id, entry_date DESC);
CREATE INDEX idx_habits_user_id ON public.habits USING btree (user_id);
CREATE INDEX idx_appointments_psych ON public.appointments USING btree (psychologist_id);
CREATE INDEX idx_session_notes_psych ON public.session_notes USING btree (psychologist_id);
CREATE INDEX idx_session_notes_patient ON public.session_notes USING btree (patient_id);
CREATE INDEX idx_goals_patient ON public.therapy_goals USING btree (patient_id);

-- ── Funciones ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_journal_entry_date_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.entry_date IS DISTINCT FROM OLD.entry_date THEN
    RAISE EXCEPTION 'La fecha de una anotación no puede modificarse.';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT;
  v_name TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_birth_date DATE;
  v_phone TEXT;
  v_specialization TEXT;
  v_invite TEXT;
BEGIN
  v_role := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'role', ''), 'PATIENT');
  v_first_name := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'firstName'), '');
  v_last_name := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'lastName'), '');
  v_birth_date := NULLIF(NEW.raw_user_meta_data ->> 'birthDate', '')::DATE;
  v_phone := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'phone'), '');
  v_specialization := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'specialization'), '');
  v_name := COALESCE(
    NULLIF(BTRIM(CONCAT_WS(' ', v_first_name, v_last_name)), ''),
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'name'), ''),
    split_part(NEW.email, '@', 1),
    'Usuario'
  );

  IF v_role = 'PSYCHOLOGIST' THEN
    IF v_first_name IS NULL
      OR v_last_name IS NULL
      OR v_birth_date IS NULL
      OR v_phone IS NULL
      OR v_specialization IS NULL THEN
      RAISE EXCEPTION 'Faltan datos obligatorios del perfil profesional.';
    END IF;
    v_invite := UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8));
  ELSE
    v_invite := NULL;
  END IF;

  INSERT INTO public.profiles (
    id, name, role, invite_code, first_name, last_name, birth_date, phone, specialization
  )
  VALUES (
    NEW.id, v_name, v_role, v_invite, v_first_name, v_last_name,
    v_birth_date, v_phone, v_specialization
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_psychologist_id()
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT psychologist_id FROM profiles WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.preview_psychologist_by_invite_code(p_invite_code text)
 RETURNS TABLE(id uuid, name text, avatar_url text, email text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT p.id, p.name, p.avatar_url, u.email::TEXT
  FROM public.profiles AS p
  JOIN auth.users AS u ON u.id = p.id
  WHERE p.role = 'PSYCHOLOGIST'
    AND p.invite_code = UPPER(BTRIM(p_invite_code))
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_psychologist_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_psychologist_id() TO authenticated;
REVOKE ALL ON FUNCTION public.preview_psychologist_by_invite_code(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.preview_psychologist_by_invite_code(text) TO authenticated;

-- ── Triggers ──────────────────────────────────────────────

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER journal_entry_date_is_immutable BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.prevent_journal_entry_date_change();
CREATE TRIGGER set_journal_updated_at BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_session_notes_updated_at BEFORE UPDATE ON public.session_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_goals_updated_at BEFORE UPDATE ON public.therapy_goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Permisos de columnas ──────────────────────────────────

REVOKE INSERT, UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (name, avatar_url, phone) ON TABLE public.profiles TO authenticated;
REVOKE UPDATE ON TABLE public.patient_psychologists FROM PUBLIC, anon, authenticated;
GRANT UPDATE (status, updated_at) ON TABLE public.patient_psychologists TO authenticated;

-- ── Row Level Security ────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_psychologists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapy_goals ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles: ver propio" ON public.profiles FOR SELECT
  USING ((auth.uid() = id));
CREATE POLICY "profiles: actualizar propio" ON public.profiles FOR UPDATE
  USING ((auth.uid() = id))
  WITH CHECK ((auth.uid() = id));
CREATE POLICY "profiles: patient views accepted psychologist" ON public.profiles FOR SELECT
  USING ((EXISTS ( SELECT 1 FROM public.patient_psychologists pp
    WHERE ((pp.patient_id = auth.uid()) AND (pp.psychologist_id = profiles.id) AND (pp.status = 'ACCEPTED'::text)))));
CREATE POLICY "profiles: psychologist views accepted patients" ON public.profiles FOR SELECT
  USING ((EXISTS ( SELECT 1 FROM public.patient_psychologists pp
    WHERE ((pp.patient_id = profiles.id) AND (pp.psychologist_id = auth.uid()) AND (pp.status = 'ACCEPTED'::text)))));
CREATE POLICY "profiles: psychologist views pending patients" ON public.profiles FOR SELECT
  USING ((EXISTS ( SELECT 1 FROM public.patient_psychologists pp
    WHERE ((pp.patient_id = profiles.id) AND (pp.psychologist_id = auth.uid()) AND (pp.status = 'PENDING'::text)))));

-- patient_psychologists
CREATE POLICY "Patients can view their own links" ON public.patient_psychologists FOR SELECT
  USING ((auth.uid() = patient_id));
CREATE POLICY "Psychologists can view links to them" ON public.patient_psychologists FOR SELECT
  USING ((auth.uid() = psychologist_id));
CREATE POLICY "Patients can create links" ON public.patient_psychologists FOR INSERT TO authenticated
  WITH CHECK (((( SELECT auth.uid() AS uid) = patient_id) AND (status = 'PENDING'::text) AND (patient_id <> psychologist_id)));
CREATE POLICY "Psychologists can update their links" ON public.patient_psychologists FOR UPDATE
  USING (((auth.uid() = psychologist_id) AND (status = 'PENDING'::text)))
  WITH CHECK (((auth.uid() = psychologist_id) AND (status = 'ACCEPTED'::text)));
CREATE POLICY "Patients can delete their links" ON public.patient_psychologists FOR DELETE
  USING ((auth.uid() = patient_id));
CREATE POLICY "Psychologists can delete links to them" ON public.patient_psychologists FOR DELETE
  USING ((auth.uid() = psychologist_id));

-- journal_entries: el paciente puede registrar, editar o borrar entradas de
-- hoy o de cualquier día anterior (nunca futuras). Los nombres "(1 semana)"
-- son heredados; la regla vigente no tiene límite de antigüedad.
CREATE POLICY "journal: paciente ve sus entradas" ON public.journal_entries FOR SELECT
  USING ((auth.uid() = patient_id));
CREATE POLICY "journal: paciente crea" ON public.journal_entries FOR INSERT
  WITH CHECK (((auth.uid() = patient_id) AND (entry_date <= ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date)));
CREATE POLICY "journal: paciente actualiza (1 semana)" ON public.journal_entries FOR UPDATE
  USING (((auth.uid() = patient_id) AND (entry_date <= ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date)))
  WITH CHECK (((auth.uid() = patient_id) AND (entry_date <= ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date)));
CREATE POLICY "journal: paciente elimina (1 semana)" ON public.journal_entries FOR DELETE
  USING (((auth.uid() = patient_id) AND (entry_date <= ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date)));
CREATE POLICY "journal: psychologist views accepted patients entries" ON public.journal_entries FOR SELECT
  USING ((EXISTS ( SELECT 1 FROM public.patient_psychologists pp
    WHERE ((pp.patient_id = journal_entries.patient_id) AND (pp.psychologist_id = auth.uid()) AND (pp.status = 'ACCEPTED'::text)))));

-- habits
CREATE POLICY "habits: paciente CRUD" ON public.habits FOR ALL
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "habits: psychologist views accepted patients" ON public.habits FOR SELECT
  USING ((EXISTS ( SELECT 1 FROM public.patient_psychologists pp
    WHERE ((pp.patient_id = habits.user_id) AND (pp.psychologist_id = auth.uid()) AND (pp.status = 'ACCEPTED'::text)))));

-- appointments
CREATE POLICY "appointments: psicologo CRUD" ON public.appointments FOR ALL
  USING ((auth.uid() = psychologist_id))
  WITH CHECK ((auth.uid() = psychologist_id));
CREATE POLICY "appointments: paciente ve las suyas" ON public.appointments FOR SELECT
  USING (((auth.uid() = patient_id) AND (date >= now())));

-- session_notes: los pacientes nunca acceden
CREATE POLICY "session_notes: solo el psicologo" ON public.session_notes FOR ALL
  USING ((auth.uid() = psychologist_id))
  WITH CHECK ((auth.uid() = psychologist_id));

-- therapy_goals
CREATE POLICY "goals: psicologo CRUD" ON public.therapy_goals FOR ALL
  USING ((auth.uid() = psychologist_id))
  WITH CHECK ((auth.uid() = psychologist_id));
CREATE POLICY "goals: paciente lee sus metas" ON public.therapy_goals FOR SELECT
  USING ((auth.uid() = patient_id));
