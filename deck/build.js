/* CarbonSell pitch deck.
 *
 *   node build.js
 *
 * Screenshots are optional: drop PNGs into ./shots with the names listed in
 * SHOTS below and re-run, and they replace the labelled placeholders.
 */
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const C = {
  ink: "12202B", // deep slate, the dominant colour
  inkSoft: "1E3240",
  paper: "F4F6F7", // cool paper, light slides
  white: "FFFFFF",
  amber: "C2610F", // the one accent
  amberSoft: "FBEEDF",
  teal: "1C5563", // supporting
  tealSoft: "E2EFF2",
  muted: "61707C",
  rule: "D2DAE1",
  good: "1D6B48",
};

const HEAD = "Cambria";
const BODY = "Calibri";
const SHOTS = path.join(__dirname, "shots");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.3 x 7.5
pres.author = "Team Anomaly";
pres.title = "CarbonSell";

const W = 13.3;
const H = 7.5;
const M = 0.7;

/* ------------------------------------------------------------ helpers */

function darkSlide() {
  const s = pres.addSlide();
  s.background = { color: C.ink };
  return s;
}

function lightSlide(title, kicker) {
  const s = pres.addSlide();
  s.background = { color: C.paper };
  if (kicker) {
    s.addText(kicker.toUpperCase(), {
      x: M,
      y: 0.42,
      w: 11,
      h: 0.28,
      fontFace: BODY,
      fontSize: 11,
      bold: true,
      color: C.amber,
      charSpacing: 2,
      isTextBox: true,
      margin: 0,
    });
  }
  s.addText(title, {
    x: M,
    y: kicker ? 0.74 : 0.55,
    w: 11.9,
    h: 0.85,
    fontFace: HEAD,
    fontSize: 36,
    bold: true,
    color: C.ink,
    isTextBox: true,
    margin: 0,
  });
  return s;
}

function card(slide, { x, y, w, h, fill = C.white }) {
  slide.addShape(pres.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.04,
    fill: { color: fill },
    line: { color: C.rule, width: 0.75 },
    shadow: { type: "outer", angle: 90, blur: 6, offset: 1, color: "9FB0BC", opacity: 0.2 },
  });
}

function marker(slide, n, x, y) {
  slide.addShape(pres.ShapeType.roundRect, {
    x,
    y,
    w: 0.42,
    h: 0.42,
    rectRadius: 0.06,
    fill: { color: C.amber },
    line: { color: C.amber, width: 0 },
  });
  slide.addText(String(n), {
    x,
    y,
    w: 0.42,
    h: 0.42,
    align: "center",
    valign: "middle",
    fontFace: BODY,
    fontSize: 14,
    bold: true,
    color: C.white,
    isTextBox: true,
    margin: 0,
  });
}

/** Embeds shots/<file> if it exists, otherwise a labelled frame. */
function shot(slide, file, { x, y, w, h, caption }) {
  const p = path.join(SHOTS, file);
  if (fs.existsSync(p)) {
    slide.addImage({
      path: p,
      x,
      y,
      w,
      h,
      sizing: { type: "contain", w, h },
    });
  } else {
    slide.addShape(pres.ShapeType.roundRect, {
      x,
      y,
      w,
      h,
      rectRadius: 0.03,
      fill: { color: C.white },
      line: { color: C.rule, width: 1 },
    });
    slide.addText(`shots/${file}`, {
      x,
      y: y + h / 2 - 0.2,
      w,
      h: 0.4,
      align: "center",
      fontFace: BODY,
      fontSize: 11,
      color: C.muted,
      isTextBox: true,
      margin: 0,
    });
  }
  if (caption) {
    slide.addText(caption, {
      x,
      y: y + h + 0.08,
      w,
      h: 0.3,
      fontFace: BODY,
      fontSize: 11,
      color: C.muted,
      isTextBox: true,
      margin: 0,
    });
  }
}

function bullets(slide, items, opts) {
  slide.addText(
    items.map((t, i) => ({
      text: t,
      options: { bullet: true, breakLine: i !== items.length - 1 },
    })),
    {
      fontFace: BODY,
      fontSize: 15,
      color: C.inkSoft,
      lineSpacing: 22,
      paraSpaceAfter: 8,
      isTextBox: true,
      ...opts,
    },
  );
}

