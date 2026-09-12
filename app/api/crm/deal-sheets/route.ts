import {NextResponse} from 'next/server';

const BUCKET='deal-sheets';
function config(){const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;return url&&key?{url,key}:null;}
function auth(key:string,contentType='application/json'){return {'apikey':key,'Authorization':`Bearer ${key}`,'Content-Type':contentType};}

export async function GET(){
  const c=config();
  if(!c)return NextResponse.json({error:'CRM storage not configured'},{status:503});
  try{
    const list=await fetch(`${c.url}/storage/v1/object/list/${BUCKET}`,{method:'POST',headers:auth(c.key),body:JSON.stringify({prefix:'',limit:100,offset:0,sortBy:{column:'created_at',order:'desc'}}),cache:'no-store'});
    if(!list.ok){if(list.status===400||list.status===404)return NextResponse.json({sheets:[]});return NextResponse.json({error:'Could not load deal sheets'},{status:502});}
    const objects:any[]=await list.json();
    const sheets=await Promise.all(objects.filter(x=>x?.name).map(async(x:any)=>{
      const signed=await fetch(`${c.url}/storage/v1/object/sign/${BUCKET}/${encodeURIComponent(x.name)}`,{method:'POST',headers:auth(c.key),body:JSON.stringify({expiresIn:3600})});
      const s=signed.ok?await signed.json():{};
      const signedURL=s?.signedURL||s?.signedUrl||'';
      return {name:x.name,created_at:x.created_at||x.updated_at,url:signedURL?`${c.url}/storage/v1${signedURL}`:''};
    }));
    return NextResponse.json({sheets});
  }catch(e){console.error('Deal sheet list failed',e);return NextResponse.json({error:'Could not load deal sheets'},{status:500});}
}
