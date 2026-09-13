# 交付清单与验证记录

日期：2026-09-13。实施完成并进入原Sites网址发布流程；最终线上状态以当次交付消息为准。本地测试记录不代表真实参与者，未向生产写入模拟答卷。

## 2026-09-13 第二轮：管理员认证自托管化与计分测试加固

chatgpt.site 部署对中国大陆 IP 返回 Cloudflare 拦截页（OpenAI 平台级 WAF 规则，非 GFW 拦截——经国内 DNS 解析、直连 TCP/TLS 与浏览器复测确认）。为支持境内参与者，做了以下改动：

- **管理认证不再信任平台身份头**：原实现信任 Sites 网关注入的 oai-authenticated-user-id，自托管环境可被访客伪造。现改为 ADMIN_PASSWORD 密码登录，服务器签发 HttpOnly SameSite=Strict Cookie（mc_admin），所有管理 API 复检该 Cookie，未配置密码时锁定；失败登录有限速与固定延迟。新增 /api/study/admin/login|logout、components/mindcompass/admin-login.tsx，删除 app/chatgpt-auth.ts。
- **计分测试加固**：原边界测试用配置自生成期望，反向题转录错误无法被发现。新增反向题清单独立硬编码（BFI-2 30题、legacy 11题、探索问卷每组末两题）、BFI-2 60题分区覆盖、手工混合答案回归、维度区间与非法值、空样本统计为 null 等断言。审计结论：六量表的计分键与已发表文献一致，未发现计分 bug。
- **自托管部署管线**：新增 scripts/deploy.mjs（构建→真实 D1 绑定/变量/路由→远端迁移→wrangler deploy），配置存于 gitignore 的 deploy-config.json；README 增补两种部署方式与境内验证步骤。
- 测试基线更新：48 项单元/接口测试、12 项浏览器测试、typecheck/lint/build/security 全部通过；新增 scripts/manual-score-verify.mjs 端到端计分人工复验（三场景通过）。

## 阶段结果

| 阶段 | 可验证结果 |
|---|---|
| 审查 | 保留原技术栈、站点、28题及responses表；识别前端计分信任、公开管理码、无草稿持久化问题 |
| 配置与评分 | 六配置及旧版、来源／许可／限制，26项评分测试通过 |
| 数据与授权 | 增量迁移、版本快照、幂等、修订号、隔离、清理与运行记录，13项SQLite接口测试通过 |
| 页面流程 | 1440×1000与390×844各完成六问卷；保存／返回／刷新／退出／键盘／故障重试、题目总览与新版结果均有回归 |
| 验证与交付 | 48项单元／接口＋12项浏览器测试通过，类型／lint／构建／有限扫描通过，文档已更新 |

## 实际测试命令与结果

| 命令 | 最近结果 |
|---|---|
| npm test | 2文件、39测试通过 |
| npm run test:e2e | 12通过，约1.9分钟；桌面与手机全流程控制台无错误 |
| npm run typecheck | 退出码0 |
| npm run lint | 退出码0 |
| npm run build | 退出码0，Worker、客户端及迁移输出成功 |
| npm run check:security | 125个源码及构建文件的有限模式扫描通过 |
| node scripts/local-db.mjs --e2e | 隔离本地D1三迁移已应用；从空SQLite执行当前迁移也通过 |
| git diff --check | 无空白错误；只有Windows换行提示 |

Sites构建助手在本机的npm启动路径解析失败；直接调用项目同一个npm run build成功，未替换构建产物或省略构建。早期测试失败与修复见AI_DEVELOPMENT_RECORD.md。最终浏览器测试覆盖普通导航恢复以及等待页面状态完成，未跳过失败场景。

## 评分配置位置

通用规则lib/assessment/scoring.ts；结构types.ts；BFI-2为bfi2.ts；TriPM为tripm.ts；其余四个探索问卷为exploratory.ts；旧版legacy.ts；注册表registry.ts。每题包含ID、文本、维度、方向和sourceId，来源与许可、计分及版本在对应Scale内，已完成答卷从D1版本快照读取，避免更新后改写历史解释。可读键表和公式见SCORING.md。

