export type SubjectId = 'cat' | 'apple' | 'noodle' | 'piano' | 'blocks'
export type LawId = 'zero_g' | 'jelly' | 'tornado' | 'giant' | 'repel' | 'time_slow'
export type TriggerId = 'instant' | 'impact' | 'cliff_edge'
export type LevelId = 'warmup' | 'heavy_fish' | 'jelly_party' | 'wig_orbit'
export type OutfitId = 'shades' | 'apple_hat' | 'spring_bow' | 'newton_wig'
export type ProvinceId = 'gd' | 'zj' | 'js' | 'sc' | 'bj' | 'sh' | 'hn' | 'hb'

export type PropSkinId = 'coffee' | 'phone_case' | 'cat_can' | 'luggage'
export type PersonaId = 'clutch_gambler' | 'chaos_goblin' | 'cup_guardian' | 'qc_inspector' | 'stubborn_fighter'
export type CounterMode = 'heavy_cup' | 'reverse_wind' | 'slippery_rim' | 'can_gravity'

export interface Slots { subject: SubjectId; law: LawId; trigger: TriggerId }

export interface BehaviorSnapshot {
  totalTaps: number
  clutchCount: number
  failStreak: number
  chainTotal: number
  lawCounts: Partial<Record<LawId, number>>
  propSkin: PropSkinId
  levelId: LevelId
}

export interface DirectorReaction {
  personaId: PersonaId
  personaTitle: string
  badgeIcon: string
  quip: string
  counterMode: CounterMode
  counterLabel: string
  recommendedSlots: Slots
  recommendedProp: PropSkinId
  aiGenerated: boolean
}

export interface ShareOptions {
  firstTick?: number
  propSkin?: PropSkinId
  relayDepth?: number
  personaId?: PersonaId
}

export interface ShareParams extends ShareOptions {
  levelId: LevelId
  firstLaw: LawId | null
  slots: Slots | null
  seed: number
  chainCount?: number
}
type TraceColor = SimStepState['traceBlocks'][number]

export interface PhysicsOp {
  tick: number
  op: 'gravity' | 'bounce' | 'kick' | 'spin' | 'scale'
  target: SubjectId | 'all'
  value: number
  dv?: [number, number, number]
}

export interface PhysicsPatch {
  v: 1
  levelId: LevelId
  seed: number
  slots: Slots
  spellText: string
  reactionId: string | null
  reactionTitle: string
  discoveryCode: string
  isFirstDiscovery: boolean
  wigLiftPct: number
  newtonComment: string
  propSkin: PropSkinId
  qcVerdict: string
  aiGenerated: boolean
  ops: PhysicsOp[]
}

export interface HandoffBundle {
  seedContext: { levelId: LevelId; firstLaw: LawId; seed: number }
  earnedArtifact: { energy: number; clutchMs: number; beatPct: number; badge: string }
  unfinishedHook: string
}

export interface FeatureFlags { enableRetention: boolean; enableSocial: boolean; enableSquad?: boolean }

export interface BodyPose {
  id: SubjectId
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  rotX: number
  rotY: number
  rotZ: number
  squashX: number
  squashY: number
  scale: number
}

export interface TableObjective {
  goal: 'cup' | 'tower'
  towerOrigin: { x: number; z: number }
}

export interface SimStepState {
  tick: number
  levelId: LevelId
  seed: number
  bodies: BodyPose[]
  propSkin: PropSkinId
  chainCount: number
  chainLabel: string
  directorCounter: CounterMode | null
  relayDepth: number
  tableObjective?: TableObjective
  /** Tracks whether attraction was already active on the preceding step. */
  canPullActive?: boolean
  cupStableFrames?: number
  handMoves?: number
  catPlaced?: boolean
  wigLiftPct: number
  status: 'cliffhanger' | 'playing' | 'saved' | 'overdrive_oiia' | 'hilarious_fail'
  clutchSaved: boolean
  clutchMs: number
  activeLaws: LawId[]
  tapHistory: LawId[]
  firstTapTick?: number | null
  sfxText: string
  traceBlocks: ('green' | 'amber' | 'purple' | 'cyan' | 'pink' | 'blue')[]
}

function item<T extends string>(id: T, title: string, icon: string) {
  return { id, title, name: title, label: title, icon }
}

export const SUBJECTS = [
  item('cat', '胖橘', '🐱'), item('apple', '青苹果', '🍏'), item('noodle', '云朵拉面', '🍜'),
  item('piano', '软胶发条琴', '🎹'), item('blocks', '积木塔', '🧱'),
] as const

export const LAWS = [
  { ...item('zero_g', '反重力', '↟'), color: 'cyan', sfx: '咻！', wig: 155 },
  { ...item('jelly', '果冻化', '◈'), color: 'green', sfx: '啵叽！', wig: 126 },
  { ...item('tornado', '橘猫旋风', '⟳'), color: 'purple', sfx: '呼噜！', wig: 186 },
  { ...item('giant', '巨大化', '◆'), color: 'amber', sfx: '噗通！', wig: 104 },
  { ...item('repel', '相斥', '↔'), color: 'pink', sfx: '弹开！', wig: 140 },
  { ...item('time_slow', '时光慢放', '◴'), color: 'blue', sfx: '滴…答', wig: 112 },
] as const

export const TRIGGERS = [
  item('instant', '立即', '✦'), item('impact', '落地时', '◉'), item('cliff_edge', '盘沿边', '◒'),
] as const

export const LEVELS = [
  { ...item('warmup', '猫推冰美式', '☕'), passRate: 99.2, subtitle: '保住冰美式', defaultLaw: 'zero_g', defaultProp: 'coffee' },
  { ...item('heavy_fish', '手机千斤砸', '📱'), passRate: 6.8, subtitle: '抗摔桌先塌', defaultLaw: 'time_slow', defaultProp: 'phone_case' },
  { ...item('jelly_party', '爆满硬塞箱', '🧳'), passRate: null, subtitle: '盘沿1mm塞稳', defaultLaw: 'jelly', defaultProp: 'luggage' },
  { ...item('wig_orbit', '引力猫罐头', '🥫'), passRate: null, subtitle: '全屋吸向罐头', defaultLaw: 'tornado', defaultProp: 'cat_can' },
] as const

export const PROP_SKINS = [
  { id: 'coffee', title: '冰美式', icon: '☕', brandHook: '防洒护杯', qcVerdict: '咖啡没洒，杯子先飞', cpsLabel: '防滑猫爪杯垫' },
  { id: 'phone_case', title: '防摔手机壳', icon: '📱', brandHook: '防摔震碎桌', qcVerdict: '手机零划痕，木桌申请工伤', cpsLabel: '气囊防摔壳' },
  { id: 'cat_can', title: '猫罐头', icon: '🥫', brandHook: '开罐强引力', qcVerdict: '罐头一开，沙发入轨', cpsLabel: '冻干鲜肉罐' },
  { id: 'luggage', title: '收纳箱', icon: '🧳', brandHook: '果冻压箱术', qcVerdict: '箱扣合格，地板弹走', cpsLabel: '压缩收纳袋' },
] as const

export const PERSONAS = [
  { id: 'clutch_gambler', title: '盘沿赌徒', icon: '🎲', quip: '早一秒你手痒' },
  { id: 'chaos_goblin', title: '混乱小妖', icon: '👹', quip: '你在给家具配对' },
  { id: 'cup_guardian', title: '咖啡保镖', icon: '☕', quip: '猫能摔，咖啡不能洒' },
  { id: 'qc_inspector', title: '暴力质检员', icon: '🔍', quip: '你给木桌买保险了吗' },
  { id: 'stubborn_fighter', title: '不服输橘', icon: '🐾', quip: '盘沿都想劝你歇会' },
] as const

export const DAILY_FREE_AI_RUNS = 3
export const FAIL_STREAK_FOR_RESCUE = 2

export const OUTFITS = [
  { ...item('shades', '墨镜', '🕶️'), unlockAt: 0 },
  { ...item('apple_hat', '苹果帽', '🍏'), unlockAt: 2 },
  { ...item('spring_bow', '弹簧领结', '🎀'), unlockAt: 5 },
  { ...item('newton_wig', '迷你卷发套', '🌀'), unlockAt: 9 },
] as const

export const PROVINCES = [
  item('gd', '广东', '粤'), item('zj', '浙江', '浙'), item('js', '江苏', '苏'), item('sc', '四川', '川'),
  item('bj', '北京', '京'), item('sh', '上海', '沪'), item('hn', '湖南', '湘'), item('hb', '湖北', '鄂'),
] as const

