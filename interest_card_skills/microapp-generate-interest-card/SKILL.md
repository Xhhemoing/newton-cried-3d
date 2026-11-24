---
name: microapp-generate-interest-card
metadata:
  version: "1.0.0"
description: 当用户要求生成、改造或优化抖音兴趣卡及其落地页、新建个人页作品、将已有兴趣卡升级为个人页作品，或继续开发个人页作品时使用（Taro + React + NestJS 实现、数据协议、网络收敛、运行校验）。界面视觉、布局、样式/CSS 效果以目标工程 DESIGN.md（design-skill 产出）为准，本 skill 不维护视觉规范。
---

# Interest Card Generate Skill

**仅基础信息任务优先**：用户只要求补齐或修改名称、图标、简介、搜索别名、搜索标签（包括附截图说“补齐这些信息”）时，直接读取 `${SKILL_DIR}/references/microapp/microapp.md`「基础信息」，执行读取、非空字段保存和回读确认。本分支优先于后续生产路由、工程准备、校验与交付检查，只执行本轮资料相关检查；不重做玩法规划、不初始化工程、不改业务代码，不额外配置隐私或类目，也不为此生成代码提交。同时有业务修改需求时，继续原任务并在交付前完成资料处理。仅生成图标或在回复中列出资料，不算已保存。

**持续渲染补充约束**：涉及渲染生命周期或后台绘制时，写代码前读取 `${SKILL_DIR}/references/common/canvas-2d.md` 第 4 节及其“Timer 渲染与异步恢复约束”，按资源清单修复并执行调度器、页面两层行为验收，适用项通过后交付。
交付渲染生命周期改动前，重新读取上述补充末尾的“导出前最后一轮检查”，执行各适用行为断言并修复失败项。

**判定先于一般需求澄清**：先用已有信息匹配 OpenAPI、判定服务域和工程状态；已有工程需要取消冲突能力或关闭账号数据能力时，先发起确认，再问玩法、页面或交互细节；无冲突首次开启直接实施。只有缺失信息会改变数据主体、API 匹配或服务域时，才先问一个最小必要问题；证据不足时保持工程现状，不默认开放域。

**实现前 API 判定**：初始化或写业务代码前先加载 `microapp-capability-guide-interest-card/SKILL.md`，按其流程检索并读取命中的 OpenAPI 原子详情，再按数据主体、用途和返回字段匹配 API 并确认服务域；不要求用户点名 API/封闭域，不用固定名单或关键词，命中封闭域用途即进入 `${SKILL_DIR}/references/common/private-data-intent-routing.md` 的流程，直接按路由实施，不另行请求封闭域 OpenAPI 使用确认。能力 Skill、索引或命中详情缺失/为空就停止，不以 `card-routing.json`、`.env`、历史记忆、默认开放域或已迁除的本地 OpenAPI 文件替代，无匹配也记录。年龄、性别等字段名本身不决定来源或服务域；结合用户说明、业务场景及工程数据流区分平台用户上下文、表单输入和已有业务数据。来源不明且影响 API / 服务域时先做最小澄清，不默认平台取数，也不擅自改成手填。同一新项目若已匹配封闭域高敏 API，又明确要求初始化商品目录等非卡片业务库，按该 API 判定封闭域并执行 `initialize_closed`，商品目录在开放域初始化和写库、封闭域卡仅用 `queryClosedDomainReadOnly()` 读取最小结果，不能把用户属性改成普通参数或因商品库写入把卡片判为开放域；只有多个主体或口径的差异会改变 API / 服务域判定时，才先用业务语言澄清并保持现状。首次写文件前完成：`数据主体与用途 → API 匹配或无匹配 → 授权/服务域 → 工程状态 → action`。已加载且内容仍可用时复用，缺失或有更新时补读。

**封闭域 OpenAPI 使用**：封闭域 OpenAPI 不再增加 Agent 侧使用确认：首次接入和后续新增能力均不调用 `ask_user_question` 询问是否允许使用，不等待或生成项目级 `accepted` 结果；按当前 OpenAPI 原子详情 的服务域与接口要求直接实现。OAuth、平台权限与运行时鉴权仍按接口文档执行。

**SDK 文档**：普通小程序和兴趣卡落地页查 `${SKILL_DIR}/sdk-docs/taro/llms.txt`，OpenCard 查 `${SKILL_DIR}/sdk-docs/opencard/llms.txt`；按 `${SKILL_DIR}/references/common/fullstack.md`「SDK 文档查阅」先核对当前工程依赖与 `sdk-docs/versions.json`，再沿索引只读本轮所需 API。文档随 Skill 构建刷新并交付；SDK 升级或版本不一致时重新核对实际包的公开导出与类型，避免沿用旧契约。信息足够就实现，类型和源码仅用于补缺或排错。

**依赖升级依据**：`@open-dy/vibecoding-cli`、`@open-dy/vibecoding-sdk-taro`、`@open-dy/vibecoding-sdk-opencard` 及 `@open-dy/opencard-taro` 按当前 Skill 的 `${SKILL_DIR}/templates/taro/`、`${SKILL_DIR}/templates/fragments/opencard/` 代码实现和完整依赖声明升级。先读取模板再比较现有工程，按 `${SKILL_DIR}/references/common/fullstack.md`「依赖更新」局部合并所需变化；除用户明确指定其他版本目标外，不查询远端最新版本，不使用 `@latest` 或 `update --latest`，不以安装最新版代替模板接入。

