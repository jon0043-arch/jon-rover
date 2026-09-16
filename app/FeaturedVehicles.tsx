"use client";

const JON_TEXT_NUMBER = "+12156087408";

export default function FeaturedVehicles(){
  const sms=`sms:${JON_TEXT_NUMBER}?body=${encodeURIComponent("Hi Jon, I saw a featured vehicle on your social media and wanted more information.")}`;
  return <section id="featured" style={{position:"relative",overflow:"hidden",background:"#101513",color:"#f2eee6",padding:"clamp(72px,9vw,130px) 0"}}>
    <div aria-hidden="true" style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(90deg,rgba(9,13,11,.94) 0%,rgba(9,13,11,.78) 38%,rgba(9,13,11,.48) 68%,rgba(9,13,11,.62) 100%),linear-gradient(0deg,rgba(9,13,11,.55),rgba(9,13,11,.18)),url('/rangerover-hero.png')",backgroundSize:"cover",backgroundPosition:"center 54%",backgroundRepeat:"no-repeat"}}/>
    <div className="shell" style={{position:"relative",zIndex:1}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:"28px",alignItems:"flex-end",flexWrap:"wrap",borderBottom:"1px solid rgba(242,238,230,.28)",paddingBottom:"28px"}}>
        <div><p className="eyebrow" style={{color:"#aeb7b2",margin:"0 0 16px"}}>SEEN ON SOCIAL</p><h2 style={{fontSize:"clamp(44px,6vw,88px)",lineHeight:.9,fontWeight:300,letterSpacing:".025em",margin:0,textShadow:"0 2px 18px rgba(0,0,0,.35)"}}>FEATURED<br/>VEHICLES.</h2></div>
        <p style={{maxWidth:"480px",fontSize:"13px",lineHeight:1.75,color:"#e0e3e1",margin:0,textShadow:"0 1px 10px rgba(0,0,0,.7)"}}>The cars I feature on Instagram and TikTok live here. See the price, mileage and details without hunting through the full inventory.</p>
      </div>
      <div style={{marginTop:"34px",border:"1px solid rgba(242,238,230,.28)",minHeight:"260px",display:"grid",gridTemplateColumns:"minmax(0,1.35fr) minmax(280px,.65fr)",background:"rgba(10,15,12,.34)",backdropFilter:"blur(2px)"}} className="featuredVehicleEmpty">
        <div style={{minHeight:"260px",display:"flex",alignItems:"flex-end",padding:"32px",background:"linear-gradient(135deg,rgba(24,32,28,.42),rgba(13,18,16,.16))"}}><div><p className="eyebrow" style={{color:"#b3bbb7",margin:"0 0 10px"}}>LATEST FEATURE</p><p style={{fontSize:"clamp(28px,4vw,52px)",fontWeight:300,letterSpacing:".04em",margin:0,textShadow:"0 2px 16px rgba(0,0,0,.55)"}}>NEXT CAR<br/>DROPPING SOON.</p></div></div>
        <div style={{padding:"32px",display:"flex",flexDirection:"column",justifyContent:"space-between",gap:"30px",borderLeft:"1px solid rgba(242,238,230,.28)",background:"rgba(8,12,10,.48)"}}><div><p className="eyebrow" style={{color:"#b3bbb7",margin:"0 0 12px"}}>THE ONE FROM THE VIDEO</p><p style={{fontSize:"13px",lineHeight:1.7,color:"#e0e3e1",margin:0}}>When a featured vehicle goes live, its price and full details will appear right here.</p></div><a href={sms} style={{minHeight:"54px",background:"#f2eee6",color:"#101513",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",fontSize:"9px",letterSpacing:".18em"}}>ASK JON ABOUT A FEATURED CAR <b style={{fontSize:"20px",fontWeight:300}}>→</b></a></div>
      </div>
      <style jsx>{`@media(max-width:620px){.featuredVehicleEmpty{grid-template-columns:1fr!important}.featuredVehicleEmpty>div:last-child{border-left:0!important;border-top:1px solid rgba(242,238,230,.18)}}`}</style>
    </div>
  </section>;
}
