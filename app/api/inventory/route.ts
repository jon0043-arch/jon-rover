import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "https://www.landroverwillowgrove.com";
const INVENTORY_URL = `${BASE_URL}/llm/inventory/`;
const JINA_PREFIX = "https://r.jina.ai/";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: BASE_URL,
};

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
  pickLabel?: string;
  why?: string;
};

type Preferences = {
  budget: number | null;
  model: string | null;
  family: boolean;
  sporty: boolean;
  smaller: boolean;
  roomy: boolean;
  luxury: boolean;
  rugged: boolean;
  thirdRow: boolean;
  wantsNew: boolean;
  wantsUsed: boolean;
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

function absoluteUrl(value: string) {
  if (!value) return value;
  if (value.startsWith("http")) return value;
  return `${BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

function htmlToLines(html: string) {
  let value = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  value = value.replace(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_all, href: string, inner: string) => {
      const text = decodeEntities(inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
      return `\n[${text}](${absoluteUrl(href)})\n`;
    }
  );
  value = value.replace(/<(?:br|\/p|\/div|\/li|\/h[1-6]|\/section|\/article)>/gi, "\n");
  value = decodeEntities(value.replace(/<[^>]+>/g, " "));
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s+/, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function markdownToLines(markdown: string) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);
}

function parseVehicleLines(lines: string[], fallbackCondition: string) {
  const vehicles = new Map<string, Vehicle>();

  for (let i = 0; i < lines.length; i++) {
    const vinMatch = lines[i].match(/^VIN:\s*([A-HJ-NPR-Z0-9]{17})/i);
    if (!vinMatch) continue;

    const vin = vinMatch[1].toUpperCase();
    if (vehicles.has(vin)) continue;

    let title = "";
    let url = "";
    let condition = fallbackCondition;
    let mileage: number | null = null;
    let price: number | null = null;

    for (let j = i - 1; j >= Math.max(0, i - 18); j--) {
      const link = lines[j].match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
      if (!title && link && /\b(?:19|20)\d{2}\b/.test(link[1]) && !/view full listing/i.test(link[1])) {
        title = link[1].trim();
        url = link[2];
      }
      if (!price) {
        const m = lines[j].match(/^\$([\d,]{4,})$/);
        if (m) price = Number(m[1].replace(/,/g, ""));
      }
      if (mileage == null) {
        const m = lines[j].match(/^([\d,]+)\s+miles?$/i);
        if (m) mileage = Number(m[1].replace(/,/g, ""));
      }
      if (/^(New|Used|Certified Used)$/i.test(lines[j])) condition = lines[j];
    }

    if (!url) {
      for (let j = i + 1; j <= Math.min(lines.length - 1, i + 5); j++) {
        const link = lines[j].match(/^\[View Full Listing[^\]]*\]\((https?:\/\/[^)]+)\)$/i);
        if (link) {
          url = link[1];
          break;
        }
      }
    }

    if (!title) continue;
    vehicles.set(vin, {
      title,
      condition,
      mileage,
      price,
      vin,
      url: absoluteUrl(url),
    });
  }

  return [...vehicles.values()];
}

async function fetchSource(url: string) {
  let directStatus = 0;

  try {
    const response = await fetch(url, {
      headers: BROWSER_HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    directStatus = response.status;
    if (response.ok) {
      const html = await response.text();
      const vehicles = parseVehicleLines(htmlToLines(html), url.includes("type=used") ? "Used" : "New");
      if (vehicles.length) return { vehicles, method: "direct" as const, directStatus };
    }
  } catch {
    directStatus = 0;
  }

  const readerUrl = `${JINA_PREFIX}${url}`;
  const reader = await fetch(readerUrl, {
    headers: { Accept: "text/plain", "X-Return-Format": "markdown" },
    next: { revalidate: 180 },
    signal: AbortSignal.timeout(20000),
  });

  if (!reader.ok) throw new Error(`Inventory source unavailable (${directStatus || "network"}/${reader.status})`);
  const markdown = await reader.text();
  const vehicles = parseVehicleLines(markdownToLines(markdown), url.includes("type=used") ? "Used" : "New");
  if (!vehicles.length) throw new Error("Inventory source returned no readable vehicles");
  return { vehicles, method: "reader" as const, directStatus };
}

function extractBudget(query: string) {
  const m = query.match(/(?:under|below|less than|max(?:imum)?|up to|no more than)\s*\$?\s*([\d,.]+)\s*(k)?/i);
  if (!m) return null;
  let n = Number(m[1].replace(/,/g, ""));
  if (m[2]) n *= 1000;
  return Number.isFinite(n) ? n : null;
}

function identifyModel(query: string) {
  const q = query.toLowerCase();
  const ordered = [
    "range rover sport",
    "discovery sport",
    "defender 130",
    "defender 110",
    "defender 90",
    "range rover velar",
    "range rover evoque",
    "f-pace",
    "defender",
    "discovery",
    "range rover",
    "jaguar",
  ];
  return ordered.find((model) => q.includes(model)) ?? (q.includes("f pace") ? "f-pace" : null);
}

function preferences(query: string): Preferences {
  const q = query.toLowerCase();
  const smaller = /not (?:too )?(?:big|huge|large)|don'?t want (?:anything )?(?:big|huge|large)|compact|smaller|easy to park|mid-?size/i.test(q);
  return {
    budget: extractBudget(q),
    model: identifyModel(q),
    family: /family|kids?|children|car ?seats?|3 kids|three kids/i.test(q),
    sporty: /sporty|performance|quick|fast|fun to drive|dynamic|athletic/i.test(q),
    smaller,
    roomy: !smaller && /roomy|lots of room|cargo|spacious|big family|large family/i.test(q),
    luxury: /luxury|luxurious|premium|quiet|comfortable|upscale/i.test(q),
    rugged: /off[- ]?road|rugged|camping|outdoors|adventure|tow|towing/i.test(q),
    thirdRow: /third row|3rd row|7 seats?|seven seats?|7-seater/i.test(q),
    wantsNew: /\bnew\b/i.test(q),
    wantsUsed: /\bused\b|pre[- ]?owned|\bcpo\b|certified/i.test(q),
  };
}

function familyName(title: string) {
  const t = title.toLowerCase();
  if (t.includes("range rover sport")) return "Range Rover Sport";
  if (t.includes("range rover velar")) return "Range Rover Velar";
  if (t.includes("range rover evoque")) return "Range Rover Evoque";
  if (t.includes("discovery sport")) return "Discovery Sport";
  if (t.includes("defender 130")) return "Defender 130";
  if (t.includes("defender 110")) return "Defender 110";
  if (t.includes("defender 90")) return "Defender 90";
  if (t.includes("defender")) return "Defender";
  if (t.includes("discovery")) return "Discovery";
  if (t.includes("f-pace") || t.includes("f pace")) return "Jaguar F-PACE";
  if (t.includes("jaguar")) return "Jaguar";
  if (t.includes("range rover")) return "Range Rover";
  return "Other";
}

const FIT: Record<string, [number, number, number, number, number, number, number]> = {
  "Range Rover Sport": [4, 7, 2, 3, 5, 1, -3],
  "Range Rover Velar": [2, 5, 6, 1, 4, 0, -4],
  "Range Rover Evoque": [0, 3, 7, -2, 3, 0, -5],
  "Range Rover": [4, 2, -4, 5, 8, 1, 3],
  "Defender 90": [-2, 3, 5, -2, 1, 8, -5],
  "Defender 110": [6, 3, 0, 5, 2, 8, 1],
  "Defender 130": [8, 1, -7, 8, 2, 7, 8],
  Defender: [5, 2, 0, 4, 1, 8, 0],
  Discovery: [8, 1, -2, 8, 3, 4, 8],
  "Discovery Sport": [4, 2, 6, 2, 2, 1, 0],
  "Jaguar F-PACE": [4, 8, 4, 2, 5, -1, -5],
  Jaguar: [2, 7, 4, 0, 5, -2, -5],
  Other: [0, 0, 0, 0, 0, 0, 0],
};

function modelMatches(title: string, requested: string) {
  const t = title.toLowerCase();
  if (requested === "range rover") return t.includes("range rover") && !/sport|velar|evoque/.test(t);
  if (requested === "jaguar") return t.includes("jaguar");
  if (requested === "f-pace") return /f[- ]pace/.test(t);
  return t.includes(requested);
}

function score(vehicle: Vehicle, query: string, p: Preferences) {
  const t = vehicle.title.toLowerCase();
  const fit = FIT[familyName(vehicle.title)] ?? FIT.Other;
  let s = 0;
  if (p.family) s += fit[0];
  if (p.sporty) s += fit[1];
  if (p.smaller) s += fit[2];
  if (p.roomy) s += fit[3];
  if (p.luxury) s += fit[4];
  if (p.rugged) s += fit[5];
  if (p.thirdRow) s += fit[6];
  if (p.model) s += modelMatches(t, p.model) ? 32 : -12;
  if (p.budget != null && vehicle.price != null) {
    if (vehicle.price <= p.budget) s += 15;
    else s -= vehicle.price - p.budget <= 5000 ? 7 : vehicle.price - p.budget <= 10000 ? 15 : 30;
  }
  if (p.wantsNew) s += vehicle.condition.toLowerCase() === "new" ? 10 : -18;
  if (p.wantsUsed) s += vehicle.condition.toLowerCase() !== "new" ? 10 : -18;
  const year = query.match(/\b20\d{2}\b/)?.[0];
  if (year) s += t.includes(year) ? 5 : -2;
  return s;
}

function explain(vehicle: Vehicle, query: string, rank: number) {
  const p = preferences(query);
  const family = familyName(vehicle.title);
  const reasons: string[] = [];
  if (p.budget && vehicle.price && vehicle.price <= p.budget) reasons.push(`stays under your $${Math.round(p.budget / 1000)}k budget`);
  if (p.family && ["Range Rover Sport", "Defender 110", "Discovery", "Jaguar F-PACE", "Range Rover"].includes(family)) reasons.push("has useful everyday family space");
  if (p.sporty && ["Range Rover Sport", "Jaguar F-PACE", "Range Rover Velar"].includes(family)) reasons.push("keeps the driving experience on the sportier side");
  if (p.smaller && ["Range Rover Velar", "Range Rover Evoque", "Discovery Sport", "Jaguar F-PACE", "Range Rover Sport"].includes(family)) reasons.push("avoids going to one of the biggest SUVs");
  if (p.rugged && family.startsWith("Defender")) reasons.push("gives you the strongest adventure/off-road fit");
  if (p.thirdRow && ["Discovery", "Defender 130", "Range Rover"].includes(family)) reasons.push("can fit the extra seating you asked for");

  const intro = rank === 0 ? "This is the closest overall fit" : rank === 1 ? "This is the smart alternative" : "This is the wildcard";
  return reasons.length ? `${intro} because it ${reasons.slice(0, 3).join(", and ")}.` : `${intro} based on the mix of size, price and model you described.`;
}

async function enrich(vehicle: Vehicle) {
  const parseDetails = (content: string, isHtml: boolean) => {
    const lines = isHtml ? htmlToLines(content) : markdownToLines(content);
    const joined = lines.join("\n");
    const stock = joined.match(/Stock:\s*([A-Z0-9-]+)/i)?.[1] ?? vehicle.stock ?? null;
    const extIndex = lines.findIndex((line) => /^Exterior:$/i.test(line));
    const exterior = extIndex >= 0 ? lines[extIndex + 1] ?? null : joined.match(/Exterior:\s*([^\n]+)/i)?.[1]?.trim() ?? null;
    const image = isHtml
      ? content.match(/https?:\\?\/\\?\/[^"'<>\s]+vehicle-images\.carscommerce\.inc[^"'<>\s]*/i)?.[0]?.replace(/\\\//g, "/") ?? null
      : content.match(/\((https:\/\/vehicle-images\.carscommerce\.inc[^)]+)\)/i)?.[1] ?? null;
    const featureStart = lines.findIndex((line) => /Key Features/i.test(line));
    const features = featureStart >= 0 ? lines.slice(featureStart + 1, featureStart + 10).filter((line) => line.length < 50 && !/^#/.test(line)).slice(0, 6) : [];
    return { ...vehicle, stock, exterior, image, features };
  };

  try {
    const response = await fetch(vehicle.url, { headers: BROWSER_HEADERS, cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (response.ok) return parseDetails(await response.text(), true);
  } catch {}

  try {
    const response = await fetch(`${JINA_PREFIX}${vehicle.url}`, {
      headers: { Accept: "text/plain", "X-Return-Format": "markdown" },
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(18000),
    });
    if (response.ok) return parseDetails(await response.text(), false);
  } catch {}

  return vehicle;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  const condition = (searchParams.get("condition") ?? "all").toLowerCase();
  const requestedLimit = Math.min(Math.max(Number(searchParams.get("limit") ?? 12) || 12, 1), 18);
  const p = preferences(query);

  try {
    const wantsUsedOnly = condition === "used" || (p.wantsUsed && !p.wantsNew);
    const wantsNewOnly = condition === "new" || (p.wantsNew && !p.wantsUsed);
    const urls = wantsUsedOnly
      ? [`${INVENTORY_URL}?type=used`]
      : wantsNewOnly
        ? [`${INVENTORY_URL}?type=new`]
        : [`${INVENTORY_URL}?type=new`, `${INVENTORY_URL}?type=used`];

    const results = await Promise.allSettled(urls.map(fetchSource));
    const successful = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
    const vehicles = Array.from(new Map(successful.flatMap((result) => result.vehicles).map((v) => [v.vin, v])).values());

    if (!vehicles.length) {
      const errors = results.map((result) => (result.status === "rejected" ? String(result.reason) : "")).filter(Boolean);
      return NextResponse.json({ error: errors[0] || "Could not read Willow Grove inventory." }, { status: 502 });
    }

    const ranked = vehicles
      .map((vehicle) => ({ vehicle, score: score(vehicle, query, p) }))
      .sort((a, b) => b.score - a.score || (a.vehicle.price ?? Infinity) - (b.vehicle.price ?? Infinity));

    const limit = query ? 3 : requestedLimit;
    const chosen = ranked.slice(0, limit).map(({ vehicle }) => vehicle);
    const enriched = await Promise.all(chosen.map(enrich));
    const labels = ["BEST MATCH", "SMART ALTERNATIVE", "WILDCARD"];
    const output = enriched.map((vehicle, index) => ({
      ...vehicle,
      pickLabel: query ? labels[index] : undefined,
      why: query ? explain(vehicle, query, index) : undefined,
    }));

    return NextResponse.json({
      total: vehicles.length,
      count: output.length,
      query,
      condition,
      vehicles: output,
      source: "Land Rover Willow Grove",
      syncMethod: successful.map((result) => result.method).join("+"),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load live inventory right now." },
      { status: 502 }
    );
  }
}