**已有工程续改优先**：任何初始化或补装之前先判断目标工程是否已有项目文件。已有工程先读 `${SKILL_DIR}/references/common/legacy-project-compatibility.md`，只为本轮明确需要的升级或新能力做最小改动；缺少 `card-routing.json`、SDK 或 OpenCard 不能触发初始化，也不能据此推断服务域。原工程没有封闭域能力而本轮需要时，按该 reference 完成服务、路由、启动和打包接入后再实现高敏调用；不能只在原 `server/` 加接口。

## 定位

本 skill 服务**兴趣卡**产品线。完整产物由两部分构成，**一体不可拆分**：

| 产品术语（对外/编排） | 内部实现（目录/技术名，可写代码） |
| --- | --- |
| **兴趣卡** | `opencard/` 子应用（自定义 widget 渲染）+ 根目录 `feed/feed-card.json` |
| **兴趣卡落地页** | 工程主应用 `src/`（Taro 页面）+ 共享 `server/` |

- 本 `SKILL.md` 只承载产品入口、路径约定、场景路由和通用约束。
- 目标工程根固定为 **`/workspace/project/card-app`**（不是 `microapp`）。
- 具体目录、命令、端口、初始化与实现细则通过 `references/` 渐进式披露。
- 面向用户的输出只用「兴趣卡」「兴趣卡落地页」；`opencard`、`feed-card.json`、`dy_card` 等仅供 Agent 内部执行。

**资源与版本一致性**：具体初始化、补装和校验命令以本 Skill 的对应 reference 为准。必读文件缺失/为空或脚本不支持文档中的参数时，停止依赖该能力的操作并报告具体不匹配；不得删掉服务域参数、跳过必读规则或改用默认服务域继续。

**运行环境边界**：需要区分开发真机预览、部署测试与生产，或判断预览身份、故障证据范围时，读取 `${SKILL_DIR}/references/common/runtime-environments.md`。

## 路径约定

- 先解析本文件的绝对路径，再把所在目录记为 `SKILL_DIR`。
- 打开、检索或执行本 skill 内资源时，一律使用绝对路径，例如 `${SKILL_DIR}/references/microapp/microapp.md`。
- 再定位已加载的 `microapp-capability-guide-interest-card/SKILL.md`，把其所在绝对目录记为 `CAPABILITY_SKILL_DIR`。标准安装结构下它与本 Skill 同级；以实际加载的能力 Skill 绝对路径为准，不能用当前工作目录拼路径。
- 客户端 API、组件、服务端 OpenAPI 的索引、原子详情和公共调用规则一律从 `${CAPABILITY_SKILL_DIR}` 读取；不能把 `CAPABILITY_SKILL_DIR` 复用为 `SKILL_DIR`，也不能继续引用本 Skill 已迁除的本地 OpenAPI / OpenCard API 文件。
- 若能力 Skill 未加载，或其 `SKILL.md`、索引、命中详情缺失/为空，停止依赖该能力的实现并报告缺少的 Skill 或文件。
- 不要只写 `SKILL.md`、`references/...`、`templates/...` 这类相对路径，工作目录变化时容易读错文件。
- 业务代码只写入已初始化的目标项目；除非用户明确要求修改 skill 或模板，否则不要改 `SKILL_DIR` 下的 `templates/`、`references/` 或脚本。

### 工程根（硬约束）

| 变量 | 路径 |
| --- | --- |
| `APP_ROOT` | `/workspace/project/card-app` |
| `FRONTEND_SRC` | `/workspace/project/card-app/src`（兴趣卡落地页） |
| `SERVER_ROOT` | `/workspace/project/card-app/server` |
| `OPENCARD_ROOT` | `/workspace/project/card-app/opencard`（兴趣卡） |
| `RUNTIME_URL` | `http://localhost:10086/` |

**禁止**写入 `/workspace/project/microapp` 或其它未约定根目录。

## 公共资源

