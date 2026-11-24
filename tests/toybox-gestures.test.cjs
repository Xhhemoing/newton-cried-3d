const assert = require('node:assert/strict')
const { test } = require('node:test')
const { createStageGestures, readStageTouch } = require('../card-app/src/pages/index/touch-gestures.ts')

const point = (id, x, y) => ({ id, x, y })
const bounds = { left: 14, top: 80, width: 200, height: 180 }

function stage(free = false, toy = 'cat') {
  const calls = []
  const gesture = createStageGestures({
    tap: id => calls.push(['tap', id]),
    orbit: (x, y) => calls.push(['orbit', x, y]),
    zoom: ratio => calls.push(['zoom', ratio]),
    grab: id => calls.push(['grab', id]),
    drag: (x, y) => calls.push(['drag', x, y]),
    twist: radians => calls.push(['twist', radians]),
    release: cancel => calls.push(['release', cancel]),
  })
  let time = 0
  const send = (phase, touches, changed = touches) => {
    gesture.handle(phase, { touches, changed, bounds, width: bounds.width, free, time: time += 16, hit: () => toy })
  }
  return { send, calls, cancel: gesture.cancel }
}

test('reads Canvas-local points once and View coordinates from the viewport', () => {
  const touch = { identifier: 0, x: 30, y: 45, clientX: 44, clientY: 125, pageY: 170 }
  assert.deepEqual(readStageTouch(touch, 'canvas', bounds), point(0, 30, 45))
  assert.deepEqual(readStageTouch(touch, 'preview', bounds), point(0, 44, 125))
  assert.deepEqual(readStageTouch({ identifier: 2, clientX: 58, clientY: 115 }, 'canvas', bounds), point(2, 44, 35))
  assert.equal(readStageTouch({ identifier: 2, pageX: 58, pageY: 120 }, 'preview', bounds), null)
})

test('a quick single touch still launches its toy exactly once', () => {
  const { send, calls } = stage()
  send('start', [point(7, 102, 142)])
  send('move', [point(7, 104, 142)])
  send('end', [], [point(7, 104, 141)])
  send('end', [], [point(7, 104, 141)])
  assert.deepEqual(calls, [['grab', 'cat'], ['release', true], ['tap', 'cat']])
})

test('empty stage orbit uses cumulative movement', () => {
  const { send, calls } = stage(false, null)
  send('start', [point(1, 100, 100)])
  send('move', [point(1, 104, 100)])
  send('move', [point(1, 110, 100)])
  send('move', [point(1, 100, 100)])
  send('end', [], [point(1, 100, 100)])
  assert.deepEqual(calls, [['orbit', .05, 0], ['orbit', -.05, 0]])
})

test('crossing an edge and cancelling roll back while a distant in-bounds lift commits a drag', () => {
  const { send, calls } = stage()
  for (const [phase, end] of [
    ['move', point(1, 13, 100)],
    ['cancel', point(1, 15, 100)],
    ['end', point(1, 70, 100)],
  ]) {
    send('start', [point(1, 15, 100)])
    if (phase === 'end') send('end', [], [end])
    else {
      send(phase, [end])
      send('end', [], [point(1, 15, 100)])
    }
  }
  assert.deepEqual(calls, [
    ['grab', 'cat'], ['release', true],
    ['grab', 'cat'], ['release', true],
    ['grab', 'cat'], ['drag', .275, 0], ['release', false],
  ])
})

test('two fingers zoom with stable identifiers, then hand off to a survivor without a jump', () => {
  const { send, calls } = stage()
  send('start', [point(1, 100, 160)])
  send('start', [point(1, 100, 160), point(2, 120, 160)], [point(2, 120, 160)])
  send('move', [point(2, 140, 160), point(1, 100, 160)])
  send('end', [point(2, 140, 160)], [point(1, 100, 160)])
  send('move', [point(2, 160, 160)])
  send('end', [], [point(2, 160, 160)])
  assert.deepEqual(calls, [['grab', 'cat'], ['release', true], ['zoom', 2], ['orbit', .1, 0]])
})

test('an unrelated contact does not launch or redirect the tracked touch', () => {
  const { send, calls } = stage()
  send('start', [point(7, 100, 150)])
  send('end', [point(7, 100, 150)], [point(8, 100, 150)])
  send('end', [], [point(7, 100, 150)])
  assert.deepEqual(calls, [['grab', 'cat'], ['release', true], ['tap', 'cat']])
})

