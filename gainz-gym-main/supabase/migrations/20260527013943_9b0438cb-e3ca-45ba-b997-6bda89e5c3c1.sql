CREATE TABLE public.forge_states (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.forge_states TO authenticated;
GRANT ALL ON public.forge_states TO service_role;

ALTER TABLE public.forge_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_select" ON public.forge_states FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.forge_states FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.forge_states FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.forge_states FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.forge_states_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER forge_states_set_updated_at
BEFORE UPDATE ON public.forge_states
FOR EACH ROW EXECUTE FUNCTION public.forge_states_touch_updated_at();