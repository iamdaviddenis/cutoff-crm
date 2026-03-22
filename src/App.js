import { useState } from "react";
import "./App.css";
import {
  PRODUCTS, SALES_SRC, SUPPLY_SRC, REGIONS,
  SALES_ST, SUPPLY_ST, DIST_ST, TARGET_REGIONS,
  COLLECTION_CENTERS, AGENT_STEPS, DIST_STEPS, PAYMENT
} from "./constants";
import { daysSince, getTemp, tempLabel, statusColor, callAI, defaultForm } from "./utils";

// ─── LEAD CARD ────────────────────────────────────────────────────────────────
function LeadCard({ lead, onClick }) {
  const t = getTemp(lead);
  const isTarget = TARGET_REGIONS.includes(lead.region);
  return (
    <div className="card" onClick={onClick}>
      <div className="ctop">
        <div>
          <div className="cname">{lead.name}</div>
          <div className="cphone">{lead.phone}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
          <span className={`bdg ${t}`}>{tempLabel(t)}</span>
          {isTarget && <span className="bdg chip-y" style={{ fontSize: 10 }}>Target</span>}
        </div>
      </div>
      <div className="chips">
        <span className="chip" style={{ color: statusColor(lead.status) }}>{lead.status}</span>
        {lead.type === "sales" && <span className="chip">{lead.product}</span>}
        {lead.type === "supply" && (
          <span className={lead.connected ? "chip-g" : "chip"}>
            {lead.subtype === "agent" ? "Wakala" : "Individual"}
          </span>
        )}
        <span className="chip">{lead.region}</span>
        {lead.type === "supply" && lead.hairKg && <span className="chip">{lead.hairKg}kg/wk</span>}
        {lead.objection && <span className="chip-r">{lead.objection}</span>}
      </div>
      {lead.notes && <div className="cnotes">{lead.notes}</div>}
      <div className="cdate">Last contact: {daysSince(lead.lastContact)}d ago</div>
    </div>
  );
}

