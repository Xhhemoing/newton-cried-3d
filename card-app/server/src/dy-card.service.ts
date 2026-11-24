import { BadRequestException, Injectable } from '@nestjs/common'
import { LAWS, LEVELS, PROP_SKINS, PROVINCES, SUBJECTS, TRIGGERS, validateDirectorReaction, validateExternalPatch } from './shared/newton-core'
import type { LevelId, PhysicsPatch, PropSkinId, ProvinceId } from './shared/newton-core'
import { cardForDay } from './card-data.types'
import type { BehaviorSnapshot, CardData, DirectorReaction } from './card-data.types'

type PatchSlots = PhysicsPatch['slots']
const COMPILE_TIMEOUT_MS = 2800
const DIRECTOR_TIMEOUT_MS = 2200
const BEHAVIOR_KEYS = ['totalTaps', 'clutchCount', 'failStreak', 'chainTotal', 'lawCounts', 'propSkin', 'levelId']
const MAX_BOOST = 999
const MAX_SQUAD_TOTAL = 999_999_999

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function readBehaviorSnapshot(input: unknown): BehaviorSnapshot {
  const body = record(input)
  const lawCounts = record(body?.lawCounts)
  const level = LEVELS.find(entry => entry.id === body?.levelId)
  const prop = PROP_SKINS.find(entry => entry.id === body?.propSkin)
  if (!body || !lawCounts || !level || !prop || Object.keys(body).length !== BEHAVIOR_KEYS.length ||
    !BEHAVIOR_KEYS.every(key => Object.prototype.hasOwnProperty.call(body, key))) {
    throw new BadRequestException('需要有效的本局点按记录')
  }
  const { totalTaps, clutchCount, failStreak, chainTotal } = body
  if (!isCount(totalTaps) || !isCount(clutchCount) || !isCount(failStreak) || !isCount(chainTotal)) {
    throw new BadRequestException('点按和连锁次数须为非负整数')
  }
  const cleaned: BehaviorSnapshot['lawCounts'] = {}
  for (const [id, count] of Object.entries(lawCounts)) {
    const law = LAWS.find(entry => entry.id === id)
    if (!law || !isCount(count)) throw new BadRequestException('需要有效的法则次数')
    cleaned[law.id] = count
  }
  return { totalTaps, clutchCount, failStreak, chainTotal, lawCounts: cleaned, propSkin: prop.id, levelId: level.id }
}

async function requestWithTimeout(
  timeoutMs: number, run: (signal: AbortSignal) => Promise<unknown>,
): Promise<unknown> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const timeout = new Promise<null>(resolve => {
      timer = setTimeout(() => {
        resolve(null)
        controller.abort()
      }, timeoutMs)
    })
    return await Promise.race([run(controller.signal), timeout])
  } catch {
    return null
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

@Injectable()
export class DyCardService {
  private readonly squadTotals = new Map<ProvinceId, number>()

  resolveCardData(): CardData {
    return cardForDay()
  }

  async compilePatch(input: unknown): Promise<PhysicsPatch> {
    const body = record(input)
    const selection = record(body?.slots ?? body)
    const subject = SUBJECTS.find(entry => entry.id === selection?.subject)
    const law = LAWS.find(entry => entry.id === selection?.law)
    const trigger = TRIGGERS.find(entry => entry.id === selection?.trigger)
    if (!subject || !law || !trigger) throw new BadRequestException('请选择有效的三槽配方')
    const slots = { subject: subject.id, law: law.id, trigger: trigger.id }
    const levelId = LEVELS.find(entry => entry.id === body?.levelId)?.id ?? 'warmup'
    const propSkin = PROP_SKINS.find(entry => entry.id === body?.propSkin)?.id ??
      LEVELS.find(entry => entry.id === levelId)!.defaultProp
    const candidateSeed = body?.seed
    const seed = typeof candidateSeed === 'number' && Number.isSafeInteger(candidateSeed) &&
      candidateSeed >= 0 && candidateSeed <= 2_147_483_647 ? candidateSeed : this.resolveCardData().seed
    const seenCodes = Array.isArray(body?.seenCodes) ? body.seenCodes.slice(0, 128)
      .filter((code): code is string => typeof code === 'string' && /^[a-z0-9_-]{1,64}$/.test(code)) : []

    const raw = await requestWithTimeout(COMPILE_TIMEOUT_MS,
      signal => this.requestPlatformPatch(slots, levelId, seed, signal, propSkin))
    return validateExternalPatch(raw, slots, levelId, seed, seenCodes, propSkin)
  }

  // [PLATFORM-INTEGRATION: ai-platform-llm-skill 实时编译 PhysicsPatch，设置 2800ms 超时回退预审补丁]
  protected async requestPlatformPatch(_slots: PatchSlots, _levelId: LevelId, _seed: number,
    _signal: AbortSignal, _propSkin?: PropSkinId): Promise<unknown> {
    return null
  }

  async directorReact(input: unknown): Promise<DirectorReaction> {
    const snapshot = readBehaviorSnapshot(input)
    const raw = await requestWithTimeout(DIRECTOR_TIMEOUT_MS, signal => this.requestPlatformDirector(snapshot, signal))
    return validateDirectorReaction(raw, snapshot)
  }

  // [PLATFORM-INTEGRATION: ai-platform-llm-skill 根据玩家行为指纹生成读心短评、反制策略与推荐配方，2200ms 超时回退本地导演]
  protected async requestPlatformDirector(_snapshot: BehaviorSnapshot, _signal: AbortSignal): Promise<unknown> {
    return null
  }

  squadBoost(input: unknown) {
    const body = record(input)
    const province = PROVINCES.find(entry => entry.id === body?.provinceId)
    const energy = body?.energy
    if (!province || typeof energy !== 'number' || !Number.isFinite(energy) || energy < 0) {
      throw new BadRequestException('请选择有效的省队和能量')
    }
    // [PLATFORM-INTEGRATION: use authorized, idempotent, atomic increments in platform storage.]
    const previous = this.squadTotals.get(province.id) ?? 0
    const total = Math.min(MAX_SQUAD_TOTAL, previous + Math.min(MAX_BOOST, Math.trunc(energy)))
    this.squadTotals.set(province.id, total)
    const leaderboard = PROVINCES.map(({ id }) => ({ provinceId: id, total: this.squadTotals.get(id) ?? 0 }))
      .sort((a, b) => b.total - a.total)
    return { provinceId: province.id, added: total - previous, total, leaderboard }
  }
}
