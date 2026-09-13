import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const roots=["app","components/mindcompass","lib","db","worker","dist/client","dist/server"];
const patterns=[/sk-[A-Za-z0-9_-]{24,}/,/ghp_[A-Za-z0-9]{30,}/,/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,new RegExp("mindcompass"+"-demo"),/15715\d{6}/];
const failures=[];let n=0;
function walk(dir){for(const name of readdirSync(dir)){const path=join(dir,name);if(statSync(path).isDirectory()){walk(path);continue;}if(!/\.(ts|tsx|js|mjs|json|css)$/.test(name))continue;const content=readFileSync(path,"utf8");n++;if(patterns.some(p=>p.test(content)))failures.push(path);}}
for(const root of roots)walk(root);
if(failures.length){console.error("Potential secret/private identifier in files:",failures);process.exit(1);}
console.log(`Security pattern check passed (${n} source/build files). This is a bounded scan, not a proof of absence or a historical Git audit.`);
