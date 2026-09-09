"use client";

import { useEffect, useMemo, useState } from "react";

type Vehicle = {
  title: string;
  condition: string;
  mileage: string;
  price: string;
  vin: string;
  url: string;
  image?: string;
};

type Props = {
  initialQuery?: string;
  requestSignal?: number;
};

export default function InventoryBrowser({ initialQuery = "", requestSignal = 0 }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [type, setType] = useState("new");

  async function loadInventory(nextQuery = query, nextType = type) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "36" });
      if (nextQuery.trim()) params.set("q", nextQuery.trim());
      if (nextType) params.set("type", nextType);
      const response = await fetch(`/api/inventory?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not load inventory");
      setVehicles(data.vehicles || []);
    } catch (err) {
      setVehicles([]);
      setError(err instanceof Error ? err.message : "Could not load inventory");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setQuery(initialQuery);
    loadInventory(initialQuery, type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestSignal]);

  useEffect(() => {
    loadInventory("", type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const status = useMemo(() => {
    if (loading) return "SYNCING LIVE INVENTORY…";
    if (error) return "INVENTORY TEMPORARILY UNAVAILABLE";
    return `${vehicles.length} LIVE MATCH${vehicles.length === 1 ? "" : "ES"}`;
  }, [loading, error, vehicles.length]);

  return (
    <section id="inventory" className="inventorySection">
      <div className="inventoryInner shell">
        <div className="inventoryTop">
          <div>
            <p className="eyebrow">LIVE WILLOW GROVE INVENTORY</p>
            <h2>Shop the cars here. Stay on Jon Rover.</h2>
          </div>
          <span className="inventoryStatus">{status}</span>
        </div>

        <div className="inventoryControls">
          <form
            className="inventorySearch"
            onSubmit={(event) => {
              event.preventDefault();
              loadInventory(query, type);
            }}
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Defender 110 under $90k, Range Rover Sport, dark green…"
              aria-label="Search live inventory"
            />
            <button type="submit">SEARCH →</button>
          </form>

          <div className="inventoryTabs" aria-label="Inventory type">
            {[
              ["new", "NEW"],
              ["used", "PRE-OWNED"],
              ["", "ALL"],
            ].map(([value, label]) => (
              <button
                key={label}
                className={type === value ? "active" : ""}
                onClick={() => setType(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="inventoryMessage">{error}</div>
        ) : loading ? (
          <div className="inventorySkeletonGrid">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="inventorySkeleton" key={index} />
            ))}
          </div>
        ) : vehicles.length === 0 ? (
          <div className="inventoryMessage">
            No exact match yet. Try fewer words or a broader budget.
          </div>
        ) : (
          <div className="inventoryGrid">
            {vehicles.map((vehicle) => (
              <article className="inventoryCard" key={vehicle.vin}>
                <div className="inventoryCardImage">
                  {vehicle.image ? (
                    <img src={vehicle.image} alt={vehicle.title} loading="lazy" />
                  ) : (
                    <div className="inventoryImageFallback">JON ROVER</div>
                  )}
                  <span>{vehicle.condition || "AVAILABLE"}</span>
                </div>

                <div className="inventoryCardBody">
                  <h3>{vehicle.title}</h3>
                  <div className="inventoryFacts">
                    <span>{vehicle.mileage || "0"} MI</span>
                    <span>VIN {vehicle.vin.slice(-6)}</span>
                  </div>
                  <div className="inventoryPrice">{vehicle.price}</div>
                  <div className="inventoryActions">
                    <a href={`sms:?&body=${encodeURIComponent(`Hi Jon, I'm interested in the ${vehicle.title} — VIN ending ${vehicle.vin.slice(-6)}.`)}`}>
                      TEXT JON →
                    </a>
                    <a href={vehicle.url} target="_blank" rel="noreferrer">
                      FULL DETAILS ↗
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
