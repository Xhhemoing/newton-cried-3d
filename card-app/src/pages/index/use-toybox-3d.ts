import { useCallback, useEffect, useRef, useState } from 'react'
import Taro, { useDidHide, useDidShow, useReady, useResize } from '@tarojs/taro'
import { makeScene } from './toybox-scene'
import type { CanvasBox } from './toybox-scene'
import { applyQuickLaw, canMoveToy, commitToyDrop, stepSim, tapToy } from '../../shared/newton-core'
import type { LawId, OutfitId, PhysicsPatch, SimStepState, SubjectId } from '../../shared/newton-core'
import { INITIAL_VIEW, hitPreview, orbitView, zoomView } from './toybox-camera'
import type { ToyboxView } from './toybox-camera'
import { beginToyGrab, createFreePlay, endToyGrab, flipToy, moveToyGrab, stepFreePlay, stopFreePlay, twistToyGrab } from './toybox-play'
import { beginChallengeGrab, challengeDropPose, moveChallengeGrab } from './toybox-hands'

export { projectedPose, projectedTray } from './toybox-camera'

const STEP = 1000 / 60
type SceneHandle = ReturnType<typeof makeScene>

// The simulation advances at 60 Hz. Native drawing bypasses React entirely;
// the preview updates its five pose wrappers separately from the HUD.
export function useToybox3D(initial: SimStepState, initialPatch: PhysicsPatch | null, outfit: OutfitId | null,
  observe: (before: SimStepState, next: SimStepState) => void, initialWaitForTap = initial.relayDepth > 0) {
  const observer = useRef(observe)
  observer.current = observe
  const sim = useRef(initial)
  const play = useRef<ReturnType<typeof createFreePlay> | null>(null)
  const hand = useRef<ReturnType<typeof beginChallengeGrab>>(null)
  const gestureEpoch = useRef(0)
  const getVisualState = useCallback((): SimStepState => play.current?.state ?? hand.current?.state ?? sim.current, [])
  const [free, setIsFree] = useState(false)
  const waitingForTap = useRef(initialWaitForTap)
  const patch = useRef(initialPatch)
  const worn = useRef(outfit)
  worn.current = outfit
  const scene = useRef<SceneHandle | null>(null)
  const viewRef = useRef<ToyboxView>(INITIAL_VIEW)
  const [viewChanged, setViewChanged] = useState(false)
  const challengeView = useRef<ToyboxView | null>(null)
  const stageSize = useRef({ width: 0, height: 0 })
  const viewListeners = useRef(new Set<(value: ToyboxView) => void>())
  const subscribeView = useCallback((fn: (value: ToyboxView) => void) => {
    viewListeners.current.add(fn)
    fn(viewRef.current)
    return () => { viewListeners.current.delete(fn) }
  }, [])
  const updateView = useCallback((value: ToyboxView) => {
    if (value === viewRef.current) return
    viewRef.current = value
    setViewChanged(Math.abs(value.yaw) > 0.001 || Math.abs(value.pitch - INITIAL_VIEW.pitch) > 0.001 ||
      Math.abs(value.zoom - INITIAL_VIEW.zoom) > 0.001)
    scene.current?.setView(value)
    viewListeners.current.forEach(fn => fn(value))
  }, [])
  const setStageSize = useCallback((width: number, height: number) => {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return
    stageSize.current = { width, height }
    if (viewRef.current.aspect !== height / width) updateView({ ...viewRef.current, aspect: height / width })
  }, [updateView])
  const [snapshot, setSnapshot] = useState(initial)
  const [native, setNative] = useState(false)
  const active = useRef(false)
  const visible = useRef(true)
  const alive = useRef(true)
  const ready = useRef(false)
  const [paused, setPaused] = useState(false)
  const previewListener = useRef<((s: SimStepState) => void) | null>(null)
  const lastPreview = useRef<SimStepState | null>(null)
  const subscribe = useCallback((fn: (s: SimStepState) => void) => {
    previewListener.current = fn
    lastPreview.current = getVisualState()
    fn(lastPreview.current)
    return () => { if (previewListener.current === fn) previewListener.current = null }
  }, [getVisualState])
  const publishPreview = useCallback((state: SimStepState) => {
    const previous = lastPreview.current
    if (previous && state.bodies === previous.bodies && state.propSkin === previous.propSkin) return
    lastPreview.current = state
    previewListener.current?.(state)
  }, [])
  const retry = useRef({ at: Infinity, count: 0 })
  const probeId = useRef(0)
  const cancelNext = useRef<(() => void) | null>(null)
  const clock = useRef({ last: 0, remainder: 0 })
  const tick = useRef<() => void>(() => undefined)
  const cancelScheduledFrame = useCallback(() => {
    const cancel = cancelNext.current
    cancelNext.current = null
    try { cancel?.() } catch { /* A failed canvas may reject its pending frame cancellation. */ }
  }, [])
  const fallbackToPreview = useCallback(() => {
    const nativeScene = scene.current
    scene.current = null
    cancelScheduledFrame()
    try { nativeScene?.dispose() } catch { /* The preview can resume without the failed canvas. */ }
    setNative(false)
  }, [cancelScheduledFrame])
  const schedule = useCallback(() => {
    if (!active.current || cancelNext.current) return
    const nativeScene = scene.current
    if (nativeScene) {
      try {
        const id = nativeScene.requestFrame(() => { if (cancelNext.current === cancel) tick.current() })
        const cancel = () => nativeScene.cancelFrame(id)
        cancelNext.current = cancel
        return
      } catch { fallbackToPreview() }
    }
    const timer = setTimeout(() => { if (cancelNext.current === cancel) tick.current() }, STEP)
    const cancel = () => clearTimeout(timer)
    cancelNext.current = cancel
  }, [fallbackToPreview])
  const pause = useCallback(() => {
    active.current = false
    cancelScheduledFrame()
    clock.current.last = 0
    clock.current.remainder = 0
    if (play.current) stopFreePlay(play.current)
    if (hand.current) {
      hand.current = null
      publishPreview(sim.current)
    }
    gestureEpoch.current++
  }, [cancelScheduledFrame, publishPreview])
  const resume = useCallback(() => {
    if (!alive.current || !visible.current || active.current) return
    active.current = true
    clock.current.last = Date.now()
    schedule()
  }, [schedule])

  tick.current = () => {
    cancelNext.current = null
    if (!active.current || !alive.current) return
    const now = Date.now()
    const c = clock.current
    c.remainder += Math.max(0, Math.min(now - c.last, STEP * 4))
    c.last = now
    const before = sim.current
    const currentPlay = play.current
    if (!currentPlay && (waitingForTap.current || hand.current)) c.remainder = 0
    while (c.remainder >= STEP) {
      if (currentPlay) stepFreePlay(currentPlay, STEP / 1000)
      else sim.current = stepSim(sim.current, patch.current)
      c.remainder -= STEP
    }
    const state = getVisualState()
    if (scene.current) {
      try { scene.current.draw(state, worn.current) }
      catch { fallbackToPreview() }
    }
    if (!scene.current) {
      publishPreview(state)
      if (now >= retry.current.at) bind()
    }
    if (!currentPlay && !hand.current && before !== state) observer.current(before, state)
    if (!currentPlay && !hand.current && (before.chainCount !== state.chainCount || before.chainLabel !== state.chainLabel ||
      before.propSkin !== state.propSkin || before.directorCounter !== state.directorCounter ||
      before.relayDepth !== state.relayDepth || before.status !== state.status || before.sfxText !== state.sfxText ||
      before.wigLiftPct !== state.wigLiftPct || before.clutchMs !== state.clutchMs)) setSnapshot(state)
    schedule()
  }
  const bind = useCallback(() => {
    if (!ready.current || !visible.current || !alive.current) return
    const mine = ++probeId.current
    retry.current.at = Infinity
    Taro.nextTick(() => {
      if (mine !== probeId.current || !alive.current || !visible.current) return
      try {
        const query = Taro.createSelectorQuery()
        query.select('#newton-toybox-canvas').fields({ node: true, rect: true, size: true })
        query.exec(results => {
          const box = results?.[0] as CanvasBox | undefined
          if (mine !== probeId.current || !visible.current || !alive.current) return
          try {
            if (box) setStageSize(box.width, box.height)
            if (!box?.node || !box.width || !box.height) {
              if (retry.current.count < 3) retry.current.at = Date.now() + 120 * ++retry.current.count
              return
            }
            if (scene.current) { scene.current.resize(box); return }
            const nativeScene = makeScene(box, viewRef.current)
            scene.current = nativeScene
            nativeScene.draw(getVisualState(), worn.current)
            setNative(true)
          } catch {
            fallbackToPreview()
            schedule()
          }
        })
      } catch { /* A host without Canvas V2 keeps the interactive preview surface. */ }
    })
  }, [fallbackToPreview, getVisualState, schedule, setStageSize])
  useReady(() => { ready.current = true; bind(); resume() })
  useResize(bind)
  useDidShow(() => { visible.current = true; retry.current.count = 0; setPaused(false); resume(); bind() })
  useDidHide(() => { visible.current = false; probeId.current++; pause(); setPaused(true) })
  useEffect(() => {
    alive.current = true
    resume()
    return () => {
      alive.current = false
      probeId.current++
      pause()
      scene.current?.dispose()
      scene.current = null
    }
  }, [pause, resume])
  const restoreChallengeView = useCallback(() => {
    const saved = challengeView.current
    challengeView.current = null
    if (saved) updateView({ ...saved, aspect: viewRef.current.aspect })
  }, [updateView])
  const replace = useCallback((state: SimStepState, nextPatch: PhysicsPatch | null, waitForTap = false) => {
    hand.current = null
    gestureEpoch.current++
    if (play.current) {
      play.current = null
      setIsFree(false)
      restoreChallengeView()
    }
    waitingForTap.current = waitForTap
    sim.current = state
    patch.current = nextPatch
    clock.current.remainder = 0
    clock.current.last = Date.now()
    setSnapshot(state)
    publishPreview(state)
  }, [publishPreview, restoreChallengeView])
  const commitAction = useCallback((next: SimStepState) => {
    const before = sim.current
    if (before === next) return before
    if (waitingForTap.current || hand.current) {
      clock.current.remainder = 0
      clock.current.last = Date.now()
    }
    waitingForTap.current = false
    hand.current = null
    gestureEpoch.current++
    sim.current = next
    observer.current(before, next)
    setSnapshot(next)
    publishPreview(next)
    return next
  }, [publishPreview])
  const tapLaw = useCallback((law: LawId) => {
    if (play.current || !visible.current) return sim.current
    return commitAction(applyQuickLaw(sim.current, law))
  }, [commitAction])
  const launch = useCallback((id: SubjectId) => {
    if (play.current || !visible.current) return sim.current
    return commitAction(tapToy(sim.current, id))
  }, [commitAction])
  const setFree = useCallback((enabled: boolean) => {
    if (enabled === !!play.current) return
    hand.current = null
    gestureEpoch.current++
    if (enabled) challengeView.current = viewRef.current
    play.current = enabled ? createFreePlay(sim.current) : null
    if (!enabled) restoreChallengeView()
    clock.current.remainder = 0
    clock.current.last = Date.now()
    setIsFree(enabled)
    publishPreview(getVisualState())
  }, [getVisualState, publishPreview, restoreChallengeView])
  const orbit = useCallback((dx: number, dy: number) => updateView(orbitView(viewRef.current, dx, dy)), [updateView])
  const zoom = useCallback((factor: number) => updateView(zoomView(viewRef.current, factor)), [updateView])
  const resetView = useCallback(() => updateView({ ...INITIAL_VIEW, aspect: viewRef.current.aspect }), [updateView])
  const beginGrab = useCallback((id: SubjectId) => {
    if (!visible.current) return
    if (play.current) beginToyGrab(play.current, id)
    else if (!hand.current) {
      hand.current = beginChallengeGrab(sim.current, id)
      if (hand.current) {
        clock.current.remainder = 0
        publishPreview(hand.current.state)
      }
    }
  }, [publishPreview])
  const dragGrab = useCallback((dx: number, dy: number) => {
    if (!visible.current) return
    const now = Date.now()
    if (play.current) moveToyGrab(play.current, viewRef.current, dx, dy, now)
    else if (hand.current) {
      moveChallengeGrab(hand.current, viewRef.current, dx, dy, now)
      publishPreview(hand.current.state)
    }
  }, [publishPreview])
  const twistGrab = useCallback((radians: number) => {
    if (play.current && visible.current) twistToyGrab(play.current, viewRef.current, radians)
  }, [])
  const endGrab = useCallback((cancel = false, beforeDrop?: () => void) => {
    const now = Date.now()
    if (play.current) {
      endToyGrab(play.current, cancel, now)
      return
    }
    const grabbed = hand.current
    if (!grabbed) return
    const pose = !cancel && visible.current ? challengeDropPose(grabbed, now) : null
    hand.current = null
    clock.current.remainder = 0
    clock.current.last = now
    if (pose && canMoveToy(sim.current, pose.id)) {
      beforeDrop?.()
      const next = commitToyDrop(sim.current, pose)
      if (next !== sim.current) {
        commitAction(next)
        return
      }
    }
    publishPreview(sim.current)
  }, [commitAction, publishPreview])
  const flip = useCallback((id: SubjectId) => {
    if (play.current && visible.current) flipToy(play.current, id, viewRef.current)
  }, [])
  const hit = useCallback((x: number, y: number) => {
    if (scene.current) return scene.current.hit(x, y)
    const { width, height } = stageSize.current
    return hitPreview(getVisualState().bodies, x, y, width, height, viewRef.current)
  }, [getVisualState])
  return {
    sim, patch, snapshot, native, paused, waitingForTap, gestureEpoch, subscribe, replace, tapLaw, launch, hit, measure: bind,
    free, setFree, getVisualState, viewRef, viewChanged, subscribeView, setStageSize, orbit, zoom, resetView, beginGrab, dragGrab, twistGrab, endGrab, flip,
  }
}
