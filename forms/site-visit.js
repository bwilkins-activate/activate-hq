/* ============================================================
   FORM DEFINITION — Site Visit Report
   Restructured per RD feedback (Oct 2026): works for new-store
   openings AND manager-support visits. Registers into
   window.ACTIVATE_FORMS (read by forms.html).
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
    { id: "standards", label: "When managing, how well do they hold the GM's standards?", type: "scale", max: 5, lowLabel: "Rarely", highLabel: "Always" },
    { id: "delegate", label: "How effectively do they delegate (vs. absorbing tasks)?", type: "scale", max: 5, lowLabel: "Absorbs", highLabel: "Delegates" },
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
    tagline: "Manager Support & NSO Debrief",
    recipientsField: "emails",
    required: ["name", "homerole", "location", "reason", "rd", "dates", "emails"],
    intro:
      'For a visiting manager to document a location visit — a new-store opening or manager support for an existing location. Your answers <b>save automatically to this device</b> as you go. On submit, AI assembles a polished debrief in your voice and emails a branded PDF to the recipients in Section A. <b>Specifics beat vague notes</b> — the report is only as sharp as what you put in.',
    header: function (A) {
      return {
        title: A.location || "Location",
        subtitle: "Site Visit Report — " + (A.name || "Visiting Manager") + (A.homerole ? " (" + A.homerole + ")" : ""),
        dates: datesStr(A.dates),
        author: A.name || "",
        footer: (A.name || "Visiting Manager") + "   ·   " + (A.location || "Location") + (datesStr(A.dates) ? "   ·   " + datesStr(A.dates) : ""),
      };
    },
    sections: [
      { id: "A", letter: "A", title: "Visit Basics", desc: "Populates the report header and delivery.", fields: [
        { id: "name", q: "Q1", label: "Your full name", type: "text", ph: "e.g. Brett Wilkins" },
        { id: "homerole", q: "Q2", label: "Your home location and role", type: "text", ph: "e.g. GM, Lexington" },
        { id: "location", q: "Q3", label: "Location you are visiting", type: "text", ph: "e.g. Union Square" },
        { id: "reason", q: "Q4", label: "Reason for the visit", type: "select", options: ["New Store Opening (NSO)", "Coverage for PTO / illness", "Support for a team without a GM", "General manager support", "Other"] },
        { id: "gm", q: "Q5", label: "General Manager of the location", hint: "Leave blank if the location has no GM.", optional: true, type: "text", ph: "GM name" },
        { id: "rd", q: "Q6", label: "Regional Director of the location", type: "text", ph: "RD name" },
        { id: "dates", q: "Q7", label: "Dates of your visit", type: "date-range" },
        { id: "shifts", q: "Q8", label: "Which shifts did you work during your visit?", hint: "Check all that apply.", type: "checks", options: ["Opening", "Mid", "Closing", "Overnight"] },
        { id: "emails", q: "Q9", label: "Email addresses for report delivery", hint: "Comma-separated. Include the location's GM (if any), the RD, and Logan.", type: "email", ph: "name@activate.games, name2@activate.games" },
      ]},
      { id: "B", letter: "B", title: "Ops Data", optional: true, desc: "Optional. If you have the ops sheet, add a row per day. Populates the data table in the report.", fields: [
        { id: "ops", type: "table", label: "Per-day performance", hint: "One row per day visited.", addLabel: "+ Add another day", columns: OPS_COLS },
      ]},
      { id: "C", letter: "C", title: "Team Culture & Communication", fields: [
        { id: "eng", q: "Q10", label: "Proactive guest engagement — note the hub (recommendations, celebrating wins) and the lobby (greeting, check-ins) separately.", type: "textarea" },
        { id: "radios", q: "Q11", label: "Radios & amps — how well did the team use them to communicate across deployments?", type: "text", ph: "1–3 sentences" },
        { id: "huddles", q: "Q12", label: "Shift huddles — effectiveness and execution", type: "text", ph: "1–3 sentences" },
        { id: "fun", q: "Q13", label: "Is the team having fun? Are agent ranks appropriate for their tenure?", type: "text", ph: "1–3 sentences" },
        { id: "recognition", q: "Q14", label: "Potential recognition — any high-performing facilitators who want or could do more?", type: "text", ph: "Names + why" },
        { id: "behavior", q: "Q15", label: "Any staff behavior concerns — things that wouldn't meet Activate's standard?", type: "text", ph: 'or "none observed"' },
        { id: "energy", q: "Q16", label: "Overall, how would you describe the team's energy and culture?", type: "textarea" },
      ]},
      { id: "D", letter: "D", title: "Leadership Assessment", desc: "Repeats per Assistant Manager observed. Add up to 4. Rate 1–5.", fields: [
        { id: "ams", type: "repeater", title: "Assistant Manager", max: 4, addLabel: "+ Add another Assistant Manager", fields: AM_FIELDS },
      ]},
      { id: "E", letter: "E", title: "Technical Knowledge & Standards", fields: [
        { id: "techknow", q: "Q17", label: "The team's overall technical knowledge", type: "select", options: ["Strong", "Solid", "Developing", "Weak"] },
        { id: "techissues", q: "Q18", label: "Were there any tech issues during your visit? What happened, resolution time, and why.", type: "textarea" },
        { id: "techroom", q: "Q19", label: "Is the tech room organized so any team member could navigate it independently?", type: "select", options: ["Yes", "Partially", "No"] },
        { id: "rhm", q: "Q20", label: "Is Room Health Mode (RHM) being executed properly?", type: "select", options: ["Yes", "Partially", "No", "Not observed"] },
        { id: "maintainx", q: "Q21", label: "MaintainX adherence", type: "select", options: ["Strong", "Inconsistent", "Poor", "Not observed"] },
        { id: "coach", q: "Q22", label: "Activate Coach — is it being observed, and is the team aware of it?", type: "text", ph: "1–3 sentences" },
        { id: "learning", q: "Q23", label: "Certifications & learning — are certs being actively pursued (leadership & facilitators), and what's the team's appetite for learning?", type: "textarea" },
      ]},
      { id: "F", letter: "F", title: "Labor & Productivity", fields: [
        { id: "staffing", q: "Q24", label: "Staffing levels relative to traffic during your visit", type: "select", options: ["Overstaffed", "Appropriate", "Understaffed", "Varied by shift"] },
        { id: "slowperiod", q: "Q25", label: "What were staff doing during slow periods with limited guest interaction?", type: "textarea" },
        { id: "shouldhave", q: "Q26", label: "What should or could they have been doing instead?", type: "textarea" },
        { id: "laborrec", q: "Q27", label: "Labor hour recommendation for this location? Suggested weekly breakdown by day.", optional: true, type: "textarea" },
      ]},
      { id: "G", letter: "G", title: "Facility Issues", desc: "Flag anything safety-critical.", fields: [
        { id: "facappear", q: "Q28", label: "Appearance — paint, flooring, doors, signage / vinyls", type: "textarea" },
        { id: "facguest", q: "Q29", label: "Guest-impacting — bathrooms, water fountains, HVAC", type: "textarea" },
        { id: "facsafety", q: "Q30", label: "Safety & compliance — fire extinguishers, exterior door locks, cameras. Flag anything critical.", type: "textarea" },
        { id: "facknown", q: "Q31", label: "Issues already known to leadership you want to follow up on or escalate?", optional: true, type: "textarea" },
      ]},
      { id: "H", letter: "H", title: "Outreach & Local Awareness", fields: [
        { id: "calls", q: "Q32", label: "Calls & emails — how is the team doing on outbound calls, emails, lead generation, group sales, and follow-ups?", type: "textarea" },
        { id: "neighborhood", q: "Q33", label: "Neighborhood recognition — as you visited nearby restaurants/hotels, did they know Activate exists? Note gaps within sight of the location.", type: "textarea" },
        { id: "opps", q: "Q34", label: "What outreach or community opportunities is this location not currently leveraging?", type: "textarea" },
      ]},
      { id: "I", letter: "I", title: "GM Assessment & Coaching", optional: true, desc: "Optional — complete only if the location has a GM you worked with.", fields: [
        { id: "gmstrength", q: "Q35", label: "The GM's greatest operational strength", optional: true, type: "textarea" },
        { id: "gmdev", q: "Q36", label: "The GM's most important development area", optional: true, type: "textarea" },
        { id: "gmcoach", q: "Q37", label: "Key coaching conversations you had with the GM", optional: true, type: "textarea" },
        { id: "gmpersonnel", q: "Q38", label: "Personnel situations to document — coaching plans, PIPs, performance conversations", optional: true, type: "textarea" },
      ]},
      { id: "J", letter: "J", title: "Strategic Recommendations & Culture", fields: [
        { id: "priorities", q: "Q39", label: "What 1–3 strategic priorities would you recommend over the next 30–60 days?", type: "textarea" },
        { id: "goals", q: "Q40", label: "Specific goals you'd suggest — each with a named owner and a deadline", type: "textarea" },
        { id: "culture", q: "Q41", label: "How did you deliver on our culture this visit? (e.g. lunch with a top performer, snacks on a busy shift, recognizing an agent, running a fun contest)", type: "textarea" },
      ]},
      { id: "K", letter: "K", title: "Overall", desc: "Final insights — your overall read on the location.", fields: [
        { id: "health", q: "Q42", label: "This location's overall operational health", type: "select", options: ["Excellent", "Strong", "Mixed", "Needs attention", "Struggling"] },
        { id: "best", q: "Q43", label: "What is this location doing best right now?", type: "textarea" },
        { id: "improve", q: "Q44", label: "The single most important area this location needs to improve?", type: "textarea" },
        { id: "traffic", q: "Q45", label: "Traffic volume during your visit, relative to what you'd expect", type: "select", options: ["Well above expected", "Above expected", "About as expected", "Below expected", "Well below expected"] },
        { id: "anyelse", q: "Q46", label: "Anything else you observed or want documented that hasn't been covered?", optional: true, type: "textarea" },
      ]},
    ],
  });
})();
