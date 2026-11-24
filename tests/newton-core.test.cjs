const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const { test } = require('node:test')

// Exercise the source without installing the AI Workshop template. Only Nest
// decorators and HTTP exceptions use stand-ins in this local business test.
const cache = new Map()
class BadRequestException extends Error {}
function load(relativePath) {
  const filename = path.resolve(__dirname, '../card-app', relativePath)
  if (cache.has(filename)) return cache.get(filename)
  const module = { exports: {} }
  let source = fs.readFileSync(filename, 'utf8')
  source = source.replace(/@(?:Injectable|Controller|Get|Post|HttpCode|Module)\([^)]*\)\s*/g, '')
    .replace(/@Body\(\)\s*|@Inject\(DyCardService\)\s*/g, '')
    .replace(/constructor\(private readonly service: DyCardService\) \{\}/,
      'private readonly service: DyCardService\n  constructor(service: DyCardService) { this.service = service }')
    .replace(/^import type .*\r?\n/gm, '')
    .replace(/^export type \{[^\n]+\}\s*(?:from '[^']+')?\r?$/gm, '')
    .replace(/^export (?:type|interface) /gm, match => match.slice(7))
    .replace(/^import \{([^\n]+)\} from '([^']+)'/gm, 'const {$1} = require("$2")')
  const names = []
  source = source.replace(/^export (const|function|class) (\w+)/gm, (_, kind, name) => {
    names.push(name)
    return kind + ' ' + name
  })
  source = source.replace(/^export \{ (\w+) \}(?: from '([^']+)')?\r?$/gm, (_, name, request) => {
    names.push(name)
    return request ? 'const { ' + name + ' } = require("' + request + '")' : ''
  })
  const compile = new Function('require', 'module',
    Module.stripTypeScriptTypes(source, { mode: 'strip' }) +
    '\nObject.assign(module.exports, { ' + names.join(', ') + ' })')
  compile(request => request === '@nestjs/common' ? { BadRequestException } :
    load(path.relative(path.resolve(__dirname, '../card-app'), path.resolve(path.dirname(filename), request + '.ts'))),
  module)
  cache.set(filename, module.exports)
  return module.exports
}

const getCore = () => load('src/shared/newton-core.ts')
const getTable = () => load('src/shared/table-challenge.ts')
const getCard = () => load('opencard/src/types.ts')
const getService = () => new (load('server/src/dy-card.service.ts').DyCardService)()
const slots = { subject: 'cat', law: 'jelly', trigger: 'impact' }

function advance(core, round, count, patch) {
  for (let frame = 0; frame < count; frame += 1) round = core.stepSim(round, patch)
  return round
}

const tablePlaces = ['dorm', 'desk']
const tableVariants = [0, 1]
const tableBody = (round, id) => round.bodies.find(body => body.id === id)

test('curated table shares give both players one reproducible starting pose at both places', () => {
  const n = getCore()
  const table = getTable()
  const tablePoses = []
  for (const place of tablePlaces) {
    for (const variant of tableVariants) {
      const cup = table.createTableRound({ place, goal: 'cup', variant })
      const tower = table.createTableRound({ place, goal: 'tower', variant })
      tablePoses.push(cup.bodies.map(({ id, x, z }) => [id, x, z]))
      assert.deepEqual(tower.bodies, cup.bodies)
      assert.equal(cup.status, 'cliffhanger')
      assert.equal(cup.tick, 0)
      for (const goal of ['cup', 'tower']) {
        const challenge = { place, goal, variant }
        const params = Object.fromEntries(new URLSearchParams(table.tableSharePath(challenge).split('?')[1]))
        assert.deepEqual(params, { from: 'table', place, goal, v: String(variant) })
        const friend = table.readTableChallenge(params)
        assert.deepEqual(friend, challenge)
        const senderStart = table.createTableRound(challenge)
        const friendStart = table.createTableRound(friend)
        assert.deepEqual(friendStart, senderStart)
        const play = initial => advance(n, n.applyQuickLaw(initial, 'tornado'), 240)
        assert.deepEqual(play(friendStart), play(senderStart))
        assert.deepEqual(table.createTableRound(friend), friendStart)
      }
    }
  }
  assert.equal(new Set(tablePoses.map(poses => JSON.stringify(poses))).size, 4)
  assert.equal(new Set(tablePoses.map(poses => JSON.stringify(poses.find(([id]) => id === 'blocks')))).size, 4)
})

test('curated table results follow the target falling, landing or being hit', () => {
  const n = getCore()
  const table = getTable()
  for (const place of tablePlaces) {
    for (const variant of tableVariants) {
      const cup = table.createTableRound({ place, goal: 'cup', variant })
      const tower = table.createTableRound({ place, goal: 'tower', variant })
      const settled = (initial, law) => advance(n, law ? n.applyQuickLaw(initial, law) : initial, 240)
      const caseName = place + ' ' + variant
      const cupSaved = settled(cup, 'tornado')
      const towerTipped = settled(tower, 'tornado')
      assert.equal(cupSaved.status, 'saved', caseName)
      assert.equal(towerTipped.status, 'hilarious_fail', caseName)
      assert.ok(cupSaved.chainCount > 0 && towerTipped.chainCount > 0, caseName)
      const blocks = tableBody(towerTipped, 'blocks')
      assert.ok(Math.abs(blocks.rotZ) >= 1.4, caseName + ' visibly on its side')
      let impact = n.applyQuickLaw(tower, 'tornado')
      while (impact.chainCount === 0 && impact.tick < 120) impact = n.stepSim(impact)
      assert.ok(impact.chainCount > 0, caseName)
      assert.equal(impact.status, 'playing', caseName + ' continues after first contact')
      assert.ok(towerTipped.tick > impact.tick + 5, caseName)
      const towerSaved = settled(tower, 'jelly')
      assert.equal(towerSaved.status, 'saved', caseName)
      assert.deepEqual(tableBody(towerSaved, 'blocks'), tableBody(tower, 'blocks'), caseName)
      for (const law of n.LAWS.map(entry => entry.id)) {
        for (const initial of [cup, tower]) {
          const result = settled(initial, law)
          assert.ok(['saved', 'hilarious_fail'].includes(result.status), caseName + ' ' + law)
          assert.equal(n.applyQuickLaw(result, law), result)
          assert.equal(n.stepSim(result), result)
        }
      }
      const missedCup = settled(cup)
      assert.equal(missedCup.status, 'hilarious_fail', caseName)
      assert.ok(tableBody(missedCup, 'apple').y < 0, caseName)
      const missedTower = settled(tower)
      assert.equal(missedTower.status, 'hilarious_fail', caseName)
      assert.ok(missedTower.chainCount > 0, caseName)
      assert.ok(Math.abs(tableBody(missedTower, 'blocks').rotZ) >= 1.4, caseName)
      const noCat = { ...tower, bodies: tower.bodies.filter(body => body.id !== 'cat') }
      assert.equal(settled(noCat).status, 'saved', caseName)
    }
  }
})

