import React, { useEffect, useRef, useState } from 'react'
import * as Spr from '../structure/sprites'
import kitchenBg from '../../img/bg.png'
import StartMenu, { DIFFICULTIES } from '../components/StartMenu'
import { soundFx } from '../utils/audio'

const SLOTS = 4
const SLOT_X = [0.12, 0.36, 0.60, 0.84]

function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)] }

export default function Game() {
  const containerRef = useRef(null)
  const itemsRef = useRef([])
  const popupsRef = useRef([])

  // Screen State: 'MENU' | 'PLAYING'
  const [screen, setScreen] = useState('MENU')
  const [difficultyKey, setDifficultyKey] = useState('gameA')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [highScores, setHighScores] = useState(() => {
    try {
      const saved = localStorage.getItem('chef_high_scores')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  // Gameplay State
  const [playerSlot, setPlayerSlot] = useState(1)
  const [score, setScore] = useState(0)
  const [misses, setMisses] = useState(0)
  const [catPresent, setCatPresent] = useState(false)
  const [gameOver, setGameOver] = useState(false)

  // Active Powerup Indicators for HUD
  const [has2X, setHas2X] = useState(false)
  const [hasSlow, setHasSlow] = useState(false)
  const [renderTick, setRenderTick] = useState(0)

  // Animation Loop Refs
  const rafRef = useRef(null)
  const lastTS = useRef(0)
  const spawnTimer = useRef(0)
  const gameOverRef = useRef(false)
  const playerSlotRef = useRef(1)
  const activeDiffRef = useRef(DIFFICULTIES.gameA)
  const speedMultRef = useRef(1)

  // Powerup & Milestone Timers
  const multiplierUntilRef = useRef(0)
  const slowUntilRef = useRef(0)
  const milestonesRef = useRef({ 200: false, 500: false })

  // Ref tracking to avoid useless React re-renders
  const has2XRef = useRef(false)
  const hasSlowRef = useRef(false)

  useEffect(() => {
    playerSlotRef.current = playerSlot
  }, [playerSlot])

  useEffect(() => {
    gameOverRef.current = gameOver
  }, [gameOver])

  // Cleanup loop on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      soundFx.stopBgMusic()
    }
  }, [])

  const toggleSound = () => {
    const isMuted = soundFx.toggleMute()
    setSoundEnabled(!isMuted)
  }

  function goToMenu() {
    soundFx.stopBgMusic()
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setScreen('MENU')
  }

  // Optimized score popup spawner (no setTimeout closures, cleaned up in frame loop)
  function triggerScorePopup(text, slotIndex, yPos, isBonus = false) {
    const popupId = Math.random().toString(36).slice(2)
    const left = `${SLOT_X[slotIndex] * 100}%`
    const now = performance.now()
    const newPopup = {
      id: popupId,
      text,
      left,
      top: `${yPos}px`,
      isBonus,
      expiresAt: now + 1350
    }
    popupsRef.current = [...popupsRef.current.slice(-6), newPopup]
  }

  const updateHighScoreIfNeeded = (newScore, diffKey) => {
    setHighScores(prev => {
      const prevBest = prev[diffKey] || 0
      if (newScore > prevBest) {
        const nextScores = { ...prev, [diffKey]: newScore }
        try {
          localStorage.setItem('chef_high_scores', JSON.stringify(nextScores))
        } catch (e) {
          console.warn('Could not save high score:', e)
        }
        return nextScores
      }
      return prev
    })
  }

  // Check 200pt & 500pt Milestone Extra Lives
  function checkMilestones(currentScore) {
    if (currentScore >= 200 && !milestonesRef.current[200]) {
      milestonesRef.current[200] = true
      setMisses(0)
      soundFx.playScoreBonus()
      triggerScorePopup('1-UP! MISSES CLEARED!', 1, 140, true)
    }
    if (currentScore >= 500 && !milestonesRef.current[500]) {
      milestonesRef.current[500] = true
      setMisses(0)
      soundFx.playScoreBonus()
      triggerScorePopup('1-UP! MISSES CLEARED!', 2, 140, true)
    }
  }

  useEffect(() => {
    function onKey(e) {
      if (screen !== 'PLAYING') return
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') move(-1)
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') move(1)
      if (e.key === ' ') { if (gameOver) restartGame() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [playerSlot, gameOver, screen])

  function handleStartGame(selectedDiffKey) {
    const diff = DIFFICULTIES[selectedDiffKey] || DIFFICULTIES.gameA
    setDifficultyKey(selectedDiffKey)
    activeDiffRef.current = diff
    speedMultRef.current = diff.baseSpeed

    itemsRef.current = []
    popupsRef.current = []
    setScore(0)
    setMisses(0)
    setGameOver(false)
    setCatPresent(false)
    gameOverRef.current = false
    setPlayerSlot(1)

    multiplierUntilRef.current = 0
    slowUntilRef.current = 0
    milestonesRef.current = { 200: false, 500: false }
    has2XRef.current = false
    hasSlowRef.current = false
    setHas2X(false)
    setHasSlow(false)

    setScreen('PLAYING')
    soundFx.playBgMusic()
    startLoop()
  }

  function restartGame() {
    const diff = DIFFICULTIES[difficultyKey] || DIFFICULTIES.gameA
    activeDiffRef.current = diff
    speedMultRef.current = diff.baseSpeed

    itemsRef.current = []
    popupsRef.current = []
    setScore(0)
    setMisses(0)
    setGameOver(false)
    setCatPresent(false)
    gameOverRef.current = false
    setPlayerSlot(1)

    multiplierUntilRef.current = 0
    slowUntilRef.current = 0
    milestonesRef.current = { 200: false, 500: false }
    has2XRef.current = false
    hasSlowRef.current = false
    setHas2X(false)
    setHasSlow(false)

    soundFx.playBgMusic()
    startLoop()
  }

  function move(dir) {
    setPlayerSlot(s => Math.max(0, Math.min(SLOTS - 1, s + dir)))
  }

  function spawnRandom() {
    const r = Math.random()
    let type = 'sausage'
    if (r < 0.03) type = 'mouse'
    else if (r < 0.055) type = 'golden'
    else if (r < 0.085) type = 'coffee'
    else type = randChoice(['sausage', 'fish', 'egg'])

    let slot = -1
    for (let attempt = 0; attempt < SLOTS; attempt++) {
      const testSlot = Math.floor(Math.random() * SLOTS)
      const slotOccupied = itemsRef.current.some(it => it.slot === testSlot)
      if (!slotOccupied) { slot = testSlot; break }
    }
    if (slot === -1) return

    const now = performance.now()
    const isSpecial = type === 'mouse' || type === 'golden' || type === 'coffee'
    const item = {
      id: Math.random().toString(36).slice(2),
      type,
      slot,
      y: 10,
      vy: 0.5 + Math.random() * 0.8,
      flipsLeft: isSpecial ? 0 : 3,
      hookedUntil: 0,
      freezeUntil: now + 900,
      lastCaughtUntil: 0
    }
    itemsRef.current.push(item)
  }

  function startLoop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    lastTS.current = performance.now()
    spawnTimer.current = 0

    function frame(ts) {
      const dt = Math.min(50, ts - lastTS.current)
      lastTS.current = ts

      if (gameOverRef.current) return

      const now = performance.now()
      const is2XActive = multiplierUntilRef.current > now
      const isSlowActive = slowUntilRef.current > now

      // ONLY trigger React state update when power-up status changes!
      if (is2XActive !== has2XRef.current) {
        has2XRef.current = is2XActive
        setHas2X(is2XActive)
      }
      if (isSlowActive !== hasSlowRef.current) {
        hasSlowRef.current = isSlowActive
        setHasSlow(isSlowActive)
      }

      // Smoothly update speedMultRef without triggering 60 FPS React re-renders
      speedMultRef.current = Math.min(3.5, speedMultRef.current + dt * 0.000025)

      // Clean up expired popups inside the loop (zero garbage accumulation)
      if (popupsRef.current.length > 0) {
        popupsRef.current = popupsRef.current.filter(p => p.expiresAt > now)
      }

      // Controlled spawn timing
      spawnTimer.current += dt
      const diffConfig = activeDiffRef.current
      const baseInterval = diffConfig.spawnInterval
      const adjInterval = Math.max(2800, baseInterval - (score * 12))

      if (spawnTimer.current > adjInterval) {
        spawnTimer.current = 0
        spawnRandom()
      }

      updateItems(dt / 16, playerSlotRef.current, is2XActive, isSlowActive)

      // Light render tick to render positions smoothly at 60 FPS
      setRenderTick(t => (t + 1) % 10000)

      if (!gameOverRef.current) {
        rafRef.current = requestAnimationFrame(frame)
      }
    }

    rafRef.current = requestAnimationFrame(frame)
  }

  function updateItems(step, currentPlayerSlot, is2XActive, isSlowActive) {
    if (gameOverRef.current) return

    const speed = speedMultRef.current
    const gravityScale = isSlowActive ? 0.45 : 1.0
    const gravity = 0.04 * speed * gravityScale
    const now = performance.now()
    const container = containerRef.current
    if (!container) return
    const h = container.clientHeight
    const panY = h - 110
    const groundY = h - 10

    const catChance = activeDiffRef.current.catChance
    if (!catPresent && Math.random() < catChance * speed) setCatPresent(true)
    if (catPresent && Math.random() < 0.0008) setCatPresent(false)

    const next = []
    for (const it of itemsRef.current) {
      if (it.hookedUntil > now) { next.push(it); continue }
      if (it.freezeUntil > now) { next.push(it); continue }
      if (it.lastCaughtUntil > now) { next.push(it); continue }

      it.vy += gravity * step
      it.y += it.vy * 3 * step

      if (it.y >= panY) {
        if (it.slot === currentPlayerSlot) {
          // Single-hit catch guarantee
          it.lastCaughtUntil = now + 650
          it.y = panY - 26

          let basePts = 10

          if (it.type === 'mouse') {
            basePts = 50
            soundFx.playMouseBonus()
            const pts = basePts * (is2XActive ? 2 : 1)
            triggerScorePopup(`+${pts} MOUSE!`, it.slot, panY - 20, true)
            setCatPresent(false)
          } else if (it.type === 'golden') {
            basePts = 100
            multiplierUntilRef.current = now + 6000
            soundFx.playMouseBonus()
            const pts = basePts * (is2XActive ? 2 : 1)
            triggerScorePopup(`+${pts} 🌟 GOLDEN 2X!`, it.slot, panY - 20, true)
          } else if (it.type === 'coffee') {
            basePts = 20
            slowUntilRef.current = now + 5000
            soundFx.playScoreBonus()
            const pts = basePts * (is2XActive ? 2 : 1)
            triggerScorePopup(`+${pts} ☕ CHEF FOCUS!`, it.slot, panY - 20, true)
          } else {
            it.flipsLeft -= 1
            if (it.flipsLeft <= 0) {
              basePts = 30
              soundFx.playScoreBonus()
              const pts = basePts * (is2XActive ? 2 : 1)
              triggerScorePopup(`+${pts}!`, it.slot, panY - 20, true)
              setScore(s => {
                const ns = s + pts
                updateHighScoreIfNeeded(ns, difficultyKey)
                checkMilestones(ns)
                return ns
              })
              continue
            } else {
              soundFx.playCatch()
              const pts = basePts * (is2XActive ? 2 : 1)
              triggerScorePopup(`+${pts}`, it.slot, panY - 20, false)
            }
          }

          const pts = basePts * (is2XActive ? 2 : 1)
          setScore(s => {
            const ns = s + pts
            updateHighScoreIfNeeded(ns, difficultyKey)
            checkMilestones(ns)
            return ns
          })

          it.vy = -3.2 - Math.random() * 0.8
          it.freezeUntil = now + 500
          if (it.y < 10) it.y = 10

          if (catPresent && Math.random() < 0.3) {
            it.hookedUntil = now + 900
          }
          next.push(it)
          continue
        } else {
          // Missed item
          if (it.y >= groundY) {
            if (it.type === 'mouse' || it.type === 'golden' || it.type === 'coffee') {
              triggerScorePopup('ESCAPED!', it.slot, groundY - 30, false)
            } else {
              soundFx.playMiss()
              triggerScorePopup('MISS!', it.slot, groundY - 30, true)

              setMisses(m => {
                const nm = m + 1
                if (nm >= 3) {
                  setGameOver(true)
                  gameOverRef.current = true
                  soundFx.stopBgMusic()
                }
                return nm
              })
            }
            continue
          }
        }
      }

      if (it.y > h + 60) continue
      next.push(it)
    }
    itemsRef.current = next
  }

  function onClickMove(i) {
    if (screen === 'PLAYING') setPlayerSlot(i)
  }

  function getItemSprite(type) {
    if (type === 'sausage') return Spr.sausage
    if (type === 'fish') return Spr.fish
    if (type === 'egg') return Spr.egg
    if (type === 'mouse') return Spr.mouse
    if (type === 'golden') return Spr.golden
    if (type === 'coffee') return Spr.coffee
    return Spr.sausage
  }

  return (
    <div className="game-wrap">
      {screen === 'MENU' ? (
        <StartMenu 
          onStartGame={handleStartGame}
          highScores={highScores}
        />
      ) : (
        <>
          <div className="hud">
            <div><strong>MODE:</strong> {DIFFICULTIES[difficultyKey]?.name}</div>
            <div><strong>SCORE:</strong> {score} {has2X && <span className="badge-2x">🌟 2X</span>} {hasSlow && <span className="badge-slow">☕ SLOW</span>}</div>
            <div><strong>BEST:</strong> {highScores[difficultyKey] || 0}</div>
            <div><strong>MISSES:</strong> {misses} / 3</div>
            <div>
              <button className="sound-toggle-btn" onClick={toggleSound}>
                {soundEnabled ? '🔊 SOUND: ON' : '🔇 SOUND: OFF'}
              </button>
            </div>
          </div>

          <div className={`game-area ${gameOver ? 'game-over' : ''}`} ref={containerRef}>
            <div className="kitchen-bg" style={{ backgroundImage: `url(${kitchenBg})` }} />

            {/* Floating Score gained popups */}
            {popupsRef.current.map(p => (
              <div 
                key={p.id} 
                className={`floating-score ${p.isBonus ? 'bonus' : ''}`}
                style={{ left: p.left, top: p.top }}
              >
                {p.text}
              </div>
            ))}

            {/* Falling items */}
            {itemsRef.current.map(it => {
              const left = `${SLOT_X[it.slot] * 100}%`
              const sprite = getItemSprite(it.type)
              const isSpecial = it.type === 'mouse' || it.type === 'golden' || it.type === 'coffee'
              return (
                <div key={it.id} className="item-wrapper" style={{ left, top: `${it.y}px` }}>
                  <img src={sprite} alt={it.type} className="item" />
                  {!isSpecial && it.flipsLeft > 0 && (
                    <span className="item-count">{it.flipsLeft}</span>
                  )}
                </div>
              )
            })}

            {/* Chef positions */}
            <div className="pan-row">
              {Array.from({ length: SLOTS }).map((_, i) => {
                const left = `${SLOT_X[i] * 100}%`
                const isActive = i === playerSlot
                return (
                  <div
                    key={i}
                    className={`slot ${isActive ? 'active' : 'inactive'}`}
                    style={{ left }}
                    onClick={() => onClickMove(i)}
                  >
                    <div
                      className={`player-sprite frame-${i}`}
                      style={{ backgroundImage: `url(${Spr.chefSheet})` }}
                      aria-label={`chef-frame-${i}`}
                    />
                  </div>
                )
              })}
            </div>

            {catPresent && <img src={Spr.cat} alt="cat" className="cat" />}

            {gameOver && (
              <div className="overlay">
                <div className="panel">
                  <h2>GAME OVER</h2>
                  <p>Final Score: <strong>{score}</strong></p>
                  <p>Best Score ({DIFFICULTIES[difficultyKey]?.name}): <strong>{highScores[difficultyKey] || 0}</strong></p>
                  <div className="panel-buttons">
                    <button onClick={restartGame}>RETRY</button>
                    <button onClick={goToMenu}>MAIN MENU</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="controls">
            <button onClick={() => move(-1)}>◀ MOVE</button>
            <button onClick={() => move(1)}>MOVE ▶</button>
            <button className="menu-btn-small" onClick={goToMenu}>MENU</button>
          </div>
        </>
      )}
    </div>
  )
}
