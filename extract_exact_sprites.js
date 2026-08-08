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

  const bpp = 4; // RGBA
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
console.log('Decoded PNG successfully:', imgData.width, 'x', imgData.height);

// Define bounding boxes for the 4 Chef sprites in the top-left section of the reference sheet
// Row 1 of LCD Sprites in the G&W reference sheet:
// Pose 0 (Far Left): x: 24..112, y: 170..270
// Pose 1 (Mid Left): x: 114..196, y: 170..270
// Pose 2 (Mid Right): x: 198..282, y: 170..270
// Pose 3 (Far Right): x: 284..370, y: 170..270

const boxes = [
  { x: 24, y: 170, w: 90, h: 100 },
  { x: 114, y: 170, w: 84, h: 100 },
  { x: 198, y: 170, w: 86, h: 100 },
  { x: 284, y: 170, w: 88, h: 100 }
];

const imgDir = path.join(__dirname, 'img');
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

boxes.forEach((box, i) => {
  const cropBuf = Buffer.alloc(box.w * box.h * 4);

  for (let cy = 0; cy < box.h; cy++) {
    for (let cx = 0; cx < box.w; cx++) {
      const srcX = box.x + cx;
      const srcY = box.y + cy;
      const srcIdx = (srcY * imgData.width + srcX) * 4;
      const dstIdx = (cy * box.w + cx) * 4;

      const r = imgData.data[srcIdx];
      const g = imgData.data[srcIdx + 1];
      const b = imgData.data[srcIdx + 2];
      const a = imgData.data[srcIdx + 3];

      // Remove background cream / beige color (R > 180, G > 170, B > 150)
      if (r > 170 && g > 160 && b > 140) {
        cropBuf[dstIdx + 3] = 0; // transparent
      } else {
        // Boost contrast for black LCD pixels
        cropBuf[dstIdx] = r < 80 ? 20 : r;
        cropBuf[dstIdx + 1] = g < 80 ? 24 : g;
        cropBuf[dstIdx + 2] = b < 80 ? 22 : b;
        cropBuf[dstIdx + 3] = 255;
      }
    }
  }

  const pngData = makePNG(box.w, box.h, cropBuf);
  const outPath = path.join(imgDir, `chef_${i}.png`);
  fs.writeFileSync(outPath, pngData);
  console.log(`Saved exact extracted sprite chef_${i}.png (${pngData.length} bytes)`);
});

// Also extract Sausage, Fish, Egg, Cat, Mouse from the sheet if present!
// Sausage: x: 420..500, y: 170..210
// Fish: x: 505..590, y: 170..220
// Egg: x: 440..500, y: 340..390
const itemBoxes = {
  sausage: { x: 420, y: 170, w: 80, h: 45 },
  fish: { x: 505, y: 170, w: 85, h: 50 },
  egg: { x: 440, y: 340, w: 60, h: 50 },
  mouse: { x: 630, y: 340, w: 50, h: 50 }
};

for (const [name, box] of Object.entries(itemBoxes)) {
  const cropBuf = Buffer.alloc(box.w * box.h * 4);
  for (let cy = 0; cy < box.h; cy++) {
    for (let cx = 0; cx < box.w; cx++) {
      const srcX = box.x + cx;
      const srcY = box.y + cy;
      const srcIdx = (srcY * imgData.width + srcX) * 4;
      const dstIdx = (cy * box.w + cx) * 4;

      const r = imgData.data[srcIdx];
      const g = imgData.data[srcIdx + 1];
      const b = imgData.data[srcIdx + 2];

      if (r > 170 && g > 160 && b > 140) {
        cropBuf[dstIdx + 3] = 0;
      } else {
        cropBuf[dstIdx] = r < 80 ? 20 : r;
        cropBuf[dstIdx + 1] = g < 80 ? 24 : g;
        cropBuf[dstIdx + 2] = b < 80 ? 22 : b;
        cropBuf[dstIdx + 3] = 255;
      }
    }
  }
  const pngData = makePNG(box.w, box.h, cropBuf);
  const outPath = path.join(imgDir, `${name}.png`);
  fs.writeFileSync(outPath, pngData);
  console.log(`Saved exact item sprite ${name}.png (${pngData.length} bytes)`);
}
