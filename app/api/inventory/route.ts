import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "https://www.landroverwillowgrove.com";
const INVENTORY_URL = `${BASE_URL}/llm/inventory/`;

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
};

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value: string) {
  return decodeEntities(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function absoluteUrl(href: string) {
  if (!href) return BASE_URL;
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  return `${BASE_URL}${href.startsWith("/") ? href : `/${href}`}`;
}

function parseInventoryPage(html: string): Vehicle[] {
  const text = stripTags(html);
  const links = [
    ...html.matchAll(
      /<a\b[^>]*href=["']([^"']+)["'][^>]*>\s*View\s+Full\s+Listing(?:\s*→)?\s*<\/a>/gi
    ),
  ].map((match) => absoluteUrl(match[1]));

  const vehicles: Vehicle[] = [];
  const pattern = /((?:19|20)\d{2}\s+(?:(?:LAND ROVER|Land Rover|JAGUAR|Jaguar)\s+)?[^$]{3,150}?)\s+(Certified Used|Used|New)\s+([\d,]+)\s+miles?\s+\$([\d,]+)\s+VIN:\s*([A-HJ-NPR-Z0-9]{17})/gi;

  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(text))) {
    const title = match[1].replace(/\s+/g, " ").trim();
    const condition = match[2].trim();
    const mileage = Number(match[3].replace(/,/g, ""));
    const price = Number(match[4].replace(/,/g, ""));
    const vin = match[5].toUpperCase();

    vehicles.push({
      title,
      condition,
      mileage: Number.isFinite(mileage) ? mileage : null,
      price: Number.isFinite(price) ? price : null,
      vin,
      url: links[index] || INVENTORY_URL,
    });
    index += 1;
  }

  return vehicles;
}

async function fetchInventoryPage(type: "new" | "used", page: number) {
  const url = new URL(INVENTORY_URL);
  url.searchParams.set("type", type);
  if (page > 1) url.searchParams.set("page", String(page));

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; JonRover/1.0; +https://jonrover.com)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Willow Grove returned ${response.status}`);
  }

  return response.text();
}

function extractBudget(query: string) {
  const match = query.match(
    /(?:under|below|less than|max(?:imum)?|up to|no more than)\s*\$?\s*([\d,.]+)\s*(k)?/i
  );
  if (!match) return null;
  let value = Number(match[1].replace(/,/g, ""));
  if (match[2]) value *= 1000;
  return Number.isFinite(value) ? value : null;
}

function scoreVehicle(vehicle: Vehicle, query: string) {
  if (!query.trim()) return 0;

  const q = query.toLowerCase();
  const title = vehicle.title.toLowerCase();
  let score = 0;

  const modelTerms = [
    "range rover sport",
    "range rover velar",
    "range rover evoque",
    "range rover",
    "defender 130",
    "defender 110",
    "defender 90",
    "defender",
    "discovery sport",
    "discovery",
    "f-pace",
    "f pace",
    "jaguar",
  ];

  for (const term of modelTerms) {
    if (q.includes(term)) {
      const normalized = term === "f pace" ? "f-pace" : term;
      if (title.includes(normalized) || (normalized === "f-pace" && title.includes("f pace"))) score += 40;
      else score -= 12;
      break;
    }
  }

  const budget = extractBudget(q);
  if (budget && vehicle.price != null) {
    if (vehicle.price <= budget) score += 18;
    else if (vehicle.price <= budget + 5000) score += 2;
    else score -= 20;
  }

  if (/\bnew\b/.test(q)) score += vehicle.condition.toLowerCase() === "new" ? 8 : -15;
  if (/\bused\b|\bpre[- ]?owned\b|\bcpo\b|\bcertified\b/.test(q)) {
    score += vehicle.condition.toLowerCase() === "new" ? -15 : 8;
  }

  const words = q.match(/[a-z0-9-]+/g) || [];
  const stop = new Set([
    "want", "need", "looking", "with", "under", "below", "than", "something", "vehicle",
    "three", "kids", "family", "sporty", "luxury", "roomy", "smaller", "huge", "large",
    "new", "used", "have", "dont", "don't", "anything", "around", "about", "prefer",
  ]);
  for (const word of words) {
    if (word.length > 3 && !stop.has(word) && title.includes(word)) score += 2;
  }

  return score;
}

async function enrichVehicle(vehicle: Vehicle): Promise<Vehicle> {
  if (!vehicle.url || vehicle.url === INVENTORY_URL) return vehicle;

  try {
    const response = await fetch(vehicle.url, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; JonRover/1.0; +https://jonrover.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) return vehicle;

    const html = await response.text();
    const text = stripTags(html);

    const ogImage =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1] ||
      null;

    const stock = text.match(/Stock:\s*([A-Z0-9-]+)/i)?.[1] || null;
    const exterior =
      text.match(/Exterior(?: Color)?:\s*([^|]{2,60}?)(?=\s+(?:Interior|Drivetrain|Transmission|Engine|Stock|VIN):)/i)?.[1]?.trim() ||
      null;

    const featureCandidates = [
      "Third Row Seat",
      "Panoramic Roof",
      "Heated Seats",
      "Ventilated Seats",
      "Adaptive Cruise Control",
      "Head-Up Display",
      "Tow Package",
      "Meridian",
      "Black Exterior Pack",
    ].filter((feature) => text.toLowerCase().includes(feature.toLowerCase()));

    return {
      ...vehicle,
      image: ogImage ? decodeEntities(ogImage) : null,
      stock,
      exterior,
      features: featureCandidates.slice(0, 6),
    };
  } catch {
    return vehicle;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim();
  const condition = (searchParams.get("condition") || "all").toLowerCase();
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 12), 1), 18);

  try {
    const types: ("new" | "used")[] = condition === "new" ? ["new"] : condition === "used" ? ["used"] : ["new", "used"];
    const requests: Promise<string>[] = [];

    for (const type of types) {
      for (let page = 1; page <= 3; page += 1) {
        requests.push(fetchInventoryPage(type, page));
      }
    }

    const pages = await Promise.allSettled(requests);
    const parsed = pages
      .filter((result): result is PromiseFulfilledResult<string> => result.status === "fulfilled")
      .flatMap((result) => parseInventoryPage(result.value));

    const unique = Array.from(new Map(parsed.map((vehicle) => [vehicle.vin, vehicle])).values());

    if (unique.length === 0) {
      return NextResponse.json(
        {
          error: "Willow Grove loaded, but no vehicle records could be read. The inventory format may have changed.",
          total: 0,
          count: 0,
          vehicles: [],
        },
        { status: 502 }
      );
    }

    const ranked = unique
      .map((vehicle) => ({ vehicle, score: scoreVehicle(vehicle, query) }))
      .sort((a, b) => b.score - a.score || (a.vehicle.price ?? Infinity) - (b.vehicle.price ?? Infinity))
      .slice(0, limit)
      .map(({ vehicle }) => vehicle);

    const enriched = await Promise.all(ranked.map(enrichVehicle));

    return NextResponse.json({
      source: "Land Rover Willow Grove",
      total: unique.length,
      count: enriched.length,
      query,
      condition,
      vehicles: enriched,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Inventory route failed", error);
    return NextResponse.json(
      { error: "Could not load live Willow Grove inventory right now.", total: 0, count: 0, vehicles: [] },
      { status: 502 }
    );
  }
}
