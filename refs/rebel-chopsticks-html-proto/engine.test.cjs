'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const enginePath = path.join(__dirname, 'engine.js');
let engine;
try {
  engine = require(enginePath);
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND' || !error.message.includes(enginePath)) throw error;
}

function gameApi() {
  assert.ok(engine, 'engine.js must expose the CommonJS API');
  return engine;
}

function advance(world, frames = 20) {
  const { stepWorld } = gameApi();
  for (let frame = 0; frame < frames; frame++) stepWorld(world, 0.05);
}

function entity(world, foodId, decoy = false) {
  const match = world.entities.find(item => item.foodId === foodId && !item.popped && item.decoy === decoy);
  assert.ok(match, 'expected active ' + foodId);
  return match;
}

function hit(world, foodId, decoy = false) {
  const { x, y } = entity(world, foodId, decoy);
  return gameApi().tapArena(world, x, y);
}

test('classic browser script and CommonJS expose the same API', () => {
  const common = gameApi();
  const sandbox = { window: {}, TextEncoder, URLSearchParams };
  vm.runInNewContext(readFileSync(enginePath, 'utf8'), sandbox, { filename: enginePath });
  const browser = sandbox.window.ChopsticksEngine;
  assert.deepEqual(Object.keys(browser).sort(), Object.keys(common).sort());
  assert.equal(browser.createGame({ mode: 'daily' }).targetFoodId, 'dumpling');
  assert.equal(browser.WORLD_SIZE, 320);
  assert.equal(browser.ARCHIVE_MAX_BYTES, 2000);
  assert.deepEqual([...Object.keys(common.FOODS)], ['dumpling', 'chicken', 'egg', 'noodle', 'cilantro', 'octopus', 'chili', 'boba']);
});

test('all seven daily recipes win at their moving food centers in three taps or fewer', () => {
  const { DAILY_LEVELS, createGame } = gameApi();
  const solutions = [
    ['dumpling', 'dumpling'],
    ['noodle', 'egg'],
    ['cilantro', 'chicken'],
    ['octopus', 'octopus'],
    ['boba'],
    ['chili', 'dumpling'],
    ['noodle', 'cilantro', 'chicken'],
  ];
  assert.deepEqual(DAILY_LEVELS.map(level => level.day), [1, 2, 3, 4, 5, 6, 7]);
  for (const [index, sequence] of solutions.entries()) {
    const day = index + 1;
    const world = createGame({ mode: 'daily', day });
    for (const foodId of sequence) {
      advance(world, 23);
      hit(world, foodId);
    }
    assert.equal(world.status, 'won', 'day ' + day);
    assert.equal(world.caughtFoodId, sequence.at(-1));
    assert.equal(world.tapCount, sequence.length);
  }
});

test('daily traps enforce order, freeze stolen chopsticks and hide the genuine octopus in a crowd', () => {
  const { createGame, tapArena } = gameApi();
  const theft = createGame({ mode: 'daily', day: 1 });
  const dumpling = entity(theft, 'dumpling');
  assert.equal(hit(theft, 'dumpling').outcome, 'stolen');
  assert.equal(theft.fx.hitStopTimer, 0.42);
  assert.equal(dumpling.vulnerable, true);
  assert.deepEqual(tapArena(theft, dumpling.x, dumpling.y), { outcome: 'ignored', sound: null, targetFoodId: null });
  assert.equal(theft.tapCount, 1);

  const guard = createGame({ mode: 'daily', day: 2 });
  assert.equal(hit(guard, 'egg').outcome, 'blocked');
  assert.equal(guard.chopsticks.p1.state, 'stunned');
  assert.equal(guard.attemptsLeft, 2);
  advance(guard);
  hit(guard, 'noodle');
  hit(guard, 'egg');
  assert.equal(guard.status, 'won');

  const shield = createGame({ mode: 'daily', day: 3 });
  const chicken = entity(shield, 'chicken');
  const before = [chicken.x, chicken.y];
  assert.equal(hit(shield, 'chicken').outcome, 'evaded');
  assert.notDeepEqual([chicken.x, chicken.y], before);
  assert.equal(chicken.shielded, true);
  hit(shield, 'cilantro');
  assert.equal(chicken.shielded, false);
  hit(shield, 'chicken');
  assert.equal(shield.status, 'won');

  const split = createGame({ mode: 'daily', day: 4 });
  hit(split, 'octopus');
  assert.equal(split.entities.filter(item => item.decoy && !item.popped).length, 2);
  assert.equal(hit(split, 'octopus', true).outcome, 'decoy');
  assert.equal(split.status, 'playing');
  hit(split, 'octopus');
  assert.equal(split.status, 'won');
});

