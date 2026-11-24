import { LAWS, PROP_SKINS, applyQuickLaw, buildHandoffBundle, cardForDay, createInitialSim, dailyWeather, relayStart, stepSim } from './shared/newton-core'
import type { CardData, LawId, SimStepState } from './shared/newton-core'

export { cardForDay }
export type { CardData }
export type CardRequest = (path: '/api/dy_card/data') => Promise<unknown>

const QUICK_IDS: readonly LawId[] = ['zero_g', 'jelly', 'tornado']
export const QUICK_LAWS = LAWS.filter(law => QUICK_IDS.includes(law.id))
const KEYS = ['day', 'weather', 'levelId', 'seed']

export function isCardData(value: unknown): value is CardData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const data = value as Partial<CardData>
  if (Object.keys(data).length !== KEYS.length || !KEYS.every(key => Object.prototype.hasOwnProperty.call(data, key)) ||
    typeof data.day !== 'number' || !Number.isInteger(data.day) || data.day < 1 || data.day > 7 ||
    data.levelId !== 'warmup' || typeof data.seed !== 'number' || !Number.isInteger(data.seed) ||
    data.seed < 0 || data.seed > 2_147_483_647 || !data.weather || typeof data.weather !== 'object') return false
  const expected = dailyWeather(data.day)
  const weather = data.weather
  return Object.keys(weather).length === 4 && weather.day === expected.day && weather.title === expected.title &&
    weather.icon === expected.icon && weather.modifierLaw === expected.modifierLaw
}

export interface CardState { data: CardData; round: SimStepState; firstShot: SimStepState | null; touched: boolean }
export type CardAction = { type: 'load'; value: unknown } | { type: 'advance'; frames: number } |
  { type: 'tap'; law: LawId; frames?: number } | { type: 'compare'; law: LawId } | { type: 'replay' }

export function initializeCard(data: CardData): CardState {
  return { data, round: createInitialSim(data.levelId, data.seed), firstShot: null, touched: false }
}

export function reduceCard(state: CardState, action: CardAction): CardState {
  if (action.type === 'load') {
    if (state.touched || !isCardData(action.value)) return state
    if (action.value.day !== state.data.day || action.value.seed !== state.data.seed) return initializeCard(action.value)
    return { ...state, data: action.value }
  }
  if (action.type === 'replay') return { ...initializeCard(state.data), touched: true }

  if (action.type === 'compare') {
    if (!QUICK_IDS.includes(action.law) || (state.round.status !== 'saved' && state.round.status !== 'hilarious_fail')) return state
    const firstShot = state.firstShot ?? relayStart(createInitialSim(state.data.levelId, state.data.seed))
    return { ...state, firstShot, round: applyQuickLaw(firstShot, action.law), touched: true }
  }

  let round = state.round
  const frames = action.frames ?? 0
  for (let i = 0; Number.isFinite(frames) && i < Math.min(120, Math.floor(frames)); i++) round = stepSim(round)
  if (action.type === 'tap' && QUICK_IDS.includes(action.law)) {
    const next = applyQuickLaw(round, action.law)
    const firstShot = state.firstShot ?? (next.tapHistory.length > 0 ? round : null)
    return { ...state, firstShot, round: next, touched: true }
  }
  return round === state.round ? state : { ...state, round }
}

export function buildCardHandoffPath(round: SimStepState, firstTick?: number): string | null {
  if (round.tapHistory.length === 0) return null
  const hasFirstTick = typeof firstTick === 'number' && Number.isInteger(firstTick) && firstTick >= 0 && firstTick <= 120
  if (round.status === 'hilarious_fail' && !hasFirstTick) return null
  const { seedContext, earnedArtifact } = buildHandoffBundle(round)
  const propSkin = PROP_SKINS.find(prop => prop.id === round.propSkin)?.id ?? 'coffee'
  const chainCount = Number.isSafeInteger(round.chainCount) && round.chainCount >= 0 ? round.chainCount : 0
  return 'pages/index/index?from=opencard&levelId=' + seedContext.levelId +
    '&firstLaw=' + seedContext.firstLaw + '&seed=' + seedContext.seed + (hasFirstTick ? '&firstTick=' + firstTick : '') +
    '&energy=' + earnedArtifact.energy + '&clutchMs=' + earnedArtifact.clutchMs +
    '&beatPct=' + earnedArtifact.beatPct + '&propSkin=' + propSkin + '&chainCount=' + chainCount
}

// [PLATFORM-INTEGRATION: supply the template's request wrapper through the request prop.]
export const localCardRequest: CardRequest = async () => cardForDay()
