"use client";
import { useEffect, useState } from "react";
import Link from "@/components/mindcompass/page-link";
import { api, type AttemptPayload } from "@/lib/client";
import { dimensionRange } from "@/lib/assessment/scoring";

function positionText(position:number){return position<1/3?"量尺较低一端":position<2/3?"量尺中段":"量尺较高一端";}
function reflection(name:string){return `回想最近两周：哪些具体场景最能体现“${name}”？又有哪些场景与你的这次回答不同？`;}

export function Results({id}:{id:string}){
 const [data,setData]=useState<AttemptPayload|null>(null),[error,setError]=useState(""),[facets,setFacets]=useState(false);
 useEffect(()=>{api<AttemptPayload>(`attempts/${id}`).then(d=>{if(d.attempt.status!=="completed"||!d.attempt.scores)throw new Error("这份测量尚无可查看的已完成结果。");setData(d);}).catch(e=>setError(e.message));},[id]);
 if(!data)return <section className="panel"><h1>本次结果</h1><p role={error?"alert":"status"}>{error||"正在读取你的已保存结果…"}</p><Link href="/assessments">返回选题页</Link></section>;
 const {scale,attempt}=data,scores=attempt.scores!;
 return <>
  <div className="page-heading result-heading"><p className="eyebrow">探索已完成 · 结果已保存</p><h1>{scale.name}</h1><p>这是一份观察自己的线索。分数描述你在这些题目中的回答，不能概括完整的你。</p><div className="result-actions"><button className="button secondary" onClick={()=>window.print()}>打印／保存个人摘要</button><Link className="button primary" href="/assessments">继续探索其他问卷</Link></div></div>
  <section className="results-layout"><div className="panel score-panel"><div className="section-heading"><div><p className="eyebrow">你的量尺地图</p><h2>维度画像</h2></div>{scale.dimensions.some(d=>d.parentId)&&<button className="button secondary compact no-print" aria-pressed={facets} onClick={()=>setFacets(!facets)}>{facets?"收起15个子维度":"展开15个子维度"}</button>}</div>
   <div className="scale-legend" aria-label="量尺位置说明"><span>较少认同</span><span>中间位置</span><span>较多认同</span></div><p className="fine-print">位置只依据这份问卷的理论最低分与最高分计算，不是人群百分位或诊断阈值。靠近任一端都不代表更好或更差。</p>
   {scale.dimensions.filter(d=>facets||!d.parentId).map(d=>{const value=scores.dimensions[d.id],[min,max]=dimensionRange(scale,d.id),position=Math.max(0,Math.min(1,(value-min)/(max-min))),label=positionText(position);return <article className={`dimension-result ${d.parentId?"facet-result":""}`} key={d.id}><div className="score-label"><div><h3>{d.name}</h3><span className="position-label">{label}</span></div><span className="score-number"><strong>{value.toFixed(1)}</strong> / {max}</span></div><div className="score-track" role="meter" aria-label={d.name} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-valuetext={`${value.toFixed(1)}，${label}`}><span className="track-third one"/><span className="track-third two"/><span className="track-third three"/><i style={{left:`${position*100}%`}}/></div><div className="axis-labels"><span>{min} · 较少认同</span><span>{max} · 较多认同</span></div><div className="dimension-copy"><p><strong>可以留意：</strong>{d.description}</p><p className="reflection-prompt"><strong>想一想：</strong>{reflection(d.name)}</p></div></article>;})}
   {scores.total!==null&&<div className="total-note">原版计分总和：<strong>{scores.total}</strong> / {scale.items.length*scale.scoring.max}。仅作原版计分记录，不用于分类、排名或判断风险。</div>}
  </div><aside><section className="panel result-note"><p className="eyebrow">先理解，再下结论</p><h2>如何阅读这份结果</h2><ul className="reading-guide"><li>“较高／较低”只表示你对本维度题目描述的认同位置。</li><li>人在不同关系、任务和时期中，表现可能不同。</li><li>把结果当作反思问题，不把它当作固定类型或能力评价。</li></ul><p>{scale.limitations}</p><p>不提供治疗建议或医疗决策依据，也不与所谓“正常人”比较。</p></section><section className="panel record-panel"><h2>本次记录</h2><p>完成时间：{new Date(attempt.completedAt!).toLocaleString("zh-CN")}</p><p className="version-label">量表版本：{scale.version}</p><Link className="button primary full-width no-print" href="/assessments">返回选题页</Link><Link className="button secondary full-width no-print" href={`/assessments/${scale.id}`}>重新测量</Link><Link className="text-link no-print" href={`/results/${attempt.id}`}>本次结果固定入口</Link><p className="fine-print no-print">仅当前参与会话可查看。复制网址不会向其他人开放结果。</p></section></aside></section>
  <details className="source-details no-print"><summary>题目来源、许可和计分说明</summary><p>{scale.source.citation}</p>{scale.source.url&&<p><a href={scale.source.url} target="_blank" rel="noreferrer">查看来源</a></p>}<p>{scale.source.permission}</p><p>{scale.source.adaptation}</p><p>反向转换：{scale.scoring.min+scale.scoring.max} − 原始作答；每个维度仅使用其所属题目。缺失答案不计算正式结果。没有常模或解释阈值。</p></details>
 </>;
}
