import { getScale } from "../assessment/registry";
import { calculate, StudyError, validateAnswers } from "../assessment/scoring";
import type { Scale, Scores } from "../assessment/types";
import { CONSENT_VERSION, DAY, feedbackCategories } from "../policy";
import { assertAdmin, assertSameOrigin, bodyObject, cookie, onlyKeys, randomToken, sessionToken, sha256, adminCookie, expectedAdminToken, verifyAdminPassword, type RuntimeSettings } from "./security";

export type AttemptRow = {id:string;participant_id:string;scale_id:string;scale_version:string;consent_version:string;request_id:string;status:"draft"|"completed"|"withdrawn"|"expired";answers_json:string;scores_json:string|null;cursor:number;revision:number;started_at:number;updated_at:number;completed_at:number|null};
type Participant = {id:string;expires_at:number;version:string};
type CleanupSource = "access"|"scheduled"|"manual";
type MaintenanceRow = {key:"scheduled"|"manual";ran_at:number;expired_drafts:number;deleted_attempts:number;deleted_feedback:number;deleted_participants:number};
const json=(value:unknown,status=200,headers:Record<string,string>={})=>Response.json(value,{status,headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff",...headers}});
const uuid=(value:unknown):value is string=>typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value);

export async function cleanup(db:D1Database,now=Date.now(),source:CleanupSource="access") {
 const results=await db.batch([
  db.prepare("UPDATE mc_attempts SET status='expired', answers_json='{}', scores_json=NULL, revision=revision+1 WHERE status='draft' AND updated_at < ?").bind(now-7*DAY),
  db.prepare("DELETE FROM mc_attempts WHERE (completed_at IS NOT NULL AND completed_at < ?) OR (completed_at IS NULL AND started_at < ?)").bind(now-180*DAY,now-180*DAY),
  db.prepare("DELETE FROM mc_feedback WHERE created_at < ?").bind(now-180*DAY),
  db.prepare("DELETE FROM mc_participants WHERE expires_at < ?").bind(now),
 ]);
 const report={ranAt:now,source,expiredDrafts:results[0]?.meta.changes||0,deletedAttempts:results[1]?.meta.changes||0,deletedFeedback:results[2]?.meta.changes||0,deletedParticipants:results[3]?.meta.changes||0};
 if(source!=="access")await db.prepare("INSERT INTO mc_maintenance(key,ran_at,expired_drafts,deleted_attempts,deleted_feedback,deleted_participants) VALUES(?,?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET ran_at=excluded.ran_at,expired_drafts=excluded.expired_drafts,deleted_attempts=excluded.deleted_attempts,deleted_feedback=excluded.deleted_feedback,deleted_participants=excluded.deleted_participants").bind(source,now,report.expiredDrafts,report.deletedAttempts,report.deletedFeedback,report.deletedParticipants).run();
 return report;
}
async function participant(db:D1Database,request:Request,now:number):Promise<Participant|null>{
 const token=sessionToken(request);if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
 return db.prepare("SELECT p.id,p.expires_at,c.version FROM mc_participants p JOIN mc_consents c ON c.participant_id=p.id WHERE p.token_hash=? AND p.expires_at>?").bind(await sha256(token),now).first<Participant>();
}
async function owned(db:D1Database,id:string,pid:string) {
 const row=await db.prepare("SELECT * FROM mc_attempts WHERE id=? AND participant_id=?").bind(id,pid).first<AttemptRow>();
 if(!row)throw new StudyError(404,"找不到这份测量，或当前浏览器无权访问。");return row;
}
async function snapshot(db:D1Database,row:AttemptRow):Promise<Scale>{
 const v=await db.prepare("SELECT config_json FROM mc_scale_versions WHERE scale_id=? AND version=?").bind(row.scale_id,row.scale_version).first<{config_json:string}>();
 if(!v)throw new Error("Missing immutable scale version");return JSON.parse(v.config_json) as Scale;
}
function publicAttempt(row:AttemptRow){return {id:row.id,scaleId:row.scale_id,version:row.scale_version,status:row.status,answers:JSON.parse(row.answers_json) as Record<string,number>,scores:row.scores_json?JSON.parse(row.scores_json) as Scores:null,cursor:row.cursor,revision:row.revision,startedAt:row.started_at,updatedAt:row.updated_at,completedAt:row.completed_at};}

// 登录限速：尽力而为的进程内计数（Workers 多实例间不共享），配合恒定时间比较与固定失败延迟。
const loginFailures = new Map<string, { count: number; resetAt: number }>();
function loginKey(request:Request){ return request.headers.get("cf-connecting-ip") || "local"; }
function checkLoginRate(request:Request,now:number){
 const key=loginKey(request),entry=loginFailures.get(key);
 if(!entry||entry.resetAt<now)return;
 if(entry.count>=20)throw new StudyError(429,"尝试次数过多，请稍后再试。");
}
function recordLoginFailure(request:Request,now:number){
 const key=loginKey(request),entry=loginFailures.get(key);
 if(!entry||entry.resetAt<now)loginFailures.set(key,{count:1,resetAt:now+15*60*1000});
 else entry.count++;
}

export async function handleStudy(request:Request,db:D1Database,settings:RuntimeSettings={},now=Date.now()):Promise<Response>{
 try {
  const path=new URL(request.url).pathname.replace(/^\/api\/study\/?/,"").split("/").filter(Boolean);
  const method=request.method;
  if(!["GET","HEAD"].includes(method))assertSameOrigin(request,settings);
  if(path[0]==="admin"){
   if(path[1]==="login"&&method==="POST"){
    checkLoginRate(request,now);
    const body=await bodyObject(request);onlyKeys(body,["password"]);
    if(await verifyAdminPassword(body.password,settings)){
     loginFailures.delete(loginKey(request));
     return json({ok:true},200,{"Set-Cookie":adminCookie((await expectedAdminToken(settings))!,request)});
    }
    recordLoginFailure(request,now);
    await new Promise(r=>setTimeout(r,300)); // 固定失败延迟，抹平比较时间差异。
    throw new StudyError(401,"密码不正确。");
   }
   if(path[1]==="logout"&&method==="POST"){
    // 退出不要求已登录；清空 Cookie 后重定向到首页。
    return json({ok:true},200,{"Set-Cookie":adminCookie("",request,0)});
   }
   await assertAdmin(request,settings);
   if(path[1]==="cleanup"&&method==="POST")return json({ok:true,report:await cleanup(db,now,"manual")});
   await cleanup(db,now);
   if(method!=="GET")throw new StudyError(405,"不支持此操作。");
   const rows=(await db.prepare("SELECT * FROM mc_attempts ORDER BY started_at,id").all<AttemptRow>()).results;
   if(path[1]==="export"){
    // Whitelisted fields only: never token hashes, admin identities, raw timestamps or feedback.
    const complete=rows.filter(r=>r.status==="completed");
    const data=await Promise.all(complete.map(async r=>({participantId:r.participant_id,attemptId:r.id,scaleId:r.scale_id,scaleVersion:r.scale_version,consentVersion:r.consent_version,startedDate:new Date(r.started_at).toISOString().slice(0,10),completedDate:new Date(r.completed_at!).toISOString().slice(0,10),elapsedSeconds:Math.round((r.completed_at!-r.started_at)/1000),answers:JSON.parse(r.answers_json),scores:JSON.parse(r.scores_json!),scoring:(await snapshot(db,r)).scoring})));
    return json({exportVersion:1,scope:"all-completed-attempts; repeated attempts retained and identified",records:data},200,{"Content-Disposition":"attachment; filename=mindcompass-anonymous.json"});
   }
   if(path[1]&&path[1]!=="summary")throw new StudyError(404,"未找到。");
   const versions=(await db.prepare("SELECT config_json FROM mc_scale_versions").all<{config_json:string}>()).results.map(v=>JSON.parse(v.config_json) as Scale);
   const groups=versions.map(scale=>{
    const relevant=rows.filter(r=>r.scale_id===scale.id&&r.scale_version===scale.version);
    const completed=relevant.filter(r=>r.status==="completed");const seen=new Set<string>();
    const sample=completed.filter(r=>{if(seen.has(r.participant_id))return false;seen.add(r.participant_id);return true;});
    const dimensionStats=Object.fromEntries(scale.dimensions.map(d=>{
     const values=sample.map(r=>(JSON.parse(r.scores_json!) as Scores).dimensions[d.id]);
     const frequency:Record<string,number>={};for(const v of values){const key=v.toFixed(2);frequency[key]=(frequency[key]||0)+1;}
     return [d.id,{mean:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,distribution:frequency,n:values.length}];
    }));
    const itemDistributions=Object.fromEntries(scale.items.map(item=>[item.id,scale.options.map(o=>({value:o.value,count:sample.filter(r=>JSON.parse(r.answers_json)[item.id]===o.value).length}))]));
    return {scale,started:relevant.length,completed:completed.length,participants:seen.size,completionRate:relevant.length?completed.length/relevant.length:null,meanElapsedMinutes:completed.length?completed.reduce((sum,r)=>sum+(r.completed_at!-r.started_at)/60000,0)/completed.length:null,dimensionStats,itemDistributions};
   });
   const legacyRows=(await db.prepare("SELECT answers FROM responses").all<{answers:string}>()).results;
   const legacyScale=getScale("legacy")!;
   const legacyValid:Record<string,number>[]=[];
   for(const r of legacyRows){try{const answers=JSON.parse(r.answers);validateAnswers(legacyScale,answers,true);legacyValid.push(answers);}catch{/* Unverifiable rows are counted but never imputed. */}}
   const legacyScores=legacyValid.map(a=>calculate(legacyScale,a));
   const legacySummary={count:legacyRows.length,validCount:legacyValid.length,averages:Object.fromEntries(legacyScale.dimensions.map(d=>[d.id,legacyScores.length?legacyScores.reduce((n,s)=>n+s.dimensions[d.id],0)/legacyScores.length:null])),itemDistributions:Object.fromEntries(legacyScale.items.map(i=>[i.id,[1,2,3,4,5].map(value=>({value,count:legacyValid.filter(a=>a[i.id]===value).length}))]))};
   const feedback=(await db.prepare("SELECT category,count(*) AS count FROM mc_feedback GROUP BY category").all<{category:string;count:number}>()).results;
   const maintenance=(await db.prepare("SELECT * FROM mc_maintenance WHERE key IN ('scheduled','manual')").all<MaintenanceRow>()).results;
   const maintenanceRun=(key:MaintenanceRow["key"])=>{const row=maintenance.find(item=>item.key===key);return row?{ranAt:row.ran_at,expiredDrafts:row.expired_drafts,deletedAttempts:row.deleted_attempts,deletedFeedback:row.deleted_feedback,deletedParticipants:row.deleted_participants}:null;};
   const requestOrigin=new URL(request.url).origin,configuredOrigin=settings.APP_ORIGIN?.replace(/\/$/,"")||null;
   const operations={authenticatedAdmin:true,adminAuthConfigured:Boolean(settings.ADMIN_PASSWORD),appOriginConfigured:Boolean(configuredOrigin),appOriginMatches:configuredOrigin===requestOrigin,contactConfigured:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.RESEARCH_CONTACT_EMAIL||""),scheduledCleanup:maintenanceRun("scheduled"),manualCleanup:maintenanceRun("manual")};
   return json({participants:new Set(rows.filter(r=>r.status==="completed").map(r=>r.participant_id)).size,legacyCount:legacyRows.length,legacySummary,groups,feedback,operations,asOf:now,sampling:"每参与者、每量表版本的首个已完成测量用于均值与分布；完成率以全部开始次数为分母。"});
  }
  // Expired data is removed on access; daily authenticated cleanup is also supported.
  await cleanup(db,now);
  const p=await participant(db,request,now);
  if(path[0]==="session"){
   if(method==="GET")return json(p?{consented:p.version===CONSENT_VERSION,participantId:p.id,consentVersion:p.version}:{consented:false});
   if(method==="POST"){
    const body=await bodyObject(request);onlyKeys(body,["accepted","adult","consentVersion"]);
    if(body.accepted!==true||body.adult!==true||body.consentVersion!==CONSENT_VERSION)throw new StudyError(400,"请阅读参与说明，并确认已满18岁及同意参与。");
    if(p){if(p.version!==CONSENT_VERSION)await db.prepare("UPDATE mc_consents SET version=?,accepted_at=? WHERE participant_id=?").bind(CONSENT_VERSION,now,p.id).run();return json({consented:true,participantId:p.id,consentVersion:CONSENT_VERSION});}
    const token=randomToken(),id=crypto.randomUUID();
    await db.batch([db.prepare("INSERT INTO mc_participants(id,token_hash,created_at,expires_at) VALUES(?,?,?,?)").bind(id,await sha256(token),now,now+180*DAY),db.prepare("INSERT INTO mc_consents(participant_id,version,accepted_at,adult_confirmed) VALUES(?,?,?,1)").bind(id,CONSENT_VERSION,now)]);
    return json({consented:true,participantId:id,consentVersion:CONSENT_VERSION},201,{"Set-Cookie":cookie(token,request)});
   }
   if(method==="DELETE"){
    if(p)await db.prepare("DELETE FROM mc_participants WHERE id=?").bind(p.id).run();
    return json({ok:true},200,{"Set-Cookie":cookie("",request,0)});
   }
  }
  if(!p||p.version!==CONSENT_VERSION)throw new StudyError(401,"请先阅读首页说明并同意参与。");
  if(path[0]==="feedback"&&method==="POST"){
   const body=await bodyObject(request);onlyKeys(body,["category"]);
   if(typeof body.category!=="string"||!Object.hasOwn(feedbackCategories,body.category))throw new StudyError(400,"请选择反馈类型。");
   const count=await db.prepare("SELECT count(*) AS n FROM mc_feedback WHERE participant_id=? AND created_at>?").bind(p.id,now-DAY).first<{n:number}>();
   if((count?.n||0)>=10)throw new StudyError(429,"今天的反馈已收到，请稍后再试。");
   await db.prepare("INSERT INTO mc_feedback(id,participant_id,category,created_at) VALUES(?,?,?,?)").bind(crypto.randomUUID(),p.id,body.category,now).run();return json({ok:true},201);
  }
  if(path[0]==="attempts"&&path.length===1){
   if(method==="GET")return json({attempts:(await db.prepare("SELECT * FROM mc_attempts WHERE participant_id=? ORDER BY started_at DESC,id").bind(p.id).all<AttemptRow>()).results.map(publicAttempt)});
   if(method==="POST"){
    const body=await bodyObject(request);onlyKeys(body,["scaleId","requestId"]);
    const scale=typeof body.scaleId==="string"?getScale(body.scaleId):undefined;
    if(!scale||!uuid(body.requestId))throw new StudyError(400,"请选择有效量表。");
    const old=await db.prepare("SELECT * FROM mc_attempts WHERE participant_id=? AND scale_id=? AND (request_id=? OR status='draft') ORDER BY CASE WHEN request_id=? THEN 0 ELSE 1 END LIMIT 1").bind(p.id,scale.id,body.requestId,body.requestId).first<AttemptRow>();
    if(old)return json({attempt:publicAttempt(old),scale:await snapshot(db,old)});
    const count=await db.prepare("SELECT count(*) AS n FROM mc_attempts WHERE participant_id=? AND started_at>?").bind(p.id,now-DAY).first<{n:number}>();if((count?.n||0)>=30)throw new StudyError(429,"今天的测量次数较多，请稍后继续。");
    const config=JSON.stringify(scale),hash=await sha256(config);
    await db.prepare("INSERT INTO mc_scale_versions(scale_id,version,config_json,config_hash) VALUES(?,?,?,?) ON CONFLICT DO NOTHING").bind(scale.id,scale.version,config,hash).run();
    const saved=await db.prepare("SELECT config_hash FROM mc_scale_versions WHERE scale_id=? AND version=?").bind(scale.id,scale.version).first<{config_hash:string}>();if(saved?.config_hash!==hash)throw new Error("Version reused with different configuration");
    await db.prepare("INSERT INTO mc_attempts(id,participant_id,scale_id,scale_version,consent_version,request_id,started_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING").bind(crypto.randomUUID(),p.id,scale.id,scale.version,CONSENT_VERSION,body.requestId,now,now).run();
    const result=await db.prepare("SELECT * FROM mc_attempts WHERE participant_id=? AND scale_id=? AND (request_id=? OR status='draft') ORDER BY CASE WHEN request_id=? THEN 0 ELSE 1 END LIMIT 1").bind(p.id,scale.id,body.requestId,body.requestId).first<AttemptRow>();
    if(!result)throw new StudyError(409,"测量状态已变化，请刷新后重试。");return json({attempt:publicAttempt(result),scale:await snapshot(db,result)},201);
   }
  }
  if(path[0]==="attempts"&&uuid(path[1])){
   const row=await owned(db,path[1],p.id),scale=await snapshot(db,row);
   if(method==="GET"&&path.length===2)return json({attempt:publicAttempt(row),scale});
   if(method==="DELETE"&&path.length===2){
    await db.prepare("UPDATE mc_attempts SET status='withdrawn',answers_json='{}',scores_json=NULL,completed_at=NULL,revision=revision+1,updated_at=? WHERE id=? AND participant_id=?").bind(now,row.id,p.id).run();return json({ok:true});
   }
   const completing=method==="POST"&&path[2]==="complete";
   if((method==="PUT"&&path.length===2)||completing){
    const body=await bodyObject(request);onlyKeys(body,["revision","answers","cursor"]);
    validateAnswers(scale,body.answers,completing);
    if(row.status==="completed"&&completing){
     if(scale.items.some(i=>(body.answers as Record<string,number>)[i.id]!==JSON.parse(row.answers_json)[i.id]))throw new StudyError(409,"这份结果已经完成。如需改变答案，请重新测量。");
     return json({attempt:publicAttempt(row),scale});
    }
    if(row.status!=="draft")throw new StudyError(409,"这份测量已完成、清除或过期，请返回选题页。");
    if(!Number.isInteger(body.revision)||body.revision!==row.revision)throw new StudyError(409,"另一个页面已更新这份草稿，请刷新以读取已保存内容。");
    if(!Number.isInteger(body.cursor)||(body.cursor as number)<0||(body.cursor as number)>=scale.items.length)throw new StudyError(400,"题号无效。");
    const answers=JSON.stringify(body.answers),scores=completing?JSON.stringify(calculate(scale,body.answers)):null;
    const result=await db.prepare("UPDATE mc_attempts SET answers_json=?,scores_json=?,cursor=?,revision=revision+1,updated_at=?,status=?,completed_at=? WHERE id=? AND participant_id=? AND status='draft' AND revision=?").bind(answers,scores,body.cursor,now,completing?"completed":"draft",completing?now:null,row.id,p.id,row.revision).run();
    if(result.meta.changes!==1){
     const current=await owned(db,row.id,p.id);
     if(completing&&current.status==="completed"&&scale.items.every(i=>JSON.parse(current.answers_json)[i.id]===(body.answers as Record<string,number>)[i.id]))return json({attempt:publicAttempt(current),scale});
     throw new StudyError(409,"保存冲突，请刷新后继续。");
    }
    return json({attempt:publicAttempt(await owned(db,row.id,p.id)),scale});
   }
  }
  throw new StudyError(404,"未找到此操作。");
 }catch(error){
  if(error instanceof StudyError)return json({error:error.message},error.status);
  // Do not log request bodies, cookies, answers, identities or exception payloads.
  return json({error:"数据服务暂时不可用，请稍后重试。"},503);
 }
}
