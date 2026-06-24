-- ============================================================
-- Activate Deployment System — Phase 1 Supabase setup
-- Run this in the Supabase dashboard SQL editor for project
-- pemmhbdggpgzykljchel. Safe to re-run (IF NOT EXISTS).
-- Does NOT touch the existing ag_trips table.
-- ============================================================

-- Deployment log: one row per locked deployment
CREATE TABLE IF NOT EXISTS deployment_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id text NOT NULL DEFAULT 'lexington',
  locked_by text NOT NULL,           -- manager name (sync-key era; later: user email)
  locked_at timestamptz DEFAULT now(),
  shift_date date NOT NULL,
  shift_type text,                   -- 'Open', 'Mid', 'Close', or null
  roster_snapshot jsonb NOT NULL,    -- full roster array at lock time
  announcement text,
  is_complete boolean DEFAULT false,
  completeness_score integer,        -- 0-100
  completeness_flags jsonb           -- { "missing_zones": [], "missing_times": [] }
);

-- Index for the TV display / log queries (latest deployment for a location+date)
CREATE INDEX IF NOT EXISTS idx_deplogs_location_date
  ON deployment_logs(location_id, shift_date DESC, locked_at DESC);

-- TV display table: one row per location, upserted on each lock
CREATE TABLE IF NOT EXISTS tv_state (
  location_id text PRIMARY KEY,
  location_name text,                -- display name, e.g. 'Lexington'
  current_deployment jsonb,          -- same shape as roster_snapshot above
  announcement text,
  last_locked_at timestamptz,
  last_locked_by text,
  shift_date date,
  shift_type text
);
-- If tv_state already exists from an earlier run, add the new column:
ALTER TABLE tv_state ADD COLUMN IF NOT EXISTS location_name text;

-- Access directory: maps a hashed sync key -> location + role.
-- key_hash = SHA-256 hex of 'activate-key:' + the typed key (raw key never stored).
-- One location can have a manager key (edits) and a view key (read-only).
CREATE TABLE IF NOT EXISTS access_keys (
  key_hash text PRIMARY KEY,
  location_id text NOT NULL,
  location_name text NOT NULL,
  role text NOT NULL DEFAULT 'manager'   -- 'manager' | 'view'
);
CREATE INDEX IF NOT EXISTS idx_access_keys_location ON access_keys(location_id);

-- ============================================================
-- Row-Level Security
-- Phase 1: RLS is intentionally DISABLED on both tables. The TV
-- display is public/read-only and the app uses the anon key, so
-- anon read+write is acceptable for a single trusted location.
-- ENABLE RLS in Phase 3 when real Supabase Auth + per-location
-- roles are introduced (see PHASE3_PLAN.md).
-- ============================================================
ALTER TABLE deployment_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE tv_state        DISABLE ROW LEVEL SECURITY;
ALTER TABLE access_keys     DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- PHASE 3 (start) — Central TV content control (admin.html)
-- One ordered slide list per location. TVs read it; only
-- logged-in admins (Supabase Auth) can change it.
-- ============================================================
CREATE TABLE IF NOT EXISTS tv_slides (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id text NOT NULL,
  position int NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'image',   -- 'deployment' | 'image' | 'url'
  src text,                             -- image URL or web URL (null for deployment)
  label text,
  duration int NOT NULL DEFAULT 30,     -- seconds on screen
  enabled boolean NOT NULL DEFAULT true,
  updated_by text,                      -- admin email who last saved
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tv_slides_loc ON tv_slides(location_id, position);

-- RLS: TVs (anonymous) may READ; only authenticated admins may WRITE.
ALTER TABLE tv_slides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tv_slides_read  ON tv_slides;
CREATE POLICY tv_slides_read  ON tv_slides FOR SELECT USING (true);
DROP POLICY IF EXISTS tv_slides_write ON tv_slides;
CREATE POLICY tv_slides_write ON tv_slides FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- Storage policies for uploaded slide images.
-- FIRST create a PUBLIC bucket named 'tv-slides' in the dashboard
-- (Storage -> New bucket -> name: tv-slides -> Public bucket: ON),
-- THEN run these so logged-in admins can upload into it:
-- ------------------------------------------------------------
DROP POLICY IF EXISTS tvslides_obj_read  ON storage.objects;
CREATE POLICY tvslides_obj_read  ON storage.objects FOR SELECT USING (bucket_id = 'tv-slides');
DROP POLICY IF EXISTS tvslides_obj_write ON storage.objects;
CREATE POLICY tvslides_obj_write ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'tv-slides');
DROP POLICY IF EXISTS tvslides_obj_del   ON storage.objects;
CREATE POLICY tvslides_obj_del   ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'tv-slides');

-- ============================================================
-- ADMIN LOGIN ACCOUNTS (individual logins)
-- The admin panel (admin.html) signs in with Supabase Auth.
-- Create one account per ops/IT person, ONE TIME, in the dashboard:
--   Authentication -> Users -> Add user -> enter email + password.
-- Also turn OFF email confirmation for smooth internal logins:
--   Authentication -> Providers -> Email -> uncheck "Confirm email".
-- No separate table needed — having a Supabase Auth account IS the
-- access list. (Optional audit table below if you want names/roles.)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  email text PRIMARY KEY,
  name text,
  role text DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_users_rw ON admin_users;
CREATE POLICY admin_users_rw ON admin_users FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- PHASE 2 — Real Supabase Auth with roles
-- ============================================================

-- Locations master list. Seed one row per physical location.
-- id = slug (e.g. 'lexington'), name = display name, region for rollups.
CREATE TABLE IF NOT EXISTS locations (
  id text PRIMARY KEY,
  name text NOT NULL,
  region text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;

-- Profiles: one row per Supabase Auth user, created by IT/admin.
-- role: 'agent' (shared nationwide read-only) | 'manager' | 'gm' | 'rd' | 'admin'
-- location_id is NULL for agents (they pick at login) and admins/rds.
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('agent','manager','gm','rd','admin')),
  location_id text REFERENCES locations(id),
  location_name text,
  full_name text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_self_read ON profiles;
CREATE POLICY profiles_self_read ON profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS profiles_admin_all ON profiles;
CREATE POLICY profiles_admin_all ON profiles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','rd')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','rd')));

-- ============================================================
-- SEED: shared agent account
-- After running this SQL, create ONE Supabase Auth user in the dashboard:
--   Authentication -> Users -> Add user
--   Email: staff@activate.games   Password: Activate3535
--   (uncheck "Confirm email" if not already done)
-- Then run this to create the profile (replace <uuid> with the user's id):
--   INSERT INTO profiles (id, role) VALUES ('<uuid>', 'agent')
--   ON CONFLICT (id) DO NOTHING;
--
-- Per-location manager accounts: create Auth user per manager, then:
--   INSERT INTO profiles (id, role, location_id, location_name, full_name)
--   VALUES ('<uuid>', 'manager', 'lexington', 'Activate Lexington', 'Brett Wilkins');
--
-- Seed locations (add all ~28; this is the starter set):
INSERT INTO locations (id, name, region) VALUES
  ('lexington', 'Activate Lexington', 'Southeast')
ON CONFLICT (id) DO NOTHING;
-- ============================================================
