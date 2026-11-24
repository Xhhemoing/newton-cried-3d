'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const zlib = require('node:zlib');

const cli = path.join(__dirname, 'workshop-handoff.cjs');

function put(root, name, contents) {
  const target = path.join(root, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents, 'utf8');
}

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workshop-handoff-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  put(root, 'interest_card_skills/microapp-generate-interest-card/SKILL.md', '# Platform skill');
  put(root, 'interest_card_skills/design-skill/SKILL.md', '# Design skill');
  put(root, 'card-app/DESIGN.md', '# 夹菜挑战\n\nSurface: both\n任务与核心交互：点按筷子夹菜，立即显示结果。\n');
  put(root, 'card-app/opencard/src/index.tsx', 'export default function Card() { return <View />; }');
  put(root, 'card-app/src/app.config.ts', "export default { pages: ['pages/game/index'] };");
  put(root, 'card-app/server/src/main.ts', 'export const ready = true;');
  return root;
}

function run(root, command, ...args) {
  const result = spawnSync(process.execPath, [cli, command, '--root', root, ...args], {
    cwd: os.tmpdir(),
    encoding: 'utf8',
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  return result;
}

test('checks the two Skills, required paths and Surface declaration', (t) => {
  const root = fixture(t);
  let result = run(root, 'check');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Skill/);
  assert.match(result.stdout, /Lynx/);

  fs.rmSync(path.join(root, 'interest_card_skills/design-skill/SKILL.md'));
  fs.renameSync(path.join(root, 'card-app/server'), path.join(root, 'card-app/moved-server'));
  put(root, 'card-app/server', 'A file cannot be an ancestor of a required directory.');
  put(root, 'card-app/DESIGN.md', 'Text talking about Surface: somewhere.');
  result = run(root, 'check');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /design-skill\/SKILL\.md/);
  assert.match(result.stderr, /card-app\/server\/src/);
  assert.match(result.stderr, /card-app\/DESIGN\.md.*Surface:/);
});

const lynxCases = [
  ['breakpoint.css', '@media (max-height: 300px) {}', /@media/],
  ['overflow.less', '.x { overflow-y : scroll; }', /overflow-y/],
  ['overflow.scss', '.x { overflow-y: auto; }', /overflow-y/],
  ['scroll.tsx', '<ScrollView onScroll={() => handler()} scrollY={true} />', /ScrollView.*scrollY/],
  ['icons.ts', "import { Star } from '@open-dy/lucide-taro';", /@open-dy\/lucide-taro/],
  ['web-icons.js', "const icons = require('lucide-react');", /lucide-react/],
  ['audio.ts', 'Taro.createInnerAudioContext();', /createInnerAudioContext/],
  ['bg.js', 'Taro.getBackgroundAudioManager();', /getBackgroundAudioManager/],
  ['audio.jsx', '<audio src="music.mp3" />', /audio/],
];

test('reports every prohibited Lynx pattern with its file and line', (t) => {
  const root = fixture(t);
  for (const [name, code] of lynxCases) {
    put(root, 'card-app/opencard/src/' + name, '\n' + code);
  }
  const result = run(root, 'check');
  assert.equal(result.status, 1);
  for (const [name, , reason] of lynxCases) {
    const line = result.stderr.split(/\r?\n/).find((entry) => entry.includes('/' + name + ':2'));
    assert.ok(line, result.stderr);
    assert.match(line, reason);
  }
});

test('ignores comments and accepts landing-page scrolling and its Taro icon package', (t) => {
  const root = fixture(t);
  put(root, 'card-app/opencard/src/index.tsx', [
    '// <ScrollView scrollY>',
    '/* lucide-react; getBackgroundAudioManager; <Input />; ENV_TYPE.WEB */',
    'export const href = "https://example.test"; // <Textarea />',
    'export const element = <ScrollView scrollX />;',
  ].join('\n'));
  put(root, 'card-app/opencard/src/style.less', '// @media {}\n/* overflow-y: auto */\n.a { overflow-y: hidden; }');
  put(root, 'card-app/opencard/src/style.scss', '// @media {}\n.a { background: url(https://example.test/image.png); }');
  put(root, 'card-app/src/page.tsx', "import { Star } from '@open-dy/lucide-taro';\n<ScrollView scrollY />");
  const result = run(root, 'check');
  assert.equal(result.status, 0, result.stderr);
});

