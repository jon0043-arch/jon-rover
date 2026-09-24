import { NextRequest, NextResponse } from "next/server";
import snapshot from "../../../data/inventory.json";
import { projectDepreciation } from "../../lib/depreciation";

const INVENTORY_URL = "https://www.landroverwillowgrove.com/llm/inventory/";
const DOC_FEE = 490;

type Vehicle = {title:string;condition:string;mileage:number|null;price:number|null;vin:string;url:string;image?:string|null;stock?:string|null;exterior?:string|null;interior?:string|null;interiorFamily?:string|null;features?:string[]};
type SnapshotVehicle = Vehicle & { images?: string[] };
type Snapshot = { source?:string; expected?:number|null; count?:number; fetchedAt?:string|null; vehicles?:SnapshotVehicle[] };
const bundledSnapshot = snapshot as Snapshot;

function validMeta(value?:string|null){if(!value)return null;const v=String(value).trim();if(!v||/^(?:interior_color|exterior_color|interior|exterior|unknown|n\/a|null|none)$/i.test(v))return null;return v;}
function hydrateVehicle(v:Vehicle):Vehicle{return{...v,stock:validMeta(v.stock),exterior:validMeta(v.exterior),interior:validMeta(v.interior),interiorFamily:validMeta(v.interiorFamily)}}
function advertisedPrice(price:number|null){return price==null?null:price+DOC_FEE;}
function fetchBundledInventory():Vehicle[]{return(Array.isArray(bundledSnapshot.vehicles)?bundledSnapshot.vehicles:[]).filter(v=>v?.vin&&v?.condition).map(v=>hydrateVehicle({title:v.title,condition:v.condition,mileage:v.mileage??null,price:v.price??null,vin:v.vin,url:v.url||INVENTORY_URL,image:v.image??v.images?.[0]??null,stock:v.stock??null,exterior:v.exterior??null,interior:v.interior??null,interiorFamily:v.interiorFamily??null,features:Array.isArray(v.features)?v.features:[]}));}
async function fetchSavedInventory():Promise<Vehicle[]>{const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return[];try{const params=new URLSearchParams({select:"vin,title,condition,mileage,price,listing_url,image_url,stock,exterior,interior,interior_family,features",active:"eq.true",limit:"500"});const r=await fetch(`${url.replace(/\/$/,"")}/rest/v1/inventory_vehicles?${params}`,{cache:"no-store",headers:{apikey:key,Authorization:`Bearer ${key}`}});if(!r.ok)return[];const rows:any[]=await r.json();return rows.map(v=>hydrateVehicle({title:v.title,condition:v.condition,mileage:v.mileage??null,price:v.price??null,vin:v.vin,url:v.listing_url||INVENTORY_URL,image:v.image_url||null,stock:v.stock||null,exterior:v.exterior||null,interior:v.interior||null,interiorFamily:v.interior_family||null,features:v.features||[]}));}catch{return[]}}
function mergeInventory(saved:Vehicle[],bundled:Vehicle[]){if(!saved.length)return bundled;const byVin=new Map(bundled.map(v=>[v.vin.toUpperCase(),v]));return saved.map(db=>{const snap=byVin.get(db.vin.toUpperCase());return snap?hydrateVehicle({...snap,...db,image:db.image||snap.image||null,stock:validMeta(db.stock)||validMeta(snap.stock),exterior:validMeta(db.exterior)||validMeta(snap.exterior),interior:validMeta(db.interior)||validMeta(snap.interior),interiorFamily:validMeta(db.interiorFamily)||validMeta(snap.interiorFamily),features:(db.features&&db.features.length?db.features:snap.features)||[]}):db});}
function parseBudget(q:string){const m=q.match(/(?:under|below|less than|max(?:imum)?|budget(?: of| is)?|up to|no more than|around|about)\s*\$?\s*([\d,.]+)\s*(k)?/i)||q.match(/\$\s*([\d,.]+)\s*(k)?/i);if(!m)return null;let n=Number(m[1].replace(/,/g,""));if(m[2])n*=1000;return Number.isFinite(n)?n:null;}
function requestedModel(q:string){q=q.toLowerCase();if(q.includes("range rover sport"))return"range rover sport";if(/range rover velar|\bvelar\b/.test(q))return"velar";if(/range rover evoque|\bevoque\b/.test(q))return"evoque";if(q.includes("defender 130"))return"defender 130";if(q.includes("defender 110"))return"defender 110";if(q.includes("defender 90"))return"defender 90";if(/\bdefender\b/.test(q))return"defender";if(q.includes("discovery sport"))return"discovery sport";if(/\bdiscovery\b/.test(q))return"discovery";if(/f[- ]?pace/.test(q))return"f-pace";if(/e[- ]?pace/.test(q))return"e-pace";if(/\bjaguar\b/.test(q))return"jaguar";if(/\brange rover\b/.test(q))return"range rover";return null;}
function searchable(v:Vehicle){return`${v.title} ${v.url}`.toLowerCase().replace(/[-_/]+/g," ")}
function modelMatches(v:Vehicle,m:string){const t=searchable(v);if(m==="range rover")return t.includes("range rover")&&!t.includes("range rover sport")&&!t.includes("velar")&&!t.includes("evoque");if(m==="f-pace")return/\bf pace\b/.test(t);if(m==="e-pace")return/\be pace\b/.test(t);if(m==="jaguar")return t.includes("jaguar");return t.includes(m)}
function requestedColor(q:string){return["black","white","green","blue","red","silver","gray","grey","brown","bronze","gold"].find(c=>new RegExp(`\\b${c}\\b`,`i`).test(q))||null}
function colorMatches(v:Vehicle,c:string){const x=(v.exterior||"").toLowerCase();return c==="gray"||c==="grey"?x.includes("gray")||x.includes("grey"):x.includes(c)}
function score(v:Vehicle,q:string){let s=0;const b=parseBudget(q),p=advertisedPrice(v.price);if(b!=null&&p!=null)s+=p<=b?100:p<=b+10000?5:-1000;if(/\bnew\b/i.test(q))s+=v.condition.toLowerCase()==="new"?20:-50;if(/used|pre[- ]?owned|certified|cpo/i.test(q))s+=v.condition.toLowerCase()!=="new"?20:-50;const c=requestedColor(q);if(c&&v.exterior)s+=colorMatches(v,c)?60:-30;return s}