function reaction(id: string, title: string, icon: string, laws: readonly [LawId, LawId]) {
  return { ...item(id, title, icon), laws }
}

export const REACTIONS = [
  reaction('belly_trampoline', '肚皮蹦床', '🟢', ['zero_g', 'jelly']),
  reaction('orange_noodle', '橘猫拉面', '🍜', ['jelly', 'tornado']),
  reaction('spiral_launch', '螺旋升空', '🌀', ['zero_g', 'tornado']),
  reaction('paw_tower', '猫掌拆塔', '🐾', ['giant', 'repel']),
  reaction('moonwalk', '月球漫步', '🌙', ['zero_g', 'time_slow']),
  reaction('binary_orbit', '双星绕碗', '🪐', ['tornado', 'repel']),
  reaction('marshmallow', '棉花糖云', '☁', ['jelly', 'giant']),
  reaction('bubble_burst', '泡泡连跳', '🫧', ['jelly', 'repel']),
  reaction('slow_pudding', '慢放布丁', '🍮', ['jelly', 'time_slow']),
  reaction('orbit_piano', '轨道发条琴', '🎹', ['tornado', 'time_slow']),
  reaction('giant_cloud', '巨橘浮空', '🍊', ['zero_g', 'giant']),
  reaction('apple_pinball', '苹果弹球', '🍏', ['repel', 'time_slow']),
] as const

export const DAILY_WEATHERS = [
  { day: 1, icon: '↟', title: '引力请假', modifierLaw: 'zero_g' },
  { day: 2, icon: '◈', title: '果冻阵雨', modifierLaw: 'jelly' },
  { day: 3, icon: '⟳', title: '橘猫旋风', modifierLaw: 'tornado' },
  { day: 4, icon: '◆', title: '积木膨胀', modifierLaw: 'giant' },
  { day: 5, icon: '↔', title: '苹果互斥', modifierLaw: 'repel' },
  { day: 6, icon: '◴', title: '时间打盹', modifierLaw: 'time_slow' },
  { day: 7, icon: '✦', title: '假发有风', modifierLaw: 'zero_g' },
] as const

export const DEFAULT_FLAGS: FeatureFlags = { enableRetention: true, enableSocial: true }

export function isSquadEnabled(flags?: Partial<FeatureFlags> | null): boolean {
  return flags?.enableSquad === true
}

const DEFAULT_SLOTS: Slots = { subject: 'cat', law: 'zero_g', trigger: 'instant' }
const DAY_MS = 86_400_000
const OP_NAMES: readonly string[] = ['gravity', 'bounce', 'kick', 'spin', 'scale']
const BEIJING_OFFSET = 28_800_000
const DT = 1 / 60
const RIM = 2.45
const SLIDE_END = 54
const HOVER_END = 72
const COFFEE_LIFT_TICKS = 24
const MAX_DECISION_TICK = 240
const MAX_SEED = 2_147_483_647
const TRIGGER_TICK: Record<TriggerId, number> = { instant: 0, impact: 20, cliff_edge: SLIDE_END }
const BODY_RADIUS: Record<SubjectId, number> = { cat: 0.38, apple: 0.23, noodle: 0.17, piano: 0.26, blocks: 0.22 }
const TABLE_CUP_SETTLE_LIMIT = 360
const TABLE_TOWER_TIP_START = 0.42
const TABLE_TOWER_TIP_END = Math.PI / 2
// The widest block is 0.63 units across with a small yaw in the 3D model.
const TABLE_TOWER_HALF_WIDTH = 0.34
const LAW_OPS: Record<LawId, ReadonlyArray<Omit<PhysicsOp, 'tick' | 'target'>>> = {
  zero_g: [{ op: 'gravity', value: -0.24 }, { op: 'kick', value: 0.7, dv: [-0.6, 1.25, 0] }],
  jelly: [{ op: 'bounce', value: 1.2 }, { op: 'kick', value: 0.9, dv: [-1.05, 1.3, 0.1] }],
  tornado: [{ op: 'spin', value: 2.4 }, { op: 'kick', value: 1, dv: [-1.15, 1.05, 0.85] }],
  giant: [{ op: 'scale', value: 1.75 }, { op: 'kick', value: 1.1, dv: [-0.75, 0.7, 0] }],
  repel: [{ op: 'kick', value: 1.35, dv: [-1.5, 0.8, -0.5] }, { op: 'bounce', value: 0.65 }],
  time_slow: [{ op: 'gravity', value: 0.2 }, { op: 'kick', value: 0.5, dv: [-1.15, 0.65, 0] }],
}

