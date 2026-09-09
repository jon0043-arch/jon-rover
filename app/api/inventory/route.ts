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
  if (href.startsWith("http")) return href;
  return `${BASE_URL}${href.startsWith("/") ? href : `/${href}`}`;
}

function parseInventory(html: string): Vehicle[] {
  const anchors = [...html.matchAll(/<a\b[^>]*href=["']([^"']*\/inventory\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const vehicles = new Map<string, Vehicle>();

  for (let i = 0; i < anchors.length; i++) {
    const match = anchors[i];
    const href = match[1];
    const title = stripTags(match[2]);

    if (!/\b20\d{2}\b/.test(title)) continue;
    if (/view full listing/i.test(title)) continue;

    const start = (match.index ?? 0) + match[0].length;
    const next = anchors[i + 1]?.index ?? start + 1800;
    const snippet = stripTags(html.slice(start, Math.min(next, start + 1800)));

    const conditionMatch = snippet.match(/\b(Certified Used|Used|New)\b/i);
    const mileageMatch = snippet.match(/([\d,]+)\s+miles?/i);
    const priceMatch = snippet.match(/\$([\d,]+)/);
    const vinMatch = snippet.match(/VIN:\s*([A-HJ-NPR-Z0-9]{17})/i);

    if (!vinMatch) continue;

    const vin = vinMatch[1].toUpperCase();
    if (vehicles.has(vin)) continue;

    vehicles.set(vin, {
      title,
      condition: conditionMatch?.[1] ?? "",
      mileage: mileageMatch ? Number(mileageMatch[1].replace(/,/g, "")) : null,
      price: priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : null,
      vin,
      url: absoluteUrl(href),
    });
  }

  return [...vehicles.values()];
}

function extractBudget(query: string) {
  const match = query.match(/(?:under|below|max(?:imum)?|up to)\s*\$?\s*([\d,.]+)\s*(k)?/i);
  if (!match) return null;
  let value = Number(match[1].replace(/,/g, ""));
  if (match[2]) value *= 1000;
  return Number.isFinite(value) ? value : null;
}

function identifyModel(query: string) {
  const q = query.toLowerCase();
  if (q.includes("range rover sport")) return "range rover sport";
  if (q.includes("discovery sport")) return "discovery sport";
  if (q.includes("range rover velar") || q.includes("velar")) return "velar";
  if (q.includes("range rover evoque") || q.includes("evoque")) return "evoque";
  if (q.includes("defender")) return "defender";
  if (q.includes("f-pace") || q.includes("f pace") || q.includes("jaguar")) return "jaguar";
  if (q.includes("discovery")) return "discovery";
  if (q.includes("range rover")) return "range rover";
  return null;
}

function scoreVehicles(vehicles: Vehicle[], query: string, condition: string) {
  const q = query.trim().toLowerCase();
  const budget = extractBudget(q);
  const model = identifyModel(q);
  const year = q.match(/\b20\d{2}\b/)?.[0] ?? null;
  const wantsNew = /\bnew\b/.test(q) || condition === "new";
  const wantsUsed = /\bused\b|\bpre[- ]?owned\b|\bcpo\b|\bcertified\b/.test(q) || condition === "used";
  const keywords = q
    .replace(/[^a-z0-9\- ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !["under", "with", "want", "looking", "prefer", "preferably", "please", "vehicle", "around", "about"].includes(word));

  return vehicles
    .map((vehicle) => {
      const title = vehicle.title.toLowerCase();
      let score = 0;

      if (budget != null) {
        if (vehicle.price != null && vehicle.price <= budget) score += 8;
        else if (vehicle.price != null) score -= Math.min(12, (vehicle.price - budget) / 5000);
      }

      if (model) {
        if (model === "range rover" && title.includes("range rover") && !title.includes("sport") && !title.includes("velar") && !title.includes("evoque")) score += 12;
        else if (model === "jaguar" && title.includes("jaguar")) score += 12;
        else if (title.includes(model)) score += 12;
        else score -= 5;
      }

      if (year && title.includes(year)) score += 4;
      if (wantsNew && vehicle.condition.toLowerCase() === "new") score += 5;
      if (wantsUsed && vehicle.condition.toLowerCase() !== "new") score += 5;

      for (const keyword of keywords) {
        if (title.includes(keyword)) score += 1.5;
      }

      return { vehicle, score };
    })
    .sort((a, b) => b.score - a.score || (a.vehicle.price ?? Infinity) - (b.vehicle.price ?? Infinity));
}

async function fetchInventoryPage(page: number) {
  const url = new URL(INVENTORY_URL);
  url.searchParams.set("limit", "100");
  url.searchParams.set("page", String(page));

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; JonRoverInventory/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) throw new Error(`Inventory page ${page} unavailable`);
  return response.text();
}

async function enrichVehicle(vehicle: Vehicle): Promise<Vehicle> {
  try {
    const response = await fetch(vehicle.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; JonRoverInventory/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: 900 },
    });

    if (!response.ok) return vehicle;

    const html = await response.text();
    const text = stripTags(html);

    const ogImage =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1] ??
      html.match(/https?:\\?\/\\?\/[^"'<>\s]+vehicle-images\.carscommerce\.inc[^"'<>\s]*/i)?.[0];

    const stock = text.match(/Stock:\s*([A-Z0-9-]+)/i)?.[1] ?? null;
    const exterior = text.match(/Exterior:\s*(.+?)\s+(?:Drivetrain:|Interior:)/i)?.[1]?.trim() ?? null;

    const image = ogImage
      ? decodeEntities(ogImage.replace(/\\\//g, "/").replace(/\\u0026/g, "&"))
      : null;

    return { ...vehicle, image, stock, exterior };
  } catch {
    return vehicle;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const condition = (searchParams.get("condition") ?? searchParams.get("type") ?? "all").toLowerCase();
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 12) || 12, 1), 18);

  try {
    const firstHtml = await fetchInventoryPage(1);
    const firstText = stripTags(firstHtml);
    const total = Number(firstText.match(/(\d+)\s+(?:total\s+)?vehicles/i)?.[1] ?? firstText.match(/(\d+)\s+vehicles found/i)?.[1] ?? 0);
    const pageCount = Math.min(Number(firstText.match(/Page\s+1\s+of\s+(\d+)/i)?.[1] ?? 1), 6);

    const remainingPages = pageCount > 1
      ? await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) => fetchInventoryPage(index + 2)))
      : [];

    const allVehicles = [firstHtml, ...remainingPages].flatMap(parseInventory);
    let vehicles = [...new Map(allVehicles.map((vehicle) => [vehicle.vin, vehicle])).values()];

    if (condition === "new") {
      vehicles = vehicles.filter((vehicle) => vehicle.condition.toLowerCase() === "new");
    } else if (condition === "used") {
      vehicles = vehicles.filter((vehicle) => vehicle.condition.toLowerCase() !== "new");
    }

    const ranked = scoreVehicles(vehicles, query, condition);
    const selected = ranked.slice(0, limit).map(({ vehicle }) => vehicle);
    const enriched = await Promise.all(selected.map(enrichVehicle));

    return NextResponse.json({
      total: total || vehicles.length,
      indexed: vehicles.length,
      count: enriched.length,
      query,
      condition,
      vehicles: enriched,
      source: "Land Rover Willow Grove",
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Could not load live inventory right now." }, { status: 500 });
  }
}
