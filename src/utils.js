export const daysSince = (d) =>
  Math.floor((Date.now() - new Date(d).getTime()) / 864e5);

export function getTemp(lead) {
  const d = daysSince(lead.lastContact);
  if (["Amenunua", "Ameamua", "Ameungana", "Ameweka Oda"].includes(lead.status)) return "hot";
  if (["Amepotea", "Hayatoi tena"].includes(lead.status)) return "cold";
  if (d >= 7) return "cold";
  if (d >= 3) return "warm";
  return "hot";
}

export const tempLabel = (t) =>
  t === "hot" ? "Hot" : t === "warm" ? "Warm" : "Cold";

export const statusColor = (s) =>
  ({
    Amenunua: "#3B6D11", Ameungana: "#3B6D11", "Ameweka Oda": "#3B6D11",
    Ameamua: "#993C1D", Anafikiri: "#854F0B", Anahangaika: "#854F0B",
    Ameidhinishwa: "#185FA5", Amepotea: "#888780", "Hayatoi tena": "#888780",
    Mpya: "#185FA5",
  })[s] || "#888780";

export async function callAI(prompt) {
  try {
    const res = await fetch("/api/anthropic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    return data.text || "Imeshindwa. Jaribu tena.";
  } catch {
    return "Hitilafu ya mtandao. Jaribu tena.";
  }
}

// --- AI Lead Intelligence ---
// Parse AI output into structured lead intelligence
export function parseAIResponse(responseText) {
  let result = {
    summary: "",
    intent: "unclear",
    objection: "",
    leadScore: 0,
    recommendedAction: "",
  };
  try {
    // Try to parse as JSON
    let obj = responseText;
    if (typeof responseText === "string") {
      obj = responseText.replace(/```json|```/g, "").trim();
      obj = JSON.parse(obj);
    }
    if (typeof obj === "object" && obj !== null) {
      result.summary = typeof obj.summary === "string" ? obj.summary.slice(0, 200) : "";
      result.intent = ["buying", "exploring", "unclear"].includes(obj.intent) ? obj.intent : "unclear";
      result.objection = typeof obj.objection === "string" ? obj.objection : "";
      result.leadScore = Number.isFinite(obj.leadScore) && obj.leadScore >= 0 && obj.leadScore <= 100 ? obj.leadScore : 0;
      result.recommendedAction = typeof obj.recommendedAction === "string" ? obj.recommendedAction : "";
    }
  } catch (e) {
    // fallback: try to extract fields from messy text
    const scoreMatch = responseText.match(/leadScore\s*[:=]\s*(\d{1,3})/i);
    if (scoreMatch) result.leadScore = Math.max(0, Math.min(100, parseInt(scoreMatch[1], 10)));
    const intentMatch = responseText.match(/intent\s*[:=]\s*(buying|exploring|unclear)/i);
    if (intentMatch) result.intent = intentMatch[1];
    const objectionMatch = responseText.match(/objection\s*[:=]\s*([^\n,]+)/i);
    if (objectionMatch) result.objection = objectionMatch[1].trim();
    const actionMatch = responseText.match(/recommendedAction\s*[:=]\s*([^\n]+)/i);
    if (actionMatch) result.recommendedAction = actionMatch[1].trim();
    // Try to get a summary (first 2 sentences)
    const summaryMatch = responseText.match(/summary\s*[:=]\s*([^\n]+)/i);
    if (summaryMatch) result.summary = summaryMatch[1].trim();
    else result.summary = responseText.split(/[.!?]/).slice(0,2).join(". ").trim();
  }
  return result;
}

// --- Modular, context-aware follow-up prompt generator ---
// Uses lead type, intent, objection, notes, and tries to infer language/tone
export function generateFollowUpPrompt(lead, opts = {}) {
  // Language/tone detection (simple):
  // If notes/objection contain English words, use English, else Kiswahili (default)
  const text = `${lead.notes || ''} ${lead.objection || ''}`.toLowerCase();
  const isEnglish = /\b(the|and|but|order|price|buy|not|no|yes|kg|hair|fertilizer|product|customer|call|message|when|how|why|what)\b/.test(text);
  const lang = opts.lang || (isEnglish ? "English" : "Kiswahili");
  // Tone: If intent is 'buying', be direct/transactional. If 'exploring', be friendly/informative. If objection, address it.
  let tone = "";
  if (lead.intent === "buying") tone = lang === "English" ? "Direct, transactional, polite" : "Moja kwa moja, kibiashara, kwa heshima";
  else if (lead.intent === "exploring") tone = lang === "English" ? "Friendly, informative, helpful" : "Rafiki, wa kutoa taarifa, msaada";
  else tone = lang === "English" ? "Polite, concise" : "Kwa heshima, kwa ufupi";
  // Objection handling
  let objectionPart = "";
  if (lead.objection) {
    objectionPart = lang === "English"
      ? `Address this objection: '${lead.objection}'.`
      : `Jibu pingamizi hili: '${lead.objection}'.`;
  }
  // Lead type context
  let typePart = "";
  if (lead.type === "sales") {
    typePart = lang === "English"
      ? `This is a sales lead interested in '${lead.product || "our product"}'.`
      : `Huyu ni mteja wa mauzo anayevutiwa na '${lead.product || "bidhaa yetu"}'.`;
  } else if (lead.type === "supply") {
    typePart = lang === "English"
      ? `This is a supply lead (barbershop/individual/agent).`
      : `Huyu ni lead wa usambazaji (kinyozi/mtu binafsi/wakala).`;
  } else if (lead.type === "distributor") {
    typePart = lang === "English"
      ? `This is a distributor lead.`
      : `Huyu ni lead wa usambazaji wa jumla.`;
  }
  // Next action context
  let nextActionPart = lead.nextAction
    ? (lang === "English"
        ? `The next action is: ${lead.nextAction}.`
        : `Hatua inayofuata: ${lead.nextAction}.`)
    : "";
  // Notes summary
  let notesPart = lead.notes
    ? (lang === "English"
        ? `Notes: ${lead.notes}`
        : `Maelezo: ${lead.notes}`)
    : "";
  // Prompt assembly
  const prompt = [
    lang === "English"
      ? `Write a WhatsApp follow-up message for a CRM user. Use this context:`
      : `Andika ujumbe wa kufuatilia WhatsApp kwa mtumiaji wa CRM. Tumia muktadha huu:`,
    typePart,
    notesPart,
    nextActionPart,
    objectionPart,
    lang === "English"
      ? `Tone: ${tone}. Reply in WhatsApp style, short and clear. No emojis.`
      : `Mtindo: ${tone}. Jibu kwa mtindo wa WhatsApp, kifupi na wazi. Bila emoji.`,
  ].filter(Boolean).join("\n");
  return prompt;
}

export const defaultForm = (type) => {
  if (type === "sales")
    return { name: "", phone: "", source: "Instagram/Facebook", product: "Rutubisha", status: "Mpya", region: "Arusha", notes: "", objection: "" };
  if (type === "supply")
    return { name: "", phone: "", source: "Barbershop", region: "Arusha", hairKg: "", subtype: "individual", status: "Mpya", notes: "", objection: "", connected: false };
  return { name: "", phone: "", source: "Instagram/Facebook", region: "Arusha", status: "Mpya", notes: "", objection: "" };
};
