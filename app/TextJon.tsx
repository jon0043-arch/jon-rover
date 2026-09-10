"use client";

import {useEffect,useState} from "react";
import {QRCodeSVG} from "qrcode.react";

type Props={href:string;className?:string;children?:React.ReactNode};

export default function TextJon({href,className="",children="TEXT JON"}:Props){
  const[open,setOpen]=useState(false);
  const[mobile,setMobile]=useState(false);

  useEffect(()=>{
    const mq=window.matchMedia("(max-width: 820px), (pointer: coarse)");
    const sync=()=>setMobile(mq.matches);
    sync();
    mq.addEventListener?.("change",sync);
    return()=>mq.removeEventListener?.("change",sync);
  },[]);

  function activate(){
    if(mobile){window.location.href=href;return;}
    setOpen(true);
  }

  return <>
    <button type="button" className={className} onClick={activate}>{children}</button>
    {open&&<div className="textJonOverlay" role="dialog" aria-modal="true" aria-label="Text Jon">
      <button className="textJonBackdrop" aria-label="Close" onClick={()=>setOpen(false)}/>
      <div className="textJonModal">
        <button className="textJonClose" type="button" onClick={()=>setOpen(false)} aria-label="Close">×</button>
        <p className="eyebrow">TEXT JON</p>
        <h2>(215) 608-7408</h2>
        <p className="textJonCopy">Scan with your phone to start a pre-filled text to Jon.</p>
        <div className="textJonQr"><QRCodeSVG value={href} size={190} level="M" includeMargin/></div>
        <small>Open your camera and point it at the code.</small>
      </div>
    </div>}
  </>;
}
