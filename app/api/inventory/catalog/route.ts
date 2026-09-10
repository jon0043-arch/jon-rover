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

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
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
  const vehicles = Array.isArray(savedSnapshot.vehicles) ? savedSnapshot.vehicles : [];
  const fetchedAt = savedSnapshot.fetchedAt || null;
  if (!vehicles.length || !fetchedAt) return;

  const newest = await supabaseFetch(
    "inventory_vehicles?select=last_seen_at&order=last_seen_at.desc&limit=1",
  );
  if (!newest.ok) return;
  const newestRows = (await newest.json()) as { last_seen_at?: string | null }[];
  const dbTimestamp = newestRows[0]?.last_seen_at || null;
  if (dbTimestamp && new Date(dbTimestamp).getTime() >= new Date(fetchedAt).getTime()) return;

  const rows = vehicles.map((v) => ({
    vin: v.vin,
    title: v.title,
    condition: v.condition,
    mileage: v.mileage ?? null,
    price: v.price ?? null,
    listing_url: v.url || "https://www.landroverwillowgrove.com/",
    image_url: v.image ?? null,
    stock: v.stock ?? null,
    exterior: v.exterior ?? null,
    interior: v.interior ?? null,
    interior_family: v.interiorFamily ?? null,
    features: Array.isArray(v.features) ? v.features : [],
    active: true,
    last_seen_at: fetchedAt,
    updated_at: fetchedAt,
  }));

  for (let i = 0; i < rows.length; i += 100) {
    const r = await supabaseFetch("inventory_vehicles?on_conflict=vin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows.slice(i, i + 100)),
    });
    if (!r.ok) throw new Error(`Inventory snapshot upsert failed: ${r.status}`);
  }

  const expected = Number(savedSnapshot.expected || 0);
  const count = Number(savedSnapshot.count || vehicles.length);
  const complete = expected > 0 && count === expected && vehicles.length === expected;
  if (complete) {
    const cutoff = encodeURIComponent(fetchedAt);
    const stale = await supabaseFetch(`inventory_vehicles?last_seen_at=lt.${cutoff}&active=eq.true`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ active: false, updated_at: fetchedAt }),
    });
    if (!stale.ok) throw new Error(`Inventory stale-row update failed: ${stale.status}`);
  }
}

export async function GET(req: NextRequest) {
  if (!config()) return NextResponse.json({ error: "Inventory catalog not configured" }, { status: 503 });

  try {
    await syncBundledSnapshot();
  } catch (error) {
    console.error("Inventory snapshot sync failed", error);
    // Keep serving the last known good Supabase catalog even if a refresh fails.
  }

  const p = req.nextUrl.searchParams;
  const condition = (p.get("condition") || "all").toLowerCase();
  const q = (p.get("q") || "").trim().toLowerCase();
  const params = new URLSearchParams({
    select: "vin,title,condition,mileage,price,listing_url,image_url,stock,exterior,interior,interior_family,features,last_seen_at",
    active: "eq.true",
    order: "price.asc",
    limit: "500",
  });
  if (condition === "new") params.set("condition", "eq.New");
  else if (condition === "used") params.set("condition", "neq.New");

  const r = await supabaseFetch(`inventory_vehicles?${params}`,
    { headers: { Prefer: "count=exact" } },
  );
  if (!r.ok) return NextResponse.json({ error: "Inventory catalog unavailable" }, { status: 502 });

  let rows: any[] = await r.json();
  if (q) {
    const terms = q.split(/\s+/).filter(Boolean);
    rows = rows.filter((v) =>
      terms.every((t) =>
        `${v.title} ${v.exterior || ""} ${v.interior || ""} ${v.condition}`
          .toLowerCase()
          .includes(t),
      ),
    );
  }

  return NextResponse.json({
    total: rows.length,
    vehicles: rows.map((v) => ({
      title: v.title,
      condition: v.condition,
      mileage: v.mileage,
      price: v.price,
      vin: v.vin,
      url: v.listing_url,
      image: v.image_url,
      stock: v.stock,
      exterior: v.exterior,
      interior: v.interior,
      interiorFamily: v.interior_family,
      features: v.features || [],
    })),
    source: "Jon Rover saved inventory",
    updatedAt: rows[0]?.last_seen_at || null,
    snapshotCount: Number(savedSnapshot.count || 0),
    snapshotExpected: Number(savedSnapshot.expected || 0),
  });
}