test('curated cups offer opposite first-law trades between the two layouts at each place', () => {
  const n = getCore()
  const table = getTable()
  const laws = ['zero_g', 'jelly', 'tornado']
  for (const place of tablePlaces) {
    for (const variant of tableVariants) {
      const initial = table.createTableRound({ place, goal: 'cup', variant })
      const results = laws.map(law => advance(n, n.applyQuickLaw(initial, law), 240))
      const expected = variant === 0 ? ['hilarious_fail', 'saved', 'saved'] : ['saved', 'hilarious_fail', 'saved']
      assert.deepEqual(results.map(round => round.status), expected, place + ' ' + variant)
      const dropped = tableBody(results[variant], 'apple')
      assert.ok(dropped.y < 0 && Math.hypot(dropped.x, dropped.z) > 2.45, place + ' ' + variant)
      assert.equal(n.describeRoundOutcome(results[variant]), '杯子掉了')
      assert.equal(n.describeRoundOutcome(results[2]), '杯子稳住了')
      assert.equal(results[2].chainLabel, '飞杯反杀')
      const tower = table.createTableRound({ place, goal: 'tower', variant })
      assert.equal(n.describeRoundOutcome(advance(n, n.applyQuickLaw(tower, 'jelly'), 240)), '积木塔保住了')
      assert.equal(n.describeRoundOutcome(advance(n, n.applyQuickLaw(tower, 'tornado'), 240)), '积木塔倒了')
    }
  }
})

test('table result pairs show the other object at the actual finish and distinguish a double save', () => {
  const n = getCore()
  for (const place of tablePlaces) {
    const early = getTable().createTableRound({ place, goal: 'tower', variant: 0 })
    assert.equal(n.tableObjectResults(early), null)
    const hit = advance(n, n.applyQuickLaw(early, 'tornado'), 240)
    assert.deepEqual(n.tableObjectResults(hit), { tower: '积木塔倒了', cup: '杯还在空中' })
    for (const variant of tableVariants) {
      const start = getTable().createTableRound({ place, goal: 'tower', variant })
      const loseCup = advance(n, n.applyQuickLaw(start, variant === 0 ? 'zero_g' : 'jelly'), 240)
      const saveBoth = advance(n, n.applyQuickLaw(start, variant === 0 ? 'jelly' : 'zero_g'), 240)
      assert.deepEqual(n.tableObjectResults(loseCup), { cup: '杯子掉了', tower: '积木塔保住了' })
      assert.deepEqual(n.tableObjectResults(saveBoth), { cup: '杯子稳住了', tower: '积木塔保住了' })
    }
  }
})

test('a grounded curated cup can finish stabilizing across the old and new time limits', () => {
  const n = getCore()
  const initial = getTable().createTableRound({ place: 'dorm', goal: 'cup', variant: 0 })
  const bodies = initial.bodies.map(body => body.id === 'apple'
    ? { ...body, x: 0.2, z: 1.6, vx: 0.06, vz: -0.08, rotZ: 0 }
    : body)
  for (const tick of [219, 359]) {
    const before = { ...initial, bodies, tick, status: 'playing', cupStableFrames: 6 }
    const atLimit = n.stepSim(before)
    assert.equal(atLimit.status, 'playing')
    assert.equal(atLimit.cupStableFrames, 7)
    assert.equal(advance(n, atLimit, 4).status, 'playing')
    assert.equal(advance(n, atLimit, 5).status, 'saved')
  }
})

test('a curated cup still tumbling at the long time limit is not described as dropped', () => {
  const n = getCore()
  const initial = getTable().createTableRound({ place: 'dorm', goal: 'cup', variant: 0 })
  const bodies = initial.bodies.map(body => body.id === 'apple'
    ? { ...body, x: 0.2, z: 1.6, y: 1.5, vx: 0.5, vz: 0 }
    : body)
  const result = n.stepSim({ ...initial, bodies, tick: 359, status: 'playing' })
  assert.equal(result.status, 'hilarious_fail')
  assert.ok(tableBody(result, 'apple').y > 0.23)
  assert.equal(n.describeRoundOutcome(result), '杯子没稳住')
  assert.equal(result.sfxText, '杯子没稳住')
})

test('a lost cup does not end a curated tower attempt or return to play on a late tap', () => {
  const n = getCore()
  const initial = getTable().createTableRound({ place: 'desk', goal: 'tower', variant: 0 })
  const late = advance(n, initial, 18)
  const cup = tableBody(late, 'apple')
  assert.ok(cup.y < 0)
  assert.equal(late.status, 'playing')
  const rescue = n.applyQuickLaw(late, 'jelly')
  assert.equal(rescue.status, 'playing')
  assert.strictEqual(tableBody(rescue, 'apple'), cup)
  assert.ok(tableBody(rescue, 'cat').vy > 0)
  const settled = advance(n, rescue, 240)
  assert.equal(settled.status, 'saved')
  assert.deepEqual(tableBody(settled, 'blocks'), tableBody(initial, 'blocks'))
})

test('curated table query rejects malformed values and leaves legacy share data readable', () => {
  const n = getCore()
  const table = getTable()
  const valid = { from: 'table', place: 'dorm', goal: 'cup', v: '0' }
  for (const malformed of [
    null, [...Object.values(valid)], Object.create(valid),
    { ...valid, from: 'share' }, { ...valid, place: 'constructor' },
    { ...valid, goal: 'toString' }, { ...valid, v: '01' }, { ...valid, v: 0 },
    { ...valid, v: ' 0' }, { ...valid, v: ['0'] }, { ...valid, v: undefined },
    { ...valid, firstLaw: 'tornado' },
  ]) assert.equal(table.readTableChallenge(malformed), null)
  const patch = n.compileAlchemistPatch(slots, 'heavy_fish', 42)
  const params = Object.fromEntries(new URLSearchParams(n.encodeShareQuery(patch).split('?')[1]))
  assert.equal(table.readTableChallenge(params), null)
  assert.deepEqual(n.decodeShareParams(params),
    { levelId: 'heavy_fish', firstLaw: 'jelly', seed: 42, slots, propSkin: 'phone_case' })
  const normal = n.createInitialSim('warmup', 42)
  assert.equal(normal.tableObjective, undefined)
  assert.ok(n.relayStart(normal).tick > 0)
})

test('supplies the complete approved catalogs and Beijing-time weekday', () => {
  const n = getCore()
  assert.deepEqual(n.LEVELS.map(x => x.id), ['warmup', 'heavy_fish', 'jelly_party', 'wig_orbit'])
  assert.equal(n.SUBJECTS.length, 5)
  assert.equal(n.LAWS.length, 6)
  assert.equal(n.TRIGGERS.length, 3)
  assert.equal(n.OUTFITS.length, 4)
  assert.equal(n.PROVINCES.length, 8)
  assert.equal(n.REACTIONS.length, 12)
  assert.deepEqual(n.DEFAULT_FLAGS, { enableRetention: true, enableSocial: true })
  const boundary = Date.UTC(2026, 10, 22, 16)
  assert.equal(n.todayIndex(boundary - 1), 7)
  assert.equal(n.todayIndex(boundary), 1)
  assert.equal(n.DAILY_WEATHERS.length, 7)
  assert.equal(n.dailyWeather(1).day, 1)
  assert.equal(n.dailyWeather(7).day, 7)
})

