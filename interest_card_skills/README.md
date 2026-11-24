# 兴趣卡 Skill 包（外部开发精简版）

这份 Skill 包用于在 Claude Code、Codex、Cursor 等外部 AI 工具里开发抖音兴趣卡的核心作品，之后把代码带回抖音 AI 工坊完成接入和发布。它是平台内置兴趣卡 Skill 的精简版，只保留外部开发用得上的规范。

## 包含的 Skill

| 目录 | 作用 |
| --- | --- |
| `microapp-generate-interest-card` | 主流程规范：工程结构、数据协议、通用约束、交付前检查 |
| `design-skill` | 视觉设计规范，产出 `DESIGN.md` |
| `microapp-capability-guide-interest-card` | 平台能力（客户端 API、组件、OpenAPI）的检索与调用规则 |
| `microapp-optimize-interest-card` | 图片资源与性能规范 |
| `microapp-debug-pipeline` | 排障规范，含发布失败的常见代码问题 |

## 在外部工具里使用时的差异

以下几点与 Skill 正文不一致时，以本节为准。

1. **工程路径**：Skill 中的 `/workspace/project/card-app` 是平台沙盒路径。本地开发时，工程根是当前工作文件夹下的 `card-app/`。
2. **未随包提供的文件**：各 Skill 引用的 `references/`、`templates/`、`scripts/`、`sdk-docs/`、`init.sh` 没有随包提供（`microapp-debug-pipeline` 只带了部分 `references/`）。遇到要求读取这些文件的地方，按 `SKILL.md` 正文已写明的约束实现，并在交接说明里列出未能核对的规范；不要因为文件缺失而停止，也不要编造这些文件的内容。
3. **只能在平台完成的部分**：下列能力依赖抖音 AI 工坊的环境，本地不执行。代码里留好接入位置并用本地数据兜底，回到平台后由平台 AI 接入。
   - 平台工具：`microapp_*`、`mm_tool_music_*`、`init_douyin_cloud_mysql_*`、`transfer_file`、`ask_user_question`、`done`
   - 用户身份、客户端授权、服务端 OpenAPI、封闭域服务
   - AI 模型接入（正文中的 `ai-platform-llm-skill`）
   - 带 Feed 外壳的截图检查与封面制作（正文中的 `interest-card-browser`、`interest-card-cover`）
   - 图片转存、背景图与背景音乐、基础信息、隐私协议、域名白名单、发布
4. **不要臆造平台接口**：平台 API、组件和 OpenAPI 的方法名、参数以平台为准。本包没有提供的能力详情，不要凭名称猜测调用方式。