function footer(slide, text) {
  slide.addText(text, {
    x: M,
    y: H - 0.55,
    w: 11.9,
    h: 0.3,
    fontFace: BODY,
    fontSize: 10,
    color: C.muted,
    isTextBox: true,
    margin: 0,
  });
}

/* ------------------------------------------------------------ 1. title */
{
  const s = darkSlide();
  s.addText("CARBONSELL", {
    x: M,
    y: 2.15,
    w: 10,
    h: 0.4,
    fontFace: BODY,
    fontSize: 13,
    bold: true,
    color: C.amber,
    charSpacing: 5,
    isTextBox: true,
    margin: 0,
  });
  s.addText("Turning captured CO₂ into something worth selling", {
    x: M,
    y: 2.6,
    w: 11.3,
    h: 1.8,
    fontFace: HEAD,
    fontSize: 42,
    bold: true,
    color: C.white,
    lineSpacing: 48,
    isTextBox: true,
    margin: 0,
  });
  s.addText(
    "A marketplace that prices carbon delivered to your gate — gas, haulage and all.",
    {
      x: M,
      y: 4.5,
      w: 10.5,
      h: 0.5,
      fontFace: BODY,
      fontSize: 17,
      color: "AEBCC6",
      isTextBox: true,
      margin: 0,
    },
  );
  s.addText("Team Anomaly  ·  Circular Carbon Ecosystem", {
    x: M,
    y: 5.9,
    w: 10,
    h: 0.35,
    fontFace: BODY,
    fontSize: 13,
    color: "8296A4",
    isTextBox: true,
    margin: 0,
  });
  s.addNotes(
    "One line: a cement plant pays to bury CO2, a concrete yard 150 km away pays to buy it, and neither can find the other.",
  );
}

/* ------------------------------------------------------------ 2. problem */
{
  const s = lightSlide("Two industries need each other and cannot find each other", "The problem");

  const cols = [
    {
      x: M,
      title: "One side pays to get rid of it",
      body: "Cement plants, steel mills and power stations capture CO₂ from their exhaust. Then they pay again — to compress it, store it and bury it. Captured carbon shows up on the books as a cost, so capturing more of it makes no business sense.",
      fill: C.white,
    },
    {
      x: 7.0,
      title: "The other side pays to buy it",
      body: "Methanol and fuel makers, urea plants, beverage bottlers, greenhouses, algae farms and concrete curing yards all buy CO₂ as a raw material — often shipped in from far away, at a price that includes someone else's margin.",
      fill: C.white,
    },
  ];

  cols.forEach((c) => {
    card(s, { x: c.x, y: 2.0, w: 5.6, h: 2.3, fill: c.fill });
    s.addText(c.title, {
      x: c.x + 0.35,
      y: 2.25,
      w: 4.9,
      h: 0.4,
      fontFace: HEAD,
      fontSize: 19,
      bold: true,
      color: C.ink,
      isTextBox: true,
      margin: 0,
    });
    s.addText(c.body, {
      x: c.x + 0.35,
      y: 2.7,
      w: 4.9,
      h: 1.4,
      fontFace: BODY,
      fontSize: 14,
      color: C.inkSoft,
      lineSpacing: 19,
      isTextBox: true,
      margin: 0,
    });
  });

  card(s, { x: M, y: 4.65, w: 11.9, h: 1.85, fill: C.ink });
  s.addText("Why the gap survives", {
    x: M + 0.4,
    y: 4.9,
    w: 4,
    h: 0.35,
    fontFace: BODY,
    fontSize: 11,
    bold: true,
    color: C.amber,
    charSpacing: 2,
    isTextBox: true,
    margin: 0,
  });
  const gaps = [
    ["No shared place", "to see who has gas, how much, and how pure it is."],
    ["No delivered price", "transport is the biggest cost and nobody can estimate it up front."],
    ["No way to trust a stranger", "with a six-figure order and a quality claim."],
  ];
  gaps.forEach(([h, t], i) => {
    const x = M + 0.4 + i * 3.75;
    s.addText(
      [
        { text: h + " ", options: { bold: true, color: C.white } },
        { text: t, options: { color: "AEBCC6" } },
      ],
      {
        x,
        y: 5.35,
        w: 3.4,
        h: 0.95,
        fontFace: BODY,
        fontSize: 13,
        lineSpacing: 18,
        isTextBox: true,
        margin: 0,
      },
    );
  });
  footer(s, "So captured CO₂ gets buried, and carbon capture stays an expense nobody volunteers for.");
}

