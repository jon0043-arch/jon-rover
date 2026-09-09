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
  features?: string[];
  pickLabel?: string;
  why?: string;
};

type Pick = {
  vin: string;
  label: "BEST MATCH" | "SMART ALTERNATIVE" | "WILDCARD";
  why: string;
};

const labels: Pick["label"][] = ["BEST MATCH", "SMART ALTERNATIVE", "WILDCARD"];

function fallbackPicks(vehicles: Vehicle[]) {
  return vehicles.slice(0, 3).map((vehicle, index) => ({
    ...vehicle,
    pickLabel: labels[index] ?? `PICK ${index + 1}`,
    why:
      vehicle.why ||
      (index === 0
        ? "This is the closest overall fit based on what you told me matters most."
        : index === 1
          ? "This is the smart alternative — a slightly different route that may give you better value or a better overall balance."
          : "This is the wildcard — not the obvious choice, but one I think is worth seeing before you decide."),
  }));
}

function getOutputText(payload: any) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  const chunks: string[] = [];
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content?.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = String(body?.query ?? "").trim();
    const vehicles = Array.isArray(body?.vehicles) ? (body.vehicles as Vehicle[]).slice(0, 15) : [];

    if (!query || vehicles.length === 0) {
      return NextResponse.json({ picks: fallbackPicks(vehicles), ai: false });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        picks: fallbackPicks(vehicles),
        ai: false,
        missingKey: true,
      });
    }

    const candidates = vehicles.map((vehicle) => ({
      vin: vehicle.vin,
      title: vehicle.title,
      condition: vehicle.condition,
      price: vehicle.price,
      mileage: vehicle.mileage,
      exterior: vehicle.exterior ?? null,
      stock: vehicle.stock ?? null,
      features: vehicle.features?.slice(0, 8) ?? [],
    }));

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
        store: false,
        reasoning: { effort: "low" },
        instructions:
          "You are powering Jon Rover, a personal Jaguar Land Rover shopping assistant for Jon McGeehan at Jaguar Land Rover Willow Grove. Select exactly three real vehicles ONLY from the candidate list supplied. The customer's stated requirements come first. Respect hard constraints like budget, new/used, model, seating and size whenever the candidate inventory allows it. Pick 1 is BEST MATCH. Pick 2 is SMART ALTERNATIVE: a credible different choice with a useful tradeoff. Pick 3 is WILDCARD: something the customer may not have considered but Jon would genuinely show them. Never invent equipment, pricing, colors, mileage, packages, availability, or facts not present in the candidate data. Explain each pick in first person as Jon, in 1-2 concise sentences, sounding like a knowledgeable human salesperson rather than marketing copy. If a pick stretches a stated preference, say so plainly in the explanation.",
        input: `Customer request:\n${query}\n\nCurrent Willow Grove candidates:\n${JSON.stringify(candidates)}`,
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
                  minItems: 3,
                  maxItems: 3,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      vin: { type: "string" },
                      label: {
                        type: "string",
                        enum: ["BEST MATCH", "SMART ALTERNATIVE", "WILDCARD"],
                      },
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
      const details = await response.text();
      console.error("OpenAI recommendation failed", response.status, details);
      return NextResponse.json({ picks: fallbackPicks(vehicles), ai: false, degraded: true });
    }

    const payload = await response.json();
    const outputText = getOutputText(payload);
    const parsed = JSON.parse(outputText || "{}");
    const modelPicks: Pick[] = Array.isArray(parsed?.picks) ? parsed.picks : [];

    const byVin = new Map(vehicles.map((vehicle) => [vehicle.vin.toUpperCase(), vehicle]));
    const seen = new Set<string>();
    const picks: Vehicle[] = [];

    for (const pick of modelPicks) {
      const vin = String(pick?.vin ?? "").toUpperCase();
      const vehicle = byVin.get(vin);
      if (!vehicle || seen.has(vin)) continue;
      seen.add(vin);
      picks.push({
        ...vehicle,
        pickLabel: labels[picks.length] ?? pick.label,
        why: String(pick.why ?? "").trim(),
      });
      if (picks.length === 3) break;
    }

    if (picks.length < 3) {
      for (const fallback of fallbackPicks(vehicles)) {
        if (seen.has(fallback.vin.toUpperCase())) continue;
        seen.add(fallback.vin.toUpperCase());
        picks.push({ ...fallback, pickLabel: labels[picks.length] });
        if (picks.length === 3) break;
      }
    }

    return NextResponse.json({ picks, ai: true, model: process.env.OPENAI_MODEL || "gpt-5.6-luna" });
  } catch (error) {
    console.error("Recommendation route failed", error);
    return NextResponse.json({ error: "Could not create Jon's picks right now." }, { status: 500 });
  }
}
