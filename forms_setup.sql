-- ============================================================
-- Activate Forms platform — Supabase setup
-- Run in the Supabase dashboard SQL editor for project
-- pemmhbdggpgzykljchel. Safe to re-run (IF NOT EXISTS).
-- Powers forms.html + the submit-form Edge Function.
-- (Supersedes the earlier site_visit_reports table.)
-- ============================================================

-- One row per submitted form (any form type).
CREATE TABLE IF NOT EXISTS form_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at     timestamptz DEFAULT now(),
  form_id        text NOT NULL,      -- e.g. 'site-visit'
  form_name      text,               -- display name at submit time
  title          text,               -- header.title (e.g. location visited)
  dates          text,               -- header.dates (free text)
  recipients     text[],             -- delivery emails
  payload        jsonb NOT NULL,     -- full raw submission (brief, answers, rep, tbl, header)
  report_json    jsonb,              -- structured report the AI produced
  status         text DEFAULT 'pending',  -- pending | generated | emailed | error
  error          text,
  pdf_size_bytes integer,
  emailed_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_fs_form_date ON form_submissions(form_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fs_status    ON form_submissions(status, created_at DESC);

-- RLS ON with NO public policy: the Edge Function writes with the
-- service-role key (bypasses RLS), so submissions stay private from
-- the browser's anon key. Add an admin-read policy later if a
-- dashboard needs to list submissions.
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
-- ============================================================
