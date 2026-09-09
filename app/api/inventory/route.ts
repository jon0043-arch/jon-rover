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
  relevanceScore?: number;
};

type Intent = {
  model: string | null;
  condition: "new" | "used" | null;
  budget: number | null;
  sevenSeats: boolean;
  exterior: string | null;
  interior: string | null;
  wantsLarge: boolean;
  wantsCompact: boolean;
  sporty: boolean;
  family: boolean;
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
async function fetchReader(target: string) {
  const r = await fetch(readerUrl(target), { cache: "no-store", headers: { Accept: "text/plain" } });
  if (!r.ok) throw new Error(`Reader returned ${r.status}`);
  return r.text();
}

function parseReaderInventory(text: string): Vehicle[] {
  const records: Vehicle[] = [];
  const pattern = /\[([^\]]*(?:19|20)\d{2}[^\]]*)\]\((https?:\/\/[^)]+)\)\s*(?:\r?\n)+\s*(Certified Used|Used|New)\s*(?:\r?\n)+\s*([\d,]+)\s+miles?\s*(?:\r?\n)+\s*\$([\d,]+)\s*(?:\r?\n)+\s*VIN:\s*([A-HJ-NPR-Z0-9]{17})/gi;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text))) {
    const vin = m[6].toUpperCase();
    if (records.some((v) => v.vin === vin)) continue;
    const title = m[1].replace(/\s+/g, " ").trim();
    records.push({
      title,
      url: normalizeUrl(m[2]),
      condition: m[3].trim(),
      mileage: num(m[4]),
      price: num(m[5]),
      vin,
      searchText: `${title} ${m[3]}`.toLowerCase(),
    });
  }
  return records;
}

