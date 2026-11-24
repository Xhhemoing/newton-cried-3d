# 《筷子有反骨》

点锅下筷，三筷内揭晓反骨锅的输赢。应用目录为 `E:\Project\抖音大赛\apps\rebel-chopsticks\`。

## 本地预览

双击 [index.html](./index.html) 默认进入全屏落地页。也可以在浏览器地址栏打开以下本地地址。

- 推荐流兴趣卡 — `file:///E:/Project/抖音大赛/apps/rebel-chopsticks/index.html?surface=card`。卡内可独立结算；点「🍱 进全锅工坊」会带着当前关卡和食材打开设局抽屉。
- 全屏落地页 — `file:///E:/Project/抖音大赛/apps/rebel-chopsticks/index.html?surface=page`。四种玩法全部开放，好友整蛊链接直接进入对应的锅。

「✨ 鬼才配锅」只提交食材、机关、时机和印章四个枚举值。无宿主 AI、超时或返回组合无效时，使用本地组合，并在选中图标前完成物理可解性验算。便当上的「↺」需在 1.8 秒内再次点按才会清空存档。

## 测试与打包

在 PowerShell 7 中从项目根目录运行。

```powershell
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'E:\Project\抖音大赛'
node --test 'E:\Project\抖音大赛\apps\rebel-chopsticks\engine.test.cjs'
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run build:workshop
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

生成的 `dist/rebel-chopsticks/card.workshop.html` 与 `landing.workshop.html` 分别用于卡片和落地页预览，桥接层、引擎与渲染器均已内联。

## 四大社交与长效玩法导览

1. **🌶️ 反骨锅（7 日连载因果解谜 + 👻 幽灵筷影陪玩）**：包含夺筷、面条护蛋、香菜破盾、真假分身、打滑漂移、爆辣破盾、满汉双联动 7 关，触发翻车自动进入 `0.4s` 慢动作镜头推进特写（Hit-Stop Zoom）。
2. **🎲 公平夹（日常干饭抽签）**：日式木盘真随机物理夹菜，顶栏支持单指戳掉今日不想吃的品类。
3. **⚔️ 双人抢（同屏聚餐破冰）**：上下半屏红蓝双筷同桌抢菜（先满 3 颗获胜，误夹小米辣麻痹 0.9 秒）。
4. **🎭 设局坑 & 🍱 活体便当合体**：点选四个图标槽位，或轻点「✨ 鬼才配锅」生成必可解整蛊局并支持 `🏓第 N 回` 私信反坑；夹获食材自动落入底部活体便当盒，凑齐配方自动合体进化（`✨金甲护蛋面` / `🔥喷火霸王翅` / `💎翡翠水晶饺`），存档严格小于 `2KB`。
