const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height, drawFn) {
  const buffer = Buffer.alloc(width * height * 4, 0);

  function setPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
    const srcA = a / 255;
    const dstA = buffer[idx + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA <= 0) return;
    buffer[idx] = Math.round((r * srcA + buffer[idx] * dstA * (1 - srcA)) / outA);
    buffer[idx + 1] = Math.round((g * srcA + buffer[idx + 1] * dstA * (1 - srcA)) / outA);
    buffer[idx + 2] = Math.round((b * srcA + buffer[idx + 2] * dstA * (1 - srcA)) / outA);
    buffer[idx + 3] = Math.round(outA * 255);
  }

  const ctx = {
    width,
    height,
    fillRect(x, y, w, h, [r, g, b, a = 255]) {
      for (let py = Math.max(0, Math.floor(y)); py < Math.min(height, Math.ceil(y + h)); py++) {
        for (let px = Math.max(0, Math.floor(x)); px < Math.min(width, Math.ceil(x + w)); px++) {
          setPixel(px, py, r, g, b, a);
        }
      }
    },
    fillRoundedRect(x, y, w, h, rad, color) {
      for (let py = Math.max(0, Math.floor(y)); py < Math.min(height, Math.ceil(y + h)); py++) {
        for (let px = Math.max(0, Math.floor(x)); px < Math.min(width, Math.ceil(x + w)); px++) {
          let inside = true;
          if (px < x + rad && py < y + rad) {
            inside = Math.hypot(px - (x + rad), py - (y + rad)) <= rad;
          } else if (px > x + w - rad && py < y + rad) {
            inside = Math.hypot(px - (x + w - rad), py - (y + rad)) <= rad;
          } else if (px < x + rad && py > y + h - rad) {
            inside = Math.hypot(px - (x + rad), py - (y + h - rad)) <= rad;
          } else if (px > x + w - rad && py > y + h - rad) {
            inside = Math.hypot(px - (x + w - rad), py - (y + h - rad)) <= rad;
          }
          if (inside) setPixel(px, py, color[0], color[1], color[2], color[3] || 255);
        }
      }
    },
    fillCircle(cx, cy, radius, [r, g, b, a = 255]) {
      const minX = Math.max(0, Math.floor(cx - radius - 1));
      const maxX = Math.min(width - 1, Math.ceil(cx + radius + 1));
      const minY = Math.max(0, Math.floor(cy - radius - 1));
      const maxY = Math.min(height - 1, Math.ceil(cy + radius + 1));
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const dist = Math.hypot(x - cx, y - cy);
          if (dist <= radius) {
            setPixel(x, y, r, g, b, a);
          } else if (dist < radius + 1) {
            const edgeA = Math.round(a * (1 - (dist - radius)));
            setPixel(x, y, r, g, b, edgeA);
          }
        }
      }
    },
    strokeCircle(cx, cy, radius, thickness, [r, g, b, a = 255]) {
      const half = thickness / 2;
      const minX = Math.max(0, Math.floor(cx - radius - half - 1));
      const maxX = Math.min(width - 1, Math.ceil(cx + radius + half + 1));
      const minY = Math.max(0, Math.floor(cy - radius - half - 1));
      const maxY = Math.min(height - 1, Math.ceil(cy + radius + half + 1));
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const dist = Math.abs(Math.hypot(x - cx, y - cy) - radius);
          if (dist <= half) {
            setPixel(x, y, r, g, b, a);
          } else if (dist < half + 1) {
            const edgeA = Math.round(a * (1 - (dist - half)));
            setPixel(x, y, r, g, b, edgeA);
          }
        }
      }
    },
    strokeLine(x1, y1, x2, y2, thickness, [r, g, b, a = 255]) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len === 0) return;
      const steps = Math.ceil(len * 2);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const curX = x1 + dx * t;
        const curY = y1 + dy * t;
        this.fillCircle(curX, curY, thickness / 2, [r, g, b, a]);
      }
    }
  };

  drawFn(ctx);

  // Construir PNG chunks
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8 bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const rawScanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    rawScanlines[rowOffset] = 0; // Filter None
    buffer.copy(rawScanlines, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressedData = zlib.deflateSync(rawScanlines, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, makeChunk('IHDR', ihdr), idatChunk, iendChunk]);
}

const crcTable = [];
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

