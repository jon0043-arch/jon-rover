"use client";

import { FormEvent, useState } from "react";

export default function CrmLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/crm-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error || "Could not sign in.");
        return;
      }
      window.location.href = "/crm";
    } catch {
      setError("Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{minHeight:"100vh",background:"#0d1210",color:"#f3efe7",display:"grid",placeItems:"center",padding:24,fontFamily:"Arial,Helvetica,sans-serif"}}>
      <section style={{width:"min(420px,100%)",border:"1px solid #29302d",padding:"42px 34px",background:"#111714"}}>
        <div style={{fontSize:12,letterSpacing:".24em",marginBottom:8}}>JON ROVER</div>
        <div style={{fontSize:8,letterSpacing:".22em",color:"#89918d",marginBottom:36}}>CRM ACCESS</div>
        <h1 style={{fontSize:34,fontWeight:300,margin:"0 0 10px"}}>Private access.</h1>
        <p style={{fontSize:12,lineHeight:1.6,color:"#9aa29e",margin:"0 0 28px"}}>Enter your CRM password to continue.</p>
        <form onSubmit={submit}>
          <input autoFocus type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" aria-label="CRM password" style={{width:"100%",height:52,border:"1px solid #39423e",background:"#0d1210",color:"#fff",padding:"0 14px",outline:"none",marginBottom:12}}/>
          {error ? <div style={{fontSize:11,color:"#e7a29b",marginBottom:12}}>{error}</div> : null}
          <button type="submit" disabled={loading || !password} style={{width:"100%",height:50,border:0,background:"#f2eee6",color:"#101513",fontSize:9,letterSpacing:".2em",cursor:"pointer",opacity:loading||!password?.75:1}}>{loading ? "CHECKING…" : "ENTER CRM →"}</button>
        </form>
      </section>
    </main>
  );
}
