-- Agrega los datos profesionales requeridos durante el registro.
-- Ejecutar en Supabase Dashboard → SQL Editor después de las migraciones existentes.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS specialization TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_specialization_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_specialization_check CHECK (
        specialization IS NULL OR specialization IN (
          'Psicólogo/a',
          'Psiquiatra',
          'Pediatra',
          'Psicopedagogo/a',
          'Terapeuta ocupacional',
          'Fonoaudiólogo/a',
          'Trabajador/a social',
          'Otro/a profesional de salud'
        )
      );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
