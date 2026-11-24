# 抖音大赛项目协作、真实规范与模型分工指引

遵守当前会话用户指示。**任何选型、设计与写码前，必须按顺序阅读：**
1. **官方平台 Skill 包**：[`interest_card_skills/README.md`](./interest_card_skills/README.md)、[`microapp-generate-interest-card/SKILL.md`](./interest_card_skills/microapp-generate-interest-card/SKILL.md)、[`design-skill/SKILL.md`](./interest_card_skills/design-skill/SKILL.md)
2. **项目接入与红线基线**：[`docs/01-项目要求与接入规范.md`](./docs/01-项目要求与接入规范.md) 与 [`docs/02-已排除方案与反模式红线记录.md`](./docs/02-已排除方案与反模式红线记录.md)
3. **官方外部开发链路原文与容器红线**：[`docs/00-官方外部开发与交接链路规范.md`](./docs/00-官方外部开发与交接链路规范.md) 与 [`docs/04-工程规格与容器红线.md`](./docs/04-工程规格与容器红线.md)

## 已永久排除方案与交互生死红线（严禁复辟）

1. **永久拉黑《这句怎么回 / 社恐嘴替 / 嘴替接线员》及一切“读文字对话 + 输入框打字”类方案**（已隔离归档至 `archive/deprecated-mouthpiece/`，严禁读取复辟）。
2. **交互极速轻快铁律**：抖音流内没有人会点进来看大段文字，更没有人会打字输入。后续一切方案（含兴趣卡与落地页）必须满足：**零长文阅读、全程零软键盘打字输入、纯图形/物理/直觉式极速点按反馈（`<100ms` 即时视觉爽感）**，严禁做文字阅读器、聊天模拟器或表单工具，严禁向用户界面输出内部工程术语（对外仅称「兴趣卡」「兴趣卡落地页」）。

## 官方技术栈与外部交接铁律（严禁臆造接口）

1. **一体双端真实栈**：正式工程位于 `card-app/`（对应平台 `/workspace/project/card-app`），技术栈固定为 **`Taro + React + NestJS`**，统一用 **`pnpm`** 管理依赖：
   - `card-app/opencard/src/`：信息流兴趣卡（**Lynx 引擎渲染**，严禁 `@media`、严禁纵向滚动，确保 **`300` 和 `436` 两档高度**完整可读，不自实现背景音）；
   - `card-app/src/`：点击进入的落地页（常规 Taro + React 小程序页面，承接复杂交互与多模式）；
   - `card-app/server/`：开放域后端服务（NestJS，提供 `/api/dy_card/data` 与业务接口）；
   - `card-app/DESIGN.md`：按 `design-skill` 格式维护的唯一视觉布局基准。
2. **平台专属能力留口兜底**：抖音用户身份、客户端授权、OpenAPI、平台大模型（`ai-platform-llm-skill`）、图片转存（`transfer_file`）在本地用清晰 Mock 兜底并标注 `// [PLATFORM-INTEGRATION]`，**严禁凭空编造平台 SDK 接口，严禁写浏览器 DOM / `Taro.getEnv() === WEB` 兼容分支**。
3. **精简交接包上线**：回传抖音 AI 工坊时通过 `pnpm run handoff` 生成精简 **`dist/handoff.zip`**（仅含业务代码、`DESIGN.md`、素材与合并说明 `README.md`，严禁打入 `package.json`、`node_modules`、构建产物、密钥与模板基础配置）+ **交接提示词 `dist/HANDOFF_PROMPT.md`**。

## 模型路由与提速策略（GPT 主力 × 节省 Gemini）

1. **GPT 承担主力编码、验证与红队审查**：
   - 新建会话默认使用 `codex`（`gpt-6.2-sol` / `gpt-6.2-astra`，默认 `high`）。
   - 若当前主会话运行在 Gemini 上，进入 `card-app/` 编码、前后端组件实现、服务端逻辑、交接打包脚本、单元测试或合规审查时，优先通过 `delegate_task` 将独立模块并行委派给 `codex`：
     - **提速实现 / Taro 组件 / 脚本与单测**：`providerInstanceId: "codex"`, `model: "gpt-6.2-astra"`, `options: { "reasoningEffort": "high" }`
     - **核心状态机 / NestJS 接口协议 / Lynx 与交接合规审计**：`providerInstanceId: "codex"`, `model: "gpt-6.2-sol"`, `options: { "reasoningEffort": "high" }`
2. **控制 Gemini 消耗**：
   - 避免单线程用 Gemini 串行包揽全部前后端代码，也不再每轮并跑多个 Gemini 子代理辩论。
   - Gemini（`gemini-4-neon` / `gemini-4-carbon`）仅按需用于 `DESIGN.md` 首屏视觉审美定调、微动效打磨或里程碑定稿交叉验收。
3. **并行与文件隔离**：
   - `opencard/src/`、`src/`、`server/src/` 与测试可并行派发最多 3 个 `codex` 子任务；严守同文件单写者，主线程负责汇总集成与契约对齐。
   - 平台预览器截图、Lynx 300/436 槽高与真机手势效果以实际运行/平台验收为准，不在本地伪造验收结论。

## 标准工作区目录规范

- `interest_card_skills/`：官方飞书外部开发链路下发的平台 Skill 规范包（只读基准，严禁擅改）。
- `card-app/`：与抖音 AI 工坊 1:1 对齐的正式工程目录（`opencard/src`、`src`、`server`、`feed`、`config`、`DESIGN.md`，当前锁定主项目《牛顿哭了 3D》）。
- `promo/`：与 `card-app/` 根级物理隔离的《牛顿哭了 3D》零外网依赖旗舰可玩 3D 宣传与路演演示站（不打入 `handoff.zip`）。
- `tests/`：核心物理求解器、双核活体 AI 安全钳制与服务端契约自动化测试套件（`tests/newton-core.test.cjs`）。
- `refs/`：参考原型、物理手感试验场与生图素材备用目录（如 `refs/rebel-chopsticks-html-proto/`）。
- `tools/`：外部开发静态合规检查与 `handoff.zip` + 交接提示词自动生成器（`tools/workshop-handoff.cjs`）。
- `docs/`：项目完整规范、理论体系与架构文档（`00` 官方外部链路原文、`01` 接入规范、`02` 排除红线、`03` 全景指南、`04` 容器红线、`05` 战略看板、`06` 爆款基因总纲、`07` 定案立项决议书、`08` 完整项目理论与全栈架构白皮书）。
- `dist/`：生成的 `handoff.zip` 与 `HANDOFF_PROMPT.md` 交接产物（Git 忽略）。
- `archive/deprecated-mouthpiece/`：历史废弃与永久拉黑方案隔离区，严禁引用。
