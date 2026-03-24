import { useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  PRODUCTS,
  SALES_SRC,
  SUPPLY_SRC,
  DIST_SRC,
  REGIONS,
  SALES_ST,
  SUPPLY_ST,
  DIST_ST,
  TARGET_REGIONS,
  COLLECTION_CENTERS,
  AGENT_STEPS,
  DIST_STEPS,
  PAYMENT,
  DEMO_LEADS,
} from "./constants";
import {
  daysSince,
  getTemp,
  tempLabel,
  statusColor,
  callAI,
  defaultForm,
  parseAIResponse,
  generateFollowUpPrompt,
} from "./utils";

const STORAGE_KEY = "cutoff-crm-leads-v1";

function formatDate(value) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function getLeadTypeLabel(type, subtype) {
  if (type === "sales") return "Sales";
  if (type === "supply") return subtype === "agent" ? "Supply agent" : "Supply";
  return "Distributor";
}

function getFollowUpState(lead) {
  if (!lead.nextActionDate) return { tone: "muted", label: "No next action date" };
  const today = new Date();
  const target = new Date(lead.nextActionDate);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 864e5);

  if (diff < 0) return { tone: "danger", label: `${Math.abs(diff)}d overdue` };
  if (diff === 0) return { tone: "warning", label: "Due today" };
  if (diff <= 2) return { tone: "info", label: `Due in ${diff}d` };
  return { tone: "muted", label: `Due ${formatDate(lead.nextActionDate)}` };
}

function sortLeadsByPriority(leads) {
  return [...leads].sort((a, b) => {
    const aState = getFollowUpState(a);
    const bState = getFollowUpState(b);
    const toneRank = { danger: 0, warning: 1, info: 2, muted: 3 };
    const toneDiff = toneRank[aState.tone] - toneRank[bState.tone];
    if (toneDiff !== 0) return toneDiff;

    const tempRank = { hot: 0, warm: 1, cold: 2 };
    const tempDiff = tempRank[getTemp(a)] - tempRank[getTemp(b)];
    if (tempDiff !== 0) return tempDiff;

    return new Date(b.lastContact).getTime() - new Date(a.lastContact).getTime();
  });
}

function LeadCard({ lead, onClick }) {
  const t = getTemp(lead);
  const isTarget = TARGET_REGIONS.includes(lead.region);
  const followUp = getFollowUpState(lead);

  return (
    <button className="card" onClick={onClick} type="button">
      <div className="card-topline">
        <span className={`priority-pill ${followUp.tone}`}>{followUp.label}</span>
        <span className="card-type">{getLeadTypeLabel(lead.type, lead.subtype)}</span>
      </div>

      <div className="ctop">
        <div>
          <div className="cname">{lead.name}</div>
          <div className="cphone">{lead.phone || "No phone added"}</div>
        </div>
        <div className="card-heat">
          <span className={`bdg ${t}`}>{tempLabel(t)}</span>
          {typeof lead.leadScore === "number" && <span className="chip score">Score {lead.leadScore}</span>}
        </div>
      </div>

      <div className="chips">
        <span className="chip" style={{ color: statusColor(lead.status) }}>{lead.status}</span>
        {lead.type === "sales" && lead.product && <span className="chip">{lead.product}</span>}
        {lead.type === "supply" && (
          <span className={lead.connected ? "chip-g" : "chip"}>
            {lead.subtype === "agent" ? "Wakala" : "Collector"}
          </span>
        )}
        <span className="chip">{lead.region}</span>
        {lead.type === "supply" && lead.hairKg && <span className="chip">{lead.hairKg}kg/wk</span>}
        {isTarget && <span className="chip-y">Target region</span>}
        {lead.objection && <span className="chip-r">{lead.objection}</span>}
      </div>

      {lead.summary && <div className="csummary">{lead.summary}</div>}
      {lead.notes && <div className="cnotes">{lead.notes}</div>}

      <div className="card-footer">
        <div className="card-next">
          <span className="card-footer-label">Next</span>
          <span>{lead.nextAction || "Plan next step"}</span>
        </div>
        <div className="cdate">Last contact {daysSince(lead.lastContact)}d ago</div>
      </div>
    </button>
  );
}

