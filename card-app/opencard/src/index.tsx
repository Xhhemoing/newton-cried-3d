import React, { useEffect, useReducer, useRef } from 'react'
import { View, Text } from '@tarojs/components'
import type { LawId } from './shared/newton-core'
import { QUICK_LAWS, buildCardHandoffPath, cardForDay, initializeCard, localCardRequest, reduceCard } from './types'
import type { CardRequest } from './types'
import './index.css'

const FRAME_MS = 1000 / 60
const INTRO_FRAMES = 54
const INTRO_MS = 900

interface InterestCardProps {
  request?: CardRequest
  onHandoffReady?: (path: string | null) => void
}

export default function InterestCard({ request = localCardRequest, onHandoffReady }: InterestCardProps) {
  const [state, dispatch] = useReducer(reduceCard, undefined, () => initializeCard(cardForDay()))
  const lastFrame = useRef(Date.now())

  function consumeFrames() {
    const frames = Math.min(120, Math.max(0, Math.floor((Date.now() - lastFrame.current) * 60 / 1000)))
    lastFrame.current += frames * FRAME_MS
    return frames
  }

  useEffect(() => {
    let mounted = true
    // [PLATFORM-INTEGRATION: supply the template request wrapper for /api/dy_card/data.]
    async function load() {
      try {
        const value = await request('/api/dy_card/data')
        if (mounted) dispatch({ type: 'load', value })
      } catch {
        // The current day's audited round is already available.
      }
    }
    void load()
    return () => { mounted = false }
  }, [request])

  const { data, round } = state
  const taps = round.tapHistory.length
  const intro = round.status === 'cliffhanger' && round.tick < INTRO_FRAMES
  const failed = round.status === 'hilarious_fail'
  const saved = round.status === 'saved'
  const spinning = round.status === 'overdrive_oiia'
  const animate = !intro && !failed && !saved
  const handoffPath = onHandoffReady ? buildCardHandoffPath(round, state.firstShot?.tick) : null

  useEffect(() => {
    // [PLATFORM-INTEGRATION: bind the earned path to the host entry if the template supports it.]
    onHandoffReady?.(handoffPath)
  }, [handoffPath, onHandoffReady])

  useEffect(() => {
    if (!intro) return
    lastFrame.current = Date.now()
    const timer = setTimeout(() => dispatch({ type: 'advance', frames: consumeFrames() }), INTRO_MS + 1)
    return () => clearTimeout(timer)
  }, [intro, data.seed])

  useEffect(() => {
    if (!animate) return
    // Preserve 60 Hz physics at a lower UI update rate through the cup's result.
    const frames = setInterval(() => dispatch({ type: 'advance', frames: consumeFrames() }), 33)
    return () => clearInterval(frames)
  }, [animate])

  function play(law: LawId) {
    if (saved || failed) {
      lastFrame.current = Date.now()
      dispatch({ type: 'compare', law })
    } else {
      dispatch({ type: 'tap', law, frames: consumeFrames() })
    }
  }

  function replay() {
    lastFrame.current = Date.now()
    dispatch({ type: 'replay' })
  }

  const [cat, cup, , , blocks] = round.bodies
  const catLeft = Math.max(10, Math.min(80, 24 + cat.x * 22))
  const catBottom = Math.max(7, Math.min(39, 17 + (cat.y - 0.38) * 22))
  const cupLeft = Math.max(9, Math.min(89, 18 + cup.x * 28.6))
  const cupBottom = failed ? -42 : Math.min(59, 23 + (cup.y - 0.23) * 34)
  const cupLift = Math.max(0, cup.y - 0.23)
  const shadowOpacity = failed ? 0 : Math.max(0.06, Math.min(0.24, 0.24 - cupLift * 0.14))
  const shadowScale = Math.max(0.58, Math.min(1, 1 - cupLift * 0.26))
  const blocksLeft = Math.max(8, Math.min(85, 42 + blocks.x * 16))
  const blocksBottom = Math.max(6, Math.min(40, 30 + (blocks.y - 0.22) * 18))
  const lastLaw = round.tapHistory[taps - 1]
  const hasChain = !failed && !saved && !spinning && taps > 0 && round.chainLabel !== '' && round.chainLabel !== '猫爪偷推'
  const feedback = failed ? '杯子掉了'
    : saved ? '冰美式稳住了'
    : spinning ? '🌀 陀螺橘'
    : hasChain ? (round.chainLabel === '飞杯反杀' ? '☕' : '✦') + round.chainLabel
    : round.clutchSaved ? '压哨出手'
    : round.sfxText || '点杯，救一下'

  return <View className="widget-root">
    <View className="widget-body">
      {/* Actual FMP: permanent body with the playfield and controls. */}
      <View className="newton-stage" key={data.seed}>
        <View className="stage-glow" />
        <View className="weather"><Text className="weather-text">{data.weather.icon} {data.weather.title}</Text></View>
        <View className={'wig-meter' + (taps === 0 ? ' wig-quiet' : hasChain || spinning ? ' wig-pop' : '')}>
          <Text className="wig-label">牛顿假发离地表</Text>
          <Text className="wig-number">{round.wigLiftPct}%</Text>
        </View>
        <View className="wood-rim"><View className="wood-center" /></View>
        <View className="spring-piano">
          <View className="piano-keys">
            <View className="key" /><View className="key" /><View className="key" /><View className="key" />
          </View>
        </View>
        <View className="block-stack" style={{ left: blocksLeft + '%', bottom: blocksBottom + '%' }}>
          <View className="toy-block toy-block-base" /><View className="toy-block toy-block-top" />
        </View>
        {!failed ? <View className={'shadow-track' + (intro ? ' coffee-intro' : '')}
          style={intro ? undefined : { left: (cupLeft - 74) + '%' }}>
          <View className="coffee-shadow" style={intro ? undefined : {
            opacity: Number(shadowOpacity.toFixed(2)),
            transform: 'scaleX(' + shadowScale.toFixed(2) + ') scaleY(' + shadowScale.toFixed(2) + ')',
          }} />
        </View> : null}
        <View className={'coffee-track' + (intro ? ' coffee-intro' : '')}
          style={intro ? undefined : { left: (cupLeft - 74) + '%', bottom: cupBottom + '%' }}>
          <View className="coffee-anchor"
            onClick={() => play('zero_g')}
            style={intro ? undefined : { transform: 'rotate(' + Math.round(cup.rotZ * 180 / Math.PI) + 'deg)' }}>
            <View key={taps} className={'coffee-toy' + (lastLaw ? ' coffee-pulse coffee-' + lastLaw : '')}>
              <View className="coffee-straw" />
              <View className="coffee-cup">
                <View className="coffee-drink" />
                <View className="ice-cube ice-cube-left" /><View className="ice-cube ice-cube-right" />
                <View className="coffee-glint" />
                <View className="coffee-sleeve"><Text className="coffee-mark">✦</Text></View>
              </View>
              <View className="coffee-lid" />
            </View>
          </View>
        </View>
        <View className={'cat-track' + (intro ? ' cat-intro' : '')}
          style={intro ? undefined : { left: (catLeft - 57) + '%', bottom: catBottom + '%' }}>
          <View className="cat-anchor"
            style={intro ? undefined : { transform: 'rotate(' + Math.round(cat.rotZ * 180 / Math.PI) + 'deg)' }}>
            <View key={taps} className={'cat-toy' + (taps > 0 ? ' cat-pulse' : '') +
              (round.clutchSaved ? ' cat-clutch' : '') + (spinning ? ' cat-oiia' : '')}>
              <View className="cat-tail" />
              <View className="cat-body" />
              <View className="cat-ear cat-ear-left" /><View className="cat-ear cat-ear-right" />
              <View className="cat-head">
                <View className="cat-stripe" />
                <View className="cat-shades"><View className="cat-lens" /><View className="cat-lens" /></View>
                <View className="cat-muzzle"><Text className="cat-smile">·ᴗ·</Text></View>
              </View>
              <View className="cat-paw cat-paw-left" /><View className="cat-paw cat-paw-right" />
            </View>
          </View>
        </View>
      </View>

      <View className="quick-row">
        {QUICK_LAWS.map(law => {
          const picked = lastLaw === law.id
          return <View key={law.id}
            className={'quick-pill' + (picked ? ' quick-picked' : '')}
            onClick={() => play(law.id)}>
            <View key={picked ? taps : 0}
              className={'quick-cap quick-' + law.color + (picked && taps > 0 ? ' quick-cap-press' : '')}>
              <Text className="quick-icon">{law.icon}</Text>
              <Text className="quick-name">{law.title}</Text>
            </View>
          </View>
        })}
      </View>

      <View className="card-result">
        <Text className={'result-text' + (hasChain ? ' result-chain' : saved ? ' result-saved' : '')}>{feedback}{saved || failed ? ' · 点招再试' : ''}</Text>
        {failed || taps > 0
          ? <View className="replay" onClick={replay}><Text className="replay-label">↻ 再来</Text></View>
          : null}
        <Text className="artifact">{handoffPath ? '同桌首招' : '今日同桌'}</Text>
      </View>
    </View>
  </View>
}
