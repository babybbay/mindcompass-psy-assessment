// 线上站点端到端验证（默认不残留数据）
// 用法: node scripts/live-verify.mjs [--full] [--base https://mindcompassforai.xyz]
//  默认：同意→会话→管理登录→汇总→撤回删除（只短暂写一条同意记录，结束时级联删除）
//  --full：额外走完 答题→完成→计分→结果页，最后同样撤回删除全部测试数据
// 管理密码从 gitignore 的 deploy-config.json 读取，不写入本文件。
import { readFileSync } from "node:fs";
const BASE = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "https://mindcompassforai.xyz";
const FULL = process.argv.includes("--full");
const CONSENT_VERSION = "2026-09-13-v3";
const cfg = JSON.parse(readFileSync("deploy-config.json", "utf8"));
const ADMIN_PASSWORD = cfg.adminPassword;
if (!ADMIN_PASSWORD) { console.error("deploy-config.json 缺少 adminPassword"); process.exit(1); }

let failures = 0;
function check(name, cond, extra = "") {
  if (!cond) failures++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? `  (${extra})` : ""}`);
}
async function api(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(method !== "GET" ? { Origin: BASE } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, setCookie: res.headers.get("set-cookie"), body: await res.json().catch(() => null) };
}

// 1. 首页
const home = await fetch(BASE + "/");
check("首页可访问", home.status === 200, `HTTP ${home.status}`);
const html = await home.text();
check("首页包含同意入口", html.includes("心智罗盘") || html.includes("开始测量"));

// 2. 同意并创建会话
const consent = await api("/api/study/session", { method: "POST", body: { accepted: true, adult: true, consentVersion: CONSENT_VERSION } });
check("同意创建会话", consent.status === 201 && consent.body?.consented === true, `HTTP ${consent.status}`);
const cookie = consent.setCookie?.split(";")[0] || "";
check("会话 Cookie HttpOnly", /HttpOnly/.test(consent.setCookie || ""));

// 3. 可选：完整答题流程（--full）
if (FULL) {
  const started = await api("/api/study/attempts", { method: "POST", cookie, body: { scaleId: "ai-attitude", requestId: crypto.randomUUID() } });
  check("创建测量", started.status === 201 && started.body?.attempt?.status === "draft", `HTTP ${started.status}`);
  const { attempt, scale } = started.body ?? {};
  const answers = Object.fromEntries(scale.items.map(i => [i.id, 3]));
  const save = await api(`/api/study/attempts/${attempt.id}`, { method: "PUT", cookie, body: { revision: 0, answers, cursor: 11 } });
  check("保存全部答案", save.status === 200);
  const done = await api(`/api/study/attempts/${attempt.id}/complete`, { method: "POST", cookie, body: { revision: 1, answers, cursor: 11 } });
  check("完成测量", done.status === 200 && done.body?.attempt?.status === "completed", `HTTP ${done.status}`);
  const scores = done.body?.attempt?.scores?.dimensions ?? {};
  check("计分正确(全3分→各维度3)", scores.adoption === 3 && scores.concern === 3 && scores.caution === 3, JSON.stringify(scores));
  const results = await fetch(`${BASE}/results/${attempt.id}`, { headers: { Cookie: cookie } });
  check("结果页可访问", results.status === 200, `HTTP ${results.status}`);
}

// 4. 管理后台：登录→汇总
const login = await api("/api/study/admin/login", { method: "POST", body: { password: ADMIN_PASSWORD } });
check("管理登录", login.status === 200 && login.body?.ok === true, `HTTP ${login.status}`);
const adminCookie = login.setCookie?.split(";")[0] || "";
const summary = await api("/api/study/admin/summary", { cookie: adminCookie });
check("管理汇总可访问", summary.status === 200 && typeof summary.body?.participants === "number", `HTTP ${summary.status}`);

// 5. 撤回：级联删除本次测试的全部数据（含答卷），生产库不留测试记录
const withdraw = await api("/api/study/session", { method: "DELETE", cookie });
check("撤回并删除测试数据", withdraw.status === 200 && withdraw.body?.ok === true, `HTTP ${withdraw.status}`);

console.log(failures === 0 ? "\n✅ 线上验证全部通过（测试数据已撤回删除）" : `\n❌ ${failures} 项失败`);
process.exit(failures === 0 ? 0 : 1);
