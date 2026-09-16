import { NextRequest, NextResponse } from "next/server";
import snapshot from "../../../data/inventory.json";

const INVENTORY_URL="https://www.landroverwillowgrove.com/llm/inventory/";
type Vehicle={title:string;condition:string;mileage:number|null;price:number|null;vin:string;url:string;image?:string|null;stock?:string|null;exterior?:string|null;interior?:string|null;interiorFamily?:string|null;features?:string[]};
type SnapshotVehicle=Vehicle&{images?:string[]};
type Snapshot={fetchedAt?:string|null;vehicles?:SnapshotVehicle[]};
const bundledSnapshot=snapshot as Snapshot;

function clean(s:string){return s.replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&#8211;|&ndash;/g,"–").replace(/&#174;|&reg;/g,"®").replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim();}
function absoluteUrl(href:string){try{return new URL(href,INVENTORY_URL).toString()}catch{return INVENTORY_URL}}
function snapshotMap(){return new Map((bundledSnapshot.vehicles||[]).map(v=>[v.vin.toUpperCase(),v]));}

async function fetchLiveInventory():Promise<Vehicle[]>{
  const r=await fetch(INVENTORY_URL,{cache:"no-store",headers:{"User-Agent":"Mozilla/5.0 JonRoverInventory/1.0"}});
  if(!r.ok)throw new Error(`Inventory feed returned ${r.status}`);
  const html=await r.text();
  const vins=[...html.matchAll(/VIN:\s*([A-HJ-NPR-Z0-9]{17})/gi)];
  const snap=snapshotMap();
  const vehicles:Vehicle[]=[];
  for(let i=0;i<vins.length;i++){
    const vin=vins[i][1].toUpperCase();
    const vinPos=vins[i].index??0;
    const prev=i?((vins[i-1].index??0)+vins[i-1][0].length):0;
    const chunk=html.slice(Math.max(prev,vinPos-2600),vinPos+vins[i][0].length+1200);
    const links=[...chunk.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    const listing=[...links].reverse().find(m=>/View Full Listing/i.test(clean(m[2])))||[...links].reverse().find(m=>/inventory\//i.test(m[1]));
    const titleLink=[...links].reverse().find(m=>{const t=clean(m[2]);return /^(?:19|20)\d{2}\s+/.test(t)&&!/View Full Listing/i.test(t)});
    const text=clean(chunk);
    const title=titleLink?clean(titleLink[2]):(text.match(/((?:19|20)\d{2}\s+(?:LAND ROVER|Land Rover|Jaguar|BMW|Mercedes-Benz|Ford|Cadillac|Lexus|Lincoln|Dodge|GMC|Audi|Jeep|Hyundai)[\s\S]{2,100}?)(?=\s+(?:New|Used|Certified Used)\b)/)?.[1]?.trim()||snap.get(vin)?.title||vin);
    const beforeVin=text.slice(0,text.toUpperCase().lastIndexOf(`VIN: ${vin}`));
    const condition=[...beforeVin.matchAll(/\b(New|Used|Certified Used)\b/gi)].pop()?.[1]||snap.get(vin)?.condition||"Available";
    const mileageMatch=[...beforeVin.matchAll(/([\d,]+)\s+miles?\b/gi)].pop();
    const priceMatch=[...beforeVin.matchAll(/\$([\d,]+)/g)].pop();
    const old=snap.get(vin);
    vehicles.push({title,condition,mileage:mileageMatch?Number(mileageMatch[1].replace(/,/g,"")):old?.mileage??null,price:priceMatch?Number(priceMatch[1].replace(/,/g,"")):old?.price??null,vin,url:listing?absoluteUrl(listing[1]):old?.url||INVENTORY_URL,image:old?.image??old?.images?.[0]??null,stock:old?.stock??null,exterior:old?.exterior??null,interior:old?.interior??null,interiorFamily:old?.interiorFamily??null,features:old?.features||[]});
  }
  return vehicles.filter((v,i,a)=>a.findIndex(x=>x.vin===v.vin)===i);
}

function parseBudget(q:string){const m=q.match(/(?:under|below|less than|max(?:imum)?|budget(?: of| is)?|up to|no more than|around|about)\s*\$?\s*([\d,.]+)\s*(k)?/i)||q.match(/\$\s*([\d,.]+)\s*(k)?/i);if(!m)return null;let n=Number(m[1].replace(/,/g,""));if(m[2])n*=1000;return Number.isFinite(n)?n:null;}
function requestedModel(q:string){q=q.toLowerCase();if(q.includes("range rover sport"))return"range rover sport";if(/range rover velar|\bvelar\b/.test(q))return"velar";if(/range rover evoque|\bevoque\b/.test(q))return"evoque";if(q.includes("defender 130"))return"defender 130";if(q.includes("defender 110"))return"defender 110";if(q.includes("defender 90"))return"defender 90";if(/\bdefender\b/.test(q))return"defender";if(q.includes("discovery sport"))return"discovery sport";if(/\bdiscovery\b/.test(q))return"discovery";if(/f[- ]?pace/.test(q))return"f-pace";if(/e[- ]?pace/.test(q))return"e-pace";if(/\bjaguar\b/.test(q))return"jaguar";if(/\brange rover\b/.test(q))return"range rover";return null;}
function searchable(v:Vehicle){return`${v.title} ${v.url}`.toLowerCase().replace(/[-_/]+/g," ")}
function modelMatches(v:Vehicle,m:string){const t=searchable(v);if(m==="range rover")return t.includes("range rover")&&!t.includes("range rover sport")&&!t.includes("velar")&&!t.includes("evoque");if(m==="f-pace")return/\bf pace\b/.test(t);if(m==="e-pace")return/\be pace\b/.test(t);if(m==="jaguar")return t.includes("jaguar");return t.includes(m)}
function wantsSeven(q:string){return/third[ -]?row|3rd[ -]?row|7[ -]?seat|seven[ -]?seat|7 passenger|seven passenger/i.test(q)}
function thirdRow(v:Vehicle){const t=searchable(v);return(t.includes("discovery")&&!t.includes("discovery sport"))||t.includes("defender 130")||(t.includes("range rover")&&!t.includes("sport")&&!t.includes("velar")&&!t.includes("evoque"))}
function requestedColor(q:string){return["black","white","green","blue","red","silver","gray","grey","brown","bronze","gold"].find(c=>new RegExp(`\\b${c}\\b`,`i`).test(q))||null}
function colorMatches(v:Vehicle,c:string){const x=(v.exterior||"").toLowerCase();return c==="gray"||c==="grey"?x.includes("gray")||x.includes("grey"):x.includes(c)}
function score(v:Vehicle,q:string){let s=0;const b=parseBudget(q);if(b!=null&&v.price!=null)s+=v.price<=b?100:v.price<=b+10000?5:-1000;if(/\bnew\b/i.test(q))s+=v.condition.toLowerCase()==="new"?20:-50;if(/used|pre[- ]?owned|certified|cpo/i.test(q))s+=v.condition.toLowerCase()!=="new"?20:-50;const c=requestedColor(q);if(c&&v.exterior)s+=colorMatches(v,c)?60:-30;return s}

export async function GET(request:NextRequest){
 const q=request.nextUrl.searchParams.get("q")??"";const condition=(request.nextUrl.searchParams.get("condition")??"all").toLowerCase();const browse=request.nextUrl.searchParams.get("browse")==="1";const requestedLimit=Number(request.nextUrl.searchParams.get("limit")??12)||12;const limit=browse?Math.min(Math.max(requestedLimit,1),250):Math.min(Math.max(requestedLimit,1),18);
 try{
  let unique=await fetchLiveInventory();
  if(!unique.length)throw new Error("No vehicles parsed from live feed");
  if(condition==="new")unique=unique.filter(v=>v.condition.toLowerCase()==="new");if(condition==="used")unique=unique.filter(v=>v.condition.toLowerCase()!=="new");
  let candidates=unique;if(wantsSeven(q))candidates=candidates.filter(thirdRow);const model=requestedModel(q);if(model)candidates=candidates.filter(v=>modelMatches(v,model));const budget=parseBudget(q);if(budget!=null)candidates=candidates.filter(v=>v.price!=null&&v.price<=budget+10000);
  const color=requestedColor(q);if(color&&browse)candidates=candidates.filter(v=>colorMatches(v,color));
  if(browse){const vehicles=candidates.slice(0,limit);return NextResponse.json({total:candidates.length,count:vehicles.length,query:q,condition,vehicles,source:"Live Land Rover Willow Grove inventory",syncMethod:"live-feed",updatedAt:new Date().toISOString()},{headers:{"Cache-Control":"no-store, max-age=0"}})}
  let vehicles=candidates.map(vehicle=>({vehicle,score:score(vehicle,q)})).sort((a,b)=>b.score-a.score||(a.vehicle.price??Infinity)-(b.vehicle.price??Infinity)).slice(0,limit).map(x=>x.vehicle);
  if(color){const matching=vehicles.filter(v=>colorMatches(v,color));if(matching.length)vehicles=[...matching,...vehicles.filter(v=>!colorMatches(v,color))]}
  return NextResponse.json({total:candidates.length,count:vehicles.length,query:q,condition,vehicles,source:"Live Land Rover Willow Grove inventory",syncMethod:"live-feed",updatedAt:new Date().toISOString()},{headers:{"Cache-Control":"no-store, max-age=0"}});
 }catch(e){console.error("Live inventory failed; using bundled snapshot",e);let vehicles=(bundledSnapshot.vehicles||[]) as Vehicle[];if(condition==="new")vehicles=vehicles.filter(v=>v.condition.toLowerCase()==="new");if(condition==="used")vehicles=vehicles.filter(v=>v.condition.toLowerCase()!=="new");const model=requestedModel(q);if(model)vehicles=vehicles.filter(v=>modelMatches(v,model));const total=vehicles.length;vehicles=vehicles.slice(0,limit);return NextResponse.json({total,count:vehicles.length,query:q,condition,vehicles,source:"Fallback inventory snapshot",syncMethod:"snapshot-fallback",updatedAt:bundledSnapshot.fetchedAt||null},{headers:{"Cache-Control":"no-store, max-age=0"}})}
}
