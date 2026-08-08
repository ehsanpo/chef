// Placeholder sprite data URIs (SVG-based) so you can replace them with real PNGs later.
// Export names: player, sausage, fish, egg, cat, mouse

const svg = (color, label) => {
  const content = encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' width='64' height='48'>
      <rect width='100%' height='100%' rx='8' ry='8' fill='${color}' />
      <text x='50%' y='55%' font-size='10' text-anchor='middle' fill='white' font-family='Arial'>${label}</text>
    </svg>`)
  return `data:image/svg+xml;utf8,${content}`
}

export const player = svg('#2b8cff','CHEF')
export const sausage = svg('#f08a24','SAU')
export const fish = svg('#39a78d','FISH')
export const egg = svg('#f6f0a6','EGG')
export const cat = svg('#6b4c9a','CAT')
export const mouse = svg('#555555','MOUSE')

export default { player, sausage, fish, egg, cat, mouse }
