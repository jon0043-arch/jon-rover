import {NextRequest,NextResponse} from 'next/server';

function config(){
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url&&key?{url,key}:null;
}

function headers(key:string){
  return {'apikey':key,'Authorization':`Bearer ${key}`,'Content-Type':'application/json'};
}

async function errorMessage(r:Response){
  try{
    const body=await r.json();
    return body?.message||body?.details||body?.hint||`Supabase returned ${r.status}`;
  }catch{
    return `Supabase returned ${r.status}`;
  }
}

export async function GET(req:NextRequest){
  const c=config();
  if(!c)return NextResponse.json({error:'CRM database not configured'},{status:503});
  const status=req.nextUrl.searchParams.get('status');
  const q=req.nextUrl.searchParams.get('q');
  let endpoint=`${c.url}/rest/v1/jon_rover_leads?select=*&order=lead_score.desc,last_seen_at.desc&limit=200`;
  if(status&&status!=='all')endpoint+=`&status=eq.${encodeURIComponent(status)}`;
  try{
    const r=await fetch(endpoint,{headers:headers(c.key),cache:'no-store'});
    if(!r.ok){
      const detail=await errorMessage(r);
      console.error('CRM Supabase GET failed',r.status,detail);
      return NextResponse.json({error:'CRM database unavailable',detail},{status:502});
    }
    let leads:any=await r.json();
    if(!Array.isArray(leads)){
      console.error('CRM Supabase GET returned non-array payload',leads);
      return NextResponse.json({error:'CRM database returned an invalid response'},{status:502});
    }
    if(q){
      const s=q.toLowerCase();
      leads=leads.filter((x:any)=>`${x.name||''} ${x.phone||''} ${x.email||''} ${x.last_request||''} ${(x.desired_models||[]).join(' ')}`.toLowerCase().includes(s));
    }
    return NextResponse.json({leads});
  }catch(error){
    console.error('CRM GET failed',error);
    return NextResponse.json({error:'CRM database unavailable'},{status:502});
  }
}

export async function PATCH(req:NextRequest){
  const c=config();
  if(!c)return NextResponse.json({error:'CRM database not configured'},{status:503});
  const body=await req.json();
  if(!body.id)return NextResponse.json({error:'Lead id required'},{status:400});
  const allowed=['name','phone','email','status','lead_score','temperature','summary','next_best_action','next_action_at','notes','assigned_to','budget_min','budget_max','desired_models','desired_exterior','desired_interior','wants_new','wants_used','needs_third_row','trade_in','timeframe'];
  const patch:Object=Object.fromEntries(Object.entries(body).filter(([k])=>allowed.includes(k)));
  try{
    const r=await fetch(`${c.url}/rest/v1/jon_rover_leads?id=eq.${encodeURIComponent(body.id)}`,{method:'PATCH',headers:{...headers(c.key),'Prefer':'return=representation'},body:JSON.stringify(patch)});
    if(!r.ok){
      const detail=await errorMessage(r);
      console.error('CRM Supabase PATCH failed',r.status,detail);
      return NextResponse.json({error:'Could not update CRM lead',detail},{status:502});
    }
    const rows=await r.json();
    return NextResponse.json({lead:Array.isArray(rows)?rows[0]??null:null});
  }catch(error){
    console.error('CRM PATCH failed',error);
    return NextResponse.json({error:'Could not update CRM lead'},{status:502});
  }
}