test('0.9 seconds of 60 Hz moves the cat to the rim; a rim tap responds before the cup settles', () => {
  const n = getCore()
  const initial = n.createInitialSim('warmup', 7)
  const rim = advance(n, initial, 54)
  assert.equal(rim.tick, 54)
  assert.equal(rim.status, 'cliffhanger')
  assert.ok(rim.bodies[0].x > initial.bodies[0].x + 0.5)
  const tapped = n.applyQuickLaw(rim, 'zero_g')
  assert.equal(tapped.status, 'playing')
  assert.equal(tapped.clutchSaved, true)
  assert.ok(tapped.clutchMs >= 0 && tapped.clutchMs <= 220)
  assert.ok(tapped.bodies[0].vy > rim.bodies[0].vy)
  assert.equal(rim.tapHistory.length, 0)
  assert.equal(advance(n, rim, 100).status, 'hilarious_fail')
})

test('letting the ice coffee hang past the rescue window sends both cat and cup off the table', () => {
  const n = getCore()
  const rim = advance(n, n.createInitialSim('warmup', 7), 72)
  const end = advance(n, rim, 65)
  assert.equal(end.status, 'hilarious_fail')
  const cat = end.bodies.find(body => body.id === 'cat')
  assert.ok(cat.y < 0 && cat.vy < 0, 'the cat is falling when the cup drops')
  assert.ok(end.bodies.find(body => body.id === 'apple').y < 0)
})

test('a rim jelly tap sends the coffee through a physical chain and it settles on the table', () => {
  const n = getCore()
  const card = getCard()
  const start = card.initializeCard({ ...n.cardForDay(), seed: 20780 })
  const tapped = card.reduceCard(start, { type: 'tap', law: 'jelly', frames: 54 })
  assert.equal(tapped.round.clutchSaved, true)
  assert.ok(tapped.round.bodies[1].vy > 0, 'the cup responds immediately')

  let flight = tapped
  let beforeContact
  for (let frame = 0; frame < 45 && flight.round.chainLabel !== '飞杯反杀'; frame++) {
    beforeContact = flight
    flight = card.reduceCard(flight, { type: 'advance', frames: 1 })
  }
  assert.equal(flight.round.status, 'playing')
  assert.equal(flight.round.chainLabel, '飞杯反杀')
  assert.ok(flight.round.bodies[1].y > 0.35, 'the cup is still in flight')
  assert.ok(Math.abs(flight.round.bodies[4].vx - beforeContact.round.bodies[4].vx) > 1, 'the tower takes the impact')

  const atResult = card.reduceCard(tapped, { type: 'advance', frames: 72 })
  assert.equal(atResult.round.status, 'saved')
  const cup = atResult.round.bodies[1]
  assert.ok(Math.hypot(cup.x, cup.z) + 0.23 < 2.45, 'the full cup remains inside the rim')
  assert.ok(Math.abs(cup.y - 0.23) < 0.02 && Math.abs(cup.vy) < 0.1, 'the cup rests on the table')
  assert.ok(Math.hypot(cup.vx, cup.vz) < 0.45, 'the cup has nearly stopped sliding')
  const later = card.reduceCard(atResult, { type: 'advance', frames: 120 })
  assert.ok(later.round.bodies[1].y >= 0.22 && Math.hypot(later.round.bodies[1].x, later.round.bodies[1].z) < 2.22)
})

test('a shared coffee challenge starts and retries at the same playable rim position', () => {
  const n = getCore()
  for (const seed of [7, 20780]) {
    const initial = { ...n.createInitialSim('warmup', seed), relayDepth: 1 }
    const scene = n.relayStart(initial)
    assert.equal(scene.tick, 54)
    assert.equal(scene.relayDepth, 1)
    for (const law of ['jelly', 'zero_g', 'tornado']) {
      const action = n.applyQuickLaw(scene, law)
      assert.equal(action.tapHistory[0], law)
      assert.equal(advance(n, action, 240).status, 'saved')
    }
    assert.equal(advance(n, scene, 240).status, 'hilarious_fail')
    assert.deepEqual(n.relayStart(initial), scene)
  }
})

test('a late first tap always resolves and a settled coffee stays settled until the next tap', () => {
  const n = getCore()
  const edge = advance(n, n.createInitialSim('warmup', 20780), 78)
  for (const law of ['jelly', 'tornado', 'zero_g']) {
    let round = n.applyQuickLaw(edge, law)
    for (let frame = 0; frame < 240 && round.status === 'playing'; frame++) {
      const before = round
      round = n.stepSim(round)
      if (round.status === 'saved') assert.ok(before.cupStableFrames >= 11)
    }
    assert.equal(round.status, law === 'zero_g' ? 'hilarious_fail' : 'saved')
    assert.equal(advance(n, round, 600), round)
    if (round.status === 'saved') assert.equal(n.applyQuickLaw(round, 'zero_g').status, 'playing')
  }
})

test('three late capsule taps cannot rescue coffee that has already fallen below the rim', () => {
  const n = getCore()
  const card = getCard()
  const start = card.initializeCard({ ...n.cardForDay(), seed: 20780 })
  const late = card.reduceCard(start, { type: 'tap', law: 'zero_g', frames: 106 })
  assert.equal(late.round.status, 'hilarious_fail')
  assert.ok(late.round.bodies[1].y < 0)
  const retried = card.reduceCard(card.reduceCard(late, { type: 'tap', law: 'jelly', frames: 0 }), {
    type: 'tap', law: 'tornado', frames: 0,
  })
  assert.equal(retried.round, late.round)
})

test('card comparison replays the same first-tap frame even after a second capsule', () => {
  const n = getCore()
  const card = getCard()
  const start = card.initializeCard({ ...n.cardForDay(), seed: 20780 })
  const first = card.reduceCard(start, { type: 'tap', law: 'zero_g', frames: 78 })
  const second = card.reduceCard(first, { type: 'tap', law: 'jelly', frames: 2 })
  assert.deepEqual(second.round.tapHistory, ['zero_g', 'jelly'])
  assert.equal(second.firstShot.tick, 78)
  assert.strictEqual(card.reduceCard(second, { type: 'compare', law: 'tornado' }), second)
  const wait = card.reduceCard(second, { type: 'advance', frames: 120 })
  const result = card.reduceCard(wait, { type: 'advance', frames: 120 })
  assert.equal(result.round.status, 'hilarious_fail')
  const compared = card.reduceCard(result, { type: 'compare', law: 'tornado' })
  assert.strictEqual(compared.firstShot, first.firstShot)
  assert.equal(compared.round.firstTapTick, 78)
  assert.deepEqual(compared.round.tapHistory, ['tornado'])
  assert.equal(card.reduceCard(compared, { type: 'advance', frames: 120 }).round.status, 'saved')
})

