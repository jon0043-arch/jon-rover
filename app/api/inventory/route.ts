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
  searchText?: string;
  pickLabel?: string;
  why?: string;
};

type Preferences = {
  budget: number | null;
  model: string | null;
  wantsNew: boolean;
  wantsUsed: boolean;
  family: boolean;
  sporty: boolean;
  smaller: boolean;
  roomy: boolean;
  luxury: boolean;
  rugged: boolean;
  thirdRow: boolean;
  color: string | null;
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

function parseInventory(html: string, fallbackCondition: string): Vehicle[] {
  const anchors = [...html.matchAll(/<a\b[^>]*href=["']([^"']*\/inventory\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const vehicles = new Map<string, Vehicle>();

  for (let i = 0; i < anchors.length; i++) {
    const match = anchors[i];
    const href = match[1];
    const title = stripTags(match[2]);

    if (!/\b20\d{2}\b/.test(title)) continue;
    if (/view full listing/i.test(title)) continue;

    const index = match.index ?? 0;
    const start = index + match[0].length;
    const next = anchors[i + 1]?.index ?? start + 2200;
    const detailHtml = html.slice(start, Math.min(next, start + 2200));
    const detailText = stripTags(detailHtml);
    const contextHtml = html.slice(Math.max(0, index - 1400), Math.min(html.length, start + 2200));
    const altText = [...contextHtml.matchAll(/\balt=["']([^"']+)["']/gi)]
      .map((item) => decodeEntities(item[1]))
      .join(" ");

    const conditionMatch = detailText.match(/\b(Certified Used|Used|New)\b/i);
    const mileageMatch = detailText.match(/([\d,]+)\s+miles?/i);
    const priceMatch = detailText.match(/\$([\d,]+)/);
    const vinMatch = detailText.match(/VIN:\s*([A-HJ-NPR-Z0-9]{17})/i);

    if (!vinMatch) continue;

    const vin = vinMatch[1].toUpperCase();
    if (vehicles.has(vin)) continue;

    vehicles.set(vin, {
      title,
      condition: conditionMatch?.[1] ?? fallbackCondition,
      mileage: mileageMatch ? Number(mileageMatch[1].replace(/,/g, "")) : null,
      price: priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : null,
      vin,
      url: absoluteUrl(href),
      searchText: `${title} ${detailText} ${altText}`.toLowerCase(),
    });
  }

  return [...vehicles.values()];
}

function extractBudget(query: string) {
  const match = query.match(/(?:under|below|less than|max(?:imum)?|up to|no more than)\s*\$?\s*([\d,.]+)\s*(k)?/i);
  if (!match) return null;
  let value = Number(match[1].replace(/,/g, ""));
  if (match[2]) value *= 1000;
  return Number.isFinite(value) ? value : null;
}

function identifyModel(query: string) {
  const q = query.toLowerCase();
  if (q.includes("range rover sport")) return "range rover sport";
  if (q.includes("discovery sport")) return "discovery sport";
  if (q.includes("defender 130")) return "defender 130";
  if (q.includes("defender 110")) return "defender 110";
  if (q.includes("defender 90")) return "defender 90";
  if (q.includes("range rover velar") || q.includes("velar")) return "velar";
  if (q.includes("range rover evoque") || q.includes("evoque")) return "evoque";
  if (q.includes("f-pace") || q.includes("f pace")) return "f-pace";
  if (q.includes("defender")) return "defender";
  if (q.includes("discovery")) return "discovery";
  if (q.includes("jaguar")) return "jaguar";
  if (q.includes("range rover")) return "range rover";
  return null;
}

function identifyColor(query: string) {
  const colors = [
    "green",
    "black",
    "white",
    "grey",
    "gray",
    "silver",
    "blue",
    "red",
    "gold",
    "bronze",
    "brown",
  ];
  return colors.find((color) => new RegExp(`\\b${color}\\b`, "i").test(query)) ?? null;
}

function parsePreferences(query: string): Preferences {
  const q = query.toLowerCase();
  const negatesBig = /not (?:too )?(?:big|huge|large)|don'?t want (?:anything )?(?:big|huge|large)/i.test(q);

  return {
    budget: extractBudget(q),
    model: identifyModel(q),
    wantsNew: /\bnew\b/i.test(q),
    wantsUsed: /\bused\b|\bpre[- ]?owned\b|\bcpo\b|\bcertified\b/i.test(q),
    family: /\bfamily\b|\bkids?\b|\bchildren\b|car ?seats?|three kids|3 kids/i.test(q),
    sporty: /sporty|performance|quick|fast|fun to drive|dynamic|athletic/i.test(q),
    smaller: negatesBig || /compact|smaller|not too big|easy to park|midsize|mid-size/i.test(q),
    roomy: !negatesBig && /roomy|lots of room|cargo|big family|large family|spacious/i.test(q),
    luxury: /luxury|luxurious|premium|quiet|comfortable|nice interior|upscale/i.test(q),
    rugged: /off[- ]?road|rugged|camping|outdoors|adventure|towing|tow/i.test(q),
    thirdRow: /third row|3rd row|7 seats?|seven seats?|7-seater/i.test(q),
    color: identifyColor(q),
  };
}

function modelFamily(title: string) {
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
  return title.split(" ").slice(0, 4).join(" ");
}

function modelMatches(title: string, requested: string) {
  const t = title.toLowerCase();
  if (requested === "range rover") {
    return t.includes("range rover") && !t.includes("sport") && !t.includes("velar") && !t.includes("evoque");
  }
  if (requested === "jaguar") return t.includes("jaguar");
  if (requested === "f-pace") return t.includes("f-pace") || t.includes("f pace");
  return t.includes(requested);
}

function lifestyleScore(vehicle: Vehicle, prefs: Preferences) {
  const family = modelFamily(vehicle.title);
  let score = 0;

  const fit: Record<string, { family: number; sporty: number; smaller: number; roomy: number; luxury: number; rugged: number; thirdRow: number }> = {
    "Range Rover Sport": { family: 3, sporty: 6, smaller: 2, roomy: 2, luxury: 4, rugged: 1, thirdRow: -4 },
    "Range Rover Velar": { family: 1, sporty: 4, smaller: 5, roomy: 0, luxury: 4, rugged: 0, thirdRow: -4 },
    "Range Rover Evoque": { family: -1, sporty: 2, smaller: 6, roomy: -2, luxury: 2, rugged: 0, thirdRow: -5 },
    "Range Rover": { family: 3, sporty: 1, smaller: -4, roomy: 4, luxury: 7, rugged: 1, thirdRow: 2 },
    "Defender 90": { family: -2, sporty: 2, smaller: 4, roomy: -2, luxury: 1, rugged: 7, thirdRow: -5 },
    "Defender 110": { family: 5, sporty: 2, smaller: 0, roomy: 4, luxury: 2, rugged: 7, thirdRow: 1 },
    "Defender 130": { family: 7, sporty: 0, smaller: -6, roomy: 7, luxury: 2, rugged: 6, thirdRow: 7 },
    Defender: { family: 4, sporty: 1, smaller: 0, roomy: 3, luxury: 1, rugged: 7, thirdRow: 0 },
    Discovery: { family: 7, sporty: 0, smaller: -2, roomy: 7, luxury: 2, rugged: 3, thirdRow: 7 },
    "Discovery Sport": { family: 3, sporty: 1, smaller: 5, roomy: 1, luxury: 1, rugged: 1, thirdRow: 0 },
    "Jaguar F-PACE": { family: 3, sporty: 7, smaller: 3, roomy: 1, luxury: 4, rugged: -1, thirdRow: -5 },
    Jaguar: { family: 1, sporty: 6, smaller: 3, roomy: -1, luxury: 4, rugged: -2, thirdRow: -5 },
  };

  const values = fit[family] ?? { family: 0, sporty: 0, smaller: 0, roomy: 0, luxury: 0, rugged: 0, thirdRow: 0 };
  if (prefs.family) score += values.family;
  if (prefs.sporty) score += values.sporty;
  if (prefs.smaller) score += values.smaller;
  if (prefs.roomy) score += values.roomy;
  if (prefs.luxury) score += values.luxury;
  if (prefs.rugged) score += values.rugged;
  if (prefs.thirdRow) score += values.thirdRow;

  return score;
}

function scoreVehicle(vehicle: Vehicle, query: string, prefs: Preferences) {
  const title = vehicle.title.toLowerCase();
  const haystack = `${vehicle.searchText ?? ""} ${vehicle.exterior ?? ""}`.toLowerCase();
  let score = lifestyleScore(vehicle, prefs);

  if (prefs.model) {
    score += modelMatches(title, prefs.model) ? 30 : -12;
  }

  if (prefs.budget != null && vehicle.price != null) {
    if (vehicle.price <= prefs.budget) score += 14;
    else {
      const over = vehicle.price - prefs.budget;
      score -= over <= 5000 ? 6 : over <= 10000 ? 14 : 28;
    }
  }

  if (prefs.wantsNew) score += vehicle.condition.toLowerCase() === "new" ? 10 : -18;
  if (prefs.wantsUsed) score += vehicle.condition.toLowerCase() !== "new" ? 10 : -18;

  if (prefs.color) {
    const colorWords = prefs.color === "gray" ? ["gray", "grey"] : prefs.color === "grey" ? ["grey", "gray"] : [prefs.color];
    if (colorWords.some((color) => haystack.includes(color))) score += 10;
  }

  const year = query.match(/\b20\d{2}\b/)?.[0];
  if (year) score += title.includes(year) ? 5 : -1;

  const stop = new Set([
    "the", "and", "with", "that", "this", "want", "need", "looking", "prefer", "preferably", "vehicle", "something",
    "under", "below", "than", "around", "about", "kids", "family", "sporty", "luxury", "roomy", "smaller", "huge", "large",
    "new", "used", "owned", "three", "have", "dont", "not", "anything",
  ]);
  const keywords = query.toLowerCase().match(/[a-z0-9-]+/g)?.filter((word) => word.length > 3 && !stop.has(word)) ?? [];
  for (const keyword of keywords) {
    if (haystack.includes(keyword)) score += 1.25;
  }

  return score;
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
    const exterior =
      text.match(/Exterior(?: Color)?:\s*(.+?)\s+(?:Drivetrain:|Interior:|Transmission:|Engine:)/i)?.[1]?.trim() ??
      null;

    const image = ogImage
      ? decodeEntities(ogImage.replace(/\\\//g, "/").replace(/\\u0026/g, "&"))
      : null;

    return {
      ...vehicle,
      image,
      stock,
      exterior,
      searchText: `${vehicle.searchText ?? ""} ${exterior ?? ""}`.toLowerCase(),
    };
  } catch {
    return vehicle;
  }
}

function chooseThree(ranked: { vehicle: Vehicle; score: number }[], prefs: Preferences) {
  if (ranked.length <= 3) return ranked.map((item) => item.vehicle);

  if (prefs.model) return ranked.slice(0, 3).map((item) => item.vehicle);

  const picks: Vehicle[] = [];
  const families = new Set<string>();

  for (const item of ranked) {
    const family = modelFamily(item.vehicle.title);
    if (families.has(family)) continue;
    picks.push(item.vehicle);
    families.add(family);
    if (picks.length === 3) break;
  }

  if (picks.length < 3) {
    for (const item of ranked) {
      if (picks.some((pick) => pick.vin === item.vehicle.vin)) continue;
      picks.push(item.vehicle);
      if (picks.length === 3) break;
    }
  }

  return picks;
}

function formatBudget(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function buildWhy(vehicle: Vehicle, prefs: Preferences, index: number) {
  const family = modelFamily(vehicle.title);
  const reasons: string[] = [];

  if (prefs.model && modelMatches(vehicle.title.toLowerCase(), prefs.model)) reasons.push("it is the model you asked for");
  if (prefs.budget != null && vehicle.price != null && vehicle.price <= prefs.budget) reasons.push(`it stays under your ${formatBudget(prefs.budget)} cap`);
  if (prefs.color && `${vehicle.exterior ?? ""} ${vehicle.searchText ?? ""}`.toLowerCase().includes(prefs.color)) reasons.push(`it matches your ${prefs.color} preference`);

  if (prefs.family && ["Range Rover Sport", "Defender 110", "Discovery", "Jaguar F-PACE"].includes(family)) reasons.push("it gives a family useful space without making the choice feel purely practical");
  if (prefs.sporty && ["Range Rover Sport", "Range Rover Velar", "Jaguar F-PACE", "Jaguar"].includes(family)) reasons.push("it is one of the sportier choices in the lineup");
  if (prefs.smaller && ["Range Rover Sport", "Range Rover Velar", "Range Rover Evoque", "Discovery Sport", "Jaguar F-PACE"].includes(family)) reasons.push("it avoids jumping straight to the biggest SUV");
  if (prefs.rugged && family.startsWith("Defender")) reasons.push("it is the strongest fit for the rugged/off-road side of your request");
  if (prefs.thirdRow && ["Defender 130", "Discovery", "Range Rover"].includes(family)) reasons.push("it is one of the better fits when extra seating matters");
  if (prefs.luxury && family.includes("Range Rover")) reasons.push("it leans hardest into the luxury side of what you described");

  const fallback = index === 0
    ? "This is the best overall balance of the things you asked for in the inventory right now."
    : index === 1
      ? "This is the smart alternative — a slightly different way to hit most of the same priorities."
      : "This is the wildcard — not the obvious first choice, but close enough to your priorities that I would want you to see it.";

  if (!reasons.length) return fallback;
  const intro = index === 0 ? "My best match because " : index === 1 ? "My smart alternative because " : "My wildcard because ";
  return `${intro}${reasons.slice(0, 3).join(", and ")}.`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const requestedCondition = (searchParams.get("condition") ?? searchParams.get("type") ?? "all").toLowerCase();
  const rawLimit = Math.min(Math.max(Number(searchParams.get("limit") ?? 12) || 12, 1), 18);
  const prefs = parsePreferences(query);

  try {
    const [newResponse, usedResponse] = await Promise.all([
      fetch(`${INVENTORY_URL}?type=new`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; JonRoverInventory/1.0)", Accept: "text/html,application/xhtml+xml" },
        next: { revalidate: 300 },
      }),
      fetch(`${INVENTORY_URL}?type=used`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; JonRoverInventory/1.0)", Accept: "text/html,application/xhtml+xml" },
        next: { revalidate: 300 },
      }),
    ]);

    if (!newResponse.ok && !usedResponse.ok) {
      return NextResponse.json({ error: "Inventory source is temporarily unavailable." }, { status: 502 });
    }

    const [newHtml, usedHtml] = await Promise.all([
      newResponse.ok ? newResponse.text() : Promise.resolve(""),
      usedResponse.ok ? usedResponse.text() : Promise.resolve(""),
    ]);

    const allVehicles = [
      ...parseInventory(newHtml, "New"),
      ...parseInventory(usedHtml, "Used"),
    ];
    const unique = [...new Map(allVehicles.map((vehicle) => [vehicle.vin, vehicle])).values()];

    let effectiveCondition = requestedCondition;
    if (effectiveCondition === "all") {
      if (prefs.wantsNew && !prefs.wantsUsed) effectiveCondition = "new";
      if (prefs.wantsUsed && !prefs.wantsNew) effectiveCondition = "used";
    }

    let candidates = unique;
    if (effectiveCondition === "new") candidates = candidates.filter((vehicle) => vehicle.condition.toLowerCase() === "new");
    if (effectiveCondition === "used") candidates = candidates.filter((vehicle) => vehicle.condition.toLowerCase() !== "new");

    if (prefs.budget != null) {
      const underBudget = candidates.filter((vehicle) => vehicle.price != null && vehicle.price <= prefs.budget!);
      if (underBudget.length >= 3) candidates = underBudget;
    }

    const coarse = candidates
      .map((vehicle) => ({ vehicle, score: scoreVehicle(vehicle, query, prefs) }))
      .sort((a, b) => b.score - a.score || (a.vehicle.price ?? Infinity) - (b.vehicle.price ?? Infinity));

    const shortlistCount = query ? Math.min(12, coarse.length) : Math.min(rawLimit, coarse.length);
    const enrichedShortlist = await Promise.all(coarse.slice(0, shortlistCount).map(({ vehicle }) => enrichVehicle(vehicle)));

    const reranked = enrichedShortlist
      .map((vehicle) => ({ vehicle, score: scoreVehicle(vehicle, query, prefs) }))
      .sort((a, b) => b.score - a.score || (a.vehicle.price ?? Infinity) - (b.vehicle.price ?? Infinity));

    let selected: Vehicle[];
    if (query) {
      selected = chooseThree(reranked, prefs);
      const labels = ["BEST MATCH", "SMART ALTERNATIVE", "WILDCARD"];
      selected = selected.map((vehicle, index) => ({
        ...vehicle,
        pickLabel: labels[index] ?? "JON'S PICK",
        why: buildWhy(vehicle, prefs, index),
      }));
    } else {
      selected = reranked.slice(0, rawLimit).map(({ vehicle }) => vehicle);
    }

    return NextResponse.json({
      total: unique.length,
      count: selected.length,
      query,
      condition: effectiveCondition,
      vehicles: selected.map(({ searchText, ...vehicle }) => vehicle),
      source: "Land Rover Willow Grove",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Jon Rover inventory search failed", error);
    return NextResponse.json({ error: "Could not load live inventory right now." }, { status: 500 });
  }
}
