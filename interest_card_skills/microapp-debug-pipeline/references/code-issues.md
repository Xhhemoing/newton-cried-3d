# 发布失败 · 代码工程问题

只在发布或部署失败、且用户消息命中下面签名时读。按签名跳到对应节，不要通读，不要重做产品。预览加载、开通失败和产品缺陷不读本文件。

**发布 / 部署错误以用户消息里的原文为准。** 开发者会把平台返回的错误自动贴进对话；部署错误不在 `dev.log` 里，不要去翻，也不要让用户再贴一遍。

本 skill 预期把这些代码问题修掉。对得上签名、改法唯一就按节修；**无法修改或没把握就停手**，询问用户拍板，或引导页面右上角 Oncall 联系平台客服。不要猜着改，也不要覆盖 `verify.mjs` 当排查。

改完先跑「修复后复检」表对应那一行，通过后再跑静态 verify，静态 verify 退出码为 0 才停手并请用户重新发布。不要声称平台侧已经成功。

静态 verify：新项目 `pnpm exec vibecoding verify --target taro --static-only`；旧项目 `pnpm verify`。不要跑项目里的 `pnpm verify` 当新项目复检，那个脚本是 `--auto-start --full`，会拉起端口、接口和浏览器。

**禁止：** 读 CLI / schema 全集、读 `runtime-errors.md`、跑 6 项接口验收、换 token。静态 verify 失败且输出命中**另一条**签名 → 换节修，不要和当前错误混成一条；失败在端口、浏览器、接口或 token 上 → 停手报告，不继续改。lint 扫到 `dist/` → 删该 `dist` 再跑，不改 eslint 配置。

## 先判断项目类型

在项目根读 `package.json` 的 `scripts.verify`：

- **新项目**：`verify` 是 `vibecoding verify ...`（含 `pnpm exec vibecoding` 等包装）。
- **旧项目**：`verify` 是 `node scripts/verify.mjs ...`、其它自定义入口，或没有 `verify`。

后文命令按下表替换，以 `package.json` 里实际存在的 script 为准；不存在的 script 不要硬跑，也不要为了复检往项目里补 script 或脚本。

