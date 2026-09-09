"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [condition, setCondition] = useState("all");
  const [total, setTotal] = useState(0);
  const [aiPowered, setAiPowered] = useState(false);
  const [missingAiKey, setMissingAiKey] = useState(false);
  const requestIdRef = useRef(0);
  const hasMountedRef = useRef(false);

  async function loadInventory(nextQuery = query, nextCondition = condition) {
    const cleaned = nextQuery.trim();
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError("");
    setAiPowered(false);
    setMissingAiKey(false);

    try {
      const params = new URLSearchParams({
        limit: cleaned ? "15" : "12",
        condition: nextCondition,
      });
      if (cleaned) params.set("q", cleaned);

      const response = await fetch(`/api/inventory?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not load inventory");
      if (requestId !== requestIdRef.current) return;

      setTotal(data.total || 0);
      const candidates: Vehicle[] = data.vehicles || [];

      if (!cleaned) {
        setVehicles(candidates);
        return;
      }

      if (candidates.length === 0) {
        setVehicles([]);
        return;
      }

      const recommendationResponse = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: cleaned, vehicles: candidates }),
      });
      const recommendationData = await recommendationResponse.json();
      if (!recommendationResponse.ok) {
        throw new Error(recommendationData?.error || "AI recommendation failed");
      }
      if (requestId !== requestIdRef.current) return;

      setVehicles((recommendationData.picks || candidates.slice(0, 3)).slice(0, 3));
      setAiPowered(Boolean(recommendationData.ai));
      setMissingAiKey(Boolean(recommendationData.missingKey));
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setVehicles([]);
      setError(err instanceof Error ? err.message : "Could not load inventory");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }

  // Any request coming from the hero/model finder immediately runs the full
  // Jon's 3 Picks flow. There is no intermediate raw-results state anymore.
  useEffect(() => {
    setQuery(initialQuery);
    loadInventory(initialQuery, condition);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestSignal]);

  // Changing ALL / NEW / PRE-OWNED should re-run the same request, but skip
  // this on first mount so it cannot race the requestSignal effect above.
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    loadInventory(query, condition);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condition]);

  const isPickMode = query.trim().length > 0;

  const status = useMemo(() => {
    if (loading) return isPickMode ? "JON IS CHECKING THE INVENTORY…" : "CHECKING WILLOW GROVE NOW…";
    if (error) return "LIVE INVENTORY TEMPORARILY UNAVAILABLE";
    if (isPickMode && aiPowered) return `${vehicles.length} AI-CURATED JON'S PICKS`;
    if (isPickMode && missingAiKey) return `${vehicles.length} JON'S PICKS · AI KEY NEEDED`;
    if (isPickMode) return `${vehicles.length} OF JON'S PICKS`;
    return `${total || vehicles.length} VEHICLES CONNECTED`;
  }, [loading, error, vehicles.length, isPickMode, total, aiPowered, missingAiKey]);

  return (
    <section id="inventory" className={`inventorySection ${isPickMode ? "inventoryPickMode" : ""}`}>
      <div className="inventoryInner shell">
        <div className="inventoryTop">
          <div>
            <p className="eyebrow">{isPickMode ? "JON'S 3 PICKS" : "LIVE WILLOW GROVE INVENTORY"}</p>
            <h2>
              {isPickMode
                ? "Three vehicles I'd put at the top of your list."
                : "Shop the actual inventory without leaving Jon Rover."}
            </h2>
            {isPickMode && aiPowered ? (
              <p className="inventoryQueryEcho">I matched your request against the live inventory and narrowed it to these three.</p>
            ) : null}
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
              aria-label="Tell Jon what you are looking for"
            />
            <button type="submit">{query.trim() ? "REFINE MY 3 PICKS →" : "SEARCH →"}</button>
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
                onClick={() => setCondition(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="inventoryMessage">
            <strong>Live inventory couldn't load.</strong>
            <span>{error}</span>
            <button type="button" onClick={() => loadInventory(query, condition)}>TRY AGAIN →</button>
          </div>
        ) : loading ? (
          <div className="inventorySkeletonGrid">
            {Array.from({ length: isPickMode ? 3 : 6 }).map((_, index) => (
              <div className="inventorySkeleton" key={index} />
            ))}
          </div>
        ) : vehicles.length === 0 ? (
          <div className="inventoryMessage">
            No strong match yet. Try something like “3 kids, sporty, under $90k, not too huge.”
          </div>
        ) : (
          <div className={`inventoryGrid ${isPickMode ? "inventoryPicksGrid" : ""}`}>
            {vehicles.map((vehicle, index) => {
              const sms = encodeURIComponent(
                `Hi Jon, I'm interested in the ${vehicle.title} — VIN ${vehicle.vin}${vehicle.stock ? `, stock ${vehicle.stock}` : ""}.`
              );

              return (
                <article className={`inventoryCard ${isPickMode ? "inventoryPickCard" : ""}`} key={vehicle.vin}>
                  <div className="inventoryCardImage">
                    {vehicle.image ? (
                      <img src={vehicle.image} alt={vehicle.title} loading="lazy" />
                    ) : (
                      <img src="/hero-defender.png" alt={vehicle.title} loading="lazy" />
                    )}
                    <span>{vehicle.pickLabel || vehicle.condition || "AVAILABLE"}</span>
                    {isPickMode ? <div className="inventoryPickBadge">0{index + 1}</div> : null}
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

                    {isPickMode ? (
                      <div className="inventoryWhy">
                        <span>WHY JON PICKED IT</span>
                        <p>{vehicle.why || `Pick ${index + 1} based on what you told me matters most.`}</p>
                      </div>
                    ) : null}

                    {vehicle.features?.length ? (
                      <div className="inventoryFeatureRow">
                        {vehicle.features.slice(0, 3).map((feature) => <span key={feature}>{feature}</span>)}
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
