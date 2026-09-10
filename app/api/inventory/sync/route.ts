import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
const DEALER = "https://www.landroverwillowgrove.com";
const INDEX = `${DEALER}/llm/inventory/`;
const READER = "https://r.jina.ai/https://";

type V = {
  vin: string;
  title: string;
  condition: string;
  mileage: number | null;
  price: number | null;
  listing_url: string;
  image_url?: string | null;
  stock?: string | null;
  exterior?: string | null;
  interior?: string | null;
  interior_family?: string | null;
  features?: string[];
};

const reader = (url: string) => `${READER}${url.replace(/^https:\/\//, "")}`;

async function fetchText(url: string) {
  try {
    const direct = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "text/plain,text/markdown,text/html;q=0.9,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 JonRoverInventorySync/1.0",
      },
    });
    if (direct.ok) {
      const t = await direct.text();
      if (/VIN:\s*[A-HJ-NPR-Z0-9]{17}/i.test(t)) return t;
    }
  } catch {}

  const fallback = await fetch(reader(url), {
    cache: "no-store",
    headers: { Accept: "text/plain" },
  });
  if (!fallback.ok) throw new Error(`reader ${fallback.status}`);
  return fallback.text();
}

function num(s: string | undefined | null) {
  if (!s) return null;
  const x = Number(s.replace(/[^0-9]/g, ""));
  return Number.isFinite(x) ? x : null;
}

function cleanTitle(s: string) {
  return s
    .replace(/^\s*[*-]\s*/, "")
    .replace(/^\[|\]$/g, "")
    .replace(/\]\([^)]*\)$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parse(t: string): V[] {
  const lines = t.split(/\r?\n/).map((x) => x.trim());
  const out: V[] = [];

  for (let i = 0; i < lines.length; i++) {
    const vm = lines[i].match(/VIN:\s*([A-HJ-NPR-Z0-9]{17})/i);
    if (!vm) continue;

    const vin = vm[1].toUpperCase();
    const prev: string[] = [];
    for (let j = i - 1; j >= 0 && prev.length < 12; j--) {
      if (lines[j]) prev.push(lines[j]);
    }

    const priceLine = prev.find((x) => /^\$[\d,]+/.test(x));
    const milesLine = prev.find((x) => /^[\d,]+\s+miles?$/i.test(x));
    const conditionLine = prev.find((x) => /^(Certified Used|Used|New)$/i.test(x));

    const conditionIndex = prev.findIndex((x) => /^(Certified Used|Used|New)$/i.test(x));
    let titleLine = "";
    if (conditionIndex >= 0) {
      for (let k = conditionIndex + 1; k < prev.length; k++) {
        const candidate = prev[k];
        if (/^(View Full Listing|Next|Previous)/i.test(candidate)) continue;
        if (/^(Land Rover Willow Grove|Filter Examples|Active Filters)/i.test(candidate)) continue;
        if (/^Page\s+\d+/i.test(candidate)) continue;
        titleLine = candidate;
        break;
      }
    }

    const linkMatch = titleLine.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    const title = cleanTitle(linkMatch ? linkMatch[1] : titleLine);
    const listing_url = linkMatch?.[2] || `${DEALER}/?s=${vin}`;

    if (!title || !conditionLine || !priceLine || !milesLine) continue;

    out.push({
      vin,
      title,
      condition: conditionLine,
      mileage: num(milesLine),
      price: num(priceLine),
      listing_url,
    });
  }

  return out;
}

function family(v: string | null) {
  const x = (v || "").toLowerCase();
  if (/caraway|tan|beige|camel/.test(x)) return "tan";
  if (/light cloud|off[- ]?white|ivory|cream/.test(x)) return "off-white";
  if (/ebony|black/.test(x)) return "black";
  if (/deep garnet|burgundy|wine|garnet/.test(x)) return "red-wine";
  return null;
}

async function enrich(v: V): Promise<V> {
  try {
    if (!/\/inventory\//i.test(v.listing_url)) return v;
    const t = await fetchText(v.listing_url);
    const imgs = [...t.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)]+?\.(?:jpg|jpeg|png|webp)(?:\?[^)]*)?)\)/gi)]
      .map((x) => x[1])
      .filter((x) => !/(logo|icon|avatar|placeholder)/i.test(x));
    const image = imgs.find((x) => /(vehicle|inventory|dealer|cdn|cloudfront|images)/i.test(x)) || imgs[0] || null;
    const stock = t.match(/Stock(?: Number| #|:)?\s*[:#]?\s*([A-Z0-9-]{4,})/i)?.[1] || null;
    const exterior = t.match(/Exterior(?: Color)?\s*[:|]\s*([^\n|]{2,80})/i)?.[1]?.trim() || null;
    const interior = t.match(/Interior(?: Color)?\s*[:|]\s*([^\n|]{2,80})/i)?.[1]?.trim() || null;
    return { ...v, image_url: image, stock, exterior, interior, interior_family: family(interior) };
  } catch {
    return v;
  }
}

function sb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase inventory storage is not configured");
  return { url, key };
}

async function rest(path: string, init: RequestInit = {}) {
  const { url, key } = sb();
  const r = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r;
}

export async function POST(req: NextRequest) {
  if (
    process.env.INVENTORY_SYNC_SECRET &&
    req.headers.get("authorization") !== `Bearer ${process.env.INVENTORY_SYNC_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const quick = req.nextUrl.searchParams.get("quick") === "1";

    const first = await fetchText(INDEX);
    const statedTotal = Number(first.match(/([\d,]+)\s+vehicles?\s+found/i)?.[1]?.replace(/,/g, "") || 0);
    const pages = Math.max(
      1,
      Number(first.match(/Page\s+1\s+of\s+(\d+)/i)?.[1] || Math.ceil(statedTotal / 100) || 1)
    );

    const pageTexts = [first];
    for (let p = 2; p <= pages; p++) {
      pageTexts.push(await fetchText(`${INDEX}?_p=${p}`));
    }

    const base = Array.from(new Map(pageTexts.flatMap(parse).map((v) => [v.vin, v])).values());
    const sourceTotal = statedTotal || base.length;

    if (!base.length) {
      return NextResponse.json(
        {
          error: `Dealer inventory feed was reached, but no vehicles could be parsed. Feed preview: ${first.slice(0, 900)}`,
        },
        { status: 500 }
      );
    }

    let enriched: V[] = base;
    if (!quick) {
      enriched = [];
      for (let i = 0; i < base.length; i += 8) {
        enriched.push(...(await Promise.all(base.slice(i, i + 8).map(enrich))));
      }
    }

    const now = new Date().toISOString();
    const rows = enriched.map((v) => ({
      ...v,
      features: v.features || [],
      active: true,
      last_seen_at: now,
      updated_at: now,
    }));

    for (let i = 0; i < rows.length; i += 100) {
      await rest("inventory_vehicles?on_conflict=vin", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(rows.slice(i, i + 100)),
      });
    }

    return NextResponse.json({
      ok: true,
      quick,
      sourceTotal,
      pages,
      parsed: base.length,
      enriched: quick ? 0 : enriched.filter((v) => v.image_url).length,
      missing: Math.max(0, sourceTotal - base.length),
      syncedAt: now,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Inventory sync failed" },
      { status: 500 }
    );
  }
}
