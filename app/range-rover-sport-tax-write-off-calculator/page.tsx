"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import "../blog/blog.css";

const SUV_CAP_2026 = 32000;

export default function Page(){
 const [price,setPrice]=useState(90000);
 const [businessUse,setBusinessUse]=useState(100);
 const [taxRate,setTaxRate]=useState(32);
 const result=useMemo(()=>{
   const pct=Math.max(0,Math.min(100,businessUse))/100;
   const businessBasis=Math.max(0,price)*pct;
   const eligible=businessUse>50;
   const section179=eligible?Math.min(businessBasis,SUV_CAP_2026):0;
   const estimatedSavings=section179*(Math.max(0,Math.min(60,taxRate))/100);
   return {businessBasis,eligible,section179,estimatedSavings};
 },[price,businessUse,taxRate]);
 const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n);
 return <main className="blogPage">
  <header className="blogNav shell"><Link href="/" className="brandLockup"><span className="brand">JON ROVER</span><span className="eyebrow">JAGUAR LAND ROVER WILLOW GROVE</span></Link><Link className="blogBack" href="/range-rover-sport-section-179">SECTION 179 GUIDE →</Link></header>
  <article><section className="articleHero shell"><p className="eyebrow">2026 SECTION 179 · ESTIMATOR</p><h1>RANGE ROVER SPORT TAX WRITE-OFF CALCULATOR</h1><p className="articleDek">Estimate the business-use basis, potential Section 179 SUV deduction and approximate federal tax impact of a qualifying Range Rover Sport.</p><p className="articleMeta">EDUCATIONAL ESTIMATE ONLY · NOT TAX OR ACCOUNTING ADVICE</p></section>
  <div className="articleBody shell">
   <section><h2>Estimate your potential 2026 Section 179 deduction</h2><p>For tax years beginning in 2026, the IRS lists a $32,000 Section 179 limit for heavy SUVs subject to the special SUV limitation. Qualified business use generally must be more than 50%. This calculator applies those two rules only; it does not determine your final tax deduction.</p>
   <div style={{display:"grid",gap:18,padding:"26px",border:"1px solid rgba(20,20,20,.18)",margin:"24px 0"}}>
    <label style={{display:"grid",gap:8}}><b>Vehicle purchase price</b><input type="number" min="0" value={price} onChange={e=>setPrice(Number(e.target.value))} style={{fontSize:22,padding:14,border:"1px solid #aaa"}}/></label>
    <label style={{display:"grid",gap:8}}><b>Qualified business use (%)</b><input type="number" min="0" max="100" value={businessUse} onChange={e=>setBusinessUse(Number(e.target.value))} style={{fontSize:22,padding:14,border:"1px solid #aaa"}}/></label>
    <label style={{display:"grid",gap:8}}><b>Estimated federal marginal tax rate (%)</b><input type="number" min="0" max="60" value={taxRate} onChange={e=>setTaxRate(Number(e.target.value))} style={{fontSize:22,padding:14,border:"1px solid #aaa"}}/></label>
   </div>
   <div style={{display:"grid",gap:12,padding:"28px",background:"#111",color:"#fff",margin:"24px 0"}}>
    <p className="eyebrow" style={{color:"#bbb"}}>YOUR ESTIMATE</p>
    <div><span>Business-use basis</span><div style={{fontSize:34,fontWeight:600}}>{money(result.businessBasis)}</div></div>
    <div><span>Potential Section 179 amount</span><div style={{fontSize:34,fontWeight:600}}>{money(result.section179)}</div></div>
    <div><span>Approx. federal tax reduction from that Section 179 amount</span><div style={{fontSize:34,fontWeight:600}}>{money(result.estimatedSavings)}</div></div>
    {!result.eligible&&<p style={{margin:0}}>At {businessUse}% business use, this estimate does not show a Section 179 deduction because qualified business use must generally be more than 50%.</p>}
   </div>
   <p><strong>Important:</strong> A tax deduction is not the same thing as getting the deduction amount back in cash. The estimated tax reduction above simply multiplies the estimated Section 179 amount by the tax rate you entered.</p></section>
   <section><h2>What this calculator does not include</h2><p>Your actual first-year deduction can be affected by taxable business income, other Section 179 property, depreciation rules, eligibility, placed-in-service date, financing, entity/taxpayer circumstances, subsequent business use and other limitations. Additional depreciation may be available after Section 179, but this calculator intentionally does not estimate it because the correct treatment depends on the taxpayer and transaction.</p></section>
   <section><h2>Does the Range Rover Sport meet the weight rule?</h2><p>The heavy-SUV rule applies to qualifying four-wheel passenger vehicles rated at more than 6,000 pounds and not more than 14,000 pounds gross vehicle weight rating (GVWR). Do not use curb weight for this test. Verify the GVWR of the exact vehicle before relying on the rule.</p></section>
   <section><h2>Why business use matters</h2><p>The IRS generally requires more than 50% qualified business use to elect Section 179 for mixed-use property. If business use later falls to 50% or less during the recovery period, recapture rules can apply. Keep appropriate mileage and business-use records and confirm your treatment with your tax professional.</p></section>
   <div className="articleCta"><p className="eyebrow">SHOPPING FOR A RANGE ROVER SPORT?</p><h3>Find the vehicle first. Let your tax professional confirm the deduction.</h3><p>I’m Jon McGeehan at Jaguar Land Rover Willow Grove. I can help you compare available Range Rover Sports, pricing and the vehicle information your accountant may want to review.</p><div className="articleActions"><a className="button dark" href="tel:+16092218478">CALL JON →</a><Link className="button" href="/range-rover-sport">VIEW RANGE ROVER SPORT →</Link></div></div>
   <p style={{fontSize:12,opacity:.7,marginTop:30}}>This calculator is for general educational purposes only and is not tax, legal or accounting advice. It does not determine eligibility or your actual deduction. Consult a qualified tax professional regarding your specific facts.</p>
  </div></article>
 </main>
}