test('card retry after an untouched timeout replays the original round and accepts a new first tap', () => {
  const n = getCore()
  const card = getCard()
  const start = card.initializeCard({ ...n.cardForDay(), seed: 20780 })
  const timeout = card.reduceCard(start, { type: 'advance', frames: 120 })
  assert.equal(timeout.round.status, 'hilarious_fail')
  assert.equal(timeout.firstShot, null)
  assert.equal(card.buildCardHandoffPath(timeout.round), null)
  const retry = card.reduceCard(timeout, { type: 'replay' })
  assert.deepEqual(retry.round, start.round)
  assert.equal(retry.firstShot, null)
  const tapped = card.reduceCard(retry, { type: 'tap', law: 'jelly', frames: 78 })
  assert.equal(tapped.firstShot.tick, 78)
  assert.deepEqual(tapped.round.tapHistory, ['jelly'])
  assert.equal(card.reduceCard(tapped, { type: 'advance', frames: 120 }).round.status, 'saved')
})

test('coffee can still fall after three taps have triggered the spinning orange', () => {
  const n = getCore()
  const card = getCard()
  const start = card.initializeCard({ ...n.cardForDay(), seed: 20780 })
  const first = card.reduceCard(start, { type: 'tap', law: 'zero_g', frames: 0 })
  const second = card.reduceCard(first, { type: 'tap', law: 'jelly', frames: 0 })
  const spinning = card.reduceCard(second, { type: 'tap', law: 'tornado', frames: 3 })
  assert.equal(spinning.round.status, 'overdrive_oiia')
  assert.equal(spinning.round.wigLiftPct, 999)

  const later = card.reduceCard(spinning, { type: 'advance', frames: 120 })
  const dropped = card.reduceCard(later, { type: 'advance', frames: 75 })
  assert.equal(dropped.round.status, 'hilarious_fail')
  assert.ok(dropped.round.bodies[1].y < 0)
})

test('only three consecutive distinct taps unlock the 999% spinning orange', () => {
  const n = getCore()
  let state = n.createInitialSim('warmup', 1)
  for (const law of ['zero_g', 'jelly', 'jelly', 'tornado']) state = n.applyQuickLaw(state, law)
  assert.notEqual(state.status, 'overdrive_oiia')
  state = n.applyQuickLaw(state, 'repel')
  assert.equal(state.status, 'overdrive_oiia')
  assert.equal(state.wigLiftPct, 999)
  assert.equal(state.traceBlocks.length, 5)
  assert.equal(n.stepSim(state).wigLiftPct, 999)
})

test('swept tabletop collision catches a fast body and near-edge bounce preserves the plate side', () => {
  const n = getCore()
  const round = n.applyQuickLaw(n.createInitialSim('jelly_party', 7), 'jelly')
  round.bodies[0] = { ...round.bodies[0], x: 2.39, y: 0.46, z: 0, vx: 18, vy: -65 }
  const cat = n.stepSim(round).bodies[0]
  assert.ok(cat.y >= 0.3)
  assert.ok(cat.vy >= 0)
  assert.ok(cat.x <= 2.45)
  const corrupt = { ...round, bodies: [{ ...round.bodies[0], y: NaN, vx: Infinity }] }
  assert.ok(n.stepSim(corrupt).bodies.every(body => Object.values(body).slice(1).every(Number.isFinite)))
})

test('the same seeded replay and patch produce the same finite poses on every level', () => {
  const n = getCore()
  for (const { id } of n.LEVELS) {
    const patch = n.compileAlchemistPatch(slots, id, 21)
    const replay = () => advance(n, n.createInitialSim(id, 21), 360, patch)
    assert.deepEqual(replay(), replay())
    assert.ok(replay().bodies.every(body => Object.values(body).slice(1).every(Number.isFinite)))
    const other = n.compileAlchemistPatch({ ...slots, trigger: 'instant' }, id, 21)
    assert.notDeepEqual(advance(n, n.createInitialSim(id, 21), 2, other), n.createInitialSim(id, 21))
  }
})

test('the alchemist derives known reaction metadata, discovery and actual trigger timing', () => {
  const n = getCore()
  const patch = n.compileAlchemistPatch(slots, 'warmup', 21)
  const immediate = n.compileAlchemistPatch({ ...slots, trigger: 'instant' }, 'warmup', 21)
  assert.ok(immediate.ops[0].tick < patch.ops[0].tick)
  assert.equal(patch.v, 1)
  assert.equal(patch.aiGenerated, false)
  assert.equal(patch.isFirstDiscovery, true)
  assert.equal(n.compileAlchemistPatch(slots, 'warmup', 21, [patch.discoveryCode]).isFirstDiscovery, false)
  assert.equal(n.findReaction(['jelly', 'zero_g']).title, '肚皮蹦床')
  assert.equal(n.findReaction(['jelly', 'jelly']), null)
  const contrast = n.randomContrastSlots(slots)
  for (const slot of Object.keys(slots)) assert.notEqual(contrast[slot], slots[slot])
})

test('external patch clamps finite values, drops invalid operations, and owns displayed metadata', () => {
  const n = getCore()
  const result = n.validateExternalPatch({
    v: 1, spellText: '<b>bad</b>', newtonComment: 'TEXT FROM MODEL',
    ops: [
      { tick: 999.4, op: 'kick', target: 'cat', value: -99, dv: [-9, 0, 8] },
      { tick: 2, op: 'bounce', target: 'all', value: Infinity },
      { tick: 0, op: 'teleport', target: 'cat', value: 1 }
    ]
  }, slots, 'warmup', 21)
  assert.equal(result.aiGenerated, true)
  assert.deepEqual(result.ops, [{ tick: 240, op: 'kick', target: 'cat', value: -1.5, dv: [-1.5, 0, 1.5] }])
  assert.doesNotMatch(result.spellText, /<|bad/)
  assert.ok(Array.from(result.newtonComment).length <= 8)
  for (const raw of [null, {}, { v: 2, ops: result.ops }, { v: 1, ops: [null] }]) {
    assert.deepEqual(n.validateExternalPatch(raw, slots, 'warmup', 21), n.compileAlchemistPatch(slots, 'warmup', 21))
  }
})

test('handoff, share and six-color receipt carry the earned result through validated parameters', () => {
  const n = getCore()
  let state = n.createInitialSim('warmup', 42)
  for (const law of ['zero_g', 'jelly', 'tornado', 'time_slow', 'giant', 'repel', 'jelly']) {
    state = n.applyQuickLaw(state, law)
  }
  const handoff = n.buildHandoffBundle(state)
  assert.deepEqual(handoff.seedContext, { levelId: 'warmup', firstLaw: 'zero_g', seed: 42 })
  assert.ok(handoff.earnedArtifact.energy > 0)
  assert.equal(n.newtonStageFor(999).tier, 3)
  const patch = n.compileAlchemistPatch(slots, 'heavy_fish', 42)
  const path = n.encodeShareQuery(patch)
  assert.match(path, /^pages\/index\/index\?/)
  const decoded = n.decodeShareParams(Object.fromEntries(new URLSearchParams(path.split('?')[1])))
  assert.deepEqual(decoded, { levelId: 'heavy_fish', firstLaw: 'jelly', seed: 42, slots, propSkin: 'phone_case' })
  assert.equal(n.encodeShareQuery(patch, { enableSocial: false }), 'pages/index/index')
  assert.deepEqual(n.decodeShareParams({ seed: 'Infinity', levelId: '__proto__', firstLaw: 'other' }),
    { levelId: 'warmup', firstLaw: null, seed: 1, slots: null })
  const receipt = n.formatWordleReceipt(state, patch)
  assert.equal(Array.from(receipt.blocks).length, 6)
  assert.equal(receipt.aiTag, 'AI 生成')
  assert.ok((receipt.header.match(/\p{Script=Han}/gu) ?? []).length <= 20)
})