| 资源 | 用途 | 读取/执行时机 |
| --- | --- | --- |
| `${SKILL_DIR}/init.sh` | 初始化 `card-app` 基础模板，并可注入兴趣卡（`opencard/`） | 只按已加载 reference 的命令执行 |
| `${SKILL_DIR}/scripts/install-opencard.sh` | 给兼容的 `card-app` 安装兴趣卡子应用（`opencard/`） | 仅当本轮确需 OpenCard 且工程符合脚本声明的模板前提时执行；旧结构先读兼容 reference |
| `${SKILL_DIR}/templates/taro/` | 兴趣卡落地页基础 Taro + NestJS 模板 | 初始化、升级依赖或入口、排查模板问题时查看 |
| `${SKILL_DIR}/templates/fragments/opencard/` | 兴趣卡子应用片段模板（目录名 `opencard/`） | 接入或升级兴趣卡依赖及入口、排查模板问题时查看 |
| `${SKILL_DIR}/references/common/fullstack.md` | 兴趣卡与落地页共用的前端、服务端、工具调用、UI/UX、校验约束 | 读取具体场景 reference 后必读 |
| `${SKILL_DIR}/references/common/business-experience.md` | 业务实现经验与交互验收要点 | 按图片、截图或设计稿还原时，在需求拆解与设计前必读「图片还原要覆盖可识别的交互」；涉及筛选联动、数据数量、重复内容布局、AI 生图、Agent/workflow 结果解析或接口/数据库结果验收时必读对应条目 |
| `${SKILL_DIR}/sdk-docs/{taro,opencard}/llms.txt` | SDK 业务 API 的 AI 索引、签名、配置字段和示例 | 按 `fullstack.md`「SDK 文档查阅」从索引定位所需 API；没有详细文档时只补查对应公开导出与类型 |
| `microapp-capability-guide-interest-card`：`${CAPABILITY_SKILL_DIR}/SKILL.md` | 兴趣卡落地页和卡片的客户端 API、组件、服务端 OpenAPI 检索入口与原子详情 | 生成或审查任何平台能力前先加载；按其中流程检索，不遍历全量详情 |
| `${CAPABILITY_SKILL_DIR}/references/common/openapi/guide.md` | OpenAPI 公共 SDK、授权与 token 管理规则 | 命中 OpenAPI 且原子详情要求读取公共规则时读取 |
| `${SKILL_DIR}/references/common/private-data-intent-routing.md` | 兴趣卡开放域 / 封闭域意图识别、迁移和路由一致性 | 每次生成或改造兴趣卡时，在初始化和写代码前必读 |
| `${SKILL_DIR}/references/common/legacy-project-compatibility.md` | 历史工程续改的只读检查、最小升级、冲突停止条件与状态交接门槛 | 目标工程已存在，且本轮需要续改或判断是否升级时必读 |
| `${SKILL_DIR}/references/common/privacy-service-consent.md` | 封闭域 OpenAPI 调用边界（不增加 Agent 确认） | 准备生成实际高敏 OpenAPI 调用时必读 |
| `${SKILL_DIR}/references/common/card-data-model.md` | **仅兴趣卡**（`opencard/`）的 CardDataModel、dy_card/data、读写分离 | 兴趣卡涉及服务端接口时必读 |
| `${SKILL_DIR}/references/common/canvas-2d.md` | Canvas 2D、小游戏、逐帧动画等规范 | 仅需求命中 Canvas/游戏/动画且没有 Three.js / WebGL / 3D 信号时读取 |
| `${SKILL_DIR}/references/common/canvas-3d.md` | 兴趣卡与落地页的 Three.js `0.160.1`、Canvas V2 WebGL、Canvas 首帧常驻、模型资源与生命周期规范 | 需求命中 Three.js、Canvas 3D、WebGL 3D、OrbitControls、GLTF/GLB、3D 模型展示或拾取时必读 |
| `${SKILL_DIR}/references/microapp/microapp.md` | 兴趣卡落地页入口、适用边界、初始化、命令、主应用实现规范 | 所有场景必读；兴趣卡 UI 不得写在主应用 `src/` |
| `${SKILL_DIR}/references/microapp/audit-compliance.md` | 兴趣卡审核规则与合格/不合格示例 | 首次生产时读取，作为生产要求，不据此验收；用户要求检查时再按指定范围核对 |
| `${SKILL_DIR}/references/microapp/miniapp-open-card.md` | 宿主实际内嵌 `MiniappOpenCard` 的组件、数据隔离与配置约束 | 用户要求内嵌，或封闭域结果需在落地页呈现时必读 |
| `${SKILL_DIR}/references/opencard/opencard.md` | 兴趣卡（`opencard/`）路径、安装、执行、源码范围与校验规范 | 兴趣卡场景必读 |
| `${SKILL_DIR}/references/opencard/closed-domain-card.md` | 封闭域兴趣卡的模式、Schema、服务端与验收 | `private-data-intent-routing.md` 判为封闭域，或用户明确要求封闭域时必读 |
| `${SKILL_DIR}/references/opencard/feed-card-shell.md` | 兴趣卡外壳 `feed/feed-card.json` 流程、素材与字段边界 | 兴趣卡场景必读 |
| `${SKILL_DIR}/references/opencard/bgm-catalog.json` | 兴趣卡 BGM 曲库兜底（按 `summary`/`tags` 匹配；全部条目可作循环 BGM） | 用户明确要求曲库/默认音乐，或生成失败需要兜底时必读 |
| `${SKILL_DIR}/references/opencard/bgm-pe.md` | 调 `mm_tool_music_*` 前的 PE 编译规范（风格/BPM/循环禁令；无人声用 `is_instrumental`） | 写 `BgMusicUrl` 默认优先读取；仅显式曲库/默认音乐或失败兜底路径可不读 |
| `${SKILL_DIR}/references/opencard/taro-dsl.md` | 兴趣卡 Taro DSL / TSX 输出层约束 | 生成或审查兴趣卡页面/组件/TSX 时读取 |
| `${SKILL_DIR}/references/opencard/components.md` | 兴趣卡组件白名单与属性边界 | 涉及组件导入、Svg、Canvas 时读取 |
| `${CAPABILITY_SKILL_DIR}/references/opencard/runtime.md` | 兴趣卡 Taro 运行时调用约束与 `useCardTaro` | 涉及 API / useCardTaro 时读取，并继续检索对应 API 原子详情 |
| 目标工程 `DESIGN.md` | 视觉/布局的唯一来源（design-skill 产出；含选中 Layout / Component 参考、适配方案与 Taro 参考路径） | 实现 `opencard/src` UI 前必读；没有则先走 design-skill |
| `${SKILL_DIR}/references/opencard/rendering.md` | Lynx CSS 能力、布局约束与差异排查；视觉值以 `DESIGN.md` 为准 | 实现或改写 CSS，以及排查预览与真机样式不一致前必读 |

