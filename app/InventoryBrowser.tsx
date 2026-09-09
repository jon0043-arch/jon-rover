"use client";

import { useEffect, useMemo, useState } from "react";

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
  pickLabel?: string | null;
  why?: string | null;
};

type Props = {
  initialQuery?: string;
  requestSignal?: number;
};

function money(value: number | null) {
  if (value == null) return "Call for price";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function miles(value: number | null) {
  if (value == null) return "Mileage unavailable";
  return `${new Intl.NumberFormat("en-US").format(value)} mi`;
}

export default function InventoryBrowser({ initialQuery = "", requestSignal = 0 }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [condition, setCondition] = useState("all");
  const [total, setTotal] = useState(0);

  async function loadInventory(nextQuery: string, nextCondition: string) {
    setLoading(true);
    setError("");
    setActiveQuery(nextQuery.trim());

    try {
      const params = new URLSearchParams({
        limit: nextQuery.trim() ? "3" : "9",
        condition: nextCondition,
      });
      if (nextQuery.trim()) params.set("q", nextQuery.trim());

      const response = await fetch(`/api/inventory?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not load inventory");

      setVehicles(data.vehicles || []);
      setTotal(data.total || 0);
    } catch (err) {
      setVehicles([]);
      setError(err instanceof Error ? err.message : "Could not load inventory");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setQuery(initialQuery);
    loadInventory(initialQuery, condition);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestSignal]);

  const status = useMemo(() => {
    if (loading) return "SEARCHING WILLOW GROVE…";
    if (error) return "INVENTORY TEMPORARILY UNAVAILABLE";
    if (activeQuery) return vehicles.length === 3 ? "JON'S 3 PICKS" : `${vehicles.length} JON PICK${vehicles.length === 1 ? "" : "S"}`;
    return `${total || vehicles.length} VEHICLES CONNECTED`;
  }, [loading, error, vehicles.length, activeQuery, total]);

  const heading = activeQuery ? "Jon's 3 picks for you." : "Shop the actual Willow Grove inventory.";

  return (
    <section id="inventory" className="inventorySection">
      <div className="inventoryInner shell">
        <div className="inventoryTop">
          <div>
            <p className="eyebrow">LIVE WILLOW GROVE INVENTORY</p>
            <h2>{heading}</h2>
            {activeQuery ? <p className="inventoryQueryEcho">Based on: “{activeQuery}”</p> : null}
          </div>
          <span className="inventoryStatus">{status}</span>
        </div>

        <div className="inventoryControls">
          <form
            className="inventorySearch"
            onSubmit={(event) => {
              event.preventDefault();
              loadInventory(query, condition);
            }}
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="3 kids, sporty, under $90k, not too huge…"
              aria-label="Search live inventory"
            />
            <button type="submit">GET JON'S 3 PICKS →</button>
          </form>

          <div className="inventoryTabs" aria-label="Inventory type">
            {[
              ["all", "ALL"],
              ["new", "NEW"],
              ["used", "PRE-OWNED"],
            ].map(([value, label]) => (
              <button
                key={label}
                className={condition === value ? "active" : ""}
                onClick={() => {
                  setCondition(value);
                  loadInventory(query, value);
                }}
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
            {Array.from({ length: activeQuery ? 3 : 6 }).map((_, index) => (
              <div className="inventorySkeleton" key={index} />
            ))}
          </div>
        ) : vehicles.length === 0 ? (
          <div className="inventoryMessage">
            I couldn&apos;t find a useful match for that request. Try changing the budget or leaving the New / Pre-Owned filter on ALL.
          </div>
        ) : (
          <div className={`inventoryGrid ${activeQuery ? "inventoryPicksGrid" : ""}`}>
            {vehicles.map((vehicle) => {
              const sms = encodeURIComponent(
                `Hi Jon, I'm interested in the ${vehicle.title} — VIN ${vehicle.vin}${vehicle.stock ? `, stock ${vehicle.stock}` : ""}.`
              );

              return (
                <article className={`inventoryCard ${vehicle.pickLabel ? "inventoryPickCard" : ""}`} key={vehicle.vin}>
                  <div className="inventoryCardImage">
                    {vehicle.image ? (
                      <img src={vehicle.image} alt={vehicle.title} loading="lazy" />
                    ) : (
                      <img src="/hero-defender.png" alt={vehicle.title} loading="lazy" />
                    )}
                    <span>{vehicle.condition || "AVAILABLE"}</span>
                    {vehicle.pickLabel ? <strong className="inventoryPickBadge">{vehicle.pickLabel}</strong> : null}
                  </div>

                  <div className="inventoryCardBody">
                    <div className="inventoryCardTopline">
                      <span>{vehicle.exterior || "JLR WILLOW GROVE"}</span>
                      {vehicle.stock ? <span>STOCK {vehicle.stock}</span> : null}
                    </div>
                    <h3>{vehicle.title}</h3>
                    <div className="inventoryFacts">
                      <span>{miles(vehicle.mileage)}</span>
                      <span>VIN {vehicle.vin.slice(-6)}</span>
                    </div>
                    <div className="inventoryPrice">{money(vehicle.price)}</div>

                    {vehicle.why ? (
                      <div className="inventoryWhy">
                        <span>WHY JON PICKED IT</span>
                        <p>{vehicle.why}</p>
                      </div>
                    ) : null}

                    <div className="inventoryActions">
                      <a className="inventoryPrimary" href={`sms:?body=${sms}`}>TEXT JON ABOUT THIS ONE →</a>
                      <a className="inventorySecondary" href={vehicle.url} target="_blank" rel="noreferrer">SOURCE SPECS ↗</a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
