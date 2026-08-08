import React, { useEffect, useRef, useState } from 'react'
import * as Spr from '../structure/sprites'

const SLOTS = 4
const SLOT_X = [0.12, 0.36, 0.60, 0.84] // as fraction of width

function randChoice(arr) { return arr[Math.floor(Math.random()*arr.length)] }

export default function Game(){
  const containerRef = useRef(null)
  const itemsRef = useRef([])
  const [playerSlot, setPlayerSlot] = useState(1)
  const [tick, setTick] = useState(0)
  const [score, setScore] = useState(0)
  const [misses, setMisses] = useState(0)
  const [speedMult, setSpeedMult] = useState(1)
  const [catPresent, setCatPresent] = useState(false)
  const [gameOver, setGameOver] = useState(false)

  // refs for animation loop
  const rafRef = useRef(null)
  const lastTS = useRef(0)
  const spawnTimer = useRef(0)
  const spawnInterval = useRef(900)
  const playerSlotRef = useRef(1)  // track player slot for collision detection

  // sync playerSlot state to ref for collision detection
  useEffect(()=>{
    playerSlotRef.current = playerSlot
  },[playerSlot])

  useEffect(()=>{
    function onKey(e){
      if(e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') move(-1)
      if(e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') move(1)
      if(e.key === ' '){ if(gameOver) resetGame() }
    }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  },[playerSlot, gameOver])

  useEffect(()=>{
    startLoop()
    return ()=> cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  function resetGame(){
    itemsRef.current = []
    setScore(0); setMisses(0); setGameOver(false); setSpeedMult(1); setCatPresent(false)
  }

  function move(dir){
    setPlayerSlot(s => Math.max(0, Math.min(SLOTS-1, s + dir)))
  }

  function spawnRandom(){
    const types = ['sausage','fish','egg']
    const type = Math.random() < 0.03 ? 'mouse' : randChoice(types)
    const slot = Math.floor(Math.random()*SLOTS)
    const now = performance.now()
    const item = {
      id: Math.random().toString(36).slice(2),
      type,
      slot,
      y: 10,  // spawn at top of visible screen
      vy: 0.5 + Math.random()*0.8,
      hookedUntil: 0,
      freezeUntil: now + 1000  // 1 second delay before falling
    }
    itemsRef.current.push(item)
  }

  function startLoop(){
    lastTS.current = performance.now()
    spawnTimer.current = 0
    function frame(ts){
      const dt = Math.min(50, ts - lastTS.current)
      lastTS.current = ts

      // if game is over, stop updating
      if(gameOver) return

      // speed increases slightly over time
      setSpeedMult(s => Math.min(3, s + dt*0.00002))

      // spawn control
      spawnTimer.current += dt
      const adjInterval = Math.max(3500, spawnInterval.current - (score/50))  // 10x slower: ~9 sec base
      if(spawnTimer.current > adjInterval){ spawnTimer.current = 0; spawnRandom() }

      updateItems(dt/16, playerSlotRef.current)

      setTick(t => t + 1)
      if(!gameOver) rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)
  }

  function updateItems(step, currentPlayerSlot){
    const gravity = 0.0875 * speedMult  // halved again: 0.175 → 0.0875
    const now = performance.now()
    const container = containerRef.current
    if(!container) return
    const h = container.clientHeight
    const panY = h - 110
    const groundY = h - 10

    // cat random events
    if(!catPresent && Math.random() < 0.0006 * speedMult) setCatPresent(true)
    if(catPresent && Math.random() < 0.0008) setCatPresent(false)

    const next = []
    for(const it of itemsRef.current){
      // if hooked by cat, freeze
      if(it.hookedUntil > now){ next.push(it); continue }

      // if spawned recently, freeze in place
      if(it.freezeUntil > now){ next.push(it); continue }

      // motion
      it.vy += gravity * step
      it.y += it.vy * 3 * step

      // check pan catch
      if(it.y >= panY){
        if(it.slot === currentPlayerSlot){
          // caught
          if(it.type === 'mouse'){
            setScore(s => s + 50)
            setCatPresent(false)
          } else {
            setScore(s => s + 10)
          }
          it.vy = -8 - Math.random()*2
          // cat interaction: when cat present, small chance to hook item for a second
          if(catPresent && Math.random() < 0.25){ it.hookedUntil = now + 900 }
          next.push(it)
          continue
        } else {
          // missed (hit floor)
          if(it.y >= groundY){
            setMisses(m => {
              const nm = m + 1
              if(nm >= 3){ setGameOver(true) }
              return nm
            })
            continue // drop item
          }
        }
      }

      // remove items that fall far below
      if(it.y > h + 60) continue
      next.push(it)
    }
    itemsRef.current = next
  }

  // small UI handlers
  function onClickMove(i){ setPlayerSlot(i) }

  // expose restart via space handled earlier

  return (
    <div className="game-wrap">
      <div className="hud">
        <div><strong>Score:</strong> {score}</div>
        <div><strong>Misses:</strong> {misses} / 3</div>
        <div><strong>Speed:</strong> {speedMult.toFixed(2)}</div>
        <div><strong>Cat:</strong> {catPresent ? '😾' : '-'}</div>
      </div>

      <div className={`game-area ${gameOver? 'game-over' : ''}`} ref={containerRef}>
        {/* background / level */}
        <div className="kitchen-bg" />

        {/* items */}
        {itemsRef.current.map(it => {
          const left = `${SLOT_X[it.slot]*100}%`
          const sprite = it.type === 'sausage' ? Spr.sausage : it.type === 'fish' ? Spr.fish : it.type === 'egg' ? Spr.egg : Spr.mouse
          return (
            <img key={it.id} src={sprite} alt={it.type} className="item" style={{left, transform:`translate(-50%, -50%)`, top: `${it.y}px`}} />
          )
        })}

        {/* pan / player */}
        <div className="pan-row">
          {Array.from({length:SLOTS}).map((_,i)=>{
            const left = `${SLOT_X[i]*100}%`
            return (
              <div key={i} className={`slot ${i===playerSlot? 'active':''}`} style={{left}} onClick={()=>onClickMove(i)}>
                <img src={Spr.player} alt="player" className="player-sprite" />
              </div>
            )
          })}
        </div>

        {/* cat sprite when present */}
        {catPresent && <img src={Spr.cat} alt="cat" className="cat" />}

        {gameOver && (
          <div className="overlay">
            <div className="panel">
              <h2>Game Over</h2>
              <p>Score: {score}</p>
              <button onClick={()=>{ resetGame(); startLoop(); }}>Restart</button>
            </div>
          </div>
        )}
      </div>

      <div className="controls">
        <button onClick={()=>move(-1)}>◀</button>
        <button onClick={()=>move(1)}>▶</button>
      </div>
    </div>
  )
}