/* ------------------------------------------------------------ 3. solution */
{
  const s = lightSlide("A marketplace that prices carbon delivered, not at the gate", "Our solution");

  const items = [
    [
      "Sellers list what they actually have",
      "Volume, purity, a full contaminant profile in ppm, a pickup site, and a starting price — backed by an ACVA report or a lab test.",
    ],
    [
      "Buyers say what they need",
      "Volume, minimum purity, a price ceiling for the gas, and any contaminant limits their process cares about.",
    ],
    [
      "We rank every seller by real cost",
      "Gas plus haulage, using real road distance and the cheapest truck that fits. One number: rupees per tonne at your gate.",
    ],
    [
      "They trade with strangers safely",
      "Bidding windows, in-app chat, consent-based phone sharing, escrow, and a sample check before the money moves.",
    ],
  ];

  items.forEach(([h, t], i) => {
    const y = 1.95 + i * 1.22;
    marker(s, i + 1, M, y + 0.05);
    s.addText(h, {
      x: M + 0.65,
      y,
      w: 7.6,
      h: 0.38,
      fontFace: HEAD,
      fontSize: 19,
      bold: true,
      color: C.ink,
      isTextBox: true,
      margin: 0,
    });
    s.addText(t, {
      x: M + 0.65,
      y: y + 0.4,
      w: 7.6,
      h: 0.62,
      fontFace: BODY,
      fontSize: 13.5,
      color: C.inkSoft,
      lineSpacing: 18,
      isTextBox: true,
      margin: 0,
    });
  });

  card(s, { x: 9.1, y: 1.95, w: 3.5, h: 4.3, fill: C.tealSoft });
  s.addText("Who uses it", {
    x: 9.45,
    y: 2.2,
    w: 2.9,
    h: 0.35,
    fontFace: BODY,
    fontSize: 11,
    bold: true,
    color: C.teal,
    charSpacing: 2,
    isTextBox: true,
    margin: 0,
  });
  bullets(
    s,
    [
      "Emitters — cement, steel, power, refineries",
      "Utilisers — methanol, urea, beverages, greenhouses, concrete",
      "Logistics partners with CO₂ tankers",
      "Regulators watching a region",
    ],
    { x: 9.45, y: 2.65, w: 2.9, h: 3.3, fontSize: 13, color: C.ink, lineSpacing: 18 },
  );
}

/* ------------------------------------------------------------ 4. flow */
{
  const s = lightSlide("How a deal happens", "The flow");

  const steps = [
    ["Verify", "Company signs up with its GSTIN. Purity is backed by an ACVA report, or a lab test if they have none."],
    ["List", "Seller posts volume, purity, contaminant profile, pickup site, starting price and a bidding window."],
    ["Discover", "Buyers filter by what matters to them. Every seller is ranked by delivered cost, not asking price."],
    ["Bid", "Buyers bid inside the window and ask questions in chat. The seller shares a phone number only if they want to."],
    ["Award", "Seller takes one bid, or several to fill the quantity. Payment goes into escrow, not to the seller."],
    ["Deliver", "A CO₂ logistics partner ships it. The buyer samples on arrival, the escrow releases, both sides rate each other."],
  ];

  steps.forEach(([h, t], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = M + col * 4.05;
    const y = 2.0 + row * 2.3;
    card(s, { x, y, w: 3.65, h: 1.95 });
    marker(s, i + 1, x + 0.3, y + 0.28);
    s.addText(h, {
      x: x + 0.85,
      y: y + 0.32,
      w: 2.5,
      h: 0.35,
      fontFace: HEAD,
      fontSize: 18,
      bold: true,
      color: C.ink,
      isTextBox: true,
      margin: 0,
    });
    s.addText(t, {
      x: x + 0.3,
      y: y + 0.82,
      w: 3.05,
      h: 1.0,
      fontFace: BODY,
      fontSize: 12,
      color: C.inkSoft,
      lineSpacing: 16,
      isTextBox: true,
      margin: 0,
    });
    if (col < 2) {
      s.addText("→", {
        x: x + 3.68,
        y: y + 0.75,
        w: 0.35,
        h: 0.4,
        align: "center",
        fontFace: BODY,
        fontSize: 20,
        color: C.amber,
        isTextBox: true,
        margin: 0,
      });
    }
  });
  footer(s, "Everything from Verify to Award is built and working today. Escrow and the logistics hand-off are the next build.");
}