## 场景路由

本产品线**只有一条生产链路**：兴趣卡 + 兴趣卡落地页。不弹形态选择，不生产「仅卡」或「仅落地页」，不做数据型独立分支。

**硬约束（reference 读取）**：

1. 必须先读 `${SKILL_DIR}/references/microapp/microapp.md`，确认落地页入口、`APP_ROOT=/workspace/project/card-app`、初始化边界。
2. 必须继续读 `${SKILL_DIR}/references/opencard/opencard.md`；主应用规则不得外溢到 `opencard/`，除非 opencard reference 明确要求复用。
3. 写任何兴趣卡代码前须确认已存在 `opencard/`。新工程按 reference 初始化；已有工程缺少 `opencard/` 时先读兼容 reference，只有确认本轮需要且脚本前提满足后才补装，不能覆盖或重建旧工程。
4. **兴趣卡视觉/布局**：以目标工程 `DESIGN.md` 为准（由 design-skill 产出）。没有则先产出，再按文档实现 `opencard/src` UI。本 skill 不维护 token、widget 视觉 CSS。Layout / Component 仍是参考，不是固定模板；命中时必须按 DESIGN.md 路径实际读取 `example.tsx` / `example.css`，再结合当前业务适配。实现或改写参考 CSS 前读 `rendering.md`。
5. 兴趣卡 UI **只写** `opencard/src/`；兴趣卡落地页写主应用 `src/` + 共享 `server/`。
6. **先判服务域，再初始化或写码**：读取 OpenAPI 原子详情 与 `private-data-intent-routing.md`，将数据需求匹配到具体能力；命中封闭域高敏方法时，兴趣卡 CardData 和 `/api/dy_card/data` 路由到 `closed-domain-server/`。已有工程先判定当前服务域；缺少 `card-routing.json` 时不得推断服务域。已有开放域工程首次接入封闭域能力，且三项依赖事实均为 false 时，直接执行 `migrate_open_to_closed`，不调用 `ask_user_question`；存在外网 / 写库冲突且用户尚未作出选择时，先询问是否取消全部冲突能力，用户明确确认后才迁移。用户已拒绝或只同意取消部分冲突能力时，保留现状并结束本轮，不再追问剩余能力。封闭域转开放域仍须先确认取消相关账号数据能力。 需要确认时直接调用工具，不能只在正文模拟问题和选项；确认前保持工程不变。问询使用 reference 中的短模板，问题不超过两句；取消选项只写需取消的具体能力，另一项保留现状并停止本轮，正文及问询均不重新命名或描述替换卡片；使用业务语言，不向用户暴露服务域名称、内部 action 或工程路径。新项目初始化不属于域切换。封闭域卡只通过 `queryClosedDomainReadOnly()` 读取开放域业务数据；OAuth 授权不等于服务域确认。不得展示卡型选择或凭关键词猜测服务域。
7. 封闭域 OpenAPI 按 `privacy-service-consent.md` 的调用边界直接实现，不增加使用确认；已判定迁移时立即同步静态模式、CardData、路由和接口目录，迁移后重新读取并核对。用户已明确拒绝相关数据使用时停止该能力，不以公开数据伪装替代。混合新项目中，商品目录等非卡片业务在开放域初始化和写库，封闭域卡仅读取最小结果。
8. 用户要求内嵌，或经 OpenAPI 判定的封闭域结果及其派生 UI 需在落地页呈现时，读取 `miniapp-open-card.md` 并由宿主渲染容器；请求、处理和 UI 留在 `opencard/`，不得转运到普通 `src/` 或 `server/`。仅在 Feed 卡内使用封闭域能力时不额外内嵌。承载当前卡片须使用非空 `OPEN_CARD_ID` 和 `appId={OPEN_CARD_ID}`；不得以平台判断控制组件展示。

**仅本轮命中封闭域能力且历史工程缺少对应服务时**：按 OpenAPI 原子详情 与 `private-data-intent-routing.md` 完成服务域判定及必要的冲突确认后，先按 `${SKILL_DIR}/references/common/legacy-project-compatibility.md` 从当前 Skill 的 `templates/taro/closed-domain-server/` 引入独立的 `${APP_ROOT}/closed-domain-server/`，接入 workspace、启动、构建与 pack，再迁移卡片接口。`install-opencard.sh` 不会创建该服务；已有目录只合并缺失能力，不覆盖用户实现。服务未运行或未生成独立服务包，都不能视为迁移完成。 若迁移后需由宿主内嵌卡片，还须按该 reference「历史项目的内嵌卡预览兼容检查」核对 CLI / 自有启动器与实际 runner 的参数传递及宿主预览；仅升级 runner 不算完成接入。 未命中封闭域能力时，不因缺少 `closed-domain-server/` 补建服务或迁移接口。

