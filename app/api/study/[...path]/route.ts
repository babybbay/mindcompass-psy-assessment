import { env } from "cloudflare:workers";
import { handleStudy } from "@/lib/server/study";
async function handler(request:Request){
 if(!env.DB)return Response.json({error:"数据服务未配置。"},{status:503,headers:{"Cache-Control":"no-store"}});
 return handleStudy(request,env.DB,env);
}
export {handler as GET,handler as POST,handler as PUT,handler as DELETE};
