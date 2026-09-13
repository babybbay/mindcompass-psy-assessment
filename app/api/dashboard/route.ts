import { env } from "cloudflare:workers";
import { handleStudy } from "@/lib/server/study";
export async function GET(request:Request){
 if(!env.DB)return Response.json({error:"数据服务未配置。"},{status:503});
 const url=new URL(request.url);url.pathname="/api/study/admin/summary";
 return handleStudy(new Request(url,request),env.DB,env);
}
