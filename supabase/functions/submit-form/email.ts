// ============================================================
// Email delivery via Resend (direct REST API — no SDK).
// Sends the branded PDF as an attachment to all recipients.
// ============================================================

export interface SendArgs {
  to: string[];
  formName: string;   // "Site Visit Report"
  title: string;      // header.title, e.g. "Union Square"
  dates: string;
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

export async function sendReport(args: SendArgs): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const from = Deno.env.get("SITE_VISIT_FROM") || "Activate Site Visits <visits@activate.games>";

  const subject = [args.formName, args.title, args.dates].filter(Boolean).join(" — ");
  const body =
    `Attached is the ${args.formName}${args.title ? ` for ${args.title}` : ""}${args.dates ? ` (${args.dates})` : ""}. ` +
    `It was generated automatically from the submitted answers. Reply to this email with any questions.`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: args.to,
      subject,
      text: body,
      attachments: [{ filename: args.pdfName, content: toBase64(args.pdf) }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend send failed: HTTP ${res.status} ${detail}`);
  }
}
