export const PRODUCTS = ["Rutubisha", "Vuna", "McheKuza", "Hajajua bado"];
export const SALES_SRC = ["Instagram/Facebook", "Referral", "Maonyesho/Event", "Nyingine"];
export const SUPPLY_SRC = ["Barbershop", "Salon", "Shule", "Kambi ya Jeshi", "Nyingine"];
export const DIST_SRC = ["Instagram/Facebook", "Referral", "Maonyesho/Event", "Nyingine"];
export const REGIONS = ["Arusha", "Dar es Salaam", "Kilimanjaro", "Tanga", "Manyara", "Nyingine"];
export const SALES_ST = ["Mpya", "Anafikiri", "Ameamua", "Amenunua", "Amepotea"];
export const SUPPLY_ST = ["Mpya", "Anahangaika", "Ameungana", "Hayatoi tena"];
export const DIST_ST = ["Mpya", "Anafikiri", "Ameidhinishwa", "Ameweka Oda", "Amepotea"];
export const TARGET_REGIONS = ["Tanga", "Manyara"];

export const COLLECTION_CENTERS = {
  "Dar es Salaam": { name: "Watende Investment Company", phone: "+255 755 213 600" },
  "Kilimanjaro":   { name: "SECO Limited", phone: "" },
  "Arusha":        { name: "SIDO Arusha (HQ)", phone: "" },
  "Tanga":         { name: "Inatafutwa — Mkoa Mpya", phone: "" },
  "Manyara":       { name: "Inatafutwa — Mkoa Mpya", phone: "" },
};

export const AGENT_STEPS = `1. Sehemu ya Ukusanyaji — collection point salama, isiyokuwa makazi
2. Uwezo wa kuratibu wakusanyaji wadogo eneo lako
3. Simu inayopatikana muda wote + uwazi na uaminifu
4. Jaza fomu: https://tinyurl.com/haircollectors`;

export const DIST_STEPS = `1. Pata leseni ya TFRA (mafunzo siku 1, bure + mtihani + TIN)
2. MOQ: Katoni 10 = lita 240
3. Bei ya jumla: Tsh 10,000/L · rejareja: Tsh 12,000/L
4. Wasiliana nasi WhatsApp baada ya leseni`;

export const PAYMENT = { collector: 300, hub_sort: 150, hub_fee: 50 };

export const DEMO_LEADS = [
  {
    id: 1, type: "sales", name: "Juma Mollel", phone: "+255712345678",
    source: "Referral", product: "Vuna", status: "Anafikiri", region: "Arusha",
    notes: "Anapanda nyanya, anauliza bei ya lita 10.",
    lastContact: new Date(Date.now() - 2 * 864e5).toISOString(),
    objection: "Bei", createdAt: new Date(Date.now() - 5 * 864e5).toISOString(),
  },
  {
    id: 2, type: "sales", name: "Mama Amina", phone: "+255756789012",
    source: "Instagram/Facebook", product: "McheKuza", status: "Ameamua", region: "Dar es Salaam",
    notes: "Ana shamba la mahindi hekta 3. Tayari anataka order.",
    lastContact: new Date(Date.now() - 1 * 864e5).toISOString(),
    objection: "", createdAt: new Date(Date.now() - 3 * 864e5).toISOString(),
  },
  {
    id: 3, type: "supply", name: "Kinyozi wa Kariakoo", phone: "+255789001122",
    source: "Barbershop", region: "Dar es Salaam", hairKg: "2", subtype: "individual",
    status: "Mpya", notes: "Wanaona habari Instagram.", connected: false,
    lastContact: new Date(Date.now() - 1 * 864e5).toISOString(),
    objection: "", createdAt: new Date(Date.now() - 2 * 864e5).toISOString(),
  },
  {
    id: 4, type: "supply", name: "Hassan Mwangaza", phone: "+255756334455",
    source: "Barbershop", region: "Tanga", hairKg: "5", subtype: "agent",
    status: "Anahangaika", notes: "Ana nafasi kubwa — anahitaji mwongozo wa kuwa wakala.",
    connected: false, lastContact: new Date(Date.now() - 3 * 864e5).toISOString(),
    objection: "Hawajui mchakato", createdAt: new Date(Date.now() - 4 * 864e5).toISOString(),
  },
  {
    id: 5, type: "distributor", name: "Kilimo Bora Agrovet", phone: "+255712998877",
    source: "Referral", region: "Kilimanjaro", status: "Anafikiri",
    notes: "Duka kubwa la pembejeo — wana wateja wengi wa mahindi.",
    lastContact: new Date(Date.now() - 2 * 864e5).toISOString(),
    objection: "TFRA license", createdAt: new Date(Date.now() - 3 * 864e5).toISOString(),
  },
];
