import React, { useEffect, useRef, useState } from 'react'
import Taro, { useDidHide, useDidShow, useRouter, useShareAppMessage } from '@tarojs/taro'
import { Button, ScrollView, Text, View } from '@tarojs/components'
import {
  SUBJECTS, LAWS, TRIGGERS, LEVELS, OUTFITS, PROVINCES, REACTIONS, DEFAULT_FLAGS,
  cardForDay, todayIndex, dailyWeather, createInitialSim, applyQuickLaw, advanceToTick, compileAlchemistPatch,
  validateExternalPatch, randomContrastSlots, findReaction, newtonStageFor, buildHandoffBundle,
  encodeShareQuery, decodeShareParams, formatWordleReceipt, relayStart, PROP_SKINS, PERSONAS,
  DAILY_FREE_AI_RUNS, FAIL_STREAK_FOR_RESCUE, evaluatePlayerBehavior, validateDirectorReaction,
  describeRoundOutcome, tableObjectResults, getAlternativeLaws, isSquadEnabled,
} from '../../shared/newton-core'
import type { SubjectId, LawId, LevelId, OutfitId, ProvinceId, PhysicsPatch, FeatureFlags, SimStepState, BehaviorSnapshot, DirectorReaction, PropSkinId } from '../../shared/newton-core'
import { createTableRound, readTableChallenge, tableSharePath } from '../../shared/table-challenge'
import type { TableChallenge, TableGoal, TablePlace } from '../../shared/table-challenge'
import { useToybox3D } from './use-toybox-3d'
import { ToyboxStage } from './toybox-stage'
import './index.css'

type Slots = PhysicsPatch['slots']
type Drawer = 'table' | 'magic' | 'more' | 'biz' | 'lab' | 'closet' | 'squad' | 'receipt' | 'book' | 'settings' | null
type Collection = { energy: number; worn: OutfitId | null; outfits: OutfitId[]; reactions: string[]; codes: string[] }
type TableRound = { kind: 'house' | 'preview' | 'trial' | 'fixed' | 'received'; challenge: TableChallenge }
type Decision = { state: SimStepState; patch: PhysicsPatch | null; law: LawId }
type RoundStart = { state: SimStepState; patch: PhysicsPatch | null; firstLaw: LawId | null; slots: Slots | null; waiting: boolean; decision: Decision | null }
type Outcome = { moves: string; result: string }

const TABLE_PLACES = { dorm: { icon: '🛏', label: '宿舍' }, desk: { icon: '⌨', label: '桌搭' } }
const TABLE_GOALS = { cup: { icon: '☕', label: '保杯' }, tower: { icon: '🧱', label: '保塔' } }
const TABLE_LAWS: readonly LawId[] = ['zero_g', 'jelly', 'tornado']
const TABLE_MODES = { house: '', preview: '我的题', trial: '试玩', fixed: '已定题', received: '好友的题' }
const HOUSE_TABLES: readonly TableChallenge[] = [
  { place:'dorm', goal:'cup', variant:0 }, { place:'desk', goal:'tower', variant:0 },
  { place:'desk', goal:'cup', variant:1 }, { place:'dorm', goal:'tower', variant:1 },
]
const HOME_SHARE = { title: '牛顿哭了 3D', path: '/pages/index/index' }
const STORAGE = 'newton.toybox.collection.v1'
const collectedEntries = new Set<string>()
function entryNumber(raw: string | undefined, max: number) {
  if (typeof raw !== 'string' || !/^-?\d+$/.test(raw)) return 0
  const n = Number(raw)
  return Number.isSafeInteger(n) ? Math.max(0, Math.min(n, max)) : 0
}
const EMPTY: Collection = { energy: 0, worn: null, outfits: [], reactions: [], codes: [] }
const DEFAULT_SLOTS: Slots = { subject: 'cat', law: 'zero_g', trigger: 'instant' }
function restorePatch(params: Record<string, string | undefined>, entry: ReturnType<typeof decodeShareParams>) {
  if (!entry.slots || params.recipe === '0') return null
  const local = compileAlchemistPatch(entry.slots, entry.levelId, entry.seed, [], entry.propSkin)
  if (!params.ops || params.ops.length > 1800) return local
  try {
    const encoded = params.ops.startsWith('%') ? decodeURIComponent(params.ops) : params.ops
    const ops = JSON.parse(encoded)
    return validateExternalPatch({ v: 1, ops, qcVerdict: params.qcVerdict }, entry.slots, entry.levelId, entry.seed, [], entry.propSkin)
  } catch { return local }
}
const TAB_TITLES: Record<LevelId, string> = { warmup: '冰美式', heavy_fish: '防摔机', jelly_party: '硬塞箱', wig_orbit: '猫罐头' }
const SYMBOLS: Record<LawId, string> = { zero_g: '↑', jelly: '≈', tornado: '◎', giant: '✚', repel: '↔', time_slow: '◷' }
const SHORT: Record<LawId, string> = { zero_g: '失重', jelly: '果冻', tornado: '旋风', giant: '放大', repel: '弹开', time_slow: '慢放' }
const EQUIP_ICON: Record<OutfitId, string> = { shades: '🕶️', apple_hat: '🍎', spring_bow: '🎀', newton_wig: '🧑‍🦳' }
function readCollection(): Collection {
  try {
    const value = Taro.getStorageSync(STORAGE)
    if (!value || typeof value !== 'object') return EMPTY
    const outfits = OUTFITS.map(item => item.id).filter(id => Array.isArray(value.outfits) && value.outfits.includes(id))
    return {
      outfits, energy: Number.isSafeInteger(value.energy) ? Math.max(0, value.energy) : 0,
      worn: outfits.includes(value.worn) ? value.worn : null,
      codes: Array.isArray(value.codes) ? value.codes.filter((code: unknown) => typeof code === 'string').slice(-128) : [],
      reactions: REACTIONS.map(r => r.id).filter(id => Array.isArray(value.reactions) && value.reactions.includes(id)),
    }
  } catch { return EMPTY }
}
function flagsFrom(params: Record<string, string | undefined>): FeatureFlags {
  return {
    enableRetention: DEFAULT_FLAGS.enableRetention && params.enableRetention !== '0' && params.retention !== '0',
    enableSquad: params.enableSquad === '1' || params.squad === '1',
    enableSocial: DEFAULT_FLAGS.enableSocial && params.enableSocial !== '0' && params.social !== '0',
  }
}
function discoveryNumber(recipe: PhysicsPatch) {
  const reaction = REACTIONS.findIndex(r => r.id === recipe.discoveryCode)
  const slotIndex = SUBJECTS.findIndex(s => s.id === recipe.slots.subject) * LAWS.length * TRIGGERS.length +
    LAWS.findIndex(l => l.id === recipe.slots.law) * TRIGGERS.length + TRIGGERS.findIndex(t => t.id === recipe.slots.trigger)
  return String(1 + (reaction >= 0 ? reaction : REACTIONS.length + slotIndex)).padStart(3, '0')
}

