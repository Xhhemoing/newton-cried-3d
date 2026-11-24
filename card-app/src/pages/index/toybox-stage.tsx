import React, { memo, useCallback, useEffect, useRef, useState } from 'react'
import Taro, { useDidHide, useDidShow, useReady, useResize } from '@tarojs/taro'
import { Canvas, Text, View } from '@tarojs/components'
import { PROP_SKINS, SUBJECTS } from '../../shared/newton-core'
import type { OutfitId, PropSkinId, SubjectId } from '../../shared/newton-core'
import { projectedPose, projectedTray } from './use-toybox-3d'
import type { useToybox3D } from './use-toybox-3d'
import { createStageGestures, readStageTouch } from './touch-gestures'
import type { StageRect, StageSurface, TouchPhase } from './touch-gestures'
import './stage-touch.css'

type StageProps = {
  motion: ReturnType<typeof useToybox3D>
  target?: SubjectId | null
  outfit: OutfitId | null
  onLaunch: (id: SubjectId) => void
  onBeforeDrop?: () => void
  onSelect?: (id: SubjectId) => void
  layoutKey?: string
}
type RawTouch = Parameters<typeof readStageTouch>[0]
type StageEvent = {
  touches?: RawTouch[]
  changedTouches?: RawTouch[]
  stopPropagation: () => void
}
type PreviewProps = Pick<StageProps, 'motion' | 'outfit' | 'target'> & {
  onTouch: (phase: TouchPhase, event: StageEvent, toy?: SubjectId) => void
  onActivate: (id: SubjectId) => void
}

const STAGE_ID = 'newton-toybox-stage'
const CANVAS_ID = 'newton-toybox-canvas'
const EQUIP_ICON: Record<OutfitId, string> = { shades: '🕶️', apple_hat: '🍎', spring_bow: '🎀', newton_wig: '🧑‍🦳' }

const PreviewToy = memo(function PreviewToy({ id, outfit, propSkin }: { id: SubjectId; outfit: OutfitId | null; propSkin: PropSkinId }) {
  if (id === 'cat') return <View className='kitten'>
    <View className='tail'>{[0,1,2,3,4].map(i => <View key={i} className={'tuft tuft-' + i} />)}</View>
    <View className='haunch' /><View className='bib' />
    <View className='ear ear-l' /><View className='ear ear-r' /><View className='cat-head' />
    <View className='stripe s1' /><View className='stripe s2' /><View className='stripe s3' />
    <View className='eye eye-l' /><View className='eye eye-r' /><View className='muzzle m-l' /><View className='muzzle m-r' /><View className='nose' />
    <View className='paw paw-l' /><View className='paw paw-r' />
    {outfit && <Text className={'kit-wear wear-' + outfit}>{outfit === 'newton_wig' ? '☁' : EQUIP_ICON[outfit]}</Text>}
  </View>
  if (id === 'apple') return <View className={'prop prop-' + propSkin}><View className='prop-body' /><View className='prop-top' /><View className='prop-detail' /><View className='prop-mark' /></View>
  if (id === 'piano') return <View className='toy-piano'><View className='winder' /><View className='keyboard'>{[0,1,2,3,4,5,6].map(i => <View className='key' key={i} />)}</View></View>
  if (id === 'blocks') return <View className='toy-stack'>{[0,1,2,3].map(i => <View className={'brick brick-' + i} key={i} />)}</View>
  return <View className='ramen'><View className='broth'><Text>∿∿∿</Text></View></View>
})

function PreviewStage({ motion, outfit, target, onTouch, onActivate }: PreviewProps) {
  const [state, setState] = useState(motion.getVisualState)
  const [view, setView] = useState(motion.viewRef.current)
  useEffect(() => motion.subscribe(setState), [motion.subscribe])
  useEffect(() => motion.subscribeView(setView), [motion.subscribeView])
  const tray = projectedTray(view)
  return <View className='preview stage-preview'
    onTouchStart={event => onTouch('start', event)}
    onTouchMove={event => onTouch('move', event)}
    onTouchEnd={event => onTouch('end', event)}
    onTouchCancel={event => onTouch('cancel', event)}>
    <View className='wood-shadow' style={tray} />
    <View className='wood-base' style={tray}><View className='wood-ring' /></View>
    {state.bodies.map(body => {
      const canActivate = !motion.free && target !== null
      return <View key={body.id} className={'toy-hit toy-' + body.id} style={projectedPose(body, view)}
        role={canActivate ? 'button' : undefined}
        ariaLabel={body.id === 'apple' ? PROP_SKINS.find(p => p.id === state.propSkin)?.title : SUBJECTS.find(s => s.id === body.id)?.title}
        hoverClass={target !== null ? 'stage-toy-pressed' : 'none'}
        hoverStartTime={0} hoverStayTime={60}
        onTouchStart={event => { event.stopPropagation(); onTouch('start', event, body.id) }}
        onClick={canActivate ? event => {
          const detail = event.detail as { x?: number; y?: number } | undefined
          if (detail?.x == null && detail?.y == null) onActivate(body.id)
        } : undefined}>
        <PreviewToy id={body.id} outfit={outfit} propSkin={state.propSkin} />
      </View>
    })}
  </View>
}