test('free mode grabs immediately and sends small movements before the release', () => {
  const { send, calls } = stage(true)
  send('start', [point(4, 100, 150)])
  assert.deepEqual(calls, [['grab', 'cat']])
  send('move', [point(4, 104, 152)])
  send('end', [], [point(4, 104, 152)])
  assert.deepEqual(calls, [['grab', 'cat'], ['drag', .02, .01], ['release', false]])
})

test('two-finger twist follows a grabbed model and interruption cancels its release impulse', () => {
  const { send, calls, cancel } = stage(true)
  send('start', [point(4, 100, 160)])
  send('start', [point(4, 100, 160), point(5, 140, 160)])
  send('move', [point(5, 120, 180), point(4, 120, 140)])
  cancel()
  send('end', [], [point(4, 120, 140), point(5, 120, 180)])
  assert.deepEqual(calls, [['grab', 'cat'], ['twist', Math.PI / 2], ['release', true]])
})

test('spreading and rotating fingers while holding a toy moves and turns it without zooming the camera', () => {
  const { send, calls } = stage(true)
  send('start', [point(4, 90, 160)])
  send('start', [point(4, 90, 160), point(5, 130, 160)], [point(5, 130, 160)])
  send('move', [point(5, 118, 180), point(4, 118, 120)])
  assert.deepEqual(calls, [['grab', 'cat'], ['drag', .04, -.05], ['twist', Math.PI / 2]])
})

test('free mode background drag orbits without grabbing or launching', () => {
  const { send, calls } = stage(true, null)
  send('start', [point(4, 100, 150)])
  send('move', [point(4, 120, 152)])
  send('end', [], [point(4, 120, 152)])
  assert.deepEqual(calls, [['orbit', .1, .01]])
})
 
test('an off-stage finger is never adopted after the stage contact releases', () => {
  const { send, calls } = stage(true)
  const outside = point(9, 300, 280)
  send('start', [point(4, 130, 170)])
  send('move', [outside, point(4, 134, 172)], [point(4, 134, 172)])
  send('end', [outside], [point(4, 134, 172)])
  assert.deepEqual(calls, [['grab', 'cat'], ['drag', .02, .01], ['release', false]])
  send('start', [outside, point(5, 110, 170)], [point(5, 110, 170)])
  assert.deepEqual(calls.at(-1), ['grab', 'cat'])
})

test('an off-stage second contact cannot convert into a challenge tap', () => {
  const { send, calls } = stage()
  const outside = point(9, 300, 280)
  const onStage = point(3, 130, 170)
  send('start', [onStage])
  send('end', [outside], [onStage])
  assert.deepEqual(calls, [['grab', 'cat'], ['release', true]])
  calls.length = 0
  send('start', [onStage])
  send('end', [], [onStage])
  assert.deepEqual(calls, [['grab', 'cat'], ['release', true], ['tap', 'cat']])
})

test('challenge dragging moves the selected toy and commits only inside the stage', () => {
  const { send, calls } = stage(false, 'apple')
  const start = point(4, 100, 150)
  send('start', [start])
  assert.deepEqual(calls, [['grab', 'apple']])
  send('move', [point(4, 104, 151)])
  send('move', [point(4, 128, 156)])
  send('end', [], [point(4, 140, 162)])
  assert.deepEqual(calls, [['grab', 'apple'], ['drag', .14, .03], ['drag', .06, .03], ['release', false]])
  calls.length = 0
  send('start', [start])
  send('move', [point(4, 130, 150)])
  send('end', [], [point(4, 220, 150)])
  assert.deepEqual(calls, [['grab', 'apple'], ['drag', .15, 0], ['release', true]])
})

test('challenge hold, cancellation and old touch-end do not commit an action', () => {
  const { send, calls, cancel } = stage()
  const a = point(8, 100, 150)
  send('start', [a])
  for (let i = 0; i < 25; i++) send('move', [a])
  send('end', [], [a])
  send('start', [a])
  send('move', [point(8, 120, 150)])
  cancel()
  send('start', [point(9, 100, 150)])
  send('end', [], [point(8, 120, 150)])
  send('end', [], [point(9, 100, 150)])
  assert.deepEqual(calls, [
    ['grab', 'cat'], ['release', true],
    ['grab', 'cat'], ['drag', .1, 0], ['release', true],
    ['grab', 'cat'], ['release', true], ['tap', 'cat'],
  ])
})
