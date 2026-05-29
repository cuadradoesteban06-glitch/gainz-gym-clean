
-- =============================================================
-- exercise_logs: cada serie completada
-- =============================================================
CREATE TABLE public.exercise_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exercise_id text NOT NULL,
  exercise_name text NOT NULL,
  muscle_group text NOT NULL,
  workout_id text,
  workout_name text,
  date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  set_index integer NOT NULL DEFAULT 0,
  weight_kg numeric(7,2),
  reps integer NOT NULL DEFAULT 0,
  is_pr boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_exercise_logs_user_date ON public.exercise_logs(user_id, date DESC);
CREATE INDEX idx_exercise_logs_user_exercise ON public.exercise_logs(user_id, exercise_id, date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_logs TO authenticated;
GRANT ALL ON public.exercise_logs TO service_role;

ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY own_select ON public.exercise_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY own_insert ON public.exercise_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY own_update ON public.exercise_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY own_delete ON public.exercise_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- =============================================================
-- coach_messages: chat con la IA
-- =============================================================
CREATE TABLE public.coach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coach_messages_user_created ON public.coach_messages(user_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_messages TO authenticated;
GRANT ALL ON public.coach_messages TO service_role;

ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY own_select ON public.coach_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY own_insert ON public.coach_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY own_delete ON public.coach_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- =============================================================
-- user_coach_profile: memoria adaptativa
-- =============================================================
CREATE TABLE public.user_coach_profile (
  user_id uuid PRIMARY KEY,
  injuries jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferences jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_coach_profile TO authenticated;
GRANT ALL ON public.user_coach_profile TO service_role;

ALTER TABLE public.user_coach_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY own_select ON public.user_coach_profile FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY own_insert ON public.user_coach_profile FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY own_update ON public.user_coach_profile FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER user_coach_profile_touch
  BEFORE UPDATE ON public.user_coach_profile
  FOR EACH ROW EXECUTE FUNCTION public.forge_states_touch_updated_at();


-- =============================================================
-- daily_checkins: dolor/molestia por día
-- =============================================================
CREATE TABLE public.daily_checkins (
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  pain_areas jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_checkins TO authenticated;
GRANT ALL ON public.daily_checkins TO service_role;

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY own_select ON public.daily_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY own_insert ON public.daily_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY own_update ON public.daily_checkins FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY own_delete ON public.daily_checkins FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER daily_checkins_touch
  BEFORE UPDATE ON public.daily_checkins
  FOR EACH ROW EXECUTE FUNCTION public.forge_states_touch_updated_at();


-- =============================================================
-- routine_overrides: rutina modificada para un día
-- =============================================================
CREATE TABLE public.routine_overrides (
  user_id uuid NOT NULL,
  date date NOT NULL,
  workout_id text NOT NULL,
  workout_name text NOT NULL,
  focus text NOT NULL DEFAULT '',
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  reasoning text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date, workout_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.routine_overrides TO authenticated;
GRANT ALL ON public.routine_overrides TO service_role;

ALTER TABLE public.routine_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY own_select ON public.routine_overrides FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY own_insert ON public.routine_overrides FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY own_update ON public.routine_overrides FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY own_delete ON public.routine_overrides FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER routine_overrides_touch
  BEFORE UPDATE ON public.routine_overrides
  FOR EACH ROW EXECUTE FUNCTION public.forge_states_touch_updated_at();
