import { NextRequest, NextResponse } from "next/server";
import snapshot from "../../../data/inventory.json";

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

type SnapshotVehicle = Vehicle & { images?: string[] };
type Snapshot = { source?: string; expected?: number | null; count?: number; fetchedAt?: string | null; vehicles?: SnapshotVehicle[] };
const bundledSnapshot = snapshot as Snapshot;

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

function titleFromListingUrl(url: string, fallback: string) {
  try {
    let slug = new URL(url).pathname.split("/").filter(Boolean).pop() || "";
    slug = slug
      .replace(/^(?:new|used|certified|pre-owned)-/i, "")
      .replace(/-[A-HJ-NPR-Z0-9]{17}$/i, "")
      .replace(/-(?:all-wheel-drive|four-wheel-drive|rear-wheel-drive|front-wheel-drive|awd|4wd|rwd|fwd)(?:-|$).*$/i, "")
      .replace(/-(?:suv|sedan|coupe|convertible|sport-utility|4-door|2-door)$/i, "");
    const pretty = slug
      .split("-")
      .filter(Boolean)
      .map((part) => {
        const p = part.toLowerCase();
        if (/^(?:19|20)\d{2}$/.test(p)) return p;
        if (p === "p400" || p === "p530" || p === "p550e" || p === "p250" || p === "p300") return p.toUpperCase();
        if (p === "se" || p === "s" || p === "hse" || p === "sv" || p === "octa") return p.toUpperCase();
        return p.charAt(0).toUpperCase() + p.slice(1);
      })
      .join(" ")
      .replace(/Land Rover/gi, "Land Rover")
      .replace(/Range Rover/gi, "Range Rover")
      .replace(/E Pace/gi, "E-PACE")
      .replace(/F Pace/gi, "F-PACE")
      .replace(/I Pace/gi, "I-PACE");
    return pretty || fallback;
  } catch {
    return fallback;
  }
}

function hydrateVehicle(v: Vehicle): Vehicle {
  const weakTitle = !v.title || /^\s*(?:19|20)\d{2}\s*$/.test(v.title);
  return { ...v, title: weakTitle ? titleFromListingUrl(v.url, v.title || v.vin) : v.title };
}

function parseReaderInventory(text: string): Vehicle[] {
  const records: Vehicle[] = [];
  const pattern = /\[([^\]]*(?:19|20)\d{2}[^\]]*)\]\((https?:\/\/[^)]+)\)\s*(?:\r?\n)+\s*(Certified Used|Used|New)\s*(?:\r?\n)+\s*([\d,]+)\s+miles?\s*(?:\r?\n)+\s*\$([\d,]+)\s*(?:\r?\n)+\s*VIN:\s*([A-HJ-NPR-Z0-9]{17})/gi;
  let m;
  while ((m = pattern.exec(text))) {
    const vin = m[6].toUpperCase();
    if (records.some((v) => v.vin === vin)) continue;
    records.push(hydrateVehicle({
      title: m[1].replace(/\s+/g, " ").trim(),
      url: normalizeUrl(m[2]),
      condition: m[3].trim(),
      mileage: num(m[4]),
      price: num(m[5]),
      vin,
      searchText: `${m[1]} ${m[3]}`.toLowerCase(),
    }));
  }
  return records;
}

function parseBudget(q: string) {
  const m = q.match(/(?:under|below|less than|max(?:imum)?|budget(?: of| is)?|up to|no more than|around|about)\s*\$?\s*([\d,.]+)\s*(k)?/i) || q.match(/\$\s*([\d,.]+)\s*(k)?\s*(?:budget|max)?/i);
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
  if (/e[- ]?pace/.test(q)) return "e-pace";
  if (/f[- ]?pace/.test(q)) return "f-pace";
  if (/\bjaguar\b/.test(q)) return "jaguar";
  if (/\brange rover\b/.test(q)) return "range rover";
  return null;
}

function searchable(v: Vehicle) {
  return `${v.title} ${v.url}`.toLowerCase().replace(/[-_/]+/g, " ");
}

function modelMatches(v: Vehicle, model: string) {
  const t = searchable(v);
  if (model === "range rover") return t.includes("range rover") && !t.includes("range rover sport") && !t.includes("velar") && !t.includes("evoque");
  if (model === "f-pace") return /\bf pace\b/.test(t);
  if (model === "e-pace") return /\be pace\b/.test(t);
  if (model === "jaguar") return t.includes("jaguar");
  return t.includes(model);
}

