"use client";

import { useEffect, useState } from "react";
import { projectDepreciation, type DepreciationProjection, type DepreciationVehicle } from "./lib/depreciation";

type Props={title:string;condition:string;price:number|null;mileage?:number|null;projection?:DepreciationProjection|null};

const TERM_MONTHS=72;
const HORIZON_MONTHS=36;
const APR=0.075;
const ESTIMATED_TAX_REG_ALLOWANCE=0.07;
const DOC_FEE=490;
const PLANNING_DOWN_FLOOR=0.10;
let marketPromise:Promise<DepreciationVehicle[]>|null=null;

function money(value:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Math.max(0,value));}
function ceil500(value:number){return Math.max(0,Math.ceil(value/500)*500);}
function remainingBalanceFactor(){const monthly=APR/12;const paymentFactor=monthly/(1-Math.pow(1+monthly,-TERM_MONTHS));return Math.pow(1+monthly,HORIZON_MONTHS)-paymentFactor*((Math.pow(1+monthly,HORIZON_MONTHS)-1)/monthly);}
function normalizedTitle(value:string){return value.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}
function loadMarket(){
  if(!marketPromise)marketPromise=fetch("/api/inventory/catalog?condition=all",{cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error("market unavailable");const data=await r.json();return(Array.isArray(data?.vehicles)?data.vehicles:[]).map((v:any)=>({title:String(v.title||""),condition:String(v.condition||"used"),mileage:v.mileage==null?null:Number(v.mileage),price:v.price==null?null:Number(v.price)})).filter((v:DepreciationVehicle)=>v.title&&v.price!=null);}).catch(()=>[]);
  return marketPromise;
}

export default function EquityGuard({title,condition,price,mileage=null,projection}:Props){
  const vehicleValuePrice=price==null?null:Math.max(0,price-DOC_FEE);
  const localVehicle={title,condition,price:vehicleValuePrice,mileage};
  const[estimate,setEstimate]=useState<DepreciationProjection|null>(()=>projection||projectDepreciation(localVehicle,[localVehicle]));
  useEffect(()=>{
    if(projection){setEstimate(projection);return;}
    let active=true;
    loadMarket().then(market=>{
      if(!active||!market.length)return;
      const exact=market.find(v=>normalizedTitle(v.title)===normalizedTitle(title)&&v.price===vehicleValuePrice)||market.find(v=>normalizedTitle(v.title)===normalizedTitle(title));
      const vehicle:DepreciationVehicle={title,condition,price:vehicleValuePrice,mileage:exact?.mileage??mileage??null};
      const next=projectDepreciation(vehicle,market);
      if(next)setEstimate(next);
    });
    return()=>{active=false};
  },[title,condition,price,mileage,projection,vehicleValuePrice]);

  if(price==null||price<=0)return <div className="equityGuard equityGuardUnavailable"><div className="equityGuardHeading"><span>EQUITY GUARD</span><b>3-YEAR OUTLOOK</b></div><p>Down-payment guidance will appear when an advertised price is available.</p><p className="equityGuardDisclaimer">Estimate only. Not a trade appraisal, loan quote, lending decision or financial advice.</p></div>;
  if(!estimate)return null;

  const projectedTradeValue=estimate.projectedTradeValue;
  const estimatedTaxAndRegistration=Math.round(price*ESTIMATED_TAX_REG_ALLOWANCE);
  const estimatedOutTheDoor=price+estimatedTaxAndRegistration;
  const balanceFactor=remainingBalanceFactor();

  // Pure break-even math: enough cash down today so the projected month-36 loan balance
  // is no higher than the projected month-36 trade value.
  const exactBreakEvenDown=Math.max(0,estimatedOutTheDoor-(projectedTradeValue/balanceFactor));
  const breakEvenDown=ceil500(exactBreakEvenDown);

  // Planning target: never show less than a 10% down-payment planning floor. If the
  // projected break-even requirement is higher than that floor, use the higher amount.
  // This is a planning heuristic, not a universal recommendation.
  const tenPercentFloor=ceil500(price*PLANNING_DOWN_FLOOR);
  const targetDown=Math.max(tenPercentFloor,breakEvenDown);
  const amountFinanced=Math.max(0,estimatedOutTheDoor-targetDown);
  const projectedLoanBalance=Math.round(amountFinanced*balanceFactor);
  const projectedBuffer=projectedTradeValue-projectedLoanBalance;
  const calibrationLabel=estimate.basis==="live-inventory-calibrated"?`Calibrated from ${estimate.marketSampleSize} comparable live listings across ${estimate.marketYearCount} model years.`:"Uses Jon Rover's model-and-age curve because there are not enough comparable live listings yet.";

  return <div className="equityGuard">
    <div className="equityGuardHeading"><span>EQUITY GUARD</span><b>3-YEAR TRADE OUTLOOK</b></div>
    <div className="equityGuardGrid">
      <div><small>EST. TRADE VALUE</small><strong>{money(projectedTradeValue)}</strong></div>
      <div><small>EST. LOAN BALANCE</small><strong>{money(projectedLoanBalance)}</strong></div>
      <div className="equityGuardTarget"><small>TARGET DOWN</small><strong>{money(targetDown)}</strong></div>
    </div>
    <p>Equity Guard uses the <b>higher of a 10% planning floor or the estimated amount needed to be about break-even after 3 years</b>. For this vehicle, the 10% floor is <b>{money(tenPercentFloor)}</b> and the pure break-even calculation is <b>{money(breakEvenDown)}</b>. The advertised price already includes the dealership&apos;s <b>{money(DOC_FEE)} documentation fee</b>; the model adds about <b>{money(estimatedTaxAndRegistration)}</b> for estimated tax, title and registration.</p>
    <p className="equityGuardDisclaimer">Estimate only — not a guaranteed future value, trade appraisal, financing offer, lending decision or financial advice. A 10% down-payment floor is a planning heuristic, not a rule that fits every buyer. Tax, title, registration and other government charges vary by buyer and jurisdiction.</p>
    <details><summary>HOW THIS ESTIMATE WORKS</summary><p>Equity Guard v2 starts with this vehicle&apos;s current vehicle price, model, model year and mileage. The displayed advertised price includes the <b>{money(DOC_FEE)} dealer documentation fee</b>, but that fee is excluded from the vehicle-value depreciation curve so it is not treated as resale value. The depreciation engine compares the vehicle with current Willow Grove inventory by model family and, when enough data exists, trim tier and model year to estimate a live price-aging curve. That live curve is blended with a model-and-age fallback so a small or unusual inventory sample cannot swing the result too far. The projection assumes about 10,000 additional miles per year and adjusts the future trade-to-retail spread for vehicle price and projected mileage. {calibrationLabel} Projected mileage at 36 months is about <b>{estimate.projectedMileage.toLocaleString()} miles</b>. Confidence: <b>{estimate.confidence}</b>. The financing model assumes a 72-month loan at 7.5% APR. The target down payment is the greater of 10% of the advertised price or the amount calculated to make the projected month-36 loan balance approximately equal to projected month-36 trade value. At the displayed target, the modeled difference between projected trade value and loan balance is about <b>{projectedBuffer>=0?money(projectedBuffer):`-${money(Math.abs(projectedBuffer))}`}</b>. Actual APR, credit approval, loan term, lender fees, sales tax, title, registration, trade tax credits, add-ons, rebates, incentives, vehicle condition, accident history, options, mileage, regional demand, market conditions and actual trade offers can materially change the result. Listing prices are not completed transaction prices, and projected trade values are estimates only. No future value, equity position or break-even outcome is guaranteed.</p></details>
  </div>;
}
