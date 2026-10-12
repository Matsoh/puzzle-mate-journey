-- Allowlist: only rows here may play. No client write access at all.
CREATE TABLE public.approved_players (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  approved_at timestamptz NOT NULL DEFAULT now(),
  note text
);
GRANT SELECT ON public.approved_players TO authenticated;
GRANT ALL ON public.approved_players TO service_role;
ALTER TABLE public.approved_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read own approval" ON public.approved_players
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_approved_player()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.approved_players WHERE user_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION public.is_approved_player() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_approved_player() TO authenticated;

-- One row per saved store (progress, trainer, tournament, prep) per player.
CREATE TABLE public.user_state (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  store_key text NOT NULL CHECK (store_key ~ '^[a-z0-9.\-]{1,64}$'),
  data jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, store_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_state TO authenticated;
GRANT ALL ON public.user_state TO service_role;
ALTER TABLE public.user_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved read own state" ON public.user_state FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_approved_player());
CREATE POLICY "Approved insert own state" ON public.user_state FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_approved_player());
CREATE POLICY "Approved update own state" ON public.user_state FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.is_approved_player())
  WITH CHECK (user_id = auth.uid() AND public.is_approved_player());
CREATE POLICY "Approved delete own state" ON public.user_state FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND public.is_approved_player());

-- Optimistic save: writes only when the caller's revision matches. Returns new revision, or NULL on conflict.
-- Runs as the caller, so RLS above still applies. expected = 0 means "create only if missing" (used by import).
CREATE OR REPLACE FUNCTION public.save_user_state(p_key text, p_data jsonb, p_expected integer)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE r integer;
BEGIN
  IF NOT public.is_approved_player() THEN RAISE EXCEPTION 'not approved' USING ERRCODE = '42501'; END IF;
  IF p_expected = 0 THEN
    INSERT INTO public.user_state(user_id, store_key, data, revision)
      VALUES (auth.uid(), p_key, p_data, 1)
      ON CONFLICT (user_id, store_key) DO NOTHING
      RETURNING revision INTO r;
    RETURN r;
  END IF;
  UPDATE public.user_state SET data = p_data, revision = revision + 1, updated_at = now()
    WHERE user_id = auth.uid() AND store_key = p_key AND revision = p_expected
    RETURNING revision INTO r;
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.save_user_state(text, jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_user_state(text, jsonb, integer) TO authenticated;