test('three misses consume the daily budget and terminal clicks leave it intact', () => {
  const { createGame, tapArena } = gameApi();
  const world = createGame({ mode: 'daily' });
  for (let attempt = 0; attempt < 3; attempt++) {
    assert.equal(tapArena(world, 1, 1).outcome, 'miss');
  }
  assert.equal(world.attemptsLeft, 0);
  assert.equal(world.status, 'lost');
  assert.equal(tapArena(world, 1, 1).outcome, 'ignored');
  assert.equal(world.tapCount, 3);
});

test('fair picker respects exemptions and chooses an eligible nearby food on empty taps', () => {
  const { createGame, toggleFairExclude, tapArena } = gameApi();
  const world = createGame({ mode: 'fair', excludedFoods: ['chicken'] });
  assert.equal(world.entities.find(item => item.foodId === 'chicken').popped, true);
  assert.equal(toggleFairExclude(world, 'chicken'), true);
  assert.equal(entity(world, 'chicken').popped, false);
  assert.equal(hit(world, 'chicken').outcome, 'caught');
  assert.equal(world.status, 'picked');
  assert.equal(world.caughtFoodId, 'chicken');
  assert.equal(world.chopsticks.p1.state, 'pinching');

  const narrowed = createGame({ mode: 'fair', excludedFoods: ['dumpling', 'chicken', 'noodle', 'octopus'] });
  assert.equal(toggleFairExclude(narrowed, 'boba'), false);
  assert.equal(narrowed.entities.filter(item => !item.popped).length, 1);
  assert.equal(tapArena(narrowed, 160, 160).targetFoodId, 'boba');
  assert.equal(narrowed.caughtFoodId, 'boba');
});

test('fair empty taps break nearest-food ties using the world seed', () => {
  const { createGame, tapArena } = gameApi();
  const picks = new Set();
  for (const rngState of [0, 1111]) {
    const world = createGame({ mode: 'fair', excludedFoods: ['noodle', 'octopus', 'boba'] });
    world.rngState = rngState;
    Object.assign(entity(world, 'dumpling'), { x: 80, y: 160 });
    Object.assign(entity(world, 'chicken'), { x: 240, y: 160 });
    picks.add(tapArena(world, 160, 160).targetFoodId);
  }
  assert.deepEqual(picks, new Set(['dumpling', 'chicken']));
});

test('duel routes both halves, stuns only the chili player, replenishes food and stops on three points', () => {
  const { createGame, stepWorld, tapArena } = gameApi();
  const world = createGame({ mode: 'duel' });
  const top = world.entities.find(item => item.foodId !== 'chili' && item.y < 160);
  const bottom = world.entities.find(item => item.foodId !== 'chili' && item.y >= 160);
  assert.ok(top && bottom);
  assert.equal(world.entities.filter(item => item.foodId !== 'chili' && item.y < 160).length, 2);
  assert.equal(world.entities.filter(item => item.foodId !== 'chili' && item.y >= 160).length, 2);
  tapArena(world, top.x, top.y);
  tapArena(world, bottom.x, bottom.y);
  assert.deepEqual(world.duelScores, { p1: 1, p2: 1 });
  const chili = entity(world, 'chili');
  assert.deepEqual(tapArena(world, chili.x, chili.y, 'p1'), { outcome: 'stunned', sound: 'boom', targetFoodId: 'chili' });
  assert.equal(world.chopsticks.p1.timer, 0.9);
  assert.equal(world.chopsticks.p2.state === 'stunned', false);
  assert.equal(tapArena(world, 160, 160, 'p1').outcome, 'ignored');
  advance(world);
  const secondForP1 = world.entities.find(item => !item.popped && item.foodId !== 'chili');
  assert.ok(secondForP1);
  assert.equal(tapArena(world, secondForP1.x, secondForP1.y, 'p1').sound, 'bloop');
  assert.equal(world.duelScores.p1, 2);
  const third = world.entities.find(item => !item.popped && item.foodId !== 'chili');
  assert.ok(third);
  tapArena(world, third.x, third.y, 'p2');
  assert.equal(world.duelScores.p2, 2);
  assert.equal(world.entities.some(item => !item.popped && item.foodId !== 'chili'), false);
  stepWorld(world, 0.05);
  const replenished = world.entities.find(item => !item.popped && item.foodId !== 'chili');
  assert.ok(replenished);
  tapArena(world, replenished.x, replenished.y, 'p2');
  assert.equal(world.duelScores.p2, 3);
  assert.equal(world.status, 'won');
  assert.equal(world.winner, 'p2');
});

