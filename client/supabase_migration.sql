-- ============================================================
-- NexoMente / SOMA — Supabase SQL Migration
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Extensiones ───────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Tabla: profiles (perfil público vinculado a auth.users) ──
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('PATIENT', 'PSYCHOLOGIST')),
  invite_code   TEXT UNIQUE,          -- Solo psicólogos
  psychologist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla: journal_entries ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mood_score      INTEGER NOT NULL CHECK (mood_score BETWEEN 1 AND 10),
  content         TEXT DEFAULT '',
  completed_habits TEXT[] DEFAULT '{}',       -- Array de IDs de hábitos completados
  habit_data      JSONB DEFAULT '{}',         -- { [habitId]: { done, qty, note } }
  flagged_for_session BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla: habits ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.habits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  icon          TEXT DEFAULT 'CheckCircle',
  tracking_type TEXT DEFAULT 'toggle' CHECK (tracking_type IN ('toggle', 'toggle+qty', 'qty')),
  unit          TEXT DEFAULT '',
  has_note      BOOLEAN DEFAULT FALSE,
  "order"       INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla: session_notes (PRIVADAS — solo psicólogo) ────
CREATE TABLE IF NOT EXISTS public.session_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  psychologist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           TEXT DEFAULT '',
  content         TEXT DEFAULT '',
  session_date    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla: appointments ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  psychologist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  date            TIMESTAMPTZ NOT NULL,
  duration        INTEGER DEFAULT 50,
  notes           TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabla: therapy_goals ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.therapy_goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  psychologist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text            TEXT NOT NULL,
  completed       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGER: crear perfil automáticamente al registrarse
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_name TEXT;
  v_invite TEXT;
BEGIN
  v_role := NEW.raw_user_meta_data ->> 'role';
  v_name := NEW.raw_user_meta_data ->> 'name';

  -- Generar invite_code único para psicólogos
  IF v_role = 'PSYCHOLOGIST' THEN
    v_invite := UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8));
  ELSE
    v_invite := NULL;
  END IF;

  INSERT INTO public.profiles (id, name, role, invite_code)
  VALUES (NEW.id, COALESCE(v_name, 'Usuario'), COALESCE(v_role, 'PATIENT'), v_invite);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_journal_updated_at ON public.journal_entries;
CREATE TRIGGER set_journal_updated_at BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_session_notes_updated_at ON public.session_notes;
CREATE TRIGGER set_session_notes_updated_at BEFORE UPDATE ON public.session_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_appointments_updated_at ON public.appointments;
CREATE TRIGGER set_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_goals_updated_at ON public.therapy_goals;
CREATE TRIGGER set_goals_updated_at BEFORE UPDATE ON public.therapy_goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Protección de datos
-- ============================================================

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_notes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapy_goals   ENABLE ROW LEVEL SECURITY;

-- ── profiles ──────────────────────────────────────────────
-- Ver tu propio perfil
DROP POLICY IF EXISTS "profiles: ver propio" ON public.profiles;
CREATE POLICY "profiles: ver propio" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Psicólogo ve perfiles de sus pacientes
DROP POLICY IF EXISTS "profiles: psicologo ve sus pacientes" ON public.profiles;
CREATE POLICY "profiles: psicologo ve sus pacientes" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'PSYCHOLOGIST'
        AND public.profiles.psychologist_id = auth.uid()
    )
  );

-- Paciente puede ver perfil de su psicólogo (para mostrar nombre)
DROP POLICY IF EXISTS "profiles: paciente ve su psicologo" ON public.profiles;
CREATE POLICY "profiles: paciente ve su psicologo" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'PATIENT'
        AND public.profiles.id = p.psychologist_id
    )
  );

-- Cualquiera puede buscar un psicólogo por invite_code (para vincularse)
DROP POLICY IF EXISTS "profiles: buscar por invite_code" ON public.profiles;
CREATE POLICY "profiles: buscar por invite_code" ON public.profiles
  FOR SELECT USING (invite_code IS NOT NULL AND role = 'PSYCHOLOGIST');