五点例：正向5→5、反向1→5、反向5→1。TriPM原四点例：反向0→3、3→0。正式结果拒绝缺失；所有维度只取所属题，无常模阈值。

## 尚未覆盖或需要真实输入的项目

- 线上管理授权：自托管改为 ADMIN_PASSWORD 密码登录（已实现并有测试）；生产密码设置、登录/登出与限速需在正式网址复测。Sites 部署保留时同样使用该密码登录，不再依赖平台身份网关。
- LAS-42未取得可确认的完整中文许可：交付42题原创探索替代，并非标准LAS-42。TriPM中文辅助译文未独立回译。
- 访问时、人工与生产每日定时清理均已实现；定时和人工运行会写入维护状态供后台核验。生产首次调度记录、托管地域、日志及备份保留仍须上线后确认。原responses不擅自销毁。
- 负责人公开联系渠道可通过RESEARCH_CONTACT_EMAIL配置；未配置时后台明确提示，现有入口仍只提交结构化反馈分类。
- 未执行真实10人试用、实际移动操作系统／屏幕阅读器、压力或渗透测试。密码认证已通过单元与浏览器测试，但正式网址部署后仍需按 PRELAUNCH_CHECKLIST 复测。
- 扫描覆盖当前代码和构建，不包括完整Git历史、外部日志／备份或本地旧归档；原固定码已在当前版本弃用。

部署变量包括APP_ORIGIN、ADMIN_PASSWORD、公开的RESEARCH_CONTACT_EMAIL以及D1绑定，不需要AI服务密钥，真实值不写本文。自托管部署使用gitignore的deploy-config.json，不进入Git。

## 修改／新增文件与目的