function starting(level: LevelId, seed: number, firstLaw: LawId | null, prop?: PropSkinId,
  relayDepth = 0, directorCounter: SimStepState['directorCounter'] = null) {
  const state = { ...createInitialSim(level, seed, prop), relayDepth, directorCounter }
  return firstLaw ? applyQuickLaw(state, firstLaw) : state
}

function isCoffeeRound(state: SimStepState) {
  return state.levelId === 'warmup' && state.propSkin === 'coffee'
}

function roundSettled(state: SimStepState) {
  return state.status === 'saved' || state.status === 'hilarious_fail' || (!isCoffeeRound(state) && state.status === 'overdrive_oiia')
}

function playedRound(state: SimStepState) {
  return (state.handMoves ?? 0) > 0 || state.tapHistory.length > 0
}

function movesLabel(state: SimStepState, firstLaw: LawId) {
  return state.tapHistory.length > 1 ? '连招' : SYMBOLS[firstLaw]
}

function roundOutcome(state: SimStepState) {
  return !state.tableObjective || roundSettled(state) ? describeRoundOutcome(state) : ''
}

function comparisonOutcome(state: SimStepState) {
  const pair = tableObjectResults(state)
  return pair ? pair.cup + '、' + pair.tower : roundOutcome(state)
}

const QUOTA_KEY = 'newton.toybox.daily-ai.v2'
type Quota = { seed: number; remaining: number }
let sessionQuota: Quota | undefined
function readQuota(): Quota {
  const seed = cardForDay().seed
  if (sessionQuota?.seed === seed) return sessionQuota
  try {
    const saved = Taro.getStorageSync(QUOTA_KEY)
    if (saved?.seed === seed && Number.isInteger(saved.remaining) && saved.remaining >= 0 &&
      saved.remaining <= DAILY_FREE_AI_RUNS) return sessionQuota = { seed, remaining: saved.remaining }
  } catch { /* Use today's session allowance when storage is unavailable. */ }
  return sessionQuota = { seed, remaining: DAILY_FREE_AI_RUNS }
}
function writeQuota(remaining: number): Quota {
  const next = { seed: cardForDay().seed, remaining }
  sessionQuota = next
  try { Taro.setStorageSync(QUOTA_KEY, next) } catch { /* Session fallback. */ }
  return next
}

function useDirector(initial: SimStepState) {
  const [stats, setStats] = useState<BehaviorSnapshot>(() => ({
    totalTaps: 0, clutchCount: Number(initial.clutchSaved), failStreak: 0, chainTotal: 0,
    lawCounts: {}, propSkin: initial.propSkin, levelId: initial.levelId,
  }))
  const latest = useRef(stats)
  const [director, setDirector] = useState(() => evaluatePlayerBehavior(stats))
  const counter = useRef<DirectorReaction | null>(null)
  const pending = useRef<(() => void) | null>(null)
  function cancel() {
    pending.current?.()
    pending.current = null
  }
  useDidHide(cancel)
  useEffect(() => cancel, [])
  function update(next: BehaviorSnapshot, react = false) {
    latest.current = next
    setStats(next)
    if (!react) return
    cancel()
    counter.current = evaluatePlayerBehavior(next)
    setDirector(counter.current)
    let active = true
    let abort: (() => void) | undefined
    let deadline: ReturnType<typeof setTimeout> | undefined
    function finish(data?: unknown) {
      if (!active) return
      active = false
      clearTimeout(deadline)
      pending.current = null
      const reaction = validateDirectorReaction(data, next)
      counter.current = data && typeof data === 'object' && 'aiGenerated' in data && data.aiGenerated === false
        ? { ...reaction, aiGenerated: false } : reaction
      setDirector(counter.current)
    }
    const timer = setTimeout(() => {
      // [PLATFORM-INTEGRATION: bind approved service origin for /api/newton/director-react]
      try {
        const req = Taro.request({ url: '/api/newton/director-react', method: 'POST', data: next, timeout: 2200 })
        abort = () => req.abort?.()
        deadline = setTimeout(() => { finish(); abort?.() }, 2200)
        void req.then(r => finish(r.statusCode >= 200 && r.statusCode < 300 ? r.data : undefined)).catch(() => finish())
      } catch { finish() }
    }, 160)
    pending.current = () => { active = false; clearTimeout(timer); clearTimeout(deadline); abort?.() }
  }
  function observe(before: SimStepState, next: SimStepState) {
    const clutch = next.clutchSaved && !before.clutchSaved
    const failed = next.status === 'hilarious_fail' && before.status !== next.status
    const saved = before.status !== next.status &&
      (next.status === 'saved' || (!isCoffeeRound(next) && next.status === 'overdrive_oiia'))
    const chains = next.chainCount - before.chainCount
    if (!clutch && !failed && !saved && !chains) return
    const stats = latest.current
    const failStreak = failed ? stats.failStreak + 1 : saved ? 0 : stats.failStreak
    update({ ...stats, clutchCount: stats.clutchCount + Number(clutch), failStreak,
      chainTotal: stats.chainTotal + Math.max(0, chains) }, clutch || (failed && failStreak >= FAIL_STREAK_FOR_RESCUE))
  }
  function tap(law?: LawId) {
    const stats = latest.current
    const totalTaps = stats.totalTaps + 1
    update({ ...stats, totalTaps, lawCounts: law
      ? { ...stats.lawCounts, [law]: (stats.lawCounts[law] ?? 0) + 1 } : stats.lawCounts }, totalTaps % 3 === 0)
  }
  function context(state: SimStepState, react: boolean) {
    const stats = latest.current
    if (state.propSkin === stats.propSkin && state.levelId === stats.levelId) return
    cancel()
    update({ ...stats, propSkin: state.propSkin, levelId: state.levelId }, react)
  }
  return { director, counter, stats, observe, tap, context, cancel }
}

function Tap({ children, onTap, extra = '' }: { children: React.ReactNode; onTap: () => void; extra?: string }) {
  return <View role='button' className={'tap ' + extra} hoverClass='pressed' hoverStartTime={0} hoverStayTime={80} onClick={onTap}>{children}</View>
}

type SquadRow = { provinceId: ProvinceId; total: number }
function validBoard(raw: unknown): raw is SquadRow[] {
  return Array.isArray(raw) && raw.every(row => row && PROVINCES.some(p => p.id === row.provinceId)
    && Number.isSafeInteger(row.total) && row.total >= 0)
}

