/* ============================================================
   FORM DEFINITION — Site Visit Report
   Registers itself into window.ACTIVATE_FORMS (read by forms.html).
   To add a new form, copy this file's shape and add a matching
   system prompt in supabase/functions/submit-form/forms.ts.
   ============================================================ */
(function () {
  window.ACTIVATE_FORMS = window.ACTIVATE_FORMS || [];

  function datesStr(v) {
    if (!v || typeof v !== "object") return "";
    if (v.start && v.end) return v.start === v.end ? v.start : v.start + " → " + v.end;
    return v.start || v.end || "";
  }

  const AM_FIELDS = [
    { id: "name", label: "Assistant Manager name", type: "text", ph: "AM name" },
    { id: "style", label: "Leadership style in one sentence", type: "text", ph: "One sentence" },
    { id: "strength", label: "Greatest strength", type: "textarea" },
    { id: "develop", label: "Most important development area", type: "textarea" },
    { id: "standards", label: "When this AM is managing, does the team maintain the GM's standards?", type: "select", options: ["Yes", "Mostly", "Inconsistent", "No"] },
    { id: "delegate", label: "Do they delegate effectively, or absorb tasks themselves?", type: "select", options: ["Delegates well", "Mixed", "Tends to absorb tasks"] },
    { id: "notes", label: "Any additional observations about this AM?", optional: true, type: "textarea" },
  ];

  const OPS_COLS = [
    { id: "date", label: "Date", type: "date" },
    { id: "dow", label: "Day", type: "select", options: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], w: 90 },
    { id: "net", label: "Net Revenue", type: "text", ph: "$", w: 110 },
    { id: "disc", label: "Discounts", type: "text", ph: "$", w: 100 },
    { id: "guests", label: "Guests", type: "text", ph: "#", w: 80 },
    { id: "rpp", label: "Rev / Player", type: "text", ph: "$", w: 100 },
    { id: "hours", label: "Hrs Sched", type: "text", ph: "#", w: 90 },
  ];

  window.ACTIVATE_FORMS.push({
    id: "site-visit",
    name: "Site Visit Report",
    tagline: "GM Debrief Tool",
    recipientsField: "q7",
    required: ["q1", "q2", "q3", "q4", "q5", "q7"],
    intro:
      'Work through each section from your visit. Your answers <b>save automatically to this device</b> as you type — you can close this and come back across a multi-day visit. When you submit, AI assembles a polished debrief in your voice and emails a branded PDF to the addresses you list in Section A. <b>Quote-worthy specifics beat vague notes</b> — the report is only as sharp as what you put in.',
    header: function (A) {
      return {
        title: A.q3 || "Location",
        subtitle: "Site Visit Debrief — " + (A.q1 || "Visiting GM") + (A.q2 ? " (" + A.q2 + ")" : ""),
        dates: datesStr(A.q5),
        author: A.q1 || "",
        footer: (A.q1 || "Visiting GM") + "   ·   " + (A.q3 || "Location") + (datesStr(A.q5) ? "   ·   " + datesStr(A.q5) : ""),
      };
    },
    sections: [
      { id: "A", letter: "A", title: "Visit Basics", desc: "Populates the report header and delivery. All required.", fields: [
        { id: "q1", q: "Q1", label: "Your full name", type: "text", ph: "e.g. Brett Wilkins" },
        { id: "q2", q: "Q2", label: "Your home location and role", type: "text", ph: "e.g. GM, Lexington" },
        { id: "q3", q: "Q3", label: "Location you are visiting", type: "text", ph: "e.g. Union Square" },
        { id: "q4", q: "Q4", label: "General Manager of the location you are visiting", type: "text", ph: "GM name" },
        { id: "q5", q: "Q5", label: "Dates of your visit", type: "date-range" },
        { id: "q6", q: "Q6", label: "Which shifts did you work during your visit?", hint: "Check all that apply.", type: "checks", options: ["Opening", "Mid", "Closing", "Overnight"] },
        { id: "q7", q: "Q7", label: "Email addresses for report delivery", hint: "One or more, comma-separated.", type: "email", ph: "name@activate.games, name2@activate.games" },
      ]},
      { id: "B", letter: "B", title: "Ops Data", optional: true, desc: "Optional. If you have the ops sheet, add a row per day. Populates the data table in the report.", fields: [
        { id: "ops", type: "table", label: "Per-day performance", hint: "One row per day visited.", addLabel: "+ Add another day", columns: OPS_COLS },
      ]},
      { id: "C", letter: "C", title: "Overall Impression", fields: [
        { id: "q9", q: "Q9", label: "This location's overall operational health", type: "select", options: ["Excellent", "Strong", "Mixed", "Needs attention", "Struggling"] },
        { id: "q10", q: "Q10", label: "In one or two sentences, what is this location doing best right now?", type: "textarea" },
        { id: "q11", q: "Q11", label: "What is the single most important area this location needs to improve?", type: "textarea" },
        { id: "q12", q: "Q12", label: "Traffic volume during your visit, relative to what you’d expect", type: "select", options: ["Well above expected", "Above expected", "About as expected", "Below expected", "Well below expected"] },
      ]},
      { id: "D", letter: "D", title: "Team Culture & Communication", fields: [
        { id: "q13", q: "Q13", label: "How would you describe the team's overall energy and culture?", type: "textarea" },
        { id: "q14", q: "Q14", label: "How well did staff communicate across deployments (e.g. lobby to hub)?", type: "text", ph: "1–3 sentences" },
        { id: "q15", q: "Q15", label: "Did staff engage guests proactively in the hub — conversations, recs, celebrating wins?", type: "select", options: ["Yes — consistently", "Somewhat", "Rarely", "No"] },
        { id: "q16", q: "Q16", label: "Describe any guest engagement strengths you observed.", type: "textarea" },
        { id: "q17", q: "Q17", label: "Any staff behavior concerns — things that wouldn't meet Activate's standard?", type: "text", ph: 'or "none observed"' },
      ]},
      { id: "E", letter: "E", title: "Leadership Assessment", desc: "Repeats per Assistant Manager observed. Add up to 4.", fields: [
        { id: "ams", type: "repeater", title: "Assistant Manager", max: 4, addLabel: "+ Add another Assistant Manager", fields: AM_FIELDS },
      ]},
      { id: "F", letter: "F", title: "Technical Knowledge & Certifications", fields: [
        { id: "q25", q: "Q25", label: "The team's overall technical knowledge", type: "select", options: ["Strong", "Solid", "Developing", "Weak"] },
        { id: "q26", q: "Q26", label: "Were there any tech issues during your visit? Describe what happened, resolution time, and why.", type: "textarea" },
        { id: "q27", q: "Q27", label: "Is the tech room organized so any team member could navigate it independently?", type: "select", options: ["Yes", "Partially", "No"] },
        { id: "q28", q: "Q28", label: "Are certifications being actively pursued — by leadership? by facilitators?", type: "text", ph: "1–3 sentences" },
        { id: "q29", q: "Q29", label: "Your read on the team's appetite for learning — pursuing new knowledge, or content with what they know?", type: "textarea" },
      ]},
      { id: "G", letter: "G", title: "Labor & Productivity", fields: [
        { id: "q30", q: "Q30", label: "Staffing levels relative to traffic during your visit", type: "select", options: ["Overstaffed", "Appropriate", "Understaffed", "Varied by shift"] },
        { id: "q31", q: "Q31", label: "What were staff doing during slow periods with limited guest interaction?", type: "textarea" },
        { id: "q32", q: "Q32", label: "What should or could they have been doing instead?", type: "textarea" },
        { id: "q33", q: "Q33", label: "Labor hour recommendation for this location? Suggested weekly breakdown by day.", optional: true, type: "textarea" },
      ]},
      { id: "H", letter: "H", title: "Facility Issues", fields: [
        { id: "q34", q: "Q34", label: "List facility issues you observed — equipment, safety, cleanliness, infrastructure. Flag anything safety-critical.", type: "textarea" },
        { id: "q35", q: "Q35", label: "Issues already known to leadership that you want to follow up on or escalate?", optional: true, type: "textarea" },
      ]},
      { id: "I", letter: "I", title: "Outreach & Guest Engagement", fields: [
        { id: "q36", q: "Q36", label: "Did you observe or participate in any outreach (street teams, canvassing, BOGO distribution)?", type: "text", ph: "1–3 sentences" },
        { id: "q37", q: "Q37", label: "The team's instinct for talking to people — guests inside and potential guests outside", type: "textarea" },
        { id: "q38", q: "Q38", label: "What outreach opportunities exist that this location is not currently leveraging?", type: "textarea" },
      ]},
      { id: "J", letter: "J", title: "GM Assessment & Coaching", fields: [
        { id: "q39", q: "Q39", label: "How much time did you spend working alongside the GM?", type: "select", options: ["Extensively — most shifts", "Several shifts", "Some", "Minimal"] },
        { id: "q40", q: "Q40", label: "The GM's greatest operational strength", type: "textarea" },
        { id: "q41", q: "Q41", label: "The GM's most important development area", type: "textarea" },
        { id: "q42", q: "Q42", label: "Describe any key coaching conversations you had with the GM.", type: "textarea" },
        { id: "q43", q: "Q43", label: "Any personnel situations that need documenting — coaching plans, PIPs, performance conversations?", hint: "Be specific and direct — this section is written without softening.", optional: true, type: "textarea" },
      ]},
      { id: "K", letter: "K", title: "Strategic Recommendations", fields: [
        { id: "q44", q: "Q44", label: "What 1–3 strategic priorities would you recommend over the next 30–60 days?", type: "textarea" },
        { id: "q45", q: "Q45", label: "Specific goals you’d suggest — each with a named owner and a deadline?", type: "textarea" },
        { id: "q46", q: "Q46", label: "Anything else you observed or want documented that hasn’t been covered?", optional: true, type: "textarea" },
      ]},
    ],
  });
})();