const frontendCases = [
  ['env.ts', 'Taro.getEnv() === Taro.ENV_TYPE.WEB', /ENV_TYPE\.WEB/],
  ['legacy-env.ts', 'const web = ENV_TYPE.WEB;', /ENV_TYPE\.WEB/],
  ['short-env.ts', 'Taro.getEnv() === WEB', /getEnv/],
  ['dom.js', "document.getElementById('x');", /document\.getElementById/],
  ['storage.ts', "window.localStorage.getItem('x');", /window\.localStorage/],
  ['input.tsx', '<Input />', /Input/],
  ['textarea.tsx', '<Textarea />', /Textarea/],
  ['input.html', '<input name="note">', /input/],
  ['textarea.html', '<textarea></textarea>', /textarea/],
  ['editable.tsx', '<View contentEditable />', /contenteditable/i],
  ['slider.tsx', '<Slider />', /Slider/],
  ['range.html', '<view type = range />', /range/],
  ['range.tsx', '<View type={"range"} />', /range/],
];

test('checks literal module imports at each source boundary and reports the declaration line', (t) => {
  const root = fixture(t);
  for (const owner of ['opencard/src', 'src', 'server/src', 'closed-domain-server/src']) {
    put(root, 'card-app/' + owner + '/shared/core.ts', 'export const core = 1;');
    put(root, 'card-app/' + owner + '/modules.ts', [
      "import { core } from './shared/core';",
      "import image from '../../../assets/火锅.png';",
      "// import '../../src/shared/comment';",
      "/* require('../../src/shared/comment') */",
      `const example = "import('../../src/shared/example')";`,
      "client.require('../../src/shared/property');",
    ].join('\n'));
  }
  let result = run(root, 'check');
  assert.equal(result.status, 0, result.stderr);
  const cases = [
    ['opencard/src', "import type {\n  State\n} from '../../src/shared/newton-core'"],
    ['src', "export * as util from '../server/src/shared/core.ts'"],
    ['server/src', "const core = import( /* local */ '../../src/shared/newton-core')"],
    ['closed-domain-server/src', "const core = require('../../src/shared/newton-core.cjs')"],
  ];
  for (const [owner, code] of cases) put(root, 'card-app/' + owner + '/modules.ts', '\r\n' + code);
  result = run(root, 'check');
  assert.equal(result.status, 1);
  for (const [owner, code] of cases) {
    const specifier = code.split("'")[1];
    assert.ok(result.stderr.includes('card-app/' + owner + '/modules.ts:2 禁止跨子工程相对导入 ' +
      specifier + '（请使用当前子包内模块）'), result.stderr);
  }
});

test('compares shared files byte for byte and syncs nested mirrors only into existing target packages', (t) => {
  const root = fixture(t);
  const shared = 'shared/physics/core.ts';
  const original = 'export const value = 1;\r\n';
  const drifted = original.replace('\r\n', '\n');
  const targets = ['opencard/src', 'server/src', 'closed-domain-server/src'];
  put(root, 'card-app/src/' + shared, original);
  for (const owner of targets) put(root, 'card-app/' + owner + '/' + shared, drifted);
  let result = run(root, 'check');
  assert.equal(result.status, 1);
  for (const owner of targets) {
    assert.ok(result.stderr.includes(owner + '/' + shared + ' 与 src/' + shared + ' 内容不一致'), result.stderr);
  }
  put(root, 'card-app/src/shared/new.ts', 'export {};');
  result = run(root, 'sync');
  assert.equal(result.status, 0, result.stderr);
  for (const owner of targets.slice(0, 2)) {
    assert.equal(fs.readFileSync(path.join(root, 'card-app', owner, shared), 'utf8'), original);
    assert.equal(fs.readFileSync(path.join(root, 'card-app', owner, 'shared/new.ts'), 'utf8'), 'export {};');
  }
  assert.equal(fs.readFileSync(path.join(root, 'card-app', targets[2], shared), 'utf8'), drifted);
  put(root, 'card-app/' + targets[2] + '/' + shared, original);
  result = run(root, 'check');
  assert.equal(result.status, 0, result.stderr);
  fs.renameSync(path.join(root, 'card-app/server/src'), path.join(root, 'card-app/server/moved'));
  result = run(root, 'sync');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(root, 'card-app/server/src')), false);
});

test('checks Unicode import bindings and executable expressions inside template literals', (t) => {
  const root = fixture(t);
  put(root, 'card-app/server/src/bindings.ts', [
    "import 天气 from '../../src/shared/weather';",
    "const note = `require('../../src/example')`;",
    "const value = `天气 ${format({ now: require('../../src/shared/today') })}`;",
  ].join('\n'));
  const result = run(root, 'check');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /bindings\.ts:1 .*shared\/weather/);
  assert.match(result.stderr, /bindings\.ts:3 .*shared\/today/);
  assert.doesNotMatch(result.stderr, /src\/example/);
});