| 文件 | 改动目的 |
|---|---|
| .gitignore | 排除本地数据库、测试产物、环境文件与归档 |
| .env.example | 仅列部署变量占位符 |
| README.md | 运行、部署、数据模型、权限、评分及限制 |
| app/page.tsx | 首页入口 |
| app/layout.tsx | 中文元信息、统一布局、跳至正文 |
| app/globals.css | 接入新页面样式 |
| app/mindcompass.css | 原创暖色布局、响应式与焦点、可读字号 |
| app/admin/page.tsx | 服务器校验管理Cookie，未通过时渲染密码登录表单 |
| app/assessments/page.tsx | 独立六问卷选题路由 |
| app/assessments/[scaleId]/page.tsx | 按量表独立问卷路由 |
| app/results/[attemptId]/page.tsx | 按答卷独立结果路由 |
| app/privacy/page.tsx | 隐私与撤回路由 |
| app/feedback/page.tsx | 无身份文字采集的反馈路由 |
| app/api/study/[...path]/route.ts | D1绑定与新版API分发 |
| app/api/dashboard/route.ts | 旧管理API兼容到受保护汇总 |
| app/api/responses/route.ts | 旧答卷入口安全适配、服务端重新计分 |
| components/mindcompass/admin.tsx | 真实汇总、分布及去标识化JSON导出 |
| components/mindcompass/catalogue.tsx | 两区域六卡片、进度与历史结果 |
| components/mindcompass/feedback.tsx | 分类反馈，无自由文本 |
| components/mindcompass/frame.tsx | 共用导航、页脚、独立品牌 |
| components/mindcompass/home.tsx | 知情同意、成年确认、平台目的 |
| components/mindcompass/legacy-summary.tsx | 历史有效记录独立重算显示 |
| components/mindcompass/page-link.tsx | 普通导航避免Vinext草稿恢复缓存回归 |
| components/mindcompass/privacy.tsx | 数据说明、保留政策与撤回删除 |
| components/mindcompass/questionnaire.tsx | 逐题作答、保存、重试、导航、清除 |
| components/mindcompass/results.tsx | 维度图表、子维度交互、来源与谨慎解释 |
| lib/assessment/types.ts | 题目／维度／来源／评分／版本结构 |
| lib/assessment/bfi2.ts | 60题中文与五领域、15子维度及键 |
| lib/assessment/tripm.ts | 58题英文原版、中文辅助、四点原计分 |
| lib/assessment/exploratory.ts | 爱情42题及AI、冒险、合作各12题原创配置 |
| lib/assessment/legacy.ts | 保留原28题配置 |
| lib/assessment/registry.ts | 六问卷与旧版注册查找 |
| lib/assessment/scoring.ts | 输入验证、反向转换、维度聚合与量尺 |
| lib/client.ts | 类型化API及失败反馈 |
| lib/policy.ts | 同意版本与固定反馈分类 |
| lib/server/security.ts | 来源校验、密码登录会话（恒定时间比较、失败即关闭）、安全Cookie、令牌哈希、输入限制 |
| lib/server/study.ts | 同意／答卷CRUD、版本快照、幂等、CAS、清理、汇总与导出 |
| db/schema.ts | 保留旧表并新增Drizzle结构与约束 |
| drizzle/0001_study.sql | 新增五表和索引的增量迁移 |
| drizzle/meta/0001_snapshot.json | 当前结构快照供后续差异生成 |
| drizzle/meta/_journal.json | 追加新版迁移记录 |
| cloudflare-env.d.ts | DB及服务器运行环境类型 |
| worker/index.ts | 保留Vinext请求处理并增加计划清理函数 |
| vite.config.ts | 自定义Worker入口和每日计划声明 |
| package.json | 增加测试、类型、隔离预览与安全检查命令 |
| package-lock.json | 记录增加的测试依赖解析 |
| vitest.config.ts | 单元／SQLite测试配置 |
| playwright.config.ts | 桌面与手机、本地Worker测试设置 |
| scripts/local-config.mjs | 绝对路径本地Worker配置生成 |
| scripts/local-db.mjs | 隔离本地D1迁移 |
| scripts/local-preview.mjs | 隔离Worker预览；e2e固定测试管理密码，手动预览可用 LOCAL_ADMIN_PASSWORD |
| scripts/check-security.mjs | 源码及构建的敏感模式扫描 |
| tests/scoring.test.ts | 35项计分／配置断言（含反向键独立硬编码与手工回归） |
| tests/db-adapter.ts | 实际SQLite及迁移记录、D1接口形状 |
| tests/study.test.ts | 13项接口集成、六量表、并发、持久化、密码登录与伪造头安全测试 |
| tests/e2e/flows.spec.ts | 两个尺寸的全六量表与权限流程 |
| tests/e2e/recovery.spec.ts | 两个尺寸的键盘、503重试、退出及旧28题 |
| docs/SCORING.md | 可读公式、键、聚合、缺失、阈值和统计口径 |
| docs/SCALE_SOURCES.md | 语言、出处、改写、许可与限制 |
| docs/PRELAUNCH_CHECKLIST.md | 来源、隐私、真实10人、异常数据人工清单 |
| docs/AI_DEVELOPMENT_PROCESS.md | 交付物C：完整 AI 辅助开发过程（问题分解/提示词/架构/测试/错误与纠正） |
| components/mindcompass/admin-login.tsx | 管理密码登录表单（新增） |
| scripts/deploy.mjs | 自托管构建→迁移→wrangler deploy 管线（新增） |
| scripts/manual-score-verify.mjs | 端到端计分人工复验脚本（新增） |
| docs/AI_DEVELOPMENT_RECORD.md | 据实记录开发、错误和修复 |
| docs/TECHNICAL_REPORT.md | 架构、测试、研究边界及真实反馈待填章节 |
| docs/PILOT_EVALUATION_TEMPLATE.md | 十个空白试用位置，不虚构数据 |
| docs/DELIVERY.md | 本交付文件及测试记录 |

0000原迁移与旧responses内容未改写。原有本地归档保留且不纳入新部署。
