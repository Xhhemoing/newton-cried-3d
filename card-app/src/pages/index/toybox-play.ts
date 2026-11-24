import type { SimStepState, SubjectId } from '../../shared/newton-core'
import { cameraAxes, clamp, displayPosition, poseAxes, toyLift, worldDrag } from './toybox-camera'
import type { Point3, ToyboxView, ToyPose } from './toybox-camera'

type FreePose = ToyPose & { freeBounds: Readonly<Point3> }
type FreeState = Omit<SimStepState, 'bodies'> & { bodies: FreePose[] }
type Grab = { id: SubjectId; speed: Point3; movedAt: number | null }
type Spin = { axis: Point3; remaining: number }
type FreePlay = { state: FreeState; grab: Grab | null; spin: Partial<Record<SubjectId, Spin>> }

const bounds = {
  cat: { x: 0.55, y: 0.62, z: 0.4 },
  piano: { x: 0.62, y: 0.22, z: 0.49 },
  noodle: { x: 0.44, y: 0.20, z: 0.44 },
  blocks: { x: 0.36, y: 0.38, z: 0.22 },
}
const propBounds = {
  coffee: { x: 0.24, y: 0.43, z: 0.24 },
  phone_case: { x: 0.22, y: 0.37, z: 0.12 },
  cat_can: { x: 0.32, y: 0.23, z: 0.32 },
  luggage: { x: 0.25, y: 0.40, z: 0.16 },
}
const MAX_CENTER_HEIGHT = 2.35

function trayRadius(body: FreePose) {
  return 2.48 - Math.max(body.freeBounds.x, body.freeBounds.z) * body.scale * body.squashX * 0.67
}

// The toy centers are kept over the tray, even when a previous challenge dropped a toy.
function confine(body: FreePose, bounce: boolean) {
  const radius = trayRadius(body)
  const distance = Math.hypot(body.x, body.z)
  if (distance > radius) {
    const nx = body.x / distance, nz = body.z / distance
    body.x = nx * radius
    body.z = nz * radius
    const outward = bounce ? Math.max(0, body.vx * nx + body.vz * nz) : 0
    body.vx -= 1.42 * outward * nx
    body.vz -= 1.42 * outward * nz
  }
  if (body.y > MAX_CENTER_HEIGHT) {
    body.y = MAX_CENTER_HEIGHT
    body.vy = Math.min(0, body.vy)
  }
  body.y -= Math.min(0, toyLift(body))
}

export function createFreePlay(source: SimStepState): FreePlay {
  const bodies = source.bodies.map(body => {
    const freeBounds = body.id === 'apple' ? propBounds[source.propSkin] : bounds[body.id]
    const { up } = poseAxes(body)
    const start = displayPosition(body)
    const pivot = freeBounds.y * body.scale * body.squashY
    const copy = { ...body, freeBounds, vx: 0, vy: 0, vz: 0,
      x: start.x + up.x * pivot, y: start.y + up.y * pivot, z: start.z + up.z * pivot }
    confine(copy, false)
    return copy
  })
  return { state: { ...source, bodies }, grab: null, spin: {} }
}

function changeToy(play: FreePlay, id: SubjectId, change: (body: FreePose) => void) {
  play.state = { ...play.state, bodies: play.state.bodies.map(body => {
    if (body.id !== id) return body
    const changed = { ...body }
    change(changed)
    return changed
  }) }
}

export function beginToyGrab(play: FreePlay, id: SubjectId) {
  if (play.grab || !play.state.bodies.some(body => body.id === id)) return
  play.grab = { id, speed: { x: 0, y: 0, z: 0 }, movedAt: null }
  delete play.spin[id]
  changeToy(play, id, body => {
    body.vx = body.vy = body.vz = 0
    body.y += 0.08
  })
}

export function moveToyGrab(play: FreePlay, view: ToyboxView, dx: number, dy: number, now: number) {
  const grab = play.grab
  if (!grab || !Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) return
  const shift = worldDrag(view, dx, dy)
  const elapsed = grab.movedAt === null ? 1 / 60 : clamp((now - grab.movedAt) / 1000, 1 / 120, 0.1)
  changeToy(play, grab.id, body => {
    const before = { x: body.x, y: body.y, z: body.z }
    body.x += shift.x
    body.y += shift.y
    body.z += shift.z
    confine(body, false)
    grab.speed = {
      x: clamp((body.x - before.x) / elapsed, -4.8, 4.8),
      y: clamp((body.y - before.y) / elapsed, -4.5, 4.5),
      z: clamp((body.z - before.z) / elapsed, -4.8, 4.8),
    }
  })
  grab.movedAt = now
}

