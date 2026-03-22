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
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.REACT_APP_ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `Wewe ni msaidizi wa CutOff Recycle Limited — kampuni ya Tanzania inayotengeneza mbolea ya kikaboni kutoka nywele za binadamu. Bidhaa: Rutubisha (mbolea ngumu/growing medium), Vuna (liquid foliar fertilizer), McheKuza (Tokyo 8 biofertilizer). CEO: David Denis Hariohay. Kiswahili cha kawaida, karibu, la kibiashara. Malipo ya wakusanyaji: 300 TZS/kg kwa mkusanyaji, 150 TZS/kg kwa hub (sorting), 50 TZS/kg convenience fee.`,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    return data.content?.[0]?.text || "Imeshindwa. Jaribu tena.";
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

export const defaultForm = (type) => {
  if (type === "sales")
    return { name: "", phone: "", source: "Instagram/Facebook", product: "Rutubisha", status: "Mpya", region: "Arusha", notes: "", objection: "" };
  if (type === "supply")
    return { name: "", phone: "", source: "Barbershop", region: "Arusha", hairKg: "", subtype: "individual", status: "Mpya", notes: "", objection: "", connected: false };
  return { name: "", phone: "", source: "Instagram/Facebook", region: "Arusha", status: "Mpya", notes: "", objection: "" };
};
