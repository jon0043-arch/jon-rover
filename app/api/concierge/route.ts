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
    for(const m of messages){
      const last=mergedTranscript[mergedTranscript.length-1];
      if(!last||last.role!==m.role||last.content!==m.content)mergedTranscript.push(m);
    }
    const transcript=mergedTranscript.slice(-100);
    const allText=transcript.map(m=>m.content).join("\n");
    const contact=contactFrom(transcript),intel=intelligence(allText),score=Math.max(Number(existing?.lead_score||0),scoreLead(allText));
    const payload:any={session_id:sessionId,last_request:query,transcript,lead_score:score,status:score>=70?'qualified':(existing?.status||'new'),last_seen_at:new Date().toISOString(),...intel,next_best_action:(contact.phone||existing?.phone)?(score>=70?'Text now while intent is high.':'Follow up personally and clarify timing.'):(contact.name||existing?.name?'Capture mobile number next.':'Capture shopper name, then mobile number.')};
    if(contact.name)payload.name=contact.name;
    if(contact.phone)payload.phone=contact.phone;
    if(contact.email)payload.email=contact.email;

    const r=await fetch(`${url}/rest/v1/jon_rover_leads?on_conflict=session_id`,{method:"POST",headers:{...headers,Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify(payload)});
    if(!r.ok){const detail=await r.text().catch(()=>"");console.error("CRM lead upsert failed",r.status,detail.slice(0,1000));return;}
    const lead=(await r.json())?.[0];
    if(lead){
      const activity=await fetch(`${url}/rest/v1/crm_activities`,{method:'POST',headers,body:JSON.stringify({lead_id:lead.id,type:'concierge',title:'AI concierge conversation',body:query,metadata:{score,name:lead.name||null,phone:lead.phone||null,email:lead.email||null}})});
      if(!activity.ok){const detail=await activity.text().catch(()=>"");console.error("CRM activity insert failed",activity.status,detail.slice(0,500));}
    }
  }catch(error){console.error("CRM save failed",error);}
}

async function getInventory(origin:string,latest:string):Promise<Vehicle[]>{
  try{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),2500);
    const r=await fetch(`${origin}/api/inventory/catalog?q=${encodeURIComponent(latest)}&condition=all`,{cache:"no-store",signal:controller.signal});
    clearTimeout(timer);
    if(!r.ok)return[];
    const data=await r.json();
    return Array.isArray(data?.vehicles)?data.vehicles.slice(0,15):[];
  }catch{return[];}
}

