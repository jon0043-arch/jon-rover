import { NextRequest, NextResponse } from "next/server";
import snapshot from "../../../../data/inventory.json";

export const dynamic = "force-dynamic";

type SnapshotVehicle = {
  vin: string;
  title: string;
  condition: string;
  mileage?: number | null;
  price?: number | null;
  url?: string | null;
  image?: string | null;
  images?: string[];
  stock?: string | null;
  exterior?: string | null;
  interior?: string | null;
  interiorFamily?: string | null;
  features?: string[];
};

type Snapshot = {
  source?: string;
  expected?: number | null;
  count?: number;
  fetchedAt?: string | null;
  vehicles?: SnapshotVehicle[];
};

const savedSnapshot = snapshot as Snapshot;
const snapshotVehicles = Array.isArray(savedSnapshot.vehicles) ? savedSnapshot.vehicles : [];
const snapshotByVin = new Map(snapshotVehicles.map((v) => [String(v.vin || "").toUpperCase(), v]));

function validMeta(value?: string | null) {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;
  if (/^(?:interior_color|exterior_color|interior|exterior|unknown|n\/a|null|none)$/i.test(v)) return null;
  return v;
}

function normalizeSnapshot(v: SnapshotVehicle) {
  return {
    title: v.title,
    condition: v.condition,
    mileage: v.mileage ?? null,
    price: v.price ?? null,
    vin: v.vin,
    url: v.url || "https://www.landroverwillowgrove.com/",
    image: v.image || v.images?.[0] || null,
    images: Array.from(new Set([...(v.images || []), v.image || ""].filter(Boolean))),
    stock: validMeta(v.stock),
    exterior: validMeta(v.exterior),
    interior: validMeta(v.interior),
    interiorFamily: validMeta(v.interiorFamily),
    features: Array.isArray(v.features) ? v.features : [],
  };
}

function mergeRow(v: any) {
  const snap = snapshotByVin.get(String(v.vin || "").toUpperCase());
  const s = snap ? normalizeSnapshot(snap) : null;
  return {
    title: s?.title || v.title,
    condition: s?.condition || v.condition,
    mileage: s?.mileage ?? v.mileage ?? null,
    price: s?.price ?? v.price ?? null,
    vin: v.vin || s?.vin,
    url: s?.url || v.listing_url,
    image: s?.image || v.image_url || null,
    images: s?.images || [],
    stock: validMeta(s?.stock) || validMeta(v.stock),
    exterior: validMeta(s?.exterior) || validMeta(v.exterior),
    interior: validMeta(s?.interior) || validMeta(v.interior),
    interiorFamily: validMeta(s?.interiorFamily) || validMeta(v.interior_family),
    features: s?.features?.length ? s.features : (v.features || []),
    lastSeenAt: v.last_seen_at || savedSnapshot.fetchedAt || null,
  };
}

function config() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

async function supabaseFetch(path: string, init: RequestInit = {}) {
  const c = config();
  if (!c) throw new Error("Inventory catalog not configured");
  return fetch(`${c.url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: c.key,
      Authorization: `Bearer ${c.key}`,
      ...(init.headers || {}),
    },
  });
}

async function syncBundledSnapshot() {
  const c = config();
  if (!c) return;
  const vehicles = snapshotVehicles;
  const fetchedAt = savedSnapshot.fetchedAt || null;
  if (!vehicles.length || !fetchedAt) return;

  const rows = vehicles.map((v) => ({
    vin: v.vin,
    title: v.title,
    condition: v.condition,
    mileage: v.mileage ?? null,
    price: v.price ?? null,
    listing_url: v.url || "https://www.landroverwillowgrove.com/",
    image_url: v.image || v.images?.[0] || null,
    stock: validMeta(v.stock),
    exterior: validMeta(v.exterior),
    interior: validMeta(v.interior),
    interior_family: validMeta(v.interiorFamily),
    features: Array.isArray(v.features) ? v.features : [],
    active: true,
    last_seen_at: fetchedAt,
    updated_at: fetchedAt,
  }));

  for (let i = 0; i < rows.length; i += 100) {
    const r = await supabaseFetch("inventory_vehicles?on_conflict=vin", {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows.slice(i, i + 100)),
    });
    if (!r.ok) throw new Error(`Inventory snapshot upsert failed: ${r.status}`);
  }
}

function snapshotResponse(condition: string, q: string) {
  let vehicles = snapshotVehicles.map(normalizeSnapshot);
  if (condition === "new") vehicles = vehicles.filter((v) => v.condition.toLowerCase() === "new");
  else if (condition === "used") vehicles = vehicles.filter((v) => v.condition.toLowerCase() !== "new");
  if (q) {
    const terms = q.split(/\s+/).filter(Boolean);
    vehicles = vehicles.filter((v) => terms.every((t) => `${v.title} ${v.exterior || ""} ${v.interior || ""} ${v.condition}`.toLowerCase().includes(t)));
  }
  return NextResponse.json({
    total: vehicles.length,
    vehicles,
    source: "Jon Rover enriched inventory snapshot",
    updatedAt: savedSnapshot.fetchedAt || null,
    snapshotCount: Number(savedSnapshot.count || vehicles.length),
    snapshotExpected: Number(savedSnapshot.expected || 0),
  });
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const condition = (p.get("condition") || "all").toLowerCase();
  const q = (p.get("q") || "").trim().toLowerCase();

  if (!config()) return snapshotResponse(condition, q);

  try {
    await syncBundledSnapshot();
  } catch (error) {
    console.error("Inventory snapshot sync failed", error);
  }

  const params = new URLSearchParams({
    select: "vin,title,condition,mileage,price,listing_url,image_url,stock,exterior,interior,interior_family,features,last_seen_at",
    active: "eq.true",
    order: "price.asc",
    limit: "500",
  });
  if (condition === "new") params.set("condition", "eq.New");
  else if (condition === "used") params.set("condition", "neq.New");

  try {
    const r = await supabaseFetch(`inventory_vehicles?${params}`, { headers: { Prefer: "count=exact" } });
    if (!r.ok) return snapshotResponse(condition, q);
    let vehicles = (await r.json() as any[]).map(mergeRow);

    if (q) {
      const terms = q.split(/\s+/).filter(Boolean);
      vehicles = vehicles.filter((v) => terms.every((t) => `${v.title} ${v.exterior || ""} ${v.interior || ""} ${v.condition}`.toLowerCase().includes(t)));
    }

    return NextResponse.json({
      total: vehicles.length,
      vehicles,
      source: "Jon Rover saved inventory + enriched snapshot",
      updatedAt: vehicles[0]?.lastSeenAt || savedSnapshot.fetchedAt || null,
      snapshotCount: Number(savedSnapshot.count || 0),
      snapshotExpected: Number(savedSnapshot.expected || 0),
    });
  } catch (error) {
    console.error("Inventory catalog read failed", error);
    return snapshotResponse(condition, q);
  }
}