| 场景 | 触发词/信号 | 必读 reference |
| --- | --- | --- |
| 存量兴趣卡升级为个人页作品 | 用户明确要求将现有兴趣卡升级为个人页作品，如“升级为个人页作品” | 先重新读取 `${SKILL_DIR}/references/common/upgrade-to-post.md` |
| 新建个人页作品 | 用户明确要求新建个人页作品 | 先读取 `${SKILL_DIR}/references/common/post-card-differences.md`，按其中的新建流程设置形态和准备 BGM |
| 已升级个人页作品续改 | `config/card-routing.json` 中 `cardType=post`（含直接新建的作品） | 先读取 `${SKILL_DIR}/references/common/post-card-differences.md` |
| 兴趣卡 + 兴趣卡落地页（默认） | 兴趣卡、兴趣卡落地页、生成卡、卡片主题/样式/场景；以及历史同义：Feed 卡、自定义 Feed 卡、opencard、用户异形卡、小花卡 | 首次生产时先读 `audit-compliance.md`，再读 `microapp.md`、`opencard.md`、`fullstack.md`；涉及服务端接口再读 `card-data-model.md`；页面/组件/TSX 读 `taro-dsl.md`；组件属性/Svg/Canvas 读 `components.md`；API/`useCardTaro` 读 `api.md`；视觉/布局/CSS 效果读 `DESIGN.md`；Lynx 属性能力读 `rendering.md` |
| 兴趣卡落地页改造（工程已含 opencard） | 改落地页、加页面/接口、扩展功能；只修改本轮涉及的部分，保留未涉及的卡片业务 | 先读 `microapp.md` + `fullstack.md`；若同步改卡再读 opencard 系列 |
| OpenCard 状态共享 / 落地页交接（仅封闭域） | OpenCard 使用封闭域模式，且需求明确要求 Feed 跳转后，由落地页内嵌卡保留并恢复用户在 Feed 中产生的交互状态 | 读取 `${SKILL_DIR}/references/opencard/state-sync.md`；内嵌方式读取 `${SKILL_DIR}/references/microapp/miniapp-open-card.md`。 |
| Canvas/小游戏/持续动画 | Canvas、画布、游戏、粒子、`requestAnimationFrame`，且没有 Three.js / WebGL / 3D 信号 | 先读所属场景 reference 和 fullstack，再读 `canvas-2d.md` |
| Three.js / Canvas 3D / WebGL | Three.js、threejs、Canvas 3D、WebGL 3D、OrbitControls、GLTF、GLB、3D 模型、3D 拾取 | 先读所属场景 reference 和 fullstack，再读 `canvas-3d.md`；兴趣卡侧还须读 `components.md`、`api.md`、`taro-dsl.md`、`rendering.md`；同一需求另含独立 2D 绘制时才同时读 `canvas-2d.md` |

触发词归一化：忽略大小写、空格和中英文间隔。历史说法「自定义 Feed 卡 / Feed 卡 / 小程序落地页」在本 skill 内一律映射为「兴趣卡 / 兴趣卡落地页」，**不向用户询问 Feed 卡类型**。

`custom_schema` 是已废弃的输入别名：在意图识别或只读决策阶段，只能归一为**固定 OpenCard**；不得把它解释为 JSON Schema、Feed 卡类型或模板契约，也不得因这个词提及、读取或生成 `feed/feed-card.json`、`feed/custom-card-schema.json`、`TemplateType`、`TemplateStyleType` 或 `custom_component`。后续已经进入常规兴趣卡实现时，是否生成卡片外壳文件只由默认产品链路决定，不是由该历史别名触发。

OAuth 的能力解释、授权与实际实现按 `private-data-intent-routing.md`「OAuth 判定与任务范围」处理；不因接口需要 OAuth 就判为封闭域，也不限制用户回复为固定句式。

服务域分析属于内部决策。等待切换确认时，正文与 `ask_user_question` 都只展示简短业务问题、影响与继续/停止选项，不展示内部服务域名称、action、接口 key、配置路径或迁移方案；不要先输出技术分析再询问。尚未回答时等待，拒绝或含糊时保留现状并结束本轮。确认后的实际实施保留既有 UI，局部合并卡片配置、路由和相关接口，再执行 `build:pack`、核对产物并运行 `pnpm verify`；未运行时如实说明。

## 标准工作流

