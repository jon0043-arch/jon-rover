"use client";

import Link from "next/link";
import { useState } from "react";

const SUV_CAP_2026 = 32000;
const money = (n:number) => new Intl.NumberFormat("en-US", { style:"currency", currency:"USD", maximumFractionDigits:0 }).format(n);
const clamp = (n:number,min:number,max:number) => Math.max(min,Math.min(max,n));

type Result = { eligible:boolean; businessBasis:number; section179:number; bonus:number; total:number; businessUse:number };

export default function Page(){
  const [price,setPrice] = useState(110000);
  const [businessUse,setBusinessUse] = useState(100);
  const [result,setResult] = useState<Result|null>(null);

  function calculate(){
    const use = clamp(Number.isFinite(businessUse) ? businessUse : 0,0,100);
    const basis = Math.max(0,Number.isFinite(price) ? price : 0) * (use/100);
    const eligible = use > 50;
    const section179 = eligible ? Math.min(basis,SUV_CAP_2026) : 0;
    const remainingBasis = Math.max(0,basis-section179);
    const bonus = eligible ? remainingBasis : 0;
    setResult({eligible,businessBasis:basis,section179,bonus,total:section179+bonus,businessUse:use});
  }

  return <main style={{fontFamily:"Arial,Helvetica,sans-serif",color:"#f7f7f4",background:"#080b0d",minHeight:"100vh"}}>
    <header style={{background:"rgba(7,9,10,.96)",color:"white",padding:"18px 5%",display:"flex",justifyContent:"space-between",alignItems:"center",gap:24,flexWrap:"wrap",borderBottom:"1px solid #272b2e"}}>
      <Link href="/" style={{color:"white",textDecoration:"none"}}><div style={{fontSize:24,fontWeight:800,letterSpacing:2}}>JON ROVER</div><small style={{letterSpacing:2,opacity:.6}}>JAGUAR LAND ROVER WILLOW GROVE</small></Link>
      <nav style={{display:"flex",gap:22,alignItems:"center",flexWrap:"wrap",fontSize:13}}><Link href="/#inventory" style={{color:"white",textDecoration:"none"}}>INVENTORY</Link><Link href="/blog" style={{color:"white",textDecoration:"none"}}>BLOG</Link><a href="tel:+16092218478" style={{color:"white",textDecoration:"none",border:"1px solid #555",padding:"12px 20px"}}>CALL JON · 609-221-8478</a></nav>
    </header>

    <section style={{position:"relative",minHeight:"calc(100vh - 82px)",background:"linear-gradient(90deg,rgba(5,8,10,.98) 0%,rgba(5,8,10,.92) 48%,rgba(5,8,10,.52) 100%), url('/rangerover-hero.png') center/cover no-repeat",padding:"64px 5% 80px"}}>
      <div style={{maxWidth:760,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:42}}>
          <p style={{letterSpacing:6,fontSize:13,margin:"0 0 14px",opacity:.78}}>2026 BUSINESS VEHICLE</p>
          <h1 style={{fontSize:"clamp(40px,8vw,74px)",fontWeight:300,letterSpacing:3,lineHeight:1,margin:"0 0 22px"}}>TAX WRITE-OFF CALCULATOR</h1>
          <p style={{fontSize:"clamp(18px,3vw,25px)",fontWeight:300,margin:0,opacity:.78}}>Estimate a potential first-year deduction.</p>
        </div>

        <div style={{display:"grid",gap:18}}>
          <label style={label}>PURCHASE PRICE
            <div style={fieldWrap}><span style={{opacity:.55,fontSize:24}}>$</span><input inputMode="numeric" type="number" min="0" value={price} onChange={e=>setPrice(Number(e.target.value))} style={input}/></div>
          </label>
          <label style={label}>QUALIFIED BUSINESS USE
            <div style={fieldWrap}><input inputMode="numeric" type="number" min="0" max="100" value={businessUse} onChange={e=>setBusinessUse(Number(e.target.value))} style={input}/><span style={{opacity:.55,fontSize:24}}>%</span></div>
          </label>

          <button type="button" onClick={calculate} style={{background:"#f2f0eb",color:"#101214",padding:"20px",textAlign:"center",fontWeight:800,letterSpacing:3,borderRadius:6,marginTop:4,border:0,cursor:"pointer",fontSize:14}}>CALCULATE</button>

          {result && <div style={{border:"1px solid #62676a",background:"rgba(7,10,12,.82)",backdropFilter:"blur(10px)",padding:"34px 22px",textAlign:"center",borderRadius:8,marginTop:16}}>
            {result.eligible ? <>
              <div style={{fontSize:13,letterSpacing:3,fontWeight:700,opacity:.8}}>POTENTIAL FIRST-YEAR DEDUCTION UP TO</div>
              <strong style={{display:"block",fontFamily:"Georgia,serif",fontSize:"clamp(58px,12vw,92px)",fontWeight:400,lineHeight:1.08,margin:"16px 0 20px"}}>{money(result.total)}</strong>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12,textAlign:"left",maxWidth:520,margin:"0 auto"}}>
                <div style={breakdown}><span style={breakdownLabel}>SECTION 179</span><strong style={breakdownValue}>{money(result.section179)}</strong></div>
                <div style={breakdown}><span style={breakdownLabel}>100% BONUS DEPRECIATION*</span><strong style={breakdownValue}>{money(result.bonus)}</strong></div>
              </div>
              <p style={{fontSize:12,lineHeight:1.55,opacity:.62,maxWidth:570,margin:"20px auto 0"}}>*Illustrates 100% bonus depreciation on the remaining business-use basis after Section 179, assuming the vehicle and transaction qualify.</p>
            </> : <>
              <div style={{fontSize:13,letterSpacing:3,fontWeight:700,opacity:.8}}>SECTION 179 / BONUS DEPRECIATION</div>
              <strong style={{display:"block",fontFamily:"Georgia,serif",fontSize:"clamp(42px,9vw,68px)",fontWeight:400,lineHeight:1.08,margin:"16px 0"}}>Over 50% business use required</strong>
              <p style={{fontSize:14,lineHeight:1.6,opacity:.7,maxWidth:560,margin:"0 auto"}}>At {result.businessUse}% qualified business use, this calculator does not estimate accelerated first-year depreciation.</p>
            </>}
          </div>}

          <p style={{fontSize:13,lineHeight:1.6,textAlign:"center",opacity:.65,maxWidth:650,margin:"8px auto 0"}}>Educational estimate only, not tax or accounting advice. For 2026, the special Section 179 heavy-SUV limit is $32,000. Actual eligibility and deductions depend on vehicle classification, qualified business use, acquisition and placed-in-service facts, taxable business income, other Section 179 property and your tax situation. Verify the exact vehicle GVWR and treatment with your tax professional.</p>
        </div>
      </div>
    </section>
  </main>
}

const label={display:"grid",gap:9,fontSize:12,fontWeight:700,letterSpacing:3} as const;
const fieldWrap={display:"flex",alignItems:"center",gap:8,border:"1px solid #666c70",background:"rgba(7,10,12,.78)",backdropFilter:"blur(8px)",padding:"0 20px",borderRadius:6,minHeight:82} as const;
const input={fontSize:25,padding:"20px 0",border:0,outline:"none",background:"transparent",color:"white",width:"100%",fontFamily:"inherit"} as const;
const breakdown={border:"1px solid rgba(255,255,255,.18)",padding:"16px",borderRadius:6} as const;
const breakdownLabel={display:"block",fontSize:10,letterSpacing:1.5,opacity:.6,marginBottom:7} as const;
const breakdownValue={fontSize:22,fontWeight:600} as const;
