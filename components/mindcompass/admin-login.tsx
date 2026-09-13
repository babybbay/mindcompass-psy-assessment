"use client";
import { useState } from "react";

export function AdminLogin(){
 const [password,setPassword]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function submit(event:React.FormEvent){
  event.preventDefault();setBusy(true);setError("");
  try{
   const res=await fetch("/api/study/admin/login",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});
   if(res.ok){window.location.reload();return;}
   const data=await res.json().catch(()=>null) as {error?:string}|null;setError(data?.error||"登录失败，请重试。");
  }catch{setError("网络错误，请重试。");}finally{setBusy(false);}
 }
 return <section className="prose-page">
  <p className="eyebrow">研究者入口</p><h1>请输入管理密码。</h1>
  <p>登录后仍需通过服务器校验。参与者会话不具有管理权限，请勿与参与者分享密码。</p>
  <form onSubmit={submit} className="stack">
   <label className="form-label" htmlFor="admin-password">管理密码</label>
   <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/>
   {error&&<p role="alert" className="error-message">{error}</p>}
   <button className="button primary" type="submit" disabled={busy}>{busy?"正在验证…":"登录"}</button>
  </form>
  <p className="fine-print">连续尝试失败会被暂时限制；如忘记密码，请由站点所有者在部署平台重新设置服务端密码变量。</p>
 </section>;
}
