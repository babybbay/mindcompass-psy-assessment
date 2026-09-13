"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type MaintenanceRun, type Summary } from "@/lib/client";
import { DAY, feedbackCategories } from "@/lib/policy";
import { LegacySummary } from "./legacy-summary";

function runText(run:MaintenanceRun|null){
 if(!run)return "尚无运行记录";
 const changed=run.expiredDrafts+run.deletedAttempts+run.deletedFeedback+run.deletedParticipants;
 return `${new Date(run.ranAt).toLocaleString("zh-CN")} · 处理 ${changed} 条记录`;
}

export function Admin(){
 const [data,setData]=useState<Summary|null>(null),[error,setError]=useState(""),[active,setActive]=useState(""),[cleaning,setCleaning]=useState(false);
 const router=useRouter();
 function load(){setError("");api<Summary>("admin/summary").then(setData).catch(e=>setError(e.message));}
 useEffect(()=>{api<Summary>("admin/summary").then(setData).catch(e=>setError(e.message));},[]);
 async function clean(){setCleaning(true);setError("");try{await api("admin/cleanup","POST",{});load();}catch(e){setError((e as Error).message);}finally{setCleaning(false);}}
 async function leave(){setError("");try{await fetch("/api/study/admin/logout",{method:"POST",credentials:"same-origin"});}finally{router.replace("/");}}
 const group=data?.groups.find(g=>`${g.scale.id}:${g.scale.version}`===active)||data?.groups[0];
 const scheduledRecent=Boolean(data?.operations.scheduledCleanup&&data.asOf-data.operations.scheduledCleanup.ranAt<36*DAY);
 const checks=data?[{label:"管理员密码登录",ok:data.operations.authenticatedAdmin&&data.operations.adminAuthConfigured,detail:"当前页面与数据接口均已通过服务器授权"},{label:"正式站点来源限制",ok:data.operations.appOriginConfigured&&data.operations.appOriginMatches,detail:data.operations.appOriginMatches?"写入请求仅接受当前正式站点来源":"请核对 APP_ORIGIN 是否为当前正式网址"},{label:"每日保留期清理",ok:scheduledRecent,detail:scheduledRecent?runText(data.operations.scheduledCleanup):"最近36小时内尚无定时清理记录"},{label:"公开研究联系方式",ok:data.operations.contactConfigured,detail:data.operations.contactConfigured?"隐私与反馈页已显示负责人邮箱":"请配置 RESEARCH_CONTACT_EMAIL"}]:[];
 return <>
  <div className="page-heading"><p className="eyebrow">受保护的研究者后台</p><h1>从真实记录中，观察趋势。</h1><p>汇总采用每参与者、每量表版本首个完成记录；重测单独保留。随机编号不等于已核验的独立自然人。</p></div>
  <div className="admin-actions"><button className="button secondary" onClick={load}>刷新数据</button><button className="button secondary" onClick={clean} disabled={cleaning}>{cleaning?"正在执行清理…":"立即执行保留期清理"}</button><a className="button primary" href="/api/study/admin/export" download>导出匿名完成数据（JSON）</a><button className="button secondary" onClick={leave}>退出管理登录</button></div>
  {error&&<p role="alert" className="error-message">{error}</p>}{!data&&!error&&<p role="status">正在读取数据库汇总…</p>}
  {data&&<>
   <section className="panel operations-panel"><div className="section-heading"><div><p className="eyebrow">上线状态</p><h2>安全与数据保留检查</h2></div><span className={`readiness-badge ${checks.every(check=>check.ok)?"is-ready":"needs-attention"}`}>{checks.every(check=>check.ok)?"关键检查已通过":"仍需处理"}</span></div><div className="operations-list">{checks.map(check=><div className="operation-row" key={check.label}><span className={`status-mark ${check.ok?"pass":"warning"}`} aria-hidden="true">{check.ok?"✓":"!"}</span><div><strong>{check.label}</strong><p>{check.detail}</p></div></div>)}</div><p className="fine-print">最近一次人工清理：{runText(data.operations.manualCleanup)}。定时清理状态来自数据库中的真实运行记录，而不是仅检查配置文件。</p></section>
   <div className="metrics-grid"><div><strong>{data.participants}</strong><span>至少完成一项的参与编号</span></div><div><strong>{data.legacyCount}</strong><span>旧库记录 · 来源与同意待核实</span></div><div><strong>{data.groups.length}</strong><span>已产生记录的量表版本</span></div></div>
   <p className="notice">旧库记录独立保留，不纳入新版汇总。没有真实试用证据的记录不能称为真实参与者。当前不计算alpha、相关或效度指标。</p>
   {!group?<section className="panel"><h2>暂无新版测量数据</h2><p>等待真实参与者开始测量后，才会产生可供汇总的数据。</p></section>:<><label className="form-label" htmlFor="version-select">选择量表与版本</label><select id="version-select" value={active||`${group.scale.id}:${group.scale.version}`} onChange={e=>setActive(e.target.value)}>{data.groups.map(g=><option key={`${g.scale.id}:${g.scale.version}`} value={`${g.scale.id}:${g.scale.version}`}>{g.scale.name} · {g.scale.version}</option>)}</select><div className="metrics-grid"><div><strong>{group.completed} / {group.started}</strong><span>已完成次数 / 开始次数</span></div><div><strong>{group.completionRate===null?"暂无":`${(group.completionRate*100).toFixed(1)}%`}</strong><span>完成率（截至当前）</span></div><div><strong>{group.meanElapsedMinutes===null?"暂无":group.meanElapsedMinutes.toFixed(1)}</strong><span>平均经过分钟 · 包含离开时间</span></div></div><section className="panel"><h2>维度平均分与分布</h2><p>每个维度样本量 n={group.participants}；小样本结果仅用于探索，不能视为量表效度验证。</p><div className="table-scroll"><table><thead><tr><th>维度</th><th>平均分</th><th>样本量</th><th>分数分布（分数：人数）</th></tr></thead><tbody>{group.scale.dimensions.map(d=><tr key={d.id}><th>{d.name}</th><td>{group.dimensionStats[d.id].mean?.toFixed(2)??"暂无"}</td><td>{group.dimensionStats[d.id].n}</td><td>{Object.entries(group.dimensionStats[d.id].distribution).map(([score,n])=>`${score}：${n}`).join("；")||"暂无"}</td></tr>)}</tbody></table></div></section><section className="panel"><h2>逐题原始作答分布</h2><p>展示未反向转换的原始选项人数；题号与配置一致。</p><div className="table-scroll"><table><thead><tr><th>题目</th>{group.scale.options.map(o=><th key={o.value}>{o.value} · {o.label}</th>)}</tr></thead><tbody>{group.scale.items.map(i=><tr key={i.id}><th title={i.text}>{i.id}</th>{group.itemDistributions[i.id].map(o=><td key={o.value}>{o.count}</td>)}</tr>)}</tbody></table></div></section></>}
   <LegacySummary data={data.legacySummary}/><section className="panel"><h2>匿名反馈分类</h2>{data.feedback.length?<ul>{data.feedback.map(f=><li key={f.category}>{feedbackCategories[f.category as keyof typeof feedbackCategories]||f.category}：{f.count}</li>)}</ul>:<p>暂无反馈。</p>}</section><p className="fine-print">统计时间：{new Date(data.asOf).toLocaleString("zh-CN")}。仅限授权研究用途，请按保留期限管理导出文件。</p>
  </>}
 </>;
}
