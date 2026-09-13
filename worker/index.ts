import handler from "vinext/server/fetch-handler";
import { cleanup } from "../lib/server/study";
const worker = {
 fetch: handler.fetch,
 async scheduled(_controller:ScheduledController,env:Cloudflare.Env,ctx:ExecutionContext){
  if(env.DB)ctx.waitUntil(cleanup(env.DB,Date.now(),"scheduled"));
 },
};
export default worker;
