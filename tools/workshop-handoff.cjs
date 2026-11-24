'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('node:util');
const { deflateRawSync } = require('node:zlib');

const APP = 'card-app';
const PLATFORM_ROOT = '/workspace/project/card-app';
const DESIGN = 'DESIGN.md';
const FEED = 'feed/feed-card.json';
const SCHEMA = 'feed/custom-card-schema.json';
const ROUTING = 'config/card-routing.json';
const SKILLS = [
  'interest_card_skills/microapp-generate-interest-card/SKILL.md',
  'interest_card_skills/design-skill/SKILL.md',
];
const SOURCES = ['opencard/src', 'src', 'server/src', 'closed-domain-server/src'];
const ASSET_LIMIT = 5 * 1024 * 1024;
const SCRIPT = /\.(?:[cm]?[jt]s|[jt]sx)$/i;
const STYLE = /\.(?:css|less|scss)$/i;
const IMAGE = /\.(?:avif|bmp|gif|heic|ico|jpe?g|png|svg|webp)$/i;
const MEDIA = /\.(?:aac|glb|gltf|m4a|mp3|mp4|ogg|otf|ttf|wav|webm|woff2?)$/i;
const ASSET_DIRECTORIES = new Set(['assets', 'public', 'static']);
const DENIED_DIRECTORIES = new Set(['node_modules', 'dist', 'dist-tt', 'scripts']);
const DENIED_FILES = /^(?:package\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock|tsconfig[^/]*\.json|dockerfile(?:\..*)?)$|\.(?:pem|key)$/i;

