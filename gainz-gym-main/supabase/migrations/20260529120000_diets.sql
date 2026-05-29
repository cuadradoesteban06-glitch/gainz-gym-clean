-- =============================================================
-- diets: planes alimenticios generados por IA
-- =============================================================
CREATE TABLE public.diets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Plan nutricional',
  goal text NOT NULL DEFAULT '',
  calories integer NOT NULL DEFAULT 0,
  protein_g integer NOT NULL DEFAULT 0,
  carbs_g integer NOT NULL DEFAULT 0,
  fat_g integer NOT NULL DEFAULT 0,
  restrictions jsonb NOT NULL DEFAULT '[]'::jsonb,
  meals jsonb NOT NULL DEFAULT '[]'::jsonb,
  replacements jsonb NOT NULL DEFAULT '[]'::jsonb,
  reasoning text NOT NULL DEFAULT '',
  shopping_list jsonb NOT NULL DEFAULT '[]'::jsonb,
  profile_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_diets_user_created ON public.diets(user_id, created_at DESC);
CREATE INDEX idx_diets_user_active ON public.diets(user_id, is_active) WHERE is_active = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diets TO authenticated;
GRANT ALL ON public.diets TO service_role;

ALTER TABLE public.diets ENABLE ROW LEVEL SECURITY;

CREATE POLICY diets_select ON public.diets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY diets_insert ON public.diets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY diets_update ON public.diets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY diets_delete ON public.diets FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER diets_touch
  BEFORE UPDATE ON public.diets
  FOR EACH ROW EXECUTE FUNCTION public.forge_states_touch_updated_at();
