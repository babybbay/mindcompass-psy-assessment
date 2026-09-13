import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
export function localConfig(){
 const config=JSON.parse(readFileSync("dist/server/wrangler.json","utf8"));
 config.main=resolve("dist/server/index.js");config.assets.directory=resolve("dist/client");
 for(const binding of config.d1_databases)binding.migrations_dir=resolve("drizzle");
 mkdirSync(".sites-runtime",{recursive:true});const path=resolve(".sites-runtime/local-wrangler.json");writeFileSync(path,JSON.stringify(config,null,2));return path;
}