function lookup<T extends { id: string }>(catalog: ReadonlyArray<T>, id: unknown): T | undefined {
  return catalog.find(entry => entry.id === id)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function bounded(value: unknown, min: number, max: number, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? clamp(value, min, max) : fallback
}

function safeSeed(value: unknown): number {
  return Math.trunc(bounded(value, 0, MAX_SEED, 1))
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null
}

function parseSlots(value: unknown): Slots | null {
  const row = record(value)
  if (!row) return null
  const subject = lookup(SUBJECTS, row.subject)
  const law = lookup(LAWS, row.law)
  const trigger = lookup(TRIGGERS, row.trigger)
  return subject && law && trigger ? { subject: subject.id, law: law.id, trigger: trigger.id } : null
}

const COUNTERS = [
  { id: 'heavy_cup', title: '千斤冰杯' },
  { id: 'reverse_wind', title: '逆向横风' },
  { id: 'slippery_rim', title: '盘沿打蜡' },
  { id: 'can_gravity', title: '开罐引力' },
] as const

const LAW_COUNTERS: Record<LawId, CounterMode> = {
  zero_g: 'heavy_cup', jelly: 'slippery_rim', tornado: 'reverse_wind',
  giant: 'slippery_rim', repel: 'can_gravity', time_slow: 'heavy_cup',
}
const DIRECTOR_RECIPES: Record<PersonaId, { slots: Slots; prop: PropSkinId }> = {
  clutch_gambler: { slots: { subject: 'blocks', law: 'jelly', trigger: 'instant' }, prop: 'luggage' },
  chaos_goblin: { slots: { subject: 'piano', law: 'time_slow', trigger: 'impact' }, prop: 'phone_case' },
  cup_guardian: { slots: { subject: 'apple', law: 'tornado', trigger: 'cliff_edge' }, prop: 'cat_can' },
  qc_inspector: { slots: { subject: 'apple', law: 'zero_g', trigger: 'instant' }, prop: 'coffee' },
  stubborn_fighter: { slots: { subject: 'noodle', law: 'repel', trigger: 'impact' }, prop: 'coffee' },
}

export function evaluatePlayerBehavior(snapshot: BehaviorSnapshot): DirectorReaction {
  const usage = LAWS.map(({ id }) => ({ id, count: bounded(snapshot.lawCounts[id], 0, Number.MAX_SAFE_INTEGER) }))
  const favorite = usage.reduce((prior, next) => next.count > prior.count ? next : prior)
  const level = lookup(LEVELS, snapshot.levelId) ?? LEVELS[0]
  const favoriteLaw = favorite.count > 0 ? favorite.id : level.defaultLaw
  let personaId: PersonaId = 'cup_guardian'
  if (snapshot.failStreak >= FAIL_STREAK_FOR_RESCUE) personaId = 'stubborn_fighter'
  else if (snapshot.clutchCount >= 2 && snapshot.clutchCount * 2 >= snapshot.totalTaps) personaId = 'clutch_gambler'
  else if (snapshot.chainTotal >= 3 || usage.filter(({ count }) => count > 0).length >= 3) personaId = 'chaos_goblin'
  else if (snapshot.propSkin !== 'coffee' || favoriteLaw === 'giant' || favoriteLaw === 'time_slow') personaId = 'qc_inspector'
  const persona = lookup(PERSONAS, personaId)!
  const counter = lookup(COUNTERS, LAW_COUNTERS[favoriteLaw])!
  const recipe = DIRECTOR_RECIPES[persona.id]
  const recommendedProp = recipe.prop === snapshot.propSkin
    ? PROP_SKINS.find(prop => prop.id !== snapshot.propSkin)!.id : recipe.prop
  const alternativeLaw = recipe.slots.law === favoriteLaw ? LAWS.find(law => law.id !== favoriteLaw)!.id : recipe.slots.law
  return {
    personaId: persona.id, personaTitle: persona.title, badgeIcon: persona.icon, quip: persona.quip,
    counterMode: counter.id, counterLabel: counter.title, recommendedProp,
    recommendedSlots: { ...recipe.slots, law: alternativeLaw }, aiGenerated: false,
  }
}

function shortPlainText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  const text = value.slice(0, 1024)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, '')
    .replace(/<!--[^]*?(?:-->|$)|<[^>]*>/g, '')
    .replace(/&(?:#(?:x[\da-f]+|\d+)|[a-z][a-z\d]+);/gi, '')
    .replace(/[<>\u0000-\u0008\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, '')
    .replace(/\s+/g, ' ').trim()
  return Array.from(text).slice(0, maxLength).join('').trim()
}

export function validateDirectorReaction(raw: unknown, snapshot: BehaviorSnapshot): DirectorReaction {
  const row = record(raw)
  const persona = lookup(PERSONAS, row?.personaId)
  const counter = lookup(COUNTERS, row?.counterMode)
  const slots = record(row?.recommendedSlots)
  const recommendedSlots = parseSlots(slots)
  const prop = lookup(PROP_SKINS, row?.recommendedProp)
  const quip = shortPlainText(row?.quip, 14)
  const exactSlots = slots && Object.keys(slots).length === 3 &&
    ['subject', 'law', 'trigger'].every(key => Object.prototype.hasOwnProperty.call(slots, key))
  if (!persona || !counter || !exactSlots || !recommendedSlots || !prop || !quip) {
    return evaluatePlayerBehavior(snapshot)
  }
  return {
    personaId: persona.id, personaTitle: persona.title, badgeIcon: persona.icon, quip,
    counterMode: counter.id, counterLabel: counter.title, recommendedSlots,
    recommendedProp: prop.id, aiGenerated: true,
  }
}

export function todayIndex(now = Date.now()): number {
  const weekday = new Date((Number.isFinite(now) ? now : 0) + BEIJING_OFFSET).getUTCDay()
  return Number.isNaN(weekday) ? 1 : (weekday + 6) % 7 + 1
}

export function dailyWeather(day = todayIndex()): { day: number; icon: string; title: string; modifierLaw: LawId } {
  return { ...(DAILY_WEATHERS.find(weather => weather.day === day) ?? DAILY_WEATHERS[0]) }
}

function body(id: SubjectId, x: number, z: number, vx = 0): BodyPose {
  return { id, x, y: BODY_RADIUS[id], z, vx, vy: 0, vz: 0, rotX: 0, rotY: 0, rotZ: 0,
    squashX: 1, squashY: 1, scale: 1 }
}

function orbitWeather(seed: number): LawId {
  // Beijing epoch day zero was a Thursday.
  return dailyWeather((safeSeed(seed) + 3) % 7 + 1).modifierLaw
}

export function createInitialSim(
  levelId: LevelId, seed = levelId === 'wig_orbit' ? cardForDay().seed : 1, propSkin?: PropSkinId,
): SimStepState {
  const level = lookup(LEVELS, levelId) ?? LEVELS[0]
  const code = safeSeed(seed)
  const prop = lookup(PROP_SKINS, propSkin)?.id ?? level.defaultProp
  const jitter = ((Math.imul(code, 1_664_525) >>> 0) % 401 - 200) / 1000
  const catX = level.id === 'jelly_party' ? 1.78 : 1.48
  const bodies = [body('cat', catX, 0, (RIM - 0.025 - catX) / (SLIDE_END * DT)),
    body('apple', -0.48, 0.75 + jitter), body('noodle', 0.36, -0.85),
    body('piano', -1.34, -0.35), body('blocks', 0.15 + jitter, 1.2)]
  if (prop === 'coffee') {
    bodies[1] = body('apple', catX + 0.48, 0.28)
    bodies[4] = body('blocks', 1.24 + jitter * 0.25, 1.04)
  } else if (prop === 'phone_case') {
    bodies[1] = { ...body('apple', -0.34, 0.3), y: 2.05, vy: -2.7 }
    bodies[3] = body('piano', -1.03, 0.08)
    bodies[4] = body('blocks', 0.3 + jitter, 0.81)
  } else if (prop === 'cat_can') {
    bodies[1] = body('apple', -0.22, 0.04)
  }
  if (level.id === 'wig_orbit' && orbitWeather(code) === 'giant') {
    for (const pose of bodies) {
      pose.scale = 1.27
      pose.y *= pose.scale
    }
  }
  return {
    tick: 0, levelId: level.id, seed: code, bodies, propSkin: prop,
    chainCount: 0, chainLabel: '', directorCounter: null, relayDepth: 0,
    wigLiftPct: 0, status: 'cliffhanger', clutchSaved: false, clutchMs: 0,
    activeLaws: [], tapHistory: [], firstTapTick: null, sfxText: '', traceBlocks: [],
  }
}

function pulse(pose: BodyPose, law: LawId, weak: boolean, overdrive: boolean): BodyPose {
  const outside = pose.x < 0 ? -1 : 1
  const impulse = weak ? 0.38 : 1
  const next = { ...pose, squashX: 1.23, squashY: 0.68 }
  if (law === 'jelly') { next.squashX = 1.46; next.squashY = 0.52 }
  if (law === 'giant') next.scale = Math.min(1.85, next.scale + 0.32)
  if (law === 'time_slow') { next.vx *= 0.34; next.vz *= 0.34 }
  if (law === 'tornado' || overdrive) { next.rotY += 0.72; next.vz += 0.9 * impulse }
  next.vx -= outside * (pose.id === 'cat' ? 3.4 : 0.66) * impulse
  next.vy = Math.max(0, pose.vy) + (law === 'zero_g' ? 4.7 : law === 'jelly' ? 3.9 : 2.75) * impulse
  return cleanPose(next)
}

function isCoffeeChallenge(levelId: LevelId, propSkin: PropSkinId): boolean {
  return levelId === 'warmup' && propSkin === 'coffee'
}

export function canMoveToy(state: SimStepState, id: SubjectId): boolean {
  return state.status !== 'hilarious_fail' &&
    !(state.status === 'saved' && (state.tableObjective || isCoffeeChallenge(state.levelId, state.propSkin))) &&
    state.bodies.some(body => body.id === id && body.y >= 0)
}

function recordHandMove(state: SimStepState, next: BodyPose, sfxText: string): SimStepState {
  const interruptsPush = !!state.tableObjective || next.id === 'cat' || next.id === 'apple'
  return {
    ...state, cupStableFrames: 0, handMoves: (state.handMoves ?? 0) + 1, sfxText,
    status: state.status === 'cliffhanger' && interruptsPush ? 'playing' : state.status,
    bodies: state.bodies.map(pose => pose.id === next.id ? cleanPose(next) : pose),
  }
}

export function tapToy(state: SimStepState, id: SubjectId): SimStepState {
  if (!canMoveToy(state, id)) return state
  const pose = state.bodies.find(body => body.id === id)!
  const radius = Math.hypot(pose.x, pose.z)
  const inwardX = -pose.x / Math.max(0.01, radius)
  const inwardZ = -pose.z / Math.max(0.01, radius)
  const next = { ...pose }
  switch (id) {
    case 'apple': {
      const nudge = Math.min(3.1, radius * 2)
      next.vx = inwardX * nudge
      next.vz = inwardZ * nudge
      next.vy = Math.max(0, pose.vy) * 0.2 + 1.55
      next.rotX *= 0.3
      next.rotZ *= 0.3
      next.squashX = 1.12
      next.squashY = 0.88
      return recordHandMove(state, next, state.propSkin === 'coffee' ? '杯子回来！' : '咚！')
    }
    case 'blocks':
      next.vx *= 0.18
      next.vz *= 0.18
      next.vy = Math.max(0.55, next.vy * 0.25)
      next.rotX *= 0.18
      next.rotZ *= 0.18
      next.squashX = 1.10
      next.squashY = 0.83
      return recordHandMove(state, next, '稳住！')
    case 'cat':
      next.vx = pose.vx * 0.25 + inwardX * 3.8
      next.vz = pose.vz * 0.25 + inwardZ * 3.8
      next.vy = Math.max(3.8, pose.vy + 1.2)
      next.rotZ += 0.17
      next.squashX = 1.24
      next.squashY = 0.78
      return recordHandMove(state, next, '喵呜！')
    case 'piano':
      next.vy = Math.max(0, pose.vy) + 0.95
      next.vz += 0.45
      next.rotY += 0.19
      next.squashY = 0.87
      return recordHandMove(state, next, '叮咚！')
    case 'noodle':
      next.vy = Math.max(0, pose.vy) + 1.7
      next.vx += 0.38
      next.rotY -= 0.28
      next.squashX = 1.34
      next.squashY = 0.70
      return recordHandMove(state, next, '哧溜！')
  }
}

export function commitToyDrop(state: SimStepState, pose: BodyPose): SimStepState {
  if (!canMoveToy(state, pose.id)) return state
  const next = recordHandMove(state, pose, '啪嗒！')
  return pose.id === 'cat' ? { ...next, catPlaced: true } : next
}

function tableResult(
  goal: TableObjective['goal'], status: 'saved' | 'hilarious_fail', bodies: BodyPose[],
): string {
  if (goal === 'tower') return status === 'saved' ? '积木塔保住了' : '积木塔倒了'
  if (status === 'saved') return '杯子稳住了'
  const cup = bodies.find(pose => pose.id === 'apple')
  return cup && cup.y < 0 ? '杯子掉了' : '杯子没稳住'
}

export function applyQuickLaw(state: SimStepState, law: LawId): SimStepState {
  const rule = lookup(LAWS, law)
  const objective = state.tableObjective
  if (!rule || state.status === 'hilarious_fail' || (objective && state.status === 'saved')) return state
  const coffeeChallenge = isCoffeeChallenge(state.levelId, state.propSkin)
  const cup = coffeeChallenge ? state.bodies.find(pose => pose.id === 'apple') : undefined
  const cupBelowTable = !!cup && cup.y < 0
  if (cupBelowTable && objective?.goal !== 'tower') {
    return { ...state, status: 'hilarious_fail',
      sfxText: objective ? tableResult(objective.goal, 'hilarious_fail', state.bodies) : '冰美式翻了' }
  }
  const tapHistory = [...state.tapHistory, law]
  const activeLaws = [...state.activeLaws.filter(id => id !== law), law]
  const overdrive = !state.tableObjective && (state.status === 'overdrive_oiia' || new Set(tapHistory.slice(-3)).size === 3)
  const cat = state.bodies.find(pose => pose.id === 'cat')
  const weak = state.levelId === 'heavy_fish' && law !== 'zero_g' && law !== 'time_slow' && activeLaws.length === 1
  const rim = cat && Math.hypot(cat.x, cat.z) >= RIM - 0.26
  const clutch = !state.clutchSaved && !weak && !!rim && state.tick >= SLIDE_END - 12 &&
    state.tick <= HOVER_END && (state.status === 'cliffhanger' || state.status === 'playing')
  const saved = !coffeeChallenge && !state.tableObjective && !weak && (state.levelId === 'warmup' || clutch ||
    (state.levelId === 'heavy_fish' && activeLaws.includes('time_slow')) ||
    (state.levelId === 'jelly_party' && law === 'jelly' && !!rim))
  const launchCup = !coffeeChallenge && !state.tableObjective && state.propSkin === 'coffee' && (saved || overdrive) &&
    state.status !== 'saved' && state.status !== 'overdrive_oiia'
  return {
    ...state, cupStableFrames: 0, tapHistory, activeLaws,
    firstTapTick: state.tapHistory.length === 0 ? state.tick : state.firstTapTick ?? null,
    clutchSaved: clutch || state.clutchSaved,
    clutchMs: clutch ? Math.round(Math.max(0, SLIDE_END - state.tick) * 1000 / 60) : state.clutchMs,
    status: overdrive ? 'overdrive_oiia' : saved || (!coffeeChallenge && !objective && state.status === 'saved') ? 'saved' : 'playing',
    bodies: state.bodies.map(pose => {
      if (objective && pose.id !== 'cat' && (pose.id !== 'apple' || cupBelowTable)) return pose
      const next = pulse(pose, law, weak, overdrive)
      if (objective && pose.id === 'cat') {
        const side = objective.towerOrigin.z >= 0 ? -1 : 1
        next.vx = -2.4
        next.vz = side * 2.2
        next.vy = Math.max(3.4, next.vy)
      } else if (objective && pose.id === 'apple' && state.tapHistory.length === 0) {
        if (law === 'tornado') {
          const tx = objective.towerOrigin.x - pose.x
          const tz = objective.towerOrigin.z - pose.z
          const flightTime = 0.44
          next.vx = tx / flightTime
          next.vz = tz / flightTime
          next.vy = 2.52
        } else {
          const side = objective.towerOrigin.z >= 0 ? -1 : 1
          if (law === 'zero_g') {
            // A counter-kick lifts the cup but can carry it across the far rim.
            next.vx = pose.vx - 6.4
            next.vz = pose.vz * 0.2 + side * 0.7
            next.vy = 3.8
          } else {
            next.vx = law === 'time_slow' ? -2.9 : -3.5
            // The elastic rebound amplifies the cup's sideways approach.
            next.vz = side * 1.25 + (law === 'jelly' ? pose.vz * 2.8 : 0)
            next.vy = 3.2
          }
        }
      } else if (pose.id === 'apple' && coffeeChallenge && state.tapHistory.length === 0) {
        // Aim the first rescue across the tower with enough height for a visible collision.
        next.vx = -4.5
        next.vz = 2.3
        next.vy = law === 'zero_g' ? 4.3 : Math.max(3.7, next.vy)
      } else if (pose.id === 'apple' && launchCup) {
        // The cup rises with the toys while flying diagonally into the tower.
        next.vx = -4.5
        next.vz = 2.5
        next.vy += 0.35
      }
      return cleanPose(next)
    }),
    wigLiftPct: overdrive ? 999 : clamp(bounded(state.wigLiftPct, 0, 999) + rule.wig + (clutch ? 171 : 0), 0, 999),
    sfxText: overdrive ? '陀螺橘' : clutch ? (coffeeChallenge ? '压哨护杯' : '压哨救橘') : rule.sfx,
    traceBlocks: [...state.traceBlocks, rule.color].slice(-6),
  }
}

function cleanPose(pose: BodyPose): BodyPose {
  return {
    id: pose.id, x: bounded(pose.x, -12, 12), y: bounded(pose.y, -5, 12, BODY_RADIUS[pose.id]),
    z: bounded(pose.z, -12, 12), vx: bounded(pose.vx, -24, 24), vy: bounded(pose.vy, -72, 24),
    vz: bounded(pose.vz, -24, 24), rotX: bounded(pose.rotX, -100_000, 100_000),
    rotY: bounded(pose.rotY, -100_000, 100_000), rotZ: bounded(pose.rotZ, -100_000, 100_000),
    squashX: bounded(pose.squashX, 0.48, 1.65, 1), squashY: bounded(pose.squashY, 0.48, 1.65, 1),
    scale: bounded(pose.scale, 0.45, 2.5, 1),
  }
}

function readOp(value: unknown): PhysicsOp | null {
  const row = record(value)
  if (!row || typeof row.op !== 'string' || !OP_NAMES.includes(row.op) ||
    typeof row.tick !== 'number' || !Number.isFinite(row.tick) ||
    typeof row.value !== 'number' || !Number.isFinite(row.value)) return null
  const target = row.target === 'all' ? 'all' : lookup(SUBJECTS, row.target)?.id
  if (!target) return null
  const op: PhysicsOp = {
    tick: Math.round(clamp(row.tick, 0, 240)), op: row.op as PhysicsOp['op'],
    target, value: clamp(row.value, -1.5, 2.5),
  }
  const vector = row.dv
  if (op.op === 'kick' && vector !== undefined) {
    if (!Array.isArray(vector) || vector.length !== 3 ||
      ![0, 1, 2].every(index => typeof vector[index] === 'number' && Number.isFinite(vector[index]))) return null
    op.dv = [bounded(vector[0], -1.5, 1.5), bounded(vector[1], -1.5, 1.5), bounded(vector[2], -1.5, 1.5)]
  }
  return op
}

function patchOps(value: unknown): PhysicsOp[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 6).map(readOp).filter((op): op is PhysicsOp => op !== null)
    .sort((left, right) => left.tick - right.tick)
}

interface SurfaceContact {
  phoneImpact: number
  luggageBounce: boolean
}

function moveBody(
  pose: BodyPose, state: SimStepState, tick: number, ops: PhysicsOp[], anchor: BodyPose | undefined,
  jellyActive: boolean, contact: SurfaceContact,
): BodyPose {
  const cat = pose.id === 'cat'
  const next = cleanPose(pose)
  const active = state.activeLaws
  const heavy = state.levelId === 'heavy_fish' && cat && !active.includes('time_slow')
  const overdrive = state.status === 'overdrive_oiia'
  const weather = state.levelId === 'wig_orbit' ? orbitWeather(state.seed) : null
  const dt = active.includes('time_slow') || weather === 'time_slow' ? DT * 0.48 : DT
  const floor = BODY_RADIUS[next.id] * next.scale
  const phone = next.id === 'apple' && state.propSkin === 'phone_case'
  const coffeeCup = next.id === 'apple' && isCoffeeChallenge(state.levelId, state.propSkin)
  let gravity = heavy || phone ? 17.5 : 9.8
  if (active.includes('zero_g') || weather === 'zero_g') gravity *= coffeeCup ? 0.8 : 0.37
  const naturalGravity = gravity
  let bounce = coffeeCup ? 0.22 : jellyActive || weather === 'jelly' ? 0.85 : phone ? 0.56 : 0.31
  let spin = active.includes('tornado') || weather === 'tornado' ? 5.8 : 0.38
  if (overdrive && cat) spin = 14
  if (weather === 'repel') next.vx += Math.sign(next.x) * dt * 1.7

  for (const op of ops) {
    if (op.tick > tick || (op.target !== 'all' && op.target !== next.id)) continue
    if (op.op === 'gravity') {
      // A lift can send the cup airborne, then table gravity takes over for landing.
      const liftExpired = coffeeCup && op.value <= 0 && tick - Math.max(1, op.tick) >= COFFEE_LIFT_TICKS
      gravity = liftExpired ? naturalGravity : 9.8 * op.value
    }
    // Even an elastic alchemy recipe must let the coffee cup lose energy on impact.
    if (op.op === 'bounce') bounce = clamp(op.value, 0, coffeeCup ? 0.7 : 1.28)
    if (op.op === 'spin') spin = op.value * 5
    if (op.tick !== tick && !(op.tick === 0 && tick === 1)) continue
    if (op.op === 'scale') next.scale = clamp(op.value, 0.45, 2.5)
    if (op.op === 'kick') {
      const [x, y, z] = op.dv ?? [0, 1, 0]
      next.vx += x * op.value * 3
      next.vy += y * op.value * 3
      next.vz += z * op.value * 3
    }
  }

  if (state.directorCounter === 'heavy_cup' && next.id === 'apple') gravity += 13
  if (state.directorCounter === 'reverse_wind') {
    next.vx -= 4.6 * dt
    next.vz -= 7.2 * dt
  }
  if (anchor && next.id !== 'apple') {
    const dx = anchor.x - next.x
    const dy = anchor.y - next.y
    const dz = anchor.z - next.z
    const strength = 8.6 * dt / Math.max(0.48, Math.hypot(dx, dy, dz))
    next.vx += dx * strength
    next.vy += dy * strength
    next.vz += dz * strength
  }

  const towerTipping = state.tableObjective && next.id === 'blocks' && Math.abs(next.rotZ) >= TABLE_TOWER_TIP_START
  if (towerTipping) {
    next.rotZ = Math.sign(next.rotZ) * Math.min(TABLE_TOWER_TIP_END, Math.abs(next.rotZ) + 6.6 * dt)
  }
  // Keep the lower side of the turning tower above the tabletop.
  const towerLift = towerTipping ? TABLE_TOWER_HALF_WIDTH * Math.abs(Math.sin(next.rotZ)) : 0
  const clearance = (BODY_RADIUS[next.id] + towerLift) * next.scale
  const proposedX = next.x + next.vx * dt
  const proposedZ = next.z + next.vz * dt
  next.vy -= gravity * dt
  const proposedY = next.y + next.vy * dt
  const edge = Math.hypot(proposedX, proposedZ)
  const radius = Math.hypot(next.x, next.z)
  const crossing = next.y > clearance
    ? clamp((next.y - clearance) / Math.max(0.0001, next.y - proposedY), 0, 1) : 0
  const impactX = next.x + (proposedX - next.x) * crossing
  const impactZ = next.z + (proposedZ - next.z) * crossing
  const supportRadius = coffeeCup ? RIM - clearance : RIM
  const lands = proposedY <= clearance && Math.hypot(impactX, impactZ) <= supportRadius
  const rimBounce = (active.length > 0 || jellyActive) && radius <= supportRadius && edge > supportRadius &&
    proposedY <= clearance + 0.22 && next.y >= floor - 0.08
  next.x = proposedX
  next.y = proposedY
  next.z = proposedZ

  if (lands) {
    next.y = clearance
    if (next.vy < -0.9) {
      if (phone && next.vy < -4) contact.phoneImpact = -next.vy
      next.vy = -next.vy * bounce
      next.squashX = 1.25
      next.squashY = 0.66
    } else {
      next.vy = 0
    }
    const friction = state.directorCounter === 'slippery_rim' ? 0.995 : coffeeCup ? 0.76 : 0.95
    next.vx *= friction
    next.vz *= friction
    if (coffeeCup) {
      next.rotX *= 0.64
      next.rotZ *= 0.64
    }
  }

  if (rimBounce) {
    const nx = proposedX / edge
    const nz = proposedZ / edge
    const outward = Math.max(0, next.vx * nx + next.vz * nz)
    next.x = nx * (supportRadius - 0.01)
    next.z = nz * (supportRadius - 0.01)
    next.y = Math.max(clearance, next.y)
    next.vx -= 1.64 * outward * nx
    next.vz -= 1.64 * outward * nz
    next.vy = Math.max(next.vy, 1.7)
    next.squashX = 1.31
    next.squashY = 0.62
    if (outward > 0.4 && state.propSkin === 'luggage' && jellyActive) contact.luggageBounce = true
  }

  if (!towerTipping) {
    next.rotX += next.vz * 0.12 * dt
    next.rotY += spin * dt
    next.rotZ -= next.vx * 0.2 * dt
  }
  next.squashX += (1 - next.squashX) * 0.16
  next.squashY += (1 - next.squashY) * 0.16
  return cleanPose(next)
}

const BODY_MASS: Record<SubjectId, number> = { cat: 2, apple: 0.55, noodle: 0.36, piano: 1.25, blocks: 0.75 }

function resolveBodyContact(
  a: BodyPose, b: BodyPose, priorA: BodyPose, priorB: BodyPose, propSkin: PropSkinId,
): boolean {
  const radius = BODY_RADIUS[a.id] * a.scale + BODY_RADIUS[b.id] * b.scale
  let dx = b.x - a.x
  let dy = b.y - a.y
  let dz = b.z - a.z
  const distance = Math.hypot(dx, dy, dz)
  // Sample the normal at first impact, including when the centers have already crossed.
  const sx = priorB.x - priorA.x
  const sy = priorB.y - priorA.y
  const sz = priorB.z - priorA.z
  const tx = dx - sx
  const ty = dy - sy
  const tz = dz - sz
  const motion = tx * tx + ty * ty + tz * tz
  const toward = sx * tx + sy * ty + sz * tz
  const offset = sx * sx + sy * sy + sz * sz - radius * radius
  const discriminant = toward * toward - motion * offset
  const time = offset >= 0 && motion > 1e-8 && toward < 0 && discriminant >= 0
    ? (-toward - Math.sqrt(discriminant)) / motion : Infinity
  if (time >= 0 && time <= 1) {
    dx = sx + time * tx
    dy = sy + time * ty
    dz = sz + time * tz
  } else if (distance > radius) {
    return false
  }
  const length = Math.hypot(dx, dy, dz)
  const nx = length > 1e-6 ? dx / length : 1
  const ny = length > 1e-6 ? dy / length : 0
  const nz = length > 1e-6 ? dz / length : 0
  const invMass = (body: BodyPose) => 1 / (BODY_MASS[body.id] * body.scale ** 3 *
    (propSkin === 'phone_case' && body.id === 'apple' ? 5 : 1))
  const inverseA = invMass(a)
  const inverseB = invMass(b)
  const totalInverse = inverseA + inverseB
  const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz
  const separation = Math.max(0, radius - (b.x - a.x) * nx - (b.y - a.y) * ny - (b.z - a.z) * nz)
  const correction = (separation + 0.001) / totalInverse
  a.x -= nx * correction * inverseA
  a.y -= ny * correction * inverseA
  a.z -= nz * correction * inverseA
  b.x += nx * correction * inverseB
  b.y += ny * correction * inverseB
  b.z += nz * correction * inverseB
  if (relative >= 0) return false

  const impulse = -1.72 * relative / totalInverse
  a.vx -= nx * impulse * inverseA
  a.vy -= ny * impulse * inverseA
  a.vz -= nz * impulse * inverseA
  b.vx += nx * impulse * inverseB
  b.vy += ny * impulse * inverseB
  b.vz += nz * impulse * inverseB
  return relative < -0.55
}

export function stepSim(state: SimStepState, patch?: PhysicsPatch | null): SimStepState {
  if (state.status === 'hilarious_fail' || (state.status === 'saved' && (Boolean(state.tableObjective) || isCoffeeChallenge(state.levelId, state.propSkin)))) return state
  const tick = Math.trunc(bounded(state.tick, 0, Number.MAX_SAFE_INTEGER - 1)) + 1
  const matchingPatch = patch?.v === 1 && patch.levelId === state.levelId && patch.seed === state.seed ? patch : null
  const propSkin = lookup(PROP_SKINS, matchingPatch?.propSkin ?? state.propSkin)?.id ??
    (lookup(LEVELS, state.levelId) ?? LEVELS[0]).defaultProp
  const ops = patchOps(matchingPatch?.ops)
  const hasStarted = ops.length > 0 && ops[0].tick <= tick
  const patchLaw = hasStarted ? matchingPatch?.slots?.law : undefined
  const objective = state.tableObjective
  const intro = state.status === 'cliffhanger' && !hasStarted
  const scripted = !objective && intro && tick <= HOVER_END
  const initial = scripted ? createInitialSim(state.levelId, state.seed, propSkin) : null
  const source = !objective && state.tick === 0 && propSkin !== state.propSkin && state.status === 'cliffhanger'
    ? (initial ?? createInitialSim(state.levelId, state.seed, propSkin)).bodies : state.bodies
  const previous = source.filter(pose => lookup(SUBJECTS, pose.id)).map(cleanPose)
  const canPull = state.directorCounter === 'can_gravity' ||
    (propSkin === 'cat_can' && (state.activeLaws.includes('tornado') || patchLaw === 'tornado'))
  const anchor = canPull ? previous.find(pose => pose.id === 'apple') : undefined
  const jellyActive = state.activeLaws.includes('jelly') || patchLaw === 'jelly'
  const contact: SurfaceContact = { phoneImpact: 0, luggageBounce: false }
  const physicsState = propSkin === state.propSkin ? state : { ...state, propSkin }
  const coffeeChallenge = isCoffeeChallenge(state.levelId, propSkin)
  const bodies = previous.map(pose => {
    if (objective && pose.id === 'blocks' && Math.hypot(pose.x, pose.z) <= RIM && pose.vx === 0 && pose.vy === 0 && pose.vz === 0 &&
      pose.rotX === 0 && pose.rotZ === 0 && Math.abs(pose.y - BODY_RADIUS.blocks * pose.scale) < 1e-6 &&
      !ops.some(op => op.tick <= tick && (op.target === 'all' || op.target === 'blocks'))) {
      return pose
    }
    if (initial && pose.id === 'cat') {
      const start = initial.bodies[0]
      const turn = Math.min(tick, SLIDE_END)
      return { ...start, x: start.x + start.vx * DT * turn, rotZ: -turn / 260,
        y: start.y + (tick > SLIDE_END ? Math.sin((tick - SLIDE_END) * 0.3) * 0.04 : 0) }
    }
    if (initial && pose.id === 'apple' && propSkin === 'coffee') {
      const start = initial.bodies[1]
      const ratio = Math.min(tick, SLIDE_END) / SLIDE_END
      return { ...start, x: start.x + (RIM - 0.05 - start.x) * ratio, rotZ: -0.24 * ratio }
    }
    const releasedCup = !objective && intro && tick > HOVER_END && propSkin === 'coffee' && pose.id === 'apple'
    const releasedPose = releasedCup ? { ...pose, vx: Math.max(1.55, pose.vx), vz: 0.18 } : pose
    return moveBody(releasedPose, physicsState, tick, ops, anchor, jellyActive, contact)
  })

  let chainCount = Math.trunc(bounded(state.chainCount, 0, Number.MAX_SAFE_INTEGER))
  let chainLabel = state.chainLabel ?? ''
  let wigBonus = 0
  function chain(label: string, boost: number) {
    chainCount = Math.min(Number.MAX_SAFE_INTEGER, chainCount + 1)
    chainLabel = label
    wigBonus += boost
  }
  if (scripted && propSkin === 'coffee' && tick === SLIDE_END && bodies.some(pose => pose.id === 'apple')) {
    chain('猫爪偷推', 18)
  }
  if (anchor && !state.canPullActive && bodies.some(pose => pose.id !== 'apple')) chain('罐头黑洞', 82)
  for (let left = 0; left < bodies.length; left += 1) {
    for (let right = left + 1; right < bodies.length; right += 1) {
      const a = bodies[left]
      const b = bodies[right]
      const cupPair = a.id === 'apple' || b.id === 'apple'
      if (objective && (
        (a.id !== 'cat' && a.id !== 'apple' && a.id !== 'blocks') ||
        (b.id !== 'cat' && b.id !== 'apple' && b.id !== 'blocks')
      )) continue
      if (a.id === b.id || (scripted && (a.id === 'cat' || b.id === 'cat' || (propSkin === 'coffee' && cupPair)))) continue
      if (resolveBodyContact(a, b, previous[left], previous[right], propSkin)) {
        if (objective && (a.id === 'blocks' || b.id === 'blocks')) {
          const hitBlocks = a.id === 'blocks' ? a : b
          const other = a.id === 'blocks' ? b : a
          const dx = hitBlocks.x - other.x
          const dz = hitBlocks.z - other.z
          if (Math.abs(hitBlocks.rotZ) < TABLE_TOWER_TIP_START) {
            // The impact sets the fall direction. Use a yaw and one side tilt so
            // the same lean is visible in both the 3D scene and the fallback.
            const sign = dx > 0 ? -1 : 1
            hitBlocks.rotZ = sign * TABLE_TOWER_TIP_START
            hitBlocks.rotY = Math.atan2(sign * dz, -sign * dx)
            hitBlocks.rotX = 0
          }
        }
        const flyingCup = propSkin === 'coffee' && cupPair &&
          (coffeeChallenge ? state.tapHistory.length > 0 || hasStarted : state.status === 'saved' || state.status === 'overdrive_oiia') &&
          (a.id === 'apple' ? a : b).y > BODY_RADIUS.apple * (a.id === 'apple' ? a.scale : b.scale) + 0.12
        chain(flyingCup ? '飞杯反杀' : '物物连撞', flyingCup ? 96 : 28)
      }
    }
  }
  if (contact.phoneImpact > 0) {
    const phone = bodies.find(pose => pose.id === 'apple')!
    let shookTable = false
    for (const toy of bodies) {
      if (toy.id !== 'piano' && toy.id !== 'blocks') continue
      const distance = Math.hypot(toy.x - phone.x, toy.z - phone.z)
      if (distance > 1.8 || toy.y > BODY_RADIUS[toy.id] * toy.scale + 0.3) continue
      toy.vy = Math.max(toy.vy, Math.min(6, contact.phoneImpact * (1 - distance / 2.2) * 0.61))
      toy.rotZ += (toy.x < phone.x ? -1 : 1) * 0.34
      shookTable = true
    }
    if (shookTable) chain('震塌木桌', 104)
  }
  if (contact.luggageBounce) chain('果冻压箱', 74)
  const cat = bodies.find(pose => pose.id === 'cat')
  if (!objective && intro && tick > HOVER_END && cat) cat.vx = Math.max(1.3, cat.vx)
  const fell = cat && cat.y < -1.25
  const timedOut = tick > 240 && state.levelId === 'heavy_fish' && state.activeLaws.length === 1 &&
    !state.activeLaws.includes('zero_g') && !state.activeLaws.includes('time_slow') && !hasStarted
  const hasJellyRescue = state.levelId !== 'jelly_party' || state.clutchSaved ||
    state.activeLaws.length > 1 || hasStarted
  const placedSafely = !!state.catPlaced && cat && Math.hypot(cat.x, cat.z) < RIM - BODY_RADIUS.cat * cat.scale &&
    Math.abs(cat.y - BODY_RADIUS.cat * cat.scale) < .02 && Math.hypot(cat.vx,cat.vy,cat.vz) < .16 && tick >= 16
  const won = placedSafely || (cat && hasJellyRescue && ((hasStarted && ops[0].target !== 'cat' && ops[0].target !== 'all' && tick > SLIDE_END) ||
    (cat.y >= 0.7 && Math.hypot(cat.x, cat.z) < RIM - 0.48 && tick >= 16)))
  let status: SimStepState['status'] = state.status
  const cup = coffeeChallenge ? bodies.find(pose => pose.id === 'apple') : undefined
  const clearance = cup ? BODY_RADIUS.apple * cup.scale : 0
  const stableCup = cup && Math.hypot(cup.x, cup.z) <= RIM - clearance &&
    Math.abs(cup.y - clearance) < 0.02 && Math.abs(cup.vy) < 0.1 &&
    Math.hypot(cup.vx, cup.vz) < 0.42 && Math.hypot(cup.rotX, cup.rotZ) < 0.12
  const cupStableFrames = stableCup && !scripted && !ops.some(op => op.tick > tick) ? (state.cupStableFrames ?? 0) + 1 : 0
  if (objective?.goal === 'tower') {
    const blocks = bodies.find(pose => pose.id === 'blocks')
    if (!blocks || blocks.y < 0 || Math.abs(blocks.rotZ) >= TABLE_TOWER_TIP_END) status = 'hilarious_fail'
    else if (tick >= 120 && Math.abs(blocks.rotZ) < TABLE_TOWER_TIP_START &&
      Math.hypot(blocks.x, blocks.z) <= RIM && Math.abs(blocks.y - BODY_RADIUS.blocks * blocks.scale) < 0.02 &&
      Math.abs(blocks.vy) < 0.1 && Math.hypot(blocks.vx, blocks.vz) < 0.42) status = 'saved'
    else status = 'playing'
  } else if (coffeeChallenge) {
    // A glancing impact can look stable for one display frame. Confirm 0.2 s at rest.
    if (cup && cup.y < -1.5) status = 'hilarious_fail'
    else if (cupStableFrames >= 12) status = 'saved'
    else if (objective && tick >= TABLE_CUP_SETTLE_LIMIT && cupStableFrames === 0) status = 'hilarious_fail'
    else if (status !== 'overdrive_oiia' && (Boolean(objective) || hasStarted || (intro && tick > HOVER_END))) status = 'playing'
  } else if (status !== 'overdrive_oiia') {
    if ((fell || timedOut) && status !== 'saved') status = 'hilarious_fail'
    else if ((status === 'playing' || hasStarted) && won) status = 'saved'
    else if (hasStarted || (intro && tick > HOVER_END)) status = status === 'saved' ? 'saved' : 'playing'
  }
  const wigLiftPct = status === 'overdrive_oiia' ? 999 : Math.round(clamp(Math.max(
    bounded(state.wigLiftPct, 0, 999), hasStarted ? bounded(matchingPatch?.wigLiftPct, 0, 999) : 0) + wigBonus, 0, 999))
  let sfxText = state.sfxText
  if (objective && (status === 'hilarious_fail' || status === 'saved')) {
    sfxText = tableResult(objective.goal, status, bodies)
  } else if (status === 'hilarious_fail') sfxText = coffeeChallenge ? '冰美式翻了' : '假发飞上天'
  else if (coffeeChallenge && status === 'saved') sfxText = '冰美式站稳了'
  return {
    ...state, propSkin, tick, cupStableFrames, bodies: bodies.map(cleanPose), status, wigLiftPct, chainCount, chainLabel,
    canPullActive: !!anchor, sfxText,
  }
}

export function advanceToTick(
  initial: SimStepState, targetTick: number, patch?: PhysicsPatch | null,
): SimStepState {
  const target = Math.trunc(bounded(targetTick, 0, MAX_DECISION_TICK))
  let state = initial
  while (state.tick < target) {
    const next = stepSim(state, patch)
    if (next === state) break
    state = next
  }
  return state
}

export function replayDecisionWithLaw(
  baseInitial: SimStepState, decisionTick: number, law: LawId,
): { decisionState: SimStepState; afterTap: SimStepState } {
  const decisionState = advanceToTick(baseInitial, decisionTick)
  return { decisionState, afterTap: applyQuickLaw(decisionState, law) }
}

const ALTERNATIVE_LAWS: Record<LevelId, readonly LawId[]> = {
  warmup: ['zero_g', 'jelly', 'tornado'],
  heavy_fish: ['time_slow', 'zero_g', 'repel'],
  jelly_party: ['jelly', 'giant', 'zero_g'],
  wig_orbit: ['tornado', 'repel', 'zero_g'],
}

export function getAlternativeLaws(usedLaw: LawId | null, levelId: LevelId = 'warmup'): LawId[] {
  const level = lookup(LEVELS, levelId) ?? LEVELS[0]
  return ALTERNATIVE_LAWS[level.id].filter(law => law !== usedLaw)
}

// Report the two visible poses at the frame the chosen objective settled.
export function tableObjectResults(state: SimStepState): { cup: string; tower: string } | null {
  if (!state.tableObjective || (state.status !== 'saved' && state.status !== 'hilarious_fail')) return null
  const cup = state.bodies.find(body => body.id === 'apple')
  const tower = state.bodies.find(body => body.id === 'blocks')
  const cupLabel = !cup || cup.y < 0 ? '杯子掉了' : (state.cupStableFrames ?? 0) >= 12 ? '杯子稳住了'
    : state.tableObjective.goal === 'cup' ? '杯子没稳住'
    : cup.y > BODY_RADIUS.apple * cup.scale + 0.12 ? '杯还在空中' : '杯还在动'
  const towerLabel = !tower || tower.y < 0 || Math.abs(tower.rotZ) >= TABLE_TOWER_TIP_END ? '积木塔倒了'
    : Math.abs(tower.rotZ) >= TABLE_TOWER_TIP_START ? '塔在倾倒'
    : state.tableObjective.goal === 'tower' && state.status === 'saved' ? '积木塔保住了' : '塔还立着'
  return { cup: cupLabel, tower: towerLabel }
}

export function describeRoundOutcome(state: SimStepState): string {
  if (state.tableObjective && (state.status === 'hilarious_fail' || state.status === 'saved')) {
    return tableResult(state.tableObjective.goal, state.status, state.bodies)
  }
  if (state.status === 'hilarious_fail') return '滑落桌下'
  if (state.status === 'overdrive_oiia') return '陀螺超载'
  if (state.status === 'saved') {
    if (!isCoffeeChallenge(state.levelId, state.propSkin)) return '救回来了'
    if (state.chainLabel === '飞杯反杀') return '飞杯连撞'
    const cup = state.bodies.find(pose => pose.id === 'apple')
    if (cup && Math.hypot(cup.x, cup.z) + BODY_RADIUS.apple * cup.scale >= RIM - 0.2) return '擦边留盘'
    return '稳落盘内'
  }
  return state.status === 'cliffhanger' ? '盘沿悬停' : '还在翻滚'
}

export function relayStart(initial: SimStepState): SimStepState {
  if (isCoffeeChallenge(initial.levelId, initial.propSkin)) {
    let state = initial
    for (let frame = initial.tick; frame < SLIDE_END; frame++) state = stepSim(state)
    return state
  }
  // Other challenges retain their original last half-second of the unassisted run.
  const frames = [initial]
  let sim = initial
  while (sim.tick < 240 && sim.status !== 'hilarious_fail') {
    sim = stepSim(sim)
    frames.push(sim)
    if (frames.length > 31) frames.shift()
  }
  return sim.status === 'hilarious_fail' ? frames[0] : initial
}

export function findReaction(laws: ReadonlyArray<LawId>): (typeof REACTIONS)[number] | null {
  const newestFirst = [...new Set([...laws].reverse())]
  for (let next = 1; next < newestFirst.length; next++) {
    const pair = [newestFirst[0], newestFirst[next]]
    const match = REACTIONS.find(entry => entry.laws.every(law => pair.includes(law)))
    if (match) return match
  }
  return null
}

export function newtonStageFor(wigLiftPct: number): { tier: 1 | 2 | 3; badge: string; quip: string } {
  const percent = bounded(wigLiftPct, 0, 999)
  if (percent >= 800) return { tier: 3, badge: '假发飞上天', quip: '物理课本连夜撤回' }
  if (percent >= 300) return { tier: 2, badge: '假发已离地', quip: '引力刚翘班' }
  return { tier: 1, badge: '盘沿见习生', quip: '苹果先等等' }
}

export function compileAlchemistPatch(
  slots: Slots, levelId: LevelId = 'warmup', seed = levelId === 'wig_orbit' ? cardForDay().seed : 1,
  seenCodes: ReadonlyArray<string> = [], propSkin?: PropSkinId,
): PhysicsPatch {
  const selection = parseSlots(slots) ?? DEFAULT_SLOTS
  const subject = lookup(SUBJECTS, selection.subject)!
  const law = lookup(LAWS, selection.law)!
  const trigger = lookup(TRIGGERS, selection.trigger)!
  const level = lookup(LEVELS, levelId) ?? LEVELS[0]
  const code = safeSeed(seed)
  const prop = lookup(PROP_SKINS, propSkin) ?? lookup(PROP_SKINS, level.defaultProp)!
  const reaction = findReaction([level.id === 'wig_orbit' ? orbitWeather(code) : level.defaultLaw, selection.law])
  const tick = TRIGGER_TICK[selection.trigger]
  const discoveryCode = reaction?.id ?? [subject.id, law.id, trigger.id].join('-')
  const wigLiftPct = clamp(law.wig + (reaction ? 176 : 59) + tick * 2 + code % 31, 0, 999)
  const ops: PhysicsOp[] = LAW_OPS[selection.law].map(op => ({
    ...op, ...(op.dv ? { dv: [...op.dv] as [number, number, number] } : {}),
    tick, target: selection.subject,
  }))
  if (reaction) ops.push({ op: 'spin', target: selection.subject, value: 1.2, tick: tick + 9 })
  return {
    v: 1, levelId: level.id, seed: code, slots: { ...selection },
    spellText: [subject.title, law.title, trigger.title].join(' · '),
    reactionId: reaction?.id ?? null, reactionTitle: reaction?.title ?? law.title,
    discoveryCode, isFirstDiscovery: !seenCodes.includes(discoveryCode), wigLiftPct,
    newtonComment: newtonStageFor(wigLiftPct).quip, propSkin: prop.id, qcVerdict: prop.qcVerdict, aiGenerated: false, ops,
  }
}

export function validateExternalPatch(
  raw: unknown, fallbackSlots: Slots, levelId: LevelId = 'warmup', seed?: number,
  seenCodes: ReadonlyArray<string> = [], propSkin?: PropSkinId,
): PhysicsPatch {
  const fallback = compileAlchemistPatch(fallbackSlots, levelId, seed, seenCodes, propSkin)
  const candidate = record(raw)
  if (candidate?.v !== 1) return fallback
  const ops = patchOps(candidate.ops)
  if (ops.length === 0) return fallback
  return { ...fallback, ops, qcVerdict: shortPlainText(candidate.qcVerdict, 14) || fallback.qcVerdict, aiGenerated: true }
}

export function randomContrastSlots(current?: Slots): Slots {
  const alternatives = <T extends { id: string }>(items: readonly T[], currentId?: string): T['id'] => {
    const choices = items.filter(entry => entry.id !== currentId)
    return choices[Math.floor(Math.random() * choices.length)].id
  }
  return {
    subject: alternatives(SUBJECTS, current?.subject), law: alternatives(LAWS, current?.law),
    trigger: alternatives(TRIGGERS, current?.trigger),
  }
}

export function buildHandoffBundle(state: SimStepState): HandoffBundle {
  const energy = Math.round(bounded(state.wigLiftPct, 0, 999))
  const clutchMs = Math.round(bounded(state.clutchMs, 0, 900))
  return {
    seedContext: { levelId: state.levelId, firstLaw: state.tapHistory[0] ?? 'zero_g', seed: state.seed },
    earnedArtifact: { energy, clutchMs, beatPct: Math.round(energy / 999 * 100), badge: newtonStageFor(energy).badge },
    unfinishedHook: state.status === 'overdrive_oiia' ? '带旋转橘进 3D' : '带上这局，再叠一招',
  }
}

function shareCount(value: unknown, max: number): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max ? value : undefined
}

