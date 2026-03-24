export const CHANNELS   = ["call", "whatsapp", "sms", "in_person"];
export const DIRECTIONS = ["incoming", "outgoing"];
export const OUTCOMES   = ["interested", "not_interested", "follow_up", "closed"];

export const CHANNEL_LABELS = {
  call:      "Call",
  whatsapp:  "WhatsApp",
  sms:       "SMS",
  in_person: "In Person",
};

export const OUTCOME_LABELS = {
  interested:     "Interested",
  not_interested: "Not Interested",
  follow_up:      "Follow Up",
  closed:         "Closed",
};

// ── Interaction analysis ──────────────────────────────────────
export function analyzeInteraction(content) {
  const text = (content || "").toLowerCase();

  const sentiment =
    /(thanks|asante|good|great|ready|confirmed|order|yes|interested|happy|pleased|perfect|love)/.test(text)
      ? "positive"
      : /(angry|bad|problem|delay|late|complaint|issue|frustrated|expensive|bei|cancel|refund|disappointed|unhappy|terrible)/.test(text)
        ? "negative"
        : "neutral";

  const urgency =
    /(urgent|today|asap|immediately|haraka|now|leo|late|overdue|critical|emergency|right now)/.test(text)
      ? "high"
      : /(soon|this week|follow up|follow-up|kesho|tomorrow|next week|shortly)/.test(text)
        ? "medium"
        : "low";

  const category =
    /(support|complaint|issue|problem|help|fix|broken|error|not working)/.test(text)
      ? "support"
      : /(delivery|transport|pickup|logistics|route|shipment|shipping|dispatch|warehouse)/.test(text)
        ? "logistics"
        : /(partner|partnership|agent|distributor|dealer|reseller|franchise|wholesale)/.test(text)
          ? "partnership"
          : "sales";

  const intent =
    urgency === "high"
      ? "Immediate resolution required"
      : sentiment === "negative"
        ? "Complaint or dissatisfaction"
        : category === "partnership"
          ? "Partnership inquiry"
          : category === "support"
            ? "Support request"
            : "Purchase interest";

  const suggested_action =
    urgency === "high"
      ? "Call back immediately and confirm next steps."
      : sentiment === "negative"
        ? "Escalate to admin and resolve the issue before next outreach."
        : category === "partnership"
          ? "Share partnership requirements and schedule a follow-up meeting."
          : "Send a follow-up and confirm the next milestone.";

  return { sentiment, urgency, category, intent, suggested_action };
}

// ── Lead score ────────────────────────────────────────────────
// Called after every interaction to keep customer score current.
export function computeLeadScore(outcome, sentiment) {
  if (outcome === "interested")                      return "hot";
  if (sentiment === "positive" && outcome === "follow_up") return "hot";
  if (outcome === "follow_up"  || sentiment === "positive") return "warm";
  if (outcome === "not_interested")                  return "cold";
  return "warm"; // any interaction is at least warm
}

// ── WhatsApp message generator ────────────────────────────────
// Generates a ready-to-send WhatsApp follow-up message.
// Replace the body of this function with a real Claude API call for richer output.
export function generateWhatsAppMessage({ customer, lastInteraction, insight }) {
  const firstName = (customer.name || "").split(" ")[0] || customer.name;
  const category  = insight?.category   || "sales";
  const outcome   = lastInteraction?.outcome;
  const sentiment = insight?.sentiment  || "neutral";
  const channel   = lastInteraction?.channel;

  // Opening
  const opening = `Hi ${firstName}! 👋`;

  // Context-aware body
  let body = "";

  if (category === "support" || sentiment === "negative") {
    body =
      `I wanted to personally follow up on the issue you raised with us. ` +
      `We take your concern seriously and I want to make sure it's been fully resolved. ` +
      `Please let me know if there's anything still outstanding — we're here to help.`;
  } else if (category === "partnership") {
    body =
      `Thank you for your interest in partnering with CutOff Recycle! ` +
      `We'd love to explore how we can work together and create value for both sides. ` +
      `Are you available for a quick call this week to discuss the next steps?`;
  } else if (category === "logistics") {
    body =
      `I'm following up on the delivery/logistics matter we discussed. ` +
      `Could you confirm the current status on your end? ` +
      `We want to make sure everything is on track for you.`;
  } else if (outcome === "interested") {
    body =
      `Thank you for your interest in CutOff Recycle! 🌱 ` +
      `We're excited to work with you. I wanted to follow up and answer any questions you might have. ` +
      `When would be a good time to confirm the next steps together?`;
  } else if (outcome === "follow_up") {
    body =
      `Just following up on our recent conversation. ` +
      `I wanted to make sure you have everything you need to move forward. ` +
      `Do you have any questions I can help clarify?`;
  } else if (customer.type === "farmer") {
    body =
      `We appreciate your continued partnership with CutOff Recycle. ` +
      `I wanted to check in and see how things are going on your end. ` +
      `Is there anything we can support you with at this time?`;
  } else if (customer.type === "distributor") {
    body =
      `Hope business is going well! I wanted to touch base and see if you have any new requirements or orders coming up. ` +
      `We're ready to support your supply needs — just let us know.`;
  } else {
    body =
      `Just checking in to see how things are going. ` +
      `We value your relationship with CutOff Recycle and want to make sure ` +
      `we're meeting your expectations. Is there anything we can help with?`;
  }

  const closing = `\n\nWarm regards,\nCutOff Recycle Team 🌿`;

  return `${opening}\n\n${body}${closing}`;
}