/* ------------------------------------------------------------ 5. the insight */
{
  const s = lightSlide("The purest gas is almost never the cheapest", "Why we rank differently");

  s.addText(
    "A real result from the product: a concrete yard in Nagpur needs 200 tonne at 95% or better.",
    {
      x: M,
      y: 1.75,
      w: 11.9,
      h: 0.4,
      fontFace: BODY,
      fontSize: 15,
      color: C.inkSoft,
      isTextBox: true,
      margin: 0,
    },
  );

  const rows = [
    {
      x: M,
      rank: "Ranked #1",
      who: "Chandrapur Super Thermal",
      spec: "95.8% purity  ·  153 km away",
      cost: "₹2,484.63",
      note: "₹2,050 gas  +  ₹434.63 haulage",
      fill: C.amberSoft,
      accent: C.amber,
    },
    {
      x: 6.95,
      rank: "Ranked #3",
      who: "Solapur Cement",
      spec: "96.5% purity  ·  651 km away",
      cost: "₹4,092.67",
      note: "₹2,100 gas  +  ₹1,992.67 haulage",
      fill: C.white,
      accent: C.muted,
    },
  ];

  rows.forEach((r) => {
    card(s, { x: r.x, y: 2.35, w: 5.65, h: 2.5, fill: r.fill });
    s.addText(r.rank, {
      x: r.x + 0.35,
      y: 2.58,
      w: 3,
      h: 0.3,
      fontFace: BODY,
      fontSize: 11,
      bold: true,
      color: r.accent,
      charSpacing: 2,
      isTextBox: true,
      margin: 0,
    });
    s.addText(r.who, {
      x: r.x + 0.35,
      y: 2.9,
      w: 5,
      h: 0.4,
      fontFace: HEAD,
      fontSize: 20,
      bold: true,
      color: C.ink,
      isTextBox: true,
      margin: 0,
    });
    s.addText(r.spec, {
      x: r.x + 0.35,
      y: 3.32,
      w: 5,
      h: 0.3,
      fontFace: BODY,
      fontSize: 13,
      color: C.muted,
      isTextBox: true,
      margin: 0,
    });
    s.addText(r.cost, {
      x: r.x + 0.35,
      y: 3.72,
      w: 3.2,
      h: 0.6,
      fontFace: HEAD,
      fontSize: 34,
      bold: true,
      color: C.ink,
      isTextBox: true,
      margin: 0,
    });
    s.addText("per tonne delivered", {
      x: r.x + 2.5,
      y: 3.95,
      w: 2.6,
      h: 0.3,
      fontFace: BODY,
      fontSize: 12,
      color: C.muted,
      isTextBox: true,
      margin: 0,
    });
    s.addText(r.note, {
      x: r.x + 0.35,
      y: 4.38,
      w: 5,
      h: 0.3,
      fontFace: BODY,
      fontSize: 12.5,
      color: C.inkSoft,
      isTextBox: true,
      margin: 0,
    });
  });

  card(s, { x: M, y: 5.15, w: 11.9, h: 1.15, fill: C.ink });
  s.addText(
    [
      { text: "The cleaner gas costs ₹1,608 more per tonne — ₹3.2 lakh on this one order. ", options: { bold: true, color: C.white } },
      { text: "Haulage decides these deals, and nobody in this market prices it before they call.", options: { color: "AEBCC6" } },
    ],
    {
      x: M + 0.4,
      y: 5.4,
      w: 11.1,
      h: 0.7,
      fontFace: BODY,
      fontSize: 15,
      lineSpacing: 21,
      isTextBox: true,
      margin: 0,
    },
  );
}

