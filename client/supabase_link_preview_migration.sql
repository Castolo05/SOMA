-- Permitir que una persona confirme la identidad del psicólogo antes
-- de enviar una solicitud, sin exponer correos al consultar profiles.
-- Ejecutar después de supabase_multiple_psychologists.sql.

CREATE OR REPLACE FUNCTION public.preview_psychologist_by_invite_code(p_invite_code TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  avatar_url TEXT,
  email TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id, p.name, p.avatar_url, u.email::TEXT
  FROM public.profiles AS p
  JOIN auth.users AS u ON u.id = p.id
  WHERE p.role = 'PSYCHOLOGIST'
    AND p.invite_code = UPPER(BTRIM(p_invite_code))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.preview_psychologist_by_invite_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preview_psychologist_by_invite_code(TEXT) TO authenticated;
