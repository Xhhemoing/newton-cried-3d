const assert = require('node:assert/strict')
const { registerHooks } = require('node:module')
const { test } = require('node:test')

const imports = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.includes('/pages/index/') && /^\.[./]+[\w/-]+$/.test(specifier)) {
      return nextResolve(specifier + '.ts', context)
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    return nextLoad(url, url.endsWith('.ts') ? { ...context, format: 'module-typescript' } : context)
  },
})
const base = '../card-app/src/pages/index/'
const { INITIAL_VIEW, orbitView, zoomView, poseAxes, displayPosition, projectWorld, projectedPose, hitPreview } = require(base + 'toybox-camera.ts')
const { createFreePlay, beginToyGrab, moveToyGrab, endToyGrab, flipToy, stepFreePlay, stopFreePlay,
  twistToyGrab } = require(base + 'toybox-play.ts')
const { createInitialSim, stepSim, commitToyDrop } = require('../card-app/src/shared/newton-core.ts')
const { beginChallengeGrab, moveChallengeGrab, challengeDropPose } = require(base + 'toybox-hands.ts')
imports.deregister()

const closeTo = (actual, expected, epsilon = 1e-6) => assert.ok(Math.abs(actual - expected) <= epsilon,
  `${actual} is outside ${epsilon} of ${expected}`)

test('orbit projects the back of the table and clamps past the overhead and underside limits', () => {
  const point = { x: 1, y: 0, z: 0 }
  assert.ok(projectWorld(point, INITIAL_VIEW).x > 0)
  const back = orbitView(INITIAL_VIEW, -0.5, 0)
  assert.ok(projectWorld(point, back).x < 0)
  assert.ok(orbitView(INITIAL_VIEW, 0, 50).pitch < Math.PI / 2)
  assert.ok(orbitView(INITIAL_VIEW, 0, -50).pitch > 0)
  assert.equal(zoomView(INITIAL_VIEW, NaN), INITIAL_VIEW)
  assert.ok(zoomView(INITIAL_VIEW, 50).zoom < 2)
})

test('preview hit follows the orbit and zoom on a rectangular stage', () => {
  const source = createInitialSim('warmup')
  const apple = { ...source.bodies.find(pose => pose.id === 'apple'), x: 1.4, z: 0.7 }
  const view = { ...zoomView(orbitView(INITIAL_VIEW, -0.3, 0.08), 1.3), aspect: 0.8 }
  const { left: x, top: y } = projectedPose(apple, view)
  const width = 400
  const height = 320
  assert.equal(hitPreview([apple], parseFloat(x) * width / 100, parseFloat(y) * height / 100, width, height, view), 'apple')
  const before = projectedPose(apple, INITIAL_VIEW)
  assert.equal(hitPreview([apple], parseFloat(before.left) * width / 100, parseFloat(before.top) * height / 100, width, height, view), undefined)
  assert.equal(hitPreview([apple], NaN, NaN, width, height, view), undefined)
})

test('a positive world Z tilt moves the top of the preview toy to the left', () => {
  const [cat] = createInitialSim('warmup').bodies
  const tilted = projectedPose({ ...cat, rotZ: 0.4 }, INITIAL_VIEW)
  const cssAngle = Number(tilted.transform.match(/rotate\(([-\d.]+)rad\)/)?.[1])
  assert.ok(cssAngle < 0)
})

test('grab follows the rotated camera, release collides with the tray and keeps the challenge unchanged', () => {
  const source = createInitialSim('warmup')
  const original = structuredClone(source)
  const play = createFreePlay(source)
  const cat = () => play.state.bodies.find(pose => pose.id === 'cat')
  const view = orbitView(INITIAL_VIEW, -0.25, 0)
  const before = { ...cat() }
  beginToyGrab(play, 'cat')
  moveToyGrab(play, view, 0.045, -0.07, 100)
  const held = { ...cat() }
  assert.ok(held.y > before.y + 0.2)
  assert.ok(Math.abs(held.z - before.z) > 0.2)
  stepFreePlay(play, 1 / 60)
  assert.deepEqual(cat(), held)
  endToyGrab(play, false, 100)
  stepFreePlay(play, 1 / 60)
  assert.ok(cat().y > held.y)
  for (let i = 0; i < 240; i++) stepFreePlay(play, 1 / 60)
  closeTo(cat().y, before.y)
  closeTo(cat().vy, 0)
  assert.deepEqual(source, original)
})

test('flips change the visible pose and clearing motion ends the grip without a throw', () => {
  const play = createFreePlay(createInitialSim('warmup'))
  const object = () => play.state.bodies.find(pose => pose.id === 'blocks')
  const before = projectedPose(object(), INITIAL_VIEW).transform
  flipToy(play, 'blocks', INITIAL_VIEW)
  for (let i = 0; i < 8; i++) stepFreePlay(play, 1 / 60)
  assert.notEqual(projectedPose(object(), INITIAL_VIEW).transform, before)
  assert.ok(Math.abs(object().rotX) > 0.5)
  beginToyGrab(play, 'blocks')
  const grabbed = projectedPose(object(), INITIAL_VIEW).transform
  twistToyGrab(play, INITIAL_VIEW, Math.PI / 2)
  assert.notEqual(projectedPose(object(), INITIAL_VIEW).transform, grabbed)
  moveToyGrab(play, INITIAL_VIEW, 0.02, -0.05, 100)
  stopFreePlay(play)
  const height = object().y
  moveToyGrab(play, INITIAL_VIEW, 0.02, -0.05, 120)
  assert.equal(object().y, height)
  assert.equal(object().vy, 0)
  stepFreePlay(play, 1 / 60)
  assert.ok(object().y < height)
})

