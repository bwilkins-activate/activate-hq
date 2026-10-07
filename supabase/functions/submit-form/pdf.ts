// ============================================================
// Branded PDF renderer for Activate reports (Activate brand).
// Light document on a Gray-100 page border with a white Space Window.
// Fonts: Space Grotesk (body/headlines — Rapid fallback per brand),
// Space Mono (labels/data). Palette: Indigo / Cyan / Gray only.
// Pure jsPDF — runs in Supabase Edge (Deno), no headless browser.
// ============================================================
import { jsPDF } from "npm:jspdf@2.5.2";
import "npm:jspdf-autotable@3.8.4";
import { SPACE_GROTESK_BOLD, SPACE_GROTESK_REGULAR, SPACE_MONO_REGULAR, WORDMARK_INDIGO_PNG } from "./brandassets.ts";

export interface ReportBlock {
  type: "paragraph" | "subhead" | "bullets" | "table" | "columns";
  text?: string;
  items?: { text: string; priority?: boolean }[];
  columns?: string[];
  rows?: string[][];
  cols?: { heading: string; items: string[] }[];
}
export interface ReportSection { n: number; title: string; blocks: ReportBlock[]; }
export interface Report { sections: ReportSection[]; }

export interface HeaderMeta {
  title: string;         // subject, e.g. "Clay Haton — Town Square, Las Vegas"
  subtitle: string;      // e.g. "GM Training Debrief — hosted by Brett Wilkins (GM, Lexington)"
  dates: string;
  footerContact: string; // e.g. "Brett Wilkins · Training Clay Haton · Aug 11–15, 2026"
}

// ---- Activate palette (RGB) ----
type RGB = [number, number, number];
const INDIGO100: RGB = [61, 91, 242];
const INDIGO200: RGB = [0, 23, 140];
const INDIGO300: RGB = [0, 11, 64];
const CYAN: RGB = [0, 255, 255];
const MAGENTA: RGB = [255, 0, 255]; // warning marker (icon use only)
const GRAY100: RGB = [229, 233, 255];
const GRAY200: RGB = [195, 201, 229];
const GRAY300: RGB = [87, 89, 102];
const WHITE: RGB = [255, 255, 255];
const BODY = INDIGO300;

// ---- Page geometry (points, 72dpi Letter) ----
const PAGE_W = 612;
const PAGE_H = 792;
const INSET = 17;    // Gray-100 border band ≈ 0.24in
const CUT = 18;      // 45° Space Window corner cut
const MARGIN = 52;   // content margin (inside the white window)
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = PAGE_H - INSET - 16;
const BOTTOM_LIMIT = FOOTER_Y - 20;

// Space Window (symmetric octagon) filled with `color`.
// deno-lint-ignore no-explicit-any
function fillWindow(doc: any, x: number, y: number, w: number, h: number, c: number, color: RGB) {
  doc.setFillColor(...color);
  const segs = [
    [w - 2 * c, 0], [c, c], [0, h - 2 * c], [-c, c],
    [-(w - 2 * c), 0], [-c, -c], [0, -(h - 2 * c)], [c, -c],
  ];
  doc.lines(segs, x + c, y, [1, 1], "F", true);
}

