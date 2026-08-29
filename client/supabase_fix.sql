-- ============================================================
-- NexoMente / SOMA — FIX de autenticación y RLS (v2)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ============================================================
-- FIX 1: Confirmar emails de usuarios existentes sin confirmar
-- Esto resuelve "Email not confirmed" al intentar iniciar sesión
-- NOTA: confirmed_at es columna generada, solo actualizamos email_confirmed_at
-- ============================================================
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- ============================================================
-- FIX 2: Trigger handle_new_user — agregar ON CONFLICT DO NOTHING
-- Esto evita errores si el perfil ya existe (ej: doble trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role   TEXT;
  v_name   TEXT;
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

  -- ON CONFLICT DO NOTHING: si el perfil ya existe, no falla
  INSERT INTO public.profiles (id, name, role, invite_code)
  VALUES (
    NEW.id,
    COALESCE(v_name, split_part(NEW.email, '@', 1), 'Usuario'),
    COALESCE(v_role, 'PATIENT'),
    v_invite
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-crear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FIX 3: Crear perfiles faltantes para usuarios ya registrados
-- (cuentas creadas antes de que el trigger existiera)
-- ============================================================
INSERT INTO public.profiles (id, name, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1), 'Usuario'),
  COALESCE(u.raw_user_meta_data ->> 'role', 'PATIENT')
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FIX 4: Política RLS para INSERT en profiles
-- ============================================================
DROP POLICY IF EXISTS "profiles: insertar propio" ON public.profiles;
CREATE POLICY "profiles: insertar propio" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- FIX 5: Verificación — ver cuántos usuarios no tienen perfil
-- (el resultado debe ser 0 filas si todo funcionó)
-- ============================================================
SELECT
  u.id,
  u.email,
  u.email_confirmed_at,
  CASE WHEN p.id IS NOT NULL THEN 'OK' ELSE 'SIN PERFIL' END AS perfil_estado
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at DESC;
