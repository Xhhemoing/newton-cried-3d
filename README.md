# 抖音 AI 创变者计划 · 《牛顿哭了 3D》标准研发与协作工作区

严格遵循官方 **《兴趣卡外部开发链路：用外部 SOTA 模型完成作品，再上传至抖音 AI 工坊》** 搭建的标准全栈研发工作区。

> **协作者快速接手指南（V2 前端模板与 3D 视觉重构阶段）**
> 1. **当前进度**：V1 双端闭环（`card-app/`）、60Hz 确定性物理核心与 `115` 项自动化测试已跑通；已完成 **V2 前端模板、程序化黏土 3D 建模与人类直觉排版重构方案**，待按 V2 规范重写前端与 3D 表现层。
> 2. **动手前必读（按顺序）**：
>    - 协作红线与目录边界：[`AGENTS.md`](./AGENTS.md)、[`docs/01-项目要求与接入规范.md`](./docs/01-项目要求与接入规范.md)、[`docs/04-工程规格与容器红线.md`](./docs/04-工程规格与容器红线.md)
>    - 官方平台 Skill 基准：[`interest_card_skills/README.md`](./interest_card_skills/README.md)
>    - **V2 重构核心蓝图**：[`card-app/DESIGN.md`](./card-app/DESIGN.md) 与 [`docs/09-牛顿哭了3D-V2前端重构与3D视觉设计白皮书.md`](./docs/09-牛顿哭了3D-V2前端重构与3D视觉设计白皮书.md)（V1 实测对照图见 [`docs/assets/v1-3D手势实测.png`](./docs/assets/v1-3D手势实测.png)）
> 3. **零依赖一键自检**：克隆仓库后在根目录直接运行 `pnpm verify`（Node.js `>=20`，无需外网或额外安装重型依赖即可跑完全部 `115` 项单测、Lynx/零软键盘合规扫描，并在 `dist/` 生成最新 `handoff.zip` 与 `HANDOFF_PROMPT.md`）。

## 1. 标准研发与上线流程

1. **读官方 Skill 规范**：动手前先读 [`interest_card_skills/`](./interest_card_skills/README.md)（特别是 `microapp-generate-interest-card` 与 `design-skill`）以及 [`docs/01-项目要求与接入规范.md`](./docs/01-项目要求与接入规范.md)、[`docs/02-已排除方案与反模式红线记录.md`](./docs/02-已排除方案与反模式红线记录.md)。
2. **外部 SOTA 核心开发（`card-app/`）**：
   - 技术栈：**`Taro + React + NestJS`**，统一使用 **`pnpm`** 管理依赖。
   - `card-app/DESIGN.md`：按 `design-skill` 产出视觉与 `300/436` 槽高布局规范；
   - `card-app/opencard/src/`：信息流兴趣卡（**Lynx 引擎渲染**，禁纵向滚动、禁 `@media`、纯点按 1–3 步闭环）；
   - `card-app/src/`：点击进入的兴趣卡落地页（常规 Taro + React 页面，承接完整多模式与复杂物理交互）；
   - `card-app/server/`：开放域后端服务（NestJS，提供 `/api/dy_card/data` 与动态业务接口；抖音身份/OpenAPI/`ai-platform-llm-skill` 标清接入点并用本地数据兜底，绝不臆造接口）。
3. **精简打包与回传上线（`handoff.zip` + 交接提示词）**：
   - 运行 `pnpm run handoff` 自动执行红线校验并生成精简业务包 `dist/handoff.zip`（**自动剔除 `package.json`、`node_modules`、构建产物、密钥与平台基础模板配置**）和配套 `dist/HANDOFF_PROMPT.md`；
   - 在抖音 AI 工坊对话框上传 `handoff.zip` 并粘贴交接提示词，由平台 AI 自动合并到 `/workspace/project/card-app`、接入抖音能力、转存 CDN 素材、生成卡片外框配置，在正式宿主验证后提交审核。WowLand 赛道一个人参赛，逐卡填写作品参赛问卷；2026 年 12 月 10 日 24:00 截止。所需预览图、海报、可选传播奖问卷和日期依据见[参赛决议](./docs/07-牛顿哭了3D-最终定案立项决议书.md)。

## 2. 工作区目录结构

