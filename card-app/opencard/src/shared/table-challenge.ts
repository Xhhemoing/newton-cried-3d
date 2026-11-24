import { createInitialSim } from './newton-core'
import type { SimStepState } from './newton-core'

export type TablePlace = 'dorm' | 'desk'
export type TableGoal = NonNullable<SimStepState['tableObjective']>['goal']
export interface TableChallenge { place: TablePlace; goal: TableGoal; variant: 0 | 1 }

interface TableLayout {
  seed: number
  cat: readonly [number, number]
  cup: readonly [number, number]
  cupVelocity: readonly [number, number]
  tower: readonly [number, number]
  catSpeed: number
}

const TABLE_LAYOUTS: Record<TablePlace, readonly [TableLayout, TableLayout]> = {
  dorm: [
    { seed: 20780, cat: [1.38, -0.44], cup: [2.22, -0.35], cupVelocity: [1.45, -0.10], tower: [0.40, 0.68], catSpeed: 5.1 },
    { seed: 20781, cat: [1.48, -0.24], cup: [2.20, -0.51], cupVelocity: [2.5, -0.9], tower: [0.58, 0.56], catSpeed: 4.65 },
  ],
  desk: [
    { seed: 20782, cat: [1.27, 0.59], cup: [2.22, 0.36], cupVelocity: [1.53, 0.15], tower: [-0.08, -0.56], catSpeed: 5.4 },
    { seed: 20783, cat: [1.43, 0.44], cup: [2.17, 0.64], cupVelocity: [2.55, 0.95], tower: [0.33, -0.83], catSpeed: 5.2 },
  ],
}

export function createTableRound(challenge: TableChallenge): SimStepState {
  const { seed, cat, cup, cupVelocity, tower, catSpeed } = TABLE_LAYOUTS[challenge.place][challenge.variant]
  const initial = createInitialSim('warmup', seed, 'coffee')
  const dx = tower[0] - cat[0]
  const dz = tower[1] - cat[1]
  const approach = catSpeed / Math.hypot(dx, dz)
  const bodies = initial.bodies.map(pose => {
    if (pose.id === 'cat') return { ...pose, x: cat[0], z: cat[1], vx: dx * approach, vz: dz * approach, rotZ: -0.2 }
    if (pose.id === 'apple') {
      const [vx, vz] = cupVelocity
      return { ...pose, x: cup[0], z: cup[1], vx, vz, rotX: vz * 0.2, rotZ: -vx * 0.14 }
    }
    if (pose.id === 'blocks') return { ...pose, x: tower[0], z: tower[1] }
    return pose
  })
  return { ...initial, bodies, tableObjective: { goal: challenge.goal, towerOrigin: { x: tower[0], z: tower[1] } } }
}

export function tableSharePath({ place, goal, variant }: TableChallenge): string {
  return 'pages/index/index?from=table&place=' + place + '&goal=' + goal + '&v=' + variant
}

export function readTableChallenge(params: unknown): TableChallenge | null {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return null
  const keys = Object.keys(params)
  if (keys.length !== 4 || !['from', 'place', 'goal', 'v'].every(key => keys.includes(key))) return null
  const { from, place, goal, v } = params as Record<string, unknown>
  if (from !== 'table' || (place !== 'dorm' && place !== 'desk') ||
    (goal !== 'cup' && goal !== 'tower') || (v !== '0' && v !== '1')) return null
  return { place, goal, variant: v === '0' ? 0 : 1 }
}
