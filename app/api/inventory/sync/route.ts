import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
const DEALER="https://www.landroverwillowgrove.com";
const INDEX=`${DEALER}/llm/inventory/`;
const READER="https://r.jina.ai/https://";
type V={vin:string;title:string;condition:string;mileage:number|null;price:number|null;listing_url:string;image_url?:string|null;stock?:string|null;exterior?:string|null;interior?:string|null;interior_family?:string|null;features?:string[]};
const reader=(url:string)=>`${READER}${url.replace(/^https:\/\//,"")}`;
function decode(s:string){return s.replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&reg;/gi,"®").replace(/&trade;/gi,"™").replace(/&mdash;/gi,"—").replace(/&ndash;/gi,"–");}
function htmlToText(s:string){
  if(!/<[a-z][\s\S]*>/i.test(s))return s;
  let x=s.replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,(_,href,label)=>`\n[${decode(String(label).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim())}](${href})\n`);
  x=x.replace(/<(?:br|\/p|\/div|\/li|\/article|\/section|\/h[1-6])\s*\/?>/gi,"\n");
  x=x.replace(/<[^>]+>/g," ");
  return decode(x).replace(/\r/g,"").replace(/[ \t]+/g," ").replace(/ *\n */g,"\n").replace(/\n{3,}/g,"\n\n").trim();
}
async function text(url:string){
  const direct=await fetch(url,{cache:"no-store",headers:{Accept:"text/html,text/plain;q=0.9,*/*;q=0.8","User-Agent":"Mozilla/5.0 (compatible; JonRoverInventory/1.0)"}}).catch(()=>null);
  if(direct?.ok){const body=await direct.text();if(/VIN:\s*[A-HJ-NPR-Z0-9]{17}/i.test(body)||/vehicles?\s+(?:found|total)/i.test(body))return htmlToText(body);}
  const r=await fetch(reader(url),{cache:"no-store",headers:{Accept:"text/plain"}});if(!r.ok)throw new Error(`inventory source ${r.status}`);return r.text();
}
function n(s:string){const x=Number(s.replace(/[^0-9]/g,""));return Number.isFinite(x)?x:null;}
function parse(t:string):V[]{
  const out:V[]=[];
  const re=/(?:^|\n)\s*\*?\s*(?:\[)?((?:19|20)\d{2}[^\]\n]+?)(?:\]\((https?:\/\/[^)]+)\))?\s*\n+\s*(Certified Used|Used|New)\s*\n+\s*([\d,]+)\s+miles?\s*\n+\s*\$([\d,]+)\s*\n+\s*VIN:\s*([A-HJ-NPR-Z0-9]{17})/gi;
  let m;
  while((m=re.exec(t))){const vin=m[6].toUpperCase();out.push({title:m[1].replace(/\s+/g," ").trim(),listing_url:m[2]||`${DEALER}/?s=${vin}`,condition:m[3],mileage:n(m[4]),price:n(m[5]),vin});}
  if(out.length)return out;
  const blocks=t.split(/(?=(?:19|20)\d{2}\s+)/g);
  for(const b of blocks){const vin=b.match(/VIN:\s*([A-HJ-NPR-Z0-9]{17})/i)?.[1];const condition=b.match(/\b(Certified Used|Used|New)\b/i)?.[1];const miles=b.match(/([\d,]+)\s+miles?/i)?.[1];const price=b.match(/\$([\d,]+)/)?.[1];const title=b.match(/^\s*((?:19|20)\d{2}[^\n]+)/)?.[1]?.replace(/^\[|\].*$/g,"").trim();if(vin&&condition&&miles&&price&&title){const href=b.match(/\]\((https?:\/\/[^)]+)\)/)?.[1];out.push({vin:vin.toUpperCase(),title,condition,mileage:n(miles),price:n(price),listing_url:href||`${DEALER}/?s=${vin}`});}}
  return out;
}
function family(v:string|null){const x=(v||"").toLowerCase();if(/caraway|tan|beige|camel/.test(x))return"tan";if(/light cloud|off[- ]?white|ivory|cream/.test(x))return"off-white";if(/ebony|black/.test(x))return"black";if(/deep garnet|burgundy|wine|garnet/.test(x))return"red-wine";return null;}
async function enrich(v:V):Promise<V>{try{if(!/\/inventory\//i.test(v.listing_url))return v;const t=await text(v.listing_url);const imgs=[...t.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)]+?\.(?:jpg|jpeg|png|webp)(?:\?[^)]*)?)\)/gi)].map(x=>x[1]).filter(x=>!/(logo|icon|avatar|placeholder)/i.test(x));const image=imgs.find(x=>/(vehicle|inventory|dealer|cdn|cloudfront|images)/i.test(x))||imgs[0]||null;const stock=t.match(/Stock(?: Number| #|:)?\s*[:#]?\s*([A-Z0-9-]{4,})/i)?.[1]||null;const exterior=t.match(/Exterior(?: Color)?\s*[:|]\s*([^\n|]{2,80})/i)?.[1]?.trim()||null;const interior=t.match(/Interior(?: Color)?\s*[:|]\s*([^\n|]{2,80})/i)?.[1]?.trim()||null;return{...v,image_url:image,stock,exterior,interior,interior_family:family(interior)};}catch{return v;}}
function sb(){const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Supabase inventory storage is not configured");return{url,key};}
async function rest(path:string,init:RequestInit={}){const {url,key}=sb();const r=await fetch(`${url}/rest/v1/${path}`,{...init,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",...(init.headers||{})}});if(!r.ok)throw new Error(`Supabase ${r.status}: ${await r.text()}`);return r;}
export async function POST(req:NextRequest){if(process.env.INVENTORY_SYNC_SECRET&&req.headers.get("authorization")!==`Bearer ${process.env.INVENTORY_SYNC_SECRET}`)return NextResponse.json({error:"Unauthorized"},{status:401});try{const quick=req.nextUrl.searchParams.get("quick")==="1";const first=await text(`${INDEX}?limit=100&page=1`);const statedTotal=Number(first.match(/([\d,]+)\s+vehicles?\s+found/i)?.[1]?.replace(/,/g,"")||first.match(/Page\s+1\s+of\s+\d+\s*\(([\d,]+)\s+total vehicles\)/i)?.[1]?.replace(/,/g,"")||0);const pages=Math.max(1,Number(first.match(/Page\s+1\s+of\s+(\d+)/i)?.[1]||Math.ceil(statedTotal/100)||1));const pageTexts=[first];for(let p=2;p<=pages;p++)pageTexts.push(await text(`${INDEX}?limit=100&page=${p}`));const base=Array.from(new Map(pageTexts.flatMap(parse).map(v=>[v.vin,v])).values());const sourceTotal=statedTotal||base.length;if(!base.length)throw new Error(`Dealer inventory feed was reached, but no vehicles could be parsed. Feed preview: ${first.slice(0,180).replace(/\s+/g," ")}`);let enriched:V[]=base;if(!quick){enriched=[];for(let i=0;i<base.length;i+=8){enriched.push(...await Promise.all(base.slice(i,i+8).map(enrich)));}}const now=new Date().toISOString();const rows=enriched.map(v=>({...v,features:v.features||[],active:true,last_seen_at:now,updated_at:now}));for(let i=0;i<rows.length;i+=100)await rest("inventory_vehicles?on_conflict=vin",{method:"POST",headers:{Prefer:"resolution=merge-duplicates"},body:JSON.stringify(rows.slice(i,i+100))});if(base.length){await rest(`inventory_vehicles?vin=not.in.(${base.map(v=>`\"${v.vin}\"`).join(",")})`,{method:"PATCH",body:JSON.stringify({active:false,updated_at:now})}).catch(()=>null);}return NextResponse.json({ok:true,quick,sourceTotal,pages,parsed:base.length,enriched:quick?0:enriched.filter(v=>v.image_url).length,missing:Math.max(0,sourceTotal-base.length),syncedAt:now});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Inventory sync failed"},{status:500});}}