test('all trait and trigger combinations solve through real taps, including all eight possible targets', () => {
  const { FOODS, TRAIT_CHIPS, TRIGGER_CHIPS, compileRulePatch, createGame, verifySolvable } = gameApi();
  for (const targetFoodId of Object.keys(FOODS)) {
    for (const { id: traitId } of TRAIT_CHIPS) {
      for (const { id: triggerId } of TRIGGER_CHIPS) {
        const patch = compileRulePatch({ targetFoodId, traitId, triggerId, volley: 1, tauntId: 'doge', seed: 0 });
        assert.equal(patch?.solvable, true, [targetFoodId, traitId, triggerId].join(' '));
        assert.equal(verifySolvable(patch), true);
        const world = createGame({ mode: 'prank', prankSpec: patch });
        if (triggerId === 'on_second_tap') {
          hit(world, targetFoodId);
          assert.equal(world.prankRevealed, false);
        }
        hit(world, targetFoodId);
        assert.equal(world.prankRevealed, true);
        assert.equal(world.status, 'playing');
        if (traitId === 'steal_stick') assert.equal(world.fx.hitStopTimer, 0.42);
        if (traitId === 'clone_split') assert.equal(world.entities.filter(item => item.decoy).length, 2);
        advance(world);
        hit(world, targetFoodId);
        assert.equal(world.status, 'won');
      }
    }
  }
  assert.equal(verifySolvable({ targetFoodId: 'forged' }), false);
  assert.equal(compileRulePatch({ targetFoodId: 'egg', traitId: 'free text', triggerId: 'on_first_tap' }), null);
});

test('prank URL encodes only its allowlisted fields and counter increments the previous volley', () => {
  const { compileRulePatch, encodePrankUrl, decodePrankUrl, buildCounterPrankPatch } = gameApi();
  const patch = compileRulePatch({ targetFoodId: 'egg', traitId: 'bodyguard', triggerId: 'on_second_tap', tauntId: 'spark', volley: 8, seed: 4294967295 });
  const url = encodePrankUrl(patch);
  assert.match(url, /^\?m=prank&f=egg&tr=bodyguard&tg=on_second_tap&vl=8&tn=spark&s=4294967295$/);
  assert.deepEqual(decodePrankUrl(url), { isPrank: true, patch });
  const counter = buildCounterPrankPatch(patch, { traitId: 'magnet_trap', targetFoodId: 'cilantro', volley: 100, extra: 'ignored' });
  assert.equal(counter.volley, 9);
  assert.equal(counter.helperFoodId, 'cilantro');
  assert.equal(counter.seed, patch.seed);
  assert.deepEqual(decodePrankUrl(encodePrankUrl(counter)), { isPrank: true, patch: counter });
  for (const invalid of [
    url + '&tr=bodyguard', url + '&text=free', url.replace('vl=8', 'vl=-9'),
    url.replace('f=egg', 'f=__proto__'), url.replace('m=prank', 'm=fair'),
    url.replace('tn=spark', 'tn=任意输入'), url.replace('4294967295', '4294967296'),
  ]) assert.deepEqual(decodePrankUrl(invalid), { isPrank: false, patch: null }, invalid);
});

