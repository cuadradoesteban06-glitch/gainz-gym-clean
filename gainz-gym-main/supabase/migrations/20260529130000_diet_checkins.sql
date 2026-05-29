-- =============================================================
-- diet_checkins: seguimiento diario de adherencia al plan
-- =============================================================
CREATE TABLE public.diet_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  diet_id uuid NOT NULL REFERENCES public.diets(id) ON DELETE CASCADE,
  date date NOT NULL,
  meals_completed integer NOT NULL DEFAULT 0 CHECK (meals_completed >= 0),
  meals_total integer NOT NULL DEFAULT 0 CHECK (meals_total >= 0),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, diet_id, date)
);

CREATE INDEX idx_diet_checkins_user_diet_date ON public.diet_checkins(user_id, diet_id, date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diet_checkins TO authenticated;
GRANT ALL ON public.diet_checkins TO service_role;

ALTER TABLE public.diet_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY diet_checkins_select ON public.diet_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY diet_checkins_insert ON public.diet_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY diet_checkins_update ON public.diet_checkins FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY diet_checkins_delete ON public.diet_checkins FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER diet_checkins_touch
  BEFORE UPDATE ON public.diet_checkins
  FOR EACH ROW EXECUTE FUNCTION public.forge_states_touch_updated_at();
