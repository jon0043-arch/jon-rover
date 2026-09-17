type Props={title:string;condition:string;price:number|null};

const TERM_MONTHS=72;
const HORIZON_MONTHS=24;
const APR=0.075;
const FINANCED_TAX_FEE_ALLOWANCE=0.07;
const TARGET_EQUITY_CUSHION=0.10;

function money(value:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Math.max(0,value));}
function round500(value:number){return Math.max(0,Math.round(value/500)*500);}
function yearFromTitle(title:string){const m=title.match(/\b(20\d{2})\b/);return m?Number(m[1]):null;}
function familyFromTitle(title:string){const x=title.toLowerCase();if(x.includes("defender"))return"defender";if(x.includes("range rover sport"))return"sport";if(x.includes("velar"))return"velar";if(x.includes("evoque"))return"evoque";if(x.includes("discovery"))return"discovery";if(x.includes("range rover"))return"range-rover";if(x.includes("jaguar")||x.includes("f-pace")||x.includes("f pace")||x.includes("e-pace")||x.includes("e pace"))return"jaguar";return"other";}
function depreciationRate(title:string,condition:string){
  const year=yearFromTitle(title),currentYear=new Date().getFullYear();
  const age=year==null?(condition.toLowerCase()==="new"?0:3):Math.max(0,currentYear-year);
  const bucket=condition.toLowerCase()==="new"||age===0?0:age===1?1:age===2?2:age<=4?3:4;
  const rates:Record<string,number[]>={
    "range-rover":[0.29,0.24,0.20,0.17,0.14],
    sport:[0.26,0.22,0.18,0.15,0.13],
    defender:[0.18,0.16,0.14,0.12,0.10],
    velar:[0.24,0.20,0.17,0.14,0.12],
    evoque:[0.24,0.20,0.17,0.14,0.12],
    discovery:[0.23,0.19,0.16,0.14,0.12],
    jaguar:[0.28,0.23,0.19,0.16,0.14],
    other:[0.22,0.18,0.15,0.13,0.11],
  };
  return rates[familyFromTitle(title)][bucket];
}
function remainingBalanceFactor(){
  const monthly=APR/12;
  const paymentFactor=monthly/(1-Math.pow(1+monthly,-TERM_MONTHS));
  return Math.pow(1+monthly,HORIZON_MONTHS)-paymentFactor*((Math.pow(1+monthly,HORIZON_MONTHS)-1)/monthly);
}

export default function EquityGuard({title,condition,price}:Props){
  if(price==null||price<=0)return <div className="equityGuard equityGuardUnavailable"><div className="equityGuardHeading"><span>EQUITY GUARD</span><b>24-MO OUTLOOK</b></div><p>Down-payment guidance will appear when a selling price is available.</p></div>;
  const rate=depreciationRate(title,condition);
  const projectedValue=Math.round(price*(1-rate));
  const projectedLoss=price-projectedValue;
  const balanceFactor=remainingBalanceFactor();
  const estimatedAmountFinanced=price*(1+FINANCED_TAX_FEE_ALLOWANCE);
  const breakEvenDown=round500(estimatedAmountFinanced-(projectedValue/balanceFactor));
  const targetBalance=projectedValue*(1-TARGET_EQUITY_CUSHION);
  const targetDown=round500(estimatedAmountFinanced-(targetBalance/balanceFactor));
  return <div className="equityGuard">
    <div className="equityGuardHeading"><span>EQUITY GUARD</span><b>24-MO OUTLOOK</b></div>
    <div className="equityGuardGrid">
      <div><small>EST. VALUE</small><strong>{money(projectedValue)}</strong></div>
      <div><small>EST. DEPRECIATION</small><strong>−{money(projectedLoss)}</strong></div>
      <div className="equityGuardTarget"><small>DOWN PAYMENT TARGET</small><strong>{money(targetDown)}</strong></div>
    </div>
    <p>Designed to target about 10% projected equity after 24 months. Estimated break-even down payment: <b>{money(breakEvenDown)}</b>.</p>
    <details><summary>HOW THIS ESTIMATE WORKS</summary><p>This planning model uses the vehicle&apos;s age, condition and model family to estimate 24-month depreciation, then compares that value with a 72-month loan at 7.5% APR while allowing about 7% for financed taxes and fees. Actual market value, APR, taxes, fees and loan balance can differ. This is an estimate, not a guarantee or financial recommendation.</p></details>
  </div>;
}
