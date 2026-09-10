import { NextRequest, NextResponse } from "next/server";

type ChatMessage={role:"user"|"assistant";content:string};
type Vehicle={title:string;condition:string;mileage:number|null;price:number|null;vin:string;url:string;image?:string|null;stock?:string|null;exterior?:string|null;interior?:string|null};

function outputText(payload:any){if(typeof payload?.output_text==="string")return payload.output_text;const out:string[]=[];for(const item of payload?.output??[])for(const part of item?.content??[])if(part?.type==="output_text"&&typeof part.text==="string")out.push(part.text);return out.join("");}
function contactFrom(text:string){return{email:text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]??null,phone:text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0]??null};}
function scoreLead(text:string){let s=10;if(/today|tomorrow|this week|appointment|come in|test drive|available|buy|purchase|trade/i.test(text))s+=35;if(/phone|call|text|email|@|\d{3}[-.\s]\d{3}/i.test(text))s+=30;if(/budget|under \$|finance|payment|lease|cash/i.test(text))s+=15;return Math.min(s,100);}
function intelligence(text:string){const budget=text.match(/(?:under|budget|up to|max(?:imum)?)\s*\$?([\d,]+)\s*(k)?/i);let max=budget?Number(budget[1].replace(/,/g,'')):null;if(max&&budget?.[2])max*=1000;const models=['Range Rover Sport','Range Rover','Defender 130','Defender 110','Defender 90','Defender','Discovery Sport','Discovery','Velar','Evoque','F-PACE'].filter(m=>new RegExp(m.replace('-','[- ]?'),'i').test(text));const exterior=['black','white','green','blue','red','silver','gray','grey','bronze'].filter(c=>new RegExp(`\\b${c}\\b`,'i').test(text));const score=scoreLead(text);return{budget_max:max,desired_models:models,desired_exterior:exterior,needs_third_row:/third[ -]?row|3rd[ -]?row|7[ -]?seat|seven[ -]?seat/i.test(text),trade_in:/\btrade(?:-?in)?\b/i.test(text),wants_new:/\bnew\b/i.test(text),wants_used:/used|pre[- ]?owned|cpo|certified/i.test(text),timeframe:/today/i.test(text)?'today':/tomorrow/i.test(text)?'tomorrow':/this week/i.test(text)?'this week':/this month/i.test(text)?'this month':null,temperature:score>=75?'hot':score>=45?'warm':'cold'};}

async function saveCrm(sessionId:string,messages:ChatMessage[],query:string){const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key||!sessionId)return;const allText=messages.map(m=>m.content).join("\n"),contact=contactFrom(allText),intel=intelligence(allText),score=scoreLead(allText);const payload={session_id:sessionId,last_request:query,transcript:messages,phone:contact.phone,email:contact.email,lead_score:score,status:score>=70?'qualified':'new',last_seen_at:new Date().toISOString(),...intel,next_best_action:contact.phone?(score>=70?'Text now while intent is high.':'Follow up personally and clarify timing.'):'Capture phone number and timing.'};const r=await fetch(`${url}/rest/v1/jon_rover_leads?on_conflict=session_id`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify(payload)}).catch(()=>null);if(r?.ok){const lead=(await r.json())?.[0];if(lead)await fetch(`${url}/rest/v1/crm_activities`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({lead_id:lead.id,type:'concierge',title:'AI concierge conversation',body:query,metadata:{score}})}).catch(()=>{});}}

async function getInventory(origin:string,latest:string):Promise<Vehicle[]>{
  // Chat must never wait on the dealer scraper. Use only the saved Supabase catalog here.
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
    const messages=(Array.isArray(body?.messages)?body.messages:[]).filter((m:any)=>m&&["user","assistant"].includes(m.role)&&typeof m.content==="string").slice(-12) as ChatMessage[];
    const sessionId=String(body?.sessionId||"").slice(0,120);
    const latest=[...messages].reverse().find(m=>m.role==="user")?.content?.trim()||"";
    if(!latest)return NextResponse.json({error:"Message required"},{status:400});

    const vehicles=await getInventory(request.nextUrl.origin,latest);
    const apiKey=process.env.OPENAI_API_KEY;
    if(!apiKey){
      await saveCrm(sessionId,messages,latest);
      return NextResponse.json({reply:"I’m here. Tell me the model, budget, seating needs, color, or anything else that matters and I’ll narrow it down for you.",degraded:true,reason:"missing_ai_key"});
    }

    const compact=vehicles.map(v=>({title:v.title,condition:v.condition,mileage:v.mileage,price:v.price,vin:v.vin,stock:v.stock??null,exterior:v.exterior??null,interior:v.interior??null,url:v.url}));
    const inventoryContext=compact.length?`CURRENT SAVED WILLOW GROVE INVENTORY CANDIDATES:\n${JSON.stringify(compact)}\nUse only these candidates for specific vehicle facts.`:"The saved inventory catalog is temporarily unavailable or has no matching vehicles. Continue the conversation normally, help clarify what the shopper wants, and do not invent any vehicle availability, price, VIN, mileage, color, or stock facts.";

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
        instructions:`You are Rover, Jon McGeehan's virtual shopping assistant for Jaguar Land Rover Willow Grove. Be concise, natural, warm and useful. Ask at most one question at a time. Never pretend to be Jon, negotiate, promise discounts, or invent vehicle facts. Respect exact model/color/seating requests and budgets; never recommend more than $10,000 over a stated budget. When enough is known and inventory is supplied, recommend up to 3 supplied vehicles. When buying intent is high, offer a handoff to Jon and ask for a phone number when appropriate. ${inventoryContext}`,
        input:messages
      })
    }).finally(()=>clearTimeout(timer));

    if(!response.ok){
      const errorText=await response.text().catch(()=>"");
      console.error("OpenAI concierge error",response.status,errorText.slice(0,500));
      await saveCrm(sessionId,messages,latest);
      return NextResponse.json({reply:"I’m here. Tell me what you’re looking for and I’ll help narrow it down. If you already know the model, budget, color, or seating you need, send that over.",degraded:true,reason:"ai_api_error"});
    }

    const reply=outputText(await response.json()).trim()||"What matters most to you in the vehicle?";
    const updated=[...messages,{role:"assistant",content:reply}] as ChatMessage[];
    await saveCrm(sessionId,updated,latest);
    return NextResponse.json({reply,vehicles:compact.slice(0,3),inventoryAvailable:compact.length>0});
  }catch(error){
    console.error("Concierge route failed",error);
    return NextResponse.json({reply:"I’m here. Tell me what you’re looking for and I’ll help narrow it down.",degraded:true,reason:"route_error"});
  }
}
