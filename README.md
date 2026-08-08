# Chef (Prototype)

This is a small front-end prototype of the Chef arcade game (v0.0 → v0.2). It uses Vite + React and ships placeholder sprites you can replace later.

Run locally (PowerShell):

```powershell
cd c:\Users\Ehsan\dev\chef
npm install
npm run dev
```

Open http://localhost:5173 (Vite default) and use ← / → or A / D to move. Catch food for +10, catch the mouse for +50. 3 misses = game over.

Project layout:

- `src/gameplay` — gameplay code (you will replace or extend this)
- `src/structure` — central place for sprites and assets (replace exports with real PNG imports later)

Next steps we can do after you verify this prototype:

- Improve physics arcs and animations
- Add menu / difficulty (v0.3)
- Add Expo/Android packaging (v0.4)