export async function POST(request:NextRequest){
  try{
    const body=await request.json();
    const messages=(Array.isArray(body?.messages)?body.messages:[]).filter((m:any)=>m&&["user","assistant"].includes(m.role)&&typeof m.content==="string").slice(-20) as ChatMessage[];
    const sessionId=String(body?.sessionId||"").slice(0,120);
    const latest=[...messages].reverse().find(m=>m.role==="user")?.content?.trim()||"";
    if(!latest)return NextResponse.json({error:"Message required"},{status:400});

    const contact=contactFrom(messages);
    const vehicles=await getInventory(request.nextUrl.origin,latest);
    const apiKey=process.env.OPENAI_API_KEY;
    if(!apiKey){
      await saveCrm(sessionId,messages,latest);
      return NextResponse.json({reply:!contact.name?"I can help with that. First, what’s your name?":!contact.phone?`Thanks, ${contact.name}. What’s the best mobile number for Jon to reach you at?`:!contact.email?"Got it. If you’d like, what’s the best email for vehicle details?":"Tell me what you’re looking for and I’ll narrow it down for you.",degraded:true,reason:"missing_ai_key"});
    }

    const compact=vehicles.map(v=>({title:v.title,condition:v.condition,mileage:v.mileage,price:v.price,vin:v.vin,stock:v.stock??null,exterior:v.exterior??null,interior:v.interior??null,url:v.url}));
    const inventoryContext=compact.length?`CURRENT SAVED WILLOW GROVE INVENTORY CANDIDATES:\n${JSON.stringify(compact)}\nUse only these candidates for specific vehicle facts.`:"The saved inventory catalog is temporarily unavailable or has no matching vehicles. Continue the conversation normally, help clarify what the shopper wants, and do not invent any vehicle availability, price, VIN, mileage, color, or stock facts.";
    const contactContext=`CONTACT CAPTURE STATUS: name=${contact.name||"missing"}; phone=${contact.phone||"missing"}; email=${contact.email||"missing"}.`;

    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),15000);
    const response=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      signal:controller.signal,
      headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        model:process.env.OPENAI_MODEL||"gpt-5.6-luna",
        store:false,
        reasoning:{effort:"low"},
        instructions:`You are Rover, Jon McGeehan's virtual shopping assistant for Jaguar Land Rover Willow Grove. Be concise, natural, calm, curious and useful. Never sound like a scripted car salesperson. Ask at most one question at a time. Never pretend to be Jon, negotiate, promise discounts, or invent vehicle facts. Respect exact model/color/seating requests and budgets; never recommend more than $10,000 over a stated budget.

Use a consultative NEPQ-style conversation flow inspired by problem-awareness and consequence-based questioning, without copying any proprietary script verbatim. The goal is to help the shopper discover what matters to them rather than pressure them. Use this sequence flexibly:
1. Connection / situation: understand what they are driving now, what they are considering, and what prompted them to look.
2. Problem awareness: uncover what is missing, frustrating, inconvenient, or important about their current vehicle or buying situation.
3. Consequence: when appropriate, gently explore why that matters (family, comfort, reliability, image, space, timing, ownership cost, etc.). Do not manufacture pain or guilt.
4. Solution awareness: ask what the ideal vehicle or outcome would need to do differently.
5. Qualification: clarify model, body style, seating, color, new vs pre-owned, purchase vs lease, trade, timing, and budget/payment only when relevant.
6. Commitment / next step: when there is a fit, make it easy to move forward with Jon personally.

Prefer neutral, low-pressure question phrasing such as "What has you looking at...", "What would you want to be different about...", "How important is that for you?", "What would the ideal setup look like?", and "Would it make sense to..." Avoid aggressive closes, fake scarcity, assumptive pressure, or manipulative language.

LEASE LOGIC: If the shopper says they want to lease and does not know a budget/payment, do NOT simply ask "what's your budget?" First explain that lease payments vary by model, MSRP, term, mileage allowance, money due at signing, taxes, credit, and current programs. Give only a broad orientation unless actual lease-program data is supplied. You may say that Jaguar/Land Rover leases can range from the high hundreds into $1,500+ depending on vehicle and structure, then ask whether they are hoping to be closer to roughly $900, $1,200, $1,500, or are flexible for the right vehicle. Never present that range as an actual quote. If they know a payment target, use it as a preference, not a guarantee.

When enough is known and inventory is supplied, recommend up to 3 supplied vehicles and explain briefly why each fits what the shopper said matters. Lead capture is a core goal, but do not make the conversation feel like a form. Help first, then progressively collect contact info. Once the shopper has shown genuine shopping intent or after you have answered their first useful vehicle question, collect missing contact fields in this order: name, mobile phone, then email. Ask for only one missing field at a time. Name and mobile number are high priority. Email is optional; ask for it after you have the phone, framed as useful for sending vehicle details. If the shopper declines a field, respect that and continue helping. Never ask again for a field already provided. If name is known, naturally use it occasionally. When buying intent is high, explain that Jon can personally follow up. ${contactContext} ${inventoryContext}`,
        input:messages
      })
    }).finally(()=>clearTimeout(timer));

    if(!response.ok){
      const errorText=await response.text().catch(()=>"");
      console.error("OpenAI concierge error",response.status,errorText.slice(0,500));
      await saveCrm(sessionId,messages,latest);
      const fallback=!contact.name?"I can help with that. What’s your name?":!contact.phone?`Thanks, ${contact.name}. What’s the best mobile number for Jon to reach you at?`:!contact.email?"If you’d like, what’s the best email for vehicle details?":"Tell me what you’re looking for and I’ll help narrow it down.";
      return NextResponse.json({reply:fallback,degraded:true,reason:"ai_api_error"});
    }

    const reply=outputText(await response.json()).trim()||(!contact.name?"What’s your name?":!contact.phone?"What’s the best mobile number for Jon to reach you at?":"What matters most to you in the vehicle?");
    const updated=[...messages,{role:"assistant",content:reply}] as ChatMessage[];
    await saveCrm(sessionId,updated,latest);
    return NextResponse.json({reply,vehicles:compact.slice(0,3),inventoryAvailable:compact.length>0});
  }catch(error){
    console.error("Concierge route failed",error);
    return NextResponse.json({reply:"I’m here. Tell me what you’re looking for and I’ll help narrow it down.",degraded:true,reason:"route_error"});
  }
}
