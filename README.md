# MindCompass 心智罗盘

> **线上测评平台：[https://mindcompassforai.xyz](https://mindcompassforai.xyz)**（教育与研究性自我探索，18 岁及以上参与者；管理后台 /admin 仅研究者可登录）

用于18岁及以上参与者的非商业教育／研究性自我探索。结果不构成临床、医学或心理诊断，不替代专业意见。没有常模、诊断阈值、虚构用户数或评价。

沿用 React 19、TypeScript、Vinext/Vite、Cloudflare Workers、Drizzle 和 Cloudflare D1。保留旧版28题入口及 responses 历史表，新增独立六問卷流程，未替换技术栈。依赖解析见 package-lock.json。支持两种部署：ChatGPT Sites（仅境外可访问）与自托管 Cloudflare Workers（绑定自定义域名后境内可访问）。

## 六个入口和测量边界

| ID | 内容 | 题数／选项 | 计分 |
|---|---|---|---|
| bfi2 | BFI-2 张博、黎坚等中文版 | 60／1–5原中文选项 | 五领域、15子维度均分，无总分 |
| love-attitudes | 原创爱情态度探索 | 42／1–5 | 六种爱情态度均分，无总分 |
| tripm | TriPM公开英文原版＋自译中文辅助 | 58／0–3原四点 | 三维度原始和分，总和上限174 |
| ai-attitude | AI态度自编探索 | 12／1–5 | 三维度均分 |
| risk | 冒险倾向自编探索 | 12／1–5 | 三维度均分 |
| teamwork | 团队合作自编探索 | 12／1–5 | 三维度均分 |

**爱情态度42题并非LAS-42原题或标准译本**：尚未确认可公开使用的完整中文版本和许可，使用用户允许的原创探索性替代，不能声称完成LAS-42标准化测评。TriPM中文辅助译文未独立回译或验证，中文使用为探索性；原版四点规则优先于统一五点界面要求。BFI-2保留作者研究用途许可与版权，不能推断商业许可或本站已完成验证。

来源、语言、改写、许可和限制见 [量表来源](docs/SCALE_SOURCES.md)。公式、反向题和维度映射见 [评分说明](docs/SCORING.md)。修改题目或规则必须更新版本，已保存的量表快照不可覆盖。

## 本地运行与测试

需要 Node.js 22.13+，本次验证使用Node24和Windows Edge。无需心理测评AI API密钥。

```sh
npm ci
npm run build
npm run db:local
npm run preview:local
```

打开 http://127.0.0.1:5173 。npm run dev 可用于界面开发，完整D1验证使用上面的Worker预览。开发数据库在忽略的 .wrangler/mindcompass-v2；测试数据库在 .wrangler/mindcompass-e2e，都不连接生产数据。

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run check:security
node scripts/local-db.mjs --e2e
npm run test:e2e
```

Playwright使用本机Edge，桌面1440×1000、手机390×844。没有Edge时需安装兼容浏览器并调整 playwright.config.ts 的channel。--e2e 仅启用本地测试管理员标识，不含真实凭据。测试记录在忽略的work目录，模拟答案从不写入生产D1。源码及构建产物扫描是有限规则检查，不证明所有历史提交、平台日志和备份均无敏感内容。

## 环境和管理员配置

| 名称 | 类型 | 用途 |
|---|---|---|
| DB | D1绑定 | 自托管由wrangler配置绑定；Sites部署由.openai/hosting.json声明，无数据库密码 |
| APP_ORIGIN | 服务端环境变量 | 正式HTTPS源，不含末尾斜杠；校验写入请求来源 |
| ADMIN_PASSWORD | 服务端秘密环境变量 | /admin密码登录的服务端口令；未配置时管理入口锁定 |
| RESEARCH_CONTACT_EMAIL | 服务端环境变量 | 公开显示在隐私与反馈页的研究负责人邮箱 |

.env.example只有占位符。运行环境值由部署平台管理，不写入前端、日志、README或Git。不需要NEXT_PUBLIC身份凭据、OAuth客户端密钥或AI服务密钥。

/admin使用密码登录：服务器校验ADMIN_PASSWORD后签发HttpOnly SameSite=Strict Cookie（mc_admin），所有管理API再次在服务器校验该Cookie。未配置密码、无Cookie、令牌不符一律401（失败即关闭），连续尝试失败有限速。管理员身份不写入参与者表。登录与登出由本站路由/api/study/admin/login|logout实现，不再依赖平台网关注入的oai-authenticated-user-id请求头——该头在自托管环境可被访客伪造，已不再被信任（测试覆盖）。参与者Cookie不授予管理权限。

管理密码请使用强随机值；忘记密码时由部署方重新设置ADMIN_PASSWORD变量并重新部署。

## 路由与数据流

/首页同意 → /assessments两板块六卡片 → /assessments/[scaleId]自动保存 → /results/[attemptId]持久化结果。另有/privacy撤回删除、/feedback反馈分类、/admin统计与导出。/assessments/legacy保留旧28题。

浏览器只发送同意字段、选项、游标、请求编号和修订号。服务器验证来源、会话归属、量表版本、题目范围和完整性，按不可变配置评分，原子写入D1。完成记录不接受前端分数，并发使用修订号比较，重复相同提交返回原结果。分享结果网址不开放他人答案。

## 数据结构

| 表 | 用途 |
|---|---|
| mc_participants | 随机participantId、令牌SHA-256、创建和过期时间 |
| mc_consents | 同意版本／时间、成年确认，关联participantId |
| mc_scale_versions | scaleId＋version主键、完整配置及哈希 |
| mc_attempts | 独立attemptId、participantId、版本、逐题答案JSON、得分JSON、时间、状态、游标、修订号和幂等ID |
| mc_feedback | 必要随机编号、参与编号、反馈分类和时间 |
| responses | 保留旧表，不回填、不改写、不删除 |

同一行保存答案和得分JSON，以一次条件更新保证答案、分数和完成状态一致。参与者与答卷一对多。约束见db/schema.ts和drizzle/0001_study.sql。

不保存明文Cookie、管理员身份、姓名、邮箱、手机号、IP、精确地址或设备指纹。旧表年龄段停止新增采集且不导出。随机编号仍可关联多问卷，属于去标识化，不能承诺绝对匿名。

## 保留、统计与导出

草稿最后保存7天后过期并清空答案；单份退出立即清空答案，保留退出状态用于完成率。完成内容保留180天，参与会话从首次同意起最长180天，后续内容可能更早级联删除。撤回全部参与立即删除本会话记录和反馈。遗失Cookie后无法凭姓名找回数据。

API访问时清理过期数据，worker/index.ts有每日计划处理函数，vite.config.ts声明UTC每日18:00触发。定时或人工清理会把运行时间及处理数量写入mc_maintenance，研究者后台据此显示真实运行状态，而不是仅检查配置。新版本上线后仍须等待或触发一次生产任务以确认调度记录；托管备份／日志保留、数据地域也须在正式招募前核验。旧表保留规则未明确，本轮不擅自销毁。

统计按量表版本隔离。均值和分布用每参与者每版本首份完成记录；完成率用完成次数／全部开始次数，退出与过期仍在分母，无样本显示空值。耗时包括暂停。导出全部完成次数，保留participantId和attemptId供筛选重复，日期到天，不含凭据或身份信息。旧版单独按回答重算，排除无效记录，不冒称真实参与者数。未加入alpha或相关分析，未作效度验证。

## 部署

**方式一：自托管 Cloudflare Workers（推荐，境内可访问）**。chatgpt.site 部署对中国大陆 IP 返回 Cloudflare 拦截页，改用自托管后不存在该限制。需要：Cloudflare 账号、一个域名（DNS 由 Cloudflare 托管）、一个 D1 数据库。步骤：

1. `wrangler d1 create mindcompass`（用项目内 wrangler：`node --import ./scripts/sites-env.mjs node_modules/wrangler/bin/wrangler.js d1 create mindcompass`）取得 database_id。
2. 在 Cloudflare 面板添加域名（zone），取得 zone id。
3. 创建 deploy-config.json（已 gitignore，见 scripts/deploy.mjs 头部注释）。
4. 执行 `node scripts/deploy.mjs`：构建 → 生成真实绑定/变量/路由配置 → 应用远端 D1 迁移 → `wrangler deploy`。单独应用迁移可用 `--db-only`。
5. 部署后关闭代理验证：首页可打开、问卷可完整提交、/admin 可登录、参与者伪造 oai-authenticated-user-id 头不能获得管理数据。

自定义域名解析由 Cloudflare 托管，站点源站在境外，无需 ICP 备案。定时清理 cron（UTC 18:00）随构建产物的 wrangler 配置一并生效。

**方式二：ChatGPT Sites（保留，仅境外可访问）**。继续使用.openai/hosting.json现有项目和DB绑定。构建生成dist/server/index.js、客户端资源和Sites迁移清单。Sites保存精确源代码对应版本并部署；迁移在Worker上传前执行，不直接使用wrangler deploy替代。注意Sites平台的Cloudflare WAF拦截中国大陆IP，境内参与者需使用方式一。

0000_mindcompass_responses.sql保持原样。0001_study.sql来自Drizzle生成结果并剔除已有responses建表语句，只新增表和索引，不含测试数据。0001_snapshot.json补齐后续差异生成所需快照。以后用npm run db:generate生成并审查增量，不修改已应用文件。部署失败也可能已应用迁移，应核实边界再修复，不删库重试。

保留原公开访问范围，后台数据受独立授权保护。真实参与者数据不作为自动化测试种子。

## 文档与待完成研究工作

- [AI开发记录](docs/AI_DEVELOPMENT_RECORD.md)
- [技术报告草稿](docs/TECHNICAL_REPORT.md)
- [上线前人工清单](docs/PRELAUNCH_CHECKLIST.md)
- [10人真实试用空白模板](docs/PILOT_EVALUATION_TEMPLATE.md)
- [文件与验证交付清单](docs/DELIVERY.md)

反馈入口仅收集分类。配置RESEARCH_CONTACT_EMAIL后，隐私与反馈页会显示负责人邮箱；未配置时后台明确标记为待处理。10人试用仅检验可用性，不证明量表效度或建立常模。
