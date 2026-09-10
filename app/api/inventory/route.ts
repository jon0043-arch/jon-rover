import { NextRequest, NextResponse } from "next/server";
import snapshot from "../../../data/inventory.json";

const DEALER_BASE = "https://www.landroverwillowgrove.com";
const INVENTORY_URL = `${DEALER_BASE}/llm/inventory/`;
const READER_PREFIX = "https://r.jina.ai/https://";

type Vehicle = {
  title: string; condition: string; mileage: number | null; price: number | null; vin: string; url: string;
  image?: string | null; stock?: string | null; exterior?: string | null; interior?: string | null; interiorFamily?: string | null; features?: string[]; searchText?: string;
};
type SnapshotVehicle = Vehicle & { images?: string[] };
type Snapshot = { source?: string; expected?: number | null; count?: number; fetchedAt?: string | null; vehicles?: SnapshotVehicle[] };
const bundledSnapshot = snapshot as Snapshot;

function num(value?: string | null) { if (!value) return null; const n=Number(value.replace(/[^0-9]/g,"")); return Number.isFinite(n)?n:null; }
function normalizeUrl(value?: string | null) { if (!value) return INVENTORY_URL; if(value.startsWith("http")) return value; return `${DEALER_BASE}${value.startsWith("/")?value:`/${value}`}`; }
function readerUrl(target:string){ return `${READER_PREFIX}${target.replace(/^https:\/\//,"")}`; }
async function fetchReader(target:string){ const r=await fetch(readerUrl(target),{cache:"no-store",headers:{Accept:"text/plain"}}); if(!r.ok) throw new Error(`Reader returned ${r.status}`); return r.text(); }
function parseReaderInventory(text:string):Vehicle[]{ const records:Vehicle[]=[]; const pattern=/\[([^\]]*(?:19|20)\d{2}[^\]]*)\]\((https?:\/\/[^)]+)\)\s*(?:\r?\n)+\s*(Certified Used|Used|New)\s*(?:\r?\n)+\s*([\d,]+)\s+miles?\s*(?:\r?\n)+\s*\$([\d,]+)\s*(?:\r?\n)+\s*VIN:\s*([A-HJ-NPR-Z0-9]{17})/gi; let m; while((m=pattern.exec(text))){ const vin=m[6].toUpperCase(); if(records.some(v=>v.vin===vin)) continue; records.push({title:m[1].replace(/\s+/g," ").trim(),url:normalizeUrl(m[2]),condition:m[3].trim(),mileage:num(m[4]),price:num(m[5]),vin,searchText:`${m[1]} ${m[3]}`.toLowerCase()}); } return records; }
function parseBudget(q:string){const m=q.match(/(?:under|below|less than|max(?:imum)?|budget(?: of| is)?|up to|no more than|around|about)\s*\$?\s*([\d,.]+)\s*(k)?/i)||q.match(/\$\s*([\d,.]+)\s*(k)?\s*(?:budget|max)?/i);if(!m)return null;let n=Number(m[1].replace(/,/g,""));if(m[2])n*=1000;return Number.isFinite(n)?n:null;}
function requestedModel(query:string){const q=query.toLowerCase();if(/range rover sport/.test(q))return"range rover sport";if(/range rover velar|\bvelar\b/.test(q))return"velar";if(/range rover evoque|\bevoque\b/.test(q))return"evoque";if(/defender 130/.test(q))return"defender 130";if(/defender 110/.test(q))return"defender 110";if(/defender 90/.test(q))return"defender 90";if(/\bdefender\b/.test(q))return"defender";if(/discovery sport/.test(q))return"discovery sport";if(/\bdiscovery\b/.test(q))return"discovery";if(/f[- ]?pace/.test(q))return"f-pace";if(/\bjaguar\b/.test(q))return"jaguar";if(/\brange rover\b/.test(q))return"range rover";return null;}
function modelMatches(v:Vehicle,model:string){const t=v.title.toLowerCase();if(model==="range rover")return t.includes("range rover")&&!t.includes("sport")&&!t.includes("velar")&&!t.includes("evoque");if(model==="f-pace")return t.includes("f-pace")||t.includes("f pace");if(model==="jaguar")return t.includes("jaguar");return t.includes(model);}
function wantsSevenSeats(q:string){return /\bthird[ -]?row\b|\b3rd[ -]?row\b|\b7[ -]?seat(?:er|s)?\b|\bseven[ -]?seat(?:er|s)?\b|\b7 passenger\b|\bseven passenger\b/i.test(q);}
function thirdRowFamily(v:Vehicle){const t=v.title.toLowerCase();const fullDiscovery=/\bdiscovery\b/.test(t)&&!t.includes("discovery sport");const defender130=t.includes("defender 130");const fullRange=t.includes("range rover")&&!t.includes("sport")&&!t.includes("velar")&&!t.includes("evoque");return fullDiscovery||defender130||fullRange;}
function likelySevenSeat(v:Vehicle){const t=`${v.title} ${(v.features||[]).join(" ")}`.toLowerCase(); if(t.includes("defender 130")) return true; if(/\bdiscovery\b/.test(t)&&!t.includes("discovery sport")) return true; if(t.includes("range rover")&&!t.includes("sport")&&!t.includes("velar")&&!t.includes("evoque")) return /\b7[ -]?seat|seven[ -]?seat|third[ -]?row|3rd[ -]?row|7 passenger|seven passenger|\blwb\b|long wheelbase/.test(t); return false;}
function requestedColor(q:string){const colors=["black","white","green","blue","red","silver","gray","grey","brown","bronze","gold"];return colors.find(c=>new RegExp(`\\b${c}\\b`,`i`).test(q))??null;}
function colorMatches(v:Vehicle,color:string){const hay=`${v.exterior||""} ${v.title}`.toLowerCase();if(color==="gray"||color==="grey")return hay.includes("gray")||hay.includes("grey");return hay.includes(color);}
function normalizeInteriorFamily(value?: string | null){const x=(value||"").toLowerCase();if(!x)return null;if(x.includes("caraway"))return"tan";if(x.includes("light cloud"))return"off-white";if(x.includes("ebony"))return"black";if(x.includes("deep garnet"))return"red-wine";if(/tan|beige|camel|caramel/.test(x))return"tan";if(/off[- ]?white|ivory|cream/.test(x))return"off-white";if(/black/.test(x))return"black";if(/burgundy|wine|garnet|oxblood/.test(x))return"red-wine";return value?.trim()||null;}
function requestedInterior(q:string){const s=q.toLowerCase();if(/caraway|tan interior|tan seats|beige interior|camel interior/.test(s))return"tan";if(/light cloud|off[- ]?white interior|ivory interior|cream interior/.test(s))return"off-white";if(/ebony|black interior|black seats/.test(s))return"black";if(/deep garnet|red wine interior|wine interior|burgundy interior|garnet interior/.test(s))return"red-wine";return null;}
function interiorMatches(v:Vehicle,family:string){return v.interiorFamily===family;}
function scoreVehicle(v:Vehicle,q:string){q=q.trim().toLowerCase();if(!q)return 1;let s=0;const budget=parseBudget(q);if(budget!=null&&v.price!=null){if(v.price<=budget)s+=100;else if(v.price<=budget+10000)s+=5;else s-=1000;}if(/\bnew\b/i.test(q))s+=v.condition.toLowerCase()==="new"?20:-50;if(/used|pre[- ]?owned|certified|cpo/i.test(q))s+=v.condition.toLowerCase()!=="new"?20:-50;if(wantsSevenSeats(q))s+=thirdRowFamily(v)?80:-200;return s;}
async function enrichVehicle(v:Vehicle):Promise<Vehicle>{try{const text=await fetchReader(v.url);const image=text.match(/!\[[^\]]*\]\((https?:\/\/[^)]+\.(?:jpg|jpeg|png|webp)(?:\?[^)]*)?)\)/i)?.[1]??null;const stock=text.match(/Stock(?: Number| #|:)?\s*[:#]?\s*([A-Z0-9-]{4,})/i)?.[1]??null;const exterior=text.match(/Exterior(?: Color)?\s*[:|]\s*([^\n|]{2,80})/i)?.[1]?.trim()??null;const interior=text.match(/Interior(?: Color)?\s*[:|]\s*([^\n|]{2,80})/i)?.[1]?.trim()??text.match(/Interior\s*[:\-]\s*([^\n]{2,80})/i)?.[1]?.trim()??null;const interiorFamily=normalizeInteriorFamily(interior);const features=Array.from(new Set([...text.matchAll(/(?:Feature|Equipment|Package)\s*[:|]\s*([^\n|]{3,80})/gi)].map(m=>m[1].trim()).filter(Boolean))).slice(0,8);return{...v,image,stock,exterior,interior,interiorFamily,features};}catch{return v;}}

function fetchBundledInventory():Vehicle[]{
  const rows=Array.isArray(bundledSnapshot.vehicles)?bundledSnapshot.vehicles:[];
  return rows.filter(v=>v?.vin&&v?.title&&v?.condition).map(v=>({
    title:v.title,
    condition:v.condition,
    mileage:v.mileage??null,
    price:v.price??null,
    vin:v.vin,
    url:v.url||INVENTORY_URL,
    image:v.image??v.images?.[0]??null,
    stock:v.stock??null,
    exterior:v.exterior??null,
    interior:v.interior??null,
    interiorFamily:v.interiorFamily??null,
    features:Array.isArray(v.features)?v.features:[],
  }));
}

async function fetchSavedInventory():Promise<Vehicle[]>{
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return[];
  try{
    const params=new URLSearchParams({select:"vin,title,condition,mileage,price,listing_url,image_url,stock,exterior,interior,interior_family,features",active:"eq.true",limit:"500"});
    const r=await fetch(`${url}/rest/v1/inventory_vehicles?${params}`,{cache:"no-store",headers:{apikey:key,Authorization:`Bearer ${key}`}});
    if(!r.ok)return[];
    const rows:any[]=await r.json();
    return rows.map(v=>({title:v.title,condition:v.condition,mileage:v.mileage,price:v.price,vin:v.vin,url:v.listing_url,image:v.image_url,stock:v.stock,exterior:v.exterior,interior:v.interior,interiorFamily:v.interior_family,features:v.features||[]}));
  }catch{return[];}
}

export async function GET(request:NextRequest){const q=request.nextUrl.searchParams.get("q")??"";const condition=(request.nextUrl.searchParams.get("condition")??"all").toLowerCase();const browse=request.nextUrl.searchParams.get("browse")==="1";const requestedLimit=Number(request.nextUrl.searchParams.get("limit")??12)||12;const limit=browse?Math.min(Math.max(requestedLimit,1),250):Math.min(Math.max(requestedLimit,1),18);try{
const supabaseRows=await fetchSavedInventory();const bundledRows=fetchBundledInventory();let unique:Vehicle[]=[];let source="";let texts:string[]=[];
if(supabaseRows.length>=bundledRows.length&&supabaseRows.length){unique=supabaseRows;source="Jon Rover saved inventory";}
else if(bundledRows.length){unique=bundledRows;source="Jon Rover bundled inventory snapshot";}
else{const pageCount=browse?12:3;const pageUrls=Array.from({length:pageCount},(_,i)=>i===0?INVENTORY_URL:`${INVENTORY_URL}?_p=${i+1}`);texts=await Promise.all(pageUrls.map(async u=>{try{return await fetchReader(u)}catch{return""}}));const parsed=texts.flatMap(parseReaderInventory);unique=Array.from(new Map(parsed.map(v=>[v.vin,v])).values());source="Land Rover Willow Grove";}
const usingDurable=source!=="Land Rover Willow Grove";
if(!unique.length)return NextResponse.json({error:"Willow Grove inventory could not be read right now.",vehicles:[],count:0},{status:502});
if(condition==="new")unique=unique.filter(v=>v.condition.toLowerCase()==="new");if(condition==="used")unique=unique.filter(v=>v.condition.toLowerCase()!=="new");let candidates=unique;if(wantsSevenSeats(q))candidates=candidates.filter(thirdRowFamily);const model=requestedModel(q);if(model){const modelOnly=candidates.filter(v=>modelMatches(v,model));if(modelOnly.length)candidates=modelOnly;}
const budget=parseBudget(q);if(budget!=null)candidates=candidates.filter(v=>v.price!=null&&v.price<=budget+10000);
if(browse){const browsed=candidates.slice(0,limit);const totalMatch=texts.join("\n").match(/([\d,]+)\s+vehicles found/i)?.[1];return NextResponse.json({total:usingDurable?unique.length:(totalMatch?Number(totalMatch.replace(/,/g,"")):unique.length),count:browsed.length,query:q,condition,vehicles:browsed,source,syncMethod:usingDurable?"durable-primary":"reader-fallback",updatedAt:bundledSnapshot.fetchedAt||new Date().toISOString()});}
const color=requestedColor(q);const interior=requestedInterior(q);
const enrichmentPoolSize=(color||interior)?Math.min(candidates.length,40):Math.min(candidates.length,limit);
let ranked=candidates.map(vehicle=>({vehicle,score:scoreVehicle(vehicle,q)})).sort((a,b)=>b.score-a.score||(a.vehicle.price??Infinity)-(b.vehicle.price??Infinity)).slice(0,enrichmentPoolSize).map(x=>x.vehicle);
let enriched=usingDurable?ranked:await Promise.all(ranked.map(enrichVehicle));
if(wantsSevenSeats(q))enriched=enriched.filter(likelySevenSeat);
if(color){const matching=enriched.filter(v=>colorMatches(v,color));if(matching.length>=3)enriched=matching;else if(matching.length>0)enriched=[...matching,...enriched.filter(v=>!colorMatches(v,color))];}
if(interior){const matching=enriched.filter(v=>interiorMatches(v,interior));if(matching.length>=3)enriched=matching;else if(matching.length>0)enriched=[...matching,...enriched.filter(v=>!interiorMatches(v,interior))];}
enriched=enriched.slice(0,limit);
const totalMatch=texts.join("\n").match(/([\d,]+)\s+vehicles found/i)?.[1];return NextResponse.json({total:usingDurable?unique.length:(totalMatch?Number(totalMatch.replace(/,/g,"")):unique.length),count:enriched.length,query:q,condition,vehicles:enriched,source,syncMethod:usingDurable?"durable-primary":"reader-fallback",updatedAt:bundledSnapshot.fetchedAt||new Date().toISOString()});}catch(e){console.error("Inventory route failed",e);return NextResponse.json({error:"Live inventory is temporarily unavailable."},{status:502});}}
