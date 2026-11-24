import { createInitialSim } from '../../shared/newton-core'
import type { BodyPose } from '../../shared/newton-core'

export type Point3 = { x: number; y: number; z: number }
export type ToyPose = BodyPose & { freeBounds?: Readonly<Point3> }
export type ToyboxView = Readonly<{ yaw: number; pitch: number; zoom: number; aspect: number }>

export const WORLD_WIDTH = 6.05
export const TARGET_Y = 0.62
export const INITIAL_VIEW: ToyboxView = { yaw: 0, pitch: 0.59, zoom: 1, aspect: 1 }
const floorHeight = Object.fromEntries(createInitialSim('warmup').bodies.map(b => [b.id, b.y]))
const spriteSize = {
  cat: [0.26, 0.28], apple: [0.12, 0.13], piano: [0.2, 0.21], noodle: [0.2, 0.21], blocks: [0.16, 0.19],
}

export function clamp(n: number, low: number, high: number) {
  return Math.min(high, Math.max(low, n))
}

export function orbitView(view: ToyboxView, dx: number, dy: number): ToyboxView {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return view
  const turn = 2 * Math.PI
  const yaw = (view.yaw - turn * dx) % turn
  const pitch = clamp(view.pitch + 2.6 * dy, 0.21, 1.33)
  return yaw === view.yaw && pitch === view.pitch ? view : { ...view, yaw, pitch }
}

export function zoomView(view: ToyboxView, factor: number): ToyboxView {
  if (!Number.isFinite(factor) || factor <= 0) return view
  const zoom = clamp(view.zoom * factor, 0.72, 1.65)
  return zoom === view.zoom ? view : { ...view, zoom }
}

export function cameraAxes(view: ToyboxView) {
  const a = Math.sin(view.yaw), b = Math.cos(view.yaw)
  const s = Math.sin(view.pitch), c = Math.cos(view.pitch)
  return {
    right: { x: b, y: 0, z: -a },
    up: { x: -a * s, y: c, z: -b * s },
    front: { x: a * c, y: s, z: b * c },
  }
}

export function poseAxes(body: BodyPose) {
  const a = Math.cos(body.rotX), b = Math.sin(body.rotX)
  const c = Math.cos(body.rotY), d = Math.sin(body.rotY)
  const e = Math.cos(body.rotZ), f = Math.sin(body.rotZ)
  return {
    right: { x: c * e, y: a * f + b * e * d, z: b * f - a * e * d },
    up: { x: -c * f, y: a * e - b * f * d, z: b * e + a * f * d },
    front: { x: d, y: -b * c, z: a * c },
  }
}

function dot(a: Point3, b: Point3) { return a.x * b.x + a.y * b.y + a.z * b.z }

export function projectWorld(point: Point3, view: ToyboxView) {
  const { right, up, front } = cameraAxes(view)
  const centered = { ...point, y: point.y - TARGET_Y }
  const scale = view.zoom / WORLD_WIDTH
  return { x: dot(centered, right) * scale, y: -dot(centered, up) * scale, depth: dot(centered, front) }
}

export function worldDrag(view: ToyboxView, dx: number, dy: number): Point3 {
  const { right, up } = cameraAxes(view)
  const scale = WORLD_WIDTH / view.zoom
  return {
    x: scale * (dx * right.x - dy * up.x),
    y: scale * -dy * up.y,
    z: scale * (dx * right.z - dy * up.z),
  }
}

export function displayPosition(body: ToyPose): Point3 {
  if (body.freeBounds) {
    const { up } = poseAxes(body)
    const pivot = body.freeBounds.y * body.scale * body.squashY
    return { x: body.x - up.x * pivot, y: body.y - up.y * pivot, z: body.z - up.z * pivot }
  }
  // Compress extreme heights only. The tabletop coordinates also determine the release point.
  const project = (n: number, limit: number) => Math.abs(n) <= limit ? n :
    Math.sign(n) * (limit + 0.30 * Math.tanh((Math.abs(n) - limit) / 1.6))
  return {
    x: body.x,
    y: project(body.y - floorHeight[body.id] * body.scale, 2.12),
    z: body.z,
  }
}

export function toyLift(body: ToyPose) {
  if (!body.freeBounds) return body.y - floorHeight[body.id] * body.scale
  const { right, up, front } = poseAxes(body)
  const b = body.freeBounds
  const clearance = Math.abs(right.y) * b.x * body.squashX + Math.abs(up.y) * b.y * body.squashY +
    Math.abs(front.y) * b.z * body.squashX
  return body.y - clearance * body.scale
}

function spriteLayout(body: ToyPose, view: ToyboxView) {
  const { up, right, front } = cameraAxes(view)
  const local = poseAxes(body)
  const position = projectWorld(displayPosition(body), view)
  const heading = dot(local.front, front)
  const ux = dot(local.up, right), uy = dot(local.up, up)
  const rotation = Math.atan2(ux, uy)
  const vertical = Math.max(0.35, Math.hypot(ux, uy) / Math.cos(INITIAL_VIEW.pitch))
  const [width, height] = spriteSize[body.id]
  const depth = body.freeBounds ? projectWorld(body, view).depth : position.depth
  return {
    ...position, depth, rotation, width, height,
    sx: view.zoom * body.scale * body.squashX * (0.46 + 0.54 * Math.min(1, Math.abs(heading) / Math.cos(INITIAL_VIEW.pitch))),
    sy: view.zoom * body.scale * body.squashY * vertical,
  }
}

function percent(n: number) { return (n * 100) + '%' }

export function projectedPose(body: ToyPose, view = INITIAL_VIEW) {
  const p = spriteLayout(body, view)
  return {
    left: percent(0.5 + p.x), top: percent(0.5 + p.y / view.aspect),
    width: percent(p.width), height: percent(p.height / view.aspect),
    zIndex: 300 + Math.round(p.depth * 50),
    transform: `translate(-50%,-75%) rotate(${p.rotation}rad) scale(${p.sx},${p.sy})`,
  }
}

export function projectedTray(view = INITIAL_VIEW) {
  const middle = projectWorld({ x: 0, y: 0, z: 0 }, view)
  const width = 5.08 * view.zoom / WORLD_WIDTH
  return {
    left: '50%', top: percent(0.5 + middle.y / view.aspect),
    width: percent(width), height: percent(width * Math.sin(view.pitch) / view.aspect),
    transform: 'translate(-50%,-50%)',
  }
}

export function hitPreview(bodies: readonly ToyPose[], x: number, y: number, width: number, height: number, view: ToyboxView) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > width || y > height || !width || !height) return
  let hit: ToyPose['id'] | undefined
  let nearest = -Infinity
  for (const body of bodies) {
    const pose = spriteLayout(body, view)
    if (pose.depth < nearest) continue
    const dx = (x - width / 2) / width - pose.x
    const dy = (y - height / 2) / width - pose.y
    const c = Math.cos(pose.rotation), s = Math.sin(pose.rotation)
    const localX = (dx * c + dy * s) / pose.sx
    const localY = (-dx * s + dy * c) / pose.sy
    if (Math.abs(localX) > pose.width / 2 || localY < -pose.height * 0.75 || localY > pose.height * 0.25) continue
    hit = body.id
    nearest = pose.depth
  }
  return hit
}
