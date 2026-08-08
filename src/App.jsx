import React from 'react'
import Game from './gameplay/Game'

export default function App() {
  return (
    <div className="app-root">
      <h1>Chef — Prototype (v0.0 → v0.2)</h1>
      <Game />
      <footer style={{fontSize:12, marginTop:12}}>Use ← → or A/D to move. Press Space to restart if Game Over.</footer>
    </div>
  )
}
