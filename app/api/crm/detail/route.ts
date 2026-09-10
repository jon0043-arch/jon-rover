import {NextRequest,NextResponse} from 'next/server';
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
const headers=()=>({'apikey':key!,'Authorization':`Bearer ${key}`,'Content-Type':'application/json'});
async function get(path:string){const r=await fetch(`${url}/rest/v1/${path}`,{headers:headers(),cache:'no-store'});return r.ok?r.json():[];}
export async function GET(req:NextRequest){if(!url||!key)return NextResponse.json({error:'CRM database not configured'},{status:503});const id=req.nextUrl.searchParams.get('id');if(!id)return NextResponse.json({error:'Lead id required'},{status:400});const [lead,activities,tasks,interests,matches,appointments]=await Promise.all([
get(`jon_rover_leads?id=eq.${encodeURIComponent(id)}&select=*`),
get(`crm_activities?lead_id=eq.${encodeURIComponent(id)}&select=*&order=created_at.desc&limit=100`),
get(`crm_tasks?lead_id=eq.${encodeURIComponent(id)}&select=*&order=completed_at.asc,due_at.asc`),
get(`crm_vehicle_interest?lead_id=eq.${encodeURIComponent(id)}&select=*&order=last_seen_at.desc`),
get(`crm_inventory_matches?lead_id=eq.${encodeURIComponent(id)}&select=*&order=match_score.desc&limit=20`),
get(`crm_appointments?lead_id=eq.${encodeURIComponent(id)}&select=*&order=starts_at.desc`)
]);return NextResponse.json({lead:lead?.[0]||null,activities,tasks,interests,matches,appointments});}