test('card API and client share the daily fallback and the reducer preserves a touched round', async () => {
  const card = getCard()
  const service = getService()
  const data = service.resolveCardData()
  assert.deepEqual(data, await card.localCardRequest('/api/dy_card/data'))
  assert.ok(card.isCardData(data))
  assert.ok(!card.isCardData({ ...data, weather: { ...data.weather, title: '<b>' } }))
  const start = card.initializeCard(data)
  const ready = card.reduceCard(start, { type: 'advance', frames: 54 })
  const touched = card.reduceCard(ready, { type: 'tap', law: 'jelly' })
  assert.equal(touched.round.clutchSaved, true)
  assert.equal(touched.touched, true)
  assert.equal(card.reduceCard(touched, { type: 'load', value: data }), touched)
  assert.equal(card.reduceCard(touched, { type: 'replay' }).round.tick, 0)
  const schema = require('../card-app/feed/custom-card-schema.json')
  assert.deepEqual(Object.keys(data).sort(), [...schema.required].sort())
})

test('controller exposes the local fallback compiler and bounded province totals', async () => {
  const service = getService()
  const { DyCardController } = load('server/src/dy-card.controller.ts')
  const controller = new DyCardController(service)
  const source = fs.readFileSync(path.resolve(__dirname, '../card-app/server/src/dy-card.controller.ts'), 'utf8')
  assert.match(source, /@Get\('dy_card\/data'\)/)
  assert.match(source, /@Post\('newton\/compile-patch'\)/)
  assert.match(source, /@Post\('newton\/squad-boost'\)/)
  assert.equal((await controller.compilePatch({ slots, seed: 42 })).seed, 42)
  await assert.rejects(async () => controller.compilePatch({ slots: { ...slots, law: 'unsafe' } }), BadRequestException)
  assert.equal(controller.squadBoost({ provinceId: 'gd', energy: 99999 }).added, 999)
  assert.equal(controller.squadBoost({ provinceId: 'gd', energy: 10.9 }).total, 1009)
  assert.throws(() => controller.squadBoost({ provinceId: '__proto__', energy: 9 }), BadRequestException)
  assert.throws(() => controller.squadBoost({ provinceId: 'gd', energy: Infinity }), BadRequestException)
})

test('the daily orbit changes actual motion with the agreed Beijing date seed', () => {
  const n = getCore()
  const monday = n.cardForDay(Date.UTC(2026, 10, 23))
  const tuesday = n.cardForDay(Date.UTC(2026, 10, 24))
  assert.equal(monday.weather.modifierLaw, 'zero_g')
  assert.equal(tuesday.weather.modifierLaw, 'jelly')
  const after = seed => n.stepSim(n.applyQuickLaw(n.createInitialSim('wig_orbit', seed), 'repel')).bodies[0]
  assert.ok(after(monday.seed).vy > after(tuesday.seed).vy)
})

test('external non-string operations cannot coerce executor input or exceed six steps', () => {
  const n = getCore()
  const unsafe = { tick: 0, op: Object.create(null), target: 'cat', value: 1 }
  assert.equal(n.validateExternalPatch({ v: 1, ops: [unsafe] }, slots).aiGenerated, false)
  const ops = Array.from({ length: 10 }, (_, tick) => ({ tick, op: 'scale', target: 'all', value: 1 }))
  assert.equal(n.validateExternalPatch({ v: 1, ops }, slots).ops.length, 6)
})

test('model work is cancelled at 2800 ms and the compile returns the reviewed patch', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const service = getService()
  let signal
  service.requestPlatformPatch = async (_slots, _levelId, _seed, abortSignal) => {
    signal = abortSignal
    return new Promise(() => {})
  }
  const pending = service.compilePatch({ slots, levelId: 'warmup', seed: 21 })
  t.mock.timers.tick(2799)
  assert.equal(signal.aborted, false)
  t.mock.timers.tick(1)
  assert.equal(signal.aborted, true)
  assert.deepEqual(await pending, getCore().compileAlchemistPatch(slots, 'warmup', 21))
})

test('Feed handoff includes earned public state and clears on replay', () => {
  const n = getCore()
  const card = getCard()
  const start = card.initializeCard(n.cardForDay(Date.UTC(2026, 10, 23)))
  assert.equal(card.buildCardHandoffPath(start.round), null)
  const ready = card.reduceCard(start, { type: 'tap', law: 'jelly', frames: 50 })
  const path = card.buildCardHandoffPath(ready.round)
  const params = Object.fromEntries(new URLSearchParams(path.split('?')[1]))
  assert.deepEqual(n.decodeShareParams(params), {
    levelId: 'warmup', seed: start.data.seed, firstLaw: 'jelly', slots: null, propSkin: 'coffee', chainCount: ready.round.chainCount,
  })
  assert.equal(params.from, 'opencard')
  assert.equal(params.clutchMs, '67')
  assert.equal(Number(params.energy), ready.round.wigLiftPct)
  assert.equal(card.buildCardHandoffPath(card.reduceCard(ready, { type: 'replay' }).round), null)
})


const snapshot = overrides => ({
  totalTaps: 4, clutchCount: 0, failStreak: 0, chainTotal: 0,
  lawCounts: { zero_g: 4 }, propSkin: 'coffee', levelId: 'warmup', ...overrides,
})

test('V2 keeps the four route IDs and maps each scene to its commercial prop', () => {
  const n = getCore()
  assert.deepEqual(n.LEVELS.map(({ id, title, subtitle, passRate, defaultLaw, defaultProp }) =>
    [id, title, subtitle, passRate, defaultLaw, defaultProp]), [
    ['warmup', '猫推冰美式', '保住冰美式', 99.2, 'zero_g', 'coffee'],
    ['heavy_fish', '手机千斤砸', '抗摔桌先塌', 6.8, 'time_slow', 'phone_case'],
    ['jelly_party', '爆满硬塞箱', '盘沿1mm塞稳', null, 'jelly', 'luggage'],
    ['wig_orbit', '引力猫罐头', '全屋吸向罐头', null, 'tornado', 'cat_can'],
  ])
  assert.deepEqual(n.PROP_SKINS.map(prop => prop.id), ['coffee', 'phone_case', 'cat_can', 'luggage'])
  for (const { title, icon, brandHook, qcVerdict, cpsLabel } of n.PROP_SKINS) {
    assert.ok(title && icon && brandHook.length <= 10 && qcVerdict.length <= 14 && cpsLabel.length <= 8)
  }
  assert.equal(n.createInitialSim('wig_orbit', 4).propSkin, 'cat_can')
  const round = n.createInitialSim('wig_orbit', 4, 'luggage')
  assert.deepEqual([round.propSkin, round.chainCount, round.chainLabel, round.directorCounter, round.relayDepth],
    ['luggage', 0, '', null, 0])
  assert.deepEqual([n.DAILY_FREE_AI_RUNS, n.FAIL_STREAK_FOR_RESCUE], [3, 2])
})

