const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c; const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    table[n] = c;
  }
  c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makePNG(width, height, rgbaBuffer) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }
  
  const rawLines = [];
  for (let y = 0; y < height; y++) {
    rawLines.push(Buffer.from([0]));
    rawLines.push(rgbaBuffer.subarray(y * width * 4, (y + 1) * width * 4));
  }
  const raw = Buffer.concat(rawLines);
  const idat = zlib.deflateSync(raw);
  
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

class Canvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.buffer = Buffer.alloc(width * height * 4); // 0 alpha by default
  }

  setPixel(x, y, r, g, b, a = 255) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = (y * this.width + x) * 4;
    if (a === 255) {
      this.buffer[idx] = r;
      this.buffer[idx + 1] = g;
      this.buffer[idx + 2] = b;
      this.buffer[idx + 3] = a;
    } else {
      const alphaSrc = a / 255;
      const alphaDst = (this.buffer[idx + 3]) / 255;
      const outA = alphaSrc + alphaDst * (1 - alphaSrc);
      if (outA > 0) {
        this.buffer[idx] = Math.round((r * alphaSrc + this.buffer[idx] * alphaDst * (1 - alphaSrc)) / outA);
        this.buffer[idx + 1] = Math.round((g * alphaSrc + this.buffer[idx + 1] * alphaDst * (1 - alphaSrc)) / outA);
        this.buffer[idx + 2] = Math.round((b * alphaSrc + this.buffer[idx + 2] * alphaDst * (1 - alphaSrc)) / outA);
        this.buffer[idx + 3] = Math.round(outA * 255);
      }
    }
  }

  fillRect(x, y, w, h, r, g, b, a = 255) {
    for (let py = Math.floor(y); py < Math.floor(y + h); py++) {
      for (let px = Math.floor(x); px < Math.floor(x + w); px++) {
        this.setPixel(px, py, r, g, b, a);
      }
    }
  }

  fillCircle(cx, cy, radius, r, g, b, a = 255) {
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) {
          this.setPixel(x, y, r, g, b, a);
        }
      }
    }
  }

  drawLine(x0, y0, x1, y1, thickness, r, g, b, a = 255) {
    x0 = Math.round(x0); y0 = Math.round(y0);
    x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let currX = x0;
    let currY = y0;

    while (true) {
      this.fillCircle(currX, currY, thickness / 2, r, g, b, a);
      if (currX === x1 && currY === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; currX += sx; }
      if (e2 < dx) { err += dx; currY += sy; }
    }
  }

  toBuffer() {
    return makePNG(this.width, this.height, this.buffer);
  }
}

// Colors for G&W LCD style:
const LCD_DARK = [18, 22, 20];      // Classic dark LCD black
const LCD_WHITE = [245, 245, 240];  // Crisp white inner highlights

