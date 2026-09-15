"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import "../blog/blog.css";

const SUV_CAP_2026 = 32000;
const models = ["Range Rover","Range Rover Sport","Defender","Discovery","Other vehicle"];

export default function Page(){
 const [vehicle,setVehicle]=useState("Range Rover Sport");
 const [price,setPrice]=useState(90000);
 const [businessUse,setBusinessUse]=useState(100);
 const [taxRate,setTaxRate]=useState(32);
 const [gvwr,setGvwr]=useState(6500);
 const [condition,setCondition]=useState("New");
 const result=useMemo(()=>{
   const pct=Math.max(0,Math.min(100,businessUse))/100;
   const businessBasis=Math.max(0,price)*pct;
   const businessEligible=businessUse>50;
   const heavySuv=gvwr>6000&&gvwr<=14000;
   const section179=businessEligible&&heavySuv?Math.min(businessBasis,SUV_CAP_2026):0;
   const estimatedSavings=section179*(Math.max(0,Math.min(60,taxRate))/100);
   return {businessBasis,businessEligible,heavySuv,section179,estimatedSavings};
 },[price,businessUse,taxRate,gvwr]);
 const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n);
 return <main className="blogPage">
  <header className="blogNav shell"><Link href="/" className="brandLockup"><span className="brand">JON ROVER</span><span className="eyebrow">JAGUAR LAND ROVER WILLOW GROVE</span></Link><Link className="blogBack" href="/range-rover-sport-section-179">SECTION 179 GUIDE →</Link></header>
  <article><section className="articleHero shell"><p className="eyebrow">2026 · FREE ESTIMATOR</p><h1>SECTION 179 VEHICLE TAX DEDUCTION CALCULATOR</h1><p className="articleDek">Estimate the business-use basis and potential Section 179 SUV deduction for a qualifying vehicle, including Range Rover, Range Rover Sport, Defender and Discovery.</p><p className="articleMeta">EDUCATIONAL ESTIMATE ONLY · NOT TAX OR ACCOUNTING ADVICE</p></section>
  <div className="articleBody shell">
   <section><h2>Estimate your potential 2026 Section 179 deduction</h2><p>For tax years beginning in 2026, the IRS lists a $32,000 Section 179 limit for heavy SUVs subject to the special SUV limitation. Qualified business use generally must be more than 50%. Enter the GVWR from the exact vehicle's certification label or official specifications—not curb weight.</p>
   <div style={{display:"grid",gap:18,padding:"26px",border:"1px solid rgba(20,20,20,.18)",margin:"24px 0"}}>
    <label style={{display:"grid",gap:8}}><b>Vehicle</b><select value={vehicle} onChange={e=>setVehicle(e.target.value)} style={{fontSize:18,padding:14,border:"1px solid #aaa",background:"white"}}>{models.map(m=><option key={m}>{m}</option>)}</select></label>
    <label style={{display:"grid",gap:8}}><b>New or used?</b><select value={condition} onChange={e=>setCondition(e.target.value)} style={{fontSize:18,padding:14,border:"1px solid #aaa",background:"white"}}><option>New</option><option>Used</option></select></label>
    <label style={{display:"grid",gap:8}}><b>Vehicle purchase price</b><input type="number" min="0" value={price} onChange={e=>setPrice(Number(e.target.value))} style={{fontSize:22,padding:14,border:"1px solid #aaa"}}/></label>
    <label style={{display:"grid",gap:8}}><b>GVWR (lbs)</b><input type="number" min="0" value={gvwr} onChange={e=>setGvwr(Number(e.target.value))} style={{fontSize:22,padding:14,border:"1px solid #aaa"}}/><small>Use gross vehicle weight rating (GVWR), not curb weight. Verify the exact vehicle.</small></label>
    <label style={{display:"grid",gap:8}}><b>Qualified business use (%)</b><input type="number" min="0" max="100" value={businessUse} onChange={e=>setBusinessUse(Number(e.target.value))} style={{fontSize:22,padding:14,border:"1px solid #aaa"}}/></label>
    <label style={{display:"grid",gap:8}}><b>Estimated federal marginal tax rate (%)</b><input type="number" min="0" max="60" value={taxRate} onChange={e=>setTaxRate(Number(e.target.value))} style={{fontSize:22,padding:14,border:"1px solid #aaa"}}/></label>
   </div>
   <div style={{display:"grid",gap:14,padding:"28px",background:"#111",color:"#fff",margin:"24px 0"}}>
    <p className="eyebrow" style={{color:"#bbb"}}>YOUR 2026 ESTIMATE · {condition.toUpperCase()} {vehicle.toUpperCase()}</p>
    <div><span>Business-use basis</span><div style={{fontSize:34,fontWeight:600}}>{money(result.businessBasis)}</div></div>
    <div><span>Potential Section 179 SUV amount</span><div style={{fontSize:34,fontWeight:600}}>{money(result.section179)}</div></div>
    <div><span>Approx. federal tax reduction from that Section 179 amount</span><div style={{fontSize:34,fontWeight:600}}>{money(result.estimatedSavings)}</div></div>
    {!result.heavySuv&&<p style={{margin:0}}>The GVWR entered does not fall within the more-than-6,000-lb through 14,000-lb heavy-SUV range used by this estimator. Different vehicle depreciation rules may apply.</p>}
    {!result.businessEligible&&<p style={{margin:0}}>At {businessUse}% business use, this estimator does not show a Section 179 deduction because qualified business use generally must be more than 50%.</p>}
   </div>
   <p><strong>Important:</strong> This is not an estimate of your entire first-year vehicle write-off. Section 179 is only one part of the depreciation rules, and a deduction is not the same as receiving that amount back in cash.</p></section>
   <section><h2>Can a used vehicle qualify for Section 179?</h2><p>Section 179 can apply to qualifying property acquired by purchase; a vehicle does not have to be brand new solely because it is being considered for Section 179. Eligibility still depends on the taxpayer, business use, acquisition, placed-in-service date and other IRS requirements. Confirm a used vehicle's treatment with your tax professional.</p></section>
   <section><h2>Which Land Rovers may be worth checking?</h2><p>Business owners commonly research the Range Rover, Range Rover Sport, Defender and Discovery because certain configurations may have a GVWR above 6,000 pounds. GVWR varies by model and configuration, so this calculator deliberately does not assume that a model qualifies. Verify the exact vehicle's GVWR before making a tax decision.</p></section>
   <section><h2>What the calculator does not determine</h2><p>Your actual deduction can be affected by taxable business income, total Section 179 property placed in service, vehicle classification, depreciation and bonus-depreciation rules, financing, entity and taxpayer circumstances, subsequent business use, recapture rules and other limitations. The $32,000 heavy-SUV amount is not automatically your total first-year deduction.</p></section>
   <div className="articleCta"><p className="eyebrow">LOOKING FOR A QUALIFYING LAND ROVER?</p><h3>Find the right vehicle. Let your tax professional confirm the deduction.</h3><p>I’m Jon McGeehan at Jaguar Land Rover Willow Grove. I can help you compare available vehicles and provide the vehicle information your accountant may want to review.</p><div className="articleActions"><a className="button dark" href="tel:+16092218478">CALL JON →</a><Link className="button" href="/#inventory">VIEW INVENTORY →</Link></div></div>
   <p style={{fontSize:12,opacity:.7,marginTop:30}}>This calculator is for general educational purposes only and is not tax, legal or accounting advice. It does not determine eligibility or your actual deduction. Consult a qualified tax professional regarding your specific facts and verify the exact vehicle's GVWR.</p>
  </div></article>
 </main>
}
