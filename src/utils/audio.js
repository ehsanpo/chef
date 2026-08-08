import chefMusicPath from '../../chef.mp3'

// Web Audio API Synthesizer + Background Music Manager
class SoundFX {
  constructor() {
    this.ctx = null
    this.muted = false
    this.bgMusic = new Audio(chefMusicPath)
    this.bgMusic.loop = true
    this.bgMusic.volume = 0.4
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  playBgMusic() {
    this.bgMusic.currentTime = 0
    if (!this.muted) {
      this.bgMusic.play().catch(err => console.warn('BGM playback deferred:', err))
    }
  }

  stopBgMusic() {
    this.bgMusic.pause()
    this.bgMusic.currentTime = 0
  }

  toggleMute() {
    this.muted = !this.muted
    if (this.muted) {
      this.bgMusic.pause()
    } else {
      if (this.bgMusic.currentTime > 0) {
        this.bgMusic.play().catch(() => {})
      }
    }
    return this.muted
  }

  playCatch() {
    if (this.muted) return
    this.init()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'square'
    osc.frequency.setValueAtTime(587.33, now)
    osc.frequency.setValueAtTime(880, now + 0.035)

    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.09)
  }

  playScoreBonus() {
    if (this.muted) return
    this.init()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'square'
    osc.frequency.setValueAtTime(783.99, now)
    osc.frequency.setValueAtTime(1046.50, now + 0.05)

    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.12)
  }

  playMouseBonus() {
    if (this.muted) return
    this.init()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'square'
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.setValueAtTime(1174.66, now + 0.05)
    osc.frequency.setValueAtTime(1760, now + 0.1)

    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.18)
  }

  playMiss() {
    if (this.muted) return
    this.init()
    if (!this.ctx) return

    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(240, now)
    osc.frequency.linearRampToValueAtTime(90, now + 0.18)

    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + 0.2)
  }
}

export const soundFx = new SoundFX()
