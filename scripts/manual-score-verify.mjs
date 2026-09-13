// 手动端到端计分验证：本机 preview:local 运行时可执行
// 用法: node scripts/manual-score-verify.mjs [--base http://127.0.0.1:5173]
// 不写入生产数据；仅用于本地验证计分管线。
const BASE = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "http://127.0.0.1:5173";
const CONSENT_VERSION = "2026-09-13-v3";
const BFI_REVERSE = new Set([3,4,5,8,9,11,12,16,17,22,23,24,25,26,28,29,30,31,36,37,42,44,45,47,48,49,50,51,55,58]);

let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}\n      期望 ${JSON.stringify(expected)}\n      实际 ${JSON.stringify(actual)}`);
}

async function api(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { Origin: BASE } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, setCookie: res.headers.get("set-cookie"), body: await res.json().catch(() => null) };
}

async function runScenario(name, makeAnswers, expected) {
  // 独立会话：每个场景一个新参与者
  const consent = await api("/api/study/session", { method: "POST", body: { accepted: true, adult: true, consentVersion: CONSENT_VERSION } });
  const cookie = consent.setCookie.split(";")[0];
  const started = await api("/api/study/attempts", { method: "POST", cookie, body: { scaleId: "bfi2", requestId: crypto.randomUUID() } });
  const { attempt, scale } = started.body;
  const answers = {};
  scale.items.forEach((it, i) => { answers[it.id] = makeAnswers(i + 1, it.id); });
  const save = await api(`/api/study/attempts/${attempt.id}`, { method: "PUT", cookie, body: { revision: 0, answers, cursor: 59 } });
  if (save.status !== 200) { check(`${name}: 保存草稿`, save.status, 200); return; }
  const done = await api(`/api/study/attempts/${attempt.id}/complete`, { method: "POST", cookie, body: { revision: 1, answers, cursor: 59 } });
  check(`${name}: 完成状态码`, done.status, 200);
  if (done.body?.attempt?.scores) {
    const s = done.body.attempt.scores;
    check(`${name}: 五领域分数`, s.dimensions.extraversion !== undefined ? { E: s.dimensions.extraversion, A: s.dimensions.agreeableness, C: s.dimensions.conscientiousness, N: s.dimensions["negative-emotionality"], O: s.dimensions["open-mindedness"], total: s.total } : s, expected);
    // 抽查两个子维度
    check(`${name}: 子维度 anxiety/trust`, { anxiety: s.dimensions.anxiety, trust: s.dimensions.trust }, { anxiety: expected.E, trust: expected.A });
  }
}

const all3 = () => 3;
const fwd5rev1 = (n) => (BFI_REVERSE.has(n) ? 1 : 5);
const fwd1rev5 = (n) => (BFI_REVERSE.has(n) ? 5 : 1);

await runScenario("全3分", all3, { E: 3, A: 3, C: 3, N: 3, O: 3, total: null });
await runScenario("正向5反向1(应全5)", fwd5rev1, { E: 5, A: 5, C: 5, N: 5, O: 5, total: null });
await runScenario("正向1反向5(应全1)", fwd1rev5, { E: 1, A: 1, C: 1, N: 1, O: 1, total: null });

console.log(failures === 0 ? "\n✅ 全部通过" : `\n❌ ${failures} 项失败`);
process.exit(failures === 0 ? 0 : 1);
