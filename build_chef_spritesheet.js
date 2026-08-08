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
  ihdr[8] = 8;
  ihdr[9] = 6;
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

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePNG(buffer) {
  let offset = 8;
  let width, height;
  const idats = [];

  while (offset < buffer.length) {
    const len = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + len);
    offset += 12 + len;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
    } else if (type === 'IDAT') {
      idats.push(data);
    }
  }

  const compressed = Buffer.concat(idats);
  const decompressed = zlib.inflateSync(compressed);

  const bpp = 4;
  const stride = width * bpp;
  const rawRGBA = Buffer.alloc(width * height * 4);

  let srcIdx = 0;
  for (let y = 0; y < height; y++) {
    const filter = decompressed[srcIdx++];
    const lineStart = y * stride;

    for (let x = 0; x < stride; x++) {
      const currByte = decompressed[srcIdx++];
      const left = x >= bpp ? rawRGBA[lineStart + x - bpp] : 0;
      const up = y > 0 ? rawRGBA[(y - 1) * stride + x] : 0;
      const upLeft = (y > 0 && x >= bpp) ? rawRGBA[(y - 1) * stride + x - bpp] : 0;

      let val = 0;
      if (filter === 0) val = currByte;
      else if (filter === 1) val = (currByte + left) & 0xff;
      else if (filter === 2) val = (currByte + up) & 0xff;
      else if (filter === 3) val = (currByte + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) val = (currByte + paethPredictor(left, up, upLeft)) & 0xff;

      rawRGBA[lineStart + x] = val;
    }
  }

  return { width, height, data: rawRGBA };
}

const spriteSheetPath = 'C:\\Users\\Ehsan\\.gemini\\antigravity\\brain\\f7cf41db-f7ce-482a-a1be-6d5331b4448f\\media__1786185200572.png';
const imgData = decodePNG(fs.readFileSync(spriteSheetPath));

// 4 Chef frames: each frame is 90px wide x 100px high
const frameW = 90;
const frameH = 100;
const sheetW = frameW * 4; // 360px wide
const sheetH = frameH;     // 100px high

const boxes = [
  { x: 24, y: 170 },
  { x: 114, y: 170 },
  { x: 198, y: 170 },
  { x: 284, y: 170 }
];

const sheetBuffer = Buffer.alloc(sheetW * sheetH * 4);

boxes.forEach((box, frameIdx) => {
  const destOffsetX = frameIdx * frameW;

  for (let cy = 0; cy < frameH; cy++) {
    for (let cx = 0; cx < frameW; cx++) {
      const srcX = box.x + cx;
      const srcY = box.y + cy;
      const srcIdx = (srcY * imgData.width + srcX) * 4;

      const dstX = destOffsetX + cx;
      const dstY = cy;
      const dstIdx = (dstY * sheetW + dstX) * 4;

      const r = imgData.data[srcIdx];
      const g = imgData.data[srcIdx + 1];
      const b = imgData.data[srcIdx + 2];

      if (r > 170 && g > 160 && b > 140) {
        sheetBuffer[dstIdx + 3] = 0; // transparent background
      } else {
        sheetBuffer[dstIdx] = r < 80 ? 20 : r;
        sheetBuffer[dstIdx + 1] = g < 80 ? 24 : g;
        sheetBuffer[dstIdx + 2] = b < 80 ? 22 : b;
        sheetBuffer[dstIdx + 3] = 255;
      }
    }
  }
});

const pngData = makePNG(sheetW, sheetH, sheetBuffer);
const outPath = path.join(__dirname, 'img', 'chef_spritesheet.png');
fs.writeFileSync(outPath, pngData);
console.log(`Successfully generated single chef spritesheet: ${outPath} (${pngData.length} bytes, ${sheetW}x${sheetH}px)`);

// Clean up individual chef_0..3 png files if present
for (let i = 0; i < 4; i++) {
  const p = path.join(__dirname, 'img', `chef_${i}.png`);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
