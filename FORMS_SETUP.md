# Activate Forms Platform — Setup & Deploy

A single hub (`forms.html`) hosts many forms behind a dropdown. Pick a form → fill it out → AI writes a report → branded PDF is emailed to the recipients you list. Everything shares one engine; each form is just config.

This guide takes it live in ~30–45 min (most of it waiting on DNS).

## What's in the repo

| Path | What it is |
|---|---|
| `forms.html` | The hub — dropdown selector, shared form engine, autosave, access gate. Deploys with the rest of the site. |
| `forms/site-visit.js` | Form #1 definition (the questions). **Adding a form = add a file like this + one entry in `forms.ts`.** |
| `forms_setup.sql` | Creates the `form_submissions` table. Run once in Supabase. |
| `supabase/functions/submit-form/` | The form-agnostic Edge Function: Claude → PDF → Resend → store. |
| `supabase/functions/submit-form/forms.ts` | Server-side registry: `form_id` → system prompt. |

## Architecture

```
forms.html  ──POST { form_id, brief, header, recipients }──►  submit-form (Supabase Edge Function)
 (Netlify)                                                        │  returns 202 instantly
 dropdown picks a form                                            │  then, in the background:
 client builds the labeled "brief"                                ├─► Claude (per-form system prompt) → report JSON
 from its own question schema                                     ├─► jsPDF → branded PDF
                                                                  ├─► Resend → emails PDF to recipients
                                                                  └─► Supabase form_submissions
```

The client sends a ready-made **brief** (labeled answers) so the Edge Function stays generic — it only needs each form's system prompt.

---

## Step 1 — Anthropic API key
1. **console.anthropic.com** → sign in with the Activate account.
2. **Billing** → add a small credit balance (reports cost a few cents each).
3. **API Keys → Create Key** (name it `activate-forms`). Copy the `sk-ant-...` value.

## Step 2 — Resend (email delivery)
1. **resend.com** → sign up (free tier: 3,000/mo).
2. **Domains → Add Domain** → `activate.games`. Add the shown DNS records (SPF/DKIM) wherever activate.games DNS is managed. Wait for **Verified**.
3. **API Keys → Create** → copy the `re_...` value.

> No DNS access yet? Verify a subdomain like `mail.activate.games` and send from `forms@mail.activate.games`; set `SITE_VISIT_FROM` accordingly below.

## Step 3 — Database table
Supabase dashboard → project `pemmhbdggpgzykljchel` → **SQL Editor** → paste `forms_setup.sql` → **Run**.

## Step 4 — Deploy the Edge Function
```bash
brew install supabase/tap/supabase        # one time
supabase login
supabase link --project-ref pemmhbdggpgzykljchel
```
Set secrets:
```bash
supabase secrets set ANTHROPIC_API_KEY="sk-ant-...your key..."
supabase secrets set RESEND_API_KEY="re_...your key..."
supabase secrets set SITE_VISIT_FROM="Activate Forms <forms@activate.games>"
```
Deploy:
```bash
supabase functions deploy submit-form
```

**Optional — model:** defaults to `claude-sonnet-5`. For max depth: `supabase secrets set SITE_VISIT_MODEL="claude-opus-5"`.

**Optional — access code (turns the lock ON):** open until set. `supabase secrets set SITE_VISIT_ACCESS_CODE="pick-a-shared-code"` — the hub then shows an "Access code" screen and the endpoint rejects submissions without it. Unset + redeploy to turn off.

## Step 5 — Deploy the hub
```bash
git add forms.html forms/ forms_setup.sql supabase/ FORMS_SETUP.md
git commit -m "Add Activate Forms platform (multi-form hub + submit-form function)"
git push
```
Live at `https://<your-netlify-site>/forms.html`. Deep links work: `…/forms.html?form=site-visit`.

## Step 6 — Point forms.activate.games at it
You already own `activate.games`, so the subdomain is free — it's a Netlify custom-domain + one DNS record.
1. Netlify → your site → **Domain management → Add a domain** → `forms.activate.games`.
2. Netlify shows a target host. Wherever activate.games DNS lives, add a **CNAME**: `forms` → `<your-site>.netlify.app` (Netlify displays the exact value). (If DNS is on Netlify, it adds it for you.)
3. Netlify auto-provisions HTTPS once DNS resolves (a few minutes to a few hours).
4. Optional: to make the hub the bare landing page, either rename `forms.html` → `index.html` for this site, or add a redirect. Tell me and I'll wire it.

Then `https://forms.activate.games` is your shareable hub, and `https://forms.activate.games/?form=site-visit` sends someone straight to a specific form.

## Step 7 — End-to-end test
1. Open the hub, pick **Site Visit Report**, fill Section A (use your own email in Q7).
2. **Generate & Send Report** → "Report on its way".
3. `supabase functions logs submit-form` → look for `Submission <id> (site-visit) emailed to …`.
4. PDF arrives in ~1–2 min. Check the `form_submissions` table for the row + `status`.

---

## Adding a new form (the whole point)
1. **Client:** create `forms/<your-form>.js` (copy `site-visit.js`): set `id`, `name`, `recipientsField`, `required`, `header()`, and `sections`. Add `<script src="forms/<your-form>.js"></script>` in `forms.html` next to the site-visit one.
2. **Server:** add an entry to `FORMS` in `supabase/functions/submit-form/forms.ts` with the same `id` and a system prompt describing that form's report sections. Redeploy: `supabase functions deploy submit-form`.
3. Push. The new form appears in the dropdown automatically.

Field types available: `text`, `email`, `textarea`, `select`, `date-range`, `checks`, `repeater` (repeating groups like the AM blocks), `table` (like the ops table).

## Verified / notes
- **PDF renderer verified** locally (navy header, crimson rules, data table, bold-red safety bullets, page-break + footer). Live Claude call + Resend send are proven at first deploy.
- **Deno-specific fix baked in:** `jspdf-autotable` is imported for side-effect and called as `doc.autoTable(...)` (its default export isn't callable under Deno's npm interop).
- **Access control** is a server-enforced shared code (not per-person). Swap in the app's Supabase-Auth check later if you want individual logins.
- **Fonts:** Helvetica (close to Calibri); embedding Calibri is a later polish.
- **Phase 2 idea:** a no-code form builder that writes these config entries + a submissions dashboard (the `form_submissions` table already stores everything).