```text
E:\Project\抖音大赛\
├── AGENTS.md                        # 协作准则、交互红线与 Codex/Gemini 分工路由
├── package.json                     # 工作区根校验与 handoff 交接打包命令（pnpm）
├── interest_card_skills/            # 官方平台内置 Skill 规范包（外部开发精简版）
├── card-app/                        # 与抖音 AI 工坊 /workspace/project/card-app 对齐的主工程（《牛顿哭了 3D》）
│   ├── DESIGN.md                    # 视觉与 300/436 槽高布局基准文档
│   ├── opencard/src/                # 信息流兴趣卡业务代码（Taro + Lynx，胖橘推杯、点按救杯）
│   ├── src/                         # 兴趣卡落地页业务代码（Taro + @open-dy/threejs 3D 失重木盘）
│   ├── server/src/                  # 开放域服务端业务逻辑（NestJS：/api/dy_card/data、AI 炼金与省队助力）
│   ├── feed/                        # 外框与卡片 Schema 本地对照参考
│   └── config/                      # 服务域（open/closed）与形态（feed/post）参考
├── promo/                           # 《牛顿哭了 3D》零外网依赖旗舰可玩 3D 宣传与路演演示站（双击 index.html 即玩）
├── tests/
│   └── newton-core.test.cjs         # 《牛顿哭了 3D》60Hz 物理内核、4 关反差、12 反应与安全钳制单测
├── refs/                            # 参考素材与历史物理手感原型备用库
│   └── rebel-chopsticks-html-proto/ # 历史物理算法参考原型与单测
├── tools/
│   ├── workshop-handoff.cjs         # Lynx/交互红线静态检查器 & handoff.zip 交接生成器
│   └── workshop-handoff.test.cjs    # 交接工具链单元测试
├── docs/                            # 完整规范、理论体系与架构文档（00 官方链路 ~ 08 完整项目理论与全栈架构白皮书）
└── archive/
    └── deprecated-mouthpiece/       # 已永久废弃拉黑方案隔离归档（严禁使用）
```

## 3. 《牛顿哭了 3D》产品决议与资料入口

胖橘推杯，玩家一按改写事故。参赛首版从刷到兴趣卡、救杯到进落地页再试一招。落地页还可以选宿舍或桌搭、保杯或保塔，自己试玩后给朋友出一道同桌题。平台模型生成更多生活场景留待下一阶段。

- [产品与参赛终稿](./docs/07-牛顿哭了3D-最终定案立项决议书.md)确定首发玩法、AI 出题、画风试播、宣发和参赛安排。
- [V2 前端重构与 3D 视觉设计白皮书](./docs/09-牛顿哭了3D-V2前端重构与3D视觉设计白皮书.md)给出 V1 病灶诊断、开源交互标杆吸收、三端模板重构、程序化黏土 3D 建模与人类直觉排版规范。
- [创意来源与试播手册](./docs/06-牛顿哭了3D-互联网爆款基因与产品总纲.md)收录《今天这桌，你保哪个？》的选题、分镜和同题双画风样片计划。
- [全栈架构白皮书](./docs/08-牛顿哭了3D-完整项目理论与全栈架构白皮书.md)说明现有工程、平台接入位置和实现上述目标的边界。
- 平台规范分别见[外部开发与交接链路](./docs/00-官方外部开发与交接链路规范.md)、[工程规格与容器红线](./docs/04-工程规格与容器红线.md)和[设计基准](./card-app/DESIGN.md)。

## 4. 常用命令（统一使用 `pnpm`）

```powershell
# 一键执行全部本地测试 + 静态红线检查 + 生成最新 dist/handoff.zip 与 HANDOFF_PROMPT.md
pnpm verify

# 单独运行全量单测（含物理内核、AI 导演/炼金钳制、离线 3D 宣传站与交接打包器）
pnpm test

# 本地启动《牛顿哭了 3D》旗舰 3D 宣传演示站服务（或直接双击 promo/index.html 离线打开）
pnpm run promo:serve

# 静态审计 card-app（Lynx 样式约束、零软键盘输入、PageIndex 斜杠、禁拉黑词）
pnpm run check

# 生成可上传抖音 AI 工坊的精简业务包 dist/handoff.zip 与交接提示词 dist/HANDOFF_PROMPT.md
pnpm run handoff
```