export function endToyGrab(play: FreePlay, cancel: boolean, now: number) {
  const grab = play.grab
  play.grab = null
  if (!grab || cancel || grab.movedAt === null || now - grab.movedAt > 100) return
  changeToy(play, grab.id, body => {
    body.vx = grab.speed.x * 0.72
    body.vy = grab.speed.y * 0.72
    body.vz = grab.speed.z * 0.72
  })
}

// Apply a world-axis rotation to the current orientation and extract Three's XYZ Euler angles.
function rotateToy(body: FreePose, axis: Point3, radians: number) {
  const c = Math.cos(radians), s = Math.sin(radians)
  const axes = poseAxes(body)
  function rotate(p: Point3) {
    const dot = (p.x * axis.x + p.y * axis.y + p.z * axis.z) * (1 - c)
    return {
      x: p.x * c + (axis.y * p.z - axis.z * p.y) * s + axis.x * dot,
      y: p.y * c + (axis.z * p.x - axis.x * p.z) * s + axis.y * dot,
      z: p.z * c + (axis.x * p.y - axis.y * p.x) * s + axis.z * dot,
    }
  }
  const right = rotate(axes.right), up = rotate(axes.up), front = rotate(axes.front)
  body.rotY = Math.asin(clamp(front.x, -1, 1))
  if (Math.abs(front.x) < 0.9999999) {
    body.rotX = Math.atan2(-front.y, front.z)
    body.rotZ = Math.atan2(-up.x, right.x)
  } else {
    body.rotX = Math.atan2(up.z, up.y)
    body.rotZ = 0
  }
}

export function twistToyGrab(play: FreePlay, view: ToyboxView, radians: number) {
  if (!play.grab || !Number.isFinite(radians) || radians === 0) return
  changeToy(play, play.grab.id, body => {
    rotateToy(body, cameraAxes(view).front, -radians)
    confine(body, false)
  })
}

export function flipToy(play: FreePlay, id: SubjectId, view: ToyboxView) {
  const axis = cameraAxes(view).right
  changeToy(play, id, body => {
    if (play.grab?.id === id) {
      rotateToy(body, axis, Math.PI)
      confine(body, false)
    } else {
      body.vy = Math.max(body.vy, 3.7)
      const spin = play.spin[id]
      if (spin) spin.remaining += Math.PI
      else play.spin[id] = { axis, remaining: Math.PI }
    }
  })
}

export function stopFreePlay(play: FreePlay) {
  play.grab = null
  play.spin = {}
  play.state = { ...play.state, bodies: play.state.bodies.map(body => ({ ...body, vx: 0, vy: 0, vz: 0 })) }
}

export function stepFreePlay(play: FreePlay, dt: number) {
  let changed = false
  const bodies = play.state.bodies.map(body => {
    const airborne = toyLift(body) > 0.0001
    const spin = play.spin[body.id]
    if (body.id === play.grab?.id || (!airborne && !body.vx && !body.vy && !body.vz && !spin)) return body

    changed = true
    const next = { ...body }
    if (airborne || next.vy) next.vy -= 10.8 * dt
    next.x += next.vx * dt
    next.y += next.vy * dt
    next.z += next.vz * dt
    if (spin) {
      const turn = Math.min(spin.remaining, 9.5 * dt)
      rotateToy(next, spin.axis, turn)
      spin.remaining -= turn
      if (spin.remaining === 0) delete play.spin[body.id]
    }
    const onTray = toyLift(next) <= 0
    confine(next, true)
    if (onTray && next.vy < 0) next.vy = next.vy < -0.85 ? next.vy * -0.31 : 0
    const damping = onTray ? 0.82 : 0.99
    next.vx = Math.abs(next.vx) < 0.025 ? 0 : next.vx * damping
    next.vz = Math.abs(next.vz) < 0.025 ? 0 : next.vz * damping
    return next
  })
  play.state = { ...play.state, tick: play.state.tick + 1, bodies: changed ? bodies : play.state.bodies }
}
