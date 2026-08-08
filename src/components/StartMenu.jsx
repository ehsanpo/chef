import React, { useState, useEffect } from 'react'
import * as Spr from '../structure/sprites'

export const DIFFICULTIES = {
  easy: {
    key: 'easy',
    name: 'EASY MODE',
    desc: 'Relaxed speed, slower food drops, ideal for learning.',
    baseSpeed: 0.7,
    spawnInterval: 6500,
    catChance: 0.0003
  },
  gameA: {
    key: 'gameA',
    name: 'GAME A (NORMAL)',
    desc: 'Classic Game & Watch FP-24 speed and progression.',
    baseSpeed: 1.0,
    spawnInterval: 5200,
    catChance: 0.0006
  },
  gameB: {
    key: 'gameB',
    name: 'GAME B (HARD)',
    desc: 'Faster drops, frequent spawns, aggressive cat traps.',
    baseSpeed: 1.4,
    spawnInterval: 3800,
    catChance: 0.0012
  }
}

export default function StartMenu({ onStartGame, highScores = {} }) {
  const [selectedDiff, setSelectedDiff] = useState('gameA')
  const [previewFrame, setPreviewFrame] = useState(1)

  // Cycle preview frame for fun menu animation
  useEffect(() => {
    const timer = setInterval(() => {
      setPreviewFrame(f => (f + 1) % 4)
    }, 600)
    return () => clearInterval(timer)
  }, [])

  // Support Enter or Space key to start game
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onStartGame(selectedDiff)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedDiff, onStartGame])

  const currentDiff = DIFFICULTIES[selectedDiff]
  const highScore = highScores[selectedDiff] || 0

  return (
    <div className="menu-container">
      <div className="menu-header">
        <h1 className="menu-title">CHEF</h1>
      </div>

      <div className="menu-preview-box">
        <div 
          className={`player-sprite frame-${previewFrame}`}
          style={{ backgroundImage: `url(${Spr.chefSheet})` }}
        />
        <div className="food-previews">
          <img src={Spr.sausage} alt="sausage" className="menu-food" />
          <img src={Spr.fish} alt="fish" className="menu-food" />
          <img src={Spr.egg} alt="egg" className="menu-food" />
        </div>
      </div>

      <div className="difficulty-section">
        <h3>SELECT DIFFICULTY</h3>
        <div className="diff-selector">
          {Object.values(DIFFICULTIES).map(diff => (
            <button
              key={diff.key}
              className={`diff-btn ${selectedDiff === diff.key ? 'active' : ''}`}
              onClick={() => setSelectedDiff(diff.key)}
            >
              {diff.name}
            </button>
          ))}
        </div>
        <p className="diff-desc">{currentDiff.desc}</p>
      </div>

      <div className="high-score-display">
        <span>HIGH SCORE ({currentDiff.name}):</span>
        <strong className="score-val">{highScore}</strong>
      </div>

      <div className="menu-actions">
        <button 
          className="start-game-btn"
          onClick={() => onStartGame(selectedDiff)}
        >
          START GAME
        </button>
        <div className="controls-hint">
          Controls: Use <strong>← / →</strong> or <strong>A / D</strong> to move. Press <strong>Space</strong> or <strong>Enter</strong> to start.
        </div>
      </div>
    </div>
  )
}