// ─── ADD LEAD MODAL ───────────────────────────────────────────────────────────
function AddModal({ onClose, onSave, initialType }) {
  const [nt, setNt] = useState(initialType || "sales");
  const [form, setFormState] = useState(defaultForm(initialType || "sales"));
  const [chat, setChat] = useState("");
  const [parsing, setParsing] = useState(false);

  const setF = (k, v) => setFormState((f) => ({ ...f, [k]: v }));
  const switchType = (t) => { setNt(t); setFormState(defaultForm(t)); };

  const schemas = {
    sales: `{"name":"","phone":"","product":"Rutubisha/Vuna/McheKuza/Hajajua bado","source":"Instagram/Facebook/Referral/Maonyesho/Nyingine","region":"mkoa","status":"Mpya/Anafikiri/Ameamua/Amenunua/Amepotea","objection":"","notes":"muhtasari"}`,
    supply: `{"name":"","phone":"","source":"Barbershop/Salon/Shule/Kambi ya Jeshi/Nyingine","region":"mkoa","hairKg":"kg kwa wiki","subtype":"individual au agent","status":"Mpya/Anahangaika/Ameungana/Hayatoi tena","objection":"","notes":"muhtasari"}`,
    distributor: `{"name":"","phone":"","source":"chanzo","region":"mkoa","status":"Mpya/Anafikiri/Ameidhinishwa/Ameweka Oda/Amepotea","objection":"","notes":"muhtasari"}`,
  };

  const parseChat = async () => {
    if (!chat.trim()) return;
    setParsing(true);
    const res = await callAI(`Soma mazungumzo haya ya WhatsApp. Toa JSON tu bila maelezo:\n${schemas[nt]}\nMazungumzo:\n${chat}`);
    try {
      const obj = JSON.parse(res.replace(/```json|```/g, "").trim());
      setFormState((f) => ({ ...f, ...obj }));
    } catch { /* keep form as is */ }
    setParsing(false);
  };

  const save = () => {
    if (!form.name.trim()) return alert("Weka jina la lead");
    onSave({ ...form, id: Date.now(), type: nt, lastContact: new Date().toISOString(), createdAt: new Date().toISOString() });
    onClose();
  };

  const srcOptions = nt === "supply" ? SUPPLY_SRC : SALES_SRC;
  const stOptions = nt === "sales" ? SALES_ST : nt === "supply" ? SUPPLY_ST : DIST_ST;

  return (
    <div className="ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="mhead">
          <div className="mtitle">Add lead</div>
          <button className="xbtn" onClick={onClose}>✕</button>
        </div>

        <div className="seg">
          {["sales", "supply", "distributor"].map((t) => (
            <button key={t} className={`sgb ${nt === t ? "on" : ""}`} onClick={() => switchType(t)}>
              {t === "sales" ? "Sales" : t === "supply" ? "Supply" : "Distributor"}
            </button>
          ))}
        </div>

        <div className="pastebox">
          <label>Paste WhatsApp chat — AI itasoma</label>
          <textarea placeholder="Copy mazungumzo hapa..." value={chat} onChange={(e) => setChat(e.target.value)} />
          <button className="bai" style={{ marginTop: 8 }} onClick={parseChat} disabled={parsing}>
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

        <div className="mfoot">
          <button className="bghost" onClick={onClose}>Cancel</button>
          <button className="bprim" onClick={save}>Save lead</button>
        </div>
      </div>
    </div>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────
function DetailModal({ lead, onClose, onUpdate, onDelete }) {
  const [status, setStatus] = useState(lead.status);
  const [notes, setNotes] = useState(lead.notes || "");
  const [connected, setConnected] = useState(lead.connected || false);
  const [aiMsg, setAiMsg] = useState("");
  const [generating, setGenerating] = useState(false);

  const t = getTemp(lead);
  const center = lead.type === "supply" ? COLLECTION_CENTERS[lead.region] : null;
  const isTarget = TARGET_REGIONS.includes(lead.region);
  const stOptions = lead.type === "sales" ? SALES_ST : lead.type === "supply" ? SUPPLY_ST : DIST_ST;

  const genMessage = async () => {
    setGenerating(true);
    let prompt = "";
    if (lead.type === "supply" && lead.subtype === "agent") {
      prompt = `Niandikia WhatsApp message kwa mtu anayetaka kuwa Wakala wa Ukusanyaji wa CutOff Recycle:\nJina: ${lead.name}\nEneo: ${lead.region}${isTarget ? " (mkoa tunaolenga sana!)" : ""}\nStatus: ${status}\nObjection: ${lead.objection || "Hakuna"}\nNotes: ${notes}\nSiku bila mawasiliano: ${daysSince(lead.lastContact)}\nTaja hatua za kuwa wakala na uelekeze ajiunge WhatsApp group "Mtandao wa Wakusanyaji Taka Nywele Tanzania" na kujaza fomu https://tinyurl.com/haircollectors. Message fupi, Kiswahili cha kawaida, kama David anaandika. Jibu kwa message peke yake.`;
    } else if (lead.type === "supply") {
      prompt = `Niandikia WhatsApp message kwa mkusanyaji wa nywele:\nJina: ${lead.name}\nEneo: ${lead.region}\nChanzo: ${lead.source}\nStatus: ${status}\nObjection: ${lead.objection || "Hakuna"}\nNotes: ${notes}\nSiku bila mawasiliano: ${daysSince(lead.lastContact)}\nCollection center: ${center?.name || "inatafutwa"}\nMalipo: 300 TZS/kg. Taja pia WhatsApp group "Mtandao wa Wakusanyaji Taka Nywele Tanzania". Message fupi ya WhatsApp, Kiswahili, kama David. Jibu kwa message peke yake.`;
    } else if (lead.type === "distributor") {
      prompt = `Niandikia WhatsApp message kwa anayetaka kuwa wakala wa usambazaji wa mbolea:\nJina: ${lead.name}\nEneo: ${lead.region}\nDuka: ${notes}\nStatus: ${status}\nObjection: ${lead.objection || "Hakuna"}\nSiku bila mawasiliano: ${daysSince(lead.lastContact)}\nWanahitaji leseni ya TFRA kwanza. Bei ya jumla Tsh 10,000/L. MOQ katoni 10. Message fupi ya WhatsApp, Kiswahili, kama David. Jibu kwa message peke yake.`;
    } else {
      prompt = `Niandikia WhatsApp follow-up message kwa mteja wa mbolea:\nJina: ${lead.name}\nBidhaa: ${lead.product}\nStatus: ${status}\nObjection: ${lead.objection || "Hakuna"}\nNotes: ${notes}\nSiku bila mawasiliano: ${daysSince(lead.lastContact)}\nMessage fupi ya WhatsApp, Kiswahili cha kawaida, kama David. Jibu kwa message peke yake.`;
    }
    const msg = await callAI(prompt);
    setAiMsg(msg);
    setGenerating(false);
  };

  const save = () => {
    onUpdate({ ...lead, status, notes, connected, lastContact: new Date().toISOString() });
    onClose();
  };

  return (
    <div className="ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="mhead">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div className="mtitle">{lead.name}</div>
              <span className={`bdg ${lead.type === "sales" ? "chip-g" : lead.type === "supply" ? "chip-b" : "chip-y"}`} style={{ fontSize: 10 }}>
                {lead.type === "sales" ? "Sales" : lead.type === "supply" ? `Supply · ${lead.subtype === "agent" ? "Wakala" : "Individual"}` : "Distributor"}
              </span>
              {isTarget && <span className="bdg chip-y" style={{ fontSize: 10 }}>Target</span>}
            </div>
            <div className="msub">{lead.phone} · {lead.region}{lead.source ? ` · ${lead.source}` : ""}</div>
          </div>
          <button className="xbtn" onClick={onClose}>✕</button>
        </div>

        <div className="chips" style={{ marginBottom: 14 }}>
          <span className={`bdg ${t}`}>{tempLabel(t)}</span>
          {lead.type === "sales" && <span className="chip">{lead.product}</span>}
          {lead.type === "supply" && lead.hairKg && <span className="chip">{lead.hairKg}kg/wk</span>}
          {lead.objection && <span className="chip-r">{lead.objection}</span>}
        </div>

        <div className="field">
          <label>Update status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {stOptions.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        {lead.type === "supply" && (
          <div className="checkbox-row">
            <input type="checkbox" id="d-connected" checked={connected} onChange={(e) => setConnected(e.target.checked)} />
            <label htmlFor="d-connected">Wameunganishwa na collection center</label>
          </div>
        )}

        <div className="field">
          <label>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {center && (
          <div className="centerbox">
            <div style={{ fontSize: 10, color: "#639922", fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.3px" }}>
              Collection center — {lead.region}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#27500A" }}>{center.name}</div>
            {center.phone && <div style={{ fontSize: 12, color: "#3B6D11", marginTop: 2 }}>{center.phone}</div>}
            {isTarget && <div style={{ fontSize: 11, color: "#854F0B", marginTop: 4 }}>Mkoa unaolengwa — tunaomba wakala hapa</div>}
          </div>
        )}

        {lead.type === "supply" && lead.subtype === "agent" && (
          <div className="infobox" style={{ marginTop: 9 }}>
            <div className="infolbl">Hatua za kuwa Wakala wa Ukusanyaji</div>
            <div style={{ fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-line" }}>{AGENT_STEPS}</div>
          </div>
        )}

        {lead.type === "distributor" && (
          <div className="infobox" style={{ marginTop: 9 }}>
            <div className="infolbl">Hatua za kuwa Wakala wa Usambazaji</div>
            <div style={{ fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-line" }}>{DIST_STEPS}</div>
          </div>
        )}

        {lead.type === "supply" && lead.subtype === "individual" && (
          <div className="infobox" style={{ marginTop: 9 }}>
            <div className="infolbl">Malipo kwa mkusanyaji</div>
            <div className="inforow"><span>Bei ya nywele</span><span style={{ fontWeight: 600 }}>300 TZS/kg</span></div>
            <div className="inforow"><span>Malipo kupitia</span><span>{center?.name || "Collection Hub karibu nawe"}</span></div>
            {lead.hairKg && (
              <div className="inforow">
                <span>Mapato yao/wiki (est.)</span>
                <span style={{ fontWeight: 600, color: "#3B6D11" }}>
                  {(parseFloat(lead.hairKg) * PAYMENT.collector).toLocaleString()} TZS
                </span>
              </div>
            )}
          </div>
        )}

        <div className="div" />
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.3px", color: "#888" }}>AI follow-up message</div>
        <button className="bai" onClick={genMessage} disabled={generating}>
          {generating ? <><span className="spin">⟳</span> Inaandika...</> : "Write message"}
        </button>

        {aiMsg && (
          <div className="aibox">
            <div className="ailbl">WhatsApp message — ready to copy</div>
            <div className="aimsg">{aiMsg}</div>
            <button className="bcopy" onClick={() => navigator.clipboard.writeText(aiMsg)}>Copy</button>
          </div>
        )}

        <div className="mfoot">
          <button className="bghost" onClick={onClose}>Close</button>
          <button className="bprim" onClick={save}>Save changes</button>
          <button className="bdel" style={{marginLeft:8, color:'#b00', border:'1px solid #b00', background:'none'}} onClick={onDelete}>Delete lead</button>
        </div>
      </div>
    </div>
  );
}

// ─── WEEKLY REPORT ────────────────────────────────────────────────────────────
function ReportTab({ leads }) {
  const [rtext, setRtext] = useState("");
  const [loading, setLoading] = useState(false);

  const sl = leads.filter((l) => l.type === "sales");
  const sul = leads.filter((l) => l.type === "supply");
  // const dl = leads.filter((l) => l.type === "distributor");
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
        <div className="stat"><div className="sn" style={{ color: "#3B6D11" }}>{sold}</div><div className="sl">Wamenunua</div></div>
        <div className="stat"><div className="sn" style={{ color: "#993C1D" }}>{hot}</div><div className="sl">Hot sales</div></div>
        <div className="stat"><div className="sn" style={{ color: "#185FA5" }}>{conn}</div><div className="sl">Connected sources</div></div>
        <div className="stat"><div className="sn">{kg}kg</div><div className="sl">Weekly hair supply</div></div>
      </div>
      <div className="rcard">
        <div className="rhead">
          <div className="rtitle">Weekly report</div>
          <button className="bai" onClick={generate} disabled={loading}>
            {loading ? <><span className="spin">⟳</span> Inaandika...</> : "Generate report"}
          </button>
        </div>
        {rtext
          ? <div className="rbody">{rtext}</div>
          : <div style={{ color: "#bbb", fontSize: 12 }}>Click "Generate report" kupata muhtasari wa wiki hii.</div>}
      </div>
    </>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  // Start with empty leads array instead of DEMO_LEADS
  const [leads, setLeads] = useState([]);
  const [lt, setLt] = useState("sales");
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState(null);
  const [detail, setDetail] = useState(null);

  const addLead = (lead) => setLeads((l) => [lead, ...l]);
  const updateLead = (u) => setLeads((l) => l.map((x) => (x.id === u.id ? u : x)));
  // Add deleteLead function
  const deleteLead = (id) => setLeads((l) => l.filter((x) => x.id !== id));

  const sl = leads.filter((l) => l.type === "sales");
  const sul = leads.filter((l) => l.type === "supply");
  // const dl = leads.filter((l) => l.type === "distributor");
  const hot = sl.filter((l) => getTemp(l) === "hot").length;
  const kg = Math.round(sul.filter((l) => l.connected && l.hairKg).reduce((a, l) => a + parseFloat(l.hairKg || 0), 0));
  const needFU = leads.filter((l) => daysSince(l.lastContact) >= 3 && !["Amenunua", "Amepotea", "Hayatoi tena"].includes(l.status)).length;

  const filtered = leads.filter((l) => {
    if (l.type !== lt) return false;
    if (filter === "All") return true;
    return getTemp(l) === filter;
  });

  return (
    <div className="app">
      <header className="hdr">
        <div className="logo">
          <div className="lmark">C</div>
          <div>
            <div className="lname">CutOff Recycle CRM</div>
            <div className="lsub">CutOff Recycle Limited</div>
          </div>
        </div>
        <nav className="nav">
          <button className={`nb ${tab === "dashboard" ? "on" : ""}`} onClick={() => setTab("dashboard")}>Dashboard</button>
          <button className={`nb ${tab === "report" ? "on" : ""}`} onClick={() => setTab("report")}>Weekly report</button>
        </nav>
      </header>

      <div className="main">
        {tab === "dashboard" && (
          <>
            <div className="stats">
              <div className="stat"><div className="sn">{sl.length}</div><div className="sl">Sales leads</div></div>
              <div className="stat"><div className="sn" style={{ color: "#993C1D" }}>{hot}</div><div className="sl">Hot sales</div></div>
              <div className="stat"><div className="sn">{sul.length} · <span style={{ fontSize: 16 }}>{kg}kg/wk</span></div><div className="sl">Supply leads</div></div>
              {/* <div className="stat"><div className="sn">{dl.length}</div><div className="sl">Distributor leads</div></div> */}
            </div>

            {needFU > 0 && (
              <div className="alert">
                {needFU} lead{needFU > 1 ? "s" : ""} {needFU > 1 ? "zinahitaji" : "inahitaji"} follow-up — siku 3+ bila mawasiliano
              </div>
            )}

            <div className="toolbar">
              <div className="tleft">
                <div className="ttype">
                  {[["sales", "ts", "Sales"], ["supply", "tsu", "Supply"], ["distributor", "td", "Distributor"]].map(([v, cls, label]) => (
                    <button key={v} className={`ttb ${lt === v ? cls : ""}`} onClick={() => setLt(v)}>{label}</button>
                  ))}
                </div>
                <div className="filters">
                  {["All", "hot", "warm", "cold"].map((f) => (
                    <button key={f} className={`fb ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
                      {f === "All" ? "All" : f === "hot" ? "Hot" : f === "warm" ? "Warm" : "Cold"}
                    </button>
                  ))}
                </div>
              </div>
              <button className="addbtn" onClick={() => setModal("add")}>+ Add lead</button>
            </div>

            {filtered.length === 0
              ? <div className="empty">No {lt} leads yet — add the first one</div>
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
          onSave={(lead) => { addLead(lead); setModal(null); }}
        />
      )}

      {detail && (
        <DetailModal
          lead={detail}
          onClose={() => setDetail(null)}
          onUpdate={(u) => { updateLead(u); setDetail(null); }}
          // Pass deleteLead to DetailModal
          onDelete={() => { deleteLead(detail.id); setDetail(null); }}
        />
      )}
    </div>
  );
}
