import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { localConfig } from "./local-config.mjs";
const directory = process.argv.includes("--e2e") ? ".wrangler/mindcompass-e2e" : ".wrangler/mindcompass-v2";
for(const file of readdirSync("drizzle").filter(f=>/^\d+.*\.sql$/.test(f)).sort()) {
 // Use D1 migration tracking for repeatability; never seed fabricated production responses.
 if(!file.endsWith(".sql"))throw new Error("Invalid migration");
}
const result=spawnSync(process.execPath,["--import","./scripts/sites-env.mjs","./node_modules/wrangler/bin/wrangler.js","d1","migrations","apply","DB","--local","--config",localConfig(),"--persist-to",directory],{stdio:"inherit",env:{...process.env,CI:"true"}});
process.exit(result.status??1);