const BANNED = /\u5634\u66ff\u63a5\u7ebf\u5458|\u8fd9\u53e5\u600e\u4e48\u56de|\u793e\u6050\u5634\u66ff|\u53cd\u753b\u997c\u5634\u66ff/u;
const LYNX_STYLES = [
  [/@media\b/i, 'Lynx 兴趣卡禁用 @media'],
  [/\boverflow-y\s*:\s*(?:scroll|auto)\b/i, 'Lynx 兴趣卡禁用 overflow-y: scroll/auto'],
];
const LYNX_SCRIPTS = [
  [/<ScrollView\b(?:=>|"[^"]*"|'[^']*'|\x60[^\x60]*\x60|[^>"'\x60])*?\s+scrollY\b/, 'Lynx 兴趣卡禁用 ScrollView scrollY'],
  [/@open-dy\/lucide-taro\b/, 'Lynx 兴趣卡禁用 @open-dy/lucide-taro'],
  [/\bcreateInnerAudioContext\b/, 'Lynx 兴趣卡禁用自建音频 createInnerAudioContext'],
  [/\bgetBackgroundAudioManager\b/, 'Lynx 兴趣卡禁用自建音频 getBackgroundAudioManager'],
  [/<audio\b/i, 'Lynx 兴趣卡禁用自建音频 <audio>'],
];
const FRONTEND = [
  [/\blucide-react\b/, '抖音小程序禁用 lucide-react'],
  [/\bENV_TYPE\s*\.\s*WEB\b/, '禁止 H5 分支 ENV_TYPE.WEB'],
  [/\bTaro\s*\.\s*getEnv\s*\(\s*\)\s*===\s*WEB\b/, '禁止 H5 分支 Taro.getEnv() === WEB'],
  [/\bdocument\s*\.\s*getElementById\b/, '禁止浏览器 DOM document.getElementById'],
  [/\bwindow\s*\.\s*localStorage\b/, '禁止浏览器存储 window.localStorage'],
  [/<input\b/i, '禁止软键盘控件 <Input>/<input>'],
  [/<textarea\b/i, '禁止软键盘控件 <Textarea>/<textarea>'],
  [/\bcontenteditable\b/i, '禁止 contenteditable 输入'],
  [/<slider\b/i, '禁止横滑条 <Slider>'],
  [/\btype\s*=\s*(?:\{\s*)?["']?range\b/i, '禁止横滑条 type=range'],
];
const SERVER = [
  [/\blocalhost\b/i, '禁止硬编码 localhost'],
  [/-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----|\b(?:private[_-]?key)["']?\s*[:=]\s*(?:["'][^"'\r\n]+["']|\x60[^\x60\r\n]+\x60)/i, '禁止硬编码私钥'],
  [/\b(?:(?:db|database|mysql|postgres)[_-]?)?(?:password|passwd|pwd)["']?\s*[:=]\s*(?:["'][^"'\r\n]+["']|\x60[^\x60\r\n]+\x60)/i, '禁止硬编码数据库密码'],
  [/\bprocess\s*\.\s*env\s*\.\s*(?:db|database|mysql|postgres)[_-]?(?:password|passwd|pwd)\s*(?:\|\||\?\?)\s*(?:["'][^"'\r\n]+["']|\x60[^\x60\r\n]+\x60)/i, '禁止在环境变量回退中硬编码数据库密码'],
  [/\b(?:mysql|mariadb|postgres(?:ql)?|mongodb(?:\+srv)?|redis(?:s)?):\/\/[^:\s"'@]+:[^@\s"']+@/i, '禁止在数据库连接串中硬编码凭据'],
];

function stat(target) {
  return fs.lstatSync(target, { throwIfNoEntry: false });
}

function findPath(root, relative) {
  let target = root;
  let info;
  for (const segment of relative.split('/')) {
    if (info && !info.isDirectory()) return undefined;
    target = path.join(target, segment);
    info = stat(target);
    if (!info || info.isSymbolicLink()) return undefined;
  }
  return info;
}

function* walkFiles(directory, prefix = '') {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name, 'en'));
  for (const entry of entries) {
    const filename = prefix + entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walkFiles(absolute, filename + '/');
    if (entry.isFile()) yield { filename, absolute };
  }
}

function stripComments(source, filename, onComment) {
  // Keep literals (including URLs) intact and preserve offsets for diagnostics.
  const stringsAndBlocks = /"(?:\\[\s\S]|[^"\\\r\n])*"|'(?:\\[\s\S]|[^'\\\r\n])*'|\x60(?:\\[\s\S]|[^\x60\\])*\x60|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/;
  const lineComments = /\.(?:css|html?|wxml|ttml|json|md)$/i.test(filename)
    ? ''
    : '|(?<!:)\\/\\/[^\\r\\n]*';
  return source.replace(new RegExp(stringsAndBlocks.source + lineComments, 'g'), (token, offset) => {
    if (/^\/[/*]|^<!--/.test(token)) {
      onComment?.(token, offset);
      return token.replace(/[^\r\n]/g, ' ');
    }
    return token;
  });
}

function lineAt(source, index) {
  return source.slice(0, index).split(/\r\n|\r|\n/).length;
}

function collectIssues(issues, filename, source, rules) {
  for (const [pattern, reason] of rules) {
    const match = pattern.exec(source);
    if (match) issues.push(APP + '/' + filename + ':' + lineAt(source, match.index) + ' ' + reason);
  }
}

function parseJson(source) {
  return JSON.parse(source.replace(/^\uFEFF/, ''));
}

function schemaFields(source) {
  let schema;
  try {
    schema = parseJson(source);
  } catch {
    return [];
  }
  const required = Array.isArray(schema?.required) ? schema.required.filter((key) => typeof key === 'string') : [];
  if (required.length) return required;
  const properties = schema?.properties;
  return properties && typeof properties === 'object' && !Array.isArray(properties) ? Object.keys(properties) : [];
}

// Match only the binding clause of a declaration, so a multiline import cannot
// consume an unrelated statement. Skip literal text between declarations.
const bindings = /(?:type\s+)?(?:[$\p{ID_Continue}]+\s*,\s*)?(?:\{[^{};]*\}|\*(?:\s+as\s+[$\p{ID_Continue}]+)?|[$\p{ID_Continue}]+)\s*from\s*/u;
const quoted = /"(?:\\[\s\S]|[^"\\\r\n])*"|'(?:\\[\s\S]|[^'\\\r\n])*'/;
const moduleSyntax = new RegExp([
  /(?<!\.)\.\s*(?:require|import|export)\b/.source,
  '(?<![$\\p{ID_Continue}])(?:import|require)\\s*\\(\\s*(' + quoted.source + ')(?=\\s*[,\\)])',
  '(?<![$\\p{ID_Continue}])(?:import|export)(?![$\\p{ID_Continue}])\\s*(?:' + bindings.source + ')?(' + quoted.source + ')',
  quoted.source,
  /\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|[\x60{}]/.source,
].join('|'), 'gu');

function* moduleReferences(code) {
  const tokens = new RegExp(moduleSyntax);
  const templatePart = /(?:\\[\s\S]|[^\\\x60$]|\$(?!\{))*(\$\{|\x60|$)/y;
  const expressionDepths = [];
  let match;
  while ((match = tokens.exec(code))) {
    const literal = match[1] ?? match[2];
    if (literal) yield { specifier: literal.slice(1, -1), offset: match.index };
    const token = match[0];
    const depth = expressionDepths.length - 1;
    if (depth >= 0 && token === '{') expressionDepths[depth]++;
    if (depth >= 0 && token === '}' && --expressionDepths[depth] === 0) {
      expressionDepths.pop();
    } else if (token !== '\x60') {
      continue;
    }
    // Resume scanning code only inside an interpolation or beyond the closing backtick.
    templatePart.lastIndex = tokens.lastIndex;
    const part = templatePart.exec(code);
    if (!part || !part[1]) break;
    if (part[1] === '${') expressionDepths.push(1);
    tokens.lastIndex = templatePart.lastIndex;
  }
}

function checkRelativeImports(issues, filename, code, appRoot) {
  const owner = sourceDirectory(filename);
  for (const { specifier, offset } of moduleReferences(code)) {
    if (!/^\.\.?(?:\/|$)/.test(specifier)) continue;
    const local = specifier.split(/[?#]/, 1)[0];
    const target = path.posix.join(path.posix.dirname(filename), local);
    if (target === owner || target.startsWith(owner + '/')) continue;
    if (path.posix.extname(local) && !SCRIPT.test(local)) {
      // TypeScript commonly resolves dotted module names such as "dy-card.service" to .ts.
      if (IMAGE.test(local) || MEDIA.test(local) || STYLE.test(local) || target.startsWith('../')) continue;
      if (!['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs'].some((ext) =>
        findPath(appRoot, target + ext)?.isFile())) continue;
    }
    issues.push(APP + '/' + filename + ':' + lineAt(code, offset) + ' 禁止跨子工程相对导入 ' +
      specifier + '（请使用当前子包内模块）');
  }
}

function syncShared(root) {
  const appRoot = path.join(root, APP);
  if (!findPath(root, APP + '/src/shared')?.isDirectory()) return;
  const targets = ['opencard/src', 'server/src'].filter((owner) => findPath(appRoot, owner)?.isDirectory());
  for (const { filename, absolute } of walkFiles(path.join(appRoot, 'src/shared'))) {
    for (const owner of targets) {
      let directory = path.join(appRoot, owner);
      for (const segment of ['shared', ...filename.split('/').slice(0, -1)]) {
        directory = path.join(directory, segment);
        const info = stat(directory);
        if (!info) fs.mkdirSync(directory, { recursive: true });
        else if (!info.isDirectory()) throw new Error('同步目标必须是实际目录：' + directory);
      }
      const destination = path.join(directory, path.basename(filename));
      const info = stat(destination);
      if (info && !info.isFile()) throw new Error('同步目标必须是普通文件：' + destination);
      if (info && fs.readFileSync(absolute).equals(fs.readFileSync(destination))) continue;
      const stage = fs.mkdtempSync(path.join(directory, '.sync-'));
      const staged = path.join(stage, 'copy');
      try {
        fs.copyFileSync(absolute, staged);
        fs.renameSync(staged, destination);
      } finally {
        fs.rmSync(staged, { force: true });
        fs.rmdirSync(stage);
      }
    }
  }
}

function checkFeed(source, issues) {
  let feed;
  try {
    feed = parseJson(source);
  } catch {
    issues.push(APP + '/' + FEED + ' 不是有效的 JSON');
    return undefined;
  }
  if (!feed || typeof feed !== 'object' || Array.isArray(feed)) {
    issues.push(APP + '/' + FEED + ' 必须是 JSON 对象');
    return undefined;
  }
  if (Object.hasOwn(feed, 'ContentInfoList') && !Array.isArray(feed.ContentInfoList)) {
    issues.push(APP + '/' + FEED + ' ContentInfoList 必须是数组');
    return undefined;
  }
  for (const [index, item] of (feed.ContentInfoList ?? []).entries()) {
    for (const field of ['PageIndex', 'PageURL']) {
      const value = item?.[field];
      if (typeof value === 'string' && value.startsWith('/')) {
        issues.push(APP + '/' + FEED + ' ContentInfoList[' + index + '].' + field + " page_url can not start with '/'");
      }
    }
  }
  return feed;
}

function packageKind(filename) {
  const segments = filename.toLowerCase().split('/');
  if (segments[0] === 'feed' || segments[0] === 'config') return undefined;
  if (segments.some((segment) => segment.startsWith('.') || DENIED_DIRECTORIES.has(segment))) return undefined;
  if (DENIED_FILES.test(segments.at(-1))) return undefined;
  const appFiles = SOURCES.some((source) => filename.startsWith(source + '/'));
  const assetRoot = ['opencard', 'server', 'closed-domain-server'].includes(segments[0]) ? 1 : 0;
  if (appFiles && (IMAGE.test(filename) || MEDIA.test(filename))) return 'asset';
  if (ASSET_DIRECTORIES.has(segments[assetRoot])) return 'asset';
  if (appFiles && segments.slice(assetRoot + 1, -1).some((segment) => ASSET_DIRECTORIES.has(segment))) {
    return SCRIPT.test(filename) || STYLE.test(filename) ? 'business' : 'asset';
  }
  if (appFiles || filename === DESIGN) return 'business';
  return undefined;
}

function checkWorkspace(root, preparePack) {
  const issues = [];
  for (const filename of SKILLS) {
    if (!findPath(root, filename)?.isFile()) issues.push(filename + ' 缺少 Skill 文件');
  }
  for (const directory of SOURCES.slice(0, 3)) {
    if (!findPath(root, APP + '/' + directory)?.isDirectory()) {
      issues.push(APP + '/' + directory + ' 缺少源码目录');
    }
  }
  if (!findPath(root, APP + '/' + DESIGN)?.isFile()) {
    issues.push(APP + '/' + DESIGN + ' 缺少设计文件');
  }

  const business = new Map();
  const assets = new Map();
  let feed;
  let fields = [];
  let routingText;
  const appRoot = path.join(root, APP);
  if (findPath(root, APP)?.isDirectory()) {
    for (const { filename, absolute } of walkFiles(appRoot)) {
      const contents = fs.readFileSync(absolute);
      const source = contents.toString('utf8');
      collectIssues(issues, filename, source, [[BANNED, '命中永久排除方案用词']]);
      if (filename === DESIGN && !/^[\uFEFF \t]*Surface:[ \t]*\S[^\r\n]*/m.test(source)) {
        issues.push(APP + '/' + DESIGN + ' 缺少 Surface: 声明');
      }
      if (filename === FEED) feed = checkFeed(source, issues);
      if (filename === SCHEMA) fields = schemaFields(source);
      if (filename === ROUTING) routingText = source;
      if (filename.startsWith('src/shared/')) {
        for (const owner of ['opencard', 'server', 'closed-domain-server']) {
          const mirror = owner + '/' + filename;
          if (findPath(appRoot, mirror)?.isFile() && !contents.equals(fs.readFileSync(path.join(appRoot, mirror)))) {
            issues.push(APP + '/' + mirror + ' 与 ' + filename + ' 内容不一致');
          }
        }
      }

      const isCard = filename.startsWith('opencard/src/');
      const isFrontend = isCard || filename.startsWith('src/');
      const isServer = filename.startsWith('server/src/') || filename.startsWith('closed-domain-server/src/');
      if ((isFrontend || isServer) && !source.includes('\0')) {
        const code = stripComments(source, filename);
        if (SCRIPT.test(filename)) checkRelativeImports(issues, filename, code, appRoot);
        if (isCard && STYLE.test(filename)) collectIssues(issues, filename, code, LYNX_STYLES);
        if (isCard && SCRIPT.test(filename)) collectIssues(issues, filename, code, LYNX_SCRIPTS);
        if (isFrontend) collectIssues(issues, filename, code, FRONTEND);
        if (isServer) collectIssues(issues, filename, code, SERVER);
      }

      if (preparePack) {
        const kind = packageKind(filename);
        if (kind === 'business') business.set(filename, contents);
        if (kind === 'asset') assets.set(filename, contents.length <= ASSET_LIMIT ? contents : null);
      }
    }
  }

  return { issues, business, assets, feed, fields, routingText };
}

function sourceDirectory(filename) {
  return SOURCES.find((directory) => filename.startsWith(directory + '/')) ?? 'src';
}

function resolveAsset(reference, filename, assets) {
  let local = reference.split(/[?#]/, 1)[0].trim();
  if (!local || /^(?:[\w+.-]+:|\/\/)/.test(local)) return undefined;
  try {
    local = decodeURIComponent(local);
  } catch {
    return undefined;
  }

  const directory = path.posix.dirname(filename);
  const owner = sourceDirectory(filename);
  let candidates;
  if (/^(?:@|~)\//.test(local)) {
    candidates = [owner + '/' + local.slice(2), local.slice(2)];
  } else if (local.startsWith('/')) {
    const relative = local.slice(1);
    candidates = [relative, 'public/' + relative, path.posix.dirname(owner) + '/public/' + relative];
  } else if (/^\.\.?\//.test(local)) {
    candidates = [directory + '/' + local];
  } else {
    candidates = [local, directory + '/' + local, owner + '/' + local, 'public/' + local];
  }
  return candidates.map((candidate) => path.posix.normalize(candidate)).find((candidate) => assets.has(candidate));
}

function addAssetReferences(source, filename, assets, referenced) {
  const tokens = /"((?:\\.|[^"\\\r\n])*)"|'((?:\\.|[^'\\\r\n])*)'|\x60([^\x60\r\n]*)\x60|(?:url\(|\]\()([^)]+)\)|([\p{L}\p{N}_@./%~-]+(?:\/[\p{L}\p{N}_@./%~-]+)+)/gu;
  for (const match of source.matchAll(tokens)) {
    const reference = match.slice(1).find((part) => part !== undefined);
    const asset = resolveAsset(reference.trim().replace(/^(['"])|(['"])$/g, ''), filename, assets);
    if (asset) referenced.add(asset);
  }
}

function describeInputs({ business, assets, feed, fields, routingText }) {
  const integration = [];
  const referenced = new Set();
  for (const [filename, contents] of business) {
    const source = contents.toString('utf8');
    if (source.includes('\0')) continue;
    const code = filename === DESIGN ? source : stripComments(source, filename, (comment, offset) => {
      const body = comment.replace(/\*\/$/, '');
      const marker = /^\/(?:\/|\*)\s*\[PLATFORM-INTEGRATION\b\s*[:：]?\s*([^\]]*)\]([\s\S]*)$/.exec(body);
      if (marker && SCRIPT.test(filename)) {
        const label = [marker[1], marker[2]].map((part) => part.trim()).filter(Boolean).join(' · ');
        integration.push({ filename, line: lineAt(source, offset + comment.indexOf('[')), label });
      }
    });
    addAssetReferences(code, filename, assets, referenced);
  }
  if (feed) {
    addAssetReferences(JSON.stringify(feed), FEED, assets, referenced);
  }

  const included = new Map(business);
  const largeAssets = [];
  for (const [filename, contents] of assets) {
    if (!referenced.has(filename)) continue;
    if (contents === null) largeAssets.push(filename);
    else included.set(filename, contents);
  }
  const design = business.get(DESIGN).toString('utf8');
  return { included, integration, largeAssets, design, feed, fields, routingText };
}

function serviceDomain(source) {
  if (!source) return '服务域未确认。读取工坊现有 config/card-routing.json 核对，保留已有路由。';
  let config;
  try {
    config = parseJson(source);
  } catch {
    return '服务域未确认。本地 config/card-routing.json 无法解析，请以工坊已有配置核对。';
  }
  const domain = config?.serviceDomain;
  if (domain !== 'open' && domain !== 'closed') return '服务域未确认。本地 config/card-routing.json 的 serviceDomain 未给出 open/closed，请核对工坊已有配置。';
  if (domain === 'open') return '开放域（open）。按现有路由将卡片数据与开放域业务接入 server/src。';
  return '封闭域（closed）。按现有路由将卡片数据接入 closed-domain-server/src，开放域业务保留在 server/src。';
}

const inline = (value) => '\x60' + value.replace(/\x60/g, '’') + '\x60';
const textValue = (value) => typeof value === 'string' && value.trim() ? value.trim().replace(/[\r\n]+/g, ' ') : '';

function gameplay(design, feed) {
  const lines = design.replace(/^\uFEFF/, '').split(/\r?\n/);
  const title = textValue(feed?.Title) || textValue(/^#[ \t]+(.+)$/m.exec(design)?.[1]);
  const index = lines.findIndex((line) => /^\s*(?:#{1,6}\s+)?(?:作品玩法简介|玩法简介|任务与核心交互)(?:\s*[:：]|$)/.test(line));
  const description = [];
  if (index !== -1) {
    const inlineDescription = lines[index].replace(/^.*?(?:作品玩法简介|玩法简介|任务与核心交互)\s*[:：]?\s*/, '');
    if (inlineDescription) description.push(inlineDescription);
    for (const line of lines.slice(index + 1)) {
      if (/^\s*(?:#|[^\s:：]{1,20}[：:]|```)/.test(line) || (description.length && !line.trim())) break;
      if (line.trim()) description.push(line.trim());
      if (description.length === 5) break;
    }
  }
  if (description.length) return [title ? '**' + title + '**' : '', ...description].filter(Boolean).join('\n\n');
  return (title ? '**' + title + '**。' : '') +
    '以 DESIGN.md 和随包代码中的实际玩法为准。兴趣卡用图形和轻触完成一次即时反馈，兴趣卡落地页承接完整交互。';
}

function integrationLines(integration) {
  return integration.length ? integration.map(({ filename, line, label }) =>
    '- ' + inline(filename + ':' + line) + (label ? ' ' + label : ' 核对该处本地 Mock 并接入对应平台能力。'),
  ) : ['- 交付代码没有 PLATFORM-INTEGRATION 标注。核对实际业务依赖，按需接入。'];
}

function assetLines(included, largeAssets) {
  const images = [...included.keys()].filter((filename) => IMAGE.test(filename)).sort();
  const largeImages = largeAssets.filter((filename) => IMAGE.test(filename));
  return [
    ...images.map((filename) => '- ' + inline(filename) + '，从临时解包目录调用 transfer_file 转存，替换对应引用。'),
    ...largeImages.map((filename) => '- ' + inline(filename) + '，超过 5 MB，需从原始素材另行转存。'),
    ...(!images.length && !largeImages.length ? ['- 本地业务引用中未检出待转存图片。'] : []),
    ...largeAssets.filter((filename) => !IMAGE.test(filename)).map((filename) =>
      '- ' + inline(filename) + '，超过 5 MB，需另行提供素材并替换引用。'),
  ];
}

function feedLines(feed, design, fields) {
  const title = textValue(feed?.Title) || textValue(feed?.ContentInfoList?.[0]?.Title);
  const designTitle = textValue(/^#[ \t]+(.+)$/m.exec(design)?.[1]);
  const background = textValue(feed?.CardBackgroundUrl);
  const music = textValue(feed?.BgMusicUrl);
  const button = textValue(feed?.Button);
  const lines = [
    '- 标题：' + (title || (designTitle ? '建议沿用作品标题「' + designTitle + '」。' : '按作品实际名称补齐宿主标题。')),
    '- CardBackgroundUrl：' + (background ? '参考 ' + inline(background) + '。按工坊规范补齐或验证线上链接。' : '按 DESIGN.md 制作外框背景图，转存后写入线上链接。'),
    '- BgMusicUrl：' + (music ? '核对本地配置 ' + inline(music) + ' 的线上可用性。' : '') +
      '缺少可用线上链接时，先读 bgm-pe.md，调用 mm_tool_music_* 生成纯器乐循环 BGM，设置 is_instrumental: true，name 传简短中文曲名。' +
      '生成失败或明确要求曲库时，按 summary/tags 从 bgm-catalog.json 匹配。将非空线上链接仅写入 feed/feed-card.json，由宿主播放，禁止卡内自播音频。',
    '- 核对 ' + inline(PLATFORM_ROOT + '/' + SCHEMA) + '、/api/dy_card/data 返回结构和 config/card-routing.json 的服务路由，同步更新对应配置。' +
      (fields.length ? '本地 Schema 顶层字段：' + fields.map((key) => inline(textValue(key))).join('、') + '。' : ''),
  ];
  if (button) lines.push('- Button：参考 ' + inline(button) + '。');
  for (const [index, item] of (feed?.ContentInfoList ?? []).entries()) {
    const fields = ['PageIndex', 'PageURL'].filter((field) => textValue(item?.[field]));
    for (const field of fields) {
      lines.push('- ContentInfoList[' + index + '].' + field + '：' + inline(textValue(item[field])) + '。');
    }
  }
  lines.push('- PageIndex / PageURL 使用 src/app.config.* 中实际注册的落地路径，去掉前导 /，并复核宿主入口。');
  return lines;
}

function renderHandoff({ included, integration, largeAssets, design, feed, fields, routingText }) {
  const integrationItems = integrationLines(integration);
  const assets = assetLines(included, largeAssets);
  const shell = feedLines(feed, design, fields);
  const templateMerge = [
    '- 合并 opencard/src/index.tsx 时必须保留平台模板原有的 .widget-root、.widget-body，以及挂在 .widget-body 上的唯一真实 Actual FMP 标记属性。禁止用纯注释替换该属性。',
    '- 合并 server/src 时，将业务模块挂载到平台全局 api 前缀下。保持各子包独立编译，业务模块从各自源码目录导入。',
  ];
  const paths = [...included.keys()].sort();
  const entrypoints = paths.filter((filename) =>
    /^(?:(?:opencard\/)?src\/(?:app(?:\.config)?|index|pages\/.*\/(?:index|[^/]+\.config))|(?:closed-domain-server|server)\/src\/(?:main|app\.module))\.[^.]+$/.test(filename),
  );
  const readme = [
    '# 抖音 AI 工坊业务文件合并说明',
    '',
    '先解压到临时目录，再逐项合并到 ' + inline(PLATFORM_ROOT) + '。',
    '',
    '## 文件放置清单',
    ...paths.map((filename) => '- ' + inline(filename) + ' → ' + inline(PLATFORM_ROOT + '/' + filename)),
    '',
    '## 模板入口合并',
    ...entrypoints.map((filename) => '- 核对并合并 ' + inline(filename) + '。'),
    ...templateMerge,
    '- 落地页入口合并页面注册与网络封装。如有新增运行依赖，核对平台模板声明，并在相应服务的 dependencies 中局部补齐。',
    '',
    '## 外框配置建议',
    '按现有 feed/feed-card.json 的结构补齐。',
    ...shell,
    '',
    '## 平台待接入点',
    ...integrationItems,
    '',
    '## 本地素材与转存',
    ...assets,
    '',
  ].join('\n');
  const prompt = [
    '# 发给抖音 AI 工坊 AI 的交接提示词',
    '',
    '## 1. 作品玩法简介',
    gameplay(design, feed),
    '',
    '## 2. 合并方式',
    '先将 handoff.zip 解压到临时目录，按 README.md 合并到已有 ' + inline(PLATFORM_ROOT) + ' 工程。不要重新初始化项目。保留平台模板的依赖、网络封装、FMP 和基础配置，局部合并业务入口。',
    ...templateMerge,
    '',
    '## 3. 服务域类型',
    serviceDomain(routingText),
    '',
    '## 4. 平台能力接入位置',
    '按工坊 Skill 或 SDK 原子文档接入标注能力，核对鉴权和参数，将对应本地 Mock 接到真实能力。',
    ...integrationItems,
    '',
    '## 5. 图片转存清单',
    ...assets,
    '',
    '## 6. 兴趣卡外框与落地页基础信息',
    '在已有 feed/feed-card.json 上按实际项目补齐外框字段，并补齐落地页的基础信息，包括名称、图标、简介及适用的搜索信息。',
    ...shell,
    '',
    '## 7. 已定稿的视觉与交互',
    '请勿改动 DESIGN.md 定稿的视觉、布局、交互反馈和玩法规则。保持图形化点按及即时反馈，具体状态以随包实现为准。',
    '',
    '## 8. 合并后的预览自检',
    '- 外部精简 Skill 包未附以下参考文档。请在工坊对照内置完整版完成核对：canvas-3d.md（3D 生命周期）、card-data-model.md（数据协议）、rendering.md（Lynx 布局）、components.md（组件）、taro-dsl.md（TSX 输出）、audit-compliance.md（审核规则）。',
    '- 用宿主预览器实测 Lynx 300 / 436 两档槽高，核心内容完整、无裁切、无重叠或遮挡。检查首屏、操作和结果各态。',
    '- 实测兴趣卡点按反馈、宿主外框及落地页跳转，验证落地页主要流程、服务接口和资源加载。核对唯一 Actual FMP 标记和宿主背景音乐。',
    '- 在平台项目运行 pnpm verify，并按平台模板校验 Feed 路由与 tt 构建产物。执行包体积检查，核对 dist-tt 和 opencard/dist 各自不超过 16 MB。',
    '',
  ].join('\n');
  return { readme, prompt };
}

function crc32(contents) {
  let crc = 0xffffffff;
  for (const byte of contents) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(files) {
  const utf8 = 0x0800;
  const deflate = 8;
  const version = 20;
  const dosDate = 0x21; // 1980-01-01, the first valid DOS date.
  const max32 = 0xffffffff;
  if (files.size >= 0xffff) throw new Error('handoff.zip 的文件数超过标准 ZIP 上限');

  const local = [];
  const central = [];
  let offset = 0;
  let centralSize = 0;
  for (const filename of [...files.keys()].sort()) {
    const name = Buffer.from(filename, 'utf8');
    const contents = files.get(filename);
    if (name.length > 0xffff || /[\\:\x00-\x1f]|^\/|(?:^|\/)\.{1,2}(?:\/|$)/.test(filename)) {
      throw new Error('ZIP 路径不可移植：' + JSON.stringify(filename));
    }
    const compressed = deflateRawSync(contents);
    const checksum = crc32(contents);
    const nextOffset = offset + 30 + name.length + compressed.length;
    if (nextOffset >= max32 || contents.length >= max32) throw new Error('handoff.zip 超过标准 ZIP 大小上限');

    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(version, 4);
    header.writeUInt16LE(utf8, 6);
    header.writeUInt16LE(deflate, 8);
    header.writeUInt16LE(dosDate, 12);
    header.writeUInt32LE(checksum, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(contents.length, 22);
    header.writeUInt16LE(name.length, 26);
    local.push(header, name, compressed);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(version, 4);
    entry.writeUInt16LE(version, 6);
    entry.writeUInt16LE(utf8, 8);
    entry.writeUInt16LE(deflate, 10);
    entry.writeUInt16LE(dosDate, 14);
    entry.writeUInt32LE(checksum, 16);
    entry.writeUInt32LE(compressed.length, 20);
    entry.writeUInt32LE(contents.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, name);
    centralSize += entry.length + name.length;
    offset = nextOffset;
  }
  const end = Buffer.alloc(22);
  if (offset + centralSize + end.length >= max32) throw new Error('handoff.zip 超过标准 ZIP 大小上限');
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.size, 8);
  end.writeUInt16LE(files.size, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, ...central, end]);
}

function writeHandoff(out, zip, prompt) {
  const outputs = [['handoff.zip', zip], ['HANDOFF_PROMPT.md', Buffer.from(prompt, 'utf8')]];
  fs.mkdirSync(out, { recursive: true });
  for (const [filename] of outputs) {
    const existing = stat(path.join(out, filename));
    if (existing && !existing.isFile()) throw new Error(path.join(out, filename) + ' 不是可替换的普通文件');
  }
  const stage = fs.mkdtempSync(path.join(out, '.handoff-'));
  try {
    for (const [filename, contents] of outputs) fs.writeFileSync(path.join(stage, filename), contents);
    for (const [filename] of outputs) fs.renameSync(path.join(stage, filename), path.join(out, filename));
  } finally {
    for (const [filename] of outputs) fs.rmSync(path.join(stage, filename), { force: true });
    fs.rmdirSync(stage);
  }
}

function main(args) {
  const [command, ...flags] = args;
  if (!['check', 'pack', 'sync'].includes(command)) {
    throw new Error('用法：node tools/workshop-handoff.cjs <check|pack|sync> [--root <dir>] [--out <dir>]');
  }
  const { values } = parseArgs({
    args: flags,
    options: { root: { type: 'string' }, out: { type: 'string' } },
  });
  const root = path.resolve(values.root ?? path.join(__dirname, '..'));
  if (command === 'sync') {
    syncShared(root);
    console.log('共享模块同步完成');
    return 0;
  }
  const out = path.resolve(values.out ?? path.join(root, 'dist'));
  const checked = checkWorkspace(root, command === 'pack');
  if (checked.issues.length) {
    console.error('静态检查失败（' + checked.issues.length + ' 项）');
    for (const issue of checked.issues) console.error('- ' + issue);
    return 1;
  }
  console.log('静态检查通过');
  console.log('- 官方 Skill 和工程骨架（含 DESIGN.md Surface 声明）');
  console.log('- Lynx 兴趣卡样式、纵向滚动、图标与音频');
  console.log('- 双端 H5 分支、软键盘输入与横滑条');
  console.log('- 子工程相对导入与共享模块镜像一致性');
  console.log('- 永久排除方案用词、服务端硬编码凭据与 localhost');
  console.log('- Feed PageIndex / PageURL' + (checked.feed ? ' 前导斜杠' : '（本地无外框配置）'));
  if (command === 'pack') {
    const handoff = describeInputs(checked);
    const { readme, prompt } = renderHandoff(handoff);
    handoff.included.set('README.md', Buffer.from(readme, 'utf8'));
    writeHandoff(out, createZip(handoff.included), prompt);
    console.log('已生成 ' + path.join(out, 'handoff.zip') + '（' + handoff.included.size + ' 个文件）');
    console.log('已生成 ' + path.join(out, 'HANDOFF_PROMPT.md'));
    for (const asset of handoff.largeAssets) console.log('- 素材超过 5 MB，需另行转存：' + asset);
  }
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