| 用途 | 新项目 | 旧项目 |
| --- | --- | --- |
| 包体积 | 有 `check-package-size` 用 `pnpm check-package-size`；没有则同旧项目 | `npx tma project-size`，见 [包体积超限](#包体积超限) |
| 打包 | `bash scripts/pack.sh` | `pnpm build:pack` |
| Feed 卡片 | `pnpm validate-feed-card`，没有则 `node scripts/validate-feed-card.js` | `node scripts/validate-feed-card.js` |

## 签名路由

| 日志 / 报错 | 读哪一节 |
| --- | --- |
| 总包超过 16 MB、`check-package-size` FAIL、`tma project-size` | [包体积超限](#包体积超限) |
| `Failed to compile`、`exit_code=1/-1`、`BizStatusCode 51011`、`TS2347` / `TS2322`、`require(...) is not a function` | [编译与打包](#编译与打包) |
| `page_url can not start with '/'`、PageIndex / PageURL 以 `/` 开头 | [PageIndex 前置斜杠](#pageindex-前置斜杠) |
| `Duplicate column name`、errno `1060` | [SQL：重复字段](#sql重复字段) |
| `Data too long for column` | [SQL：字段超长](#sql字段超长) |
| `Unknown database` | [SQL：未建库](#sql未建库) |
| `Cannot find module`、`MODULE_NOT_FOUND`（server 运行时） | [server 缺少依赖](#server-缺少依赖) |
| Docker `COPY` 失败、`lstat … no such file`、`COPY ./public` | [COPY 源文件缺失](#copy-源文件缺失) |
| 服务 `exit 1` 且用户消息没有更细栈 | [无法修改或不确定](#无法修改或不确定) |

## 包体积超限

**识别：** `pnpm check-package-size` 失败；或日志写总包 > 16MB。必须针对 **tt 产物**（落地页 `dist-tt`、兴趣卡 `opencard/dist`；独立 OpenCard 工程为 `dist`），不要对源码根跑 `tma project-size`。

**测量：** 产物须已存在（目录内有 `app.json`）；没有则先 `pnpm build:tt`，有兴趣卡再 `pnpm --dir opencard run build:pack`。

- 新项目且有 `check-package-size`：项目根执行 `pnpm check-package-size`，超限 exit 非 0 并指出是哪个产物。
- 旧项目或没有 `check-package-size`：对每个存在的产物目录分别执行

  ```bash
  npx -y -p tt-ide-cli@0.1.34 tma project-size --json dist-tt
  npx -y -p tt-ide-cli@0.1.34 tma project-size --json opencard/dist
  ```

  输出形如 `{"main":{...,"size":2997535},"sub":[],"total":2997535}`。**`tma` 超限也 exit 0**，必须自己读 `total`：`total > 16777216`（16MB）即超限。报 `Bad Project Type` 说明对的不是 tt 产物目录。npm 报 `EACCES`（`~/.npm` 属 root）时先 `export npm_config_cache=/workspace/tmp/npm-cache` 再重跑。

**做：**

1. 按上面的测量方式确认是落地页还是兴趣卡超限。
2. 在对应产物里找大图 / 音频 / 视频 / 字体（不要猜业务逻辑）。
3. 静态资源改成 CDN URL，**不要内联进包**：
   - 生图 / 远端签名图已经是 CDN（含 `x-expires`、`x-signature`）→ 源码直接引用，禁止下载到 `src/` 或 `opencard/src/`。
   - 本地大文件 → 用平台转存 / 上传工具（如 `transfer_file`）拿到 https URL，替换本地 `import` / 相对路径。
   - 背景音只写在 `feed/feed-card.json` 的 `BgMusicUrl`，不要打进卡片包。
4. 删掉包内不再引用的静态文件后重新构建（`pnpm build:tt`，有兴趣卡再 `pnpm --dir opencard run build:pack`），再按同一测量方式复测。

**不做：** 改 `pack.sh` / `build-pack.sh` 抬限额；把大资源藏进 server 镜像冒充已修；为过检删业务页面。找不到明显大文件、或删减会改产品时，走 [无法修改或不确定](#无法修改或不确定)。

## 编译与打包

**识别：** 用户贴的发布错误，或本地 lint / `pnpm build` / `pnpm build:tt` / Taro 打包失败；`51011`；TS 类型错误；`require(...) is not a function`。

**做：**

1. 用用户消息或失败命令的**原文**定位文件和行，只改报错点。不要搜 CLI 源码，不要去 `dev.log` 里补日志。
2. 一次修完**当前这条命令输出**里的全部同类错误，再跑同一条失败命令，或表里的 `pnpm lint` + `pnpm build`。
3. `51011` / `exit_code=1` 若用户消息里没有代码位置：走 [无法修改或不确定](#无法修改或不确定)，不要翻 `dev.log` 猜部署失败原因。
4. Taro `require is not a function`：查打包期执行到的用户模块（错误的 CJS/ESM 互调、把 Node 包打进小程序）。改业务引用，不要改 Taro 插件。

**不做：** 重写页面或产品需求；为过类型检查改成 `any` 并关掉 lint；先覆盖 `verify.mjs`。原文仍无文件/行，或修完一轮没有新线索，走 [无法修改或不确定](#无法修改或不确定)。

## PageIndex 前置斜杠

**识别：** `page_url can not start with '/'`；`feed/feed-card.json` 里 `ContentInfoList[].PageIndex` 或 `PageURL` 的落地 path 以 `/` 开头。

**做：**

1. 直接打开 `feed/feed-card.json`，去掉 `PageIndex` 的前导 `/`（例如 `/pages/index/index` → `pages/index/index`）。不要先搜 CLI 或 schema。
2. `PageURL` 里的落地 path / query 同样不能以 `/` 开头；改完如需签名则按项目既有规则重签，不要手改无关字段。
3. `PageIndex` 必须能对上落地页 `app.config` 已注册页面。
4. 跑 Feed 卡片校验（见 [先判断项目类型](#先判断项目类型)）。

**不做：** 把 path 改成 `http://`；删掉 `ContentInfoList` 来绕过 schema。`PageIndex` 对不上已注册页、或重签规则不清楚时，询问用户或 Oncall。

## SQL：重复字段

**识别：** `Duplicate column name`，errno `1060`。新模板 `init-mysql-db.js` 已对 `1060` 等幂等 DDL skip。

**做：**

1. 先看 `server/scripts/init-mysql-db.js` 是否已有 benign skip（`1007/1050/1060/1061/1091/1826`）。有则重复跑迁库即可，不要改业务 SQL 绕过。
2. 存量脚本没有 skip：把 `ALTER TABLE ... ADD COLUMN` 改成可重复执行（先判断列存在，或对齐模板 skip），不要在运行时吞掉所有 SQL 错误。
3. 修完执行 `pnpm init-mysql-db`。

**不做：** 硬编码 `MYSQL_*`；持续 `connect ETIMEDOUT` 仍按 SKILL 开通/欠费处理。分不清该 skip 还是改表结构时，询问用户。

## SQL：字段超长

**识别：** `Data too long for column '…'`。

**做：** 加宽该列（并保持迁库幂等），或缩短 seed / 写入值（常见是 `avatar_url` 写成了超长 data URL）。优先改数据来源为 CDN URL，不要把 Base64 图写进 VARCHAR。

**不做：** 把全部 SQL 错误改成 catch 后忽略。加宽列还是截断数据会影响产品时，询问用户。

## SQL：未建库

**识别：** `Unknown database '…'`。

**做：** 迁库前 `CREATE DATABASE IF NOT EXISTS \`<库名>\` CHARACTER SET utf8mb4 …`（新模板已有）。库名用项目既有配置，不要新建无关库。

**不做：** 改连到别的环境库，或 invent 连接串。库名在配置里对不上时，询问用户或 Oncall。

## server 缺少依赖

**识别：** server 启动或发布镜像里 `Cannot find module '…'`、`MODULE_NOT_FOUND`。典型是 `sharp` 这类包写进了代码，但没进 **server 生产 dependencies**。镜像执行的是 `npm install --production`，`devDependencies` 不会装上。

**排查：**

1. 从日志取出缺失模块名。
2. 搜谁 `import` / `require` 了它：只认 `server/src`（或 server 打包进 `dist` 的代码）。前端 / `opencard/` 报缺模块走 [编译与打包](#编译与打包)，不要往 server 里塞小程序依赖。
3. 打开 `server/package.json`：
   - 不在 `dependencies` 也不在 `devDependencies` → 没声明
   - 只在 `devDependencies` → 本地 dev 能起、发布镜像起不来
   - 写在仓库根或前端 `package.json` → server 镜像看不到
4. 确认业务运行时是否真的需要它。无引用是误报或残留 import。

**做：**

1. 运行时需要：把包装进 **`server/package.json` 的 `dependencies`**（不要只写 `devDependencies`）。可用 `pnpm --filter server add <pkg>`，再确认 lockfile。
2. 不需要：删掉 server 代码里的 import，不要为过检装包。
3. `sharp` 等 native 模块只放 server，不要装进落地页或 `opencard/`。
4. 修完跑 `pnpm --filter server build`。

**不做：** 把生产依赖写进根目录 / 前端；在 Dockerfile 里手写 `npm install <pkg>` 绕过 package.json；不确定缺的是哪个包、或像平台镜像能力时，走 [无法修改或不确定](#无法修改或不确定)。

## COPY 源文件缺失

**识别：** 镜像构建 `COPY …` 失败，如 `COPY ./public ./public`、`lstat /public: no such file or directory`。构建上下文里没有 Dockerfile 要拷的路径。

**排查：**

1. 打开 `server/Dockerfile`，列出所有 `COPY` 行（含 `pack.sh` 打包时按目录是否存在动态插入的 `COPY ./scripts`、`COPY ./sql`）。
2. 对照 `server/` 实际目录：`dist`、`package.json`、`run.sh` 是必带；`sql` / `scripts` / `public` 等只有存在才应被 COPY。
3. 看失败的那条 COPY 指向的是业务资源，还是已经删掉的空目录。

**做：**

1. 业务不再需要该目录：删掉 Dockerfile 里对应 `COPY`（不要留 `COPY ./public ./public`）。`pack.sh` 只在目录存在时才插入 `scripts`/`sql` 的 COPY，不要反向改 pack 去强行拷不存在的路径。
2. 业务需要：把目录或文件补进 `server/`，保证 `pnpm build:server` / 打包前真实存在，再构建。
3. 修完重新打包：新项目 `bash scripts/pack.sh`，旧项目 `pnpm build:pack`。

**不做：** 为过构建造空 `public/` 充数；改基础镜像或 apk 源；把前端 `dist` 误 COPY 进 server。分不清该删 COPY 还是该补文件时，询问用户。

## 修复后复检

每类问题修完立刻跑对应命令。命令失败且还有文件/行 → 按签名再修；同一命令仍是原错误且没有新线索 → [无法修改或不确定](#无法修改或不确定)。表内通过后还必须跑文首的静态 verify，退出码为 0 才停手。

| 修的是 | 新项目复检（项目根） | 旧项目复检（项目根） | 通过标准 |
| --- | --- | --- | --- |
| 包体积超限 | `pnpm check-package-size`；无该 script 同旧项目 | 对 `dist-tt`、`opencard/dist`（若有）各跑 `npx … tma project-size --json` | 新项目 exit 0；`tma` 输出的 `total` 均 `<= 16777216` |
| 编译与打包 | `pnpm lint` 且 `pnpm build`（tt 产物问题再加 `pnpm build:tt`） | 同左 | 用户原文里的 TS / Taro / `51011` 同类错误不再出现 |
| PageIndex 前置斜杠 | `pnpm validate-feed-card`，无则 `node scripts/validate-feed-card.js` | `node scripts/validate-feed-card.js` | 校验通过；`PageIndex` / `PageURL` 均不以 `/` 开头 |
| SQL 重复字段 / 超长 / 未建库 | `pnpm init-mysql-db` | 同左 | 不再出现 `Duplicate column` / `Data too long` / `Unknown database`（`ETIMEDOUT` 仍走开通） |
| server 缺少依赖 | `pnpm --filter server build` | 同左 | 不再 `Cannot find module`；缺失包装在 `server/package.json` 的 `dependencies` |
| COPY 源文件缺失 | 核对 `server/Dockerfile` 每条 `COPY` 源路径存在，再 `bash scripts/pack.sh` | 同样核对，再 `pnpm build:pack` | 不再 `lstat … no such file`；没有为过检造空目录 |

包体积先按表测量，COPY 必须跑打包命令。这两项都不能只用静态 verify 代替。静态 verify 通过后告诉用户可以再点一次发布。新的平台错误以用户下一条消息为准，不要去 `dev.log` 里找。

## 无法修改或不确定

用户已贴的部署错误对不上各节、缺少文件/行、改法会改产品，或同一命令修完仍是原错误且没有新线索时，停止猜改。需要业务选择时询问用户；平台能力或工具链阻塞引导右上角 Oncall，并附原始错误。不要去 `dev.log` 里找部署错误，也不要自行发明下一步。
