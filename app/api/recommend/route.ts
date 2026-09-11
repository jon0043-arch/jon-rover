import { NextRequest, NextResponse } from "next/server";

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
  pickLabel?: string;
  why?: string;
  relevanceScore?: number;
};

type Pick = { vin: string; label: "BEST MATCH" | "SMART ALTERNATIVE" | "WILDCARD"; why: string };
const labels: Pick["label"][] = ["BEST MATCH", "SMART ALTERNATIVE", "WILDCARD"];

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
  if (/\brange rover\b/.test(q)) return "range rover";
  if (/\bjaguar\b/.test(q)) return "jaguar";
  return null;
}

function searchable(v: Vehicle) {
  return `${v.title || ""} ${v.url || ""}`.toLowerCase().replace(/[-_/]+/g, " ");
}

function modelMatches(v: Vehicle, model: string) {
  const t = searchable(v);
  if (model === "range rover") return t.includes("range rover") && !t.includes("range rover sport") && !t.includes("velar") && !t.includes("evoque");
  if (model === "f-pace") return /\bf pace\b/.test(t);
  if (model === "e-pace") return /\be pace\b/.test(t);
  if (model === "jaguar") return t.includes("jaguar");
  return t.includes(model);
}

function isLeaseRequest(query: string) {
  return /\blease\b|\bleasing\b|\bleased\b/i.test(query);
}

function isLeaseEligible(v: Vehicle) {
  const stock = String(v.stock || "").trim().toUpperCase();
  const condition = String(v.condition || "").toLowerCase();
  if (condition && !condition.includes("new")) return false;
  if (!stock) return false;
  if (!/\d$/.test(stock)) return false;
  return /^[RJ]/.test(stock);
}

function fallbackPicks(v: Vehicle[], budget: number | null = null) {
  const eligible = budget == null ? v : v.filter((x) => x.price == null || x.price <= budget + 10000);
  return eligible.slice(0, 3).map((x, i) => ({
    ...x,
    pickLabel: labels[i],
    why: x.why || (i === 0
      ? "This is the closest overall fit based on what you told me matters most."
      : i === 1
        ? "This is the next strongest match based on your priorities."
        : "This is the best remaining alternative that still stays relevant to your request."),
  }));
}

