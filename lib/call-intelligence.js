export const CALL_TYPES = ["incoming", "outgoing"];
export const CALL_PURPOSES = ["inquiry", "complaint", "order", "follow-up"];
export const CALL_OUTCOMES = ["interested", "not_interested", "follow_up", "closed"];

export function analyzeCall(summary) {
  const text = (summary || "").toLowerCase();

  const sentiment = /(thanks|asante|good|great|ready|confirmed|order|yes|interested)/.test(text)
    ? "positive"
    : /(angry|bad|problem|delay|late|complaint|issue|frustrated|expensive|bei)/.test(text)
      ? "negative"
      : "neutral";

  const urgency = /(urgent|today|asap|immediately|haraka|now|leo|late|overdue)/.test(text)
    ? "high"
    : /(soon|this week|follow up|kesho|tomorrow)/.test(text)
      ? "medium"
      : "low";

  const category = /(support|complaint|issue|problem|help)/.test(text)
    ? "support"
    : /(delivery|transport|pickup|logistics|route|shipment)/.test(text)
      ? "logistics"
      : /(partner|partnership|agent|distributor|dealer)/.test(text)
        ? "partnership"
        : "sales";

  const suggested_action = urgency === "high"
    ? "Call back immediately and confirm the next step."
    : sentiment === "negative"
      ? "Escalate to admin and resolve the blocker before the next outreach."
      : category === "partnership"
        ? "Share partnership requirements and schedule a follow-up discussion."
        : "Send a WhatsApp follow-up and confirm the next milestone.";

  return { sentiment, urgency, category, suggested_action };
}