/* ------------------------------------------------------------ 6-8. prototype */
{
  const s = lightSlide("The seller's side", "Working prototype");
  shot(s, "01-listing-form.png", {
    x: M,
    y: 1.75,
    w: 5.8,
    h: 4.5,
    caption: "Publishing a listing — contaminant profile in ppm, starting price, bidding window.",
  });
  shot(s, "02-bid-desk.png", {
    x: 6.9,
    y: 1.75,
    w: 5.7,
    h: 4.5,
    caption: "The auction desk — every bidder, with accept, decline and chat.",
  });
}
{
  const s = lightSlide("The buyer's side", "Working prototype");
  shot(s, "03-matches.png", {
    x: M,
    y: 1.75,
    w: 5.8,
    h: 4.5,
    caption: "Sellers ranked by delivered cost, with the haulage plan behind every number.",
  });
  shot(s, "04-listing-bid.png", {
    x: 6.9,
    y: 1.75,
    w: 5.7,
    h: 4.5,
    caption: "A live auction — highest bid, lowest bid, time left, and the gas analysis.",
  });
}
{
  const s = lightSlide("Talking, and closing", "Working prototype");
  shot(s, "05-chat.png", {
    x: M,
    y: 1.75,
    w: 5.8,
    h: 3.6,
    caption: "Chat on the listing. The seller releases their number to one buyer, deliberately.",
  });
  shot(s, "06-orders.png", {
    x: 6.9,
    y: 1.75,
    w: 5.7,
    h: 3.6,
    caption: "The order after the deal — pickup slot, haul plan, contact unmasked.",
  });
  footer(s, "Built and running: signup and verification badge, listings, ranking, bidding, chat, orders and pickup scheduling.");
}

/* ------------------------------------------------------------ 9. tech */
{
  const s = lightSlide("What it is built on", "Tech stack");

  const groups = [
    ["Frontend", ["React with Vite and TypeScript", "Tailwind for the interface", "Leaflet for maps"]],
    ["Backend", ["Python with FastAPI", "REST for every marketplace action", "Auto-generated API docs"]],
    ["Data", ["SQLite now, PostgreSQL behind the same ORM later", "PostGIS for location queries at scale"]],
    ["Maps and routing", ["Ola Maps for address autocomplete", "Real road distance for haulage", "Results cached on disk"]],
    ["Security", ["bcrypt passwords, JWT sessions", "Role read from the token, never the browser", "Phone numbers masked server-side"]],
    ["Planned", ["Razorpay escrow accounts", "GSTIN and CIN verification APIs", "Encrypted storage for lab reports"]],
  ];

  groups.forEach(([h, items], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = M + col * 4.05;
    const y = 1.9 + row * 2.35;
    card(s, { x, y, w: 3.65, h: 2.0 });
    s.addText(h, {
      x: x + 0.3,
      y: y + 0.25,
      w: 3.0,
      h: 0.35,
      fontFace: HEAD,
      fontSize: 17,
      bold: true,
      color: C.teal,
      isTextBox: true,
      margin: 0,
    });
    bullets(s, items, {
      x: x + 0.3,
      y: y + 0.68,
      w: 3.05,
      h: 1.2,
      fontSize: 12,
      lineSpacing: 15,
      paraSpaceAfter: 4,
    });
  });
}