export function ToyboxStage(props: StageProps) {
  const { motion, outfit, target, layoutKey } = props
  const latest = useRef(props)
  latest.current = props
  const rect = useRef<StageRect | null>(null)
  const request = useRef(0)
  const activeSurface = useRef<StageSurface | null>(null)
  const activeEpoch = useRef(0)
  const lastTouchAt = useRef(-Infinity)
  const [gestures] = useState(() => createStageGestures({
    tap: id => {
      if (latest.current.target !== null) latest.current.onLaunch(id)
    },
    orbit: (dx, dy) => latest.current.motion.orbit(dx, dy),
    zoom: factor => latest.current.motion.zoom(factor),
    grab: id => {
      latest.current.motion.beginGrab(id)
      latest.current.onSelect?.(id)
    },
    drag: (dx, dy) => latest.current.motion.dragGrab(dx, dy),
    twist: radians => latest.current.motion.twistGrab(radians),
    release: cancel => latest.current.motion.endGrab(cancel, latest.current.onBeforeDrop),
  }))

  const cancelGesture = useCallback(() => {
    activeSurface.current = null
    gestures.cancel()
  }, [gestures])
  const measure = useCallback(() => {
    const id = ++request.current
    Taro.nextTick(() => {
      if (id !== request.current) return
      try {
        const query = Taro.createSelectorQuery()
        query.select('#' + STAGE_ID).boundingClientRect()
        query.exec(result => {
          if (id !== request.current) return
          const next = result?.[0] as StageRect | undefined
          if (!next || !Number.isFinite(next.left) || !Number.isFinite(next.top) || !next.width || !next.height) return
          rect.current = next
          latest.current.motion.setStageSize(next.width, next.height)
        })
      } catch { /* A displayed preview can still identify a toy without measuring the viewport. */ }
    })
  }, [])

  useReady(measure)
  useDidShow(measure)
  useResize(measure)
  useDidHide(cancelGesture)
  useEffect(() => { measure() }, [measure, layoutKey, motion.native, motion.free])
  useEffect(() => () => { request.current++ }, [])
  useEffect(() => cancelGesture, [cancelGesture, motion.native, motion.free, motion.paused, target])

  function handleTouch(surface: StageSurface, phase: TouchPhase, event: StageEvent, toy?: SubjectId) {
    const now = Date.now()
    lastTouchAt.current = now
    if (activeSurface.current && activeEpoch.current !== motion.gestureEpoch.current) cancelGesture()
    if (motion.paused) return
    if (phase === 'start' && !activeSurface.current) {
      activeSurface.current = surface
      activeEpoch.current = motion.gestureEpoch.current
      measure()
    }
    if (activeSurface.current !== surface) return
    const box = rect.current
    const points = (raw: RawTouch[] = []) => raw.flatMap(touch => readStageTouch(touch, surface, box) ?? [])
    const touches = points(event.touches)
    const changed = points(event.changedTouches)
    const bounds = surface === 'canvas' && box ? { ...box, left: 0, top: 0 } : box
    const inProgress = gestures.handle(phase, {
      touches, changed, bounds, width: box?.width ?? 0, free: motion.free, time: now,
      hit: point => target === null ? null : surface === 'canvas' ? motion.hit(point.x, point.y) : toy,
    })
    if (!inProgress) activeSurface.current = null
  }

  return <View className='stage-frame' id={STAGE_ID}>
    <Canvas type='webgl' id={CANVAS_ID} canvasId={CANVAS_ID}
      className={'native-stage' + (motion.native ? ' ready' : '')}
      onTouchStart={event => handleTouch('canvas', 'start', event)}
      onTouchMove={event => handleTouch('canvas', 'move', event)}
      onTouchEnd={event => handleTouch('canvas', 'end', event)}
      onTouchCancel={event => handleTouch('canvas', 'cancel', event)} />
    {!motion.native && <PreviewStage
      motion={motion} outfit={outfit} target={target}
      onTouch={(phase, event, toy) => handleTouch('preview', phase, event, toy)}
      onActivate={id => {
        if (!motion.paused && !activeSurface.current && Date.now() - lastTouchAt.current > 500 && target !== null) props.onLaunch(id)
      }} />}
  </View>
}
