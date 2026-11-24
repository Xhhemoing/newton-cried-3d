---
name: design-skill
description: 用于兴趣卡 / Feed 卡 / OpenCard 及其落地页的界面设计。从已收录的 Layout 与 Component 中选取参考，按业务内容完成适配，产出 DESIGN.md 供实现 skill 落地。
---

# Design Skill

负责视觉决策、Layout 分区与 Component 参考选择。实现代码、数据接入、Taro/Lynx 能力和运行验证由实现 skill 负责。`example.tsx` / `example.css` 是可运行的结构与视觉参考，不是稳定组件 API，也不是应原样复用的成品。

## 按需阅读

1. 明确 Surface：OpenCard / MicroApp / both；独立任务不默认双端，兴趣卡完整生产链路按调用要求使用 both。
2. 读 [system.md](references/system.md) 的共享 token 和字体角色。只有落地页时不读卡片目录。
3. 兴趣卡读 [widget.md](references/widget.md)，然后按任务从 [Layout](references/layout.md) 或 [Component](references/component.md) 选条目。
4. 只读选中条目的说明、example.tsx 和 example.css。Layout 负责整卡分区；Component 不带整卡壳层。参考其信息层级、空间关系和交互反馈，再按当前业务重组；不继承示例的完整 props、class 树或全部状态。除依赖项外，不加载其他参考。

优先从本 skill 已收录的 Layout / Component 获取参考；没有匹配项时按 widget 最小骨架扩展。匹配项也只提供起点：内容量、操作顺序或视觉主题不同时必须适配，不为了套示例增加无意义模块。

参考资产按 `assets/layout/<id>/`、`assets/component/<id>/` 组织，每个条目读取 `example.tsx` 与 `example.css`。共享壳层位于 `assets/shared/widget-shell.css`。

## 输出 DESIGN.md

兴趣卡 + 兴趣卡落地页：`/workspace/project/card-app/DESIGN.md`；Feed 卡 + 小程序：`/workspace/project/microapp/DESIGN.md`。

只保留涉及的 Surface。写明信息层级、各状态布局和相对参考的取舍，不把整份代码抄进设计稿。Taro 参考路径写成当前已读取文件的实际绝对路径，随后明确哪些结构保留、哪些删除或重组、颜色和尺寸如何适配。

```text
Surface: OpenCard | MicroApp | both
任务与核心交互：

OpenCard（涉及时）
Layout: Test/illustrated | Test/image | Trend | Vote | Random Flip Decision | Tarot | 无
Components: <所选 id>
分区：Header（默认无，若有写明独立语义）/ Body / Footer（默认无，若有写明动作归属）
Header 内 Tag：默认无；若有，写明不可由题目、说明或宿主标题替代的状态/操作限定
组件字段：必需字段、可选字段、文案/数量预算
变体与状态：默认、长内容、选中/结果、禁用翻页、Loading/Empty/Error；每态保留/替换内容与主操作
状态信息：当前任务、主要内容和操作、即时反馈、延后到后续状态或落地页的信息
空间组织：可选区域省略后的内容排布；有意留白或占位时说明用途
交互：区域 | 动作 | 可见反馈
最小槽高预算：正文与操作优先，图片如何收缩，超出如何减项
参考资产：每个选中条目的 example.tsx、example.css 实际路径
适配方案：保留的信息层级；删除或重组的结构；业务主题下的颜色、尺寸和状态变化
背景：按 widget.md 写入 feed-card.json（设计稿不写 URL）

MicroApp（涉及时）
风格、页面结构、色彩、字体角色、状态与导航
首屏背景关系：导航避让区、标题区与首屏内容是否属于同一视觉面；若分区，说明目的和过渡
与兴趣卡共享的主题和组件：
```

壳层已在模板 index.css，token 已在 app.css；不重复输出。参考 CSS 的文字单位已经转换为 px，布局仍使用 vh/vw；不要再次换算。保留根壳层约束，业务内容的 DOM、class 和样式应按 `适配方案` 实现。

## 交付检查

兴趣卡检查：底板与背景齐全、至少一个真实交互、300/436 槽高核心可读、无重叠和裁边。允许自然留白，默认避免无用途占位或将相关内容拉散；尊重用户明确指定的视觉节奏。逐一检查默认、长内容、选择、解析、结果；答题解析态明确是否保留选项，放不下先替换或删减，不能硬塞。检查卡内未重复宿主标题、类型 Tag 和同语义落地页入口。实现 skill 在实际运行中验证，设计稿不能把未运行的检查写成已通过。

