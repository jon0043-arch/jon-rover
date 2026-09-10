import { NextRequest, NextResponse } from "next/server";

type ChatMessage={role:"user"|"assistant";content:string};
type Vehicle={title:string;condition:string;mileage:number|null;price:number|null;vin:string;url:string;image?:string|null;stock?:string|null;exterior?:string|null;interior?:string|null};

function outputText(payload:any){if(typeof payload?.output_text==="string")return payload.output_text;const out:string[]=[];for(const item of payload?.output??[])for(const part of item?.content??[])if(part?.type==="output_text"&&typeof part.text==="string")out.push(part.text);return out.join("");}
function cleanName(value?:string|null){if(!value)return null;const v=value.trim().replace(/[^A-Za-z' -]/g,"").replace(/\s+/g," ");if(!v||v.length>60||/^(looking|interested|trying|shopping|want|need|good|fine|okay|ok|yes|no|here|ready)$/i.test(v))return null;return v.split(" ").slice(0,3).map(p=>p.charAt(0).toUpperCase()+p.slice(1).toLowerCase()).join(" ");}
function contactFrom(messages:ChatMessage[]){
  const userText=messages.filter(m=>m.role==="user").map(m=>m.content).join("\n");
  const email=userText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]??null;
  const phone=userText.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0]??null;
  let name:string|null=null;
  const explicit=userText.match(/(?:my name is|name's|name is|this is)\s+([A-Za-z][A-Za-z' -]{1,50})/i)?.[1]
    ||userText.match(/(?:^|[.!?]\s+)i(?:'m| am)\s+([A-Za-z][A-Za-z' -]{1,30})(?=\s*[.!?,]|\s*$)/im)?.[1];
  name=cleanName(explicit);
  if(!name){
    for(let i=messages.length-1;i>=1;i--){
      const current=messages[i],previous=messages[i-1];
      if(current.role!=="user"||previous.role!=="assistant")continue;
      if(/(?:what(?:'s| is) your name|first name|who am i speaking with|who(?:'s| is) this)/i.test(previous.content)){
        const short=current.content.trim();
        if(/^[A-Za-z][A-Za-z' -]{0,40}$/.test(short))name=cleanName(short);
        break;
      }
    }
  }
  return{name,phone,email};
}
function scoreLead(text:string){let s=10;if(/today|tomorrow|this week|appointment|come in|test drive|available|buy|purchase|trade/i.test(text))s+=35;if(/phone|call|text|email|@|\d{3}[-.\s]\d{3}/i.test(text))s+=30;if(/budget|under \$|finance|payment|lease|cash/i.test(text))s+=15;return Math.min(s,100);}
function intelligence(text:string){const budget=text.match(/(?:under|budget|up to|max(?:imum)?)\s*\$?([\d,]+)\s*(k)?/i);let max=budget?Number(budget[1].replace(/,/g,'')):null;if(max&&budget?.[2])max*=1000;const models=['Range Rover Sport','Range Rover','Defender 130','Defender 110','Defender 90','Defender','Discovery Sport','Discovery','Velar','Evoque','F-PACE'].filter(m=>new RegExp(m.replace('-','[- ]?'),'i').test(text));const exterior=['black','white','green','blue','red','silver','gray','grey','bronze'].filter(c=>new RegExp(`\\b${c}\\b`,'i').test(text));const score=scoreLead(text);return{budget_max:max,desired_models:models,desired_exterior:exterior,needs_third_row:/third[ -]?row|3rd[ -]?row|7[ -]?seat|seven[ -]?seat/i.test(text),trade_in:/\btrade(?:-?in)?\b/i.test(text),wants_new:/\bnew\b/i.test(text),wants_used:/used|pre[- ]?owned|cpo|certified/i.test(text),timeframe:/today/i.test(text)?'today':/tomorrow/i.test(text)?'tomorrow':/this week/i.test(text)?'this week':/this month/i.test(text)?'this month':null,temperature:score>=75?'hot':score>=45?'warm':'cold'};}

async function saveCrm(sessionId:string,messages:ChatMessage[],query:string){
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key||!sessionId){console.error("CRM save skipped: missing Supabase config or session id");return;}
  const headers={apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"};
  try{
    let existing:any=null;
    const existingResponse=await fetch(`${url}/rest/v1/jon_rover_leads?session_id=eq.${encodeURIComponent(sessionId)}&select=*&limit=1`,{headers,cache:"no-store"});
    if(existingResponse.ok){const rows=await existingResponse.json();existing=Array.isArray(rows)?rows[0]??null:null;}
    const allMessages:Array<ChatMessage>=Array.isArray(existing?.transcript)?existing.transcript:[];
    const mergedTranscript=[...allMessages];
    for(const m of messages){const last=mergedTranscript[mergedTranscript.length-1];if(!last||last.role!==m.role||last.content!==m.content)mergedTranscript.push(m);}
    const transcript=mergedTranscript.slice(-100);
    const allText=transcript.map(m=>m.content).join("\n");
    const contact=contactFrom(transcript),intel=intelligence(allText),score=Math.max(Number(existing?.lead_score||0),scoreLead(allText));
    const payload:any={session_id:sessionId,last_request:query,transcript,lead_score:score,status:score>=70?'qualified':(existing?.status||'new'),last_seen_at:new Date().toISOString(),...intel,next_best_action:(contact.phone||existing?.phone)?(score>=70?'Text now while intent is high.':'Follow up personally and clarify timing.'):(contact.name||existing?.name?'Capture mobile number next.':'Capture shopper name, then mobile number.')};
    if(contact.name)payload.name=contact.name;if(contact.phone)payload.phone=contact.phone;if(contact.email)payload.email=contact.email;
    const r=await fetch(`${url}/rest/v1/jon_rover_leads?on_conflict=session_id`,{method:"POST",headers:{...headers,Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify(payload)});
    if(!r.ok){const detail=await r.text().catch(()=>"");console.error("CRM lead upsert failed",r.status,detail.slice(0,1000));return;}
    const lead=(await r.json())?.[0];
    if(lead){const activity=await fetch(`${url}/rest/v1/crm_activities`,{method:'POST',headers,body:JSON.stringify({lead_id:lead.id,type:'concierge',title:'AI concierge conversation',body:query,metadata:{score,name:lead.name||null,phone:lead.phone||null,email:lead.email||null}})});if(!activity.ok){const detail=await activity.text().catch(()=>"");console.error("CRM activity insert failed",activity.status,detail.slice(0,500));}}
  }catch(error){console.error("CRM save failed",error);}
}

function titleFromUrl(v:Vehicle){
  if(v.title&&v.title.trim().split(/\s+/).length>1)return v.title.trim();
  try{
    const slug=new URL(v.url).pathname.split('/').filter(Boolean).find(x=>/^(?:new|used)-\d{4}-/i.test(x));
    if(!slug)return v.title;
    const words=slug.replace(/^(new|used)-/i,'').replace(/-[a-hj-npr-z0-9]{17}$/i,'').split('-');
    return words.map((w,i)=>i===0&&/^\d{4}$/.test(w)?w:w.toUpperCase()==='suv'?'SUV':w.toUpperCase()==='awd'?'AWD':w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
  }catch{return v.title;}
}
function modelNeed(text:string){const q=text.toLowerCase();if(q.includes('range rover sport'))return 'range rover sport';if(q.includes('defender 130'))return 'defender 130';if(q.includes('defender 110'))return 'defender 110';if(q.includes('defender 90'))return 'defender 90';if(q.includes('discovery sport'))return 'discovery sport';if(q.includes('f-pace')||q.includes('f pace'))return 'f-pace';for(const m of ['velar','evoque','defender','discovery','range rover'])if(q.includes(m))return m;return null;}
function budgetNeed(text:string){const m=text.match(/(?:under|below|max|up to|budget(?: of| is)?|less than)\s*\$?\s*([\d,.]+)\s*(k)?/i);if(!m)return null;let n=Number(m[1].replace(/,/g,''));if(m[2])n*=1000;return Number.isFinite(n)?n:null;}
function chooseInventory(rows:Vehicle[],conversation:string){
  const model=modelNeed(conversation),budget=budgetNeed(conversation),q=conversation.toLowerCase();
  const colors=['black','white','green','blue','red','silver','gray','grey','bronze'];const color=colors.find(c=>new RegExp(`\\b${c}\\b`,'i').test(q));
  return rows.map(v=>({...v,title:titleFromUrl(v)})).map(v=>{let score=0;const hay=`${v.title} ${v.exterior||''} ${v.interior||''}`.toLowerCase();if(model)score+=hay.includes(model)?150:-40;if(color)score+=hay.includes(color)?60:0;if(budget&&v.price!=null)score+=v.price<=budget?70:v.price<=budget+10000?10:-100;if(/\bnew\b/i.test(q))score+=v.condition.toLowerCase()==='new'?20:-20;if(/used|pre[- ]?owned|cpo|certified/i.test(q))score+=v.condition.toLowerCase()!=='new'?20:-20;return{v,score};}).sort((a,b)=>b.score-a.score||(a.v.price??Infinity)-(b.v.price??Infinity)).slice(0,40).map(x=>x.v);
}
async function getInventory(origin:string,conversation:string):Promise<Vehicle[]>{
  try{
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),5000);
    const r=await fetch(`${origin}/api/inventory/catalog?condition=all`,{cache:"no-store",signal:controller.signal});clearTimeout(timer);
    if(!r.ok){console.error('Rover inventory catalog returned',r.status);return[];}
    const data=await r.json();const rows:Array<Vehicle>=Array.isArray(data?.vehicles)?data.vehicles:[];
    return chooseInventory(rows,conversation);
  }catch(error){console.error('Rover inventory lookup failed',error);return[];}
}

export async function POST(request:NextRequest){
  try{
    const body=await request.json();
    const messages=(Array.isArray(body?.messages)?body.messages:[]).filter((m:any)=>m&&["user","assistant"].includes(m.role)&&typeof m.content==="string").slice(-20) as ChatMessage[];
    const sessionId=String(body?.sessionId||"").slice(0,120);
    const latest=[...messages].reverse().find(m=>m.role==="user")?.content?.trim()||"";if(!latest)return NextResponse.json({error:"Message required"},{status:400});
    const contact=contactFrom(messages);const conversation=messages.filter(m=>m.role==='user').map(m=>m.content).join('\n');const vehicles=await getInventory(request.nextUrl.origin,conversation);
    const apiKey=process.env.OPENAI_API_KEY;
    if(!apiKey){await saveCrm(sessionId,messages,latest);return NextResponse.json({reply:!contact.name?"I can help with that. First, what’s your name?":!contact.phone?`Thanks, ${contact.name}. What’s the best mobile number for Jon to reach you at?`:!contact.email?"Got it. If you’d like, what’s the best email for vehicle details?":"Tell me what you’re looking for and I’ll narrow it down for you.",degraded:true,reason:"missing_ai_key"});}
    const compact=vehicles.map(v=>({title:v.title,condition:v.condition,mileage:v.mileage,price:v.price,vin:v.vin,stock:v.stock??null,exterior:v.exterior??null,interior:v.interior??null,url:v.url}));
    const inventoryContext=compact.length?`CURRENT SAVED WILLOW GROVE INVENTORY CANDIDATES (${compact.length}):\n${JSON.stringify(compact)}\nUse only these candidates for specific vehicle facts. If a field is null, say you do not have that specific detail yet rather than inventing it.`:"The saved inventory catalog is temporarily unavailable. Continue helping, but do not claim any specific vehicle is in stock.";
    const contactContext=`CONTACT CAPTURE STATUS: name=${contact.name||"missing"}; phone=${contact.phone||"missing"}; email=${contact.email||"missing"}.`;
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",signal:controller.signal,headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-5.6-luna",store:false,reasoning:{effort:"low"},instructions:`You are Rover, Jon McGeehan's virtual shopping assistant for Jaguar Land Rover Willow Grove. Be concise, natural, calm, curious and useful. Never sound like a scripted car salesperson. Ask at most one question at a time. Never pretend to be Jon, negotiate, promise discounts, or invent vehicle facts. Respect exact model/color/seating requests and budgets; never recommend more than $10,000 over a stated budget.

Use a consultative NEPQ-style conversation flow inspired by problem-awareness and consequence-based questioning, without copying any proprietary script verbatim. Understand what prompted the search, uncover what the shopper wants different, clarify why it matters, define the ideal vehicle, then qualify model/body style/seating/color/new-vs-used/purchase-vs-lease/trade/timing/payment as relevant. Prefer neutral low-pressure questions. Avoid fake scarcity, aggressive closes, or manipulation.

LEASE LOGIC: If the shopper wants to lease and does not know a payment target, do not simply ask their budget. Give them a useful model-specific orientation first. Use Jon's current working ranges as rough guidance only, never as a quote or guaranteed payment: Range Rover Evoque roughly $900–$1,100/month; Range Rover Velar roughly $1,100–$1,200/month; Defender roughly $1,300–$1,700/month; Range Rover Sport roughly $1,400–$2,000/month; full-size Range Rover roughly $2,300–$3,000/month. Explain briefly that actual payment depends on exact vehicle/MSRP, term, annual mileage, money due at signing, taxes, credit and current programs. Then ask which payment neighborhood feels comfortable. If the shopper already names a model, give only that model's range instead of dumping every range. If they say "Sport" in a Land Rover context, interpret that as Range Rover Sport unless the conversation clearly indicates Discovery Sport. Never present these ranges as advertised offers or exact lease quotes.

When enough is known and inventory is supplied, recommend up to 3 supplied vehicles and explain briefly why each fits. Lead capture is a core goal but should feel natural. After providing some useful help, progressively collect missing contact fields in this order: name, mobile phone, then optional email. Ask for one missing field at a time. Respect a decline and do not repeatedly ask. ${contactContext} ${inventoryContext}`,input:messages})}).finally(()=>clearTimeout(timer));
    if(!response.ok){const errorText=await response.text().catch(()=>"");console.error("OpenAI concierge error",response.status,errorText.slice(0,500));await saveCrm(sessionId,messages,latest);const fallback=!contact.name?"I can help with that. What’s your name?":!contact.phone?`Thanks, ${contact.name}. What’s the best mobile number for Jon to reach you at?`:!contact.email?"If you’d like, what’s the best email for vehicle details?":"Tell me what you’re looking for and I’ll help narrow it down.";return NextResponse.json({reply:fallback,degraded:true,reason:"ai_api_error"});}
    const reply=outputText(await response.json()).trim()||(!contact.name?"What’s your name?":!contact.phone?"What’s the best mobile number for Jon to reach you at?":"What matters most to you in the vehicle?");
    const updated=[...messages,{role:"assistant",content:reply}] as ChatMessage[];await saveCrm(sessionId,updated,latest);
    return NextResponse.json({reply,vehicles:compact.slice(0,3),inventoryAvailable:compact.length>0,inventoryCandidates:compact.length});
  }catch(error){console.error("Concierge route failed",error);return NextResponse.json({reply:"I’m here. Tell me what you’re looking for and I’ll help narrow it down.",degraded:true,reason:"route_error"});}
}
