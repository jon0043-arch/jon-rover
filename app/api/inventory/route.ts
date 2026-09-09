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
  features?: string[];
  searchText?: string;
};

function moneyToNumber(value?: string | null) {
  if (!value) return null;
  const n = Number(value.replace(/[^0-9]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function mileageToNumber(value?: string | null) {
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
  const vinRegex = /VIN:\s*([A-HJ-NPR-Z0-9]{17})/gi;
  let match: RegExpExecArray | null;

  while ((match = vinRegex.exec(text))) {
    const vin = match[1].toUpperCase();
    if (records.some((v) => v.vin === vin)) continue;

    const start = Math.max(0, match.index - 1200);
    const end = Math.min(text.length, match.index + 900);
    const block = text.slice(start, end);

    const titleLinks = [...block.matchAll(/\[([^\]]*(?:19|20)\d{2}[^\]]*)\]\((https?:\/\/[^)]+)\)/gi)];
    const titleLink = titleLinks.at(-1);
    if (!titleLink) continue;

    const title = titleLink[1].replace(/\s+/g, " ").trim();
    if (!/\b(?:19|20)\d{2}\b/.test(title)) continue;

    const condition = block.match(/\b(Certified Used|Used|New)\b/i)?.[1] ?? "";
    const mileage = mileageToNumber(block.match(/([\d,]+)\s+miles?/i)?.[1]);
    const price = moneyToNumber(block.match(/\$([\d,]+)/)?.[1]);

    records.push({
      title,
      condition,
      mileage,
      price,
      vin,
      url: normalizeUrl(titleLink[2]),
      searchText: block.toLowerCase(),
    });
  }

  return records;
}

function parseBudget(query: string) {
  const m = query.match(/(?:under|below|less than|max(?:imum)?|up to|no more than)\s*\$?\s*([\d,.]+)\s*(k)?/i);
  if (!m) return null;
  let n = Number(m[1].replace(/,/g, ""));
  if (m[2]) n *= 1000;
  return Number.isFinite(n) ? n : null;
}

