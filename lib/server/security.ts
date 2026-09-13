import { StudyError } from "../assessment/scoring";
export type RuntimeSettings = { APP_ORIGIN?: string; ADMIN_PASSWORD?: string; RESEARCH_CONTACT_EMAIL?: string };
export function assertSameOrigin(request: Request, settings: RuntimeSettings) {
  const expected = settings.APP_ORIGIN || new URL(request.url).origin;
  if (request.headers.get("origin") !== expected || request.headers.get("sec-fetch-site") === "cross-site") throw new StudyError(403,"请求来源无效，请从本网站操作。");
}
// 自托管管理会话：仅信任服务端派生令牌的 HttpOnly Cookie，不信任任何请求头中的身份声明
// （ChatGPT Sites 网关注入的 oai-authenticated-user-* 头在自托管环境中可被访客伪造）。
const ADMIN_COOKIE = "mc_admin";
export async function expectedAdminToken(settings: RuntimeSettings): Promise<string | null> {
  const password = settings.ADMIN_PASSWORD;
  if (!password) return null; // 未配置密码时一律拒绝，宁可锁死也不开放。
  return sha256(`${password}|${ADMIN_COOKIE}|v1`);
}
function timingSafeEqualHex(a: string, b: string) {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
export function adminSessionToken(request: Request) {
  return request.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith(`${ADMIN_COOKIE}=`))?.slice(ADMIN_COOKIE.length+1);
}
export function adminCookie(token: string, request: Request, maxAge = 86400) {
  return `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol==="https:"?"; Secure":""}`;
}
export async function verifyAdminPassword(password: unknown, settings: RuntimeSettings): Promise<boolean> {
  const configured = settings.ADMIN_PASSWORD;
  if (!configured || typeof password !== "string" || !password) return false;
  return timingSafeEqualHex(await sha256(password), await sha256(configured));
}
export async function assertAdmin(request: Request, settings: RuntimeSettings) {
  // 密码登录后由服务器签发 Cookie；未配置密码、无 Cookie、令牌不符一律 401，失败即关闭。
  const expected = await expectedAdminToken(settings);
  const token = adminSessionToken(request);
  if (!expected || !token || !timingSafeEqualHex(token, expected)) throw new StudyError(401,"请先通过管理入口登录。");
}
export async function sha256(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))),v=>v.toString(16).padStart(2,"0")).join("");
}
export function randomToken() { return Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,"0")).join(""); }
export function sessionToken(request: Request) { return request.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith("mc_session="))?.slice(11); }
export function cookie(token:string, request:Request, maxAge=180*86400) { return `mc_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol==="https:"?"; Secure":""}`; }
export async function bodyObject(request:Request): Promise<Record<string,unknown>> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new StudyError(415,"需要JSON请求。");
  // Bound streamed input even when Content-Length is absent.
  const reader=request.body?.getReader(); if (!reader) throw new StudyError(400,"请求为空。");
  let size=0; const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>32768){await reader.cancel();throw new StudyError(413,"请求过大。");}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
  let value:unknown;try{value=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new StudyError(400,"请求格式无效。");}
  if(!value||typeof value!=="object"||Array.isArray(value))throw new StudyError(400,"请求格式无效。");
  return value as Record<string,unknown>;
}
export function onlyKeys(value:Record<string,unknown>,keys:string[]) {if(Object.keys(value).some(k=>!keys.includes(k)))throw new StudyError(400,"请求含有不需要的字段。");}
