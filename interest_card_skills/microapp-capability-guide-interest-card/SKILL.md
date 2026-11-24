---
name: microapp-capability-guide-interest-card
description: 当创中兴趣卡及其小程序落地页需要查找、选择并正确调用客户端 API、组件或服务端 OpenAPI 时使用；按中文需求和运行位置检索外场能力索引，再读取单个能力的调用说明、Taro 示例、授权前置条件和验证方式。
---

# 创中兴趣卡能力使用指南

本 Skill 只提供外场创中兴趣卡落地页和创中 OpenCard 卡片所需的能力资料。先确定运行场景，再检索该场景的原子能力与组合 Flow。

## 路径约定

- 先解析本文件的绝对路径，并把所在目录记为 `SKILL_DIR`。
- 所有索引和详情路径都基于 `SKILL_DIR` 解析。
- 原始索引记录中的 `detail` 相对该索引文件所在目录解析；检索脚本返回的 `detail` 已解析为绝对路径，直接读取，不再拼接 `SKILL_DIR`、能力名或文件名。

## 场景与入口

| 场景 | 能力类型 | 检索入口 |
| --- | --- | --- |
| 兴趣卡小程序落地页 | 客户端 API | `${SKILL_DIR}/references/microapp/api/capability-index.json` |
| 兴趣卡小程序落地页 | 组件 | `${SKILL_DIR}/references/microapp/component/capability-index.json` |
| 兴趣卡小程序落地页（外场） | 服务端 OpenAPI | `${SKILL_DIR}/references/microapp/openapi/external/capability-index.json` |
| 兴趣卡小程序落地页 | Flow | `${SKILL_DIR}/references/microapp/flow-index.json` |
| OpenCard 兴趣卡卡片 | 客户端 API | `${SKILL_DIR}/references/opencard/api/capability-index.json` |
| OpenCard 兴趣卡卡片 | 组件 | `${SKILL_DIR}/references/opencard/component/capability-index.json` |
| OpenCard 兴趣卡卡片 | 组件公共规则 | `${SKILL_DIR}/references/opencard/component-guide.md` |
| OpenCard 兴趣卡卡片 | 服务端 OpenAPI | `${SKILL_DIR}/references/opencard/openapi/capability-index.json` |
| OpenCard 兴趣卡卡片 | Taro 运行时调用约束 | `${SKILL_DIR}/references/opencard/runtime.md` |
| OpenCard 兴趣卡卡片 | Flow | `${SKILL_DIR}/references/opencard/flow-index.json` |

兴趣卡小程序落地页使用 `microapp`；兴趣卡卡片使用 `opencard`，并以 OpenCard 子集作为支持范围。

## 使用流程

1. 根据目标代码运行位置确定 `microapp` 或 `opencard`。
2. 用中文需求同时检索 Flow 和该场景的原子能力：

   ```bash
   node "${SKILL_DIR}/scripts/search-capabilities.mjs" --scene microapp --query '获取用户近 7 日视频数据'
   ```

3. 命中 Flow 时，直接读取检索结果中 Flow 的绝对 `detail`；再按 `capability_ids` 和 `optional_capability_ids` 逐项检索并读取原子能力返回的绝对 `detail`。未命中 Flow 时直接读取原子能力的绝对 `detail`。不得根据能力名自行拼接文件路径。
4. OpenCard 客户端 API 还要先读 `${SKILL_DIR}/references/opencard/runtime.md`；OpenCard 组件还要先读 `${SKILL_DIR}/references/opencard/component-guide.md`，再读取命中组件的原子详情。
5. 按详情中的调用顺序、参数、前置条件和分支实现；服务端 OpenAPI 使用 `@open-dy/ai_coding_sdk/openapi`。
6. OpenAPI 的 `constraints.authorization_entry` 为 `tt.showDouyinOpenAuth` 且 `constraints.miniapp_auth.supported` 为 `true` 时，读取对应用户授权 Flow；`requires_user_auth` 为 `true` 但 `miniapp_auth.supported` 为 `false` 时，不生成小程序授权代码，按原子详情说明当前授权入口限制。
7. OpenAPI 的 `constraints.service_domain` 为 `closed` 时，读取 `${SKILL_DIR}/references/opencard/closed-domain-openapi.md`。
8. 成功和失败分支分别使用 `console.log`、`console.error` 输出真实结果；日志不得包含凭证或 token。

## 选择规则

- 用户信息先按用途选择：仅展示当前用户头像或昵称时使用 `open-data`；业务代码需要读取当前用户资料时使用 `tt.getUserProfile`；同时获取用户信息和手机号且小程序已开通白名单时使用 `button-getUserTotalInfo`。只有需求明确指向服务端、`open_id`、用户公开资料或主页/粉丝/评论等数据统计时才选择 OpenAPI，禁止仅因命中 `user_profile`、`ma.user.data` 等 scope 字样改走 OpenAPI。
- 优先按中文用途检索，再用能力名、参数、返回字段和限制缩小结果。
- 先按目标代码形态进入 `api`、`component` 或 `openapi` 目录，再检索该类型的索引。
- 一个原子能力详情只说明自身调用方式；组合流程通过能力 ID 引用多个原子能力，原子能力索引保持独立。
- 落地页 `microapp` 与卡片 `opencard` 分别维护自己的 Flow 索引和 Recipe；不要跨场景读取，也不要在原子索引中反向维护 Flow。
- 用户态 OpenAPI Flow 由 `constraints.authorization_entry` 和 `constraints.miniapp_auth.supported` 匹配；仍需读取具体 OpenAPI 原子详情中的 `miniapp_auth.scope` 与 `miniapp_auth.scene`。
- OpenAPI 使用当前索引和原子详情中的方法名；遇到 `parseVideoInfo`、`getIndustryMusic`、`getIndustryItem`、`getIndustryAuthor`、`getIndustryChallenge` 等旧名称时，重新检索对应的当前能力。
- OpenAPI 服务端调用失败时返回明确错误结构，前端展示错误并保留恢复路径。
- 首次检索未精确命中时，继续使用近义词和字段名检索；索引未收录时说明结果，并保留已检查的关键词和索引范围。

## 交付检查

- 场景选择正确：`microapp` 或 `opencard`。
- 能力类型选择正确：`api`、`component` 或 `openapi`。
- 已读取索引命中项对应的单能力详情。
- 多步需求已读取命中的 Flow recipe，并落实调用顺序、数据传递、分支、状态和清理。
- 代码使用详情中的 Taro 或服务端 SDK 调用方式。
- 已区分 OAuth scope 与小程序授权 scope；小程序授权只使用原子详情中的 `miniapp_auth.scope`，并落实封闭域、最低基础库等前置条件。
- 已通过编译或类型检查；可运行调用已通过控制台输出核对成功、失败或事件结果。

