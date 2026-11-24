'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync, readdirSync} = require('node:fs');
const {join} = require('node:path');
const vm = require('node:vm');
const read = name => readFileSync(join(__dirname, name), 'utf8');
const rules = () => require('./app.js');

test(
    'offline distribution contains only the five agreed files and resolves its entry points',
    () => {
      assert.deepEqual(
          readdirSync(__dirname).sort(),
          ['app.js', 'index.html', 'promo.test.cjs', 'stage3d.js', 'styles.css']);
      for (const name of readdirSync(__dirname))
        assert.doesNotMatch(read(name), /https?:\/\/|(?:src|href)\s*=\s*["']\/\//i, name);
      const html = read('index.html');
      for (const name of ['styles.css', 'stage3d.js', 'app.js'])
        assert.ok(html.includes('"./' + name + '"'));
      for (const name of ['stage3d.js', 'app.js', 'promo.test.cjs'])
        new vm.Script(read(name), {filename: name});
    });
test('oracle resolves source, victim, magnitude and independent effects', () => {
  const {compile} = rules();
  const blackHole = compile('让泡面变成黑洞把钢琴吸走');
  assert.equal(blackHole.anchor, 'bowl');
  assert.equal(blackHole.subject, 'piano');
  assert.deepEqual(blackHole.forces, ['vortex']);
  const rain = compile('下十倍大橘猫雨');
  assert.equal(rain.subject, 'cat');
  assert.equal(rain.count, 10);
  assert.ok(rain.forces.includes('rain'));
  assert.deepEqual(compile('时间慢放果冻蹦床').forces, ['slow', 'jelly']);
  assert.deepEqual(compile('星星会打嗝'), compile('星星会打嗝'));
  assert.ok(compile('星星会打嗝').forces.length);
});
test('twelve distinct recipes prime exactly one law and require the matching finisher', () => {
  const {recipes, prime, finish, laws} = rules();
  assert.equal(recipes.length, 12);
  assert.equal(new Set(recipes.map(row => row.laws.join('/'))).size, 12);
  for (const recipe of recipes) {
    const pending = prime(recipe.id);
    assert.ok(pending.first !== pending.next);
    assert.ok(laws.some(l => l.id === pending.first) && laws.some(l => l.id === pending.next));
    assert.equal(finish(pending, pending.first), null);
    assert.equal(finish(pending, pending.next).reaction, recipe.id);
    assert.deepEqual(finish(pending, pending.next).forces, recipe.laws);
  }
});
test('combos, six-cell receipts and transfer preserve replay state', () => {
  const {combo, encode, decode, transfer, laws} = rules();
  assert.equal(combo(['jelly', 'jelly', 'slow']), false);
  assert.equal(combo(['jelly', 'slow', 'rain']), true);
  const moves = laws.map(l => l.id);
  assert.deepEqual(decode(encode(3, moves)), {level: 3, moves});
  assert.equal(decode('invalid'), null);
  const pack = transfer(112, '橘爪徽章', 'vortex');
  assert.deepEqual(
      JSON.parse(JSON.stringify(pack)),
      {seedContext: 112, earnedArtifact: '橘爪徽章', unfinishedHook: 'vortex'});
});

function simulation() {
  const window = {};
  vm.runInNewContext(read('stage3d.js'), {window});
  const stage = Object.create(window.NewtonStage.prototype);
  Object.assign(stage, {hooks: {}, synth: {play() {}}, tail: [0, 0, 0, 0, 0], t: 0, render() {}});
  stage.reset(0);
  return stage;
}
test('the live simulation executes all twelve paired reactions including reaction zero', () => {
  for (const r of rules().recipes) {
    const s = simulation(), pending = rules().prime(r.id);
    s.prepare(r);
    const height = s.body(r.subject).y;
    for (let i = 0; i < 60; i++)
      s.step(1 / 60);
    assert.equal(s.body(r.subject).y, height);
    s.primed = false;
    s.inject(rules().finish(pending, pending.next));
    assert.equal(s.reaction.id, r.id);
    assert.ok(s.score >= 100);
    for (let i = 0; i < 150; i++)
      s.step(1 / 60);
    for (const b of s.bodies)
      for (const field of ['x', 'y', 'z', 'vy', 'angle', 'squash'])
        assert.ok(Number.isFinite(b[field]), r.name + ' ' + field);
  }
});
test('all three oracle examples and both delayed triggers affect running bodies', () => {
  const s = simulation(), {compile} = rules();
  s.inject(compile('下十倍大橘猫雨'));
  assert.equal(s.rain.length, 10);
  s.inject(compile('让泡面变成黑洞把钢琴吸走'));
  s.inject(compile('时间慢放果冻蹦床'));
  for (let i = 0; i < 40; i++)
    s.step(1 / 60);
  assert.ok(s.body('piano').x > s.body('piano').home[0]);
  s.reset(0);
  s.inject({subject: 'apple', forces: ['jelly'], trigger: 'tap'});
  assert.equal(s.patches.length, 0);
  s.poke('apple', true);
  assert.equal(s.patches.length, 1);
  s.reset(0);
  s.inject({subject: 'piano', forces: ['rain'], trigger: 'impact'});
  assert.equal(s.rain.length, 0);
  for (let i = 0; i < 95; i++)
    s.step(1 / 60);
  assert.equal(s.rain.length, 6);
});
test('challenge codes preserve the daily seed and a primed gallery finisher', () => {
  const {encode, decode} = rules(), context = {seed: 0xffffffff, recipe: 11};
  assert.deepEqual(decode(encode(3, ['slow'], context)), {level: 3, moves: ['slow'], ...context});
  for (const bad of ['NT1-000000-ZZZZZZZ', 'NT4-010002', 'NT1-000000-0.Q'])
    assert.equal(decode(bad), null);
});
test('rim level can actually be completed and the first level observes three seconds', () => {
  const s = simulation();
  s.poke('cat', true);
  for (let i = 0; i < 179; i++)
    s.step(1 / 60);
  assert.equal(s.won, false);
  for (let i = 0; i < 3; i++)
    s.step(1 / 60);
  assert.equal(s.won, true);
  s.reset(2);
  s.poke('cat', true);
  for (let i = 0; i < 220; i++)
    s.step(1 / 60);
  assert.equal(s.won, true);
});

const advance = (s, frames) => { for (let i = 0; i < frames; i++) s.step(1 / 60); };

test('each hero has its own model, rigid body, selling point and reproducible challenge', () => {
  const {products, sceneProps} = rules();
  assert.deepEqual(sceneProps, ['coffee', 'phone', 'case', 'tin']);
  const signatures = new Set();
  for (const [level, prop] of sceneProps.entries()) {
    const s = simulation();
    s.reset(level, 127);
    assert.equal(s.prop, prop);
    assert.ok(products[prop].mass > 0);
    const parts = [];
    const model = Object.fromEntries(['put', 'ball', 'box', 'ring', 'link'].map(kind =>
      [kind, (...args) => parts.push([kind, ...args])]));
    s.specimen(prop, model);
    assert.ok(parts.length >= 6);
    signatures.add(JSON.stringify(parts));
    s.poke(prop);
    advance(s, 180);
    assert.ok(s.chainCount > 0, prop + ' feature must hit');
    assert.equal(s.bodies.length, 6);
    assert.ok(s.bodies.every(b => ['x','y','z','vx','vy','vz'].every(k => Number.isFinite(b[k]))));
    s.reset(level);
    s.start();
    advance(s, 181);
    assert.equal(s.failed, true, 'walkaway must fail ' + prop);
    s.rescue();
    const frozen = s.bodies.map(b => [b.x,b.y,b.z]);
    advance(s, 179);
    assert.deepEqual(s.bodies.map(b => [b.x,b.y,b.z]), frozen);
    advance(s, 2);
    assert.equal(s.won, true);
  }
  assert.equal(signatures.size, 4);
});

test('glancing sphere contacts transfer depth momentum through a second object without recounting rest', () => {
  const s = simulation(), hits = [];
  s.hooks.chain = (_, a, b) => hits.push([a,b]);
  s.started = true;
  const bodies = ['coffee','apple','tower'].map(id => s.body(id));
  s.bodies = bodies;
  for (const [i,b] of bodies.entries()) {
    Object.assign(b, {x: i * .5, y: .7, z: -.6 + i * .5, home: [i * .5,.7,-.6 + i * .5], r: .36});
  }
  bodies[0].vx = bodies[0].vz = 4;
  advance(s, 4);
  assert.ok(bodies[2].vz > .5 && bodies[2].vx > .5);
  assert.deepEqual(hits, [['coffee','apple'],['apple','tower']]);
  assert.ok(s.flash > 0 && s.flash <= .35);
  assert.ok(s.words.some(w => w.text === '飞杯反杀!'));
  advance(s, 3);
  assert.equal(s.chainCount, 2);
});

test('the four openings apply a paw shove, phone shock, case squeeze and seeded tin attraction', () => {
  const s = simulation();
  s.start();
  assert.ok(s.paw && s.body('coffee').vx > 1);
  s.reset(1);
  s.start();
  assert.ok(s.body('phone').y > 3);
  for (let i = 0; i < 90 && !s.landed; i++) s.step(1/60);
  assert.ok(s.landed);
  assert.ok(s.body('tower').vy > 0);
  s.reset(2);
  s.start();
  assert.ok(s.body('case').spring > 0);
  s.poke('case');
  assert.ok(s.body('case').squash < 0);
  s.reset(3, 17);
  s.start();
  const distance = () => Math.hypot(s.body('piano').x - s.body('tin').x, s.body('piano').z - s.body('tin').z);
  const before = distance();
  advance(s, 18);
  assert.ok(distance() < before);
});

test('real behavior differentiates all five personas and three repeated laws produce a physical counter', () => {
  const {fingerprint, observe, reading, directorPatch} = rules();
  for (const [expected, events] of [
    ['温柔护杯狂魔', [['click'], ['prop','coffee']]],
    ['极限压哨赌徒', [['click',true], ['click',true]]],
    ['硬核防摔质检员', [['prop','phone']]],
    ['混沌拆家乐子人', [['chain'], ['chain'], ['chain']]],
    ['执念上头战神', [['loss'], ['loss']]]
  ]) {
    const p = fingerprint();
    events.forEach(([e,v]) => observe(p,e,v));
    const [badge, line] = reading(p);
    assert.equal(badge, expected);
    assert.ok([...line].length <= 14);
  }
  const p = fingerprint();
  ['heavy','slow','heavy','heavy'].forEach(id => assert.equal(observe(p,'law',id), undefined));
  const counter = observe(p,'law','heavy');
  assert.equal(counter, 'oil');
  observe(p,'prop','phone');
  const custom = directorPatch(p, 'tin');
  assert.equal(custom.subject, 'phone');
  assert.deepEqual(custom.forces, ['float']);
  for (const [kind, field, id] of [['wind','vx','piano'],['pull','vx','piano'],['oil','vx','apple']]) {
    const a = simulation(), b = simulation();
    a.body(id).vx = b.body(id).vx = 1.5;
    a.applyCounter(kind);
    advance(a, 10); advance(b, 10);
    assert.ok(Math.abs(a.body(id)[field] - b.body(id)[field]) > .1, kind);
  }
});

test('new oracle language selects real products, anchors, packing and physical domino impulses', () => {
  const {compile} = rules(), s = simulation();
  for (const [word, prop] of [['咖啡','coffee'],['美式','coffee'],['手机','phone'],['防摔','phone'],
    ['罐头','tin'],['行李箱','case'],['收纳','case']]) {
    assert.equal(compile(word).subject, prop);
  }
  const patch = compile('让罐头变成黑洞把手机吸走');
  assert.equal(patch.anchor, 'tin');
  assert.equal(patch.subject, 'phone');
  s.inject(patch);
  assert.notEqual(s.body('tin'), s.body('phone'));
  assert.equal(s.body('tin').skin, 'tin');
  assert.ok(compile('行李箱收纳').forces.includes('jelly'));
  const chain = compile('咖啡多米诺');
  assert.ok(chain.domino);
  s.inject(chain);
  assert.ok(s.body('coffee').vx < -3);
});

test('old receipts and optional prop, baton and actual half-second frames round trip independently', () => {
  const {encode, decode, sceneProps} = rules();
  for (const prop of sceneProps)
    for (const ctx of [{prop}, {relayDepth: 2}, {prop, relayDepth: 15, seed: 0, recipe: 0}])
      assert.deepEqual(decode(encode(1, ['jelly'], ctx)), {level: 1, moves: ['jelly'], ...ctx});
  for (const code of ['NT1-000000~0/tin','NT1-000000~1/tree','NT1-000000~/','NT1-000000~1/case!a'])
    assert.equal(decode(code), null);
  const s = simulation();
  s.reset(1, 123, 'case');
  s.start();
  advance(s, 150);
  const frame = Array.from(s.relayFrame);
  const ctx = {prop: 'case', seed: 123, relayDepth: 3, frame};
  const game = decode(encode(1, ['jelly'], ctx));
  assert.deepEqual(game, {...ctx, level: 1, moves: ['jelly']});
  const receiver = simulation();
  receiver.reset(game.level, game.seed, game.prop);
  receiver.critical(game.frame);
  const pose = receiver.bodies.map(b => [b.x,b.y,b.z]);
  s.bodies.forEach((b,i) => ['x','y','z'].forEach((k,j) => assert.ok(Math.abs(b[k] - pose[i][j]) < .022)));
  advance(receiver, 90);
  assert.deepEqual(receiver.bodies.map(b => [b.x,b.y,b.z]), pose);
  assert.equal(receiver.elapsed, 2.5);
  receiver.relayReady = false;
  advance(receiver, 30);
  assert.equal(receiver.failed, true);
  for (const [n, prop] of sceneProps.entries()) {
    receiver.reset(n, 123, prop);
    receiver.critical();
    receiver.poke('cat');
    advance(receiver, 30);
    assert.equal(receiver.won, true, prop + ' relay must be rescuable');
  }
});

test('daily allowance, loss unlock and simulated completion credit only once per offer', () => {
  const {dailyWallet, spend, reward} = rules();
  let wallet = dailyWallet(null,'one');
  assert.equal(reward(wallet,1), false);
  assert.ok(reward(wallet,2));
  assert.equal(wallet.remaining,4);
  assert.equal(reward(wallet,2),false);
  for (let i = 0; i < 4; i++) assert.ok(spend(wallet));
  assert.equal(spend(wallet),false);
  assert.ok(reward(wallet,0));
  assert.equal(dailyWallet(wallet,'one').remaining,1);
  assert.equal(dailyWallet(wallet,'two').remaining,3);
});
