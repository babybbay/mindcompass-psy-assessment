import { spawn } from "node:child_process";
import { localConfig } from "./local-config.mjs";
const e2e=process.argv.includes("--e2e");
// 本地管理密码：e2e 模式固定测试密码；手动预览可用 LOCAL_ADMIN_PASSWORD 覆盖，未设置则后台保持锁定。
const adminPassword=process.env.LOCAL_ADMIN_PASSWORD??(e2e?"e2e-admin-password":null);
const child=spawn(process.execPath,["--import","./scripts/sites-env.mjs","./node_modules/wrangler/bin/wrangler.js","dev","--config",localConfig(),"--local","--persist-to",e2e?".wrangler/mindcompass-e2e":".wrangler/mindcompass-v2","--ip","127.0.0.1","--port","5173","--inspector-port","0","--var","APP_ORIGIN:http://127.0.0.1:5173",...(adminPassword?["--var",`ADMIN_PASSWORD:${adminPassword}`]:[])],{stdio:"inherit",env:process.env});
for(const signal of ["SIGINT","SIGTERM"])process.on(signal,()=>child.kill(signal));
child.on("exit",code=>process.exit(code??0));
