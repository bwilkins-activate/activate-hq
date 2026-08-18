// ============================================================
// Email delivery.
// Transport is chosen at runtime:
//   - If SMTP_PASS is set  -> send via SMTP (e.g. Google Workspace/Gmail).
//     Sends from your real address to ANY recipient, no domain DNS needed.
//   - Otherwise            -> send via Resend (HTTP API).
// This lets us switch to a verified activate.games domain later by just
// changing secrets — no code change.
// ============================================================
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

export interface SendArgs {
  to: string[];
  formName: string;   // "New GM Training Debrief"
  title: string;      // header.title, e.g. "Union Square"
  dates: string;
  author: string;     // who filled out the form (submitter's name)
  pdf: Uint8Array;
  pdfName: string;
}

// Uint8Array -> base64 (chunked to avoid call-stack limits on large PDFs).
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function subjectAndBody(args: SendArgs) {
  const subject = [args.formName, args.title, args.dates].filter(Boolean).join(" — ");
  const who = args.author ? `${args.author}'s` : "the";
  const forTitle = args.title ? ` for ${args.title}` : "";
  const over = args.dates ? `, covering ${args.dates}` : "";
  const body =
    `Hey team,\n\n` +
    `Attached is ${who} ${args.formName}${forTitle}${over}.\n\n` +
    `Thanks,\n${args.author || "Activate Training"}`;
  return { subject, body };
}

// Force a plain-ASCII, single-line subject. denomailer mis-folds long
// RFC2047-encoded (non-ASCII) subjects over SMTP, leaking headers into the body,
// so we normalize dashes/arrows and strip anything non-ASCII here.
function asciiSubject(s: string): string {
  return s
    .replace(/[‒-―−]/g, "-") // – — ― figure/em dashes, minus
    .replace(/[→➔➡]/g, "->") // arrows
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E]/g, "") // drop any remaining non-ASCII
    .replace(/\s+/g, " ")
    .trim();
}

async function sendViaSMTP(args: SendArgs): Promise<void> {
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASS");
  const host = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
  const port = Number(Deno.env.get("SMTP_PORT") || "465");
  const from = Deno.env.get("SITE_VISIT_FROM") || user || "";
  if (!user || !pass) throw new Error("SMTP_USER / SMTP_PASS not set");

  const { subject: rawSubject, body } = subjectAndBody(args);
  const subject = asciiSubject(rawSubject);
  const client = new SMTPClient({
    connection: { hostname: host, port, tls: port === 465, auth: { username: user, password: pass } },
  });
  try {
    await client.send({
      from,
      to: args.to,
      subject,
      content: body,
      attachments: [
        { filename: args.pdfName, content: toBase64(args.pdf), encoding: "base64", contentType: "application/pdf" },
      ],
    });
  } finally {
    await client.close();
  }
}

async function sendViaResend(args: SendArgs): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const from = Deno.env.get("SITE_VISIT_FROM") || "Activate Forms <onboarding@resend.dev>";
  const { subject, body } = subjectAndBody(args);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to: args.to, subject, text: body,
      attachments: [{ filename: args.pdfName, content: toBase64(args.pdf) }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend send failed: HTTP ${res.status} ${detail}`);
  }
}

export async function sendReport(args: SendArgs): Promise<void> {
  if (Deno.env.get("SMTP_PASS")) return await sendViaSMTP(args);
  return await sendViaResend(args);
}