export async function GET(request:NextRequest){
  const q=request.nextUrl.searchParams.get("q")??"";
  const condition=(request.nextUrl.searchParams.get("condition")??"all").toLowerCase();
  const browse=request.nextUrl.searchParams.get("browse")==="1";
  const requestedLimit=Number(request.nextUrl.searchParams.get("limit")??12)||12;
  const limit=browse?Math.min(Math.max(requestedLimit,1),250):Math.min(Math.max(requestedLimit,1),18);
  try{
    const bundled=fetchBundledInventory();
    const saved=await fetchSavedInventory();
    const marketInventory=mergeInventory(saved,bundled);
    const withProjection=(v:Vehicle)=>({...v,price:advertisedPrice(v.price),docFeeIncluded:DOC_FEE,equityGuard:projectDepreciation(v,marketInventory)});
    let unique=[...marketInventory];
    if(condition==="new")unique=unique.filter(v=>v.condition.toLowerCase()==="new");
    if(condition==="used")unique=unique.filter(v=>v.condition.toLowerCase()!=="new");
    let candidates=unique;
    const model=requestedModel(q);if(model)candidates=candidates.filter(v=>modelMatches(v,model));
    const budget=parseBudget(q);if(budget!=null)candidates=candidates.filter(v=>{const p=advertisedPrice(v.price);return p!=null&&p<=budget+10000;});
    if(browse){const vehicles=candidates.slice(0,limit).map(withProjection);return NextResponse.json({total:candidates.length,count:vehicles.length,query:q,condition,vehicles,source:"Jon Rover enriched inventory snapshot",syncMethod:"snapshot-overlay",updatedAt:bundledSnapshot.fetchedAt||null});}
    const color=requestedColor(q);
    let vehicles=candidates.map(vehicle=>({vehicle,score:score(vehicle,q)})).sort((a,b)=>b.score-a.score||(a.vehicle.price??Infinity)-(b.vehicle.price??Infinity)).slice(0,color?Math.min(candidates.length,40):limit).map(x=>x.vehicle);
    if(color){const matching=vehicles.filter(v=>colorMatches(v,color));if(matching.length>=3)vehicles=matching;else if(matching.length)vehicles=[...matching,...vehicles.filter(v=>!colorMatches(v,color))];}
    vehicles=vehicles.slice(0,limit);
    const projected=vehicles.map(withProjection);
    return NextResponse.json({total:candidates.length,count:projected.length,query:q,condition,vehicles:projected,source:"Jon Rover enriched inventory snapshot",syncMethod:"snapshot-overlay",updatedAt:bundledSnapshot.fetchedAt||null});
  }catch(e){console.error("Inventory route failed",e);return NextResponse.json({error:"Live inventory is temporarily unavailable."},{status:502})}
}
