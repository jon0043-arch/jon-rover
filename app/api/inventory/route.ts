import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BASE = "https://www.landroverwillowgrove.com";
const INVENTORY = `${BASE}/llm/inventory/`;

type Vehicle = {
  title: string;
  condition: string;
  mileage: string;
  price: string;
  vin: string;
  url: string;
  image?: string;
};

function clean(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(value?: string) {
  if (!value) return undefined;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `${BASE}${value}`;
  return value;
}

function parsePage(html: string): Vehicle[] {
  const vehicles: Vehicle[] = [];
  const linkRegex = /<a[^>]+href=["']([^"']*\/inventory\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html))) {
    const href = match[1];
    if (!href || /\/llm\/inventory\/?/i.test(href)) continue;

    const start = Math.max(0, match.index - 9000);
    const end = Math.min(html.length, linkRegex.lastIndex + 2500);
    const chunk = html.slice(start, end);
    const text = clean(chunk);

    const vin = text.match(/VIN:\s*([A-HJ-NPR-Z0-9]{17})/i)?.[1] || "";
    if (!vin || vehicles.some((v) => v.vin === vin)) continue;

    const titleMatch = text.match(/((?:20\d{2}|19\d{2})\s+(?:LAND ROVER|Land Rover|Jaguar|JAGUAR)[^$]{3,110}?)(?=\s+(?:New|Used|Certified Used)\b)/i);
    const condition = text.match(/\b(New|Used|Certified Used)\b/i)?.[1] || "";
    const mileage = text.match(/([\d,]+)\s+miles/i)?.[1] || "0";
    const price = text.match(/\$([\d,]{4,})/)?.[1] || "";

    const imgMatch = chunk.match(/<(?:img|source)[^>]+(?:src|data-src|srcset)=["']([^"'\s,>]+)/i);
    const image = absoluteUrl(imgMatch?.[1]);

    const title = clean(titleMatch?.[1] || match[2]).replace(/View Full Listing.*/i, "").trim();
    if (!title || title.length > 150) continue;

    vehicles.push({
      title,
      condition,
      mileage,
      price: price ? `$${price}` : "Call for price",
      vin,
      url: absoluteUrl(href) || href,
      image,
    });
  }

  return vehicles;
}

function budgetFromQuery(q: string) {
  const compact = q.toLowerCase().replace(/,/g, "");
  const m = compact.match(/(?:under|below|less than|max(?:imum)?|up to)\s*\$?\s*(\d+(?:\.\d+)?)\s*(k)?/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  return m[2] ? n * 1000 : n;
}

function scoreVehicle(vehicle: Vehicle, q: string) {
  if (!q.trim()) return 1;
  const hay = `${vehicle.title} ${vehicle.condition} ${vehicle.price}`.toLowerCase();
  const stop = new Set(["a","an","and","or","the","with","for","to","i","me","my","want","need","looking","prefer","preferably","under","below","less","than","around","about","vehicle","car","suv"]);
  const words = q.toLowerCase().match(/[a-z0-9]+/g)?.filter((w) => w.length > 2 && !stop.has(w)) || [];
  let score = 0;
  for (const word of words) if (hay.includes(word)) score += word.length > 5 ? 3 : 1;

  const budget = budgetFromQuery(q);
  if (budget && vehicle.price !== "Call for price") {
    const price = Number(vehicle.price.replace(/[^0-9]/g, ""));
    if (price && price <= budget) score += 6;
    if (price > budget) score -= 8;
  }

  return score;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";
  const type = request.nextUrl.searchParams.get("type") || "";
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || 36), 80);

  try {
    const pages = [1, 2, 3];
    const responses = await Promise.all(
      pages.map(async (page) => {
        const url = new URL(INVENTORY);
        if (type) url.searchParams.set("type", type);
        if (page > 1) url.searchParams.set("page", String(page));
        const res = await fetch(url, {
          cache: "no-store",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; JonRoverInventory/1.0)",
            Accept: "text/html,application/xhtml+xml",
          },
        });
        if (!res.ok) return "";
        return res.text();
      })
    );

    const all = responses.flatMap(parsePage);
    const unique = Array.from(new Map(all.map((v) => [v.vin, v])).values());
    const ranked = unique
      .map((vehicle) => ({ vehicle, score: scoreVehicle(vehicle, q) }))
      .filter(({ score }) => !q || score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ vehicle }) => vehicle);

    return NextResponse.json({ vehicles: ranked, count: ranked.length, source: INVENTORY, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Inventory sync failed", error);
    return NextResponse.json({ vehicles: [], count: 0, error: "Inventory is temporarily unavailable." }, { status: 502 });
  }
}