function parseBudget(q: string) {
  const m =
    q.match(/(?:under|below|less than|max(?:imum)?|budget(?: of| is)?|up to|no more than|around|about)\s*\$?\s*([\d,.]+)\s*(k)?/i) ||
    q.match(/\$\s*([\d,.]+)\s*(k)?\s*(?:budget|max)?/i);
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
function requestedColor(q: string) {
  const colors = ["black", "white", "green", "blue", "red", "silver", "gray", "grey", "brown", "bronze", "gold"];
  return colors.find((c) => new RegExp(`\\b${c}\\b`, "i").test(q)) ?? null;
}
function requestedInterior(q: string) {
  const s = q.toLowerCase();
  if (/caraway|tan interior|tan seats|beige interior|camel interior/.test(s)) return "tan";
  if (/light cloud|off[- ]?white interior|ivory interior|cream interior/.test(s)) return "off-white";
  if (/ebony|black interior|black seats/.test(s)) return "black";
  if (/deep garnet|red wine interior|wine interior|burgundy interior|garnet interior/.test(s)) return "red-wine";
  return null;
}
function parseIntent(q: string): Intent {
  return {
    model: requestedModel(q),
    condition: /\bnew\b/i.test(q) ? "new" : /used|pre[- ]?owned|certified|cpo/i.test(q) ? "used" : null,
    budget: parseBudget(q),
    sevenSeats: /\bthird[ -]?row\b|\b3rd[ -]?row\b|\b7[ -]?seat(?:er|s)?\b|\bseven[ -]?seat(?:er|s)?\b|\b7 passenger\b|\bseven passenger\b/i.test(q),
    exterior: requestedColor(q),
    interior: requestedInterior(q),
    wantsLarge: /\bbig\b|full[- ]?size|largest|roomy|lots of room|spacious/i.test(q),
    wantsCompact: /not too (?:big|huge)|smaller|compact|easy to park/i.test(q),
    sporty: /sporty|performance|fun to drive|quick|fast/i.test(q),
    family: /kids?|family|car seats?|children/i.test(q),
  };
}
function modelMatches(v: Vehicle, model: string) {
  const t = v.title.toLowerCase();
  if (model === "range rover") return t.includes("range rover") && !t.includes("sport") && !t.includes("velar") && !t.includes("evoque");
  if (model === "f-pace") return t.includes("f-pace") || t.includes("f pace");
  if (model === "jaguar") return t.includes("jaguar");
  return t.includes(model);
}
function thirdRowFamily(v: Vehicle) {
  const t = v.title.toLowerCase();
  return (/\bdiscovery\b/.test(t) && !t.includes("discovery sport")) || t.includes("defender 130") || (t.includes("range rover") && !t.includes("sport") && !t.includes("velar") && !t.includes("evoque"));
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
function colorMatches(v: Vehicle, color: string) {
  const hay = `${v.exterior || ""} ${v.title}`.toLowerCase();
  if (color === "gray" || color === "grey") return hay.includes("gray") || hay.includes("grey");
  return hay.includes(color);
}
function interiorMatches(v: Vehicle, family: string) {
  return v.interiorFamily === family;
}
function likelySevenSeat(v: Vehicle) {
  const t = `${v.title} ${(v.features || []).join(" ")}`.toLowerCase();
  if (t.includes("defender 130")) return true;
  if (/\bdiscovery\b/.test(t) && !t.includes("discovery sport")) return true;
  if (t.includes("range rover") && !t.includes("sport") && !t.includes("velar") && !t.includes("evoque")) {
    return /\b7[ -]?seat|seven[ -]?seat|third[ -]?row|3rd[ -]?row|7 passenger|seven passenger|\blwb\b|long wheelbase/.test(t);
  }
  return false;
}

async function enrichVehicle(v: Vehicle): Promise<Vehicle> {
  try {
    const text = await fetchReader(v.url);
    const image = text.match(/!\[[^\]]*\]\((https?:\/\/[^)]+\.(?:jpg|jpeg|png|webp)(?:\?[^)]*)?)\)/i)?.[1] ?? null;
    const stock = text.match(/Stock(?: Number| #|:)?\s*[:#]?\s*([A-Z0-9-]{4,})/i)?.[1] ?? null;
    const exterior = text.match(/Exterior(?: Color)?\s*[:|]\s*([^\n|]{2,80})/i)?.[1]?.trim() ?? null;
    const interior = text.match(/Interior(?: Color)?\s*[:|]\s*([^\n|]{2,80})/i)?.[1]?.trim() ?? text.match(/Interior\s*[:\-]\s*([^\n]{2,80})/i)?.[1]?.trim() ?? null;
    const interiorFamily = normalizeInteriorFamily(interior);
    const features = Array.from(new Set([...text.matchAll(/(?:Feature|Equipment|Package)\s*[:|]\s*([^\n|]{3,80})/gi)].map((m) => m[1].trim()).filter(Boolean))).slice(0, 8);
    return { ...v, image, stock, exterior, interior, interiorFamily, features };
  } catch {
    return v;
  }
}

function scoreVehicle(v: Vehicle, intent: Intent) {
  const t = v.title.toLowerCase();
  let score = 0;

  if (intent.model) score += modelMatches(v, intent.model) ? 500 : -1000;
  if (intent.condition) score += (intent.condition === "new") === (v.condition.toLowerCase() === "new") ? 300 : -1000;
  if (intent.sevenSeats) score += likelySevenSeat(v) ? 400 : -1000;

  if (intent.budget != null && v.price != null) {
    if (v.price <= intent.budget) {
      score += 250;
      score += Math.max(0, 50 - Math.floor((intent.budget - v.price) / 2000));
    } else if (v.price <= intent.budget + 10000) {
      score += 40 - Math.floor((v.price - intent.budget) / 1000) * 3;
    } else score -= 1000;
  }

  if (intent.exterior) score += colorMatches(v, intent.exterior) ? 180 : -60;
  if (intent.interior) score += interiorMatches(v, intent.interior) ? 140 : -40;

  if (intent.wantsLarge) {
    if ((t.includes("range rover") && !t.includes("sport") && !t.includes("velar") && !t.includes("evoque")) || t.includes("defender 130") || (/\bdiscovery\b/.test(t) && !t.includes("discovery sport"))) score += 90;
    if (t.includes("evoque") || t.includes("discovery sport")) score -= 70;
  }
  if (intent.wantsCompact) {
    if (t.includes("evoque") || t.includes("velar") || t.includes("f-pace")) score += 70;
    if (t.includes("defender 130")) score -= 100;
  }
  if (intent.sporty) {
    if (t.includes("range rover sport") || t.includes("f-pace")) score += 90;
    else if (t.includes("velar")) score += 50;
  }
  if (intent.family) {
    if (t.includes("defender 110") || t.includes("defender 130") || (/\bdiscovery\b/.test(t) && !t.includes("discovery sport")) || t.includes("range rover sport")) score += 60;
  }

  if (v.condition.toLowerCase() !== "new" && v.mileage != null) score += Math.max(0, 30 - Math.floor(v.mileage / 10000) * 4);
  return score;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const conditionTab = (request.nextUrl.searchParams.get("condition") ?? "all").toLowerCase();
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 12) || 12, 1), 18);
  const intent = parseIntent(q);

  try {
    const pageUrls = [INVENTORY_URL, `${INVENTORY_URL}?_p=2`, `${INVENTORY_URL}?_p=3`];
    const texts = await Promise.all(pageUrls.map(async (u) => { try { return await fetchReader(u); } catch { return ""; } }));
    const parsed = texts.flatMap(parseReaderInventory);
    let unique = Array.from(new Map(parsed.map((v) => [v.vin, v])).values());
    if (!unique.length) return NextResponse.json({ error: "Willow Grove inventory could not be read right now.", vehicles: [], count: 0 }, { status: 502 });

    if (conditionTab === "new") unique = unique.filter((v) => v.condition.toLowerCase() === "new");
    if (conditionTab === "used") unique = unique.filter((v) => v.condition.toLowerCase() !== "new");

    let candidates = unique;

    // HARD constraints: do not silently substitute a different model/condition/seating setup.
    if (intent.condition) candidates = candidates.filter((v) => (intent.condition === "new") === (v.condition.toLowerCase() === "new"));
    if (intent.sevenSeats) candidates = candidates.filter(thirdRowFamily);
    if (intent.model) candidates = candidates.filter((v) => modelMatches(v, intent.model!));
    if (intent.budget != null) candidates = candidates.filter((v) => v.price != null && v.price <= intent.budget! + 10000);

    if (!candidates.length) {
      return NextResponse.json({ total: unique.length, count: 0, query: q, condition: conditionTab, vehicles: [], intent, noStrongMatch: true, updatedAt: new Date().toISOString() });
    }

    // Detail-page fields like exterior/interior/seating must be known before final ranking.
    const needDetails = Boolean(intent.exterior || intent.interior || intent.sevenSeats);
    const preRanked = candidates
      .map((vehicle) => ({ vehicle, score: scoreVehicle(vehicle, { ...intent, exterior: null, interior: null }) }))
      .sort((a, b) => b.score - a.score || (a.vehicle.price ?? Infinity) - (b.vehicle.price ?? Infinity));

    const detailPoolSize = needDetails ? Math.min(preRanked.length, 75) : Math.min(preRanked.length, 30);
    let enriched = await Promise.all(preRanked.slice(0, detailPoolSize).map(({ vehicle }) => enrichVehicle(vehicle)));

    if (intent.sevenSeats) enriched = enriched.filter(likelySevenSeat);

    const exactExterior = intent.exterior ? enriched.filter((v) => colorMatches(v, intent.exterior!)) : [];
    const exactInterior = intent.interior ? enriched.filter((v) => interiorMatches(v, intent.interior!)) : [];

    enriched = enriched
      .map((vehicle) => ({ ...vehicle, relevanceScore: scoreVehicle(vehicle, intent) }))
      .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0) || (a.price ?? Infinity) - (b.price ?? Infinity));

    // Sticky colors: if enough exact-color options exist, do not dilute with other colors.
    if (intent.exterior && exactExterior.length >= 3) enriched = enriched.filter((v) => colorMatches(v, intent.exterior!));
    else if (intent.exterior && exactExterior.length > 0) enriched = [...enriched.filter((v) => colorMatches(v, intent.exterior!)), ...enriched.filter((v) => !colorMatches(v, intent.exterior!))];

    if (intent.interior && exactInterior.length >= 3) enriched = enriched.filter((v) => interiorMatches(v, intent.interior!));
    else if (intent.interior && exactInterior.length > 0) enriched = [...enriched.filter((v) => interiorMatches(v, intent.interior!)), ...enriched.filter((v) => !interiorMatches(v, intent.interior!))];

    const finalVehicles = enriched.slice(0, limit);
    const totalMatch = texts.join("\n").match(/([\d,]+)\s+vehicles found/i)?.[1];

    return NextResponse.json({
      total: totalMatch ? Number(totalMatch.replace(/,/g, "")) : unique.length,
      count: finalVehicles.length,
      query: q,
      condition: conditionTab,
      intent,
      vehicles: finalVehicles,
      source: "Land Rover Willow Grove",
      syncMethod: "constraint-first-relevance",
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Inventory route failed", e);
    return NextResponse.json({ error: "Live inventory is temporarily unavailable." }, { status: 502 });
  }
}
