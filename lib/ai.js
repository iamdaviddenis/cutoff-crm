export const CHANNELS   = ["call", "whatsapp", "sms", "in_person"];
export const DIRECTIONS = ["incoming", "outgoing"];
export const OUTCOMES   = ["interested", "not_interested", "follow_up", "closed"];

export const CHANNEL_LABELS = {
  call:       "Call",
  whatsapp:   "WhatsApp",
  sms:        "SMS",
  in_person:  "In Person",
};

export const OUTCOME_LABELS = {
  interested:      "Interested",
  not_interested:  "Not Interested",
  follow_up:       "Follow Up",
  closed:          "Closed",
};

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
    /(support|complaint|issue|problem|help|fix|broken|error|bug|not working)/.test(text)
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
