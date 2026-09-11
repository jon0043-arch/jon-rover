import { NextRequest, NextResponse } from "next/server";

type Message={role:"user"|"assistant";content:string};

function config(){
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const candidates:[string,string|undefined][]=[
    ['SUPABASE_SERVICE_ROLE_KEY',process.env.SUPABASE_SERVICE_ROLE_KEY],
    ['SUPABASE_SECRET_KEY',process.env.SUPABASE_SECRET_KEY],
    ['SUPABASE_SERVICE_KEY',process.env.SUPABASE_SERVICE_KEY],
  ];
  const found=candidates.find(([,v])=>Boolean(v));
  return url&&found?.[1]?{url:url.replace(/\/$/,''),key:found[1],keySource:found[0]}:null;
}

const NAME_STOP=/^(?:looking|interested|trying|shopping|want|need|good|fine|okay|ok|yes|no|here|ready|range|rover|defender|discovery|velar|evoque|jaguar|sport|lease|finance|cash|today|tomorrow|black|white|green|blue|red|silver|gray|grey|bronze|vehicle|car|suv|numbers|price|payment|thanks|thank|hello|hi|hey|sure|maybe|probably)$/i;
function cleanName(value?:string|null){
  if(!value)return null;
  const raw=value
    .trim()
    .replace(/^[\s"']+|[\s"']+$/g,'')
    .replace(/[.,!?;:]+$/,'')
    .replace(/\s+/g,' ');
  if(!raw||raw.length>60||!/^([A-Za-z][A-Za-z' -]*)$/.test(raw))return null;
  const parts=raw.split(' ').filter(Boolean);
  if(!parts.length||parts.length>4||parts.some(p=>NAME_STOP.test(p)))return null;
  return parts.map(p=>p.charAt(0).toUpperCase()+p.slice(1).toLowerCase()).join(' ');
}

function extractExplicitName(text:string){
  const patterns=[
    /\bmy name is\s+([A-Za-z][A-Za-z' -]{0,50}?)(?=\s*(?:[,!.?]|$|\band\b|\bi\b))/i,
    /\bmy name'?s\s+([A-Za-z][A-Za-z' -]{0,50}?)(?=\s*(?:[,!.?]|$|\band\b|\bi\b))/i,
    /\bname is\s+([A-Za-z][A-Za-z' -]{0,50}?)(?=\s*(?:[,!.?]|$|\band\b|\bi\b))/i,
    /\bthis is\s+([A-Za-z][A-Za-z' -]{0,50}?)(?=\s*(?:[,!.?]|$|\band\b|\bi\b))/i,
    /\bi(?:'m| am)\s+([A-Za-z][A-Za-z' -]{0,50}?)(?=\s*(?:[,!.?]|$|\band\b|\blooking\b|\binterested\b|\bshopping\b|\btrying\b|\bwant\b|\bneed\b))/i,
    /\bit(?:'s| is)\s+([A-Za-z][A-Za-z' -]{0,50}?)(?=\s*(?:[,!.?]|$|\band\b))/i,
    /^([A-Za-z][A-Za-z' -]{1,40})\s+here[.!]?$/i,
  ];
  for(const pattern of patterns){
    const match=text.match(pattern)?.[1];
    const name=cleanName(match);
    if(name)return name;
  }
  return null;
}

function assistantAskedForName(text:string){
  return /(?:what(?:'s| is) your (?:full )?name|what should i call you|may i have your (?:full )?name|can i (?:get|have) your (?:full )?name|first(?: and last)? name|last name|who am i speaking with|who(?:'s| is) this|your name)/i.test(text);
}

function contactFrom(messages:Message[]){
  const userText=messages.filter(m=>m.role==='user').map(m=>m.content).join('\n');
  const email=userText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]??null;
  const phone=userText.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0]??null;
  let name:string|null=null;

  for(let i=messages.length-1;i>=0&&!name;i--){
    const cur=messages[i];
    if(cur.role!=='user')continue;
    const text=cur.content.trim();

    name=extractExplicitName(text);
    if(name)break;

    const prev=messages[i-1];
    const asked=prev?.role==='assistant'&&assistantAskedForName(prev.content);
    if(asked){
      const directAnswer=text.split(/[,.!?]/)[0].trim();
      const standalone=cleanName(directAnswer);
      if(standalone){name=standalone;break;}
    }

    const compact=text.replace(/[.!?]+$/,'').trim();
    const standalone=cleanName(compact);
    if(standalone&&compact.split(/\s+/).length>=2&&!/[0-9@]/.test(compact)){
      name=standalone;
      break;
    }
  }
  return{name,phone,email};
}

export async function GET(){
  const c=config();
  if(!c)return NextResponse.json({ok:false,error:'Supabase server credentials missing',hasUrl:Boolean(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL),acceptedKeyNames:['SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_KEY']},{status:503});
  const h={apikey:c.key,Authorization:`Bearer ${c.key}`};
  try{
    const r=await fetch(`${c.url}/rest/v1/jon_rover_leads?select=id&limit=1`,{headers:h,cache:'no-store'});
    const detail=await r.text();
    return NextResponse.json({ok:r.ok,keySource:c.keySource,table:'jon_rover_leads',status:r.status,detail:r.ok?undefined:detail.slice(0,500)},{status:r.ok?200:502});
  }catch(error){return NextResponse.json({ok:false,keySource:c.keySource,error:error instanceof Error?error.message:'Supabase request failed'},{status:502});}
}

export async function POST(req:NextRequest){
  const c=config();
  if(!c)return NextResponse.json({saved:false,error:"CRM database not configured",hasUrl:Boolean(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL),acceptedKeyNames:['SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_KEY']},{status:503});
  try{
    const body=await req.json();
    const sessionId=String(body?.sessionId||"").slice(0,120);
    const messages=(Array.isArray(body?.messages)?body.messages:[]).filter((m:any)=>m&&["user","assistant"].includes(m.role)&&typeof m.content==="string").slice(-100) as Message[];
    if(!sessionId||!messages.length)return NextResponse.json({saved:false,error:"Missing session or messages"},{status:400});
    const contact=contactFrom(messages);
    const lastUser=[...messages].reverse().find(m=>m.role==="user")?.content||"";
    const baseHeaders={apikey:c.key,Authorization:`Bearer ${c.key}`,"Content-Type":"application/json"};
    const payload:any={session_id:sessionId,last_request:lastUser,transcript:messages,last_seen_at:new Date().toISOString()};
    if(contact.name)payload.name=contact.name;
    if(contact.phone)payload.phone=contact.phone;
    if(contact.email)payload.email=contact.email;

    const r=await fetch(`${c.url}/rest/v1/jon_rover_leads?on_conflict=session_id`,{method:"POST",headers:{...baseHeaders,Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify(payload)});
    const raw=await r.text();
    if(!r.ok){console.error("Direct CRM capture failed",r.status,raw);return NextResponse.json({saved:false,error:"CRM save failed",status:r.status,detail:raw.slice(0,1000),keySource:c.keySource},{status:502});}
    let lead:any=null;
    try{const rows=JSON.parse(raw||'[]');lead=Array.isArray(rows)?rows[0]??null:null;}catch{}
    if(!lead){
      const verify=await fetch(`${c.url}/rest/v1/jon_rover_leads?session_id=eq.${encodeURIComponent(sessionId)}&select=*&limit=1`,{headers:baseHeaders,cache:'no-store'});
      if(verify.ok){const rows=await verify.json();lead=Array.isArray(rows)?rows[0]??null:null;}
    }
    if(!lead)return NextResponse.json({saved:false,error:'Supabase accepted the write but the lead could not be verified',keySource:c.keySource},{status:502});
    return NextResponse.json({saved:true,lead,keySource:c.keySource});
  }catch(error){console.error("Direct CRM capture error",error);return NextResponse.json({saved:false,error:"CRM save failed",detail:error instanceof Error?error.message:'Unknown error'},{status:500});}
}
