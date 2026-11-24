import { canMoveToy } from '../../shared/newton-core'
import type { BodyPose, SimStepState, SubjectId } from '../../shared/newton-core'
import { cameraAxes, clamp, toyLift, WORLD_WIDTH } from './toybox-camera'
import type { ToyboxView } from './toybox-camera'

type ChallengeGrab = {
  state: SimStepState
  index: number
  movedAt: number | null
  vx: number
  vz: number
}

function placeToy(grab: ChallengeGrab, body: BodyPose) {
  const bodies = grab.state.bodies.slice()
  bodies[grab.index] = body
  grab.state = { ...grab.state, bodies }
}

export function beginChallengeGrab(state: SimStepState, id: SubjectId): ChallengeGrab | null {
  if (!canMoveToy(state, id)) return null
  const index = state.bodies.findIndex(body => body.id === id)
  const body = state.bodies[index]
  const grab: ChallengeGrab = { state, index, movedAt: null, vx: 0, vz: 0 }
  placeToy(grab, { ...body, squashX: Math.max(1.13, body.squashX), squashY: Math.min(0.83, body.squashY) })
  return grab
}

export function moveChallengeGrab(grab: ChallengeGrab, view: ToyboxView, dx: number, dy: number, now: number) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) return
  const { right } = cameraAxes(view)
  // Undo the camera projection at constant height so the toy follows the finger in the tabletop plane.
  const scale = WORLD_WIDTH / view.zoom
  const forward = dy / Math.sin(view.pitch)
  const x = scale * (dx * right.x - forward * right.z)
  const z = scale * (dx * right.z + forward * right.x)
  const elapsed = grab.movedAt === null ? 1 / 60 : clamp((now - grab.movedAt) / 1000, 1 / 120, 0.12)
  const speedFactor = Math.min(0.28 / elapsed, 2.4 / Math.hypot(x, z))
  grab.movedAt = now
  grab.vx = x * speedFactor
  grab.vz = z * speedFactor
  const body = grab.state.bodies[grab.index]
  placeToy(grab, { ...body, x: body.x + x, y: body.y - Math.min(0, toyLift(body)), z: body.z + z })
}

export function challengeDropPose(grab: ChallengeGrab, now: number): BodyPose | null {
  if (grab.movedAt === null) return null
  const moving = now - grab.movedAt <= 100
  return { ...grab.state.bodies[grab.index], vx: moving ? grab.vx : 0, vy: 0, vz: moving ? grab.vz : 0 }
}