function drawChef(pos) {
  const cvs = new Canvas(128, 128);
  const D = LCD_DARK;
  const W = LCD_WHITE;

  // The 4 G&W Chef Poses:
  // pos 0: Far Left slot (Pan reaches far left, body at x=64, pan at x=20, y=56)
  // pos 1: Mid Left slot (Pan reaches mid left, body at x=64, pan at x=40, y=48)
  // pos 2: Mid Right slot (Pan reaches mid right, body at x=64, pan at x=88, y=48)
  // pos 3: Far Right slot (Pan reaches far right, body at x=64, pan at x=108, y=56)

  let bodyX = 64;
  let bodyY = 56;
  let panX, panY, armBendX, armBendY, facingRight;

  if (pos === 0) {
    panX = 20; panY = 54;
    armBendX = 38; armBendY = 66;
    facingRight = true;
  } else if (pos === 1) {
    panX = 40; panY = 46;
    armBendX = 52; armBendY = 60;
    facingRight = true;
  } else if (pos === 2) {
    panX = 88; panY = 46;
    armBendX = 76; armBendY = 60;
    facingRight = true;
  } else {
    panX = 108; panY = 54;
    armBendX = 90; armBendY = 66;
    facingRight = true;
  }

  // 1. CHEF TOQUE (HAT)
  const hatX = bodyX;
  const hatY = bodyY - 34;
  
  // Puffed hat tops
  cvs.fillCircle(hatX - 10, hatY - 4, 12, ...D);
  cvs.fillCircle(hatX, hatY - 10, 14, ...D);
  cvs.fillCircle(hatX + 10, hatY - 4, 12, ...D);
  // Inner white puff fill
  cvs.fillCircle(hatX - 10, hatY - 4, 9, ...W);
  cvs.fillCircle(hatX, hatY - 10, 11, ...W);
  cvs.fillCircle(hatX + 10, hatY - 4, 9, ...W);
  
  // Fold lines
  cvs.drawLine(hatX - 6, hatY - 18, hatX - 4, hatY - 4, 2, ...D);
  cvs.drawLine(hatX + 4, hatY - 20, hatX + 3, hatY - 4, 2, ...D);

  // Hat Band
  cvs.fillRect(hatX - 14, hatY + 4, 28, 7, ...D);
  cvs.fillRect(hatX - 12, hatY + 5, 24, 5, ...W);

  // 2. HEAD & FACE
  const headX = bodyX;
  const headY = bodyY - 18;

  // Head base outline
  cvs.fillCircle(headX, headY, 13, ...D);
  cvs.fillCircle(headX, headY, 10, ...W);

  // Nose (facing toward pan direction / action)
  const noseDir = (pos < 2) ? -1 : 1;
  const noseX = headX + 14 * noseDir;
  const noseY = headY - 1;
  cvs.fillCircle(noseX, noseY, 6, ...D);
  cvs.fillCircle(noseX, noseY, 4, ...W);

  // Eye (looking up at falling food)
  const eyeX = headX + 6 * noseDir;
  const eyeY = headY - 4;
  cvs.fillCircle(eyeX, eyeY, 4, ...D);
  cvs.fillCircle(eyeX, eyeY, 2, ...W);
  cvs.setPixel(eyeX + noseDir, eyeY - 1, ...D);

  // Mustache / Mouth
  const stacheX = headX + 10 * noseDir;
  const stacheY = headY + 5;
  cvs.fillCircle(stacheX, stacheY, 4, ...D);

  // 3. TORSO & OUTFIT
  const torsoX = bodyX;
  const torsoY = bodyY + 4;

  // Jacket / Apron outline
  cvs.fillRect(torsoX - 12, torsoY - 8, 24, 28, ...D);
  cvs.fillRect(torsoX - 10, torsoY - 6, 20, 24, ...W);

  // Neckerchief tie
  cvs.fillCircle(torsoX, torsoY - 7, 4, ...D);
  cvs.drawLine(torsoX, torsoY - 7, torsoX + 5 * noseDir, torsoY - 1, 2, ...D);

  // Apron tie string behind waist
  cvs.drawLine(torsoX - 8 * noseDir, torsoY + 10, torsoX - 16 * noseDir, torsoY + 14, 2, ...D);

  // Jacket buttons
  cvs.fillCircle(torsoX - 4 * noseDir, torsoY, 2, ...D);
  cvs.fillCircle(torsoX - 4 * noseDir, torsoY + 8, 2, ...D);

  // 4. LEGS & FEET (Action stance)
  const legY = torsoY + 20;
  cvs.drawLine(torsoX - 6, legY, torsoX - 12, legY + 22, 5, ...D);
  cvs.drawLine(torsoX + 6, legY, torsoX + 12, legY + 22, 5, ...D);
  // Shoes
  cvs.fillCircle(torsoX - 14, legY + 23, 6, ...D);
  cvs.fillCircle(torsoX + 14, legY + 23, 6, ...D);

  // 5. ARMS & FRYING PAN
  const shoulderX = torsoX + (panX < bodyX ? -6 : 6);
  const shoulderY = torsoY - 2;

  const handX = panX < bodyX ? panX + 22 : panX - 22;
  const handY = panY + 4;

  cvs.drawLine(shoulderX, shoulderY, armBendX, armBendY, 6, ...D);
  cvs.drawLine(armBendX, armBendY, handX, handY, 6, ...D);
  cvs.fillCircle(handX, handY, 4, ...D);

  // Frying pan handle & bowl
  cvs.drawLine(handX, handY, panX, panY, 4, ...D);

  const panW = 36;
  const panH = 14;
  cvs.fillCircle(panX, panY, panH / 2, ...D);
  cvs.fillRect(panX - panW / 2, panY - panH / 2, panW, panH, ...D);
  cvs.fillRect(panX - panW / 2 + 3, panY - panH / 2 + 2, panW - 6, panH - 5, ...W);
  cvs.fillRect(panX - panW / 2 + 2, panY + panH / 2 - 2, panW - 4, 3, ...D);

  return cvs.toBuffer();
}

function drawSausage() {
  const cvs = new Canvas(64, 48);
  const D = LCD_DARK;
  // Curved sausage shape
  const cx = 32, cy = 24;
  for (let t = -1.2; t <= 1.2; t += 0.05) {
    const x = cx + t * 18;
    const y = cy - Math.cos(t) * 8 + 4;
    cvs.fillCircle(x, y, 7, ...D);
  }
  // Sausage pinched tips
  cvs.fillCircle(cx - 21, cy + 2, 4, ...D);
  cvs.fillCircle(cx + 21, cy + 2, 4, ...D);
  return cvs.toBuffer();
}

