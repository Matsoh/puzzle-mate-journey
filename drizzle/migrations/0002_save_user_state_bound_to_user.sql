-- Same as save_user_state, but the client also states which user the snapshot belongs to.
-- A stale snapshot from a previous login can never land in another account's row.
CREATE OR REPLACE FUNCTION public.save_user_state_for(p_user uuid, p_key text, p_data jsonb, p_expected integer)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF p_user IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'user mismatch' USING ERRCODE = '42501'; END IF;
  RETURN public.save_user_state(p_key, p_data, p_expected);
END $$;
REVOKE ALL ON FUNCTION public.save_user_state_for(uuid, text, jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_user_state_for(uuid, text, jsonb, integer) TO authenticated;