export function encodeShareQuery(
  patch: Pick<PhysicsPatch, 'slots' | 'levelId' | 'seed'> & Partial<PhysicsPatch> & ShareOptions,
  flags?: Partial<FeatureFlags>, options?: ShareOptions,
): string {
  const path = 'pages/index/index'
  if (flags?.enableSocial === false) return path
  const slots = parseSlots(patch.slots) ?? DEFAULT_SLOTS
  const level = lookup(LEVELS, patch.levelId) ?? LEVELS[0]
  const prop = lookup(PROP_SKINS, options?.propSkin ?? patch.propSkin)
  const persona = lookup(PERSONAS, options?.personaId ?? patch.personaId)
  const relayDepth = shareCount(options?.relayDepth ?? patch.relayDepth, 99)
  const firstTick = shareCount(options?.firstTick ?? patch.firstTick, MAX_DECISION_TICK)
  return path + '?from=share&levelId=' + level.id + '&seed=' + safeSeed(patch.seed) +
    '&firstLaw=' + slots.law + '&subject=' + slots.subject + '&law=' + slots.law + '&trigger=' + slots.trigger +
    (prop ? '&propSkin=' + prop.id : '') + (relayDepth !== undefined ? '&relayDepth=' + relayDepth : '') +
    (persona ? '&personaId=' + persona.id : '') +
    (firstTick !== undefined ? '&firstTick=' + firstTick : '')
}

