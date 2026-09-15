"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const SUV_CAP_2026 = 32000;
const money = (n:number) => new Intl.NumberFormat("en-US", { style:"currency", currency:"USD", maximumFractionDigits:0 }).format(n);

export default function Page(){
  const [price,setPrice] = useState(110000);
  const [businessUse,setBusinessUse] = useState(100);

  const deduction = useMemo(() => {
    const pct = Math.max(0,Math.min(100,businessUse))/100;
    return Math.min(Math.max(0,price)*pct,SUV_CAP_2026);
  },[price,businessUse]);

  return <main style={{fontFamily:"Arial,Helvetica,sans-serif",color:"#f7f7f4",background:"#080b0d",minHeight:"100vh"}}>
    <header style={{background:"rgba(7,9,10,.96)",color:"white",padding:"18px 5%",display:"flex",justifyContent:"space-between",alignItems:"center",gap:24,flexWrap:"wrap",borderBottom:"1px solid #272b2e"}}>
      <Link href="/" style={{color:"white",textDecoration:"none"}}><div style={{fontSize:24,fontWeight:800,letterSpacing:2}}>JON ROVER</div><small style={{letterSpacing:2,opacity:.6}}>JAGUAR LAND ROVER WILLOW GROVE</small></Link>
      <nav style={{display:"flex",gap:22,alignItems:"center",flexWrap:"wrap",fontSize:13}}><Link href="/#inventory" style={{color:"white",textDecoration:"none"}}>INVENTORY</Link><Link href="/blog" style={{color:"white",textDecoration:"none"}}>BLOG</Link><a href="tel:+16092218478" style={{color:"white",textDecoration:"none",border:"1px solid #555",padding:"12px 20px"}}>CALL JON · 609-221-8478</a></nav>
    </header>

    <section style={{position:"relative",minHeight:"calc(100vh - 82px)",background:"linear-gradient(90deg,rgba(5,8,10,.98) 0%,rgba(5,8,10,.92) 48%,rgba(5,8,10,.52) 100%), url('/rangerover-hero.png') center/cover no-repeat",padding:"64px 5% 80px"}}>
      <div style={{maxWidth:760,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:42}}>
          <p style={{letterSpacing:6,fontSize:13,margin:"0 0 14px",opacity:.78}}>SECTION 179</p>
          <h1 style={{fontSize:"clamp(44px,8vw,78px)",fontWeight:300,letterSpacing:3,lineHeight:1,margin:"0 0 22px"}}>CALCULATOR</h1>
          <p style={{fontSize:"clamp(18px,3vw,25px)",fontWeight:300,margin:0,opacity:.78}}>See your potential deduction.</p>
        </div>

        <div style={{display:"grid",gap:18}}>
          <label style={label}>PURCHASE PRICE
            <div style={fieldWrap}><span style={{opacity:.55,fontSize:24}}>$</span><input inputMode="numeric" type="number" min="0" value={price} onChange={e=>setPrice(Number(e.target.value))} style={input}/></div>
          </label>
          <label style={label}>BUSINESS USE
            <div style={fieldWrap}><input inputMode="numeric" type="number" min="0" max="100" value={businessUse} onChange={e=>setBusinessUse(Number(e.target.value))} style={input}/><span style={{opacity:.55,fontSize:24}}>%</span></div>
          </label>

          <div style={{background:"#f2f0eb",color:"#101214",padding:"20px",textAlign:"center",fontWeight:800,letterSpacing:3,borderRadius:6,marginTop:4}}>CALCULATE</div>

          <div style={{border:"1px solid #62676a",background:"rgba(7,10,12,.78)",backdropFilter:"blur(10px)",padding:"38px 22px",textAlign:"center",borderRadius:8,marginTop:16}}>
            <div style={{fontSize:13,letterSpacing:3,fontWeight:700,opacity:.8}}>YOU MAY BE ABLE TO DEDUCT UP TO</div>
            <strong style={{display:"block",fontFamily:"Georgia,serif",fontSize:"clamp(58px,12vw,92px)",fontWeight:400,lineHeight:1.08,margin:"16px 0 8px"}}>{money(deduction)}</strong>
          </div>

          <p style={{fontSize:13,lineHeight:1.6,textAlign:"center",opacity:.65,maxWidth:620,margin:"8px auto 0"}}>Estimate only. Section 179 eligibility depends on the vehicle, business use and your individual tax situation. Heavy-SUV limits may apply. Consult your tax professional to confirm eligibility.</p>
        </div>
      </div>
    </section>
  </main>
}

const label={display:"grid",gap:9,fontSize:12,fontWeight:700,letterSpacing:3} as const;
const fieldWrap={display:"flex",alignItems:"center",gap:8,border:"1px solid #666c70",background:"rgba(7,10,12,.78)",backdropFilter:"blur(8px)",padding:"0 20px",borderRadius:6,minHeight:82} as const;
const input={fontSize:25,padding:"20px 0",border:0,outline:"none",background:"transparent",color:"white",width:"100%",fontFamily:"inherit"} as const;