test('sphere contact transfers 3D momentum once per impact and ignores vertically separated bodies', () => {
  const n = getCore()
  const round = { ...n.createInitialSim('warmup', 4, 'luggage'), status: 'playing' }
  const [cat, apple] = round.bodies
  round.bodies = [{ ...cat, x: -.38, y: 1, z: -.38, vx: 4, vz: 4 }, { ...apple, x: 0, y: 1, z: 0 }]
  const hit = n.stepSim(round)
  assert.equal(hit.chainCount, 1)
  assert.ok(hit.wigLiftPct > round.wigLiftPct)
  assert.ok(hit.bodies[1].vx > 0 && hit.bodies[1].vz > 0)
  assert.ok(hit.bodies[0].vx < 4 && hit.bodies[0].vz < 4)
  assert.equal(n.stepSim(hit).chainCount, 1)
  const miss = { ...round, bodies: [round.bodies[0], { ...round.bodies[1], y: 4 }] }
  assert.equal(n.stepSim(miss).chainCount, 0)
})

test('fast spheres exchange momentum even when their centers cross within the frame', () => {
  const n = getCore()
  const round = { ...n.createInitialSim('warmup', 4, 'luggage'), status: 'playing' }
  const noodle = round.bodies.find(body => body.id === 'noodle')
  const blocks = round.bodies.find(body => body.id === 'blocks')
  round.bodies = [
    { ...noodle, x: -.18, y: 2, z: 0, vx: 18, scale: .7 },
    { ...blocks, x: .18, y: 2, z: 0, vx: -18, scale: .7 },
  ]
  const hit = n.stepSim(round)
  assert.equal(hit.chainCount, 1)
  assert.ok(hit.bodies[0].x < hit.bodies[1].x)
  assert.ok(hit.bodies[0].vx < 0 && hit.bodies[1].vx > 0)
})

test('the coffee push, phone ground impact, can pull and luggage rim produce physical chains', () => {
  const n = getCore()
  const initial = n.createInitialSim('warmup', 7)
  const rim = advance(n, initial, 54)
  assert.ok(rim.bodies[1].x > initial.bodies[1].x + .3)
  assert.ok(rim.bodies[1].x > 2.3 && rim.bodies[1].x <= 2.45)
  const rescued = n.applyQuickLaw(rim, 'zero_g')
  assert.ok(rescued.bodies[1].vy > 0)
  let coffee = rescued
  for (let frame = 0; frame < 45 && coffee.chainLabel !== '飞杯反杀'; frame++) coffee = n.stepSim(coffee)
  assert.equal(coffee.chainLabel, '飞杯反杀')

  let phone = n.createInitialSim('heavy_fish', 7)
  for (let frame = 0; frame < 54 && phone.chainLabel !== '震塌木桌'; frame++) phone = n.stepSim(phone)
  assert.equal(phone.chainLabel, '震塌木桌')
  assert.ok(phone.bodies.find(body => body.id === 'piano').vy > 0)

  const can = n.applyQuickLaw(n.createInitialSim('wig_orbit', 7), 'tornado')
  const pull = n.stepSim(can)
  assert.ok(pull.chainCount > can.chainCount)
  assert.equal(pull.chainLabel, '罐头黑洞')
  assert.ok(pull.bodies[0].vx < n.stepSim({ ...can, propSkin: 'luggage' }).bodies[0].vx)
  assert.equal(n.stepSim(pull).chainCount, pull.chainCount)
  const luggage = n.applyQuickLaw(n.createInitialSim('jelly_party', 7), 'jelly')
  luggage.bodies = [{ ...luggage.bodies[0], x: 2.39, y: .46, vx: 18, vy: -65 }]
  assert.equal(n.stepSim(luggage).chainLabel, '果冻压箱')
})

test('an earlier unsuccessful tap does not consume a selected coffee prop rescue', () => {
  const n = getCore()
  let round = n.createInitialSim('heavy_fish', 7, 'coffee')
  round = n.applyQuickLaw(round, 'jelly')
  assert.equal(round.status, 'playing')
  round = n.applyQuickLaw(round, 'time_slow')
  assert.equal(round.status, 'saved')
  assert.ok(round.bodies.find(body => body.id === 'apple').vx < -4)
})

test('five local personas derive deterministic contrasts and counter the favorite law', () => {
  const n = getCore()
  for (const [overrides, want] of [
    [{ clutchCount: 3 }, 'clutch_gambler'],
    [{ lawCounts: { zero_g: 1, jelly: 1, tornado: 1 }, chainTotal: 4 }, 'chaos_goblin'],
    [{}, 'cup_guardian'],
    [{ propSkin: 'phone_case', lawCounts: { time_slow: 4 } }, 'qc_inspector'],
    [{ failStreak: 3 }, 'stubborn_fighter'],
  ]) {
    const behavior = snapshot(overrides)
    const reply = n.evaluatePlayerBehavior(behavior)
    assert.equal(reply.personaId, want)
    assert.equal(reply.aiGenerated, false)
    assert.ok(reply.personaTitle.length <= 6 && reply.quip.length <= 12)
    assert.notEqual(reply.recommendedProp, behavior.propSkin)
    assert.deepEqual(n.evaluatePlayerBehavior(behavior), reply)
  }
  assert.equal(n.evaluatePlayerBehavior(snapshot()).counterMode, 'heavy_cup')
  assert.equal(n.evaluatePlayerBehavior(snapshot({ lawCounts: { tornado: 4 } })).counterMode, 'reverse_wind')
  assert.equal(n.evaluatePlayerBehavior(snapshot({ lawCounts: { jelly: 4 } })).counterMode, 'slippery_rim')
  assert.equal(n.evaluatePlayerBehavior(snapshot({ lawCounts: { repel: 4 } })).counterMode, 'can_gravity')
})

test('each director counter applies a real acceleration or changes surface friction', () => {
  const n = getCore()
  const playing = { ...n.createInitialSim('warmup', 7, 'luggage'), status: 'playing' }
  const [cat, apple] = playing.bodies
  playing.bodies = [{ ...cat, x: 0, y: .38, vx: 2 }, { ...apple, x: -1, z: 0, y: 1, vx: 0 }]
  const baseline = n.stepSim(playing).bodies
  const withCounter = directorCounter => n.stepSim({ ...playing, directorCounter }).bodies
  assert.ok(withCounter('heavy_cup')[1].vy < baseline[1].vy)
  assert.notEqual(withCounter('reverse_wind')[0].vx, baseline[0].vx)
  assert.ok(withCounter('slippery_rim')[0].vx > baseline[0].vx)
  assert.ok(withCounter('can_gravity')[0].vx < baseline[0].vx)
})