export function decodeShareParams(params: Record<string, string | undefined>): ShareParams {
  const value = params.seed
  const prop = lookup(PROP_SKINS, params.propSkin)
  const persona = lookup(PERSONAS, params.personaId)
  const relayDepth = typeof params.relayDepth === 'string' && /^\d{1,2}$/.test(params.relayDepth)
    ? shareCount(Number(params.relayDepth), 99) : undefined
  const chainCount = typeof params.chainCount === 'string' && /^\d{1,16}$/.test(params.chainCount)
    ? shareCount(Number(params.chainCount), Number.MAX_SAFE_INTEGER) : undefined
  const firstTick = typeof params.firstTick === 'string' && /^\d{1,3}$/.test(params.firstTick)
    ? shareCount(Number(params.firstTick), MAX_DECISION_TICK) : undefined
  return {
    levelId: lookup(LEVELS, params.levelId)?.id ?? 'warmup',
    firstLaw: lookup(LAWS, params.firstLaw)?.id ?? null, slots: parseSlots(params),
    seed: typeof value === 'string' && /^\d{1,10}$/.test(value) ? safeSeed(Number(value)) : 1,
    ...(prop ? { propSkin: prop.id } : {}),
    ...(persona ? { personaId: persona.id } : {}),
    ...(relayDepth !== undefined ? { relayDepth } : {}),
    ...(chainCount !== undefined ? { chainCount } : {}),
    ...(firstTick !== undefined ? { firstTick } : {}),
  }
}

