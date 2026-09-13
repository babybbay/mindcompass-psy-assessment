import { env } from "cloudflare:workers";
import { handleStudy } from "@/lib/server/study";
import { assertSameOrigin, bodyObject, onlyKeys } from "@/lib/server/security";
import { StudyError } from "@/lib/assessment/scoring";
// Compatibility: server scoring, consent/session and idempotency, no new v1 writes.
export async function POST(request:Request){
 try{
  if(!env.DB)throw new StudyError(503,"数据服务未配置。");
  assertSameOrigin(request,env);
  const body=await bodyObject(request);onlyKeys(body,["answers","scores","requestId"]);
  if(typeof body.requestId!=="string")throw new StudyError(400,"请通过新版旧版问卷入口继续，以保存同意状态和防止重复提交。");
  const call=(path:string,value:unknown)=>{const url=new URL(request.url);url.pathname="/api/study/"+path;return handleStudy(new Request(url,{method:"POST",headers:request.headers,body:JSON.stringify(value)}),env.DB!,env);};
  const created=await call("attempts",{scaleId:"legacy",requestId:body.requestId});if(!created.ok)return created;
  const data=await created.json() as {attempt:{id:string;revision:number;cursor:number}};
  return call(`attempts/${data.attempt.id}/complete`,{answers:body.answers,revision:data.attempt.revision,cursor:data.attempt.cursor});
 }catch(e){return Response.json({error:e instanceof StudyError?e.message:"请求无法处理。"},{status:e instanceof StudyError?e.status:503,headers:{"Cache-Control":"no-store"}});}
}
