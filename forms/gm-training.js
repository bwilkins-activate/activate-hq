/* ============================================================
   FORM DEFINITION — New GM Training Debrief
   Filled out by the HOST GM/trainer after hosting and training a
   new/incoming General Manager. Produces a narrative debrief on
   the trainee (modeled on Brett's Clay report) and folds the old
   1–5 scorecard topics in as open, trait-revealing questions.
   Registers into window.ACTIVATE_FORMS (read by forms.html).
   ============================================================ */
(function () {
  window.ACTIVATE_FORMS = window.ACTIVATE_FORMS || [];

  function datesStr(v) {
    if (!v || typeof v !== "object") return "";
    if (v.start && v.end) return v.start === v.end ? v.start : v.start + " → " + v.end;
    return v.start || v.end || "";
  }

  const DAY_FIELDS = [
    { id: "day", label: "Day or date", type: "text", ph: "e.g. Monday, or 8/11" },
    { id: "covered", label: "What you covered / focused on", type: "textarea" },
    { id: "performance", label: "How they did — reps they got, how quickly they picked it up", type: "textarea" },
    { id: "moments", label: "Notable moments, quotes, or wins", optional: true, type: "textarea" },
  ];

  window.ACTIVATE_FORMS.push({
    id: "gm-training",
    name: "New GM Training Debrief",
    tagline: "Host / Trainer Report",
    recipientsField: "q7",
    required: ["q1", "q2", "q3", "q4", "q5", "q6", "q7"],
    intro:
      'For a host GM or trainer to document the <b>week of GM training</b> you hosted. GMs-in-training rotate through host locations over an 8-week program; this is your debrief on the week you had them. Recap what you covered and give an <b>honest read on the trainee</b> — strengths and the things worth flagging. Your answers <b>save automatically to this device</b> as you go. On submit, AI assembles a narrative debrief in your voice and emails a branded PDF to the recipients in Section A. <b>Specifics and real moments</b> make the strongest report — describe what you saw, don\'t rate it.',
    header: function (A) {
      return {
        title: (A.q3 || "New GM") + (A.q4 ? " — " + A.q4 : ""),
        subtitle: "GM Training Debrief — hosted by " + (A.q1 || "Trainer") + (A.q2 ? " (" + A.q2 + ")" : ""),
        dates: datesStr(A.q5),
        author: A.q1 || "",
        footer: (A.q1 || "Trainer") + "  |  Training Team  |  bwilkins@activate.games",
      };
    },
    sections: [
      { id: "A", letter: "A", title: "Visit Basics", desc: "Populates the report header and delivery. All required.", fields: [
        { id: "q1", q: "Q1", label: "Your full name (the host / trainer)", type: "text", ph: "e.g. Brett Wilkins" },
        { id: "q2", q: "Q2", label: "Your home location and role", type: "text", ph: "e.g. GM, Lexington" },
        { id: "q3", q: "Q3", label: "Name of the GM-in-training you hosted", type: "text", ph: "Trainee name" },
        { id: "q4", q: "Q4", label: "Their assigned or future location", type: "text", ph: "e.g. Town Square, Las Vegas" },
        { id: "q5", q: "Q5", label: "Dates of the training visit", type: "date-range" },
        { id: "q6", q: "Q6", label: "What week of training did you cover?", hint: "The stage of the 8-week program you hosted — this frames what to reasonably expect of the trainee.", type: "select", options: ["Week 1 — Facilitator & ASM", "Week 2 — GM Training, Part 1", "Week 3 — Tech Week", "Week 4 — GM Training, Part 2", "Week 5 — GM Training", "Week 6 — Interview Week", "Week 7 — On-Site", "Week 8 — On-Site / Pre-Opening Prep", "Other / multiple weeks"] },
        { id: "q7", q: "Q7", label: "Email addresses for report delivery", hint: "One or more, comma-separated (e.g. the next trainer, RD, Training lead).", type: "email", ph: "name@activate.games, name2@activate.games" },
      ]},
      { id: "B", letter: "B", title: "The Trainee", desc: "Who they are and your first read.", fields: [
        { id: "q8", q: "Q8", label: "Background & first impressions — who is this person, and what did you learn about them early on?", type: "textarea" },
        { id: "q9", q: "Q9", label: "Their “why” — what draws them to Activate and this role?", type: "text", ph: "1–3 sentences" },
        { id: "q10", q: "Q10", label: "How closely do they align with our values and culture? Your first read.", type: "textarea" },
      ]},
      { id: "C", letter: "C", title: "Training Recap", desc: "Add a block per training day (or per major block of the visit). This becomes the day-by-day recap in the report.", fields: [
        { id: "days", type: "repeater", title: "Training Day", max: 10, addLabel: "+ Add another training day", fields: DAY_FIELDS },
        { id: "q11", q: "Q11", label: "Overall, where are they in the training arc after this visit?", type: "textarea" },
      ]},
      { id: "D", letter: "D", title: "Ideal Team Player", desc: "Describe what you saw — not a score. These surface hungry / humble / smart.", fields: [
        { id: "q12", q: "Q12", label: "Hungry — describe a moment they either jumped on something unprompted or waited to be told. What does it say about their drive and urgency?", type: "textarea" },
        { id: "q13", q: "Q13", label: "Humble — how did they respond to feedback, and to not knowing something? Give examples.", type: "textarea" },
        { id: "q14", q: "Q14", label: "Smart (people-smart) — how did they read and adjust to your team and guests across different roles and situations?", type: "textarea" },
      ]},
      { id: "E", letter: "E", title: "Operating Competencies", fields: [
        { id: "q15", q: "Q15", label: "Organization & admin — how did they handle structure, details, and admin-type tasks? Where are they strong or shaky?", type: "textarea" },
        { id: "q16", q: "Q16", label: "Pace & drive (“the extra gear”) — can they get things done at the pace this role demands, especially under pressure?", type: "textarea" },
        { id: "q17", q: "Q17", label: "Tech aptitude — your read on their comfort with our tech, and how their tech training should be approached?", type: "textarea" },
        { id: "q18", q: "Q18", label: "Endurance & resilience — how did they hold up over the visit? Any concern about stamina for an opening or peak periods?", type: "textarea" },
      ]},
      { id: "F", letter: "F", title: "Team Development & Leadership", fields: [
        { id: "q19", q: "Q19", label: "Effect on the team — what was their impact on your team's energy and morale?", type: "textarea" },
        { id: "q20", q: "Q20", label: "Leadership instincts — did they show instincts beyond the checklist (thinking ahead, developing people, setting the team up), or do they operate best within given structure?", type: "textarea" },
        { id: "q21", q: "Q21", label: "Coaching given — what feedback or challenges did you give them this week, and how did they receive it?", type: "textarea" },
      ]},
      { id: "G", letter: "G", title: "Overall Assessment", desc: "Your honest synthesis. Be direct — flags here are written without softening.", fields: [
        { id: "q22", q: "Q22", label: "Greatest strengths", type: "textarea" },
        { id: "q23", q: "Q23", label: "Biggest development areas or flags to raise", hint: "Be specific and direct — this is written without softening.", type: "textarea" },
        { id: "q24", q: "Q24", label: "On track? Your honest read on their potential to run a location", type: "textarea" },
        { id: "q25", q: "Q25", label: "Questions for the next host / trainer to lean into", type: "textarea" },
        { id: "q26", q: "Q26", label: "Anything else you want documented?", optional: true, type: "textarea" },
      ]},
    ],
  });
})();