test('reports each H5, keyboard and slider violation on both frontend surfaces', (t) => {
  const root = fixture(t);
  for (const surface of ['opencard/src', 'src']) {
    for (const [name, code] of frontendCases) {
      put(root, 'card-app/' + surface + '/' + name, code);
    }
  }
  const result = run(root, 'check');
  assert.equal(result.status, 1);
  for (const surface of ['opencard/src', 'src']) {
    for (const [name, , reason] of frontendCases) {
      const filename = 'card-app/' + surface + '/' + name + ':1';
      const line = result.stderr.split(/\r?\n/).find((entry) => entry.includes(filename));
      assert.ok(line, result.stderr);
      assert.match(line, reason);
    }
  }
});

test('checks banned concepts across the app and secrets in server code without echoing them', (t) => {
  const root = fixture(t);
  const concepts = [
    '\u5634\u66ff\u63a5\u7ebf\u5458', '\u8fd9\u53e5\u600e\u4e48\u56de',
    '\u793e\u6050\u5634\u66ff', '\u53cd\u753b\u997c\u5634\u66ff',
  ];
  for (const [index, concept] of concepts.entries()) {
    put(root, 'card-app/notes/concept-' + index + '.md', concept);
  }
  put(root, 'card-app/server/src/host.ts', 'const url = "http://localhost:3000";');
  put(root, 'card-app/server/src/credentials.ts', 'const db = { password: "example-inline-password" };');
  put(root, 'card-app/server/src/key.ts', 'const key = "-----BEGIN RSA PRIVATE KEY-----\\nsecret-data";');
  put(root, 'card-app/server/src/dsn.ts', 'const db = "postgresql://user:secret-data@db.example/app";');
  put(root, 'card-app/server/src/db.ts', 'const password = process.env.DB_PASSWORD ?? "secret-data";');
  const result = run(root, 'check');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /db\.ts:1.*密码/);
  for (const index of concepts.keys()) {
    assert.ok(result.stderr.includes('concept-' + index + '.md:1'), result.stderr);
  }
  assert.match(result.stderr, /host\.ts:1.*localhost/);
  assert.match(result.stderr, /credentials\.ts:1.*密码/);
  assert.match(result.stderr, /key\.ts:1.*私钥/);
  assert.match(result.stderr, /dsn\.ts:1.*凭据/);
  assert.doesNotMatch(result.stderr, /example-inline-password|secret-data/);
});

test('checks PageIndex and PageURL on every item and blocks packing when check fails', (t) => {
  const root = fixture(t);
  const feed = 'card-app/feed/feed-card.json';
  put(root, feed, JSON.stringify({ ContentInfoList: [
    { PageIndex: 'pages/game/index', PageURL: '/pages/game/index?mode=easy' },
    { PageIndex: '/pages/game/index', PageURL: 'pages/game/index?mode=hard' },
  ] }));
  let result = run(root, 'pack');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /feed\/feed-card\.json.*ContentInfoList\[0\]\.PageURL.*page_url can not start with '\//);
  assert.match(result.stderr, /feed\/feed-card\.json.*ContentInfoList\[1\]\.PageIndex.*page_url can not start with '\//);
  assert.equal(fs.existsSync(path.join(root, 'dist')), false);

  put(root, feed, '{malformed');
  result = run(root, 'check');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /feed\/feed-card\.json.*JSON/);
});