-- Actualizar tu propio perfil
DROP POLICY IF EXISTS "profiles: actualizar propio" ON public.profiles;
CREATE POLICY "profiles: actualizar propio" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ── journal_entries ───────────────────────────────────────
-- Paciente: CRUD de sus propias entradas
DROP POLICY IF EXISTS "journal: paciente ve sus entradas" ON public.journal_entries;
CREATE POLICY "journal: paciente ve sus entradas" ON public.journal_entries
  FOR SELECT USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "journal: paciente crea" ON public.journal_entries;
CREATE POLICY "journal: paciente crea" ON public.journal_entries
  FOR INSERT WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "journal: paciente actualiza (24h)" ON public.journal_entries;
CREATE POLICY "journal: paciente actualiza (24h)" ON public.journal_entries
  FOR UPDATE USING (
    auth.uid() = patient_id
    AND created_at > NOW() - INTERVAL '24 hours'
  );

DROP POLICY IF EXISTS "journal: paciente elimina (24h)" ON public.journal_entries;
CREATE POLICY "journal: paciente elimina (24h)" ON public.journal_entries
  FOR DELETE USING (
    auth.uid() = patient_id
    AND created_at > NOW() - INTERVAL '24 hours'
  );

-- Psicólogo: solo lectura de entradas de SUS pacientes
DROP POLICY IF EXISTS "journal: psicologo lee entradas de sus pacientes" ON public.journal_entries;
CREATE POLICY "journal: psicologo lee entradas de sus pacientes" ON public.journal_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'PSYCHOLOGIST'
        AND public.journal_entries.patient_id IN (
          SELECT id FROM public.profiles WHERE psychologist_id = auth.uid()
        )
    )
  );

-- ── habits ────────────────────────────────────────────────
-- Paciente: CRUD total de sus propios hábitos
DROP POLICY IF EXISTS "habits: paciente CRUD" ON public.habits;
CREATE POLICY "habits: paciente CRUD" ON public.habits
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── session_notes — PACIENTES NO PUEDEN ACCEDER NUNCA ────
-- Solo el psicólogo que las creó puede ver y editar sus notas
DROP POLICY IF EXISTS "session_notes: solo el psicologo" ON public.session_notes;
CREATE POLICY "session_notes: solo el psicologo" ON public.session_notes
  FOR ALL USING (auth.uid() = psychologist_id)
  WITH CHECK (auth.uid() = psychologist_id);

-- ── appointments ──────────────────────────────────────────
-- Psicólogo: CRUD total de sus citas
DROP POLICY IF EXISTS "appointments: psicologo CRUD" ON public.appointments;
CREATE POLICY "appointments: psicologo CRUD" ON public.appointments
  FOR ALL USING (auth.uid() = psychologist_id)
  WITH CHECK (auth.uid() = psychologist_id);

-- Paciente: solo lectura de sus citas futuras
DROP POLICY IF EXISTS "appointments: paciente ve las suyas" ON public.appointments;
CREATE POLICY "appointments: paciente ve las suyas" ON public.appointments
  FOR SELECT USING (
    auth.uid() = patient_id
    AND date >= NOW()
  );

-- ── therapy_goals ─────────────────────────────────────────
-- Psicólogo: CRUD
DROP POLICY IF EXISTS "goals: psicologo CRUD" ON public.therapy_goals;
CREATE POLICY "goals: psicologo CRUD" ON public.therapy_goals
  FOR ALL USING (auth.uid() = psychologist_id)
  WITH CHECK (auth.uid() = psychologist_id);

-- Paciente: solo lectura de sus metas
DROP POLICY IF EXISTS "goals: paciente lee sus metas" ON public.therapy_goals;
CREATE POLICY "goals: paciente lee sus metas" ON public.therapy_goals
  FOR SELECT USING (auth.uid() = patient_id);

-- ============================================================
-- ÍNDICES para rendimiento
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_journal_patient_id   ON public.journal_entries(patient_id);
CREATE INDEX IF NOT EXISTS idx_journal_created_at   ON public.journal_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_habits_user_id        ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_psych   ON public.session_notes(psychologist_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_patient ON public.session_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_psych    ON public.appointments(psychologist_id);
CREATE INDEX IF NOT EXISTS idx_goals_patient         ON public.therapy_goals(patient_id);
CREATE INDEX IF NOT EXISTS idx_profiles_psychologist ON public.profiles(psychologist_id);
CREATE INDEX IF NOT EXISTS idx_profiles_invite_code  ON public.profiles(invite_code) WHERE invite_code IS NOT NULL;
