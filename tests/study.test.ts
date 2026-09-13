import { afterEach, describe, expect, test } from "vitest";
import { database } from "./db-adapter";
import { cleanup, handleStudy } from "../lib/server/study";
import { scales } from "../lib/assessment/registry";
import { CONSENT_VERSION, DAY } from "../lib/policy";
import { mkdtempSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const origin="https://study.test",now=Date.now();
const open:ReturnType<typeof database>[]=[];afterEach(()=>{for(const d of open)d.sqlite.close();open.length=0;});
function setup(){const store=database();open.push(store);return store;}
function client(db:D1Database){let cookie="";return {call:async(path:string,method="GET",body?:unknown,extra:Record<string,string>={},time=now)=>{
 const response=await handleStudy(new Request(`${origin}/api/study/${path}`,{method,headers:{origin,"content-type":"application/json",cookie,...extra},body:body===undefined?undefined:JSON.stringify(body)}),db,{APP_ORIGIN:origin,ADMIN_PASSWORD:"test-admin-password"},time);
 if(response.headers.has("set-cookie"))cookie=response.headers.get("set-cookie")!.split(";")[0];
 return {status:response.status,data:await response.json() as {attempt: import("../lib/client").Attempt; participants:number; groups:import("../lib/client").SummaryGroup[];operations:import("../lib/client").Operations},headers:response.headers};
 },getCookie:()=>cookie};}
async function consent(c:ReturnType<typeof client>){return c.call("session","POST",{accepted:true,adult:true,consentVersion:CONSENT_VERSION});}
async function adminLogin(c:ReturnType<typeof client>){return c.call("admin/login","POST",{password:"test-admin-password"});}
describe("real SQLite API integration",()=>{
 test("consent gating, adult check, private cookies, strict schemas",async()=>{
  const {db,sqlite}=setup(),c=client(db);
  expect((await c.call("attempts","POST",{scaleId:"bfi2",requestId:crypto.randomUUID()})).status).toBe(401);
  expect((await c.call("session","POST",{accepted:true,adult:false,consentVersion:CONSENT_VERSION})).status).toBe(400);
  const accepted=await consent(c);expect(accepted.status).toBe(201);expect(accepted.headers.get("set-cookie")).toContain("HttpOnly");expect(accepted.headers.get("set-cookie")).toContain("Secure");
  expect((await c.call("session","POST",{accepted:true,adult:true,consentVersion:CONSENT_VERSION},{},now+1000)).status).toBe(200);expect(sqlite.prepare("SELECT count(*) n FROM mc_participants").get()?.n).toBe(1);expect(sqlite.prepare("SELECT accepted_at FROM mc_consents").get()?.accepted_at).toBe(now);
  expect((await c.call("session","POST",{accepted:true,adult:true,consentVersion:CONSENT_VERSION,email:"unnecessary"})).status).toBe(400);
  expect((await c.call("session","DELETE",undefined,{origin:"https://evil.test"})).status).toBe(403);
 });
 for(const scale of scales)test(`${scale.id}: complete, persistence, isolation, idempotency`,async()=>{
  const {db,sqlite}=setup(),c=client(db),other=client(db);await consent(c);await consent(other);
  const requestId=crypto.randomUUID();const created=await c.call("attempts","POST",{scaleId:scale.id,requestId});expect(created.status).toBe(201);
  const a=created.data.attempt;
  expect((await c.call("attempts","POST",{scaleId:scale.id,requestId})).data.attempt.id).toBe(a.id);
  expect((await other.call(`attempts/${a.id}`)).status).toBe(404);
  expect((await c.call(`attempts/${a.id}/complete`,"POST",{answers:{},revision:0,cursor:0})).status).toBe(400);
  const answers=Object.fromEntries(scale.items.map(i=>[i.id,i.reverse?scale.scoring.min:scale.scoring.max]));
  expect((await c.call(`attempts/${a.id}`,"PUT",{answers:{...answers,foreign:3},revision:0,cursor:0})).status).toBe(400);
  const saved=await c.call(`attempts/${a.id}`,"PUT",{answers,revision:0,cursor:1});expect(saved.status).toBe(200);
  expect((await c.call(`attempts/${a.id}`)).data.attempt.answers).toEqual(answers);
  expect((await c.call(`attempts/${a.id}`,"PUT",{answers,revision:0,cursor:0})).status).toBe(409);
  const done=await c.call(`attempts/${a.id}/complete`,"POST",{answers,revision:1,cursor:1});expect(done.status).toBe(200);
  expect(done.data.attempt.status).toBe("completed");expect((await c.call(`attempts/${a.id}/complete`,"POST",{answers,revision:1,cursor:1})).data.attempt.id).toBe(a.id);
  expect(sqlite.prepare("SELECT count(*) n FROM mc_attempts WHERE status='completed'").get()?.n).toBe(1);
  expect((await c.call(`attempts/${a.id}`,"PUT",{answers,revision:2,cursor:0})).status).toBe(409);
  const retake=await c.call("attempts","POST",{scaleId:scale.id,requestId:crypto.randomUUID()});expect(retake.data.attempt.id).not.toBe(a.id);
  expect((await c.call(`attempts/${retake.data.attempt.id}`,"DELETE")).status).toBe(200);
  expect((await c.call(`attempts/${retake.data.attempt.id}`)).data.attempt.answers).toEqual({});
  expect((await c.call(`attempts/${a.id}`)).data.attempt.scores).toEqual(done.data.attempt.scores);
 });
 test("cross-scale answers, spoofed scores, admin access and aggregation",async()=>{
  const {db}=setup(),c=client(db);await consent(c);
  const s=scales[0],a=(await c.call("attempts","POST",{scaleId:s.id,requestId:crypto.randomUUID()})).data.attempt;
  const answers=Object.fromEntries(s.items.map(i=>[i.id,3]));
  expect((await c.call(`attempts/${a.id}`,"PUT",{answers,revision:0,cursor:0,scores:{fake:5}})).status).toBe(400);
  await c.call(`attempts/${a.id}/complete`,"POST",{answers,revision:0,cursor:0});
  const b=(await c.call("attempts","POST",{scaleId:scales[1].id,requestId:crypto.randomUUID()})).data.attempt;
  expect((await c.call(`attempts/${b.id}`,"PUT",{answers,revision:0,cursor:0})).status).toBe(400);
  // 未登录与伪造身份头都不得获得管理权限；只有密码登录签发的 Cookie 有效。
  for(const path of ["admin","admin/export"]){expect((await c.call(path)).status).toBe(401);expect((await c.call(path,"GET",undefined,{"oai-authenticated-user-id":"test-admin-password"})).status).toBe(401);}
  expect((await c.call("admin/login","POST",{password:"wrong-password"})).status).toBe(401);
  const login=await adminLogin(c);expect(login.status).toBe(200);expect(login.headers.get("set-cookie")).toContain("HttpOnly");expect(login.headers.get("set-cookie")).toContain("SameSite=Strict");
  const admin=await c.call("admin");expect(admin.status).toBe(200);expect(admin.data.participants).toBe(1);expect(admin.data.groups.find((g:{scale:{id:string}})=>g.scale.id===s.id)!.dimensionStats.extraversion.mean).toBe(3);expect(admin.data.groups.find((g:{scale:{id:string}})=>g.scale.id===s.id)!.completionRate).toBe(1);expect(admin.data.operations.authenticatedAdmin).toBe(true);expect(admin.data.operations.appOriginMatches).toBe(true);expect(admin.data.operations.adminAuthConfigured).toBe(true);
  const emptyGroup=admin.data.groups.find((g:{scale:{id:string}})=>g.scale.id===scales[1].id)!;expect(emptyGroup.completionRate).toBe(0);expect(emptyGroup.dimensionStats[scales[1].dimensions[0].id].mean).toBeNull();
  const exported=await c.call("admin/export");expect(JSON.stringify(exported.data)).not.toMatch(/token_hash|email|cookie|test-admin/);
  expect((await c.call("admin/logout","POST")).status).toBe(200);expect((await c.call("admin")).status).toBe(401);
 });
 test("retention and withdrawal clear content; legacy is untouched",async()=>{
  const {db,sqlite}=setup(),c=client(db);await consent(c);const a=(await c.call("attempts","POST",{scaleId:scales[0].id,requestId:crypto.randomUUID()})).data.attempt;
  await c.call(`attempts/${a.id}`,"PUT",{answers:{BFI1:5},revision:0,cursor:0});
  const expired=await c.call(`attempts/${a.id}`,"GET",undefined,{},now+8*DAY);expect(expired.data.attempt.status).toBe("expired");expect(expired.data.attempt.answers).toEqual({});
  await c.call("session","DELETE");expect(sqlite.prepare("SELECT count(*) n FROM mc_attempts").get()?.n).toBe(0);expect(sqlite.prepare("SELECT count(*) n FROM mc_consents").get()?.n).toBe(0);
  expect(sqlite.prepare("SELECT name FROM sqlite_master WHERE name='responses'").get()).toBeTruthy();
 });
 test("scheduled and manual cleanup leave auditable run records",async()=>{
  const {db,sqlite}=setup(),c=client(db);await cleanup(db,now,"scheduled");
  expect(sqlite.prepare("SELECT ran_at FROM mc_maintenance WHERE key='scheduled'").get()?.ran_at).toBe(now);
  await adminLogin(c);
  const manual=await c.call("admin/cleanup","POST",{}, {},now+1000);expect(manual.status).toBe(200);
  const summary=await c.call("admin","GET",undefined,{},now+2000);expect(summary.data.operations.scheduledCleanup?.ranAt).toBe(now);expect(summary.data.operations.manualCleanup?.ranAt).toBe(now+1000);
 });
 test("database reopen preserves completed data",async()=>{
  const dir=mkdtempSync(join(tmpdir(),"mindcompass-test-"));const path=join(dir,"test.sqlite");const first=database(path);const c=client(first.db);await consent(c);const s=scales[3];const a=(await c.call("attempts","POST",{scaleId:s.id,requestId:crypto.randomUUID()})).data.attempt;const answers=Object.fromEntries(s.items.map(i=>[i.id,3]));await c.call(`attempts/${a.id}/complete`,"POST",{answers,revision:0,cursor:0});first.sqlite.close();const next=database(path);try{expect(next.sqlite.prepare("SELECT status FROM mc_attempts WHERE id=?").get(a.id)?.status).toBe("completed");}finally{next.sqlite.close();const resolved=realpathSync(dir);if(resolved.startsWith(resolve(tmpdir())+"\\")||resolved.startsWith(resolve(tmpdir())+"/"))rmSync(resolved,{recursive:true});}
 });
 test("concurrent completion remains a single immutable record",async()=>{
  const {db,sqlite}=setup(),c=client(db);await consent(c);const s=scales[3];const a=(await c.call("attempts","POST",{scaleId:s.id,requestId:crypto.randomUUID()})).data.attempt;
  const answers=Object.fromEntries(s.items.map(i=>[i.id,3]));const body={answers,revision:0,cursor:0};
  const results=await Promise.all([c.call(`attempts/${a.id}/complete`,"POST",body),c.call(`attempts/${a.id}/complete`,"POST",body)]);expect(results.map(r=>r.status)).toEqual([200,200]);expect(results[0].data.attempt.scores).toEqual(results[1].data.attempt.scores);expect(sqlite.prepare("SELECT count(*) n FROM mc_attempts").get()?.n).toBe(1);
  expect((await c.call(`attempts/${a.id}/complete`,"POST",{...body,answers:{...answers,[s.items[0].id]:5}})).status).toBe(409);
 });
 test("version reuse cannot silently change existing scoring",async()=>{
  const {db,sqlite}=setup(),c=client(db);await consent(c);const s=scales[3];const a=(await c.call("attempts","POST",{scaleId:s.id,requestId:crypto.randomUUID()})).data.attempt;
  await c.call(`attempts/${a.id}`,"DELETE");sqlite.prepare("UPDATE mc_scale_versions SET config_hash='different'").run();
  expect((await c.call("attempts","POST",{scaleId:s.id,requestId:crypto.randomUUID()})).status).toBe(503);expect(sqlite.prepare("SELECT count(*) n FROM mc_attempts").get()?.n).toBe(1);
 });
});