function wantsSevenSeats(q: string) {
  return /\bthird[ -]?row\b|\b3rd[ -]?row\b|\b7[ -]?seat(?:er|s)?\b|\bseven[ -]?seat(?:er|s)?\b|\b7 passenger\b|\bseven passenger\b/i.test(q);
}

function thirdRowFamily(v: Vehicle) {
  const t = searchable(v);
  const fullDiscovery = /\bdiscovery\b/.test(t) && !t.includes("discovery sport");
  const defender130 = t.includes("defender 130");
  const fullRange = t.includes("range rover") && !t.includes("sport") && !t.includes("velar") && !t.includes("evoque");
  return fullDiscovery || defender130 || fullRange;
}

function likelySevenSeat(v: Vehicle) {
  const t = `${searchable(v)} ${(v.features || []).join(" ")}`.toLowerCase();
  if (t.includes("defender 130")) return true;
  if (/\bdiscovery\b/.test(t) && !t.includes("discovery sport")) return true;
  if (t.includes("range rover") && !t.includes("sport") && !t.includes("velar") && !t.includes("evoque")) return /\b7[ -]?seat|seven[ -]?seat|third[ -]?row|3rd[ -]?row|7 passenger|seven passenger|\blwb\b|long wheelbase/.test(t);
  return false;
}

function requestedColor(q: string) {
  const colors = ["black", "white", "green", "blue", "red", "silver", "gray", "grey", "brown", "bronze", "gold"];
  return colors.find((c) => new RegExp(`\\b${c}\\b`, "i").test(q)) ?? null;
}