test('dragging and throwing upward leave the toy recoverable in the default view', () => {
  const play = createFreePlay(createInitialSim('warmup'))
  const highZoom = zoomView(INITIAL_VIEW, 5)
  const cat = () => play.state.bodies.find(pose => pose.id === 'cat')
  beginToyGrab(play, 'cat')
  moveToyGrab(play, highZoom, 1, -1, 100)
  const heldHeight = cat().y
  endToyGrab(play, false, 100)
  for (let frame = 0; frame < 180; frame++) {
    stepFreePlay(play, 1 / 60)
    assert.ok(cat().y <= heldHeight)
  }
  const { left, top } = projectedPose(cat(), INITIAL_VIEW)
  assert.ok(parseFloat(left) > 0 && parseFloat(left) < 100)
  assert.ok(parseFloat(top) > 0 && parseFloat(top) < 100)
})

test('a flip turns each upright toy upside down and a second flip returns its original orientation', () => {
  const play = createFreePlay(createInitialSim('warmup'))
  const view = orbitView(INITIAL_VIEW, .31, -.05)
  for (const body of play.state.bodies) {
    const up = () => poseAxes(play.state.bodies.find(next => next.id === body.id)).up
    const initial = up()
    for (const expected of [-1, 1]) {
      flipToy(play, body.id, view)
      for (let frame = 0; frame < 240; frame++) stepFreePlay(play, 1 / 60)
      closeTo(up().y, initial.y * expected)
    }
  }
})

test('a second flip tapped mid-air completes both half turns', () => {
  const play = createFreePlay(createInitialSim('warmup'))
  const getUp = () => poseAxes(play.state.bodies.find(body => body.id === 'blocks')).up
  const before = getUp()
  flipToy(play, 'blocks', INITIAL_VIEW)
  for (let frame = 0; frame < 6; frame++) stepFreePlay(play, 1 / 60)
  flipToy(play, 'blocks', INITIAL_VIEW)
  for (let frame = 0; frame < 240; frame++) stepFreePlay(play, 1 / 60)
  const after = getUp()
  closeTo(after.x * before.x + after.y * before.y + after.z * before.z, 1)
})

test('challenge grip follows the rotated tabletop in preview without changing the round', () => {
  const initial = createInitialSim('warmup')
  const original = structuredClone(initial)
  const view = zoomView(orbitView(INITIAL_VIEW, -.23, .09), 1.12)
  const grab = beginChallengeGrab(initial, 'apple')
  const pressed = grab.state.bodies[1]
  assert.notEqual(pressed.squashY, initial.bodies[1].squashY)
  assert.equal(grab.state.tick, initial.tick)
  assert.equal(grab.state.handMoves, initial.handMoves)
  const before = projectWorld(pressed, view)
  moveChallengeGrab(grab, view, -.04, -.08, 100)
  const held = grab.state.bodies[1]
  const after = projectWorld(held, view)
  closeTo(held.y, pressed.y)
  closeTo(after.x - before.x, -.04)
  closeTo(after.y - before.y, -.08)
  assert.deepEqual(initial, original)
  assert.equal(challengeDropPose(beginChallengeGrab(initial, 'apple'), 100), null)
})

test('a captured challenge drop survives same-round patch attachment and the solver decides the outcome', () => {
  const initial = createInitialSim('warmup')
  function drop(dx) {
    const grab = beginChallengeGrab(initial, 'apple')
    moveChallengeGrab(grab, INITIAL_VIEW, dx, 0, 100)
    const pose = challengeDropPose(grab, 110)
    const settledFinger = challengeDropPose(grab, 220)
    const replaced = { ...initial, chainCount: 2 }
    assert.equal(settledFinger.vx, 0)
    const next = commitToyDrop(replaced, pose)
    assert.equal(next.chainCount, 2)
    assert.equal(next.handMoves, 1)
    assert.equal(next.tick, initial.tick)
    assert.equal(next.tapHistory, initial.tapHistory)
    closeTo(next.bodies[1].x, grab.state.bodies[1].x)
    assert.equal(Math.sign(next.bodies[1].vx), Math.sign(dx))
    let result = next
    for (let i = 0; i < 240; i++) result = stepSim(result)
    return result.status
  }
  assert.equal(drop(-.22), 'saved')
  assert.equal(drop(.14), 'hilarious_fail')
})

test('a low-angle drag past the rim previews the actual physical release point', () => {
  const view = {...INITIAL_VIEW,pitch:.21}
  const grab = beginChallengeGrab(createInitialSim('warmup'),'blocks')
  const pos = () => projectWorld(displayPosition(grab.state.bodies[grab.index]),view)
  const before = pos()
  moveChallengeGrab(grab,view,0,.20,100)
  closeTo(pos().y-before.y,.20)
  const released = challengeDropPose(grab,220)
  closeTo(released.z,displayPosition(released).z)
})
