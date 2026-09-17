export type DepreciationVehicle={title:string;condition:string;mileage:number|null;price:number|null};
export type DepreciationProjection={
  version:"market-v2";
  modelKey:string;
  horizonMonths:36;
  projectedRetailValue:number;
  projectedTradeValue:number;
  projectedMileage:number;
  annualRetention:number;
  tradeFactor:number;
  marketSampleSize:number;
  marketYearCount:number;
  confidence:"high"|"medium"|"low";
  basis:"live-inventory-calibrated"|"model-age-curve";
};

const HORIZON_YEARS=3;
const ASSUMED_MILES_PER_YEAR=10000;

function clamp(n:number,min:number,max:number){return Math.min(max,Math.max(min,n));}
function median(values:number[]){const a=[...values].sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function yearFromTitle(title:string){const m=title.match(/\b(20\d{2})\b/);return m?Number(m[1]):null;}
function modelKey(title:string){
  const x=title.toLowerCase().replace(/[-_/]+/g," ");
  if(/defender\s*130/.test(x))return"defender-130";
  if(/defender\s*110/.test(x))return"defender-110";
  if(/defender\s*90/.test(x))return"defender-90";
  if(x.includes("range rover sport"))return"range-rover-sport";
  if(x.includes("velar"))return"velar";
  if(x.includes("evoque"))return"evoque";
  if(x.includes("discovery sport"))return"discovery-sport";
  if(/\bdiscovery\b/.test(x))return"discovery";
  if(/f\s*pace/.test(x))return"f-pace";
  if(/e\s*pace/.test(x))return"e-pace";
  if(/f\s*type/.test(x))return"f-type";
  if(x.includes("range rover"))return"range-rover";
  if(x.includes("jaguar"))return"jaguar";
  return"other";
}
function trimTier(title:string){
  const x=title.toLowerCase();
  if(/\bsv\b/.test(x))return"sv";
  if(x.includes("autobiography"))return"autobiography";
  if(/x\s*dynamic\s*se|dynamic\s*se/.test(x))return"dynamic-se";
  if(/\bhse\b/.test(x))return"hse";
  if(/\bse\b/.test(x))return"se";
  if(/\bfirst edition\b/.test(x))return"first-edition";
  if(/\bs\b/.test(x))return"s";
  return"base";
}
function ageBucket(age:number){return age<=0?0:age===1?1:age===2?2:age<=5?3:4;}
function fallbackAnnualRetention(key:string,age:number){
  const table:Record<string,number[]>={
    "range-rover":[0.81,0.84,0.87,0.90,0.92],
    "range-rover-sport":[0.83,0.86,0.88,0.90,0.92],
    "defender-90":[0.90,0.91,0.92,0.93,0.94],
    "defender-110":[0.90,0.91,0.92,0.93,0.94],
    "defender-130":[0.89,0.90,0.91,0.92,0.93],
    velar:[0.84,0.87,0.89,0.91,0.92],
    evoque:[0.84,0.87,0.89,0.91,0.92],
    discovery:[0.85,0.88,0.90,0.91,0.92],
    "discovery-sport":[0.85,0.88,0.90,0.91,0.92],
    "f-pace":[0.83,0.86,0.88,0.90,0.92],
    "e-pace":[0.83,0.86,0.88,0.90,0.92],
    "f-type":[0.86,0.88,0.90,0.92,0.93],
    jaguar:[0.83,0.86,0.88,0.90,0.92],
    other:[0.86,0.88,0.90,0.92,0.93],
  };
  return(table[key]||table.other)[ageBucket(age)];
}
function regressionRetention(rows:DepreciationVehicle[],target:DepreciationVehicle){
  const key=modelKey(target.title),tier=trimTier(target.title),currentYear=new Date().getFullYear();
  const valid=rows.filter(v=>v.price!=null&&v.price>5000&&yearFromTitle(v.title)!=null&&modelKey(v.title)===key);
  const sameTier=valid.filter(v=>trimTier(v.title)===tier);
  const tierYears=new Set(sameTier.map(v=>yearFromTitle(v.title))).size;
  const cohort=sameTier.length>=5&&tierYears>=3?sameTier:valid;
  const byYear=new Map<number,number[]>();
  for(const v of cohort){const y=yearFromTitle(v.title);if(y==null||v.price==null)continue;const a=byYear.get(y)||[];a.push(v.price);byYear.set(y,a);}
  const points=[...byYear.entries()].map(([year,prices])=>({x:Math.max(0,currentYear-year),y:Math.log(median(prices) as number)})).filter(p=>Number.isFinite(p.y));
  if(cohort.length<5||points.length<3)return null;
  const xbar=points.reduce((s,p)=>s+p.x,0)/points.length,ybar=points.reduce((s,p)=>s+p.y,0)/points.length;
  const den=points.reduce((s,p)=>s+Math.pow(p.x-xbar,2),0);if(den<=0)return null;
  const slope=points.reduce((s,p)=>s+(p.x-xbar)*(p.y-ybar),0)/den;
  const retention=clamp(Math.exp(slope),0.78,0.96);
  const weight=clamp(0.28+(points.length-3)*0.08+(cohort.length-5)*0.025,0.28,0.68);
  return{retention,weight,sampleSize:cohort.length,yearCount:points.length};
}
function tradeFactor(price:number,projectedMileage:number){
  let f=price>=100000?0.85:price>=70000?0.86:price>=40000?0.87:0.88;
  if(projectedMileage>60000)f-=0.01;
  if(projectedMileage>90000)f-=0.015;
  if(projectedMileage>120000)f-=0.015;
  return clamp(f,0.82,0.90);
}

export function projectDepreciation(vehicle:DepreciationVehicle,market:DepreciationVehicle[]):DepreciationProjection|null{
  if(vehicle.price==null||vehicle.price<=0)return null;
  const currentYear=new Date().getFullYear(),year=yearFromTitle(vehicle.title);
  const currentAge=year==null?(vehicle.condition.toLowerCase()==="new"?0:3):Math.max(0,currentYear-year);
  const key=modelKey(vehicle.title);
  const calibration=regressionRetention(market,vehicle);
  let value=vehicle.price;
  let retentionProduct=1;
  for(let i=0;i<HORIZON_YEARS;i++){
    const base=fallbackAnnualRetention(key,currentAge+i);
    const annual=calibration?base*(1-calibration.weight)+calibration.retention*calibration.weight:base;
    value*=annual;retentionProduct*=annual;
  }
  const currentMileage=vehicle.mileage!=null&&vehicle.mileage>=0?vehicle.mileage:Math.max(0,currentAge*ASSUMED_MILES_PER_YEAR);
  const projectedMileage=Math.round(currentMileage+ASSUMED_MILES_PER_YEAR*HORIZON_YEARS);
  const projectedRetailValue=Math.max(1000,Math.round(value));
  const tf=tradeFactor(vehicle.price,projectedMileage);
  const projectedTradeValue=Math.max(500,Math.round(projectedRetailValue*tf));
  const marketSampleSize=calibration?.sampleSize||0,marketYearCount=calibration?.yearCount||0;
  const confidence:DepreciationProjection["confidence"]=calibration?(marketSampleSize>=9&&marketYearCount>=4?"high":"medium"):"low";
  return{version:"market-v2",modelKey:key,horizonMonths:36,projectedRetailValue,projectedTradeValue,projectedMileage,annualRetention:Math.pow(retentionProduct,1/HORIZON_YEARS),tradeFactor:tf,marketSampleSize,marketYearCount,confidence,basis:calibration?"live-inventory-calibrated":"model-age-curve"};
}
