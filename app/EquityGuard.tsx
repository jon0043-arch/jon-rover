import { projectDepreciation, type DepreciationProjection } from "./lib/depreciation";

type Props={title:string;condition:string;price:number|null;mileage:number|null;projection?:DepreciationProjection|null};

const TERM_MONTHS=72;
const HORIZON_MONTHS=36;
const APR=0.075;
const FINANCED_TAX_FEE_ALLOWANCE=0.07;

function money(value:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Math.max(0,value));}
function signedMoney(value:number){const formatted=money(Math.abs(value));return value>=0?`+${formatted}`:`−${formatted}`;}
function round500(value:number){return Math.max(0,Math.round(value/500)*500);}
function remainingBalanceFactor(){const monthly=APR/12;const paymentFactor=monthly/(1-Math.pow(1+monthly,-TERM_MONTHS));return Math.pow(1+monthly,HORIZON_MONTHS)-paymentFactor*((Math.pow(1+monthly,HORIZON_MONTHS)-1)/monthly);}

export default function EquityGuard({title,condition,price,mileage,projection}:Props){
  if(price==null||price<=0)return <div className="equityGuard equityGuardUnavailable"><div className="equityGuardHeading"><span>EQUITY GUARD</span><b>3-YEAR OUTLOOK</b></div><p>Down-payment guidance will appear when a selling price is available.</p></div>;

  const estimate=projection||projectDepreciation({title,condition,price,mileage},[{title,condition,price,mileage}]);
  if(!estimate)return null;
  const projectedTradeValue=estimate.projectedTradeValue;
  const estimatedTaxesAndFees=Math.round(price*FINANCED_TAX_FEE_ALLOWANCE);
  const estimatedOutTheDoor=price+estimatedTaxesAndFees;
  const targetDown=round500(estimatedOutTheDoor-projectedTradeValue);
  const balanceFactor=remainingBalanceFactor();
  const amountFinanced=Math.max(0,estimatedOutTheDoor-targetDown);
  const projectedLoanBalance=Math.round(amountFinanced*balanceFactor);
  const projectedTradeEquity=projectedTradeValue-projectedLoanBalance;
  const breakEvenDown=round500(estimatedOutTheDoor-(projectedTradeValue/balanceFactor));
  const calibrationLabel=estimate.basis==="live-inventory-calibrated"?`Calibrated from ${estimate.marketSampleSize} comparable live listings across ${estimate.marketYearCount} model years.`:"Uses Jon Rover's model-and-age curve because there are not enough comparable live listings yet.";

  return <div className="equityGuard">
    <div className="equityGuardHeading"><span>EQUITY GUARD</span><b>3-YEAR TRADE OUTLOOK</b></div>
    <div className="equityGuardGrid">
      <div><small>EST. TRADE VALUE</small><strong>{money(projectedTradeValue)}</strong></div>
      <div><small>EST. 3-YR EQUITY</small><strong>{signedMoney(projectedTradeEquity)}</strong></div>
      <div className="equityGuardTarget"><small>DOWN PAYMENT TARGET</small><strong>{money(targetDown)}</strong></div>
    </div>
    <p>The target is based on the estimated gap between today&apos;s out-the-door cost and this vehicle&apos;s projected <b>trade-in value after 3 years</b>. It includes about <b>{money(estimatedTaxesAndFees)}</b> in estimated taxes and fees.</p>
    <details><summary>HOW THIS ESTIMATE WORKS</summary><p>Equity Guard v2 starts with this exact vehicle&apos;s current asking price, model, model year and mileage. It compares the model with current Willow Grove inventory by model family and, when enough data exists, trim tier and model year to estimate the live price-aging curve. That live curve is blended with a model-and-age fallback so a small or unusual inventory sample cannot swing the result too far. The projection assumes about 10,000 additional miles per year and adjusts the future trade-to-retail spread for vehicle price and projected mileage. {calibrationLabel} Projected mileage at 36 months is about <b>{estimate.projectedMileage.toLocaleString()} miles</b>. Confidence: <b>{estimate.confidence}</b>. For reference, the mathematical minimum down needed to avoid projected negative equity at month 36 on a 72-month loan at 7.5% APR is about <b>{money(breakEvenDown)}</b>. Actual trade offers, market conditions, mileage, condition, APR, taxes, registration, documentation fees, trade credits and loan structure can differ. This is an estimate, not a guarantee or financial recommendation.</p></details>
  </div>;
}
