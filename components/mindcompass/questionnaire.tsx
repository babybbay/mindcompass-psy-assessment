/* eslint-disable @next/next/no-location-assign-relative-destination -- vinext beta soft-navigation recovery regression; saved state is restored from D1. */
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "@/components/mindcompass/page-link";
import { api, type Attempt, type AttemptPayload } from "@/lib/client";
import type { Scale } from "@/lib/assessment/types";

type SaveState="loading"|"saving"|"saved"|"pending"|"offline"|"error";

export function Questionnaire({scaleId}:{scaleId:string}){
 const requestId=useRef<string>("");
 const [scale,setScale]=useState<Scale|null>(null),[attempt,setAttempt]=useState<Attempt|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[saveState,setSaveState]=useState<SaveState>("loading"),[online,setOnline]=useState(true),[confirmExit,setConfirmExit]=useState(false);
 const answerRef=useRef<Record<string,number>>({}),cursorRef=useRef(0),attemptRef=useRef<Attempt|null>(null),saving=useRef<Promise<AttemptPayload>|null>(null),unsavedRef=useRef(false),retryRef=useRef<()=>void>(()=>{}),heading=useRef<HTMLHeadingElement>(null);
 function markUnsaved(){unsavedRef.current=true;setSaveState(typeof navigator!=="undefined"&&!navigator.onLine?"offline":"pending");}

 useEffect(()=>{let cancelled=false;requestId.current ||= crypto.randomUUID();async function load(){
  const url=new URL(window.location.href),id=url.searchParams.get("attempt");let data:AttemptPayload;
  if(id)data=await api<AttemptPayload>(`attempts/${id}`);else{const list=await api<{attempts:Attempt[]}>("attempts");const draft=list.attempts.find(a=>a.scaleId===scaleId&&a.status==="draft");data=draft?await api<AttemptPayload>(`attempts/${draft.id}`):await api<AttemptPayload>("attempts","POST",{scaleId,requestId:requestId.current});}
  if(cancelled)return;if(data.scale.id!==scaleId)throw new Error("这份记录属于另一份量表，请从选题页打开。");if(data.attempt.status==="completed"){window.location.replace(`/results/${data.attempt.id}`);return;}if(data.attempt.status!=="draft")throw new Error("这份草稿已清除或过期，请返回选题页重新开始。");
  setScale(data.scale);setAttempt(data.attempt);attemptRef.current=data.attempt;answerRef.current=data.attempt.answers;cursorRef.current=data.attempt.cursor;unsavedRef.current=false;setSaveState("saved");
 }load().catch(e=>{if(!cancelled)setError(e.message);});return()=>{cancelled=true;};},[scaleId]);

 useEffect(()=>{const update=()=>{const connected=navigator.onLine;setOnline(connected);if(connected&&unsavedRef.current)retryRef.current();else if(!connected&&unsavedRef.current)setSaveState("offline");};const visible=()=>{if(document.visibilityState==="visible")update();};update();window.addEventListener("online",update);window.addEventListener("offline",update);document.addEventListener("visibilitychange",visible);return()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update);document.removeEventListener("visibilitychange",visible);};},[]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(unsavedRef.current||saving.current){e.preventDefault();e.returnValue="";}};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[]);

 async function save():Promise<AttemptPayload>{
  if(saving.current)await saving.current;
  const a=attemptRef.current;if(!a)throw new Error("草稿还未加载。");
  if(!navigator.onLine){markUnsaved();setSaveState("offline");throw new Error("网络已断开。恢复连接后会自动重试保存。");}
  const data={answers:{...answerRef.current},cursor:cursorRef.current,revision:a.revision};
  const promise=api<AttemptPayload>(`attempts/${a.id}`,"PUT",data);saving.current=promise;setBusy(true);setSaveState("saving");setError("");
  try{const result=await promise;attemptRef.current=result.attempt;setAttempt(result.attempt);unsavedRef.current=false;setSaveState("saved");return result;}catch(e){unsavedRef.current=true;setSaveState(navigator.onLine?"error":"offline");setError((e as Error).message);throw e;}finally{saving.current=null;setBusy(false);}
 }
 useEffect(()=>{retryRef.current=()=>{if(unsavedRef.current&&!saving.current)save().catch(()=>{});};});

 async function answer(value:number){if(!scale||!attempt||busy)return;answerRef.current={...answerRef.current,[scale.items[cursorRef.current].id]:value};setAttempt({...attempt,answers:answerRef.current});markUnsaved();try{await save();}catch{}}
 async function jump(index:number){if(!scale||!attempt||index<0||index>=scale.items.length)return;if(saving.current)await saving.current.catch(()=>{});const current=attemptRef.current;if(!current)return;cursorRef.current=index;setAttempt({...current,answers:answerRef.current,cursor:index});markUnsaved();try{await save();}catch{}finally{requestAnimationFrame(()=>heading.current?.focus());}}
 async function move(delta:number){if(!scale||!attempt)return;if(saving.current)await saving.current.catch(()=>{});const index=cursorRef.current;if(delta>0&&answerRef.current[scale.items[index].id]===undefined){setError("这一题还没有选择。请选出最符合的选项，再继续。");return;}await jump(index+delta);}
 async function finish(){if(!scale||!attempt||busy)return;const missing=scale.items.findIndex(i=>answerRef.current[i.id]===undefined);if(missing>=0){cursorRef.current=missing;setAttempt({...attempt,cursor:missing});markUnsaved();setError(`还有 ${scale.items.length-Object.keys(answerRef.current).length} 题未作答，已为你定位到第一题。`);requestAnimationFrame(()=>heading.current?.focus());return;}setBusy(true);setError("");try{const data=await api<AttemptPayload>(`attempts/${attempt.id}/complete`,"POST",{answers:answerRef.current,cursor:cursorRef.current,revision:attemptRef.current!.revision});attemptRef.current=data.attempt;unsavedRef.current=false;setSaveState("saved");window.location.assign(`/results/${attempt.id}`);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function leave(){try{if(unsavedRef.current)await save();window.location.assign("/assessments");}catch{}}
 async function clear(){if(!attempt)return;setBusy(true);try{await api(`attempts/${attempt.id}`,"DELETE");unsavedRef.current=false;window.location.assign("/assessments");}catch(e){setError((e as Error).message);}finally{setBusy(false);}}

 if(!scale||!attempt)return <section className="panel"><h1>准备问卷</h1>{error?<p role="alert" className="error-message">{error}</p>:<p role="status">正在读取已保存的进度…</p>}<Link href="/assessments">返回选题页</Link><span> · </span><Link href="/#consent">参与说明</Link></section>;
 const item=scale.items[attempt.cursor],count=Object.keys(attempt.answers).length,remaining=scale.items.length-count,sectionSize=scale.items.length>=30?10:scale.items.length,totalSections=Math.ceil(scale.items.length/sectionSize),section=Math.floor(attempt.cursor/sectionSize)+1;
 const saveText=saveState==="saving"?"正在保存…":saveState==="offline"?"网络已断开，尚未保存":saveState==="error"||saveState==="pending"?"尚未保存，请重试":"已保存到数据库";
 return <div className="question-shell">
  <div className="question-toolbar"><button onClick={leave} disabled={busy}>← 保存并返回选题</button><span role="status" className={saveState==="saved"?"saved-label":"unsaved"}>{saveText}</span></div>
  {!online&&<p className="connection-notice" role="alert">你可以继续查看当前题目；恢复网络后，未保存的更改会自动重试。</p>}
  <div className="question-title"><p className="eyebrow">{scale.name}</p><h1>慢慢来，选择符合自己的答案。</h1><p>{scale.instructions}</p><div className="assessment-facts"><span>预计 {scale.minutes} 分钟</span><span>{totalSections>1?`第 ${section} / ${totalSections} 组`:`共 ${scale.items.length} 题`}</span><span>同一浏览器可继续</span></div></div>
  <div className="progress-caption"><span>第 {attempt.cursor+1} / {scale.items.length} 题</span><span>已答 {count} 题 · 还剩 {remaining} 题</span></div><progress className="assessment-progress" value={count} max={scale.items.length} aria-label={`已完成 ${count} 题，共 ${scale.items.length} 题`}/>
  <section className="question-panel"><h2 ref={heading} tabIndex={-1}>{scale.id==="bfi2"&&<small className="stem">我是一个……的人</small>}{item.text}</h2>{item.originalText&&<p className="original-item" lang="en">{item.originalText}</p>}<fieldset className="answer-options" disabled={busy}><legend className="sr-only">请选择符合程度</legend>{scale.options.map(o=><label key={o.value} className={attempt.answers[item.id]===o.value?"selected":""}><input type="radio" name={item.id} value={o.value} checked={attempt.answers[item.id]===o.value} onChange={()=>answer(o.value)}/><span className="option-value">{o.value}</span><span>{o.label}</span></label>)}</fieldset>{error&&<p role="alert" className="error-message">{error}</p>}{saveState!=="saved"&&saveState!=="saving"&&!busy&&<button className="button secondary" onClick={()=>save().catch(()=>{})}>{online?"重试保存":"等待网络恢复"}</button>}<div className="question-navigation"><button className="button secondary" onClick={()=>move(-1)} disabled={attempt.cursor===0||busy}>上一题</button>{attempt.cursor<scale.items.length-1?<button className="button primary" onClick={()=>move(1)} disabled={busy}>下一题 →</button>:<button className="button primary" onClick={finish} disabled={busy}>提交并查看结果</button>}</div></section>
  <details className="question-overview"><summary>查看全部题目进度</summary><p>选择题号可直接返回检查。实心题号表示已作答，圆环表示当前题。</p><div className="question-grid">{scale.items.map((question,index)=><button key={question.id} type="button" className={`${attempt.answers[question.id]!==undefined?"answered":""} ${index===attempt.cursor?"current":""}`} aria-label={`第 ${index+1} 题${attempt.answers[question.id]!==undefined?"，已作答":"，未作答"}`} aria-current={index===attempt.cursor?"step":undefined} onClick={()=>jump(index)} disabled={busy}>{index+1}</button>)}</div></details>
  <div className="question-bottom"><p>没有对错答案。所有结果仅供教育／研究探索。</p><button className="text-button" disabled={busy} onClick={()=>setConfirmExit(true)}>退出并清除本次草稿</button></div>{confirmExit&&<section className="notice" role="alertdialog" aria-label="清除草稿确认"><h2>清除本次未完成答案？</h2><p>其他量表和已完成结果不受影响。你也可以保存并返回选题页。</p><button className="button danger" onClick={clear} disabled={busy}>确认清除本次草稿</button><button className="button secondary" onClick={()=>setConfirmExit(false)}>继续作答</button></section>}
  <details className="source-details"><summary>来源、计分与使用限制</summary><p>{scale.source.citation}</p><p>{scale.source.permission}</p><p>{scale.limitations}</p></details>
 </div>;
}