export function buildPdf(report: Report, meta: HeaderMeta): Uint8Array {
  const doc = new jsPDF({ unit: "pt", format: "letter" });

  // Register brand fonts.
  doc.addFileToVFS("SG-Regular.ttf", SPACE_GROTESK_REGULAR);
  doc.addFont("SG-Regular.ttf", "SpaceGrotesk", "normal");
  doc.addFileToVFS("SG-Bold.ttf", SPACE_GROTESK_BOLD);
  doc.addFont("SG-Bold.ttf", "SpaceGrotesk", "bold");
  doc.addFileToVFS("SM-Regular.ttf", SPACE_MONO_REGULAR);
  doc.addFont("SM-Regular.ttf", "SpaceMono", "normal");

  const display = (s: number) => { doc.setFont("SpaceGrotesk", "bold"); doc.setFontSize(s); };
  const bodyFont = (s: number) => { doc.setFont("SpaceGrotesk", "normal"); doc.setFontSize(s); };
  const mono = (s: number) => { doc.setFont("SpaceMono", "normal"); doc.setFontSize(s); };

  let y = 0;

  const footer = () => {
    mono(7.5);
    doc.setTextColor(...GRAY300);
    doc.text(meta.footerContact || "", PAGE_W / 2, FOOTER_Y, { align: "center" });
    doc.setDrawColor(...GRAY200);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, FOOTER_Y - 12, PAGE_W - MARGIN, FOOTER_Y - 12);
  };

  const chrome = () => {
    doc.setFillColor(...GRAY100);
    doc.rect(0, 0, PAGE_W, PAGE_H, "F");
    fillWindow(doc, INSET, INSET, PAGE_W - 2 * INSET, PAGE_H - 2 * INSET, CUT, WHITE);
    footer();
  };

  const newPage = () => { doc.addPage(); chrome(); y = MARGIN; };
  const ensure = (needed: number) => { if (y + needed > BOTTOM_LIMIT) newPage(); };

  // ---- Page 1 chrome + masthead ----
  chrome();
  // Wordmark (Indigo on white) — placed, never typed.
  const logoW = 132, logoH = logoW * (240 / 1600);
  doc.addImage("data:image/png;base64," + WORDMARK_INDIGO_PNG, "PNG", MARGIN, 40, logoW, logoH);
  y = 40 + logoH + 26;
  // Report subject (big title)
  display(16);
  doc.setTextColor(...INDIGO100);
  const titleLines = doc.splitTextToSize((meta.title || "").toUpperCase(), CONTENT_W) as string[];
  titleLines.forEach((ln) => { doc.text(ln, MARGIN, y); y += 19; });
  // Subtitle + dates
  mono(9);
  doc.setTextColor(...GRAY300);
  const subLine = [meta.subtitle, meta.dates].filter(Boolean).join("   ·   ");
  doc.splitTextToSize(subLine, CONTENT_W).forEach((ln: string) => { y += 2; doc.text(ln, MARGIN, y); y += 12; });
  y += 10;
  doc.setDrawColor(...INDIGO100);
  doc.setLineWidth(1.4);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 20;

  // ---- Table of contents ----
  mono(10);
  doc.setTextColor(...INDIGO200);
  doc.text("CONTENTS", MARGIN, y);
  y += 16;
  report.sections.forEach((s) => {
    ensure(15);
    mono(9);
    doc.setTextColor(...INDIGO100);
    doc.text(String(s.n).padStart(2, "0"), MARGIN, y);
    bodyFont(10);
    doc.setTextColor(...BODY);
    doc.text(s.title, MARGIN + 24, y);
    y += 15;
  });
  y += 14;

  // ---- Section helpers ----
  const heading = (s: ReportSection) => {
    ensure(42);
    display(12.5);
    doc.setTextColor(...INDIGO100);
    doc.text(`${String(s.n).padStart(2, "0")}   ${s.title.toUpperCase()}`, MARGIN, y);
    y += 8;
    doc.setDrawColor(...INDIGO100);
    doc.setLineWidth(1);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 17;
  };

  const paragraph = (text: string) => {
    const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
    lines.forEach((ln) => {
      ensure(14);
      bodyFont(10);
      doc.setTextColor(...BODY);
      doc.text(ln, MARGIN, y);
      y += 14;
    });
    y += 6;
  };

  const subhead = (text: string) => {
    ensure(20);
    display(10.5);
    doc.setTextColor(...INDIGO200);
    doc.text(text, MARGIN, y);
    y += 15;
  };

  const bullets = (items: { text: string; priority?: boolean }[]) => {
    items.forEach((it) => {
      const lines = doc.splitTextToSize(it.text, CONTENT_W - 16) as string[];
      lines.forEach((ln, i) => {
        ensure(14);
        bodyFont(10);
        if (it.priority) doc.setFont("SpaceGrotesk", "bold");
        if (i === 0) {
          // priority marker = magenta ▲ (warning icon); otherwise indigo •
          doc.setTextColor(...(it.priority ? MAGENTA : INDIGO100));
          doc.text(it.priority ? "▲" : "•", MARGIN + 2, y);
        }
        doc.setTextColor(...BODY);
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
      styles: { font: "SpaceMono", fontSize: 9, cellPadding: 6, textColor: INDIGO300, lineColor: GRAY200, lineWidth: 0.5 },
      headStyles: { font: "SpaceGrotesk", fontStyle: "bold", fillColor: INDIGO200, textColor: WHITE, halign: "left" },
      alternateRowStyles: { fillColor: GRAY100 },
      didDrawPage: () => footer(),
    });
    // deno-lint-ignore no-explicit-any
    const finalY = (doc as any).lastAutoTable?.finalY;
    y = (finalY ? finalY : y) + 16;
  };

  // Two-column snapshot inside a Gray-100 Space Window (no red/green coding).
  const twocol = (cols: { heading: string; items: string[] }[]) => {
    const pair = cols.slice(0, 2);
    const padX = 16, padY = 15, gutter = 22;
    const innerW = CONTENT_W - padX * 2;
    const colW = (innerW - gutter) / 2;
    // measure tallest column (lines*12 + 2px gap per item)
    let maxColH = 0;
    const colLineSets = pair.map((c) => {
      bodyFont(9.5);
      const sets = (c.items || []).map((it) => doc.splitTextToSize(it, colW - 12) as string[]);
      const h = sets.reduce((a, s) => a + s.length * 12 + 2, 0);
      if (h > maxColH) maxColH = h;
      return sets;
    });
    const headH = 22;
    const boxH = padY * 2 + headH + maxColH;
    ensure(boxH + 6);
    fillWindow(doc, MARGIN, y, CONTENT_W, boxH, 10, GRAY100);
    const top = y + padY;
    pair.forEach((c, ci) => {
      const x = MARGIN + padX + ci * (colW + gutter);
      let cy = top;
      display(10.5);
      doc.setTextColor(...INDIGO200);
      doc.text((c.heading || "").toUpperCase(), x, cy);
      cy += 8;
      doc.setDrawColor(...INDIGO100);
      doc.setLineWidth(0.8);
      doc.line(x, cy, x + colW, cy);
      cy += 14;
      (colLineSets[ci]).forEach((set) => {
        set.forEach((ln, i) => {
          bodyFont(9.5);
          if (i === 0) { doc.setTextColor(...INDIGO100); doc.text("•", x, cy); }
          doc.setTextColor(...BODY);
          doc.text(ln, x + 12, cy);
          cy += 12;
        });
        cy += 2;
      });
    });
    y += boxH + 10;
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