function readZip(zip) {
  const eocd = zip.length - 22;
  assert.equal(zip.readUInt32LE(eocd), 0x06054b50);
  assert.equal(zip.readUInt32LE(eocd + 4), 0);
  const count = zip.readUInt16LE(eocd + 10);
  assert.equal(zip.readUInt16LE(eocd + 8), count);
  const centralStart = zip.readUInt32LE(eocd + 16);
  assert.equal(centralStart + zip.readUInt32LE(eocd + 12), eocd);
  const entries = new Map();
  let cursor = centralStart;
  let nextLocal = 0;
  for (let index = 0; index < count; index++) {
    assert.equal(zip.readUInt32LE(cursor), 0x02014b50);
    assert.equal(zip.readUInt16LE(cursor + 8), 0x0800);
    assert.equal(zip.readUInt16LE(cursor + 10), 8);
    const crc = zip.readUInt32LE(cursor + 16);
    const compressedSize = zip.readUInt32LE(cursor + 20);
    const nameLength = zip.readUInt16LE(cursor + 28);
    const name = zip.toString('utf8', cursor + 46, cursor + 46 + nameLength);
    const local = zip.readUInt32LE(cursor + 42);
    assert.equal(local, nextLocal);
    assert.equal(zip.readUInt32LE(local), 0x04034b50);
    assert.equal(zip.readUInt16LE(local + 6), 0x0800);
    assert.equal(zip.readUInt16LE(local + 8), 8);
    assert.equal(zip.readUInt32LE(local + 14), crc);
    assert.equal(zip.readUInt32LE(local + 18), compressedSize);
    assert.equal(zip.readUInt16LE(local + 26), nameLength);
    assert.equal(zip.toString('utf8', local + 30, local + 30 + nameLength), name);
    const data = local + 30 + nameLength + zip.readUInt16LE(local + 28);
    const contents = zlib.inflateRawSync(zip.subarray(data, data + compressedSize));
    assert.equal(contents.length, zip.readUInt32LE(cursor + 24));
    assert.equal(contents.length, zip.readUInt32LE(local + 22));
    if (typeof zlib.crc32 === 'function') assert.equal(crc, zlib.crc32(contents));
    assert.doesNotMatch(name, /\\|^\//);
    assert.equal(entries.has(name), false);
    entries.set(name, { contents, crc });
    nextLocal = data + compressedSize;
    cursor += 46 + nameLength + zip.readUInt16LE(cursor + 30) + zip.readUInt16LE(cursor + 32);
  }
  assert.equal(cursor, eocd);
  assert.equal(nextLocal, centralStart);
  return entries;
}

test('packs only business inputs with UTF-8 ZIP paths, README and a separate eight-part prompt', (t) => {
  const root = fixture(t);
  put(root, 'card-app/closed-domain-server/src/main.ts', 'export const isolated = true;');
  put(root, 'card-app/src/pages/game/index.tsx', [
    '// ordinary comment',
    'const mock = "https://example.test"; // [PLATFORM-INTEGRATION: 用户身份] 替换本地 Mock',
    "const fake = '// [PLATFORM-INTEGRATION] this is a string';",
    "import food from '../../../assets/火锅.png';",
    "import logo from '../../../assets/large.png';",
    '<View>{/* [PLATFORM-INTEGRATION: 分享] 接入宿主分享 */}</View>',
  ].join('\n'));
  put(root, 'card-app/assets/火锅.png', '123456789');
  put(root, 'card-app/assets/unused.png', 'unused');
  put(root, 'card-app/assets/large.png', Buffer.alloc(5 * 1024 * 1024 + 1));
  put(root, 'card-app/assets/封面.webp', 'cover');
  const excluded = [
    'package.json', 'src/package.json', 'src/pnpm-lock.yaml', 'src/package-lock.json',
    'src/yarn.lock', 'opencard/src/node_modules/a/index.js', 'src/dist/app.js',
    'src/dist-tt/app.js', 'opencard/dist/app.js', 'src/.env', 'src/.env.example',
    'assets/.ENV.local', 'server/src/credential.pem', 'server/src/credential.key',
    'src/tsconfig.build.json', 'server/src/Dockerfile', 'server/src/scripts/build.js',
    'config/not-for-handoff.json', 'feed/custom-card-schema.json', 'docs/extra.md',
  ];
  for (const name of excluded) put(root, 'card-app/' + name, 'excluded');
  put(root, 'card-app/feed/feed-card.json', JSON.stringify({
    Title: '火锅挑战',
    CardBackgroundUrl: '../assets/封面.webp',
    BgMusicUrl: 'https://example.test/bgm.mp3',
    ContentInfoList: [{ PageIndex: 'pages/game/index', PageURL: 'pages/game/index?mode=fun' }],
  }));
  put(root, 'card-app/config/card-routing.json', '{"serviceDomain":"closed","cardType":"feed"}');
  const out = path.join(root, 'custom output');
  const result = run(root, 'pack', '--out', out);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(root, 'dist')), false);
  const zip = readZip(fs.readFileSync(path.join(out, 'handoff.zip')));
  assert.deepEqual([...zip.keys()].sort(), [
    'DESIGN.md', 'README.md', 'assets/封面.webp', 'assets/火锅.png', 'closed-domain-server/src/main.ts',
    'opencard/src/index.tsx', 'server/src/main.ts', 'src/app.config.ts', 'src/pages/game/index.tsx',
  ].sort());
  assert.equal(zip.get('assets/火锅.png').crc, 0xcbf43926);
  assert.equal(zip.get('assets/火锅.png').contents.toString(), '123456789');

  const readme = zip.get('README.md').contents.toString('utf8');
  for (const name of zip.keys()) {
    if (name !== 'README.md') assert.ok(readme.includes('/workspace/project/card-app/' + name), name);
  }
  for (const value of ['src/app.config.ts', 'opencard/src/index.tsx', '火锅挑战', '封面.webp',
    'BgMusicUrl', 'pages/game/index?mode=fun', 'src/pages/game/index.tsx:2', '用户身份', 'src/pages/game/index.tsx:6', '接入宿主分享', 'large.png']) {
    assert.ok(readme.includes(value), value);
  }
  assert.doesNotMatch(readme, /this is a string/);

  const prompt = fs.readFileSync(path.join(out, 'HANDOFF_PROMPT.md'), 'utf8');
  assert.equal(prompt.match(/^## /gm)?.length, 8);
  for (const value of ['点按筷子夹菜', '/workspace/project/card-app', '不要重新初始化项目',
    '封闭域', 'src/pages/game/index.tsx:2', 'transfer_file', 'assets/火锅.png', 'assets/封面.webp',
    'BgMusicUrl', '基础信息', 'DESIGN.md', '300', '436', '无裁切', 'pnpm verify']) {
    assert.ok(prompt.includes(value), value);
  }
  assert.doesNotMatch(prompt, /unused\.png|this is a string/);
});

test('defaults output to the supplied root and uses explicit open routing without inventing missing values', (t) => {
  const root = fixture(t);
  let result = run(root, 'pack');
  assert.equal(result.status, 0, result.stderr);
  const output = path.join(root, 'dist/HANDOFF_PROMPT.md');
  assert.match(fs.readFileSync(output, 'utf8'), /服务域未确认/);
  put(root, 'card-app/config/card-routing.json', '{"serviceDomain":"open","cardType":"feed"}');
  result = run(root, 'pack');
  assert.equal(result.status, 0, result.stderr);
  assert.match(fs.readFileSync(output, 'utf8'), /开放域/);
  put(root, 'card-app/DESIGN.md', '\uFEFFSurface: both\n任务与核心交互：点按夹菜。\n');
  result = run(root, 'check');
  assert.equal(result.status, 0, result.stderr);
});

test('places template, schema, BGM and platform reference instructions in the relevant handoff sections', (t) => {
  const root = fixture(t);
  for (const schema of [
    { required: ['weather', 'windSpeed'], properties: { optionalField: {} } },
    { properties: { weather: {}, windSpeed: {} } },
  ]) {
    put(root, 'card-app/feed/custom-card-schema.json', JSON.stringify(schema));
    const result = run(root, 'pack');
    assert.equal(result.status, 0, result.stderr);
    const zip = readZip(fs.readFileSync(path.join(root, 'dist/handoff.zip')));
    const readme = zip.get('README.md').contents.toString('utf8').split(/^## /m);
    const prompt = fs.readFileSync(path.join(root, 'dist/HANDOFF_PROMPT.md'), 'utf8').split(/^## /m);
    assert.equal(prompt.length - 1, 8);
    for (const merge of [readme.find((s) => s.startsWith('模板入口合并')), prompt[2]]) {
      for (const word of ['opencard/src/index.tsx', '.widget-root', '.widget-body', 'Actual FMP', '属性', '注释',
        'server/src', 'api', '独立编译']) assert.ok(merge.includes(word), word);
    }
    for (const shell of [readme.find((s) => s.startsWith('外框配置建议')), prompt[6]]) {
      for (const word of ['/workspace/project/card-app/feed/custom-card-schema.json', 'weather', 'windSpeed',
        '/api/dy_card/data', 'config/card-routing.json', 'BgMusicUrl', 'bgm-pe.md', 'mm_tool_music_*',
        'is_instrumental: true', 'name', 'bgm-catalog.json', 'feed-card.json', '宿主播放']) {
        assert.ok(shell.includes(word), word);
      }
      assert.doesNotMatch(shell, /optionalField/);
    }
    for (const word of ['canvas-3d.md', 'card-data-model.md', 'rendering.md', 'components.md', 'taro-dsl.md',
      'audit-compliance.md']) assert.ok(prompt[8].includes(word), word);
  }
});