test('archive combines ingredients, advances streak across dates, and bounds hostile input by bytes', () => {
  const { createEmptySave, clearSave, recordCatchInSave, getUnlockedBentoItems, getSaveByteLength, serializeSave, parseSave } = gameApi();
  const noodle = recordCatchInSave(createEmptySave(), { foodId: 'noodle', dayCleared: 2, todayStamp: '2026-11-22', volley: 1 });
  assert.equal(noodle.save.streak, 1);
  assert.deepEqual(noodle.newlyFused, []);
  const egg = recordCatchInSave(noodle.save, { foodId: 'egg', dayCleared: 3, todayStamp: '2026-11-23', volley: 2 });
  assert.equal(egg.save.foodMask, 12);
  assert.equal(egg.save.fusionMask, 1);
  assert.equal(egg.save.streak, 2);
  assert.equal(egg.save.dayMask, 6);
  assert.equal(egg.save.bestVolley, 2);
  assert.deepEqual(egg.newlyFused.map(item => item.id), ['golden_egg_noodle']);
  assert.deepEqual(getUnlockedBentoItems(egg.save).map(item => item.id), ['egg', 'noodle', 'golden_egg_noodle']);
  assert.deepEqual(parseSave(serializeSave(egg.save)), egg.save);
  const sameDay = recordCatchInSave(egg.save, { foodId: 'egg', todayStamp: '2026-11-23' });
  assert.equal(sameDay.save.streak, 2);
  assert.deepEqual(sameDay.newlyFused, []);
  const skipped = recordCatchInSave(egg.save, { foodId: 'chili', todayStamp: '2026-11-25' });
  assert.equal(skipped.save.streak, 1);
  assert.equal(recordCatchInSave(skipped.save, { foodId: 'egg', todayStamp: '2026-11-22' }).save.lastStamp, '2026-11-25');
  const hostile = { foodMask: 0xff, fusionMask: -1, dayMask: 0x7f, streak: Number.MAX_SAFE_INTEGER, lastStamp: '🧨'.repeat(2000), extra: '任意'.repeat(3000) };
  const serialized = serializeSave(hostile);
  assert.equal(getSaveByteLength(hostile), Buffer.byteLength(serialized, 'utf8'));
  assert.ok(Buffer.byteLength(serialized, 'utf8') < 2000);
  assert.ok(!serialized.includes('extra'));
  assert.deepEqual(parseSave(JSON.stringify({ v: 1, extra: '界'.repeat(700) })), createEmptySave());
  assert.deepEqual(parseSave('bad JSON'), createEmptySave());
  assert.deepEqual(clearSave(), createEmptySave());
});

