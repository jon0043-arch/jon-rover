"use client";

import { useEffect, useState } from "react";
import { projectDepreciation, type DepreciationProjection, type DepreciationVehicle } from "./lib/depreciation";

type Props={title:string;condition:string;price:number|null;mileage?:number|null;projection?:DepreciationProjection|null};

const TERM_MONTHS=72;
const HORIZON_MONTHS=36;
const APR=0.075;
const FINANCED_TAX_FEE_ALLOWANCE=0.07;
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
  const localVehicle={title,condition,price,mileage};
  const[estimate,setEstimate]=useState<DepreciationProjection|null>(()=>projection||projectDepreciation(localVehicle,[localVehicle]));
  useEffect(()=>{
    if(projection){setEstimate(projection);return;}
    let active=true;
    loadMarket().then(market=>{
      if(!active||!market.length)return;
      const exact=market.find(v=>normalizedTitle(v.title)===normalizedTitle(title)&&v.price===price)||market.find(v=>normalizedTitle(v.title)===normalizedTitle(title));
      const vehicle:DepreciationVehicle={title,condition,price,mileage:exact?.mileage??mileage??null};
      const next=projectDepreciation(vehicle,market);
      if(next)setEstimate(next);
    });
    return()=>{active=false};
  },[title,condition,price,mileage,projection]);

  if(price==null||price<=0)return <div className="equityGuard equityGuardUnavailable"><div className="equityGuardHeading"><span>EQUITY GUARD</span><b>3-YEAR OUTLOOK</b></div><p>Down-payment guidance will appear when a selling price is available.</p></div>;
  if(!estimate)return null;

  const projectedTradeValue=estimate.projectedTradeValue;
  const estimatedTaxesAndFees=Math.round(price*FINANCED_TAX_FEE_ALLOWANCE);
  const estimatedOutTheDoor=price+estimatedTaxesAndFees;
  const balanceFactor=remainingBalanceFactor();

  // Break-even target: enough cash down today so the projected 36-month loan balance
  // is no higher than the projected 36-month trade value. Round UP to the next $500
  // so display rounding does not accidentally leave the customer projected upside-down.
  const exactBreakEvenDown=Math.max(0,estimatedOutTheDoor-(projectedTradeValue/balanceFactor));
  const targetDown=ceil500(exactBreakEvenDown);
  const amountFinanced=Math.max(0,estimatedOutTheDoor-targetDown);
  const projectedLoanBalance=Math.round(amountFinanced*balanceFactor);
  const projectedBuffer=Math.max(0,projectedTradeValue-projectedLoanBalance);
  const calibrationLabel=estimate.basis==="live-inventory-calibrated"?`Calibrated from ${estimate.marketSampleSize} comparable live listings across ${estimate.marketYearCount} model years.`:"Uses Jon Rover's model-and-age curve because there are not enough comparable live listings yet.";

  return <div className="equityGuard">
    <div className="equityGuardHeading"><span>EQUITY GUARD</span><b>3-YEAR BREAK-EVEN OUTLOOK</b></div>
    <div className="equityGuardGrid">
      <div><small>EST. TRADE VALUE</small><strong>{money(projectedTradeValue)}</strong></div>
      <div><small>EST. LOAN BALANCE</small><strong>{money(projectedLoanBalance)}</strong></div>
      <div className="equityGuardTarget"><small>BREAK-EVEN DOWN</small><strong>{money(targetDown)}</strong></div>
    </div>
    <p>This is the estimated down payment needed so the projected <b>loan balance and trade-in value are about even after 3 years</b>. It includes about <b>{money(estimatedTaxesAndFees)}</b> in estimated taxes and fees. Because the target rounds up to the next $500, the model currently leaves about <b>{money(projectedBuffer)}</b> of cushion.</p>
    <details><summary>HOW THIS ESTIMATE WORKS</summary><p>Equity Guard v2 starts with this exact vehicle&apos;s current asking price, model, model year and mileage. It compares the vehicle with current Willow Grove inventory by model family and, when enough data exists, trim tier and model year to estimate the live price-aging curve. That live curve is blended with a model-and-age fallback so a small or unusual inventory sample cannot swing the result too far. The projection assumes about 10,000 additional miles per year and adjusts the future trade-to-retail spread for vehicle price and projected mileage. {calibrationLabel} Projected mileage at 36 months is about <b>{estimate.projectedMileage.toLocaleString()} miles</b>. Confidence: <b>{estimate.confidence}</b>. The financing model assumes a 72-month loan at 7.5% APR and roughly 7% for financed taxes and fees. The break-even down payment is the amount that makes the projected month-36 loan balance approximately equal to the projected month-36 trade value. Actual trade offers, market conditions, mileage, condition, APR, taxes, registration, documentation fees, trade credits and loan structure can differ. This is an estimate, not a guarantee or financial recommendation.</p></details>
  </div>;
}
