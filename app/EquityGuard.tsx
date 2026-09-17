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

  if(price==null||price<=0)return null;
  if(!estimate)return null;

  const projectedTradeValue=estimate.projectedTradeValue;
  const estimatedTaxAndRegistration=Math.round(price*ESTIMATED_TAX_REG_ALLOWANCE);
  const estimatedOutTheDoor=price+estimatedTaxAndRegistration;
  const balanceFactor=remainingBalanceFactor();
  const exactBreakEvenDown=Math.max(0,estimatedOutTheDoor-(projectedTradeValue/balanceFactor));
  const breakEvenDown=ceil500(exactBreakEvenDown);
  const tenPercentFloor=ceil500(price*PLANNING_DOWN_FLOOR);
  const targetDown=Math.max(tenPercentFloor,breakEvenDown);
  const amountFinanced=Math.max(0,estimatedOutTheDoor-targetDown);
  const projectedLoanBalance=Math.round(amountFinanced*balanceFactor);

  return <div className="equityGuard equityGuardCompact">
    <div className="equityGuardHeading"><span>EQUITY GUARD</span><b>3-YEAR OUTLOOK</b></div>
    <div className="equityGuardHero">
      <div><small>SUGGESTED DOWN</small><strong>{money(targetDown)}</strong></div>
      <p>A planning target designed to help keep you around break-even when you trade in about 3 years.</p>
    </div>
    <details>
      <summary>SEE ESTIMATE</summary>
      <div className="equityGuardDetailGrid">
        <div><small>EST. TRADE VALUE</small><strong>{money(projectedTradeValue)}</strong></div>
        <div><small>EST. LOAN BALANCE</small><strong>{money(projectedLoanBalance)}</strong></div>
        <div><small>PURE BREAK-EVEN DOWN</small><strong>{money(breakEvenDown)}</strong></div>
      </div>
      <p>The displayed target is the higher of a 10% planning floor or the estimated down payment needed to be around break-even after 36 months.</p>
      <p className="equityGuardDisclaimer">Estimate only. Assumes a 72-month loan at 7.5% APR, about 10,000 miles per year, and estimated tax, title and registration. Actual financing, vehicle condition, mileage, market values and trade offers will vary. Not a trade appraisal, financing offer, guaranteed future value or financial advice.</p>
    </details>
  </div>;
}
