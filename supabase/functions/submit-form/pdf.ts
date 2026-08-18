// ============================================================
// Branded PDF renderer for the Site Visit Debrief.
// Consumes the structured JSON from Claude and lays it out to
// match the Union Square debrief reference: navy header band,
// crimson section rules, navy/white data table, red bullets.
// Pure jsPDF — no headless browser (runs in Supabase Edge / Deno).
// ============================================================
import { jsPDF } from "npm:jspdf@2.5.2";
// Side-effect import: registers the `autoTable` method on the jsPDF prototype.
// (In Deno's npm interop the default export is a helpers bag, not callable — the
// plugin method form `doc.autoTable(opts)` is the reliable path. Verified locally.)
import "npm:jspdf-autotable@3.8.4";

export interface ReportBlock {
  type: "paragraph" | "subhead" | "bullets" | "table" | "columns";
  text?: string;
  items?: { text: string; priority?: boolean }[];
  columns?: string[];
  rows?: string[][];
  cols?: { heading: string; items: string[] }[]; // for the "columns" snapshot block
}
export interface ReportSection { n: number; title: string; blocks: ReportBlock[]; }
export interface Report { sections: ReportSection[]; }

export interface HeaderMeta {
  title: string;         // navy-band title, e.g. "Union Square"
  subtitle: string;      // line under it, e.g. "Site Visit Debrief — Brett Wilkins (GM, Lexington)"
  dates: string;         // "August 2026" or "8/7 → 8/9/2026" (may be "")
  footerContact: string; // e.g. "Brett Wilkins  |  Training Team  |  bwilkins@activate.games"
}

// Brand palette (RGB)
const NAVY: [number, number, number] = [26, 58, 92];
const CRIMSON: [number, number, number] = [192, 20, 60];
const GREEN: [number, number, number] = [39, 119, 60];
const BODY: [number, number, number] = [42, 46, 54];
const MUTED: [number, number, number] = [140, 148, 165];
const ROW_ALT: [number, number, number] = [240, 244, 248];

const PAGE_W = 612;   // Letter, 72dpi points
const PAGE_H = 792;
const MARGIN = 54;    // 0.75"
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = PAGE_H - 34;
const BOTTOM_LIMIT = PAGE_H - 56;

export function buildPdf(report: Report, meta: HeaderMeta): Uint8Array {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  let y = 0;

  const footer = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const line = `${meta.footerContact}  |  Confidential`;
    doc.text(line, PAGE_W / 2, FOOTER_Y, { align: "center" });
    doc.setDrawColor(210, 216, 226);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, FOOTER_Y - 12, PAGE_W - MARGIN, FOOTER_Y - 12);
  };

  const newPage = () => { doc.addPage(); footer(); y = MARGIN; };

  const ensure = (needed: number) => { if (y + needed > BOTTOM_LIMIT) newPage(); };

  // ---- Header band (page 1) ----
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 74, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(`ACTIVATE GAMES — ${(meta.title || "").toUpperCase()}`, MARGIN, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(198, 212, 232);
  const sub = [meta.subtitle, meta.dates].filter(Boolean).join("  |  ");
  doc.text(sub, MARGIN, 58);
  footer();
  y = 104;

  // ---- Table of contents ----
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CONTENTS", MARGIN, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BODY);
  report.sections.forEach((s) => {
    ensure(15);
    doc.text(`${s.n}.  ${s.title}`, MARGIN, y);
    y += 15;
  });
  y += 12;

  // ---- Sections ----
  const heading = (s: ReportSection) => {
    ensure(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text(`${s.n}.  ${s.title.toUpperCase()}`, MARGIN, y);
    y += 7;
    doc.setDrawColor(...CRIMSON);
    doc.setLineWidth(1.2);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 16;
  };

  const paragraph = (text: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...BODY);
    const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
    lines.forEach((ln) => {
      ensure(14);
      doc.text(ln, MARGIN, y);
      y += 14;
    });
    y += 6;
  };

  const subhead = (text: string) => {
    ensure(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...NAVY);
    doc.text(text, MARGIN, y);
    y += 15;
  };

  const bullets = (items: { text: string; priority?: boolean }[]) => {
    items.forEach((it) => {
      const color = it.priority ? CRIMSON : BODY;
      doc.setFont("helvetica", it.priority ? "bold" : "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(it.text, CONTENT_W - 16) as string[];
      lines.forEach((ln, i) => {
        ensure(14);
        if (i === 0) {
          doc.setTextColor(...CRIMSON);
          doc.text("•", MARGIN + 2, y);
        }
        doc.setTextColor(...color);
        doc.text(ln, MARGIN + 16, y);
        y += 14;
      });
      y += 2;
    });
    y += 6;
  };

  const table = (cols: string[], rows: string[][]) => {
    ensure(60);
    // deno-lint-ignore no-explicit-any
    (doc as any).autoTable({
      startY: y,
      head: [cols],
      body: rows,
      margin: { left: MARGIN, right: MARGIN },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 6, textColor: BODY, lineColor: [210, 216, 226], lineWidth: 0.5 },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold", halign: "left" },
      alternateRowStyles: { fillColor: ROW_ALT },
      // keep footer painting on any page autotable adds
      didDrawPage: () => footer(),
    });
    // advance cursor past the table
    // deno-lint-ignore no-explicit-any
    const finalY = (doc as any).lastAutoTable?.finalY;
    y = (finalY ? finalY : y) + 16;
  };

  // Two-column snapshot (e.g. Major Wins | Coaching Priorities).
  const twocol = (cols: { heading: string; items: string[] }[]) => {
    const pair = cols.slice(0, 2);
    const gutter = 22;
    const colW = (CONTENT_W - gutter) / 2;
    ensure(96); // keep the snapshot together; push to a new page if tight
    const startY = y;
    let maxY = y;
    pair.forEach((c, ci) => {
      const accent = ci === 0 ? GREEN : CRIMSON;
      const x = MARGIN + ci * (colW + gutter);
      let cy = startY;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...accent);
      doc.text((c.heading || "").toUpperCase(), x, cy);
      cy += 7;
      doc.setDrawColor(...accent);
      doc.setLineWidth(1);
      doc.line(x, cy, x + colW, cy);
      cy += 15;
      doc.setFontSize(9.5);
      (c.items || []).forEach((it) => {
        const lines = doc.splitTextToSize(it, colW - 12) as string[];
        lines.forEach((ln, i) => {
          if (i === 0) { doc.setFont("helvetica", "bold"); doc.setTextColor(...accent); doc.text("•", x, cy); }
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...BODY);
          doc.text(ln, x + 12, cy);
          cy += 13;
        });
        cy += 3;
      });
      if (cy > maxY) maxY = cy;
    });
    y = maxY + 8;
  };

  report.sections.forEach((s) => {
    heading(s);
    (s.blocks || []).forEach((b) => {
      if (b.type === "paragraph" && b.text) paragraph(b.text);
      else if (b.type === "subhead" && b.text) subhead(b.text);
      else if (b.type === "bullets" && b.items?.length) bullets(b.items);
      else if (b.type === "table" && b.columns?.length) table(b.columns, b.rows || []);
      else if (b.type === "columns" && b.cols?.length) twocol(b.cols);
    });
    y += 8;
  });

  const ab = doc.output("arraybuffer") as ArrayBuffer;
  return new Uint8Array(ab);
}
