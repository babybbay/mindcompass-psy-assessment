// 导出线上汇总统计到 docs/pilot-summary.json（仅聚合数据，不含逐人答卷）
// 用法: node scripts/export-summary.mjs
// 管理密码从 gitignore 的 deploy-config.json 读取。
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const BASE = "https://mindcompassforai.xyz";
const cfg = JSON.parse(readFileSync("deploy-config.json", "utf8"));
if (!cfg.adminPassword) { console.error("deploy-config.json 缺少 adminPassword"); process.exit(1); }

const login = await fetch(`${BASE}/api/study/admin/login`, { method: "POST", headers: { "Content-Type": "application/json", Origin: BASE }, body: JSON.stringify({ password: cfg.adminPassword }) });
if (!login.ok) { console.error("管理登录失败:", login.status); process.exit(1); }
const cookie = login.headers.get("set-cookie").split(";")[0];
const res = await fetch(`${BASE}/api/study/admin/summary`, { headers: { Cookie: cookie } });
const summary = await res.json();
if (!summary.groups) { console.error("汇总获取失败:", JSON.stringify(summary).slice(0, 200)); process.exit(1); }

mkdirSync("docs", { recursive: true });
writeFileSync("docs/pilot-summary.json", JSON.stringify(summary, null, 2) + "\n");
console.log(`已保存 docs/pilot-summary.json（时间 ${new Date(summary.asOf).toLocaleString("zh-CN")}）`);
console.log("参与者:", summary.participants);
for (const g of summary.groups) console.log(` - ${g.scale.name} | 开始 ${g.started} 完成 ${g.completed} | 完成率 ${g.completionRate === null ? "暂无" : (g.completionRate * 100).toFixed(1) + "%"}`);
