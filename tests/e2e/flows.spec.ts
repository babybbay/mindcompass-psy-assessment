import { expect, test } from "@playwright/test";
import { scales } from "../../lib/assessment/registry";
test("consent, six independent complete flows, reload, back and results",async({page},testInfo)=>{
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
 const waitForSave=()=>page.waitForResponse(response=>response.request().method()==="PUT"&&response.url().includes("/api/study/attempts/"));
 await page.goto("/");await expect(page.getByRole("button",{name:"开始测量"})).toBeDisabled();
 await page.getByRole("checkbox",{name:"我确认已满18岁"}).check();await page.getByRole("checkbox",{name:"我已阅读并同意",exact:false}).check();await page.getByRole("button",{name:"开始测量"}).click();await expect(page).toHaveURL(/assessments$/);
 await expect(page.locator(".assessment-card")).toHaveCount(6);await page.screenshot({path:`work/catalogue-${testInfo.project.name}.png`,fullPage:true});
 const ids=new Set<string>();
 for(const scale of scales){
  await page.goto(`/assessments/${scale.id}`);await expect(page.locator(".answer-options")).toBeVisible();
  await page.getByRole("button",{name:"下一题",exact:false}).click();await expect(page.getByRole("alert")).toContainText("还没有选择");
  for(let i=0;i<scale.items.length;i++){
   const value=scale.id==="tripm"?2:3;
   await expect(page.locator(".answer-options")).toBeEnabled();
   const answerSaved=waitForSave();await page.locator(`input[name="${scale.items[i].id}"][value="${value}"]`).check({force:true});await answerSaved;
   await expect(page.getByRole("status")).toHaveText("已保存到数据库");
   if(i===0){await page.reload();await expect(page.locator(`input[type=radio][value="${value}"]`)).toBeChecked();await page.getByRole("button",{name:"保存并返回选题",exact:false}).click();await expect(page).toHaveURL(/assessments$/);await page.locator(`a[href^="/assessments/${scale.id}?"]`).click();await expect(page.locator(`input[type=radio][value="${value}"]`)).toBeChecked();}
   if(i===1){let moved=waitForSave();await page.getByRole("button",{name:"上一题",exact:true}).click();await moved;await expect(page.getByRole("status")).toHaveText("已保存到数据库");moved=waitForSave();await page.getByRole("button",{name:"下一题",exact:false}).click();await moved;await expect(page.getByRole("status")).toHaveText("已保存到数据库");}
   if(i<scale.items.length-1){const moved=waitForSave();await page.getByRole("button",{name:"下一题",exact:false}).click();await moved;await expect(page.locator(".progress-caption")).toContainText(`第 ${i+2} /`);}else await page.getByRole("button",{name:"提交并查看结果"}).click();
  }
  await expect(page).toHaveURL(/\/results\//);await expect(page.getByRole("heading",{name:scale.name,exact:true})).toBeVisible();await expect(page.getByRole("meter")).toHaveCount(scale.dimensions.filter(d=>!d.parentId).length);await expect(page.getByRole("button",{name:"打印／保存个人摘要"})).toBeVisible();await expect(page.getByText("靠近任一端都不代表更好或更差")).toBeVisible();
  ids.add(page.url());await page.reload();await expect(page.getByRole("meter").first()).toBeVisible();
  if(scale.id==="bfi2"){await page.getByRole("button",{name:"展开15个子维度"}).click();await expect(page.getByRole("meter")).toHaveCount(20);}
  await page.screenshot({path:`work/results-${scale.id}-${testInfo.project.name}.png`,fullPage:true});
 }
 expect(ids.size).toBe(6);expect(errors).toEqual([]);
 const history=await page.request.get("/api/study/attempts");expect((await history.json()).attempts.filter((a:{status:string})=>a.status==="completed")).toHaveLength(6);
});
test("admin denied, own result isolation, consent guard and keyboard",async({page,browser})=>{
 await page.goto("/admin");await expect(page.getByLabel("管理密码")).toBeVisible();
 expect((await page.request.get("/api/study/admin/summary")).status()).toBe(401);expect((await page.request.get("/api/dashboard")).status()).toBe(401);expect((await page.request.get("/api/study/admin/export")).status()).toBe(401);
 // 伪造平台身份头不得获得管理权限（自托管环境无网关剥离访客请求头）。
 const spoofContext=await browser.newContext({extraHTTPHeaders:{"oai-authenticated-user-id":"local-e2e-admin"}});const spoof=await spoofContext.newPage();await spoof.goto("http://127.0.0.1:5173/admin");await expect(spoof.getByLabel("管理密码")).toBeVisible();await spoofContext.close();
 await page.goto("/assessments");await expect(page.getByRole("link",{name:"前往参与说明"})).toBeVisible();await page.goto("/");await page.keyboard.press("Tab");await expect(page.getByRole("link",{name:"跳至正文"})).toBeFocused();
 const context=await browser.newContext();const admin=await context.newPage();await admin.goto("http://127.0.0.1:5173/admin");
 await admin.getByLabel("管理密码").fill("wrong-password");await admin.getByRole("button",{name:"登录"}).click();await expect(admin.getByRole("alert")).toContainText("密码不正确");
 await admin.getByLabel("管理密码").fill("e2e-admin-password");await admin.getByRole("button",{name:"登录"}).click();
 await expect(admin.getByRole("heading",{name:"从真实记录中，观察趋势。"})).toBeVisible();await expect(admin.locator(".metrics-grid").first()).toBeVisible();await expect(admin.getByRole("heading",{name:"安全与数据保留检查"})).toBeVisible();await admin.getByRole("button",{name:"立即执行保留期清理"}).click();await expect(admin.getByText("最近一次人工清理：")).toBeVisible();await context.close();
});
