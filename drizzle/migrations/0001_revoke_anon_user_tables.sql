REVOKE ALL ON public.user_state FROM anon;
REVOKE ALL ON public.approved_players FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.approved_players FROM authenticated;