test('frame clamping, seeded replay, slow motion, collision and ghost are observable on the live world', () => {
  const { createGame, stepWorld, BOWL_CENTER } = gameApi();
  const slow = createGame({ mode: 'daily', day: 1 });
  const replay = createGame({ mode: 'daily', day: 1 });
  assert.deepEqual(slow, replay);
  stepWorld(slow, 5);
  stepWorld(replay, 0.05);
  assert.deepEqual(slow, replay);
  stepWorld(slow, -1);
  assert.deepEqual(slow, replay);
  hit(slow, 'dumpling');
  hit(replay, 'dumpling');
  replay.fx.hitStopTimer = 0;
  const track = entity(slow, 'dumpling');
  const origin = [track.x, track.y];
  stepWorld(slow, 0.05);
  stepWorld(replay, 0.05);
  const full = entity(replay, 'dumpling');
  assert.ok(slow.fx.zoom > 1 && slow.fx.zoom < 1.28);
  assert.ok(Math.hypot(track.x - origin[0], track.y - origin[1]) < Math.hypot(full.x - origin[0], full.y - origin[1]));
  assert.ok(track.scaleX < 1.28 && track.scaleX > 1);
  advance(slow, 60);
  assert.equal(slow.fx.zoom, 1);
  assert.equal(slow.chopsticks.p1.state, 'idle');
  assert.ok(slow.ghost.missed);
  assert.equal(slow.ghost.visible, true);
  assert.equal(createGame({ mode: 'daily', ghostEnabled: false }).ghost.visible, false);
  assert.equal(createGame({ mode: 'daily', ghostEnabled: false }).ghost.enabled, false);
  assert.equal(createGame({ mode: 'fair' }).ghost.enabled, false);
  assert.ok(slow.fx.ripples.length === 0 && slow.fx.particles.length === 0);

  const ice = createGame({ mode: 'daily', day: 5 });
  const first = entity(ice, 'boba');
  const second = ice.entities.find(item => item !== first);
  for (const item of ice.entities) if (item !== first && item !== second) item.popped = true;
  Object.assign(first, { x: 160, y: 160, vx: 120, vy: 0 });
  Object.assign(second, { x: 160 + first.radius + second.radius + 1, y: 160, vx: -120, vy: 0 });
  stepWorld(ice, 0.02);
  assert.ok(first.vx < 0 && second.vx > 0);
  Object.assign(first, { x: BOWL_CENTER.x + BOWL_CENTER.r - first.radius - 1, y: BOWL_CENTER.y, vx: 200, vy: 0 });
  second.popped = true;
  stepWorld(ice, 0.05);
  assert.ok(first.x + first.radius <= BOWL_CENTER.x + BOWL_CENTER.r);
  assert.ok(first.vx < 0);
});

test('the ghost misses in an empty part of the bowl and leaves a visible ripple', () => {
  const { createGame, stepWorld } = gameApi();
  const world = createGame({ mode: 'daily', day: 5 });
  advance(world, 22);
  const boba = entity(world, 'boba');
  const egg = entity(world, 'egg');
  for (const item of world.entities) if (item !== boba && item !== egg) item.popped = true;
  Object.assign(boba, { x: 160, y: 160, vx: 0, vy: 0 });
  Object.assign(egg, { x: 123, y: 193, vx: 0, vy: 0 });
  stepWorld(world, 0.02);
  assert.equal(world.ghost.state, 'miss');
  assert.ok(world.fx.ripples.some(ripple => ripple.x === world.ghost.x && ripple.y === world.ghost.y));
  assert.ok(world.entities.every(item => item.popped || Math.hypot(item.x - world.ghost.x, item.y - world.ghost.y) > item.radius));
});

test('only fixed short Chinese event tags can reach the banner', () => {
  const { TRAIT_CHIPS, TRIGGER_CHIPS, compileRulePatch, createGame, tapArena } = gameApi();
  const tags = new Set();
  const inspect = world => {
    if (!world.fx.eventBanner) return;
    const { tag } = world.fx.eventBanner;
    assert.ok(Array.from(tag).length <= 6, tag);
    assert.match(tag, /^\p{Script=Han}{1,5}!$/u);
    assert.doesNotMatch(tag, /违规|诈骗|开发|控制台|输入/);
    tags.add(tag);
  };
  const dailyTaps = [
    ['dumpling', 'dumpling'], ['egg', 'noodle', 'egg'], ['chicken', 'cilantro', 'chicken'],
    ['octopus', 'octopus'], ['boba'], ['dumpling', 'chili', 'dumpling'], ['noodle', 'cilantro', 'chicken'],
  ];
  for (const [index, taps] of dailyTaps.entries()) {
    const world = createGame({ mode: 'daily', day: index + 1 });
    for (const foodId of taps) {
      hit(world, foodId);
      inspect(world);
      advance(world);
    }
    if (world.status === 'playing') tapArena(world, 1, 1);
    inspect(world);
  }
  for (const { id: traitId } of TRAIT_CHIPS) {
    for (const { id: triggerId } of TRIGGER_CHIPS) {
      const prankSpec = compileRulePatch({ targetFoodId: 'egg', traitId, triggerId });
      const world = createGame({ mode: 'prank', prankSpec });
      for (let index = 0; index < 3; index++) {
        hit(world, 'egg');
        inspect(world);
        if (world.status !== 'playing') break;
        advance(world);
      }
    }
  }
  assert.ok(tags.size >= 9);
});