function getOutputText(p: any) {
  if (typeof p?.output_text === "string") return p.output_text;
  const c: string[] = [];
  for (const i of p?.output ?? []) {
    for (const x of i?.content ?? []) {
      if (x?.type === "output_text" && typeof x?.text === "string") c.push(x.text);
    }
  }
  return c.join("");
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

function normalizeQuery(q: string) {
  let out = q;
  if (/\bthird[ -]?row\b|\b3rd[ -]?row\b/i.test(out) && !/\b7[ -]?seat|seven[ -]?seat/i.test(out)) out += ". HARD REQUIREMENT: 7 seats / seven-passenger seating.";
  if (isLeaseRequest(out)) out += ". HARD REQUIREMENT: lease requests may ONLY use new lease-eligible inventory. Land Rover new stock numbers start with R and end in a number; Jaguar new stock numbers start with J and end in a number. Any stock number ending in a letter is not lease eligible, and stock numbers starting with P are not lease eligible.";
  const color = requestedColor(out);
  if (color) out += ` EXTERIOR COLOR PREFERENCE: ${color}. Keep all picks in this color whenever enough qualifying inventory exists; only relax if needed.`;
  const interior = requestedInterior(out);
  if (interior) out += ` INTERIOR COLOR PREFERENCE: ${interior}. JLR map: Caraway=tan, Light Cloud=off-white, Ebony=black, Deep Garnet=red-wine/burgundy.`;
  const budget = parseBudget(q);
  if (budget != null) out += ` CUSTOMER STATED BUDGET: $${budget.toLocaleString()}. Treat this as the customer's actual stated budget. Some supplied candidates may be above it because the backend allows a small INTERNAL search buffer; never reveal, quote, imply, or rename that internal buffer as the customer's max, ceiling, budget, or target.`;
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const raw = String(body?.query ?? "").trim();
    const query = normalizeQuery(raw);
    const budget = parseBudget(raw);
    let vehicles = Array.isArray(body?.vehicles) ? (body.vehicles as Vehicle[]).slice(0, 15) : [];

    const model = requestedModel(raw);
    if (model) vehicles = vehicles.filter((v) => modelMatches(v, model));
    if (isLeaseRequest(raw)) vehicles = vehicles.filter(isLeaseEligible);
    if (budget != null) vehicles = vehicles.filter((v) => v.price == null || v.price <= budget + 10000);

    if (!query || !vehicles.length) return NextResponse.json({ picks: fallbackPicks(vehicles, budget), ai: false });

    const color = requestedColor(raw);
    if (color) {
      const matches = vehicles.filter((v) => colorMatches(v, color));
      if (matches.length >= 3) vehicles = matches;
      else if (matches.length > 0) vehicles = [...matches, ...vehicles.filter((v) => !colorMatches(v, color))];
    }

    const interior = requestedInterior(raw);
    if (interior) {
      const matches = vehicles.filter((v) => interiorMatches(v, interior));
      if (matches.length >= 3) vehicles = matches;
      else if (matches.length > 0) vehicles = [...matches, ...vehicles.filter((v) => !interiorMatches(v, interior))];
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ picks: fallbackPicks(vehicles, budget), ai: false, missingKey: true });

    const candidates = vehicles.map((v) => ({
      vin: v.vin,
      title: v.title,
      condition: v.condition,
      price: v.price,
      mileage: v.mileage,
      exterior: v.exterior ?? null,
      interior: v.interior ?? null,
      interior_family: v.interiorFamily ?? null,
      stock: v.stock ?? null,
      features: v.features?.slice(0, 8) ?? [],
      relevance_score: v.relevanceScore ?? null,
    }));

    const maxPicks = Math.min(3, candidates.length);
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
        store: false,
        reasoning: { effort: "low" },
        instructions: `You power Jon Rover, a personal Jaguar Land Rover shopping assistant. The backend has ALREADY applied the hard constraints. Never broaden an exact model request. Select up to ${maxPicks} vehicles ONLY from the supplied list. Never substitute a different model, body style, seating layout, new/used condition, or wildly different price just for variety. LEASE RULE: if the customer asks to lease, every supplied candidate has already been filtered to new lease-eligible inventory; never suggest used or pre-owned vehicles for a lease. Land Rover new/lease stock starts with R and ends in a number; Jaguar new/lease stock starts with J and ends in a number. Stock starting with P or ending in a letter is not lease eligible. If fewer than three genuinely relevant candidates are supplied, return fewer than three. Exterior and interior color should remain exact whenever matching candidates exist. Never invent equipment, seating, colors, price, mileage, packages or availability. Labels should be BEST MATCH, SMART ALTERNATIVE, then WILDCARD only when a third relevant pick truly exists. Explain each in first person as Jon in 1-2 concise sentences. IMPORTANT BUDGET RULE: the only customer budget is the amount the customer actually stated. The backend may include vehicles up to $10,000 above that amount as an INTERNAL search buffer. Never tell the customer their max/ceiling/budget is that higher amount. Never mention the internal buffer. If recommending a vehicle above the stated budget, say plainly that it is above their stated budget and by how much, or call it a stretch above their stated budget.`,
        input: `Customer request:\n${query}\n\nRanked Willow Grove candidates:\n${JSON.stringify(candidates)}`,
        text: {
          format: {
            type: "json_schema",
            name: "jon_rover_picks",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                picks: {
                  type: "array",
                  minItems: 1,
                  maxItems: maxPicks,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      vin: { type: "string" },
                      label: { type: "string", enum: labels },
                      why: { type: "string" },
                    },
                    required: ["vin", "label", "why"],
                  },
                },
              },
              required: ["picks"],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      console.error("OpenAI recommendation failed", response.status, await response.text());
      return NextResponse.json({ picks: fallbackPicks(vehicles, budget), ai: false, degraded: true });
    }

    const parsed = JSON.parse(getOutputText(await response.json()) || "{}");
    const modelPicks: Pick[] = Array.isArray(parsed?.picks) ? parsed.picks : [];
    const byVin = new Map(vehicles.map((v) => [v.vin.toUpperCase(), v]));
    const seen = new Set<string>();
    const picks: Vehicle[] = [];

    for (const p of modelPicks) {
      const vin = String(p?.vin ?? "").toUpperCase();
      const v = byVin.get(vin);
      if (!v || seen.has(vin) || (model && !modelMatches(v, model)) || (isLeaseRequest(raw) && !isLeaseEligible(v)) || (budget != null && v.price != null && v.price > budget + 10000)) continue;
      seen.add(vin);
      picks.push({ ...v, pickLabel: labels[picks.length] ?? p.label, why: String(p.why ?? "").trim() });
      if (picks.length === maxPicks) break;
    }

    if (!picks.length) return NextResponse.json({ picks: fallbackPicks(vehicles, budget), ai: false, degraded: true });
    return NextResponse.json({ picks, ai: true, model: process.env.OPENAI_MODEL || "gpt-5.6-luna" });
  } catch (e) {
    console.error("Recommendation route failed", e);
    return NextResponse.json({ error: "Could not create Jon's picks right now." }, { status: 500 });
  }
}