1. 解析 `SKILL_DIR`，先读 `microapp.md`、OpenAPI 原子详情、`private-data-intent-routing.md`，再读 `opencard.md` 与其它必要 reference；首次生产时同时读 `audit-compliance.md`，作为生产要求，不据此验收。读取前不要写业务代码。
2. 从 reference 取得目标根目录（**必须为** `/workspace/project/card-app`）、源码目录、真实服务域、初始化/补装、启动/构建/lint 与校验 URL；从 common 取得前后端与校验约束。
3. 若目标项目不存在：按服务域执行 `bash "${SKILL_DIR}/init.sh" /workspace/project/card-app --with opencard --opencard-service-domain <open|closed>`。若已存在：先按 `legacy-project-compatibility.md` 检查工程；缺 `opencard/` 且确认符合最新模板前提时才执行 `install-opencard.sh` 并传入同一服务域，旧结构保留业务代码局部升级或报告阻塞。已存在 `opencard/` 时必须保留 UI，仅按 `closed-domain-card.md` 的受控步骤迁移服务端与模式。**禁止** re-init 覆盖已有业务代码。
4. 实现前探查真实文件：`package.json`、workspace、源码目录、配置、组件、网络层、服务端模块。读取片段不代表完整文件；修改前按 `fullstack.md`「工具调用策略」核对首行与读取范围，禁止按截断片段整文件覆盖或补重复 import。
5. 业务数据流：动态业务数据 → 默认建真实 server 接口；仅固定文案/纯视觉/用户明确 mock 才用本地常量。何时设计 DB、是否开通以编排 prompt 的存库需求判定为准，不要自行推断。兴趣卡服务端 → 先读 `card-data-model.md`，定 `types.ts`，再实现 `/api/dy_card/data` 与 `resolveCardData()`。落地页业务 → 按 `fullstack.md` 先验收 server，再写前端。
6. 若用户指定飞书文档/表格/Base/云盘/在线文件作数据源并要求导入落库：必须真实访问解析后再写库；飞书文档用文档类工具、表格用表格类工具。读取失败则暂停并说明，禁止用 mock 冒充。
7. 视觉/布局/样式 CSS 以实现侧 **`DESIGN.md`** 为准（design-skill 产出）。读取 Layout / Components、参考资产路径、各状态信息组织、Header / Footer 决策和适配方案；实际读取选中的 `example.tsx` / `example.css` 后按业务适配，不整份复制。Widget 只负责宿主 Feed 卡内的自定义区域；宿主展示业务标题，并根据 `feed/feed-card.json` 的 `Button`、`ContentInfoList[0].PageIndex` 和 `ContentInfoList[0].PageURL` 提供进入落地页的入口。宿主元素不属于 Widget DOM，卡内不重复业务标题，默认不重复同语义入口。只有用户明确要求，或 `DESIGN.md` 记录已确认玩法需要在特定卡内状态提供落地页入口时，才实现真实跳转，目标须为本次工程中已存在的页面。保留模板的 `.widget-root` / `.widget-body` / FMP 和可选 Header、Footer 的同级关系；修改 `app.css` / `index.css` 前读取完整文件，优先局部修改，不能覆盖壳层，也不新建 `layout.css`。视觉值按 `DESIGN.md`，实现 CSS 先用 `rendering.md` 过滤 Lynx 能力。没有 `DESIGN.md` 时先走 design-skill。
8. 首次有实际内容后，或用户明确要求补齐/修改基础信息时，按 `microapp.md`「基础信息」执行 `microapp_get_data_info → 构造非空 MicroAppInfo 补丁 → microapp_save_data_info → 同 AppID 回读确认`。只补空项或用户指定的修改项；已有字段齐全且未要求修改时跳过保存。禁止空对象保存，未回读确认不得宣称已补齐；搜索别名/搜索标签与隐私协议细则见同文件。
9. 全部代码完成后执行 `pnpm verify`（见 `fullstack.md`）；只有纯文案字面量替换可跳过，见编排 prompt。阻塞时说明失败阶段与未验证项。
10. 代码校验完成后，按下文“截图检查”使用 `interest-card-browser` 截图并实际目检 UI 布局。
11. 个人页作品（`cardType=post`）完成截图检查后，按“交付前检查”判断是否需要更新封面；需要时执行 `interest-card-cover` Skill。

推荐顺序：**初始化 → 兴趣卡 → 兴趣卡落地页 → 基础信息（含 searchAlias/searchTag）/隐私协议 → 校验 → 截图检查 → 封面判断与按需制作（仅 post）→ 交付**。

用户指定的触发点与结果优先于设计参考；默认玩法只补当前需求未指定的部分，不套用到独立需求。解析态按 `DESIGN.md` 替换或精简选项，避免与题图、题干、解析、操作堆叠。兴趣卡跳转目标必须是本次落地页工程中已存在的页面路径。

## 截图检查

卡片代码生产或修改完成后，交付前使用 `interest-card-browser` 对本轮涉及的页面与关键状态截图，并实际目检 UI 布局。按当前工程形态选择场景，预览准备、浏览器操作和收口均遵循该 Skill：

| 场景 | 预览选择 |
| --- | --- |
| 兴趣卡 | 默认场景，或 `--preview-scene feed` |
| 个人页作品（含升级后） | `--preview-scene post` |

截图应包含 Feed 宿主外壳。对照工程 `DESIGN.md` 与当前场景规范，确认内容有无裁切、重叠，文字与按钮是否完整可读，可点击元素是否被宿主控件遮挡。发现布局问题后修复相关业务代码，按原验收流程复验并重新截图。

存量兴趣卡升级为个人页作品的当轮，兴趣卡和个人页作品两个场景都必须截图，不能只截个人页作品，并按场景分别校验：

- **兴趣卡（feed 场景）**：校验整体布局——主体内容沿卡片垂直中轴线水平居中，视觉重心落在卡片中心、左右留白均衡，无明显偏左或偏右的单侧偏移；同时确认内容无裁切、重叠，文字与按钮完整可读，可点击元素未被宿主控件遮挡。
- **个人页作品（post 场景）**：校验交互元素避让——逐页面状态确认按钮、答题选项等可点击元素完整落在安全区内，没有被右侧宿主操作列遮挡，且以卡片中心为轴保持居中；判定标准见 `references/common/post-card-differences.md`「主交互避让右侧宿主操作区」。

任一场景校验不通过都按原流程修复并重新截图，两个场景均通过后才算完成截图检查，再进入后续封面与交付环节。

保留相关截图路径和实际观察结论。`interest-card-browser` 不可用、截图失败或无法目检时，如实记录未验证范围；浏览器截图仅辅助检查预览布局，真机手势、导航及返回行为仍按原流程验收。

## 通用约束

- 生成 `MiniappOpenCard` 时必须显式传 `initData` 普通对象；没有初始化数据写 `initData={{}}`，不得省略或传 JSON 字符串、数组、`null`、`undefined`。详细参数约束见 `references/microapp/miniapp-open-card.md`。
- 封闭域 Feed 点击后需在详情页展示卡片结果时，默认在宿主 detail 页用 `MiniappOpenCard` 承接，不建议放在首页 index；用户明确要求首页内嵌时按其需求实现。宿主跳转路由与卡内 `path` 的区分见同一 reference。

