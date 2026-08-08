# Nintendo Game & Watch: Chef (v0.4 Production Edition)

A high-fidelity retro LCD recreation of the classic **Nintendo Game & Watch FP-24 "Chef"** handheld game built with React, Vite, and CSS3.

![Nintendo G&W Chef](img/chef_spritesheet.png)

---

## 🚀 Version History

### **v0.3: Start & Menu Design + Level Difficulty Selection**
- **Start Menu**: Retro Game & Watch FP-24 handheld frame layout.
- **Difficulty Selection**:
  - **Easy Mode**: Slower food drops, relaxed pace for beginners.
  - **Game A (Normal)**: Authentic Game & Watch FP-24 speed & progression.
  - **Game B (Hard)**: Rapid drops, fast acceleration, frequent cat traps & double spawns.
- **High Scores**: Persistent score tracking per difficulty level stored in browser `localStorage`.
- **Keyboard & Touch Controls**: Seamless `ArrowLeft`/`ArrowRight` or `A`/`D` movement, `Enter`/`Space` start and restart bindings.

### **v0.4: React & Production Cleanup**
- **Single Sprite Sheet**: High-performance single PNG sprite sheet (`chef_spritesheet.png`) for all 4 chef position animation frames.
- **Authentic LCD Graphics**: Transparent PNG LCD sprites for sausages, fish, eggs, mice, and cat traps.
- **Clean Architecture**: Modular React structure (`src/components/StartMenu.jsx`, `src/gameplay/Game.jsx`, `src/structure/sprites.js`).
- **Production Ready**: Optimized bundle size, zero unused dependencies, pixel-perfect CSS styling.

---

## 🕹️ Controls

- **Move Left**: `←` Left Arrow or `A` key / Click Left Move button
- **Move Right**: `→` Right Arrow or `D` key / Click Right Move button
- **Start / Restart**: `Space` or `Enter`

---

## 🛠️ Local Development

To run locally:

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Production build
npm run build
```

Open `http://localhost:5173` in your web browser.