export default function ToyboxPage() {
  const routerParams = useRouter().params ?? {}
  const [fromTable] = useState(routerParams.from === 'table')
  const [receivedTable] = useState(() => readTableChallenge({
    from: routerParams.from, place: routerParams.place, goal: routerParams.goal, v: routerParams.v,
  }))
  const invalidTableEntry = useRef(fromTable && !receivedTable)
  const params = fromTable ? {} : routerParams
  const [table, setTable] = useState<TableRound | null>(() => {
    if (receivedTable) return { kind: 'received', challenge: receivedTable }
    const hasEntry = ['from','levelId','seed','firstLaw','propSkin','subject','relayDepth','recipe'].some(key => params[key] !== undefined)
    return !fromTable && !hasEntry ? { kind: 'house', challenge: HOUSE_TABLES[0] } : null
  })
  const tableRef = useRef(table)
  const [tablePlace, setTablePlace] = useState<TablePlace | null>(null)
  const [entry] = useState(() => {
    const decoded = decodeShareParams(params)
    const fromCard = params.from === 'opencard'
    const cardFirstLaw = fromCard && decoded.firstLaw !== null && params.levelId === decoded.levelId &&
      typeof params.seed === 'string' && /^\d{1,10}$/.test(params.seed) && Number(params.seed) === decoded.seed
    const daily = (fromCard && !cardFirstLaw) || (fromTable && !receivedTable)
    const preset = daily ? cardForDay() : null
    return {
      ...decoded, levelId: preset?.levelId ?? decoded.levelId, seed: preset?.seed ?? decoded.seed,
      firstLaw: daily ? null : decoded.firstLaw, propSkin: daily ? undefined : decoded.propSkin,
      slots: fromCard ? null : decoded.slots, relayDepth: fromCard ? undefined : decoded.relayDepth,
      chainCount: daily ? undefined : decoded.chainCount,
      daily, cardFirstLaw, energy: cardFirstLaw ? entryNumber(params.energy, 999) : 0,
      clutch: cardFirstLaw ? entryNumber(params.clutchMs, 900) : 0,
    }
  })
  const [flags, setFlags] = useState(() => flagsFrom(routerParams))
  const [collection, setCollection] = useState(readCollection)
  const collectionRef = useRef(collection)
  const [slots, setSlots] = useState<Slots>(entry.slots ?? { ...DEFAULT_SLOTS, law: entry.firstLaw ?? 'zero_g' })
  const [applied, setApplied] = useState<PhysicsPatch | null>(() => restorePatch(params, entry))
  const [firstRound] = useState<RoundStart>(() => {
    if (table) return {
      state: createTableRound(table.challenge), decision: null, patch: null, firstLaw: null, slots: null, waiting: true,
    }
    const depth = entry.relayDepth ?? 0
    const base = starting(entry.levelId, entry.seed, null, entry.propSkin, depth)
    const decisionState = depth ? relayStart(base)
      : entry.cardFirstLaw && entry.firstTick !== undefined ? advanceToTick(base, entry.firstTick) : base
    const firstLaw = depth || applied ? null : entry.firstLaw
    const initial = firstLaw ? applyQuickLaw(decisionState, firstLaw) : decisionState
    const decision = firstLaw && initial.tapHistory.length ? { state: decisionState, patch: applied, law: firstLaw } : null
    // Card totals describe the finished clip. A timed replay gets its own chain and outcome.
    const state = entry.cardFirstLaw && entry.firstTick !== undefined ? (decision ? initial : base) : {
      ...initial, chainCount: entry.chainCount ?? initial.chainCount,
      chainLabel: entry.chainCount ? (depth ? '好友留局' : '猫爪偷推') : initial.chainLabel,
      wigLiftPct: Math.max(initial.wigLiftPct, entry.energy),
      clutchSaved: initial.clutchSaved || entry.clutch > 0, clutchMs: entry.clutch || initial.clutchMs,
    }
    return { state, decision, patch: applied, firstLaw: decision?.law ?? null, slots: entry.slots, waiting: depth > 0 || entry.daily }
  })
  const firstState = firstRound.state
  const behavior = useDirector(firstState)
  const { director } = behavior
  const [activeCounter, setActiveCounter] = useState<DirectorReaction | null>(null)
  const roundStart = useRef<RoundStart>(firstRound)
  const decision = useRef<Decision | null>(firstRound.decision)
  const [previousOutcome, setPreviousOutcome] = useState<Outcome | null>(null)
  const pendingRelayPatch = useRef(firstState.relayDepth ? applied : null)
  const motion = useToybox3D(firstState, firstRound.waiting ? null : applied,
    !table && flags.enableRetention ? collection.worn : null, (before, next) => {
      if (!next.tableObjective) behavior.observe(before, next)
    }, firstRound.waiting)
  const state = motion.snapshot
  const [drawer, setDrawer] = useState<Drawer>(null)
  const [pureMode, setPure] = useState(false)
  const [selectedToy, setSelectedToy] = useState<SubjectId>('cat')
  const [busy, setBusy] = useState(false)
  const [quota, setQuota] = useState(readQuota)
  const rollover = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [showCardFirstLaw, setShowCardFirstLaw] = useState(entry.cardFirstLaw && !!firstRound.decision)
  const prop = PROP_SKINS.find(p => p.id === state.propSkin)!
  const cupRound = isCoffeeRound(state)
  const sender = PERSONAS.find(p => p.id === entry.personaId)
  const [lastLaw, setLastLaw] = useState<LawId | null>(firstRound.firstLaw)
  const [board, setBoard] = useState<SquadRow[]>([])
  const [boosting, setBoosting] = useState(false)
  const [squadNote, setSquadNote] = useState('选一队，送出你的气飞值')
  const [feedback, setFeedback] = useState('')
  const [day, setDay] = useState(todayIndex)
  const weather = dailyWeather(state.levelId === 'wig_orbit' ? (state.seed + 3) % 7 + 1 : day)
  const run = useRef(0)
  const cancelCharge = useRef<(() => void) | null>(null)
  const socialRequest = useRef(0)
  const boostLock = useRef(false)
  const awarded = useRef(new Set<LawId>())
  const stamp = newtonStageFor(state.wigLiftPct)
  const artifact = buildHandoffBundle(state).earnedArtifact
  const level = LEVELS.find(l => l.id === state.levelId)!
  const receipt = formatWordleReceipt(state, applied)
  const replayLaw = useRef<LawId | null>(entry.firstLaw)
  const firstShareSlots = useRef<Slots | null>(entry.slots)
  const live = useRef(true)
  function collect(change: (previous: Collection) => Collection) {
    const next = change(collectionRef.current)
    collectionRef.current = next
    setCollection(next)
    try { Taro.setStorageSync(STORAGE, next) } catch { /* Items remain available this session. */ }
  }
  function stopCharge() {
    run.current++
    cancelCharge.current?.()
    cancelCharge.current = null
    setBusy(false)
  }
  function refreshDay() {
    clearTimeout(rollover.current)
    setDay(todayIndex())
    setQuota(readQuota())
    const dayMs = 86_400_000
    const sinceMidnight = (Date.now() + 8 * 3_600_000) % dayMs
    rollover.current = setTimeout(refreshDay, dayMs - sinceMidnight)
  }
  useDidHide(() => { stopCharge(); clearTimeout(rollover.current) })
  useDidShow(refreshDay)
  useEffect(() => {
    live.current = true
    refreshDay()
    if (entry.energy > 0 && flags.enableRetention) {
      const key = [entry.levelId, entry.seed, entry.firstLaw, entry.energy, entry.clutch].join('|')
      if (!collectedEntries.has(key)) {
        collectedEntries.add(key)
        collect(c => ({ ...c, energy: c.energy + entry.energy }))
      }
    }
    return () => {
      live.current = false
      clearTimeout(rollover.current)
      run.current++
      socialRequest.current++
      cancelCharge.current?.()
    }
  }, [])
  function newRound(levelId: LevelId, seed: number, law: LawId | null, skin?: PropSkinId) {
    const counter = behavior.counter.current
    setActiveCounter(counter)
    pendingRelayPatch.current = null
    const base = starting(levelId, seed, null, skin, 0, counter?.counterMode)
    if (!law) return base
    const next = applyQuickLaw(base, law)
    behavior.observe(base, next)
    return next
  }
  function updateTable(next: TableRound | null) {
    tableRef.current = next
    setTable(next)
  }
  function startTable(challenge: TableChallenge, kind: 'house' | 'preview' | 'trial') {
    behavior.cancel()
    const next = createTableRound(challenge)
    updateTable({ kind, challenge })
    roundStart.current = { state: next, patch: null, firstLaw: null, slots: null, waiting: true, decision: null }
    setActiveCounter(null)
    retry()
    setShowCardFirstLaw(false)
  }
  function openTablePicker() {
    setTablePlace(null)
    pickDrawer('table')
  }
  function swapTable() {
    const current = tableRef.current
    if (!current || (current.kind !== 'preview' && current.kind !== 'trial')) return
    const challenge = current.challenge
    startTable({ ...challenge, variant: challenge.variant === 0 ? 1 : 0 }, 'preview')
  }
  function fixTable() {
    const current = tableRef.current
    const result = motion.sim.current
    if (current?.kind !== 'trial' || !result.tableObjective || !playedRound(result) || !roundSettled(result)) return
    updateTable({ ...current, kind: 'fixed' })
  }
  function reset(levelId: LevelId, seed = cardForDay().seed, skin?: PropSkinId) {
    stopCharge()
    invalidTableEntry.current = false
    updateTable(null)
    const law = levelId === 'wig_orbit' ? dailyWeather((seed + 3) % 7 + 1).modifierLaw : null
    const base = newRound(levelId, seed, null, skin)
    const next = law ? applyQuickLaw(base, law) : base
    if (law) behavior.observe(base, next)
    decision.current = law ? { state: base, patch: null, law } : null
    setPreviousOutcome(null)
    behavior.context(next, true)
    roundStart.current = { state: next, patch: null, firstLaw: law, slots: null, waiting: false, decision: decision.current }
    motion.replace(next, null)
    setLastLaw(law)
    replayLaw.current = law
    firstShareSlots.current = null
    awarded.current.clear()
    setApplied(null)
    setShowCardFirstLaw(false)
    setFeedback('')
    setDrawer(null)
  }
  function retry() {
    stopCharge()
    const original = roundStart.current
    decision.current = original.decision
    setPreviousOutcome(null)
    const waiting = original.waiting
    pendingRelayPatch.current = waiting ? original.patch : null
    motion.replace(original.state, waiting ? null : original.patch, waiting)
    setApplied(original.patch)
    setSlots(original.slots ?? { ...DEFAULT_SLOTS, law: original.firstLaw ?? 'zero_g' })
    setLastLaw(waiting ? null : original.firstLaw)
    firstShareSlots.current = original.slots
    replayLaw.current = original.firstLaw
    awarded.current.clear()
    setFeedback('')
    setDrawer(null)
  }
  function prepareTap() {
    const before = motion.sim.current
    if (before.status === 'hilarious_fail' || (isCoffeeRound(before) && before.status === 'saved')) retry()
    const current = motion.sim.current
    attachRelayRecipe(current)
  }
  function attachRelayRecipe(current = motion.sim.current) {
    if (pendingRelayPatch.current) {
      const recipe = pendingRelayPatch.current
      motion.patch.current = { ...recipe, ops: recipe.ops.map(op => ({ ...op, tick: Math.min(240, current.tick + 1 + op.tick) })) }
      pendingRelayPatch.current = null
    }
  }
  function launch(id: SubjectId) {
    if (tableRef.current?.kind === 'preview') return
    prepareTap()
    if (!tableRef.current) behavior.tap()
    motion.launch(id)
  }
  function quick(law: LawId, compare = false) {
    const currentTable = tableRef.current
    if (currentTable && (currentTable.kind === 'preview' || !TABLE_LAWS.includes(law))) return
    const finished = motion.sim.current
    const anchor = decision.current
    if (anchor && roundSettled(finished) && (compare || isCoffeeRound(finished) || finished.status === 'hilarious_fail')) {
      setPreviousOutcome({ moves: movesLabel(finished, anchor.law), result: comparisonOutcome(finished) })
      // Physics states are immutable. Keeping this exact frame also preserves its counter and pending recipe.
      motion.replace(anchor.state, anchor.patch)
      decision.current = { ...anchor, law }
      replayLaw.current = law
    } else {
      if (compare) return
      prepareTap()
    }
    const before = motion.sim.current
    const next = motion.tapLaw(law)
    if (!before.tapHistory.length && next.tapHistory.length) {
      decision.current = { state: before, patch: motion.patch.current, law }
    }
    setLastLaw(law)
    if (currentTable) return
    behavior.tap(law)
    if (!replayLaw.current) replayLaw.current = law
    setFeedback(next.status === 'overdrive_oiia' ? '🌀 陀螺橘' : next.sfxText)
    const reaction = findReaction(next.tapHistory.slice(-2))
    if (flags.enableRetention) {
      const credit = !awarded.current.has(law)
      awarded.current.add(law)
      if (credit || (reaction && !collectionRef.current.reactions.includes(reaction.id))) {
        collect(c => ({
          ...c, energy: c.energy + Number(credit),
          reactions: reaction && !c.reactions.includes(reaction.id) ? [...c.reactions, reaction.id] : c.reactions,
        }))
      }
    }
  }
  function pickDrawer(next: Drawer) {
    if (next !== 'lab' || drawer === 'lab') stopCharge()
    setDrawer(current => current === next ? null : next)
  }
  function updateFlags(key: keyof FeatureFlags) {
    const next = { ...flags, [key]: !flags[key] }
    setFlags(next)
    if (!next.enableSocial) setPure(false)
  }
  function wear(id: OutfitId, cost: number) {
    const c = collectionRef.current
    const owned = c.outfits.includes(id)
    if (!owned && c.energy < cost) { setFeedback('点不同胶囊攒能量'); return }
    collect(previous => ({
      ...previous, energy: previous.energy - (owned ? 0 : cost),
      outfits: owned ? previous.outfits : [...previous.outfits, id],
      worn: owned && previous.worn === id ? null : id,
    }))
    setFeedback('')
  }
  function edit(next: Slots) { stopCharge(); setSlots(next) }
  function switchProp(id: PropSkinId) {
    if (tableRef.current) {
      reset('warmup', cardForDay().seed, id)
      return
    }
    const current = motion.sim.current
    if (id === current.propSkin) return
    stopCharge()
    invalidTableEntry.current = false
    const skin = PROP_SKINS.find(p => p.id === id)!
    const patch = applied ? { ...applied, propSkin: id, qcVerdict: skin.qcVerdict } : null
    const next = newRound(current.levelId, current.seed, null, id)
    decision.current = null
    setPreviousOutcome(null)
    setShowCardFirstLaw(false)
    setLastLaw(null)
    setFeedback('')
    awarded.current.clear()
    firstShareSlots.current = patch?.slots ?? null
    replayLaw.current = patch?.slots.law ?? null
    roundStart.current = { state: next, patch, firstLaw: null, slots: patch?.slots ?? null, waiting: false, decision: null }
    motion.replace(next, patch)
    setApplied(patch)
    behavior.context(next, true)
  }
  function compile(selection: Slots = slots, skin: PropSkinId = motion.sim.current.propSkin) {
    if (cancelCharge.current) return
    const available = readQuota()
    setQuota(available)
    if (tableRef.current || skin !== motion.sim.current.propSkin) switchProp(skin)
    setSlots(selection)
    const current = motion.sim.current
    const codes = collectionRef.current.codes
    const fallback = () => compileAlchemistPatch(selection, current.levelId, current.seed, codes, skin)
    function applyRecipe(compiled: PhysicsPatch) {
      invalidTableEntry.current = false
      setApplied(compiled)
      setLastLaw(compiled.slots.law)
      replayLaw.current = compiled.slots.law
      firstShareSlots.current = compiled.slots
      const initial = newRound(current.levelId, current.seed, null, skin)
      decision.current = null
      setPreviousOutcome(null)
      awarded.current.clear()
      roundStart.current = { state: initial, patch: compiled, firstLaw: null, slots: compiled.slots, waiting: false, decision: null }
      motion.replace(initial, compiled)
      setShowCardFirstLaw(false)
      if (flags.enableRetention) {
        collect(c => ({
          ...c, codes: [...new Set([...c.codes, compiled.discoveryCode])].slice(-128),
          reactions: compiled.reactionId && !c.reactions.includes(compiled.reactionId) ? [...c.reactions, compiled.reactionId] : c.reactions,
        }))
      }
      setFeedback(compiled.newtonComment)
      setBusy(false)
      setDrawer(null)
    }
    // [PLATFORM-INTEGRATION: rewarded-video placement is disabled for the contest release.]
    if (!available.remaining) { applyRecipe(fallback()); return }
    const mine = ++run.current
    let finished = false, charged = false, result: PhysicsPatch | undefined
    let abort: (() => void) | undefined
    function deliver() {
      if (finished || !charged || !result || run.current !== mine || !live.current) return
      finished = true
      clearTimeout(deadline)
      cancelCharge.current = null
      const available = readQuota()
      if (available.remaining > 0) {
        setQuota(writeQuota(available.remaining - 1))
        applyRecipe(result)
      } else {
        setQuota(available)
        applyRecipe(fallback())
      }
    }
    const charge = setTimeout(() => { charged = true; deliver() }, 1200)
    const deadline = setTimeout(() => { result = fallback(); abort?.(); deliver() }, 2800)
    cancelCharge.current = () => { finished = true; clearTimeout(charge); clearTimeout(deadline); abort?.() }
    setBusy(true)
    const receive = (data?: unknown) => {
      if (finished || mine !== run.current) return
      const generated = data && typeof data === 'object' && 'aiGenerated' in data && data.aiGenerated === true
      result = generated ? validateExternalPatch(data, selection, current.levelId, current.seed, codes, skin) : fallback()
      deliver()
    }
    // [PLATFORM-INTEGRATION: bind the workshop service request to its approved origin]
    try {
      const request = Taro.request({ url: '/api/newton/compile-patch', method: 'POST', timeout: 2800,
        data: { slots: selection, propSkin: skin, levelId: current.levelId, seed: current.seed, seenCodes: codes } })
      abort = () => request.abort?.()
      void request.then(r => receive(r.statusCode >= 200 && r.statusCode < 300 ? r.data : undefined)).catch(() => receive())
    } catch { receive() }
  }
  async function boost(id: ProvinceId) {
    if (boostLock.current) return
    const amount = Math.min(999, Math.round(artifact.energy))
    if (amount < 1) { setSquadNote('先点一颗胶囊，攒气飞值'); return }
    const previous = board
    const before = board.find(row => row.provinceId === id)?.total ?? 0
    boostLock.current = true
    const mine = ++socialRequest.current
    setBoosting(true)
    setSquadNote('正在为省队助力…')
    setBoard([...board.filter(row => row.provinceId !== id), { provinceId: id, total: before + amount }])
    try {
      const r = await Taro.request({ url: '/api/newton/squad-boost', method: 'POST', timeout: 2800, data: { provinceId: id, energy: amount } })
      if (!live.current || mine !== socialRequest.current) return
      if (r.statusCode < 200 || r.statusCode >= 300 || !validBoard(r.data?.leaderboard)) throw Error('Unavailable board')
      setBoard(r.data.leaderboard)
      setSquadNote('助力已送达')
    } catch {
      if (live.current && mine === socialRequest.current) { setBoard(previous); setSquadNote('助力结果未确认') }
    } finally {
      if (live.current && mine === socialRequest.current) { boostLock.current = false; setBoosting(false) }
    }
  }
  useShareAppMessage(options => {
    if (!flags.enableSocial || drawer === 'table' || motion.free) return HOME_SHARE
    // Some hosts request the payload before delivering the button's click.
    if (options?.from === 'button' && options.target && 'id' in options.target && options.target.id === 'share-trial-table') fixTable()
    const currentTable = tableRef.current
    if (currentTable) {
      if (currentTable.kind === 'preview' || currentTable.kind === 'trial') return HOME_SHARE
      const { challenge } = currentTable
      const attempt = motion.sim.current
      const invite = playedRound(attempt) && attempt.status === 'hilarious_fail'
        ? '，我没保住' + (challenge.goal === 'tower' ? '塔' : '杯子') + '，你来？'
        : '，来' + TABLE_GOALS[challenge.goal].label + '！'
      return {
        title: TABLE_PLACES[challenge.place].label + '这桌' + invite,
        path: '/' + tableSharePath(challenge),
      }
    }
    if (invalidTableEntry.current) return HOME_SHARE
    const current = motion.sim.current
    const recipe = applied ?? compileAlchemistPatch(firstShareSlots.current ?? {
      ...DEFAULT_SLOTS, law: replayLaw.current ?? slots.law,
    }, current.levelId, current.seed, [], current.propSkin)
    const relayDepth = Math.min(99, current.relayDepth + 1)
    let path = encodeShareQuery(recipe, flags, { propSkin: current.propSkin, relayDepth, personaId: director.personaId }) +
      '&chainCount=' + current.chainCount + '&recipe=' + (applied ? '1' : '0')
    if (applied?.aiGenerated) path += '&ops=' + encodeURIComponent(JSON.stringify(applied.ops)) +
      '&qcVerdict=' + encodeURIComponent(applied.qcVerdict)
    return { title: '第' + relayDepth + '棒同桌挑战 · ' + director.personaTitle + '，来救' + prop.title + '！', path: '/' + path }
  })
  const goal = table ? TABLE_GOALS[table.challenge.goal] : null
  const target = table?.kind === 'preview' ? null
    : table ? table.challenge.goal === 'cup' ? 'apple' : 'blocks' : undefined
  const handHint = table?.challenge.goal === 'tower' ? '把积木塔拖离猫爪' : '把杯子拖回桌中央'
  const tableMessage = motion.waitingForTap.current ? handHint : roundOutcome(state) || state.sfxText || '稳住这桌'
  const house = table?.kind === 'house'
  const tower = table?.challenge.goal === 'tower'
  const houseMessage = motion.waitingForTap.current ? handHint
    : state.status === 'saved' ? tower ? '积木塔保住了' : '冰美式稳住了'
    : state.status === 'hilarious_fail' ? tower ? '积木塔倒了' : '杯子掉了' : state.sfxText || handHint
  const message = house ? houseMessage : table ? table.kind === 'preview' ? '试玩这桌' : tableMessage
    : motion.waitingForTap.current ? cupRound ? handHint : '点一下，或抓起来拖动'
    : state.status === 'hilarious_fail' ? (cupRound ? '杯子掉了' : '滑出盘沿！再戳一次')
    : cupRound && state.status === 'saved' ? '冰美式稳住了'
    : state.status === 'overdrive_oiia' ? '🌀 陀螺橘'
    : state.sfxText || feedback || (cupRound ? handHint : '戳戳胖橘')
  const settled = roundSettled(state)
  const pair = house ? null : tableObjectResults(state)
  const currentCompareLaw = decision.current?.law
  const alternatives = settled && currentCompareLaw ? getAlternativeLaws(currentCompareLaw, state.levelId).slice(0, 2) : []
  const comparison = previousOutcome && currentCompareLaw
    ? '上轮' + previousOutcome.moves + ' ' + previousOutcome.result + ' · 这轮' + movesLabel(state, currentCompareLaw) + ' ' + (comparisonOutcome(state) || '进行中')
    : ''
  const hasComparison = !!comparison
  useEffect(() => {
    if (motion.native) motion.measure()
  }, [motion.native, motion.measure, motion.free, pureMode, hasComparison, settled, state.levelId, state.status,
    state.relayDepth, state.directorCounter, state.chainLabel, state.clutchSaved, showCardFirstLaw, applied?.isFirstDiscovery, table])
  const togglePure = () => { stopCharge(); setDrawer(null); setPure(!pureMode) }
  const cameraControl = motion.viewChanged
    ? <Tap extra='reset-camera' onTap={motion.resetView}>视角回正</Tap>
    : <Text className='camera-hint'>拖空桌转视角</Text>
  return <View className={'toybox' + (motion.paused ? ' paused' : '') + (pureMode ? ' pure' : '') + (busy ? ' charging' : '') + (state.status === 'overdrive_oiia' ? ' overdrive' : '')}>
    <View className='arena'>
      <View className='stage-hud'>
        {motion.free && <View className='objective'><Text className='level-title'>自由摆弄</Text>
          <Text className='micro-goal'>拖玩具，松手甩出 · 捏合桌面缩放</Text></View>}
        {!motion.free && !pureMode && table && !house && goal && <View className='objective'>
          <Text className='table-mode'>{TABLE_MODES[table.kind]}</Text>
          <Text className='level-title'>{TABLE_PLACES[table.challenge.place].icon} {TABLE_PLACES[table.challenge.place].label} · {goal.label}</Text>
        </View>}
        {!motion.free && !pureMode && (!table || house) && <View className='objective'>
          <Text className='game-title'>牛顿哭了 3D</Text>
          <Text className='level-title'>{house && tower ? '猫扑积木塔' : level.title}</Text>
          {!cupRound && <Text className='micro-goal'>{level.subtitle}</Text>}
          {showCardFirstLaw && <Text className='relay-line'>同桌首招</Text>}
          {entry.daily && state.levelId === entry.levelId && <Text className='relay-line'>今日同桌</Text>}
          {state.directorCounter && activeCounter && <Text className='counter-line'>🧠 胖橘看穿了你 · {activeCounter.counterLabel}</Text>}
          {state.relayDepth > 0 && <Text className='relay-line'>🏓 接力第 {state.relayDepth} 棒{sender ? ' · ' + sender.title : ''}</Text>}
          {(state.levelId === 'wig_orbit' || (entry.daily && state.levelId === entry.levelId)) && <Text className='weather'>{weather.icon} {weather.title}</Text>}
        </View>}
        {!motion.free && state.wigLiftPct > 0 && !table && <View className={'brass tier-' + stamp.tier}>
          <Text className='brass-label'>牛顿假发离地表</Text>
          <View className='meter-dial'><View className='needle' style={{ transform: 'rotate(' + (-65 + 130 * state.wigLiftPct / 999) + 'deg)' }} /></View>
          <Text className='brass-number'>{state.wigLiftPct}%</Text>
        </View>}
      </View>
      <View className='stage-space'>
        <ToyboxStage motion={motion} target={target} onLaunch={launch} onSelect={setSelectedToy} onBeforeDrop={() => { attachRelayRecipe(); if (!tableRef.current) behavior.tap() }}
          layoutKey={[pureMode, motion.free, settled, hasComparison, table?.kind, state.levelId].join('|')}
          outfit={!table && flags.enableRetention ? collection.worn : null} />
      </View>
      {!motion.free && <View className='stage-caption'>
        {!table && state.status !== 'hilarious_fail' && state.chainCount > 0 && state.chainLabel !== '猫爪偷推' &&
          <Text className='chain-pop' key={state.chainCount}>⚡ {state.chainCount}连多米诺 · {state.chainLabel}</Text>}
        {!table && state.status !== 'hilarious_fail' && state.clutchSaved && <Text className='clutch'>⚡ 压哨出手</Text>}
        {pair ? <View className='table-pair'>
          <Text className={table?.challenge.goal === 'cup' ? 'pair-goal' : ''}>☕ {pair.cup}</Text>
          <Text className={table?.challenge.goal === 'tower' ? 'pair-goal' : ''}>▦ {pair.tower}</Text>
        </View> : <Text className='caption'>{message}</Text>}
        {!pureMode && comparison && <Text className='compare-line'>{comparison}</Text>}
        {!pureMode && applied?.isFirstDiscovery && <Text className='discovery'>✧ 首发调配师 #{discoveryNumber(applied)}</Text>}
      </View>}
    </View>
    {motion.free ? <View className='dock free-dock'>
      <Text className='toy-selected'>{selectedToy === 'apple' ? prop.title : SUBJECTS.find(item => item.id === selectedToy)?.title} · 按住玩具，双指拧转</Text>
      <View className='tray-tabs'><Tap onTap={() => motion.flip(selectedToy)}>↺ 翻面</Tap>
        {cameraControl}<Tap extra='create-table' onTap={() => motion.setFree(false)}>回到挑战</Tap></View>
    </View> : pureMode ? <Tap extra='exit-pure' onTap={togglePure}>退出纯净</Tap> : <>
      <View className='dock hand-dock'>
        {table?.kind !== 'preview' && <View className='hand-tools'>
          {cameraControl}
          {house && settled && <Tap extra='next-table' onTap={() => startTable(HOUSE_TABLES[(HOUSE_TABLES.indexOf(table.challenge) + 1) % HOUSE_TABLES.length], 'house')}>下一桌</Tap>}
          <Tap onTap={retry}>{settled ? '↻ 再玩一次' : '↻ 重开'}</Tap>
          <Tap onTap={() => pickDrawer('magic')}>✧ 小魔法</Tap>
          <Tap onTap={() => pickDrawer('more')}>··· 更多</Tap>
        </View>}
        {(table?.kind === 'preview' || table?.kind === 'trial') && <View className='table-actions'>
          {table.kind === 'preview' && cameraControl}
          <Tap extra='paper-btn' onTap={swapTable}>↻ 换一桌</Tap>
          {table.kind === 'preview' && <Tap extra='go' onTap={() => startTable(table.challenge, 'trial')}>▶ 试玩</Tap>}
          {table.kind === 'trial' && settled && playedRound(state) && (flags.enableSocial
            ? <Button id='share-trial-table' className='go invite-trial' openType='share' onClick={fixTable}>拿这桌考朋友 ↗</Button>
            : <Tap extra='go' onTap={fixTable}>✓ 定下这桌</Tap>)}
        </View>}
        {flags.enableSocial && (table?.kind === 'fixed' || table?.kind === 'received') &&
          <Button className='share-btn table-share' openType='share'>发给好友 ↗</Button>}
        {table?.kind === 'preview' && <Tap extra='book-link' onTap={openTablePicker}>重新选题</Tap>}
      </View>
    </>}
    {!motion.free && !pureMode && drawer && <View className='sheet-layer'>
      <View className='shade' onClick={() => pickDrawer(drawer)} />
      <View className='sheet'>
        <View className='sheet-top'><Text>{{ table: tablePlace ? '保哪个？' : '在哪一桌？', magic:'小魔法', more:'更多玩法', biz:'实验品', lab:'三槽炼金台', closet:'胖橘衣橱', squad:'省队演示榜', receipt:'崩坏配方小票', book:'反应图鉴', settings:'玩具盒开关' }[drawer]}</Text>
          <Tap extra='close' onTap={() => pickDrawer(drawer)}>×</Tap></View>
        <ScrollView scrollY className='sheet-content'>
        {drawer === 'magic' && <>
          <View className='capsules'>{TABLE_LAWS.map(law => <Tap key={law} extra={'capsule law-' + law + (lastLaw === law ? ' selected' : '')}
            onTap={() => { setDrawer(null); quick(law) }}><Text className='law-symbol'>{SYMBOLS[law]}</Text><Text>{SHORT[law]}</Text></Tap>)}</View>
          {alternatives.length > 0 && <View className='compare-actions'><Text>换一招</Text>{alternatives.map(law =>
            <Tap key={law} extra={'compare-key law-' + law} onTap={() => { setDrawer(null); quick(law, true) }}>{SYMBOLS[law]} {SHORT[law]}</Tap>)}</View>}
        </>}
        {drawer === 'table' && <View className='table-options'>
          {tablePlace ? (Object.keys(TABLE_GOALS) as TableGoal[]).map(goal => <Tap key={goal} extra='slot'
            onTap={() => startTable({ place: tablePlace, goal, variant: 0 }, 'preview')}>
            <Text className='slot-icon'>{TABLE_GOALS[goal].icon}</Text><Text>{TABLE_GOALS[goal].label}</Text>
          </Tap>) : (Object.keys(TABLE_PLACES) as TablePlace[]).map(place => <Tap key={place} extra='slot' onTap={() => setTablePlace(place)}>
            <Text className='slot-icon'>{TABLE_PLACES[place].icon}</Text><Text>{TABLE_PLACES[place].label}</Text>
          </Tap>)}
        </View>}
        {drawer === 'more' && <>
          <View className='levels'>{LEVELS.map(item => <Tap key={item.id}
            extra={'level-tab' + (!table && level.id === item.id ? ' chosen' : '')} onTap={() => reset(item.id)}>
            <Text>{TAB_TITLES[item.id]}</Text>
          </Tap>)}</View>
          <View className='more-options'>
            <Tap onTap={openTablePicker}>＋ 我来出题</Tap>
            <Tap onTap={() => { stopCharge(); setDrawer(null); behavior.cancel(); setSelectedToy('cat'); motion.setFree(true) }}>自由摆弄</Tap>
            <Tap onTap={() => pickDrawer('lab')}>⚗ 炼金</Tap>
            <Tap onTap={() => pickDrawer('biz')}>✦ 实验品</Tap>
            {flags.enableRetention && <Tap onTap={() => pickDrawer('closet')}>🐾 衣橱</Tap>}
            {flags.enableRetention && <Tap onTap={() => pickDrawer('book')}>✧ 图鉴</Tap>}
            {!table && flags.enableSocial && isSquadEnabled(flags) && <Tap onTap={() => pickDrawer('squad')}>⚑ 省队</Tap>}
            {!table && flags.enableSocial && settled && <Tap onTap={() => pickDrawer('receipt')}>▦ 战报</Tap>}
            {flags.enableSocial && <Tap onTap={togglePure}>◉ 纯净</Tap>}
            <Tap onTap={() => pickDrawer('settings')}>⚙ 设置</Tap>
          </View>
          {!table && <View className='capsules' ariaLabel='更多法则'>{LAWS.filter(law => !TABLE_LAWS.includes(law.id)).map(law => <Tap key={law.id}
            extra={'capsule law-' + law.id + (lastLaw === law.id ? ' selected' : '')} onTap={() => { setDrawer(null); quick(law.id) }}>
            <Text className='law-symbol'>{SYMBOLS[law.id]}</Text><Text>{SHORT[law.id]}</Text>
          </Tap>)}</View>}
        </>}
        {drawer === 'lab' && <>
          <View className='slot-row'>{([
            ['subject', '主体', SUBJECTS], ['law', '法则', LAWS], ['trigger', '时机', TRIGGERS],
          ] as const).map(([key, name, items]) => {
            const index = items.findIndex(item => item.id === slots[key])
            const item = key === 'subject' && slots.subject === 'apple' ? prop : items[index]
            return <Tap extra='slot' key={key} onTap={() => edit({ ...slots, [key]: items[(index + 1) % items.length].id })}>
              <Text className='muted'>{name} ↻</Text><Text className='slot-icon'>{item.icon}</Text><Text>{item.title}</Text>
            </Tap>
          })}</View>
          <View className='sheet-actions'><Tap extra='paper-btn' onTap={() => edit(randomContrastSlots(slots))}>🎲 鬼才摇骰</Tap>
            <Tap extra={'go' + (busy ? ' brewing' : '')} onTap={() => compile()}>{busy ? '✦ 调配中…' : quota.remaining ? '✦ 开始调配' : '✦ 试个配方'}</Tap></View>
          <Tap extra='custom-game' onTap={() => compile(director.recommendedSlots, director.recommendedProp)}>🧠 用胖橘推荐</Tap>
          <Text className='qc-note'>{prop.icon} {applied?.qcVerdict ?? prop.qcVerdict}</Text>
          {flags.enableRetention && <Tap extra='book-link' onTap={() => pickDrawer('book')}>✧ 反应图鉴　{collection.reactions.length} / {REACTIONS.length}　›</Tap>}
        </>}
        {drawer === 'biz' && <>
          <View className='prop-shelf'>{PROP_SKINS.map(p => <Tap key={p.id} extra={'skin-card skin-' + p.id + (p.id === prop.id ? ' current' : '')}
            onTap={() => switchProp(p.id)}><Text className='slot-icon'>{p.icon}</Text><Text>{p.title}</Text></Tap>)}</View>
          <Text className='qc-note'>{prop.qcVerdict}</Text>
          {/* [PLATFORM-INTEGRATION: commerce placements are disabled for the contest release.] */}
          <View className='persona-card'><Text className='eyebrow'>AI 行为画像</Text><Text>{director.badgeIcon} {director.personaTitle} · {director.quip}</Text>
            <Text className='persona-stats'>⚡ 累计 {behavior.stats.chainTotal} 连环　◷ 压哨 {behavior.stats.clutchCount} 次</Text></View>
        </>}
        {drawer === 'closet' && <><Text className='sheet-note'>⚡ {collection.energy}　点不同胶囊攒能量</Text>
          <View className='shelf'>{OUTFITS.map(item => <Tap key={item.id} extra={'swatch' + (collection.worn === item.id ? ' equipped' : '')} onTap={() => wear(item.id, item.unlockAt)}>
            <Text className='slot-icon'>{EQUIP_ICON[item.id]}</Text><Text>{item.title}</Text>
            <Text className='muted'>{collection.worn === item.id ? '已穿戴' : collection.outfits.includes(item.id) ? '穿戴' : '⚡ ' + item.unlockAt}</Text>
          </Tap>)}</View>{feedback === '点不同胶囊攒能量' && <Text className='sheet-note'>能量还差一点</Text>}</>}
        {drawer === 'book' && <View className='album'>{REACTIONS.map(r => <View className={'reaction' + (collection.reactions.includes(r.id) ? ' found' : '')} key={r.id}>
          <Text>{collection.reactions.includes(r.id) ? '✦' : '◇'}</Text><Text>{r.title}</Text></View>)}</View>}
        {drawer === 'squad' && <><Text className='sheet-note'>{squadNote}</Text><View className='shelf'>
          {[...PROVINCES].sort((a,b) => (board.find(r => r.provinceId === b.id)?.total ?? 0) - (board.find(r => r.provinceId === a.id)?.total ?? 0)).map(p =>
            <Tap key={p.id} extra='province' onTap={() => { if (!boosting) void boost(p.id) }}>
              <Text>{p.title}</Text><Text className='score'>{board.find(row => row.provinceId === p.id)?.total ?? '—'}</Text>
            </Tap>)}</View><Tap extra='book-link' onTap={() => pickDrawer('receipt')}>▦ 我的六格战报　›</Tap></>}
        {drawer === 'receipt' && <View className='receipt'>
          <Text className='muted'>{receipt.header}</Text><Text className='six-blocks'>{receipt.blocks}</Text>
          <Text>{prop.icon} {prop.title}　{receipt.badge}</Text>
          {applied && <Text>{receipt.icons.replace('🍏', prop.icon)}</Text>}
          <Text>⚡ {state.chainCount} 连多米诺 · {state.relayDepth ? '接力第 ' + state.relayDepth + ' 棒' : '首发局'}</Text>
          <Text className='qc-note'>{applied?.qcVerdict ?? prop.qcVerdict}</Text>
          {applied?.aiGenerated && <Text className='ai-tag'>{receipt.aiTag}</Text>}
          <Button className='share-btn' openType='share'>挑战好友 ↗</Button>
        </View>}
        {drawer === 'settings' && <>{(['enableRetention','enableSocial','enableSquad'] as const).map(key => <Tap key={key} extra='option' onTap={() => updateFlags(key)}>
          <Text>{key === 'enableRetention' ? '衣橱与图鉴' : key === 'enableSquad' ? '省队演示榜' : '战报与好友分享'}</Text><Text className={flags[key] ? 'on' : 'off'}>{flags[key] ? '已开 ●' : '已关 ○'}</Text>
        </Tap>)}</>}
        </ScrollView>
      </View>
    </View>}
  </View>
}
