type Props={title:string;condition:string;price:number|null};

const TERM_MONTHS=72;
const HORIZON_MONTHS=36;
const APR=0.075;
const FINANCED_TAX_FEE_ALLOWANCE=0.07;
const TRADE_TO_RETAIL_FACTOR=0.88;

function money(value:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Math.max(0,value));}
function signedMoney(value:number){const formatted=money(Math.abs(value));return value>=0?`+${formatted}`:`−${formatted}`;}
function round500(value:number){return Math.max(0,Math.round(value/500)*500);}
function yearFromTitle(title:string){const m=title.match(/\b(20\d{2})\b/);return m?Number(m[1]):null;}
function familyFromTitle(title:string){const x=title.toLowerCase();if(x.includes("defender"))return"defender";if(x.includes("range rover sport"))return"sport";if(x.includes("velar"))return"velar";if(x.includes("evoque"))return"evoque";if(x.includes("discovery"))return"discovery";if(x.includes("range rover"))return"range-rover";if(x.includes("jaguar")||x.includes("f-pace")||x.includes("f pace")||x.includes("e-pace")||x.includes("e pace"))return"jaguar";return"other";}
function base24MonthDepreciationRate(title:string,condition:string){
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
function depreciationRate(title:string,condition:string){
  const rate24=base24MonthDepreciationRate(title,condition);
  return 1-Math.pow(1-rate24,HORIZON_MONTHS/24);
}
function remainingBalanceFactor(){
  const monthly=APR/12;
  const paymentFactor=monthly/(1-Math.pow(1+monthly,-TERM_MONTHS));
  return Math.pow(1+monthly,HORIZON_MONTHS)-paymentFactor*((Math.pow(1+monthly,HORIZON_MONTHS)-1)/monthly);
}

export default function EquityGuard({title,condition,price}:Props){
  if(price==null||price<=0)return <div className="equityGuard equityGuardUnavailable"><div className="equityGuardHeading"><span>EQUITY GUARD</span><b>3-YEAR OUTLOOK</b></div><p>Down-payment guidance will appear when a selling price is available.</p></div>;

  const rate=depreciationRate(title,condition);
  const projectedRetailValue=Math.round(price*(1-rate));
  const projectedTradeValue=Math.round(projectedRetailValue*TRADE_TO_RETAIL_FACTOR);
  const estimatedTaxesAndFees=Math.round(price*FINANCED_TAX_FEE_ALLOWANCE);
  const estimatedOutTheDoor=price+estimatedTaxesAndFees;

  // Equity Guard target: cover the modeled gap between today's estimated out-the-door cost
  // and the vehicle's projected 3-year trade value. This keeps the target tied directly to
  // expected trade-value loss instead of allowing loan amortization to drive the answer to $0.
  const targetDown=round500(estimatedOutTheDoor-projectedTradeValue);

  const balanceFactor=remainingBalanceFactor();
  const amountFinanced=Math.max(0,estimatedOutTheDoor-targetDown);
  const projectedLoanBalance=Math.round(amountFinanced*balanceFactor);
  const projectedTradeEquity=projectedTradeValue-projectedLoanBalance;

  // Also show the mathematical minimum down needed merely to avoid being upside-down at month 36.
  const breakEvenDown=round500(estimatedOutTheDoor-(projectedTradeValue/balanceFactor));

  return <div className="equityGuard">
    <div className="equityGuardHeading"><span>EQUITY GUARD</span><b>3-YEAR TRADE OUTLOOK</b></div>
    <div className="equityGuardGrid">
      <div><small>EST. TRADE VALUE</small><strong>{money(projectedTradeValue)}</strong></div>
      <div><small>EST. 3-YR EQUITY</small><strong>{signedMoney(projectedTradeEquity)}</strong></div>
      <div className="equityGuardTarget"><small>DOWN PAYMENT TARGET</small><strong>{money(targetDown)}</strong></div>
    </div>
    <p>The target is based on the estimated gap between today&apos;s out-the-door cost and this vehicle&apos;s projected <b>trade-in value after 3 years</b>. It includes about <b>{money(estimatedTaxesAndFees)}</b> in estimated taxes and fees. At that target, projected 3-year trade equity is about <b>{money(projectedTradeEquity)}</b>.</p>
    <details><summary>HOW THIS ESTIMATE WORKS</summary><p>This planning model estimates the vehicle&apos;s 36-month retail value from its age, condition and model family, then applies a conservative trade-value allowance of about 88% of projected retail value. The down-payment target is the modeled difference between today&apos;s estimated out-the-door cost (vehicle price plus roughly 7% for taxes and fees) and that projected trade value. For reference, the mathematical minimum down needed to avoid projected negative equity at month 36 on a 72-month loan at 7.5% APR is about <b>{money(breakEvenDown)}</b>. Actual trade offers, mileage, condition, APR, sales tax, registration, documentation fees, trade credits and loan structure can differ. This is an estimate, not a guarantee or financial recommendation.</p></details>
  </div>;
}
