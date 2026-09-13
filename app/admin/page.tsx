import { headers } from "next/headers";
import { env } from "cloudflare:workers";
import { Admin } from "@/components/mindcompass/admin";
import { AdminLogin } from "@/components/mindcompass/admin-login";
import { assertAdmin } from "@/lib/server/security";
export const dynamic = "force-dynamic";
export default async function Page(){
 const incoming=await headers();
 let authed=false;
 try{await assertAdmin(new Request("https://mindcompass.invalid/admin",{headers:incoming}),env);authed=true;}
 catch{/* 未登录或令牌无效：渲染登录表单，不显示任何管理数据。 */}
 return authed?<Admin/>:<AdminLogin/>;
}
