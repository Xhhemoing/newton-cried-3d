import type { SubjectId } from '../../shared/newton-core'

export type StageRect = { left: number; top: number; width: number; height: number }
export type StageSurface = 'canvas' | 'preview'
export type TouchPhase = 'start' | 'move' | 'end' | 'cancel'
type TouchPoint = { id: number; x: number; y: number }
type TouchCoordinates = { identifier: number; x?: number; y?: number; clientX?: number; clientY?: number }

function finite(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function readStageTouch(touch: TouchCoordinates, surface: StageSurface, rect: StageRect | null): TouchPoint | null {
  if (!finite(touch.identifier)) return null
  if (surface === 'canvas' && finite(touch.x) && finite(touch.y)) return { id: touch.identifier, x: touch.x, y: touch.y }
  if (!finite(touch.clientX) || !finite(touch.clientY)) return null
  if (surface === 'preview') return { id: touch.identifier, x: touch.clientX, y: touch.clientY }
  return rect && { id: touch.identifier, x: touch.clientX - rect.left, y: touch.clientY - rect.top }
}

type TouchFrame = {
  touches: readonly TouchPoint[]
  changed: readonly TouchPoint[]
  bounds: StageRect | null
  width: number
  free: boolean
  time: number
  hit: (point: TouchPoint) => SubjectId | null | undefined
}
type StageActions = {
  tap: (id: SubjectId) => void
  orbit: (dx: number, dy: number) => void
  zoom: (factor: number) => void
  grab: (id: SubjectId) => void
  drag: (dx: number, dy: number) => void
  twist: (radians: number) => void
  release: (cancel: boolean) => void
}
type TouchPair = readonly [TouchPoint, TouchPoint]
type Gesture = {
  start: TouchPoint
  last: TouchPoint
  startedAt: number
  toy: SubjectId | null | undefined
  free: boolean
  canTap: boolean
  dragging: boolean
  pair: TouchPair | null
}

const TAP_DISTANCE = 8
const TAP_DURATION = 350
const MIN_PINCH_SPAN = 4

function distance(a: TouchPoint, b: TouchPoint) {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

function inside(point: TouchPoint, bounds: StageRect | null) {
  return !bounds || (point.x >= bounds.left && point.x <= bounds.left + bounds.width
    && point.y >= bounds.top && point.y <= bounds.top + bounds.height)
}

function angle(pair: TouchPair) {
  return Math.atan2(pair[1].y - pair[0].y, pair[1].x - pair[0].x)
}

export function createStageGestures(actions: StageActions) {
  let gesture: Gesture | null = null
  const stageContacts = new Set<number>()

  function cancel() {
    stageContacts.clear()
    const held = gesture?.toy
    gesture = null
    if (held) actions.release(true)
  }

  function handlePair(current: Gesture, frame: TouchFrame, moving: boolean) {
    current.canTap = false
    const previous = current.pair
    const a = frame.touches.find(point => point.id === (previous?.[0] ?? current.last).id)
    const b = previous && frame.touches.find(point => point.id === previous[1].id)
    if (!previous || !a || !b) {
      const first = a ?? frame.touches[0]
      const second = frame.touches.find(point => point.id !== first.id)
      current.pair = second ? [first, second] : null
      return
    }
    const next = [a, b] as const
    current.pair = next
    if (!moving) return
    const before = distance(...previous)
    const after = distance(...next)
    if (Math.min(before, after) < MIN_PINCH_SPAN) return
    if (current.free && current.toy) {
      if (frame.width > 0) {
        const dx = (a.x + b.x - previous[0].x - previous[1].x) / (2 * frame.width)
        const dy = (a.y + b.y - previous[0].y - previous[1].y) / (2 * frame.width)
        if (dx || dy) actions.drag(dx, dy)
      }
      const delta = angle(next) - angle(previous)
      const turn = Math.atan2(Math.sin(delta), Math.cos(delta))
      if (turn) actions.twist(turn)
    } else if (before !== after) actions.zoom(after / before)
  }

  function handleSingle(current: Gesture, point: TouchPoint, frame: TouchFrame, moving: boolean) {
    if (current.pair || current.last.id !== point.id) {
      current.canTap = false
      current.dragging = true
      current.pair = null
      current.last = point
      return
    }
    if (!inside(point, frame.bounds)) current.canTap = false
    if (distance(current.start, point) > TAP_DISTANCE) {
      current.canTap = false
      current.dragging = true
    }
    if (!moving || !frame.width) return
    const dx = (point.x - current.last.x) / frame.width
    const dy = (point.y - current.last.y) / frame.width
    if (current.toy && (current.free || current.dragging)) {
      current.last = point
      if (dx || dy) actions.drag(dx, dy)
    } else if (current.dragging) {
      current.last = point
      if (dx || dy) actions.orbit(dx, dy)
    }
  }

  function consume(phase: TouchPhase, sample: TouchFrame) {
    if (phase === 'cancel' || (gesture && gesture.free !== sample.free)) {
      cancel()
      return
    }
    // View and Canvas report all visible contacts, including fingers on other controls.
    if (phase === 'start') {
      for (const point of sample.changed) {
        if (inside(point, sample.bounds)) stageContacts.add(point.id)
      }
    }
    const touches = sample.touches.filter(point => stageContacts.has(point.id))
    const changed = sample.changed.filter(point => stageContacts.has(point.id))
    if (phase === 'end' && sample.changed.length && !changed.length) return
    const outsideContact = touches.length < sample.touches.length
    const frame = { ...sample, touches, changed }
    if (phase === 'end') {
      for (const id of stageContacts) {
        if (!touches.some(point => point.id === id)) stageContacts.delete(id)
      }
    }
    if (!gesture) {
      if (phase !== 'start') return
      const start = frame.touches[0]
      if (!start || !inside(start, frame.bounds)) return
      const toy = frame.touches.length === 1 && (frame.free || !outsideContact) ? frame.hit(start) : null
      gesture = {
        start, last: start, startedAt: frame.time, toy, free: frame.free,
        canTap: frame.touches.length === 1 && !outsideContact, dragging: false, pair: null,
      }
      if (toy) actions.grab(toy)
    }
    const current = gesture
    if (outsideContact) current.canTap = false
    if (!current.free && current.toy && (outsideContact || frame.touches.length > 1)) {
      current.toy = null
      actions.release(true)
    }
    if (frame.touches.length > 1) {
      handlePair(current, frame, phase === 'move')
    } else if (frame.touches.length === 1) {
      handleSingle(current, frame.touches[0], frame, phase === 'move')
    } else if (phase === 'end') {
      const released = frame.changed.find(point => point.id === current.last.id)
        ?? (current.pair && frame.changed.find(point => current.pair?.some(member => member.id === point.id)))
      gesture = null
      if (current.toy) {
        const onStage = released && inside(released, frame.bounds)
        if (onStage) handleSingle(current, released, frame, true)
        const commit = onStage && (current.free || current.dragging)
        actions.release(!commit)
        if (onStage && !commit && current.canTap && frame.time - current.startedAt <= TAP_DURATION) {
          actions.tap(current.toy)
        }
      }
    }
  }

  function handle(phase: TouchPhase, sample: TouchFrame) {
    consume(phase, sample)
    if (!gesture) stageContacts.clear()
    return gesture !== null
  }

  return { handle, cancel }
}
