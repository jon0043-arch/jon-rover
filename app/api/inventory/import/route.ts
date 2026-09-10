import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type SnapshotVehicle = {
  vin:string; title:string; condition:string; mileage?:number|null; price?:number|null;
  url?:string; listing_url?:string; image?:string|null; image_url?:string|null; images?:string[];
  stock?:string|null; exterior?:string|null; interior?:string|null; interiorFamily?:string|null;
  interior_family?:string|null; features?:string[];
};

type Snapshot = { expected?:number|null; count?:number|null; vehicles:SnapshotVehicle[] };

function supabase(){
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) throw new Error("Supabase environment variables are missing");
  return {url,key,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"}};
}

async function rest(url:string,key:string,pathname:string,init:RequestInit={}){
  const r=await fetch(`${url}/rest/v1/${pathname}`,{...init,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",...(init.headers||{})},cache:"no-store"});
  if(!r.ok) throw new Error(`${pathname}: ${r.status} ${await r.text()}`);
  return r;
}

async function readSnapshot():Promise<Snapshot>{
  const file=path.join(process.cwd(),"data","inventory.json");
  const raw=await fs.readFile(file,"utf8");
  const parsed=JSON.parse(raw);
  if(!parsed||!Array.isArray(parsed.vehicles)) throw new Error("Saved inventory snapshot is invalid");
  return parsed;
}

export async function POST(req:NextRequest){
  try{
    const configuredSecret=process.env.INVENTORY_SYNC_SECRET;
    if(configuredSecret){
      const auth=req.headers.get("authorization")||"";
      if(auth!==`Bearer ${configuredSecret}`) return NextResponse.json({error:"Unauthorized"},{status:401});
    }

    let supplied:Snapshot|null=null;
    try{
      if((req.headers.get("content-type")||"").includes("application/json")){
        const body=await req.json();
        if(body?.vehicles) supplied=body;
      }
    }catch{}
    const snapshot=supplied||await readSnapshot();
    const vehicles=Array.from(new Map(snapshot.vehicles.filter(v=>v?.vin&&v?.title).map(v=>[v.vin.toUpperCase(),v])).values());
    if(!vehicles.length) throw new Error("No vehicles were supplied to import");

    const expected=Number(snapshot.expected||snapshot.count||0)||null;
    const complete = expected ? vehicles.length>=expected : vehicles.length>=200;
    const {url,key}=supabase();
    const now=new Date().toISOString();

    const rows=vehicles.map(v=>({
      vin:v.vin.toUpperCase(), title:v.title, condition:v.condition||"Used", mileage:v.mileage??null,
      price:v.price??null, listing_url:v.listing_url||v.url||"https://www.landroverwillowgrove.com/",
      image_url:v.image_url||v.image||v.images?.[0]||null, stock:v.stock??null, exterior:v.exterior??null,
      interior:v.interior??null, interior_family:v.interior_family||v.interiorFamily||null, features:v.features||[],
      active:true, last_seen_at:now, updated_at:now
    }));

    for(let i=0;i<rows.length;i+=100){
      await rest(url,key,"inventory_vehicles?on_conflict=vin",{method:"POST",headers:{Prefer:"resolution=merge-duplicates"},body:JSON.stringify(rows.slice(i,i+100))});
    }

    let imageRows=0;
    for(const v of vehicles){
      const imgs=Array.from(new Set([...(v.images||[]),v.image_url||"",v.image||""].filter(Boolean))).slice(0,50);
      if(!imgs.length) continue;
      const payload=imgs.map((image_url,sort_order)=>({vin:v.vin.toUpperCase(),image_url,sort_order}));
      await rest(url,key,"inventory_vehicle_images?on_conflict=vin,image_url",{method:"POST",headers:{Prefer:"resolution=merge-duplicates"},body:JSON.stringify(payload)});
      imageRows+=payload.length;
    }

    if(complete){
      const vins=rows.map(r=>`\"${r.vin}\"`).join(",");
      await rest(url,key,`inventory_vehicles?vin=not.in.(${encodeURIComponent(vins)})`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({active:false,updated_at:now})});
    }

    return NextResponse.json({ok:true,imported:rows.length,images:imageRows,expected,complete,deactivatedMissing:complete,source:supplied?"request":"data/inventory.json",syncedAt:now});
  }catch(e){
    console.error("Inventory import failed",e);
    return NextResponse.json({error:e instanceof Error?e.message:"Inventory import failed"},{status:500});
  }
}