- 使用 `pnpm` 管理依赖和执行脚本；不要使用 `npm` 或 `yarn` 作为项目命令入口。
- 除抖音 AI 平台的 api-key 外，不要硬编码密钥、数据库凭据、完整域名或 `localhost` 到业务代码。
- 默认交付可运行产物。仅当用户明确表达只看视觉效果、静态设计或无需真实功能时，才允许纯视觉稿中的控件仅作展示；用户明确要求可交互原型、暂不接后端或使用示例数据时，可以使用本地数据，但交互与状态变化仍须可用。只说“先做一版”或“初版”不代表允许假交互。
- 可运行产物中，用户操作、状态变化、数据展示和最终结果须前后一致；所有表现为可操作的控件都须具有与其语义一致的行为和可见反馈。具体实现规则见 `references/common/fullstack.md`「UI/UX」。
- 是否开库以编排 prompt 的存库需求判定为准。待办 / 打卡 / 连击玩法或用户选择助手推荐方案，不等于要求数据库持久化；无存库需求时不新增 SQL、表结构或数据库 repository，不调开通工具。存库需求沿用当前工程中用户此前已明确且未撤销的要求，不因本轮只回答玩法选择而清空；助手自行建议不算授权。有存库需求且 `{{HasCalledDatabaseInitTool}}` 为 `false` 时，必须先调用 `init_douyin_cloud_mysql_*`，再写相关实现；不得先写 SQL 再补判定。
- 外部数据源初始化 DB 时，`dev` 可在预检后直写开发库；`prod` 禁止 agent 直连写库，只能沉淀幂等 SQL / seed。
- 第三方导入（含类型）、图标名、组件导出、Hook 必须核对实际 `export`；内部声明不等于公开导出，缺失时修调用侧，不修改依赖包补导出。细则见 `fullstack.md`「工具调用策略」。
- 当前 SDK 化 Taro 落地页模板使用独立包 `@open-dy/lucide-taro`，面向模型可按 `lucide-react` 的图标名和组件 API 理解；Taro 业务代码统一从 `@open-dy/lucide-taro` 导入，不要生成 `lucide-react`。OpenCard 不安装或使用该图标包。
- 优先复用模板已有组件、网络层、工具函数和服务端封装。
- 落地页默认使用 Taro 标准组件；兴趣卡（`opencard/`）默认无页面跳转和 TabBar。
- **禁止**在业务代码中编写 H5 / Web 端兼容分支：不要 `Taro.getEnv() === WEB` 双端降级、不要为 Camera/Map/Video 等写 H5 占位、不要按浏览器 DOM 思路实现。业务按抖音端（TT / OpenCard）语义编写；预览链路由模板内置能力承接，Agent 不得改写。
- 兴趣卡视觉/布局按 `DESIGN.md`，各状态无重叠、无裁边。禁止 CSS `@media` 和纵向滚动；空间不足时删减内容，不用覆盖或裁切硬塞。使用纵向 Flex 时先明确高度来源和余高去向，不让无关的同级区域同时增长；可选 Header / Footer 在当前状态无内容时不渲染。
- 已按编排 prompt 确认数据库需求并处理开通动作后，允许先完成不依赖真实连接的代码；外部服务也可先完成此类代码。迁库用 `pnpm init-mysql-db`。
- 若用户 query 想要 AI 功能但未指明接入方式，优先调用 `ai-platform-llm-skill`。

- OpenAPI：准备调用抖音 OpenAPI 时必须先读 `${CAPABILITY_SKILL_DIR}/references/common/openapi/guide.md`；通过 `@open-dy/ai_coding_sdk/openapi` 使用，禁止生成项目内 `server/src/lib/openapi.ts`。
- 服务端涉及数据库或系统命令时，必须严格遵守 `${SKILL_DIR}/references/common/fullstack.md` 中的“SQL / 命令注入防护”；禁止通过拼接 SQL、`exec` / `execSync` / `sh -c` 等方式让前端可控输入直达数据库或 shell。
- 生成代码保持模块化；业务接口不要堆在模板示例入口。
- 仅开发/预览控制台噪声且不影响业务时忽略，不改工程绕开。

## 交付前检查

- 个人页作品的新建、升级和续改均已核对 `feed/feed-card.json` 顶层的 `BgMusicUrl`。缺失或不合规时按作品差异规范补齐并通过 Feed 校验，即使本轮未改卡片 UI 也要检查。

**个人页作品封面收口（仅 `cardType=post` 的代码生产或修改任务）**：按原流程完成本轮校验和普通预览截图验收后，先处理封面，再调用 `done`。升级当轮按升级流程的封面要求执行；其他情况按以下步骤判断：

1. 结合本轮改动，判断现有封面是否仍准确呈现作品的标题、主体内容、背景和入口。不能仅因已有封面就跳过判断；无法判断时先查看已有封面。
2. 没有封面，或本轮改动影响封面呈现时，读取并执行 `interest-card-cover` Skill，按其流程制作、看图并保存；用户明确要求更新封面时也执行。
3. 确认现有封面不受本轮改动影响时，保留已有封面，不重复制作。
4. 制作失败或 Skill 缺失时，沿用封面 Skill 的执行预算和失败处理，说明封面未更新及原因，继续交付代码与预览。