function colorMatches(v: Vehicle, color: string) {
  const hay = `${v.exterior || ""}`.toLowerCase();
  if (color === "gray" || color === "grey") return hay.includes("gray") || hay.includes("grey");
  return hay.includes(color);
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

function scoreVehicle(v: Vehicle, q: string) {
  q = q.trim().toLowerCase();
  if (!q) return 1;
  let s = 0;
  const budget = parseBudget(q);
  if (budget != null && v.price != null) {
    if (v.price <= budget) s += 100;
    else if (v.price <= budget + 10000) s += 5;
    else s -= 1000;
  }
  if (/\bnew\b/i.test(q)) s += v.condition.toLowerCase() === "new" ? 20 : -50;
  if (/used|pre[- ]?owned|certified|cpo/i.test(q)) s += v.condition.toLowerCase() !== "new" ? 20 : -50;
  if (wantsSevenSeats(q)) s += thirdRowFamily(v) ? 80 : -200;
  const color = requestedColor(q);
  if (color && v.exterior) s += colorMatches(v, color) ? 60 : -30;
  return s;
}

function fetchBundledInventory(): Vehicle[] {
  const rows = Array.isArray(bundledSnapshot.vehicles) ? bundledSnapshot.vehicles : [];
  return rows
    .filter((v) => v?.vin && v?.condition)
    .map((v) => hydrateVehicle({
      title: v.title,
      condition: v.condition,
      mileage: v.mileage ?? null,
      price: v.price ?? null,
      vin: v.vin,
      url: v.url || INVENTORY_URL,
      image: v.image ?? v.images?.[0] ?? null,
      stock: v.stock ?? null,
      exterior: v.exterior ?? null,
      interior: v.interior ?? null,
      interiorFamily: v.interiorFamily ?? null,
      features: Array.isArray(v.features) ? v.features : [],
    }));
}

async function fetchSavedInventory(): Promise<Vehicle[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  try {
    const params = new URLSearchParams({ select: "vin,title,condition,mileage,price,listing_url,image_url,stock,exterior,interior,interior_family,features", active: "eq.true", limit: "500" });
    const r = await fetch(`${url}/rest/v1/inventory_vehicles?${params}`, { cache: "no-store", headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!r.ok) return [];
    const rows: any[] = await r.json();
    return rows.map((v) => hydrateVehicle({
      title: v.title,
      condition: v.condition,
      mileage: v.mileage,
      price: v.price,
      vin: v.vin,
      url: v.listing_url,
      image: v.image_url,
      stock: v.stock,
      exterior: v.exterior,
      interior: v.interior,
      interiorFamily: v.interior_family,
      features: v.features || [],
    }));
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const condition = (request.nextUrl.searchParams.get("condition") ?? "all").toLowerCase();
  const browse = request.nextUrl.searchParams.get("browse") === "1";
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? 12) || 12;
  const limit = browse ? Math.min(Math.max(requestedLimit, 1), 250) : Math.min(Math.max(requestedLimit, 1), 18);

  try {
    const supabaseRows = await fetchSavedInventory();
    const bundledRows = fetchBundledInventory();
    let unique: Vehicle[] = [];
    let source = "";
    let texts: string[] = [];

    if (supabaseRows.length >= bundledRows.length && supabaseRows.length) {
      unique = supabaseRows;
      source = "Jon Rover saved inventory";
    } else if (bundledRows.length) {
      unique = bundledRows;
      source = "Jon Rover bundled inventory snapshot";
    } else {
      const pageCount = browse ? 12 : 3;
      const pageUrls = Array.from({ length: pageCount }, (_, i) => i === 0 ? INVENTORY_URL : `${INVENTORY_URL}?_p=${i + 1}`);
      texts = await Promise.all(pageUrls.map(async (u) => { try { return await fetchReader(u); } catch { return ""; } }));
      const parsed = texts.flatMap(parseReaderInventory);
      unique = Array.from(new Map(parsed.map((v) => [v.vin, v])).values());
      source = "Land Rover Willow Grove";
    }

    const usingDurable = source !== "Land Rover Willow Grove";
    if (!unique.length) return NextResponse.json({ error: "Willow Grove inventory could not be read right now.", vehicles: [], count: 0 }, { status: 502 });

    if (condition === "new") unique = unique.filter((v) => v.condition.toLowerCase() === "new");
    if (condition === "used") unique = unique.filter((v) => v.condition.toLowerCase() !== "new");

    let candidates = unique;
    if (wantsSevenSeats(q)) candidates = candidates.filter(thirdRowFamily);

    const model = requestedModel(q);
    if (model) candidates = candidates.filter((v) => modelMatches(v, model));

    const budget = parseBudget(q);
    if (budget != null) candidates = candidates.filter((v) => v.price != null && v.price <= budget + 10000);

    if (browse) {
      const browsed = candidates.slice(0, limit);
      const totalMatch = texts.join("\n").match(/([\d,]+)\s+vehicles found/i)?.[1];
      return NextResponse.json({
        total: usingDurable ? candidates.length : (totalMatch ? Number(totalMatch.replace(/,/g, "")) : candidates.length),
        count: browsed.length,
        query: q,
        condition,
        vehicles: browsed,
        source,
        syncMethod: usingDurable ? "durable-primary" : "reader-fallback",
        updatedAt: bundledSnapshot.fetchedAt || new Date().toISOString(),
      });
    }

    const color = requestedColor(q);
    const interior = requestedInterior(q);
    const enrichmentPoolSize = (color || interior) ? Math.min(candidates.length, 40) : Math.min(candidates.length, limit);

    let enriched = candidates
      .map((vehicle) => ({ vehicle, score: scoreVehicle(vehicle, q) }))
      .sort((a, b) => b.score - a.score || (a.vehicle.price ?? Infinity) - (b.vehicle.price ?? Infinity))
      .slice(0, enrichmentPoolSize)
      .map((x) => x.vehicle);

    if (wantsSevenSeats(q)) enriched = enriched.filter(likelySevenSeat);

    if (color) {
      const matching = enriched.filter((v) => colorMatches(v, color));
      if (matching.length >= 3) enriched = matching;
      else if (matching.length > 0) enriched = [...matching, ...enriched.filter((v) => !colorMatches(v, color))];
    }

    if (interior) {
      const matching = enriched.filter((v) => interiorMatches(v, interior));
      if (matching.length >= 3) enriched = matching;
      else if (matching.length > 0) enriched = [...matching, ...enriched.filter((v) => !interiorMatches(v, interior))];
    }

    enriched = enriched.slice(0, limit);
    const totalMatch = texts.join("\n").match(/([\d,]+)\s+vehicles found/i)?.[1];

    return NextResponse.json({
      total: usingDurable ? candidates.length : (totalMatch ? Number(totalMatch.replace(/,/g, "")) : candidates.length),
      count: enriched.length,
      query: q,
      condition,
      vehicles: enriched,
      source,
      syncMethod: usingDurable ? "durable-primary" : "reader-fallback",
      updatedAt: bundledSnapshot.fetchedAt || new Date().toISOString(),
    });
  } catch (e) {
    console.error("Inventory route failed", e);
    return NextResponse.json({ error: "Live inventory is temporarily unavailable." }, { status: 502 });
  }
}
