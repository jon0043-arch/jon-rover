"use client";

import { useEffect, useState } from "react";

const JON_TEXT_NUMBER = "+12156087408";
const FEATURED_VIN = "SALYL2EXXTA829287";
const DOC_FEE = 490;

type Vehicle = {title:string;condition?:string;mileage:number|null;price:number|null;vin:string;url:string;image?:string|null;stock?:string|null;exterior?:string|null;interior?:string|null};

const fallback:Vehicle = {title:"2026 Range Rover Velar P250 Dynamic SE",price:58290,mileage:7400,stock:"SR26115",vin:FEATURED_VIN,exterior:"Fuji White",interior:"Cloud",image:"/velar-hero.png",url:"https://www.landroverwillowgrove.com/llm/inventory/"};
const money=(n:number|null)=>n==null?"CALL FOR PRICE":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n);
const miles=(n:number|null)=>n==null?null:`${new Intl.NumberFormat("en-US").format(n)} MILES`;

export default function FeaturedVehicles(){
  const [vehicle,setVehicle]=useState<Vehicle>(fallback);
  useEffect(()=>{let live=true;(async()=>{try{const r=await fetch(`/api/inventory?q=${encodeURIComponent("Range Rover Velar")}&browse=1&limit=250`,{cache:"no-store"});if(!r.ok)return;const data=await r.json();const match=(data.vehicles||[]).find((v:Vehicle)=>v.vin?.toUpperCase()===FEATURED_VIN);if(live&&match)setVehicle({...fallback,...match,image:match.image||fallback.image,url:match.url||fallback.url});}catch{}})();return()=>{live=false}},[]);
  const sms=`sms:${JON_TEXT_NUMBER}?body=${encodeURIComponent(`Hi Jon, I saw the featured ${vehicle.title} on your social media. Stock ${vehicle.stock||""}, VIN ${vehicle.vin}. Is it still available?`)}`;
  return <section id="featured" style={{position:"relative",overflow:"hidden",background:"#101513",color:"#f2eee6",padding:"clamp(72px,9vw,130px) 0"}}>
    <div aria-hidden="true" style={{position:"absolute",inset:0,backgroundImage:`linear-gradient(90deg,rgba(9,13,11,.96) 0%,rgba(9,13,11,.82) 38%,rgba(9,13,11,.52) 68%,rgba(9,13,11,.68) 100%),linear-gradient(0deg,rgba(9,13,11,.62),rgba(9,13,11,.2)),url('${vehicle.image||fallback.image}')`,backgroundSize:"cover",backgroundPosition:"center",backgroundRepeat:"no-repeat"}}/>
    <div className="shell" style={{position:"relative",zIndex:1}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:"28px",alignItems:"flex-end",flexWrap:"wrap",borderBottom:"1px solid rgba(242,238,230,.28)",paddingBottom:"28px"}}>
        <div><p className="eyebrow" style={{color:"#aeb7b2",margin:"0 0 16px"}}>SEEN ON SOCIAL</p><h2 style={{fontSize:"clamp(44px,6vw,88px)",lineHeight:.9,fontWeight:300,letterSpacing:".025em",margin:0}}>FEATURED<br/>VEHICLES.</h2></div>
        <p style={{maxWidth:"480px",fontSize:"13px",lineHeight:1.75,color:"#e0e3e1",margin:0}}>The cars I feature on Instagram and TikTok live here. Price, mileage and photos are pulled from the live Willow Grove listing.</p>
      </div>
      <article style={{marginTop:"34px",border:"1px solid rgba(242,238,230,.28)",display:"grid",gridTemplateColumns:"minmax(0,1.35fr) minmax(300px,.65fr)",background:"rgba(10,15,12,.38)"}} className="featuredVehicleCard">
        <a href={vehicle.url} target="_blank" rel="noreferrer" style={{position:"relative",minHeight:"clamp(340px,42vw,560px)",overflow:"hidden",display:"block",color:"inherit"}}>
          <img src={vehicle.image||fallback.image||""} alt={vehicle.title} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(0deg,rgba(7,10,9,.86) 0%,rgba(7,10,9,.12) 58%,rgba(7,10,9,.08) 100%)"}}/>
          <div style={{position:"absolute",left:"30px",right:"30px",bottom:"28px"}}><p className="eyebrow" style={{color:"#d5d9d6",margin:"0 0 10px"}}>LATEST FEATURE · THE VELAR FROM THE VIDEO</p><h3 style={{fontSize:"clamp(30px,4vw,56px)",lineHeight:1.02,fontWeight:300,letterSpacing:".02em",margin:0}}>{vehicle.title.toUpperCase()}</h3></div>
        </a>
        <div style={{padding:"clamp(28px,4vw,44px)",display:"flex",flexDirection:"column",justifyContent:"space-between",gap:"32px",borderLeft:"1px solid rgba(242,238,230,.28)",background:"rgba(8,12,10,.68)"}}>
          <div><p className="eyebrow" style={{color:"#b3bbb7",margin:"0 0 18px"}}>LIVE WILLOW GROVE LISTING</p><div style={{fontSize:"clamp(38px,5vw,64px)",fontWeight:300,letterSpacing:".02em",marginBottom:"6px"}}>{money(vehicle.price)}</div><div style={{fontSize:"9px",letterSpacing:".14em",color:"#9fa8a3",marginBottom:"24px"}}>+ {money(DOC_FEE)} DOCUMENTATION FEE</div><div style={{display:"grid",gap:"11px",fontSize:"11px",letterSpacing:".13em",color:"#d7dbd8"}}>{miles(vehicle.mileage)&&<span>{miles(vehicle.mileage)}</span>}<span>{vehicle.exterior||""}{vehicle.exterior&&vehicle.interior?" · ":""}{vehicle.interior||""}</span>{vehicle.stock&&<span>STOCK {vehicle.stock}</span>}<span>VIN {vehicle.vin}</span></div></div>
          <div style={{display:"grid",gap:"10px"}}><a href={sms} style={{minHeight:"56px",background:"#f2eee6",color:"#101513",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",fontSize:"9px",letterSpacing:".18em"}}>TEXT JON ABOUT THIS VELAR <b style={{fontSize:"20px",fontWeight:300}}>→</b></a><a href={vehicle.url} target="_blank" rel="noreferrer" style={{minHeight:"48px",border:"1px solid rgba(242,238,230,.32)",color:"#f2eee6",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 18px",fontSize:"9px",letterSpacing:".18em"}}>VIEW THIS LISTING <b style={{fontSize:"16px",fontWeight:300}}>↗</b></a></div>
        </div>
      </article>
      <style jsx>{`@media(max-width:720px){.featuredVehicleCard{grid-template-columns:1fr!important}.featuredVehicleCard>div:last-child{border-left:0!important;border-top:1px solid rgba(242,238,230,.18)}.featuredVehicleCard h3{font-size:32px!important}}`}</style>
    </div>
  </section>;
}