const TRACE_ICONS: Record<TraceColor, string> = {
  green: '🟩', amber: '🟨', purple: '🟪', cyan: '🟦', pink: '🟥', blue: '⬛',
}

export function formatWordleReceipt(state: SimStepState, patch: PhysicsPatch | null): {
  header: string; blocks: string; icons: string; badge: string; aiTag: 'AI 生成'
} {
  const trace = state.traceBlocks.slice(-6)
  const stage = newtonStageFor(Math.max(state.wigLiftPct, patch?.wigLiftPct ?? 0))
  const icons = patch ? [lookup(SUBJECTS, patch.slots.subject)?.icon, lookup(LAWS, patch.slots.law)?.icon,
    lookup(TRIGGERS, patch.slots.trigger)?.icon].join(' ') : '🐱 🍏'
  return {
    header: '牛顿假发离地表 ' + Math.round(bounded(Math.max(state.wigLiftPct, patch?.wigLiftPct ?? 0), 0, 999)) + '%',
    blocks: trace.map(color => TRACE_ICONS[color]).join('') + '⬜'.repeat(6 - trace.length),
    icons, badge: stage.badge, aiTag: 'AI 生成',
  }
}

export interface CardData {
  day: number
  weather: ReturnType<typeof dailyWeather>
  levelId: 'warmup'
  seed: number
}

export function cardForDay(now = Date.now()): CardData {
  const epoch = Number.isFinite(now) ? now : 0
  const day = todayIndex(epoch)
  return {
    day, weather: dailyWeather(day), levelId: 'warmup', seed: safeSeed(Math.floor((epoch + BEIJING_OFFSET) / DAY_MS)),
  }
}
