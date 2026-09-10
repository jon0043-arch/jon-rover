import { NextRequest, NextResponse } from "next/server";

type Message={role:"user"|"assistant";content:string};

function config(){const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;return url&&key?{url,key}:null;}
function cleanName(value?:string|null){if(!value)return null;const v=value.trim().replace(/[^A-Za-z' -]/g,"").replace(/\s+/g," ");if(!v||v.length>60)return null;return v.split(" ").slice(0,3).map(p=>p.charAt(0).toUpperCase()+p.slice(1).toLowerCase()).join(" ");}
function contactFrom(messages:Message[]){const userText=messages.filter(m=>m.role==="user").map(m=>m.content).join("\n");const email=userText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]??null;const phone=userText.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0]??null;let name:string|null=null;const explicit=userText.match(/(?:my name is|name's|name is|this is)\s+([A-Za-z][A-Za-z' -]{1,50})/i)?.[1]||userText.match(/(?:^|[.!?]\s+)i(?:'m| am)\s+([A-Za-z][A-Za-z' -]{1,30})(?=\s*[.!?,]|\s*$)/im)?.[1];name=cleanName(explicit);if(!name){for(let i=messages.length-1;i>=1;i--){const cur=messages[i],prev=messages[i-1];if(cur.role!=="user"||prev.role!=="assistant")continue;if(/what(?:'s| is) your name|first name|who am i speaking with/i.test(prev.content)){const s=cur.content.trim();if(/^[A-Za-z][A-Za-z' -]{0,40}$/.test(s))name=cleanName(s);break;}}}return{name,phone,email};}

export async function POST(req:NextRequest){
  const c=config();
  if(!c)return NextResponse.json({saved:false,error:"CRM database not configured"},{status:503});
  try{
    const body=await req.json();
    const sessionId=String(body?.sessionId||"").slice(0,120);
    const messages=(Array.isArray(body?.messages)?body.messages:[]).filter((m:any)=>m&&["user","assistant"].includes(m.role)&&typeof m.content==="string").slice(-100) as Message[];
    if(!sessionId||!messages.length)return NextResponse.json({saved:false,error:"Missing session or messages"},{status:400});
    const contact=contactFrom(messages);
    const lastUser=[...messages].reverse().find(m=>m.role==="user")?.content||"";
    const headers={apikey:c.key,Authorization:`Bearer ${c.key}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=representation"};
    // Keep this payload deliberately small. These are the original CRM columns and avoid a newer optional
    // column preventing the entire lead from being created.
    const payload:any={session_id:sessionId,last_request:lastUser,transcript:messages,last_seen_at:new Date().toISOString()};
    if(contact.name)payload.name=contact.name;
    if(contact.phone)payload.phone=contact.phone;
    if(contact.email)payload.email=contact.email;
    const r=await fetch(`${c.url}/rest/v1/jon_rover_leads?on_conflict=session_id`,{method:"POST",headers,body:JSON.stringify(payload)});
    if(!r.ok){const detail=await r.text().catch(()=>"");console.error("Direct CRM capture failed",r.status,detail);return NextResponse.json({saved:false,error:"CRM save failed",detail},{status:502});}
    const rows=await r.json();
    return NextResponse.json({saved:true,lead:Array.isArray(rows)?rows[0]??null:null});
  }catch(error){console.error("Direct CRM capture error",error);return NextResponse.json({saved:false,error:"CRM save failed"},{status:500});}
}