test('model director fields are allowlisted and only cleaned short text is accepted', () => {
  const n = getCore()
  const input = snapshot()
  const external = {
    personaId: 'qc_inspector', counterMode: 'reverse_wind', recommendedSlots: slots, recommendedProp: 'cat_can',
    personaTitle: '<script>标题</script>', quip: '<script>denied</script><b>先护杯</b>\n再起飞一二三四五六七八九十十一',
  }
  const out = n.validateDirectorReaction(external, input)
  assert.equal(out.aiGenerated, true)
  assert.equal(out.personaId, 'qc_inspector')
  assert.equal(out.counterMode, 'reverse_wind')
  assert.equal(out.recommendedProp, 'cat_can')
  assert.match(out.quip, /^先护杯/)
  assert.doesNotMatch(out.quip, /[<>\n]|denied/)
  assert.doesNotMatch(out.personaTitle, /[<>]/)
  assert.ok(Array.from(out.quip).length <= 14)
  for (const invalid of [
    { personaId: '__proto__' }, { counterMode: 'teleport' }, { recommendedProp: 'apple' },
    { recommendedSlots: { ...slots, trigger: 'never' } }, { quip: '<b></b>' },
  ]) assert.deepEqual(n.validateDirectorReaction({ ...external, ...invalid }, input), n.evaluatePlayerBehavior(input))
})

test('commercial recipes preserve the selected prop and sanitize model quality verdicts', async () => {
  const n = getCore()
  const fallback = n.compileAlchemistPatch(slots, 'warmup', 7, [], 'phone_case')
  assert.equal(fallback.propSkin, 'phone_case')
  assert.equal(fallback.qcVerdict, '手机零划痕，木桌申请工伤')
  const service = getService()
  service.requestPlatformPatch = async (_slots, _level, _seed, _signal, propSkin) => {
    assert.equal(propSkin, 'phone_case')
    return { v: 1, ops: fallback.ops, propSkin: 'coffee', qcVerdict: '<b>全桌裂开</b>\n' + '🧱'.repeat(20) }
  }
  const patch = await service.compilePatch({ slots, seed: 7, propSkin: 'phone_case' })
  assert.equal(patch.aiGenerated, true)
  assert.equal(patch.propSkin, 'phone_case')
  assert.match(patch.qcVerdict, /^全桌裂开/)
  assert.doesNotMatch(patch.qcVerdict, /[<>\n]/)
  assert.equal(Array.from(patch.qcVerdict).length, 14)
})

test('share relay metadata round trips and invalid extension values disappear', () => {
  const n = getCore()
  const patch = n.compileAlchemistPatch(slots, 'jelly_party', 7)
  const path = n.encodeShareQuery(patch, {}, { relayDepth: 99, personaId: 'clutch_gambler' })
  const params = Object.fromEntries(new URLSearchParams(path.split('?')[1]))
  assert.deepEqual(n.decodeShareParams(params), {
    levelId: 'jelly_party', firstLaw: 'jelly', slots, seed: 7,
    propSkin: 'luggage', relayDepth: 99, personaId: 'clutch_gambler',
  })
  const legacy = { levelId: 'warmup', firstLaw: null, slots: null, seed: 1 }
  assert.deepEqual(n.decodeShareParams({ propSkin: 'bad', relayDepth: '100', personaId: '__proto__' }), legacy)
  assert.equal(n.decodeShareParams({ relayDepth: '0' }).relayDepth, 0)
  assert.doesNotMatch(n.encodeShareQuery(patch, {}, { relayDepth: 1.5, personaId: 'bad' }), /relayDepth|personaId/)
})

test('director endpoint validates event-only requests, sanitizes model replies and recovers from rejection', async () => {
  const n = getCore()
  const service = getService()
  const { DyCardController } = load('server/src/dy-card.controller.ts')
  const controller = new DyCardController(service)
  const input = snapshot()
  service.requestPlatformDirector = async (clean, signal) => {
    assert.deepEqual(clean, input)
    assert.notEqual(clean, input)
    assert.equal(signal.aborted, false)
    return { ...n.evaluatePlayerBehavior(clean), quip: '<b>稳了</b>' }
  }
  assert.match(fs.readFileSync(path.resolve(__dirname, '../card-app/server/src/dy-card.controller.ts'), 'utf8'),
    /@Post\('newton\/director-react'\)/)
  const response = await controller.directorReact(input)
  assert.equal(response.quip, '稳了')
  assert.equal(response.aiGenerated, true)
  for (const malformed of [null, snapshot({ totalTaps: Infinity }), snapshot({ clutchCount: '2' }),
    snapshot({ propSkin: 'bad' }), snapshot({ levelId: 'bad' }), snapshot({ lawCounts: { note: 'free text' } }),
    snapshot({ prompt: 'free text' })]) {
    await assert.rejects(controller.directorReact(malformed), BadRequestException)
  }
  service.requestPlatformDirector = async () => { throw new Error('provider rejected') }
  assert.deepEqual(await controller.directorReact(input), n.evaluatePlayerBehavior(input))
})

test('director cancels at 2200 ms and returns the local verdict', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const n = getCore()
  const service = getService()
  let signal
  service.requestPlatformDirector = async (_clean, abortSignal) => {
    signal = abortSignal
    return new Promise(() => {})
  }
  const pending = service.directorReact(snapshot())
  t.mock.timers.tick(2199)
  assert.equal(signal.aborted, false)
  t.mock.timers.tick(1)
  assert.equal(signal.aborted, true)
  assert.deepEqual(await pending, n.evaluatePlayerBehavior(snapshot()))
})

test('the card hands off the same prop and chain count it played and replay resets both round counters', () => {
  const n = getCore()
  const card = getCard()
  const start = card.initializeCard(n.cardForDay(Date.UTC(2026, 10, 23)))
  const tapped = card.reduceCard(start, { type: 'tap', law: 'zero_g', frames: 51 })
  assert.equal(tapped.round.status, 'playing')
  assert.equal(tapped.round.clutchMs, 50)
  const finished = card.reduceCard(tapped, { type: 'advance', frames: 35 })
  assert.ok(finished.round.chainCount > tapped.round.chainCount)
  const params = new URLSearchParams(card.buildCardHandoffPath(finished.round).split('?')[1])
  assert.equal(params.get('propSkin'), 'coffee')
  assert.equal(Number(params.get('chainCount')), finished.round.chainCount)
  const replay = card.reduceCard(finished, { type: 'replay' })
  assert.equal(replay.round.chainCount, 0)
  assert.equal(replay.round.propSkin, 'coffee')
  assert.equal(card.buildCardHandoffPath(replay.round), null)
})