/* ------------------------------------------------------------ 10. risks */
{
  const s = lightSlide("What could go wrong, and what we do about it", "Risks and answers");

  const risks = [
    [
      "A seller overstates purity",
      "Purity has to be backed by an ACVA report, or a lab test. The buyer samples on delivery, and the escrow does not release until they accept.",
    ],
    [
      "A buyer rejects good gas to get out of a deal",
      "A disputed load goes to an independent lab. Whoever is proved wrong pays for the test, so a false rejection costs money.",
    ],
    [
      "A winning bidder walks away",
      "They get a warning, then a suspension from bidding. The seller can hand the deal to the next highest bidder.",
    ],
    [
      "Either side simply is not who they claim",
      "Companies are checked against GSTIN and CIN records at signup, and only verified companies can list or bid.",
    ],
    [
      "Money goes missing",
      "It never reaches a stranger. Payment sits in a Razorpay escrow account from the moment a deal is struck until the gas is accepted.",
    ],
    [
      "A seller sells more than they ever captured",
      "The regulator dashboard flags anyone whose sales exceed the volume in their ACVA report.",
    ],
  ];

  risks.forEach(([h, t], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = M + col * 6.1;
    const y = 1.95 + row * 1.75;
    s.addShape(pres.ShapeType.roundRect, {
      x,
      y: y + 0.06,
      w: 0.16,
      h: 0.16,
      rectRadius: 0.05,
      fill: { color: C.amber },
      line: { color: C.amber, width: 0 },
    });
    s.addText(h, {
      x: x + 0.35,
      y,
      w: 5.4,
      h: 0.33,
      fontFace: HEAD,
      fontSize: 16,
      bold: true,
      color: C.ink,
      isTextBox: true,
      margin: 0,
    });
    s.addText(t, {
      x: x + 0.35,
      y: y + 0.36,
      w: 5.4,
      h: 1.05,
      fontFace: BODY,
      fontSize: 12.5,
      color: C.inkSoft,
      lineSpacing: 16,
      isTextBox: true,
      margin: 0,
    });
  });
}

/* ------------------------------------------------------------ 11. money */
{
  const s = lightSlide("How the platform earns", "Business model");

  const streams = [
    ["A cut of each sale", "A small percentage of what the seller takes on a completed deal."],
    ["Logistics partners pay us", "To be a recommended carrier — periodically, and per order they win through us."],
    ["Penalties", "Charged on fraudulent or abandoned orders, which also funds the dispute lab tests."],
    ["Subscriptions, later", "For high-volume sellers and regulators who want the analytics."],
  ];

  streams.forEach(([h, t], i) => {
    const x = M + i * 3.05;
    card(s, { x, y: 2.1, w: 2.75, h: 2.5 });
    marker(s, i + 1, x + 0.28, 2.35);
    s.addText(h, {
      x: x + 0.28,
      y: 2.9,
      w: 2.2,
      h: 0.75,
      valign: "bottom",
      fontFace: HEAD,
      fontSize: 15,
      bold: true,
      color: C.ink,
      lineSpacing: 19,
      isTextBox: true,
      margin: 0,
    });
    s.addText(t, {
      x: x + 0.28,
      y: 3.68,
      w: 2.2,
      h: 0.85,
      fontFace: BODY,
      fontSize: 11.5,
      color: C.inkSoft,
      lineSpacing: 15,
      isTextBox: true,
      margin: 0,
    });
  });

  card(s, { x: M, y: 4.95, w: 11.9, h: 1.3, fill: C.tealSoft });
  s.addText(
    [
      { text: "Nobody pays to look. ", options: { bold: true, color: C.ink } },
      {
        text: "Listing, searching and bidding are free, because an empty marketplace is worth nothing. We only earn when a tonne of CO₂ actually moves.",
        options: { color: C.inkSoft },
      },
    ],
    {
      x: M + 0.4,
      y: 5.25,
      w: 11.1,
      h: 0.75,
      fontFace: BODY,
      fontSize: 14.5,
      lineSpacing: 20,
      isTextBox: true,
      margin: 0,
    },
  );
}