function AddModal({ onClose, onSave, initialType }) {
  const [nt, setNt] = useState(initialType || "sales");
  const [form, setFormState] = useState(defaultForm(initialType || "sales"));
  const [chat, setChat] = useState("");
  const [parsing, setParsing] = useState(false);

  const setF = (k, v) => setFormState((f) => ({ ...f, [k]: v }));
  const switchType = (t) => {
    setNt(t);
    setFormState(defaultForm(t));
  };

  const schemas = {
    sales: `{"name":"","phone":"","product":"Rutubisha/Vuna/McheKuza/Hajajua bado","source":"Instagram/Facebook/Referral/Maonyesho/Nyingine","region":"mkoa","status":"Mpya/Anafikiri/Ameamua/Amenunua/Amepotea","objection":"","notes":"muhtasari","nextAction":"hatua inayofuata","nextActionDate":"YYYY-MM-DD"}`,
    supply: `{"name":"","phone":"","source":"Barbershop/Salon/Shule/Kambi ya Jeshi/Nyingine","region":"mkoa","hairKg":"kg kwa wiki","subtype":"individual au agent","status":"Mpya/Anahangaika/Ameungana/Hayatoi tena","objection":"","notes":"muhtasari","nextAction":"hatua inayofuata","nextActionDate":"YYYY-MM-DD"}`,
    distributor: `{"name":"","phone":"","source":"chanzo","region":"mkoa","status":"Mpya/Anafikiri/Ameidhinishwa/Ameweka Oda/Amepotea","objection":"","notes":"muhtasari","nextAction":"hatua inayofuata","nextActionDate":"YYYY-MM-DD"}`,
  };

  const parseChat = async () => {
    if (!chat.trim()) return;
    setParsing(true);
    const res = await callAI(`Soma mazungumzo haya ya WhatsApp. Toa JSON tu bila maelezo:\n${schemas[nt]}\nMazungumzo:\n${chat}`);
    try {
      const obj = JSON.parse(res.replace(/```json|```/g, "").trim());
      setFormState((f) => ({ ...f, ...obj }));
    } catch {
      // Keep the manually entered form if AI output is not valid JSON.
    }
    setParsing(false);
  };

  const save = () => {
    if (!form.name.trim()) return alert("Weka jina la lead");
    if (!form.nextAction || !form.nextActionDate) return alert("Weka Next Action na tarehe yake");
    const now = new Date().toISOString();
    onSave({
      ...form,
      id: Date.now(),
      type: nt,
      lastContact: now,
      createdAt: now,
      lastContacted: now,
    });
    onClose();
  };

  const srcOptions = nt === "supply" ? SUPPLY_SRC : nt === "distributor" ? DIST_SRC : SALES_SRC;
  const stOptions = nt === "sales" ? SALES_ST : nt === "supply" ? SUPPLY_ST : DIST_ST;

  return (
    <div className="ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="mhead">
          <div>
            <div className="mtitle">Add lead</div>
            <div className="msub">Capture the basics, then let AI help with the follow-up.</div>
          </div>
          <button className="xbtn" onClick={onClose} type="button">✕</button>
        </div>

        <div className="seg">
          {["sales", "supply", "distributor"].map((t) => (
            <button key={t} className={`sgb ${nt === t ? "on" : ""}`} onClick={() => switchType(t)} type="button">
              {t === "sales" ? "Sales" : t === "supply" ? "Supply" : "Distributor"}
            </button>
          ))}
        </div>

        <div className="pastebox">
          <label>Paste WhatsApp chat for quick capture</label>
          <textarea placeholder="Copy mazungumzo hapa..." value={chat} onChange={(e) => setChat(e.target.value)} />
          <button className="bai" style={{ marginTop: 8 }} onClick={parseChat} disabled={parsing} type="button">
            {parsing ? <><span className="spin">⟳</span> Inasoma...</> : "Read with AI"}
          </button>
        </div>

        <div className="div" />

        <div className="field">
          <label>Name *</label>
          <input value={form.name} onChange={(e) => setF("name", e.target.value)} placeholder="Jina la mtu au biashara" />
        </div>
        <div className="field">
          <label>Phone</label>
          <input value={form.phone} onChange={(e) => setF("phone", e.target.value)} placeholder="+255..." />
        </div>
        <div className="row2">
          <div className="field">
            <label>Region</label>
            <select value={form.region} onChange={(e) => setF("region", e.target.value)}>
              {REGIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Source</label>
            <select value={form.source} onChange={(e) => setF("source", e.target.value)}>
              {srcOptions.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {nt === "sales" && (
          <div className="row2">
            <div className="field">
              <label>Product</label>
              <select value={form.product} onChange={(e) => setF("product", e.target.value)}>
                {PRODUCTS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setF("status", e.target.value)}>
                {stOptions.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}

        {nt === "supply" && (
          <>
            <div className="row2">
              <div className="field">
                <label>Type</label>
                <select value={form.subtype} onChange={(e) => setF("subtype", e.target.value)}>
                  <option value="individual">Individual collector</option>
                  <option value="agent">Wakala (agent)</option>
                </select>
              </div>
              <div className="field">
                <label>Hair supply (kg/week)</label>
                <input type="number" value={form.hairKg} onChange={(e) => setF("hairKg", e.target.value)} placeholder="e.g. 3" />
              </div>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setF("status", e.target.value)}>
                {stOptions.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </>
        )}

        {nt === "distributor" && (
          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setF("status", e.target.value)}>
              {stOptions.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        )}

        <div className="field">
          <label>Objection</label>
          <input value={form.objection} onChange={(e) => setF("objection", e.target.value)} placeholder="Bei, Leseni, Usafiri..." />
        </div>
        <div className="field">
          <label>Notes</label>
          <textarea value={form.notes} onChange={(e) => setF("notes", e.target.value)} placeholder="Maelezo muhimu..." />
        </div>
        <div className="row2">
          <div className="field">
            <label>Next Action *</label>
            <input value={form.nextAction || ""} onChange={(e) => setF("nextAction", e.target.value)} placeholder="e.g. Call, WhatsApp, Visit" />
          </div>
          <div className="field">
            <label>Next Action Date *</label>
            <input type="date" value={form.nextActionDate ? form.nextActionDate.slice(0, 10) : ""} onChange={(e) => setF("nextActionDate", e.target.value)} />
          </div>
        </div>

        <div className="mfoot">
          <button className="bghost" onClick={onClose} type="button">Cancel</button>
          <button className="bprim" onClick={save} type="button">Save lead</button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ lead, onClose, onUpdate, onDelete }) {
  const [status, setStatus] = useState(lead.status);
  const [notes, setNotes] = useState(lead.notes || "");
  const [connected, setConnected] = useState(lead.connected || false);
  const [aiMsg, setAiMsg] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(lead.name);
  const [phone, setPhone] = useState(lead.phone);
  const [region, setRegion] = useState(lead.region);
  const [source, setSource] = useState(lead.source || "");
  const [product, setProduct] = useState(lead.product || "");
  const [subtype, setSubtype] = useState(lead.subtype || "individual");
  const [hairKg, setHairKg] = useState(lead.hairKg || "");
  const [objection, setObjection] = useState(lead.objection || "");
  const [nextAction, setNextAction] = useState(lead.nextAction || "");
  const [nextActionDate, setNextActionDate] = useState(lead.nextActionDate || "");

  const t = getTemp({ ...lead, status, lastContact: lead.lastContact });
  const center = (lead.type === "supply" || lead.type === "distributor") ? COLLECTION_CENTERS[region] : null;
  const isTarget = TARGET_REGIONS.includes(region);
  const sourceOptions = lead.type === "supply" ? SUPPLY_SRC : lead.type === "distributor" ? DIST_SRC : SALES_SRC;

  const persistUpdate = (extras = {}) => {
    onUpdate({
      ...lead,
      name,
      phone,
      region,
      source,
      product,
      subtype,
      hairKg,
      objection,
      status,
      notes,
      connected,
      nextAction,
      nextActionDate,
      ...extras,
    });
  };

  const genMessage = async () => {
    setGenerating(true);
    const leadForPrompt = {
      ...lead,
      status,
      notes,
      connected,
      name,
      phone,
      region,
      source,
      product,
      subtype,
      hairKg,
      objection,
      nextAction,
      nextActionDate,
    };
    const prompt = generateFollowUpPrompt(leadForPrompt);
    const msg = await callAI(prompt);
    setAiMsg(msg);
    const newHistory = Array.isArray(lead.history) ? [...lead.history] : [];
    newHistory.unshift({ message: msg, date: new Date().toISOString() });
    const intel = parseAIResponse(msg);
    persistUpdate({
      leadScore: intel.leadScore,
      intent: intel.intent,
      recommendedAction: intel.recommendedAction,
      summary: intel.summary,
      history: newHistory,
      lastContacted: new Date().toISOString(),
    });
    setGenerating(false);
  };

  const save = () => {
    if (!name.trim()) return alert("Weka jina la lead");
    if (!nextAction || !nextActionDate) return alert("Weka Next Action na tarehe yake");
    persistUpdate({
      lastContacted: new Date().toISOString(),
      lastContact: new Date().toISOString(),
    });
    onClose();
  };

  const markContacted = () => {
    persistUpdate({
      lastContact: new Date().toISOString(),
      lastContacted: new Date().toISOString(),
    });
    onClose();
  };

  const copyMessage = async () => {
    if (!aiMsg) return;
    await navigator.clipboard.writeText(aiMsg);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const followUp = getFollowUpState({ ...lead, nextActionDate });

  return (
    <div className="ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="mhead">
          <div>
            <div className="modal-kicker">Lead workspace</div>
            <div className="mtitle">{name}</div>
            <div className="msub">{phone || "No phone"} · {region}{source ? ` · ${source}` : ""}</div>
          </div>
          <button className="xbtn" onClick={onClose} type="button">✕</button>
        </div>

        <div className="detail-hero">
          <div className="chips">
            <span className={`bdg ${t}`}>{tempLabel(t)}</span>
            <span className="chip">{getLeadTypeLabel(lead.type, subtype)}</span>
            <span className="chip" style={{ color: statusColor(status) }}>{status}</span>
            <span className={`priority-pill ${followUp.tone}`}>{followUp.label}</span>
            {typeof lead.leadScore === "number" && <span className="chip score">Score {lead.leadScore}</span>}
            {isTarget && <span className="chip-y">Target region</span>}
          </div>
          <div className="detail-summary-grid">
            <div className="summary-card">
              <span className="summary-label">Next action</span>
              <strong>{nextAction || "Not set"}</strong>
              <span>{nextActionDate ? formatDate(nextActionDate) : "Add a date"}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Last contact</span>
              <strong>{daysSince(lead.lastContact)} days ago</strong>
              <span>{formatDate(lead.lastContact)}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Lead intelligence</span>
              <strong>{lead.intent || "unclear"}</strong>
              <span>{lead.recommendedAction || "No recommendation yet"}</span>
            </div>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-main">
            <div className="field">
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="row2">
              <div className="field">
                <label>Region</label>
                <select value={region} onChange={(e) => setRegion(e.target.value)}>
                  {REGIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Source</label>
                <select value={source} onChange={(e) => setSource(e.target.value)}>
                  {sourceOptions.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {lead.type === "sales" && (
              <div className="row2">
                <div className="field">
                  <label>Product</label>
                  <select value={product} onChange={(e) => setProduct(e.target.value)}>
                    {PRODUCTS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    {SALES_ST.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            )}

            {lead.type === "supply" && (
              <>
                <div className="row2">
                  <div className="field">
                    <label>Type</label>
                    <select value={subtype} onChange={(e) => setSubtype(e.target.value)}>
                      <option value="individual">Individual collector</option>
                      <option value="agent">Wakala (agent)</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Hair supply (kg/week)</label>
                    <input type="number" value={hairKg} onChange={(e) => setHairKg(e.target.value)} placeholder="e.g. 3" />
                  </div>
                </div>
                <div className="field">
                  <label>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    {SUPPLY_ST.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="checkbox-row">
                  <input type="checkbox" id="d-connected" checked={connected} onChange={(e) => setConnected(e.target.checked)} />
                  <label htmlFor="d-connected">Wameunganishwa na collection center</label>
                </div>
              </>
            )}

            {lead.type === "distributor" && (
              <div className="field">
                <label>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {DIST_ST.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}

            <div className="field">
              <label>Objection</label>
              <input value={objection} onChange={(e) => setObjection(e.target.value)} placeholder="Bei, Leseni, Usafiri..." />
            </div>
            <div className="field">
              <label>Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="row2">
              <div className="field">
                <label>Next Action *</label>
                <input value={nextAction || ""} onChange={(e) => setNextAction(e.target.value)} placeholder="e.g. Call, WhatsApp, Visit" />
              </div>
              <div className="field">
                <label>Next Action Date *</label>
                <input type="date" value={nextActionDate ? nextActionDate.slice(0, 10) : ""} onChange={(e) => setNextActionDate(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="detail-side">
            {lead.summary && (
              <div className="infobox">
                <div className="infolbl">Conversation summary</div>
                <div className="side-copy">{lead.summary}</div>
              </div>
            )}

            {center && (
              <div className="centerbox">
                <div className="infolbl center-title">Collection center</div>
                <div className="side-strong">{center.name}</div>
                {center.phone && <div className="side-copy">{center.phone}</div>}
                {isTarget && <div className="side-copy">Mkoa unaolengwa, hivyo lead huyu ana thamani ya juu kwa upanuzi.</div>}
              </div>
            )}

            {lead.type === "supply" && lead.subtype === "agent" && (
              <div className="infobox">
                <div className="infolbl">Hatua za kuwa wakala</div>
                <div className="side-copy" style={{ whiteSpace: "pre-line" }}>{AGENT_STEPS}</div>
              </div>
            )}

            {lead.type === "distributor" && (
              <div className="infobox">
                <div className="infolbl">Hatua za usambazaji</div>
                <div className="side-copy" style={{ whiteSpace: "pre-line" }}>{DIST_STEPS}</div>
              </div>
            )}

            {lead.type === "supply" && subtype === "individual" && (
              <div className="infobox">
                <div className="infolbl">Malipo kwa mkusanyaji</div>
                <div className="inforow"><span>Bei ya nywele</span><span style={{ fontWeight: 700 }}>300 TZS/kg</span></div>
                <div className="inforow"><span>Malipo kupitia</span><span>{center?.name || "Collection Hub karibu nawe"}</span></div>
                {hairKg && (
                  <div className="inforow">
                    <span>Mapato yao/wiki</span>
                    <span style={{ fontWeight: 700, color: "#1f6b57" }}>
                      {(parseFloat(hairKg || 0) * PAYMENT.collector).toLocaleString()} TZS
                    </span>
                  </div>
                )}
              </div>
            )}

            {Array.isArray(lead.history) && lead.history.length > 0 && (
              <div className="infobox">
                <div className="infolbl">Recent AI drafts</div>
                <div className="history-list">
                  {lead.history.slice(0, 3).map((item, index) => (
                    <div className="history-item" key={`${item.date}-${index}`}>
                      <div className="history-date">{formatDate(item.date)}</div>
                      <div className="side-copy">{item.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="div" />

        <div className="ai-section-head">
          <div>
            <div className="infolbl">AI follow-up message</div>
            <div className="msub">Generate a ready-to-send WhatsApp reply using the latest lead context.</div>
          </div>
          <div className="ai-actions">
            <button className="bai" onClick={genMessage} disabled={generating} type="button">
              {generating ? <><span className="spin">⟳</span> Inaandika...</> : "Write message"}
            </button>
            <button className="bghost" onClick={markContacted} type="button">Mark as contacted</button>
          </div>
        </div>

        {aiMsg && (
          <div className="aibox">
            <div className="ailbl">WhatsApp message</div>
            <div className="aimsg">{aiMsg}</div>
            <button className="bcopy" onClick={copyMessage} type="button">{copied ? "Copied" : "Copy"}</button>
          </div>
        )}

        <div className="mfoot">
          <button className="bghost" onClick={onClose} type="button">Close</button>
          <button className="bprim" onClick={save} type="button">Save changes</button>
          <button className="bdel" onClick={onDelete} type="button">Delete lead</button>
        </div>
      </div>
    </div>
  );
}

function ReportTab({ leads }) {
  const [rtext, setRtext] = useState("");
  const [loading, setLoading] = useState(false);

  const sl = leads.filter((l) => l.type === "sales");
  const sul = leads.filter((l) => l.type === "supply");
  const sold = sl.filter((l) => l.status === "Amenunua").length;
  const hot = sl.filter((l) => getTemp(l) === "hot").length;
  const conn = sul.filter((l) => l.connected).length;
  const kg = Math.round(sul.filter((l) => l.connected && l.hairKg).reduce((a, l) => a + parseFloat(l.hairKg || 0), 0));

  const generate = async () => {
    setLoading(true);
    const sum = leads.map((l) => {
      if (l.type === "sales") return `[SALES] ${l.name}|${l.product}|${l.status}|${l.region}|Obj:${l.objection || "-"}|${daysSince(l.lastContact)}d`;
      if (l.type === "supply") return `[SUPPLY-${l.subtype}] ${l.name}|${l.source}|${l.region}|${l.hairKg || "?"}kg/wk|${l.status}|Connected:${l.connected ? "Ndiyo" : "Hapana"}|${daysSince(l.lastContact)}d`;
      return `[DIST] ${l.name}|${l.region}|${l.status}|Obj:${l.objection || "-"}|${daysSince(l.lastContact)}d`;
    }).join("\n");
    const r = await callAI(`Niandikia Weekly Report fupi kwa CutOff Recycle Limited:\n${sum}\n\nReport iwe na:\n1) Sales: leads, zilizofungwa, objections\n2) Supply: vyanzo vipya, vilivyounganishwa, kg zinazoweza kukusanywa, hali ya Tanga na Manyara (target mikoa)\n3) Distribution: mawakala wanaohangaika, walioidhinishwa\n4) Mapendekezo 2-3 ya wiki ijayo\nKiswahili, sauti ya CEO kwa timu. Ufupi.`);
    setRtext(r);
    setLoading(false);
  };

  return (
    <>
      <div className="stats">
        <div className="stat emphasis"><div className="sn" style={{ color: "#1f6b57" }}>{sold}</div><div className="sl">Wamenunua</div></div>
        <div className="stat"><div className="sn" style={{ color: "#ad5b1a" }}>{hot}</div><div className="sl">Hot sales</div></div>
        <div className="stat"><div className="sn" style={{ color: "#22577a" }}>{conn}</div><div className="sl">Connected sources</div></div>
        <div className="stat"><div className="sn">{kg}kg</div><div className="sl">Weekly hair supply</div></div>
      </div>
      <div className="rcard">
        <div className="rhead">
          <div>
            <div className="rtitle">Weekly report</div>
            <div className="msub">Create a short team-facing update from the leads in the CRM.</div>
          </div>
          <button className="bai" onClick={generate} disabled={loading} type="button">
            {loading ? <><span className="spin">⟳</span> Inaandika...</> : "Generate report"}
          </button>
        </div>
        {rtext
          ? <div className="rbody">{rtext}</div>
          : <div className="report-empty">Click "Generate report" kupata muhtasari wa wiki hii.</div>}
      </div>
    </>
  );
}

function LeadsToFollowUpToday({ leads, onOpen }) {
  const today = new Date().toISOString().slice(0, 10);
  const dueLeads = sortLeadsByPriority(
    leads.filter((l) => l.nextActionDate && l.nextActionDate.slice(0, 10) <= today),
  ).slice(0, 5);

  if (dueLeads.length === 0) return null;

  return (
    <div className="followup-box">
      <div className="followup-head">
        <div>
          <div className="followup-title">Today&apos;s follow-up queue</div>
          <div className="msub">Start with the leads that already need attention.</div>
        </div>
        <span className="queue-count">{dueLeads.length} due</span>
      </div>
      <div className="followup-list">
        {dueLeads.map((lead) => (
          <button key={lead.id} className="followup-item" onClick={() => onOpen(lead)} type="button">
            <div>
              <div className="fup-name">{lead.name}</div>
              <div className="fup-phone">{lead.phone || "No phone added"}</div>
            </div>
            <div className="fup-meta">
              <span className="fup-action">{lead.nextAction || "Plan next step"}</span>
              <span className={`priority-pill ${getFollowUpState(lead).tone}`}>{getFollowUpState(lead).label}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ type, onAdd }) {
  return (
    <div className="empty">
      <div className="empty-illustration">{type === "sales" ? "S" : type === "supply" ? "U" : "D"}</div>
      <div className="empty-title">No {type} leads in this view</div>
      <div className="empty-copy">Add a lead, import a chat with AI, or clear the current filters to see more activity.</div>
      <button className="addbtn" onClick={onAdd} type="button">+ Add lead</button>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [leads, setLeads] = useState(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      } catch {
        // Ignore malformed local data and fall back to seeded demo leads.
      }
    }
    return DEMO_LEADS;
  });
  const [lt, setLt] = useState("sales");
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  }, [leads]);

  const addLead = (lead) => setLeads((l) => [lead, ...l]);
  const updateLead = (u) => {
    setLeads((l) => l.map((x) => (x.id === u.id ? { ...x, ...u } : x)));
    setDetail((current) => (current && current.id === u.id ? { ...current, ...u } : current));
  };
  const deleteLead = (id) => setLeads((l) => l.filter((x) => x.id !== id));

  const salesLeads = useMemo(() => leads.filter((l) => l.type === "sales"), [leads]);
  const supplyLeads = useMemo(() => leads.filter((l) => l.type === "supply"), [leads]);
  const distributorLeads = useMemo(() => leads.filter((l) => l.type === "distributor"), [leads]);
  const hotSales = useMemo(() => salesLeads.filter((l) => getTemp(l) === "hot").length, [salesLeads]);
  const connectedSupply = useMemo(() => supplyLeads.filter((l) => l.connected).length, [supplyLeads]);
  const weeklyKg = useMemo(
    () => Math.round(supplyLeads.filter((l) => l.connected && l.hairKg).reduce((a, l) => a + parseFloat(l.hairKg || 0), 0)),
    [supplyLeads],
  );
  const needFU = useMemo(
    () => leads.filter((l) => daysSince(l.lastContact) >= 3 && !["Amenunua", "Amepotea", "Hayatoi tena"].includes(l.status)).length,
    [leads],
  );
  const overdue = useMemo(
    () => leads.filter((l) => getFollowUpState(l).tone === "danger" || getFollowUpState(l).tone === "warning").length,
    [leads],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const result = leads.filter((l) => {
      if (l.type !== lt) return false;
      if (filter !== "All" && getTemp(l) !== filter) return false;
      if (!normalized) return true;
      const haystack = [
        l.name,
        l.phone,
        l.region,
        l.source,
        l.product,
        l.status,
        l.notes,
        l.nextAction,
        l.objection,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
    return sortLeadsByPriority(result);
  }, [filter, leads, lt, query]);

  const topActionLeads = useMemo(() => sortLeadsByPriority(leads).slice(0, 3), [leads]);

  return (
    <div className="app">
      <header className="hdr">
        <div className="logo">
          <div className="lmark">C</div>
          <div>
            <div className="lname">CutOff Recycle CRM</div>
            <div className="lsub">Lead tracking, follow-up, and AI drafting</div>
          </div>
        </div>
        <nav className="nav">
          <button className={`nb ${tab === "dashboard" ? "on" : ""}`} onClick={() => setTab("dashboard")} type="button">Dashboard</button>
          <button className={`nb ${tab === "report" ? "on" : ""}`} onClick={() => setTab("report")} type="button">Weekly report</button>
        </nav>
      </header>

      <div className="main">
        <LeadsToFollowUpToday leads={leads} onOpen={setDetail} />

        {tab === "dashboard" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <div className="hero-kicker">Operations cockpit</div>
                <h1>Keep the team focused on the next best follow-up.</h1>
                <p>Search quickly, see what is overdue, and move from lead detail to WhatsApp reply without losing context.</p>
                <div className="hero-actions">
                  <button className="addbtn" onClick={() => setModal("add")} type="button">+ Add lead</button>
                  <button className="ghost-strong" onClick={() => setTab("report")} type="button">Open weekly report</button>
                </div>
              </div>

              <div className="hero-panel">
                <div className="hero-panel-title">Needs attention now</div>
                {topActionLeads.map((lead) => (
                  <button key={lead.id} className="hero-item" onClick={() => setDetail(lead)} type="button">
                    <div>
                      <div className="hero-item-name">{lead.name}</div>
                      <div className="hero-item-copy">{lead.nextAction || "Plan next step"} · {lead.region}</div>
                    </div>
                    <span className={`priority-pill ${getFollowUpState(lead).tone}`}>{getFollowUpState(lead).label}</span>
                  </button>
                ))}
              </div>
            </section>

            <div className="stats">
              <div className="stat emphasis"><div className="sn">{salesLeads.length}</div><div className="sl">Sales leads</div></div>
              <div className="stat"><div className="sn" style={{ color: "#ad5b1a" }}>{hotSales}</div><div className="sl">Hot sales</div></div>
              <div className="stat"><div className="sn">{connectedSupply} · <span className="stat-inline">{weeklyKg}kg/wk</span></div><div className="sl">Connected supply</div></div>
              <div className="stat"><div className="sn">{overdue}</div><div className="sl">Due or overdue</div></div>
            </div>

            {needFU > 0 && (
              <div className="alert">
                {needFU} lead{needFU > 1 ? "s" : ""} need follow-up because they have gone 3+ days without contact.
              </div>
            )}

            <div className="toolbar">
              <div className="tleft">
                <div className="ttype">
                  {[["sales", "ts", "Sales"], ["supply", "tsu", "Supply"], ["distributor", "td", "Distributor"]].map(([v, cls, label]) => (
                    <button key={v} className={`ttb ${lt === v ? cls : ""}`} onClick={() => setLt(v)} type="button">{label}</button>
                  ))}
                </div>
                <div className="filters">
                  {["All", "hot", "warm", "cold"].map((f) => (
                    <button key={f} className={`fb ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)} type="button">
                      {f === "All" ? "All" : f === "hot" ? "Hot" : f === "warm" ? "Warm" : "Cold"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="tright">
                <div className="search">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, phone, region, status..."
                  />
                </div>
                <button className="addbtn" onClick={() => setModal("add")} type="button">+ Add lead</button>
              </div>
            </div>

            <div className="section-head">
              <div>
                <div className="section-title">{getLeadTypeLabel(lt)}</div>
                <div className="msub">{filtered.length} result{filtered.length === 1 ? "" : "s"} sorted by urgency</div>
              </div>
              <div className="section-meta">
                <span>{lt === "sales" ? salesLeads.length : lt === "supply" ? supplyLeads.length : distributorLeads.length} total in this pipeline</span>
              </div>
            </div>

            {filtered.length === 0
              ? <EmptyState type={lt} onAdd={() => setModal("add")} />
              : (
                <div className="grid">
                  {filtered.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} onClick={() => setDetail(lead)} />
                  ))}
                </div>
              )}
          </>
        )}

        {tab === "report" && <ReportTab leads={leads} />}
      </div>

      {modal === "add" && (
        <AddModal
          initialType={lt}
          onClose={() => setModal(null)}
          onSave={(lead) => {
            addLead(lead);
            setModal(null);
          }}
        />
      )}

      {detail && (
        <DetailModal
          lead={detail}
          onClose={() => setDetail(null)}
          onUpdate={updateLead}
          onDelete={() => {
            deleteLead(detail.id);
            setDetail(null);
          }}
        />
      )}
    </div>
  );
}