- 涉及持续渲染循环时：按 `${SKILL_DIR}/references/common/canvas-2d.md` 第 4 节核对引擎 pause/resume、隐藏停止、显示恢复与切换幂等；保留原有状态，不影响非渲染任务。
- 工程根为 `/workspace/project/card-app`，未误写 `microapp`。
- 已读并遵循 `microapp.md`、OpenAPI 原子详情、`private-data-intent-routing.md`、`opencard.md` 等命中 reference。
- 用户提到场景启用中的抖音侧边栏、抖音 Feed、抖音搜索时，这三项都是这张兴趣卡本身，按兴趣卡和落地页处理。驳回原因看不清时，先请用户发驳回截图，看清后再改。
- 用户要求按审核标准检查时，已读取 `audit-compliance.md` 并按用户指定的范围核对。原因清楚后，先修反馈中的问题及同类问题；用户要求全面检查时，逐条核对并修复命中项。
- 已初始化或补装 `opencard/`；兴趣卡 UI 在 `opencard/src/`，未误写主应用 `src/`。
- 已重新读取并核对 `config/card-routing.json`、构建产物中的 `isClosedDomain`、`cardData.routes` 与实际 CardData 接口目录；封闭域使用 `closed-domain-server/`，开放域使用 `server/`，均使用 `feed/custom-card-schema.json`。
- 改动兴趣卡 UI 时：底板（`.widget-root` 半透明圆角面板，非透明、1px 边、四角 12px）与 Lynx CSS 机械禁写由 opencard `pnpm lint` 覆盖；`CardBackgroundUrl` 已按四步写入 `feed-card.json`（不是一次生图 9:16）；`BgMusicUrl` 必填且**只配在 `feed-card.json`**（宿主播放），禁止在卡代码里自实现背景音；默认先读 `bgm-pe.md` 并按卡片内容调 `mm_tool_music_*` 生成（`is_instrumental: true`，必传 `name` 短中文曲名，prompt 不写无人声）；只有用户明确要曲库/默认音乐或生成失败才按 `summary`/`tags` 匹配曲库兜底，禁止省略或空串；300/436 档核心内容可读，Body 按内容类型伸缩或留白，不以滚动兜底。
- 改动兴趣卡页面/组件/TSX 时：保留模板唯一 Actual FMP 标记并挂在 Body，不在条件分支或业务组件新增标记；不重复宿主业务标题或无明确需求的宿主落地页入口；若明确要求卡内入口，确认目标真实存在且 handler 与反馈可用；已通过 `pnpm --dir opencard lint`。
- 答题卡已检查默认、长内容、解析和结果态，无重叠、无裁边；解析态按 `DESIGN.md` 替换或精简选项。
- 兴趣卡涉及服务端时：已按 `card-data-model.md` 完成类型、`/api/dy_card/data`、`resolveCardData()`。
- 命中 Canvas 时：已按 `canvas-2d.md` 完成初始化。
- 命中 Three.js / Canvas 3D 时：只使用 `@open-dy/threejs`；Canvas V2 WebGL、API 注入和生命周期释放已按 `canvas-3d.md` 完成；`<Canvas type="webgl">` 首帧常驻，不在 loading / 数据 / 错误态分支内；兴趣卡 Canvas 未绑定 touch / pointer 事件；真实模型与纹理由用户提供，没有生成或伪造资源。
- 兴趣卡落地页与兴趣卡主题/调性按 `DESIGN.md` 一致；跳转路径存在于本次落地页工程。
- 可运行产物中的可操作控件均有实际行为和可见反馈；操作、状态、数据与结果前后一致；原型交付符合用户明确表达的模式。
- 本轮首次产出实际内容或明确补齐/修改资料时，已读取基础信息；需写入时，已用非空 `MicroAppInfo` 增量保存，并以同 AppID 回读逐项确认本次写入字段，无待写字段才跳过 save。空参、仅生成图标、代码校验或 `done` 成功都不算资料保存成功。本次待写的搜索别名/搜索标签已逐项按 `^[\u4e00-\u9fff]{2,10}$` 自检（细则见 `microapp.md`）。仅讨论需求或只续改业务且资料已确认齐全时，不因本检查重复读写资料；隐私协议按本轮生产或 JSAPI 规则处理，单纯补资料不触发额外隐私配置。
- 非纯文案替换已执行或说明未执行的 `pnpm verify`；复杂需求还需按封闭域状态门禁执行，若 verify 报告开放域 `server/src` 调用封闭域高敏 OpenAPI，或前端静态请求在所选服务域缺少路由，必须修正后再交付，不得把失败降级为告警；跳过条件见编排 prompt。

## 环境变量

- `APP_ID`：落地页 / 小程序身份 AppID；涉及 `app.config.ts`、开放平台身份时优先复用。
- 前端优先复用已有环境变量及构建配置注入的常量；不得仅为改名或访问方便创建派生变量，也不得读取未被构建配置明确映射的 `process.env.*`。确需新增时，先确认来源，并闭环配置构建注入、类型声明和代码消费。
- `APP_ENV`：`DEV` / `PROD`。
- `APP_ID_SECRET`：AppID 秘钥，用于身份或用户授权凭证。
- `OPEN_CARD_ID`：兴趣卡外壳 `CardAppID` 取值来源。