/* ------------------------------------------------------------ 12. future */
{
  const s = lightSlide("What we build next", "Future scope");

  const next = [
    [
      "Pool small sellers into one order",
      "When no single seller can fill a large order, combine several and pool the deliveries.",
    ],
    [
      "Shared trucks and return legs",
      "One truck collects from several emitters on the same day, and empty tankers heading home get filled cheaply.",
    ],
    [
      "Quality blending",
      "Mix a high-purity and a lower-purity stream to hit a buyer's spec for less than buying clean gas.",
    ],
    [
      "Regional carbon map",
      "Supply, unmet demand, stranded CO₂ with no viable buyer, and average price by region — on one map.",
    ],
    [
      "Infrastructure planner",
      "Use clusters of stranded carbon to suggest where a shared purification hub or pipeline would pay for itself.",
    ],
    [
      "An assistant for new buyers",
      "Most first-time buyers do not know what spec their process needs. It asks, then fills the requirement in.",
    ],
  ];

  next.forEach(([h, t], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = M + col * 4.05;
    const y = 1.95 + row * 2.3;
    card(s, { x, y, w: 3.65, h: 1.95, fill: row === 0 ? C.white : C.white });
    s.addText(h, {
      x: x + 0.3,
      y: y + 0.28,
      w: 3.05,
      h: 0.7,
      fontFace: HEAD,
      fontSize: 16,
      bold: true,
      color: C.ink,
      lineSpacing: 20,
      isTextBox: true,
      margin: 0,
    });
    s.addText(t, {
      x: x + 0.3,
      y: y + 1.0,
      w: 3.05,
      h: 0.85,
      fontFace: BODY,
      fontSize: 12,
      color: C.inkSoft,
      lineSpacing: 16,
      isTextBox: true,
      margin: 0,
    });
  });
}

/* ------------------------------------------------------------ 13. close */
{
  const s = darkSlide();
  s.addText("THE POINT", {
    x: M,
    y: 1.55,
    w: 8,
    h: 0.35,
    fontFace: BODY,
    fontSize: 12,
    bold: true,
    color: C.amber,
    charSpacing: 4,
    isTextBox: true,
    margin: 0,
  });
  s.addText("Give captured carbon a price and a buyer, and capturing it stops being charity.", {
    x: M,
    y: 2.0,
    w: 11.5,
    h: 1.6,
    fontFace: HEAD,
    fontSize: 34,
    bold: true,
    color: C.white,
    lineSpacing: 42,
    isTextBox: true,
    margin: 0,
  });

  const impact = [
    ["Captured CO₂ becomes a tradeable asset", "instead of a disposal bill."],
    ["Emissions fall on both sides", "the gas is reused, and the buyer stops sourcing it from somewhere further away."],
    ["Capture projects get a business case", "which is what actually gets them built."],
  ];
  impact.forEach(([h, t], i) => {
    const x = M + i * 4.0;
    s.addShape(pres.ShapeType.roundRect, {
      x,
      y: 4.15,
      w: 0.16,
      h: 0.16,
      rectRadius: 0.05,
      fill: { color: C.amber },
      line: { color: C.amber, width: 0 },
    });
    s.addText(h, {
      x,
      y: 4.4,
      w: 3.6,
      h: 0.72,
      valign: "bottom",
      fontFace: BODY,
      fontSize: 15,
      bold: true,
      color: C.white,
      lineSpacing: 20,
      isTextBox: true,
      margin: 0,
    });
    s.addText(t, {
      x,
      y: 5.15,
      w: 3.6,
      h: 0.8,
      fontFace: BODY,
      fontSize: 13,
      color: "AEBCC6",
      lineSpacing: 18,
      isTextBox: true,
      margin: 0,
    });
  });

  s.addText("CarbonSell  ·  Team Anomaly  ·  github.com/arjun258/CarbonSell", {
    x: M,
    y: 6.5,
    w: 11.5,
    h: 0.35,
    fontFace: BODY,
    fontSize: 12,
    color: "8296A4",
    isTextBox: true,
    margin: 0,
  });
}

pres.writeFile({ fileName: path.join(__dirname, "CarbonSell-pitch.pptx") }).then((f) => {
  const missing = [
    "01-listing-form.png",
    "02-bid-desk.png",
    "03-matches.png",
    "04-listing-bid.png",
    "05-chat.png",
    "06-orders.png",
  ].filter((n) => !fs.existsSync(path.join(SHOTS, n)));
  console.log("wrote", f);
  if (missing.length) {
    console.log("\nplaceholders still showing, drop these into deck/shots/ and re-run:");
    missing.forEach((n) => console.log("  " + n));
  }
});
