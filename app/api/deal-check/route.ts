import { NextRequest,NextResponse } from "next/server";

function outputText(payload:any){
  if(typeof payload?.output_text==="string") return payload.output_text;
  const out:string[]=[];
  for(const item of payload?.output??[]) for(const part of item?.content??[]) if(part?.type==="output_text"&&typeof part.text==="string") out.push(part.text);
  return out.join("");
}

export async function POST(request:NextRequest){
  try{
    const body=await request.json();
    const image=String(body?.image||"");
    if(!image.startsWith("data:image/")) return NextResponse.json({error:"Upload a screenshot or photo of the deal."},{status:400});
    if(image.length>14_000_000) return NextResponse.json({error:"That screenshot is too large. Try cropping it or taking a smaller screenshot."},{status:413});
    const key=process.env.OPENAI_API_KEY;
    if(!key) return NextResponse.json({error:"Deal Check isn't connected to the analyzer yet."},{status:503});

    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),30000);
    let response:Response;
    try{
      response=await fetch("https://api.openai.com/v1/responses",{
        method:"POST",
        signal:controller.signal,
        headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
        body:JSON.stringify({
          model:process.env.OPENAI_MODEL||"gpt-5.6",
          store:false,
          reasoning:{effort:"low"},
          instructions:"You analyze screenshots/photos of vehicle deal worksheets for Jon Rover Deal Check. Read only numbers and terms actually visible. Never invent missing data. Identify vehicle/MSRP/selling price/discount, rebates, dealer/doc fees, government fees/tax, add-ons/products, trade allowance, payoff/equity, cash down, APR, term, payment, due at signing and total if visible. Explain suspicious or unclear items neutrally; do not accuse a dealer of wrongdoing. A fee being present does not itself make it bad. Distinguish discount from rebates when possible. Return ONLY valid JSON with keys: vehicle, headline, summary, numbers (array of {label,value,note}), flags (array of {title,detail,severity} where severity is info,ask,good), questions (array of strings), confidence (high,medium,low). Keep summary concise and useful. If image is unreadable, use low confidence and explain what needs a clearer screenshot.",
          input:[{role:"user",content:[{type:"input_text",text:"Analyze this vehicle deal. Give me a plain-English Deal Check and the questions I should ask before signing."},{type:"input_image",image_url:image}]}]
        })
      });
    } finally { clearTimeout(timer); }

    if(!response.ok){
      const detail=await response.text();
      console.error("Deal Check AI error",response.status,detail.slice(0,1500));
      if(response.status===401||response.status===403) return NextResponse.json({error:"Deal Check's AI connection needs to be reconfigured."},{status:503});
      if(response.status===413) return NextResponse.json({error:"That screenshot is too large. Try cropping it and upload again."},{status:413});
      return NextResponse.json({error:"I couldn't analyze that screenshot. Try a clearer or more tightly cropped image."},{status:502});
    }

    const payload=await response.json();
    const text=outputText(payload).trim().replace(/^```json\s*/i,"").replace(/```$/,"" ).trim();
    if(!text) return NextResponse.json({error:"The analyzer didn't return a result. Please try the screenshot again."},{status:502});
    try{return NextResponse.json(JSON.parse(text));}
    catch{console.error("Deal Check JSON parse error",text.slice(0,1500));return NextResponse.json({error:"I could read the screenshot, but couldn't finish the Deal Check. Please try it once more."},{status:502});}
  }catch(error:any){
    console.error("Deal Check route error",error);
    if(error?.name==="AbortError") return NextResponse.json({error:"The screenshot took too long to analyze. Try cropping it to just the deal numbers and upload again."},{status:504});
    return NextResponse.json({error:"Something went wrong analyzing the deal. Please try again."},{status:500});
  }
}
