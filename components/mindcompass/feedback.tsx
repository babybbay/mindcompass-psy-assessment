"use client";
import Link from "@/components/mindcompass/page-link";
import { useState } from "react";
import { feedbackCategories } from "@/lib/policy";
import { api } from "@/lib/client";
export function Feedback({contactEmail}:{contactEmail?:string}){const [category,setCategory]=useState("wording"),[busy,setBusy]=useState(false),[message,setMessage]=useState("");async function send(){setBusy(true);try{await api("feedback","POST",{category});setMessage("已收到这条匿名问题分类，研究者可在后台查看。谢谢你帮助改进体验。");}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 return <section className="prose-page"><p className="eyebrow">联系与反馈</p><h1>你的体验，值得被听见。</h1><p>此入口只把问题分类发送至研究者后台，不收集自由文本、姓名或联系方式。请不要发送包含答卷或身份信息的截图。</p>{contactEmail?<p className="contact-card"><strong>研究负责人邮箱</strong><a href={`mailto:${contactEmail}`}>{contactEmail}</a><span>适合咨询研究目的、数据使用、撤回与参与者权利。</span></p>:<p className="notice">公开负责人邮箱尚待站点所有者配置；详细咨询请暂时使用课程或研究组织者已经提供的联系渠道。</p>}<div className="panel"><label className="form-label" htmlFor="feedback-category">你遇到了哪类问题？</label><select id="feedback-category" value={category} onChange={e=>setCategory(e.target.value)}>{Object.entries(feedbackCategories).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><p className="fine-print">提交前需要同意参与说明；每个参与编号每天最多10条。</p><button className="button primary" disabled={busy} onClick={send}>{busy?"正在提交…":"提交匿名反馈分类"}</button>{message&&<p role="status">{message}</p>}</div><p><Link href="/#consent">阅读参与说明</Link> · <Link href="/privacy">隐私与撤回</Link></p></section>;
}
