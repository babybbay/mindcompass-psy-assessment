import { expect, test } from "@playwright/test";

test("navigation cannot bypass consent, including a returning participant",async({page})=>{
 await page.goto("/");
 const nav=page.getByRole("navigation",{name:"主导航"});
 await expect(nav.getByRole("link")).toHaveText(["首页","探索测评","隐私说明","研究者入口"]);
 const adult=page.getByRole("checkbox",{name:"我确认已满18岁"});
 const agree=page.getByRole("checkbox",{name:"我已阅读并同意",exact:false});
 const start=page.getByRole("button",{name:"开始测量"});
 await nav.getByRole("link",{name:"探索测评",exact:true}).click();
 await expect(page).toHaveURL(/\/#consent$/);await expect(start).toBeDisabled();
 await expect(page.locator(".assessment-card")).toHaveCount(0);
 await adult.check();await nav.getByRole("link",{name:"探索测评",exact:true}).click();await expect(start).toBeDisabled();
 await adult.uncheck();await agree.check();await nav.getByRole("link",{name:"探索测评",exact:true}).click();await expect(start).toBeDisabled();
 await page.goto("/assessments");await expect(page.getByRole("link",{name:"前往参与说明"})).toBeVisible();await expect(page.locator(".assessment-card")).toHaveCount(0);
 expect((await page.request.get("/api/study/attempts")).status()).toBe(401);
 await nav.getByRole("link",{name:"首页",exact:true}).click();await expect(page).toHaveURL(/\/$/);
 await adult.check();await agree.check();await start.click();await expect(page).toHaveURL(/assessments$/);await expect(page.locator(".assessment-card")).toHaveCount(6);
 // A previously consented cookie must not make the homepage navigation skip its form.
 await page.goto("/assessments/ai-attitude");await page.locator('input[type=radio][value="3"]').check({force:true});await expect(page.getByRole("status")).toHaveText("已保存到数据库");
 const before=(await (await page.request.get("/api/study/attempts")).json()).attempts[0];
 await nav.getByRole("link",{name:"首页",exact:true}).click();await expect(adult).not.toBeChecked();await expect(agree).not.toBeChecked();
 await nav.getByRole("link",{name:"探索测评",exact:true}).click();await expect(page).toHaveURL(/\/#consent$/);await expect(start).toBeDisabled();
 await adult.check();await agree.check();await start.click();await expect(page).toHaveURL(/assessments$/);await expect(page.locator(".assessment-card")).toHaveCount(6);
 const after=(await (await page.request.get("/api/study/attempts")).json()).attempts;expect(after).toHaveLength(1);expect(after[0].id).toBe(before.id);expect(after[0].answers).toEqual(before.answers);
});

test("unavailable consent service never exposes assessment cards",async({page})=>{
 await page.route("**/api/study/session",route=>route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:"参与状态暂时无法确认"})}));
 await page.goto("/assessments");await expect(page.getByRole("alert")).toHaveText("参与状态暂时无法确认");await expect(page.locator(".assessment-card")).toHaveCount(0);
});
