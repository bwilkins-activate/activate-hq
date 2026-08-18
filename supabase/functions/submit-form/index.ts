// ============================================================
// submit-form — Supabase Edge Function (Deno), form-agnostic.
//
// Flow:
//   1. Receive { form_id, form_name, brief, header, recipients, ... }
//   2. Validate + look up the form's system prompt (forms.ts)
//   3. Insert a 'pending' row, return 202 immediately
//   4. In the background (EdgeRuntime.waitUntil):
//        Claude(systemPrompt, brief) -> report JSON -> branded PDF
//        -> Resend email -> update row status
//
// The client (forms.html) builds the labeled `brief` from its own
// question schema and computes `header`, so this function stays
// generic across every form — adding a form only needs a new entry
// in forms.ts.
//
// Env: ANTHROPIC_API_KEY, RESEND_API_KEY, SITE_VISIT_FROM (opt),
//      SITE_VISIT_MODEL (opt), SITE_VISIT_ACCESS_CODE (opt).
// Auto: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// ============================================================
import { getForm } from "./forms.ts";
import { buildPdf, type Report, type HeaderMeta } from "./pdf.ts";
import { sendReport } from "./email.ts";

// deno-lint-ignore no-explicit-any
declare const EdgeRuntime: any;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type, x-access-code",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MODEL = Deno.env.get("SITE_VISIT_MODEL") || "claude-sonnet-5";

const ACCESS_CODE = Deno.env.get("SITE_VISIT_ACCESS_CODE") || "";
function codeOk(req: Request): boolean {
  if (!ACCESS_CODE) return true;
  return (req.headers.get("x-access-code") || "") === ACCESS_CODE;
}

interface Payload {
  form_id: string;
  form_name?: string;
  brief: string;
  header?: Partial<HeaderMeta> & { title?: string; subtitle?: string; dates?: string; footer?: string };
  recipients?: string[];
  answers?: unknown;
  rep?: unknown;
  tbl?: unknown;
  meta?: unknown;
}

async function dbInsert(row: Record<string, unknown>): Promise<string | null> {
  const res = await fetch(`${SB_URL}/rest/v1/form_submissions`, {
    method: "POST",
    headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  if (!res.ok) { console.error("dbInsert failed", res.status, await res.text().catch(() => "")); return null; }
  const data = await res.json().catch(() => []);
  return data?.[0]?.id ?? null;
}
async function dbUpdate(id: string, patch: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${SB_URL}/rest/v1/form_submissions?id=eq.${id}`, {
    method: "PATCH",
    headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) console.error("dbUpdate failed", res.status, await res.text().catch(() => ""));
}

function parseReport(raw: string): Report {
  let s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const first = s.indexOf("{"), last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1) s = s.slice(first, last + 1);
  const obj = JSON.parse(s);
  if (!obj.sections || !Array.isArray(obj.sections)) throw new Error("Report JSON missing sections[]");
  return obj as Report;
}

async function callClaude(systemPrompt: string, brief: string): Promise<Report> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 8000, system: systemPrompt, messages: [{ role: "user", content: brief }] }),
  });
  if (!res.ok) throw new Error(`Anthropic error: HTTP ${res.status} ${await res.text().catch(() => "")}`);
  const data = await res.json();
  const text = (data?.content || []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("");
  if (!text) throw new Error("Anthropic returned no text");
  return parseReport(text);
}

async function process(id: string, payload: Payload, systemPrompt: string) {
  const to = payload.recipients || [];
  const h = payload.header || {};
  const title = h.title || "Report";
  const dates = h.dates || "";
  try {
    const report = await callClaude(systemPrompt, payload.brief);
    await dbUpdate(id, { report_json: report, status: "generated" });

    const pdf = buildPdf(report, {
      title,
      subtitle: h.subtitle || payload.form_name || "",
      dates,
      footerContact: h.footer || "Activate  |  Confidential",
    });
    const pdfName = `${(payload.form_name || "report").replace(/[^a-z0-9]+/gi, "-")}-${title.replace(/[^a-z0-9]+/gi, "-")}.pdf`;

    await sendReport({ to, formName: payload.form_name || "Report", title, dates, pdf, pdfName });
    await dbUpdate(id, { status: "emailed", emailed_at: new Date().toISOString(), pdf_size_bytes: pdf.length });
    console.log(`Submission ${id} (${payload.form_id}) emailed to ${to.join(", ")}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Submission ${id} failed:`, msg);
    await dbUpdate(id, { status: "error", error: msg });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method === "GET") return json(200, { ok: true, required: !!ACCESS_CODE, valid: codeOk(req) });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  if (!codeOk(req)) return json(401, { error: "Invalid or missing access code." });

  let payload: Payload;
  try { payload = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }

  const form = payload?.form_id ? getForm(payload.form_id) : null;
  if (!form) return json(400, { error: `Unknown form_id: ${payload?.form_id}` });
  if (!payload.brief || !String(payload.brief).trim()) return json(422, { error: "Empty submission." });
  const to = (payload.recipients || []).map((s) => String(s).trim()).filter(Boolean);
  if (!to.length) return json(422, { error: "At least one delivery email is required." });

  const h = payload.header || {};
  const id = await dbInsert({
    form_id: payload.form_id,
    form_name: payload.form_name || form.name,
    title: h.title || null,
    dates: h.dates || null,
    recipients: to,
    payload,
    status: "pending",
  });
  if (!id) return json(500, { error: "Could not save submission" });

  const work = process(id, { ...payload, recipients: to }, form.systemPrompt);
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) EdgeRuntime.waitUntil(work);
  else work.catch((e) => console.error(e));

  return json(202, { ok: true, id, recipients: to, message: "Report is generating and will be emailed shortly." });
});
