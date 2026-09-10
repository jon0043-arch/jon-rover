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
  const response = await fetch(readerUrl(target), {
    cache: "no-store",
    headers: { Accept: "text/plain" },
  });
  if (!response.ok) throw new Error(`Reader returned ${response.status}`);
  return response.text();
}

function parseReaderInventory(text: string): Vehicle[] {
  const records: Vehicle[] = [];
  const pattern = /\[([^\]]*(?:19|20)\d{2}[^\]]*)\]\((https?:\/\/[^)]+)\)\s*(?:\r?\n)+\s*(Certified Used|Used|New)\s*(?:\r?\n)+\s*([\d,]+)\s+miles?\s*(?:\r?\n)+\s*\$([\d,]+)\s*(?:\r?\n)+\s*VIN:\s*([A-HJ-NPR-Z0-9]{17})/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const vin = match[6].toUpperCase();
    if (records.some((v) => v.vin === vin)) continue;
    records.push({
      title: match[1].replace(/\s+/g, " ").trim(),
      url: normalizeUrl(match[2]),
      condition: match[3].trim(),
      mileage: num(match[4]),
      price: num(match[5]),
      vin,
    });
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
  return (/\bdiscovery\b/.test(t) && !t.includes("discovery sport")) || t.includes("defender 130") || (t.includes("range rover") && !t.includes("sport") && !t.includes("velar") && !t.includes("evoque"));
}

function scoreVehicle(vehicle: Vehicle, query: string) {
  const q = query.toLowerCase();
  let score = 0;
  const budget = parseBudget(q);
  if (budget != null && vehicle.price != null) {
    if (vehicle.price <= budget) score += 100;
    else if (vehicle.price <= budget + 10000) score += 5;
    else score -= 1000;
  }
  if (/\bnew\b/.test(q)) score += vehicle.condition.toLowerCase() === "new" ? 30 : -100;
  if (/used|pre[- ]?owned|certified|cpo/.test(q)) score += vehicle.condition.toLowerCase() !== "new" ? 30 : -100;
  if (wantsSevenSeats(q)) score += thirdRowFamily(vehicle) ? 80 : -500;
  return score;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const condition = (request.nextUrl.searchParams.get("condition") ?? "all").toLowerCase();
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 12) || 12, 1), 18);

  try {
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

    let candidates = unique;
    if (q.trim()) {
      if (wantsSevenSeats(q)) candidates = candidates.filter(thirdRowFamily);
      const model = requestedModel(q);
      if (model) {
        const exact = candidates.filter((v) => modelMatches(v, model));
        if (exact.length) candidates = exact;
      }
      const budget = parseBudget(q);
      if (budget != null) candidates = candidates.filter((v) => v.price != null && v.price <= budget + 10000);
      candidates = candidates
        .map((vehicle) => ({ vehicle, score: scoreVehicle(vehicle, q) }))
        .sort((a, b) => b.score - a.score || (a.vehicle.price ?? Infinity) - (b.vehicle.price ?? Infinity))
        .map(({ vehicle }) => vehicle);
    }

    const vehicles = candidates.slice(0, limit);
    return NextResponse.json({
      total,
      count: vehicles.length,
      query: q,
      condition,
      vehicles,
      source: "Land Rover Willow Grove",
      syncMethod: "fast-index-only",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Inventory route failed", error);
    return NextResponse.json({ error: "Live inventory is temporarily unavailable." }, { status: 502 });
  }
}