// Dibujar icono de Opciones Extras en estilo 9-bits suave
const size = 256;
const pngBuf = createPng(size, size, (ctx) => {
  // Fondo oscuro con viñeta redondeada de gimnasio
  ctx.fillRoundedRect(8, 8, 240, 240, 36, [15, 23, 42, 255]);
  ctx.fillRoundedRect(12, 12, 232, 232, 32, [24, 32, 54, 255]);

  // Resplandor ambiental cian y ámbar en esquinas
  for (let r = 80; r > 10; r -= 10) {
    const a = Math.round(15 * (1 - r / 80));
    ctx.fillCircle(190, 60, r, [245, 158, 11, a]);
    ctx.fillCircle(65, 190, r, [6, 182, 212, a]);
  }

  // 1. DISCO OLÍMPICO DE FONDO (Lado izquierdo / centro)
  const plateCx = 110;
  const plateCy = 140;
  // Borde exterior del disco
  ctx.fillCircle(plateCx, plateCy, 75, [30, 41, 59, 255]);
  ctx.strokeCircle(plateCx, plateCy, 74, 5, [245, 158, 11, 230]); // Aro dorado
  ctx.strokeCircle(plateCx, plateCy, 68, 3, [71, 85, 105, 255]);
  // Rebaje interior del disco
  ctx.fillCircle(plateCx, plateCy, 62, [15, 23, 42, 255]);

  // Asas / aberturas ergonómicas del disco olímpico (3 cortes)
  for (let i = 0; i < 3; i++) {
    const angle = (i * 2 * Math.PI) / 3 - Math.PI / 6;
    const ax = plateCx + Math.cos(angle) * 44;
    const ay = plateCy + Math.sin(angle) * 44;
    ctx.fillCircle(ax, ay, 12, [30, 41, 59, 255]);
    ctx.strokeCircle(ax, ay, 12, 2, [148, 163, 184, 180]);
  }

  // Anillo cromado central del orificio de barra
  ctx.fillCircle(plateCx, plateCy, 24, [148, 163, 184, 255]);
  ctx.fillCircle(plateCx, plateCy, 20, [226, 232, 240, 255]);
  ctx.fillCircle(plateCx, plateCy, 12, [15, 23, 42, 255]); // Hueco de barra

  // 2. ENGRANAJE DE PRECISIÓN Y AJUSTE TÉCNICO (Superpuesto en esquina superior derecha)
  const gearCx = 172;
  const gearCy = 85;
  const gearRadius = 42;
  // Dientes del engranaje (8 dientes)
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const toothX = gearCx + Math.cos(angle) * 44;
    const toothY = gearCy + Math.sin(angle) * 44;
    ctx.fillCircle(toothX, toothY, 9, [6, 182, 212, 240]);
  }
  // Cuerpo del engranaje
  ctx.fillCircle(gearCx, gearCy, gearRadius, [14, 116, 144, 255]);
  ctx.strokeCircle(gearCx, gearCy, gearRadius, 3, [34, 211, 238, 255]);
  ctx.fillCircle(gearCx, gearCy, 22, [15, 23, 42, 255]);
  ctx.strokeCircle(gearCx, gearCy, 22, 2, [34, 211, 238, 200]);
  ctx.fillCircle(gearCx, gearCy, 8, [245, 158, 11, 255]);

  // 3. SHAKER / BOTELLÍN DEPORTIVO DE HIDRATACIÓN (En primer plano diagonal)
  // Tapa del shaker con rosca y boquilla
  ctx.fillRoundedRect(165, 145, 34, 16, 5, [245, 158, 11, 255]);
  ctx.fillRoundedRect(172, 133, 12, 14, 4, [251, 191, 36, 255]); // Boquilla
  ctx.fillRoundedRect(188, 137, 8, 8, 2, [217, 119, 6, 255]); // Asa pequeña

  // Cuerpo translúcido del shaker con líquido isotónico
  ctx.fillRoundedRect(168, 161, 28, 64, 6, [8, 145, 178, 240]);
  ctx.fillRoundedRect(171, 164, 22, 58, 4, [6, 182, 212, 200]); // Brillo interior

  // Medidor de ml y rejilla mezcladora
  ctx.fillRect(174, 175, 8, 2, [255, 255, 255, 220]);
  ctx.fillRect(174, 185, 12, 2, [255, 255, 255, 220]);
  ctx.fillRect(174, 195, 8, 2, [255, 255, 255, 220]);
  ctx.fillRect(174, 205, 14, 2, [255, 255, 255, 220]);

  // 4. CHISPAS Y DESTELLOS DE ENERGÍA DECORATIVOS (Estilo 9-bits)
  ctx.fillCircle(75, 65, 3, [251, 191, 36, 255]);
  ctx.fillCircle(75, 65, 6, [251, 191, 36, 120]);
  ctx.fillCircle(205, 120, 3, [34, 211, 238, 255]);
  ctx.fillCircle(205, 120, 7, [34, 211, 238, 100]);
  ctx.fillCircle(125, 225, 2.5, [251, 191, 36, 255]);

  // Borde externo estilizado
  ctx.strokeCircle(128, 128, 116, 2.5, [56, 189, 248, 180]);
});

const outPath = path.join(__dirname, '..', 'assets', 'icons', 'menu_icon_extras.png');
fs.writeFileSync(outPath, pngBuf);
console.log('Icono menu_icon_extras.png creado exitosamente en:', outPath, `(${pngBuf.length} bytes)`);
