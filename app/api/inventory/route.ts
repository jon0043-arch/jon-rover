import { NextRequest, NextResponse } from "next/server";

const DEALER_BASE = "https://www.landroverwillowgrove.com";
const INVENTORY_URL = `${DEALER_BASE}/llm/inventory/`;
const READER_PREFIX = "https://r.jina.ai/https://";

type Vehicle = {
  title: string;
  condition: string;
  mileage: number | null;
  price: number | null;
  vin: string;
  url: string;
  image?: string | null;
  stock?: string | null;
  exterior?: string | null;
  interior?: string | null;
  interiorFamily?: string | null;
  features?: string[];
  searchText?: string;
};

function num(value?: string | null) {
  if (!value) return null;
  const n = Number(value.replace(/[^0-9]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function normalizeUrl(value?: string | null) {
  if (!value) return INVENTORY_URL;
  if (value.startsWith("http")) return value;
  return `${DEALER_BASE}${value.startsWith("/") ? value : `/${value}`}`;
}

function readerUrl(target: string) {
  return `${READER_PREFIX}${target.replace(/^https:\/\//, "")}`;
}

// Main inventory pages are deliberately allowed to finish normally.
// These are the critical source pages, so we do not abort them early.
async function fetchReader(target: string) {
  const response = await fetch(readerUrl(target), {
    cache: "no-store",
    headers: { Accept: "text/plain" },
  });
  if (!response.ok) throw new Error(`Reader returned ${response.status}`);
  return response.text();
}

// Detail pages are optional enrichment only. If one is slow, return the base
// vehicle instead of letting one detail page stall the entire inventory search.
async function fetchDetailReader(target: string, timeoutMs = 2800) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(readerUrl(target), {
      cache: "no-store",
      headers: { Accept: "text/plain" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Reader returned ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseReaderInventory(text: string): Vehicle[] {
  const records: Vehicle[] = [];
  const pattern = /\[([^\]]*(?:19|20)\d{2}[^\]]*)\]\((https?:\/\/[^)]+)\)\s*(?:\r?\n)+\s*(Certified Used|Used|New)\s*(?:\r?\n)+\s*([\d,]+)\s+miles?\s*(?:\r?\n)+\s*\$([\d,]+)\s*(?:\r?\n)+\s*VIN:\s*([A-HJ-NPR-Z0-9]{17})/gi;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const title = match[1].replace(/\s+/g, " ").trim();
    const url = normalizeUrl(match[2]);
    const condition = match[3].trim();
    const mileage = num(match[4]);
    const price = num(match[5]);
    const vin = match[6].toUpperCase();
    if (records.some((v) => v.vin === vin)) continue;
    records.push({ title, condition, mileage, price, vin, url, searchText: `${title} ${condition}`.toLowerCase() });
  }
  return records;
}

function parseBudget(query: string) {
  const m = query.match(/(?:under|below|less than|max(?:imum)?|budget(?: of| is)?|up to|no more than|around|about)\s*\$?\s*([\d,.]+)\s*(k)?/i)
    || query.match(/\$\s*([\d,.]+)\s*(k)?\s*(?:budget|max)?/i);
  if (!m) return null;
  let n = Number(m[1].replace(/,/g, ""));
  if (m[2]) n *= 1000;
  return Number.isFinite(n) ? n : null;
}

function requestedModel(query: string) {
  const q = query.toLowerCase();
  if (/range rover sport/.test(q)) return "range rover sport";
  if (/range rover velar|\bvelar\b/.test(q)) return "velar";
  if (/range rover evoque|\bevoque\b/.test(q)) return "evoque";
  if (/defender 130/.test(q)) return "defender 130";
  if (/defender 110/.test(q)) return "defender 110";
  if (/defender 90/.test(q)) return "defender 90";
  if (/\bdefender\b/.test(q)) return "defender";
  if (/discovery sport/.test(q)) return "discovery sport";
  if (/\bdiscovery\b/.test(q)) return "discovery";
  if (/f[- ]?pace/.test(q)) return "f-pace";
  if (/\bjaguar\b/.test(q)) return "jaguar";
  if (/\brange rover\b/.test(q)) return "range rover";
  return null;
}

function modelMatches(vehicle: Vehicle, model: string) {
  const t = vehicle.title.toLowerCase();
  if (model === "range rover") return t.includes("range rover") && !t.includes("sport") && !t.includes("velar") && !t.includes("evoque");
  if (model === "f-pace") return t.includes("f-pace") || t.includes("f pace");
  if (model === "jaguar") return t.includes("jaguar");
  return t.includes(model);
}

function wantsSevenSeats(q: string) {
  return /\bthird[ -]?row\b|\b3rd[ -]?row\b|\b7[ -]?seat(?:er|s)?\b|\bseven[ -]?seat(?:er|s)?\b|\b7 passenger\b|\bseven passenger\b/i.test(q);
}

function thirdRowFamily(v: Vehicle) {
  const t = v.title.toLowerCase();
  const fullDiscovery = /\bdiscovery\b/.test(t) && !t.includes("discovery sport");
  const defender130 = t.includes("defender 130");
  const fullRange = t.includes("range rover") && !t.includes("sport") && !t.includes("velar") && !t.includes("evoque");
  return fullDiscovery || defender130 || fullRange;
}

function requestedColor(q: string) {
  const colors = ["black", "white", "green", "blue", "red", "silver", "gray", "grey", "brown", "bronze", "gold"];
  return colors.find((c) => new RegExp(`\\b${c}\\b`, "i").test(q)) ?? null;
}

function colorMatches(v: Vehicle, color: string) {
  const hay = `${v.exterior || ""} ${v.title}`.toLowerCase();
  if (color === "gray" || color === "grey") return hay.includes("gray") || hay.includes("grey");
  return hay.includes(color);
}

function normalizeInteriorFamily(value?: string | null) {
  const x = (value || "").toLowerCase();
  if (!x) return null;
  if (x.includes("caraway")) return "tan";
  if (x.includes("light cloud")) return "off-white";
  if (x.includes("ebony")) return "black";
  if (x.includes("deep garnet")) return "red-wine";
  if (/tan|beige|camel|caramel/.test(x)) return "tan";
  if (/off[- ]?white|ivory|cream/.test(x)) return "off-white";
  if (/black/.test(x)) return "black";
  if (/burgundy|wine|garnet|oxblood/.test(x)) return "red-wine";
  return value?.trim() || null;
}

function requestedInterior(q: string) {
  const s = q.toLowerCase();
  if (/caraway|tan interior|tan seats|beige interior|camel interior/.test(s)) return "tan";
  if (/light cloud|off[- ]?white interior|ivory interior|cream interior/.test(s)) return "off-white";
  if (/ebony|black interior|black seats/.test(s)) return "black";
  if (/deep garnet|red wine interior|wine interior|burgundy interior|garnet interior/.test(s)) return "red-wine";
  return null;
}

function interiorMatches(v: Vehicle, family: string) {
  return v.interiorFamily === family;
}

function scoreVehicle(vehicle: Vehicle, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  const hay = `${vehicle.title} ${vehicle.condition}`.toLowerCase();
  let score = 0;
  const budget = parseBudget(q);

  if (budget != null && vehicle.price != null) {
    if (vehicle.price <= budget) score += 100;
    else if (vehicle.price <= budget + 10000) score += 5;
    else score -= 1000;
  }

  if (/\bnew\b/i.test(q)) score += vehicle.condition.toLowerCase() === "new" ? 30 : -100;
  if (/used|pre[- ]?owned|certified|cpo/i.test(q)) score += vehicle.condition.toLowerCase() !== "new" ? 30 : -100;
  if (wantsSevenSeats(q)) score += thirdRowFamily(vehicle) ? 80 : -500;

  const lifestyle: Array<[RegExp, Record<string, number>]> = [
    [/sporty|performance|fun to drive|quick|fast/i, { "range rover sport": 10, "f-pace": 10, velar: 6, evoque: 4, defender: 2 }],
    [/kids?|family|car seats?/i, { "defender 110": 8, "defender 130": 10, discovery: 10, "range rover sport": 6, "f-pace": 4 }],
    [/not too (?:big|huge)|don'?t want .*?(?:big|huge)|smaller|compact|easy to park/i, { evoque: 10, velar: 9, "f-pace": 8, "range rover sport": 4, "defender 130": -12, discovery: -5 }],
    [/luxury|comfortable|premium|quiet/i, { "range rover": 12, "range rover sport": 8, velar: 7, "f-pace": 6 }],
    [/off[- ]?road|rugged|camping|outdoors|adventure/i, { defender: 12, discovery: 6 }],
  ];

  for (const [rule, weights] of lifestyle) {
    if (!rule.test(q)) continue;
    for (const [token, points] of Object.entries(weights)) if (hay.includes(token)) score += points;
  }
  return score;
}

async function enrichVehicle(vehicle: Vehicle): Promise<Vehicle> {
  try {
    const text = await fetchDetailReader(vehicle.url);
    const image = text.match(/!\[[^\]]*\]\((https?:\/\/[^)]+\.(?:jpg|jpeg|png|webp)(?:\?[^)]*)?)\)/i)?.[1] ?? null;
    const stock = text.match(/Stock(?: Number| #|:)?\s*[:#]?\s*([A-Z0-9-]{4,})/i)?.[1] ?? null;
    const exterior = text.match(/Exterior(?: Color)?\s*[:|]\s*([^\n|]{2,80})/i)?.[1]?.trim() ?? null;
    const interior = text.match(/Interior(?: Color)?\s*[:|]\s*([^\n|]{2,80})/i)?.[1]?.trim()
      ?? text.match(/Interior\s*[:\-]\s*([^\n]{2,80})/i)?.[1]?.trim()
      ?? null;
    const interiorFamily = normalizeInteriorFamily(interior);
    return { ...vehicle, image, stock, exterior, interior, interiorFamily };
  } catch {
    return vehicle;
  }
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const condition = (request.nextUrl.searchParams.get("condition") ?? "all").toLowerCase();
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 12) || 12, 1), 18);

  try {
    // This is the stable core: read the inventory index only once per page and
    // parse each vehicle record as one unit so price/miles/VIN never drift.
    const pageUrls = [INVENTORY_URL, `${INVENTORY_URL}?_p=2`, `${INVENTORY_URL}?_p=3`];
    const texts = await Promise.all(pageUrls.map(async (url) => {
      try { return await fetchReader(url); } catch { return ""; }
    }));

    const parsed = texts.flatMap(parseReaderInventory);
    let unique = Array.from(new Map(parsed.map((v) => [v.vin, v])).values());

    if (!unique.length) {
      return NextResponse.json({ error: "Willow Grove inventory could not be read right now.", vehicles: [], count: 0 }, { status: 502 });
    }

    if (condition === "new") unique = unique.filter((v) => v.condition.toLowerCase() === "new");
    if (condition === "used") unique = unique.filter((v) => v.condition.toLowerCase() !== "new");

    const totalMatch = texts.join("\n").match(/([\d,]+)\s+vehicles found/i)?.[1];
    const total = totalMatch ? Number(totalMatch.replace(/,/g, "")) : unique.length;

    // Browsing inventory should never wait on dozens of vehicle detail pages.
    if (!q.trim()) {
      return NextResponse.json({ total, count: Math.min(limit, unique.length), query: q, condition, vehicles: unique.slice(0, limit), source: "Land Rover Willow Grove", syncMethod: "stable-fast-list", updatedAt: new Date().toISOString() });
    }

    let candidates = unique;
    if (wantsSevenSeats(q)) candidates = candidates.filter(thirdRowFamily);

    const model = requestedModel(q);
    if (model) {
      const modelOnly = candidates.filter((v) => modelMatches(v, model));
      if (modelOnly.length) candidates = modelOnly;
    }

    const budget = parseBudget(q);
    if (budget != null) candidates = candidates.filter((v) => v.price != null && v.price <= budget + 10000);

    let ranked = candidates
      .map((vehicle) => ({ vehicle, score: scoreVehicle(vehicle, q) }))
      .sort((a, b) => b.score - a.score || (a.vehicle.price ?? Infinity) - (b.vehicle.price ?? Infinity))
      .map(({ vehicle }) => vehicle);

    // Only enrich a small, already-relevant shortlist. Detail data improves
    // color/interior matching, but failure here can no longer break inventory.
    const color = requestedColor(q);
    const interior = requestedInterior(q);
    const enrichCount = (color || interior) ? Math.min(ranked.length, 12) : Math.min(ranked.length, 8);
    const enriched = await Promise.all(ranked.slice(0, enrichCount).map(enrichVehicle));

    let ordered = enriched;
    if (color) {
      const matches = ordered.filter((v) => colorMatches(v, color));
      if (matches.length) ordered = [...matches, ...ordered.filter((v) => !colorMatches(v, color))];
    }
    if (interior) {
      const matches = ordered.filter((v) => interiorMatches(v, interior));
      if (matches.length) ordered = [...matches, ...ordered.filter((v) => !interiorMatches(v, interior))];
    }

    return NextResponse.json({
      total,
      count: Math.min(limit, ordered.length),
      query: q,
      condition,
      vehicles: ordered.slice(0, limit),
      source: "Land Rover Willow Grove",
      syncMethod: "stable-list-limited-detail-enrichment",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Inventory route failed", error);
    return NextResponse.json({ error: "Live inventory is temporarily unavailable." }, { status: 502 });
  }
}
