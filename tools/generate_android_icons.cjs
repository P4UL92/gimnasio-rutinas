const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const root = path.resolve(__dirname, '..');

// CRC32 Table for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(typeStr, dataBuf) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(dataBuf.length, 0);
  const typeBuf = Buffer.from(typeStr, 'ascii');
  const crcInput = Buffer.concat([typeBuf, dataBuf]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, dataBuf, crcBuf]);
}

function encodeRGBAtoPNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Prepare scanlines with filter byte 0 (None)
  const stride = width * 4;
  const rawScanlines = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    rawScanlines[rowStart] = 0;
    rgbaBuffer.copy(rawScanlines, rowStart + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(rawScanlines, { level: 9 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// Render Tactical Gym Rutinas Pro Emblem (Dumbbell + Pulley Cable + Emerald Shield)
function renderGymIconRGBA(width, height, options = {}) {
  const { roundMask = false, transparentBg = false } = options;
  const buf = Buffer.alloc(width * height * 4);
  const cx = width / 2;
  const cy = height / 2;
  const minDim = Math.min(width, height);
  const rMax = minDim / 2;

  for (let y = 0; y < height; y++) {
    const ny = (y - cy) / rMax; // -1 to 1
    for (let x = 0; x < width; x++) {
      const nx = (x - cx) / rMax; // -1 to 1
      const dist = Math.hypot(nx, ny);
      const idx = (y * width + x) * 4;

      if (roundMask && dist > 0.98) {
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
        continue;
      }

      // Base background (#070b14 -> #0f172a radial tactical glow)
      let r = 7;
      let g = 11;
      let b = 20;
      let a = transparentBg ? 0 : 255;

      if (!transparentBg) {
        const glow = Math.max(0, 1 - dist * 0.95);
        r = Math.round(7 + glow * 12);
        g = Math.round(11 + glow * 28);
        b = Math.round(20 + glow * 38);
      }

      // Outer Tactical Hexagonal/Shield Ring (dist between 0.72 and 0.80)
      if (dist >= 0.70 && dist <= 0.80) {
        const ringAlpha = 1 - Math.abs(dist - 0.75) / 0.05;
        r = Math.round(r * (1 - ringAlpha) + 16 * ringAlpha);
        g = Math.round(g * (1 - ringAlpha) + 185 * ringAlpha);
        b = Math.round(b * (1 - ringAlpha) + 129 * ringAlpha);
        a = 255;
      }

      // Vertical Pulley Cable Line (amber #f59e0b)
      if (Math.abs(nx) <= 0.032 && ny >= -0.68 && ny <= 0.0) {
        r = 245;
        g = 158;
        b = 11;
        a = 255;
      }

      // Pulley Wheel at top (ny around -0.58)
      const wheelDist = Math.hypot(nx, ny + 0.54);
      if (wheelDist <= 0.12) {
        if (wheelDist >= 0.05) {
          r = 6;
          g = 182;
          b = 212; // Cyan pulley wheel
        } else {
          r = 245;
          g = 158;
          b = 11; // Amber axle
        }
        a = 255;
      }

      // Horizontal Olympic Barbell / Dumbbell Shaft (ny around 0.06)
      if (Math.abs(ny - 0.08) <= 0.055 && Math.abs(nx) <= 0.56) {
        r = 226;
        g = 232;
        b = 240;
        a = 255;
      }

      // Inner Olympic Plates (Emerald #10b981)
      const inLeftInnerPlate = nx >= -0.42 && nx <= -0.28 && Math.abs(ny - 0.08) <= 0.30;
      const inRightInnerPlate = nx >= 0.28 && nx <= 0.42 && Math.abs(ny - 0.08) <= 0.30;
      if (inLeftInnerPlate || inRightInnerPlate) {
        r = 16;
        g = 185;
        b = 129;
        a = 255;
      }

      // Outer Olympic Plates (Cyan #06b6d4)
      const inLeftOuterPlate = nx >= -0.56 && nx <= -0.45 && Math.abs(ny - 0.08) <= 0.22;
      const inRightOuterPlate = nx >= 0.45 && nx <= 0.56 && Math.abs(ny - 0.08) <= 0.22;
      if (inLeftOuterPlate || inRightOuterPlate) {
        r = 6;
        g = 182;
        b = 212;
        a = 255;
      }

      // Bottom Power Chevron / V-Taper Back Accent (ny between 0.35 and 0.58)
      const vLine = Math.abs(ny - (0.58 - Math.abs(nx) * 0.55));
      if (Math.abs(nx) <= 0.36 && vLine <= 0.04) {
        r = 245;
        g = 158;
        b = 11;
        a = 255;
      }

      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = a;
    }
  }

  return buf;
}

function writePngFile(relPath, width, height, options = {}) {
  const fullPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  const rgba = renderGymIconRGBA(width, height, options);
  const png = encodeRGBAtoPNG(width, height, rgba);
  fs.writeFileSync(fullPath, png);
}

// 1. Web & PWA Icons (100% PNG)
writePngFile('assets/icons/icon-192.png', 192, 192);
writePngFile('assets/icons/icon-512.png', 512, 512);

// 2. Android Native Mipmap Icons across all 5 densities
const mipmaps = [
  { folder: 'mipmap-mdpi', launcher: 48, fg: 108 },
  { folder: 'mipmap-hdpi', launcher: 72, fg: 162 },
  { folder: 'mipmap-xhdpi', launcher: 96, fg: 216 },
  { folder: 'mipmap-xxhdpi', launcher: 144, fg: 324 },
  { folder: 'mipmap-xxxhdpi', launcher: 192, fg: 432 }
];

for (const m of mipmaps) {
  const baseDir = `android/app/src/main/res/${m.folder}`;
  if (fs.existsSync(path.join(root, 'android/app/src/main/res'))) {
    writePngFile(`${baseDir}/ic_launcher.png`, m.launcher, m.launcher, { roundMask: false });
    writePngFile(`${baseDir}/ic_launcher_round.png`, m.launcher, m.launcher, { roundMask: true });
    writePngFile(`${baseDir}/ic_launcher_foreground.png`, m.fg, m.fg, { transparentBg: true });
  }
}

// 3. Tactical Android Splash Screen
if (fs.existsSync(path.join(root, 'android/app/src/main/res/drawable'))) {
  writePngFile('android/app/src/main/res/drawable/splash.png', 480, 800, { roundMask: false });
}

console.log('Iconos PNG web (192/512) y mipmaps nativos Android generados con éxito.');
