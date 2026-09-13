// 自托管 Cloudflare Workers + D1 部署脚本（不依赖 ChatGPT Sites 平台）
// 用法：
//   node scripts/deploy.mjs            # 构建并部署 Worker（含路由/变量/真实D1绑定）
//   node scripts/deploy.mjs --db-only  # 只应用远端 D1 迁移
// 配置：deploy-config.json（已 gitignore，不入库）：
// {
//   "d1DatabaseId": "<wrangler d1 create 输出或面板上的 database_id>",
//   "zoneId": "<域名在 Cloudflare 的 zone id>",
//   "hostname": "mindcompass.example.com",
//   "researchContactEmail": "you@example.com",
//   "adminPassword": "<强随机密码>"
// }
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const dbOnly = process.argv.includes("--db-only");
const configPath = "deploy-config.json";
if (!existsSync(configPath)) {
  console.error("缺少 deploy-config.json，请按本文件头部注释创建（该文件已被 gitignore）。");
  process.exit(1);
}
const cfg = JSON.parse(readFileSync(configPath, "utf8"));
const required = ["d1DatabaseId", "zoneId", "hostname", "researchContactEmail", "adminPassword"];
for (const key of required) {
  if (!cfg[key] || typeof cfg[key] !== "string") {
    console.error(`deploy-config.json 缺少字段: ${key}`);
    process.exit(1);
  }
}
if (!cfg.hostname.includes(".") || cfg.hostname.startsWith(".") || cfg.hostname.endsWith(".")) {
  console.error("hostname 应为完整域名，例如 mindcompass.example.com");
  process.exit(1);
}
const wrangler = resolve("node_modules/wrangler/bin/wrangler.js");

if (!dbOnly) {
  const build = spawnSync(process.execPath, ["--import", "./scripts/sites-env.mjs", "scripts/run-framework.mjs", "build"], { stdio: "inherit" });
  if (build.status !== 0) { console.error("构建失败，未部署。"); process.exit(build.status ?? 1); }
}

const config = JSON.parse(readFileSync("dist/server/wrangler.json", "utf8"));
// 指向真实 D1 实例（构建产物里是占位 database_id）
const binding = (config.d1_databases || [])[0];
if (!binding) { console.error("构建产物缺少 D1 绑定，请检查 vite.config.ts。"); process.exit(1); }
binding.database_id = cfg.d1DatabaseId;
binding.database_name = "mindcompass";
binding.migrations_dir = resolve("drizzle");
// 自托管运行配置
config.main = resolve("dist/server/index.js");
config.assets.directory = resolve("dist/client");
config.vars = {
  ...(config.vars || {}),
  APP_ORIGIN: `https://${cfg.hostname}`,
  RESEARCH_CONTACT_EMAIL: cfg.researchContactEmail,
  ADMIN_PASSWORD: cfg.adminPassword,
};
config.routes = [{ pattern: cfg.hostname, zone_id: cfg.zoneId }];
delete config.workers_dev; // 只通过自定义域名提供（*.workers.dev 在国内不可访问）

mkdirSync(".sites-runtime", { recursive: true });
const outPath = resolve(".sites-runtime/deploy-wrangler.json");
writeFileSync(outPath, JSON.stringify(config, null, 2));
console.log(`部署配置已生成: ${outPath}`);

const apply = (args) => {
  const run = spawnSync(process.execPath, ["--import", "./scripts/sites-env.mjs", wrangler, ...args], { stdio: "inherit" });
  if (run.status !== 0) { console.error(`wrangler ${args.join(" ")} 失败`); process.exit(run.status ?? 1); }
};

apply(["d1", "migrations", "apply", "DB", "--remote", "--config", outPath]);
if (!dbOnly) apply(["deploy", "--config", outPath]);
console.log(dbOnly ? "远端迁移完成。" : `部署完成: https://${cfg.hostname}`);
console.log("部署后请关闭代理验证：首页可打开、问卷可完整提交、/admin 可登录。");