function drawFish() {
  const cvs = new Canvas(64, 48);
  const D = LCD_DARK;
  const W = LCD_WHITE;
  const cx = 28, cy = 24;

  // Fish oval body
  cvs.fillCircle(cx, cy, 14, ...D);
  cvs.fillRect(cx - 10, cy - 10, 20, 20, ...D);

  // Fish Tail
  cvs.drawLine(cx + 12, cy, cx + 26, cy - 12, 5, ...D);
  cvs.drawLine(cx + 12, cy, cx + 26, cy + 12, 5, ...D);

  // Dorsal fin
  cvs.drawLine(cx - 4, cy - 10, cx + 2, cy - 18, 4, ...D);
  // Pectoral fin
  cvs.drawLine(cx - 2, cy + 2, cx + 4, cy + 10, 4, ...D);

  // Eye
  cvs.fillCircle(cx - 10, cy - 3, 4, ...W);
  cvs.fillCircle(cx - 10, cy - 3, 2, ...D);

  // Mouth line
  cvs.drawLine(cx - 16, cy + 2, cx - 12, cy + 4, 2, ...D);

  return cvs.toBuffer();
}

function drawEgg() {
  const cvs = new Canvas(64, 48);
  const D = LCD_DARK;
  const W = LCD_WHITE;
  const cx = 32, cy = 24;

  // Fried egg white shape / oval egg
  cvs.fillCircle(cx, cy + 2, 14, ...D);
  cvs.fillCircle(cx - 4, cy - 4, 11, ...D);
  cvs.fillCircle(cx + 4, cy - 4, 11, ...D);

  // Inner white fill
  cvs.fillCircle(cx, cy + 2, 11, ...W);
  cvs.fillCircle(cx - 4, cy - 4, 8, ...W);
  cvs.fillCircle(cx + 4, cy - 4, 8, ...W);

  // Yolk
  cvs.fillCircle(cx, cy - 1, 6, ...D);

  return cvs.toBuffer();
}

function drawCat() {
  const cvs = new Canvas(78, 58);
  const D = LCD_DARK;
  const W = LCD_WHITE;
  const cx = 39, cy = 29;

  // Cat head
  cvs.fillCircle(cx, cy, 18, ...D);
  cvs.fillCircle(cx, cy, 15, ...W);

  // Cat ears
  cvs.drawLine(cx - 14, cy - 10, cx - 20, cy - 24, 4, ...D);
  cvs.drawLine(cx - 20, cy - 24, cx - 6, cy - 16, 4, ...D);

  cvs.drawLine(cx + 14, cy - 10, cx + 20, cy - 24, 4, ...D);
  cvs.drawLine(cx + 20, cy - 24, cx + 6, cy - 16, 4, ...D);

  // Cat eyes
  cvs.fillCircle(cx - 7, cy - 4, 4, ...D);
  cvs.fillCircle(cx + 7, cy - 4, 4, ...D);

  // Whiskers
  cvs.drawLine(cx - 12, cy + 2, cx - 28, cy - 2, 2, ...D);
  cvs.drawLine(cx - 12, cy + 5, cx - 26, cy + 8, 2, ...D);
  cvs.drawLine(cx + 12, cy + 2, cx + 28, cy - 2, 2, ...D);
  cvs.drawLine(cx + 12, cy + 5, cx + 26, cy + 8, 2, ...D);

  // Paw holding hook
  cvs.fillCircle(cx - 20, cy + 18, 8, ...D);
  cvs.fillCircle(cx + 20, cy + 18, 8, ...D);

  return cvs.toBuffer();
}

function drawMouse() {
  const cvs = new Canvas(64, 48);
  const D = LCD_DARK;
  const W = LCD_WHITE;
  const cx = 30, cy = 26;

  // Mouse body & head
  cvs.fillCircle(cx, cy, 12, ...D);
  cvs.fillCircle(cx + 10, cy + 2, 8, ...D);

  // Ears
  cvs.fillCircle(cx - 6, cy - 12, 6, ...D);
  cvs.fillCircle(cx - 6, cy - 12, 4, ...W);

  // Tail
  cvs.drawLine(cx - 12, cy + 4, cx - 26, cy + 14, 3, ...D);

  // Nose & Eye
  cvs.fillCircle(cx + 18, cy + 2, 3, ...D);
  cvs.fillCircle(cx + 6, cy - 2, 2, ...W);

  return cvs.toBuffer();
}

// Ensure img directory exists
const imgDir = path.join(__dirname, 'img');
if (!fs.existsSync(imgDir)) {
  fs.mkdirSync(imgDir, { recursive: true });
}

// Write Chef images
for (let i = 0; i < 4; i++) {
  const buf = drawChef(i);
  const filePath = path.join(imgDir, `chef_${i}.png`);
  fs.writeFileSync(filePath, buf);
  console.log(`Generated ${filePath} (${buf.length} bytes)`);
}

// Write Item images
const items = {
  sausage: drawSausage(),
  fish: drawFish(),
  egg: drawEgg(),
  cat: drawCat(),
  mouse: drawMouse()
};

for (const [name, buf] of Object.entries(items)) {
  const filePath = path.join(imgDir, `${name}.png`);
  fs.writeFileSync(filePath, buf);
  console.log(`Generated ${filePath} (${buf.length} bytes)`);
}