function scoreVehicle(vehicle: Vehicle, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return 1;

  const hay = `${vehicle.title} ${vehicle.condition} ${vehicle.searchText ?? ""}`.toLowerCase();
  let score = 0;

  const budget = parseBudget(q);
  if (budget != null && vehicle.price != null) {
    score += vehicle.price <= budget ? 20 : vehicle.price - budget <= 5000 ? 2 : -20;
  }

  const modelRules: Array<[RegExp, string]> = [
    [/range rover sport/i, "range rover sport"],
    [/defender 130/i, "defender 130"],
    [/defender 110/i, "defender 110"],
    [/defender 90/i, "defender 90"],
    [/velar/i, "velar"],
    [/evoque/i, "evoque"],
    [/discovery sport/i, "discovery sport"],
    [/\bdiscovery\b/i, "discovery"],
    [/f[- ]?pace/i, "f-pace"],
    [/\bjaguar\b/i, "jaguar"],
    [/\bdefender\b/i, "defender"],
    [/\brange rover\b/i, "range rover"],
  ];

  for (const [rule, token] of modelRules) {
    if (!rule.test(q)) continue;
    if (token === "range rover") {
      score += hay.includes("range rover") && !hay.includes("sport") && !hay.includes("velar") && !hay.includes("evoque") ? 30 : -12;
    } else if (token === "f-pace") {
      score += hay.includes("f-pace") || hay.includes("f pace") ? 30 : -12;
    } else {
      score += hay.includes(token) ? 30 : -12;
    }
    break;
  }

  if (/\bnew\b/i.test(q)) score += vehicle.condition.toLowerCase() === "new" ? 8 : -8;
  if (/used|pre[- ]?owned|certified|cpo/i.test(q)) score += vehicle.condition.toLowerCase() !== "new" ? 8 : -8;

  const lifestyle: Array<[RegExp, Record<string, number>]> = [
    [/sporty|performance|fun to drive|quick|fast/i, { "range rover sport": 10, "f-pace": 10, velar: 6, evoque: 4, defender: 2 }],
    [/kids?|family|car seats?/i, { "defender 110": 8, "defender 130": 10, discovery: 10, "range rover sport": 6, "f-pace": 4 }],
    [/not too (?:big|huge)|don'?t want .*?(?:big|huge)|smaller|compact|easy to park/i, { evoque: 10, velar: 9, "f-pace": 8, "range rover sport": 4, "defender 130": -12, discovery: -5 }],
    [/luxury|comfortable|premium|quiet/i, { "range rover": 12, "range rover sport": 8, velar: 7, "f-pace": 6 }],
    [/off[- ]?road|rugged|camping|outdoors|adventure/i, { defender: 12, discovery: 6 }],
  ];

  for (const [rule, weights] of lifestyle) {
    if (!rule.test(q)) continue;
    for (const [token, points] of Object.entries(weights)) {
      if (hay.includes(token)) score += points;
    }
  }

  const colors = ["black", "white", "green", "blue", "red", "silver", "gray", "grey", "brown", "bronze", "gold"];
  for (const color of colors) {
    if (new RegExp(`\\b${color}\\b`, "i").test(q) && hay.includes(color)) score += 6;
  }

  return score;
}

async function enrichVehicle(vehicle: Vehicle): Promise<Vehicle> {
  try {
    const text = await fetchReader(vehicle.url);
    const image = text.match(/!\[[^\]]*\]\((https?:\/\/[^)]+\.(?:jpg|jpeg|png|webp)(?:\?[^)]*)?)\)/i)?.[1] ?? null;
    const stock = text.match(/Stock(?: Number| #|:)?\s*[:#]?\s*([A-Z0-9-]{4,})/i)?.[1] ?? null;
    const exterior = text.match(/Exterior(?: Color)?\s*[:|]\s*([^\n|]{2,60})/i)?.[1]?.trim() ?? null;

    const features = Array.from(new Set(
      [...text.matchAll(/(?:Feature|Equipment|Package)\s*[:|]\s*([^\n|]{3,80})/gi)]
        .map((m) => m[1].trim())
        .filter(Boolean)
    )).slice(0, 8);

    return { ...vehicle, image, stock, exterior, features };
  } catch {
    return vehicle;
  }
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const condition = (request.nextUrl.searchParams.get("condition") ?? "all").toLowerCase();
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 12) || 12, 1), 18);

  try {
    const pageUrls = [
      INVENTORY_URL,
      `${INVENTORY_URL}?page=2`,
      `${INVENTORY_URL}?page=3`,
    ];

    const texts = await Promise.all(
      pageUrls.map(async (url) => {
        try {
          return await fetchReader(url);
        } catch {
          return "";
        }
      })
    );

    const parsed = texts.flatMap(parseReaderInventory);
    const unique = Array.from(new Map(parsed.map((v) => [v.vin, v])).values());

    if (unique.length === 0) {
      return NextResponse.json(
        { error: "Willow Grove inventory could not be read right now.", vehicles: [], count: 0 },
        { status: 502 }
      );
    }

    let filtered = unique;
    if (condition === "new") filtered = filtered.filter((v) => v.condition.toLowerCase() === "new");
    if (condition === "used") filtered = filtered.filter((v) => v.condition.toLowerCase() !== "new");

    const ranked = filtered
      .map((vehicle) => ({ vehicle, score: scoreVehicle(vehicle, q) }))
      .sort((a, b) => b.score - a.score || (a.vehicle.price ?? Infinity) - (b.vehicle.price ?? Infinity))
      .slice(0, limit)
      .map(({ vehicle }) => vehicle);

    const enriched = await Promise.all(ranked.map(enrichVehicle));

    const totalMatch = texts.join("\n").match(/([\d,]+)\s+vehicles found/i)?.[1];
    const total = totalMatch ? Number(totalMatch.replace(/,/g, "")) : unique.length;

    return NextResponse.json({
      total,
      count: enriched.length,
      query: q,
      condition,
      vehicles: enriched,
      source: "Land Rover Willow Grove",
      syncMethod: "reader",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Inventory route failed", error);
    return NextResponse.json({ error: "Live inventory is temporarily unavailable." }, { status: 502 });
  }
}