// ── Weekly report generator ───────────────────────────────────
// Produces a plain-text weekly summary report.
// Replace with a real Claude API call for a richer, narrative report.
export function generateWeeklyReport({ interactions, tasks, customers }) {
  const now     = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const thisWeek  = (interactions || []).filter((i) => new Date(i.created_at) > weekAgo);
  const allTasks  = tasks || [];
  const allCustomers = customers || [];

  // Interaction breakdown
  const byOutcome = thisWeek.reduce((acc, i) => {
    const key = i.outcome || "no_outcome";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const byChannel = thisWeek.reduce((acc, i) => {
    acc[i.channel] = (acc[i.channel] || 0) + 1;
    return acc;
  }, {});

  // Task stats
  const overdue   = allTasks.filter((t) => t.status !== "completed" && new Date(t.due_date) < now);
  const open      = allTasks.filter((t) => t.status !== "completed");
  const completed = allTasks.filter((t) => t.status === "completed");

  // Lead scores
  const hot  = allCustomers.filter((c) => c.lead_score === "hot").length;
  const warm = allCustomers.filter((c) => c.lead_score === "warm").length;
  const cold = allCustomers.filter((c) => c.lead_score === "cold").length;

  // High urgency this week
  const highUrgency = thisWeek.filter((i) => i.ai_insights?.[0]?.urgency === "high");
  const negative    = thisWeek.filter((i) => i.ai_insights?.[0]?.sentiment === "negative");

  // Format date range
  const dateRange = `${weekAgo.toLocaleDateString()} – ${now.toLocaleDateString()}`;

  const lines = [
    `📊 WEEKLY REPORT — CutOff Recycle CRM`,
    `Period: ${dateRange}`,
    `Generated: ${now.toLocaleString()}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📞 INTERACTIONS THIS WEEK: ${thisWeek.length}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ...Object.entries(byChannel).map(([ch, n]) => `  ${CHANNEL_LABELS[ch] || ch}: ${n}`),
    ``,
    `By outcome:`,
    ...Object.entries(byOutcome).map(([o, n]) => `  ${OUTCOME_LABELS[o] || o}: ${n}`),
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🎯 LEAD PIPELINE: ${allCustomers.length} customers`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `  🔥 Hot:  ${hot}`,
    `  🟡 Warm: ${warm}`,
    `  🔵 Cold: ${cold}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `✅ TASKS`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `  Open:      ${open.length}`,
    `  Completed: ${completed.length}`,
    `  Overdue:   ${overdue.length}${overdue.length > 0 ? " ⚠️" : ""}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `⚠️  ALERTS THIS WEEK`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `  High urgency interactions: ${highUrgency.length}`,
    `  Negative sentiment:        ${negative.length}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `💡 RECOMMENDATIONS`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
  ];

  // Auto recommendations
  if (overdue.length > 0)      lines.push(`  • Clear ${overdue.length} overdue task(s) before end of week.`);
  if (highUrgency.length > 0)  lines.push(`  • Follow up on ${highUrgency.length} high-urgency interaction(s) immediately.`);
  if (negative.length > 0)     lines.push(`  • Address ${negative.length} negative-sentiment interaction(s) to prevent churn.`);
  if (cold > hot + warm)       lines.push(`  • Pipeline skewed cold (${cold} cold vs ${hot + warm} hot/warm). Re-engage inactive leads.`);
  if (hot > 0)                 lines.push(`  • ${hot} hot lead(s) ready to close — prioritise this week.`);
  if (thisWeek.length === 0)   lines.push(`  • No interactions logged this week. Encourage the team to log all customer contacts.`);

  if (lines[lines.length - 1].startsWith("━")) {
    lines.push(`  • Keep up the consistent outreach. Review next action dates daily.`);
  }

  return lines.join("\n");
}
