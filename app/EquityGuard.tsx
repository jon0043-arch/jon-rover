type Props={title:string;condition:string;price:number|null};

const TERM_MONTHS=72;
const HORIZON_MONTHS=36;
const APR=0.075;
const FINANCED_TAX_FEE_ALLOWANCE=0.07;
const TRADE_TO_RETAIL_FACTOR=0.88;
const TARGET_EQUITY_CUSHION=0.10;

function money(value:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Math.max(0,value));}
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
  // Extend the existing model to a 36-month horizon using an equivalent monthly decay rate.
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
  const balanceFactor=remainingBalanceFactor();
  const estimatedTaxesAndFees=Math.round(price*FINANCED_TAX_FEE_ALLOWANCE);
  const estimatedAmountFinanced=price+estimatedTaxesAndFees;

  // Minimum cash down needed so the projected loan balance is no higher than estimated trade value.
  const breakEvenDown=round500(estimatedAmountFinanced-(projectedTradeValue/balanceFactor));

  // Target a 10% cushion below projected trade value, not projected retail value.
  const targetBalance=projectedTradeValue*(1-TARGET_EQUITY_CUSHION);
  const targetDown=round500(estimatedAmountFinanced-(targetBalance/balanceFactor));
  const projectedLoanBalance=Math.round(Math.max(0,estimatedAmountFinanced-targetDown)*balanceFactor);
  const projectedTradeEquity=Math.max(0,projectedTradeValue-projectedLoanBalance);

  return <div className="equityGuard">
    <div className="equityGuardHeading"><span>EQUITY GUARD</span><b>3-YEAR TRADE OUTLOOK</b></div>
    <div className="equityGuardGrid">
      <div><small>EST. TRADE VALUE</small><strong>{money(projectedTradeValue)}</strong></div>
      <div><small>EST. LOAN BALANCE</small><strong>{money(projectedLoanBalance)}</strong></div>
      <div className="equityGuardTarget"><small>DOWN PAYMENT TARGET</small><strong>{money(targetDown)}</strong></div>
    </div>
    <p>Built around estimated <b>trade-in value after 3 years</b>. At the target down payment, projected trade equity is about <b>{money(projectedTradeEquity)}</b>. Estimated minimum down to avoid negative trade equity: <b>{money(breakEvenDown)}</b>.</p>
    <details><summary>HOW THIS ESTIMATE WORKS</summary><p>This planning model estimates the vehicle&apos;s 36-month retail value from its age, condition and model family, then applies a conservative trade-value allowance of about 88% of projected retail value. The estimated amount financed includes the vehicle price plus about <b>{money(estimatedTaxesAndFees)}</b> in taxes and fees (modeled at roughly 7%), then compares that amount with a 72-month loan at 7.5% APR. The displayed target aims for the projected loan balance to sit about 10% below estimated trade value after 36 months. Actual trade offers, mileage, condition, APR, sales tax, registration, documentation fees, trade credits and loan structure can differ. This is an estimate, not a guarantee or financial recommendation.</p></details>
  </div>;
}
