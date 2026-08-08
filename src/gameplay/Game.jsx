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
  const [speedMult, setSpeedMult] = useState(1)
  const [catPresent, setCatPresent] = useState(false)
  const [gameOver, setGameOver] = useState(false)

  // Floating Score Popups
  const [popups, setPopups] = useState([])

  // Animation Loop Refs
  const rafRef = useRef(null)
  const lastTS = useRef(0)
  const spawnTimer = useRef(0)
  const gameOverRef = useRef(false)
  const playerSlotRef = useRef(1)
  const activeDiffRef = useRef(DIFFICULTIES.gameA)

  useEffect(() => {
    playerSlotRef.current = playerSlot
  }, [playerSlot])

  useEffect(() => {
    gameOverRef.current = gameOver
  }, [gameOver])

  const toggleSound = () => {
    const isMuted = soundFx.toggleMute()
    setSoundEnabled(!isMuted)
  }

  function goToMenu() {
    soundFx.stopBgMusic()
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setScreen('MENU')
  }

  // Spawn floating score popup animation
  function triggerScorePopup(text, slotIndex, yPos, isBonus = false) {
    const popupId = Math.random().toString(36).slice(2)
    const left = `${SLOT_X[slotIndex] * 100}%`
    const newPopup = {
      id: popupId,
      text,
      left,
      top: `${yPos}px`,
      isBonus
    }
    setPopups(prev => [...prev.slice(-8), newPopup])

    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== popupId))
    }, 1350)
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

    itemsRef.current = []
    setPopups([])
    setScore(0)
    setMisses(0)
    setGameOver(false)
    setSpeedMult(diff.baseSpeed)
    setCatPresent(false)
    gameOverRef.current = false
    setPlayerSlot(1)

    setScreen('PLAYING')
    soundFx.playBgMusic()
    startLoop()
  }

  function restartGame() {
    const diff = DIFFICULTIES[difficultyKey] || DIFFICULTIES.gameA
    itemsRef.current = []
    setPopups([])
    setScore(0)
    setMisses(0)
    setGameOver(false)
    setSpeedMult(diff.baseSpeed)
    setCatPresent(false)
    gameOverRef.current = false

    soundFx.playBgMusic()
    startLoop()
  }

  function move(dir) {
    setPlayerSlot(s => Math.max(0, Math.min(SLOTS - 1, s + dir)))
  }

  function spawnRandom() {
    const types = ['sausage', 'fish', 'egg']
    const type = Math.random() < 0.03 ? 'mouse' : randChoice(types)

    let slot = -1
    for (let attempt = 0; attempt < SLOTS; attempt++) {
      const testSlot = Math.floor(Math.random() * SLOTS)
      const slotOccupied = itemsRef.current.some(it => it.slot === testSlot)
      if (!slotOccupied) { slot = testSlot; break }
    }
    if (slot === -1) return

    const now = performance.now()
    const item = {
      id: Math.random().toString(36).slice(2),
      type,
      slot,
      y: 10,
      vy: 0.5 + Math.random() * 0.8,
      flipsLeft: type === 'mouse' ? 0 : 3,
      hookedUntil: 0,
      freezeUntil: now + 900
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

      setSpeedMult(s => Math.min(3.5, s + dt * 0.000025))

      spawnTimer.current += dt
      const diffConfig = activeDiffRef.current
      const baseInterval = diffConfig.spawnInterval
      const adjInterval = Math.max(2800, baseInterval - (score * 12))

      if (spawnTimer.current > adjInterval) {
        spawnTimer.current = 0
        spawnRandom()
      }

      updateItems(dt / 16, playerSlotRef.current)

      if (!gameOverRef.current) {
        rafRef.current = requestAnimationFrame(frame)
      }
    }

    rafRef.current = requestAnimationFrame(frame)
  }

  function updateItems(step, currentPlayerSlot) {
    if (gameOverRef.current) return

    const gravity = 0.04 * speedMult
    const now = performance.now()
    const container = containerRef.current
    if (!container) return
    const h = container.clientHeight
    const panY = h - 110
    const groundY = h - 10

    const catChance = activeDiffRef.current.catChance
    if (!catPresent && Math.random() < catChance * speedMult) setCatPresent(true)
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
          // Caught by pan (guaranteed single hit per bounce)
          it.lastCaughtUntil = now + 650
          it.y = panY - 26

          let pts = 10
          if (it.type === 'mouse') {
            pts = 50
            soundFx.playMouseBonus()
            triggerScorePopup('+50 BONUS!', it.slot, panY - 20, true)
            setCatPresent(false)
          } else {
            it.flipsLeft -= 1
            if (it.flipsLeft <= 0) {
              pts = 30
              soundFx.playScoreBonus()
              triggerScorePopup('+30!', it.slot, panY - 20, true)
              setScore(s => {
                const ns = s + pts
                updateHighScoreIfNeeded(ns, difficultyKey)
                return ns
              })
              continue
            } else {
              soundFx.playCatch()
              triggerScorePopup('+10', it.slot, panY - 20, false)
            }
          }

          setScore(s => {
            const ns = s + pts
            updateHighScoreIfNeeded(ns, difficultyKey)
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
          // Missed item (hit floor)
          if (it.y >= groundY) {
            if (it.type === 'mouse') {
              // Mouse escaped: No life penalty!
              triggerScorePopup('ESCAPED!', it.slot, groundY - 30, false)
            } else {
              // Food dropped: Penalty (loss of life)
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
            <div><strong>SCORE:</strong> {score}</div>
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
            {popups.map(p => (
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
              const sprite = it.type === 'sausage' ? Spr.sausage : it.type === 'fish' ? Spr.fish : it.type === 'egg' ? Spr.egg : Spr.mouse
              return (
                <div key={it.id} className="item-wrapper" style={{ left, top: `${it.y}px` }}>
                  <img src={sprite} alt={it.type} className="item" />
                  {it.type !== 'mouse' && it.flipsLeft > 0 && (
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
