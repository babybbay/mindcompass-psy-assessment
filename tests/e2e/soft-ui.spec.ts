import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

async function contrast(page:Page){
 const failures=await page.evaluate(()=>{
  const rgb=(value:string)=>{if(!value.startsWith("rgb"))throw new Error(`Unsupported color format: ${value}`);const n=value.match(/[\d.]+/g)!.map(Number);return [n[0],n[1],n[2],n[3]??1];};
  const blend=(fg:number[],bg:number[])=>fg.slice(0,3).map((v,i)=>v*fg[3]+bg[i]*(1-fg[3]));
  const luminance=(c:number[])=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const bad:string[]=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
   const node=walker.currentNode,el=node.parentElement;if(!el||!node.textContent?.trim()||el.closest('[aria-hidden="true"],script,style,option'))continue;
   const range=document.createRange();range.selectNodeContents(node);if(!range.getBoundingClientRect().height)continue;
   const chain:Element[]=[];for(let a:Element|null=el;a;a=a.parentElement)chain.unshift(a);let bg=[255,255,255];for(const a of chain)bg=blend(rgb(getComputedStyle(a).backgroundColor),bg);
   const fg=blend(rgb(getComputedStyle(el).color),bg),a=luminance(fg),b=luminance(bg);const ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
   if(ratio<4.5)bad.push(`${node.textContent.trim().slice(0,40)}: ${ratio.toFixed(2)}`);
  }return bad;
 });expect(failures).toEqual([]);
}

test("Soft UI tokens, responsive spacing, contrast and interaction states",async({page,browser},info)=>{
 const css=readFileSync("app/mindcompass.css","utf8");
 expect(css).not.toMatch(/rounded-none|rounded-sm\b|border-[24]\b|border-black|bg-black|shadow-\[|#000(?:000)?\b|gradient\(|border-(?:left|right)|background-clip|cubic-bezier/);
 for(const token of ["rounded-2xl","rounded-3xl","shadow-lg","shadow-xl","hover:-translate-y-0.5","hover:shadow-xl","duration-200","duration-300","focus:ring-2","prefers-reduced-motion"])expect(css).toContain(token);
 await page.emulateMedia({reducedMotion:"no-preference"});await page.goto("/");
 for(const width of [320,670,768,1024,1326,1440]){
  await page.setViewportSize({width,height:1000});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await contrast(page);
  await page.screenshot({path:`work/soft-home-${width}-${info.project.name}.png`,fullPage:true});
 }
 const flowWidth=info.project.name==="mobile"?390:1440;
 await page.setViewportSize({width:flowWidth,height:1000});
 await page.getByRole("checkbox").nth(0).check();await page.getByRole("checkbox").nth(1).check();
 const button=page.getByRole("button",{name:"开始测量"});
 await expect(button).toBeEnabled();
 expect(await button.evaluate(e=>parseFloat(getComputedStyle(e).borderRadius))).toBe(25);
 // Touch contexts do not provide a persistent mouse hover, even when Chromium reports hover capability.
 if(!info.project.use.hasTouch){
  // Finish viewport/scroll changes before locating the pointer; smooth scrolling can move the target after hover().
  await button.evaluate(e=>e.scrollIntoView({block:"center",behavior:"instant"}));
  await expect.poll(async()=>{await button.hover();return button.evaluate(e=>({hover:e.matches(":hover"),translate:getComputedStyle(e).translate}));}).toEqual({hover:true,translate:"0px -2px"});
 }
 await button.focus();expect(await button.evaluate(e=>getComputedStyle(e).boxShadow)).not.toBe("none");
 await page.emulateMedia({reducedMotion:"reduce"});await expect(button).toHaveCSS("transition-duration","0s");await expect.poll(()=>button.evaluate(e=>["none","matrix(1, 0, 0, 1, 0, 0)"].includes(getComputedStyle(e).transform))).toBe(true);await expect(button).toHaveCSS("translate","0px");
 await button.click();await expect(page).toHaveURL(/assessments$/);await expect(page.locator(".assessment-card")).toHaveCount(6);await contrast(page);
 expect(await page.locator(".assessment-card").first().evaluate(e=>parseFloat(getComputedStyle(e).borderRadius))).toBe(24);
 await expect(page.getByText("探索，从一个问题开始")).toBeVisible();
 await expect(page.getByText("每份问卷独立保存。你可以随时退出、随时回来，继续未完成的探索。")).toBeVisible();
 expect(await page.locator(".card-action").first().evaluate(e=>({radius:parseFloat(getComputedStyle(e).borderRadius),background:getComputedStyle(e).backgroundColor,justify:getComputedStyle(e).justifyContent}))).toEqual({radius:20,background:"rgb(239, 237, 247)",justify:"center"});
 await expect(page.locator(".fine-print").filter({hasText:"对照第一版"})).toHaveCount(0);
 for(const width of [320,768,1440]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`work/soft-catalogue-${width}-${info.project.name}.png`,fullPage:true});}
 await page.setViewportSize({width:flowWidth,height:1000});
 await page.goto("/assessments/ai-attitude");await expect(page.locator(".answer-options")).toBeVisible();await contrast(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('input[type=radio][value="3"]').check({force:true});await expect(page.getByRole("status")).toHaveText("已保存到数据库");await contrast(page);await page.screenshot({path:`work/soft-question-${info.project.name}.png`,fullPage:true});
 const attempt=(await (await page.request.get("/api/study/attempts")).json()).attempts[0];const payload=await (await page.request.get(`/api/study/attempts/${attempt.id}`)).json();
 const complete=await page.request.post(`/api/study/attempts/${attempt.id}/complete`,{headers:{Origin:"http://127.0.0.1:5173"},data:{answers:Object.fromEntries(payload.scale.items.map((i:{id:string})=>[i.id,3])),revision:attempt.revision,cursor:0}});expect(complete.status()).toBe(200);
 await page.goto(`/results/${attempt.id}`);await expect(page.getByRole("meter").first()).toBeVisible();await contrast(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`work/soft-results-${info.project.name}.png`,fullPage:true});
 for(const path of ["/privacy","/feedback","/admin"]){await page.goto(path);await contrast(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 const adminContext=await browser.newContext({viewport:{width:768,height:1000}});const admin=await adminContext.newPage();await admin.goto("http://127.0.0.1:5173/admin");await contrast(admin);await admin.getByLabel("管理密码").fill("e2e-admin-password");await admin.getByRole("button",{name:"登录"}).click();await expect(admin.locator(".metrics-grid").first()).toBeVisible();await contrast(admin);expect(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await admin.screenshot({path:`work/soft-admin-${info.project.name}.png`,fullPage:true});await adminContext.close();
});