test('V1 subpackages stay self-contained, POST endpoints return 200 and squad board hides by default', () => {
  const n = getCore()
  assert.equal(n.isSquadEnabled(n.DEFAULT_FLAGS), false)
  assert.equal(n.isSquadEnabled({ enableRetention: true, enableSocial: true, enableSquad: true }), true)

  const controllerSource = fs.readFileSync(path.resolve(__dirname, '../card-app/server/src/dy-card.controller.ts'), 'utf8')
  assert.equal((controllerSource.match(/@HttpCode\(200\)/g) ?? []).length, 3)

  const masterCore = fs.readFileSync(path.resolve(__dirname, '../card-app/src/shared/newton-core.ts'))
  for (const copy of [
    '../card-app/opencard/src/shared/newton-core.ts',
    '../card-app/server/src/shared/newton-core.ts',
  ]) {
    assert.equal(Buffer.compare(masterCore, fs.readFileSync(path.resolve(__dirname, copy))), 0, copy)
  }
  for (const file of [
    '../card-app/opencard/src/index.tsx',
    '../card-app/opencard/src/types.ts',
    '../card-app/server/src/dy-card.service.ts',
    '../card-app/server/src/card-data.types.ts',
  ]) {
    assert.doesNotMatch(fs.readFileSync(path.resolve(__dirname, file), 'utf8'), /\.\.\/\.\.\/src\//, file)
  }
})

test('V1 delayed trigger slots, firstTick handoff and frame-78 same-beat swap produce distinct outcomes', () => {
  const n = getCore()
  const card = getCard()

  const instant = n.compileAlchemistPatch({ subject: 'apple', law: 'zero_g', trigger: 'instant' }, 'warmup', 20780)
  const cliff = n.compileAlchemistPatch({ subject: 'apple', law: 'zero_g', trigger: 'cliff_edge' }, 'warmup', 20780)
  assert.equal(instant.ops[0].tick, 0)
  assert.equal(cliff.ops[0].tick, 54)
  assert.equal(advance(n, n.createInitialSim('warmup', 20780), 240, instant).status, 'hilarious_fail')
  assert.equal(advance(n, n.createInitialSim('warmup', 20780), 240, cliff).status, 'saved')

  const cardStart = card.initializeCard({ ...n.cardForDay(), seed: 20780 })
  const cardTapped = card.reduceCard(cardStart, { type: 'tap', law: 'zero_g', frames: 78 })
  assert.equal(cardTapped.round.firstTapTick, 78)
  assert.equal(cardTapped.firstShot.tick, 78)
  const handoffUrl = card.buildCardHandoffPath(cardTapped.round, cardTapped.firstShot.tick)
  const decoded = n.decodeShareParams(Object.fromEntries(new URLSearchParams(handoffUrl.split('?')[1])))
  assert.equal(decoded.firstTick, 78)
  assert.deepEqual(n.getAlternativeLaws('zero_g', 'warmup'), ['jelly', 'tornado'])

  const run78 = law => {
    let { decisionState, afterTap } = n.replayDecisionWithLaw(n.createInitialSim('warmup', 20780), 78, law)
    assert.equal(decisionState.tick, 78)
    for (let i = 0; i < 240 && afterTap.status === 'playing'; i++) afterTap = n.stepSim(afterTap)
    return [afterTap.status, n.describeRoundOutcome(afterTap)]
  }
  assert.deepEqual(run78('zero_g'), ['hilarious_fail', '滑落桌下'])
  assert.deepEqual(run78('jelly'), ['saved', '擦边留盘'])
  assert.deepEqual(run78('tornado'), ['saved', '飞杯连撞'])

  const finishedCard = card.reduceCard(cardTapped, { type: 'advance', frames: 120 })
  assert.equal(finishedCard.round.status, 'hilarious_fail')
  const swappedCard = card.reduceCard(finishedCard, { type: 'compare', law: 'tornado' })
  const swappedSettled = card.reduceCard(swappedCard, { type: 'advance', frames: 120 })
  assert.equal(swappedSettled.round.status, 'saved')
})

test('a direct cup tap kicks it toward the center without recording a law', () => {
  const n = getCore()
  const initial = getTable().createTableRound({ place: 'desk', goal: 'cup', variant: 0 })
  const next = n.tapToy(initial, 'apple')
  const cup = tableBody(next, 'apple')
  assert.ok(cup.vx * cup.x + cup.vz * cup.z < 0)
  assert.ok(cup.vy > 0)
  assert.equal(next.handMoves, 1)
  assert.equal(next.status, 'playing')
  assert.equal(next.tick, initial.tick)
  assert.equal(next.activeLaws, initial.activeLaws)
  assert.equal(next.tapHistory, initial.tapHistory)
  assert.equal(next.firstTapTick, initial.firstTapTick)
  assert.deepEqual(next.bodies.filter(body => body.id !== 'apple'), initial.bodies.filter(body => body.id !== 'apple'))
  assert.equal(advance(n, next, 240).status, 'saved')
})

test('a tower tap checks its fall and the other toys have distinct direct feedback', () => {
  const n = getCore()
  const source = getTable().createTableRound({ place: 'dorm', goal: 'tower', variant: 0 })
  const tipping = advance(n, source, 21)
  assert.ok(Math.abs(tableBody(tipping, 'blocks').rotZ) >= 0.42)
  const corrected = n.tapToy(tipping, 'blocks')
  assert.ok(Math.abs(tableBody(corrected, 'blocks').rotZ) < 0.42)
  assert.equal(advance(n, corrected, 240).status, 'saved')
  const taps = ['cat', 'piano', 'noodle'].map(id => [id, n.tapToy(source, id)])
  assert.equal(new Set(taps.map(([, round]) => round.sfxText)).size, 3)
  assert.equal(new Set(taps.map(([id, round]) => tableBody(round, id).vy)).size, 3)
  assert.ok(taps.every(([id, round]) => tableBody(round, id).vy > 0 && round.handMoves === 1))
  assert.equal(n.tapToy({ ...source, status: 'saved' }, 'cat').handMoves, undefined)
})

test('a tower put down beyond the edge falls even with zero release speed', () => {
  const n = getCore()
  const initial = getTable().createTableRound({place:'dorm', goal:'tower', variant:0})
  const tower = {...tableBody(initial,'blocks'),x:2.85,z:.68,vx:0,vy:0,vz:0}
  assert.equal(advance(n,n.commitToyDrop(initial,tower),180).status,'hilarious_fail')
})

test('tapping the piano leaves the coffee in danger and a fallen cup cannot be picked up', () => {
  const n = getCore()
  const initial = n.createInitialSim('warmup',20780)
  assert.equal(advance(n,n.tapToy(initial,'piano'),180).status,'hilarious_fail')
  const house = getTable().createTableRound({place:'dorm', goal:'cup', variant:0})
  const fallen = advance(n,house,13)
  const cup = tableBody(fallen,'apple')
  assert.ok(cup.y < 0)
  assert.equal(n.tapToy(fallen,'apple'),fallen)
  assert.equal(n.commitToyDrop(fallen,{...cup,x:0,z:0,y:.23}),fallen)
})

test('putting the cat down safely can finish the luggage round without a law', () => {
  const n = getCore()
  const initial = n.createInitialSim('jelly_party')
  const cat = {...tableBody(initial,'cat'),x:0,z:0,vx:0,vy:0,vz:0}
  assert.equal(advance(n,n.commitToyDrop(initial,cat),240).status,'saved')
})
