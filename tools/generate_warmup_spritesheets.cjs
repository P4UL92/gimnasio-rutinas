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
      for (let py = Math.max(0, y); py < Math.min(height, y + h); py++) {
        for (let px = Math.max(0, x); px < Math.min(width, x + w); px++) {
          setPixel(px, py, r, g, b, a);
        }
      }
    },
    fillRoundedRect(x, y, w, h, rad, color) {
      for (let py = Math.max(0, y); py < Math.min(height, y + h); py++) {
        for (let px = Math.max(0, x); px < Math.min(width, x + w); px++) {
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
      const outer = radius + thickness / 2;
      const inner = radius - thickness / 2;
      const minX = Math.max(0, Math.floor(cx - outer - 1));
      const maxX = Math.min(width - 1, Math.ceil(cx + outer + 1));
      const minY = Math.max(0, Math.floor(cy - outer - 1));
      const maxY = Math.min(height - 1, Math.ceil(cy + outer + 1));

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const dist = Math.hypot(x - cx, y - cy);
          if (dist >= inner && dist <= outer) {
            setPixel(x, y, r, g, b, a);
          } else if (dist >= inner - 1 && dist < inner) {
            const edgeA = Math.round(a * (dist - (inner - 1)));
            setPixel(x, y, r, g, b, edgeA);
          } else if (dist > outer && dist < outer + 1) {
            const edgeA = Math.round(a * (1 - (dist - outer)));
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
    },
    fillPolygon(points, [r, g, b, a = 255]) {
      let minX = width, maxX = 0, minY = height, maxY = 0;
      for (const p of points) {
        minX = Math.min(minX, Math.floor(p[0]));
        maxX = Math.max(maxX, Math.ceil(p[0]));
        minY = Math.min(minY, Math.floor(p[1]));
        maxY = Math.max(maxY, Math.ceil(p[1]));
      }
      minX = Math.max(0, minX);
      maxX = Math.min(width - 1, maxX);
      minY = Math.max(0, minY);
      maxY = Math.min(height - 1, maxY);

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          let inside = false;
          for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i][0], yi = points[i][1];
            const xj = points[j][0], yj = points[j][1];
            const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
          }
          if (inside) setPixel(x, y, r, g, b, a);
        }
      }
    }
  };

  drawFn(ctx);

  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = rowOffset + 1 + x * 4;
      rawData[dstIdx] = buffer[srcIdx];
      rawData[dstIdx + 1] = buffer[srcIdx + 1];
      rawData[dstIdx + 2] = buffer[srcIdx + 2];
      rawData[dstIdx + 3] = buffer[srcIdx + 3];
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(8 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crcVal = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crcVal, 8 + len);
    return buf;
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const chunkIHDR = makeChunk('IHDR', ihdr);
  const chunkIDAT = makeChunk('IDAT', compressed);
  const chunkIEND = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, chunkIHDR, chunkIDAT, chunkIEND]);
}

// Colores del Gym
const C_BLACK = [10, 15, 24, 255];
const C_DARK_SLATE = [24, 32, 47, 255];
const C_STEEL = [64, 80, 102, 255];
const C_SILVER = [148, 163, 184, 255];
const C_CHROME = [226, 232, 240, 255];
const C_ACCENT_ORANGE = [255, 107, 53, 255];
const C_ACCENT_AMBER = [245, 158, 11, 255];
const C_ACCENT_HOT = [239, 68, 68, 255];
const C_ACCENT_GREEN = [16, 185, 129, 255];

function drawFrameDecorations(ctx, ox, phase, label) {
  // Fondo de celda
  ctx.fillRoundedRect(ox + 4, 4, 120, 120, 8, [15, 23, 42, 245]);
  ctx.fillCircle(ox + 64, 64, 52, [255, 107, 53, phase === 3 ? 35 : (phase === 2 ? 22 : 12)]);

  // Indicador de Fase en la esquina
  const badgeColor = phase === 3 ? C_ACCENT_ORANGE : (phase === 2 ? C_ACCENT_AMBER : C_STEEL);
  ctx.fillRoundedRect(ox + 8, 8, 38, 14, 3, [10, 15, 24, 220]);
  ctx.fillRect(ox + 8, 8, 3, 14, badgeColor);
  
  // Pequeños puntos indicadores 1, 2, 3
  for (let d = 1; d <= 3; d++) {
    const isCur = (d === phase);
    ctx.fillCircle(ox + 52 + d * 6, 118, isCur ? 3 : 2, isCur ? C_ACCENT_ORANGE : C_STEEL);
  }
}

const WARMUP_ANIMATIONS = {
  // 1. SCAPULAR (Rotaciones Escapulares)
  'warmup-scapular': (ctx) => {
    // Fase 1: Inicio (Protracción Neutra)
    {
      const ox = 0;
      drawFrameDecorations(ctx, ox, 1, 'INICIO');
      ctx.fillCircle(ox + 64, 28, 10, C_BLACK);
      ctx.fillCircle(ox + 64, 28, 7, C_SILVER);
      ctx.fillRect(ox + 61, 38, 6, 8, C_STEEL);
      ctx.fillPolygon([[ox + 40, 44], [ox + 88, 44], [ox + 80, 96], [ox + 48, 96]], C_DARK_SLATE);
      ctx.strokeLine(ox + 64, 44, ox + 64, 96, 2, C_CHROME);
      // Escápulas abiertas hacia afuera
      ctx.fillPolygon([[ox + 38, 52], [ox + 50, 52], [ox + 44, 76]], C_STEEL);
      ctx.fillPolygon([[ox + 90, 52], [ox + 78, 52], [ox + 84, 76]], C_STEEL);
      ctx.strokeCircle(ox + 44, 64, 14, 2, C_STEEL);
      ctx.strokeCircle(ox + 84, 64, 14, 2, C_STEEL);
    }
    // Fase 2: Recorrido (Elevación Torácica)
    {
      const ox = 128;
      drawFrameDecorations(ctx, ox, 2, 'MOVIMIENTO');
      ctx.fillCircle(ox + 64, 26, 10, C_BLACK);
      ctx.fillCircle(ox + 64, 26, 7, C_SILVER);
      ctx.fillRect(ox + 61, 36, 6, 8, C_STEEL);
      ctx.fillPolygon([[ox + 40, 42], [ox + 88, 42], [ox + 80, 94], [ox + 48, 94]], C_DARK_SLATE);
      ctx.strokeLine(ox + 64, 42, ox + 64, 94, 2, C_CHROME);
      // Escápulas elevadas rotando hacia adentro
      ctx.fillPolygon([[ox + 44, 46], [ox + 58, 48], [ox + 50, 72]], C_ACCENT_AMBER);
      ctx.fillPolygon([[ox + 84, 46], [ox + 70, 48], [ox + 78, 72]], C_ACCENT_AMBER);
      ctx.strokeCircle(ox + 48, 58, 16, 2, C_ACCENT_AMBER);
      ctx.strokeCircle(ox + 80, 58, 16, 2, C_ACCENT_AMBER);
    }
    // Fase 3: Activación (Retracción Máxima)
    {
      const ox = 256;
      drawFrameDecorations(ctx, ox, 3, 'ACTIVACIÓN');
      ctx.fillCircle(ox + 64, 26, 10, C_BLACK);
      ctx.fillCircle(ox + 64, 26, 7, C_CHROME);
      ctx.fillRect(ox + 61, 36, 6, 8, C_STEEL);
      ctx.fillPolygon([[ox + 40, 42], [ox + 88, 42], [ox + 80, 94], [ox + 48, 94]], C_DARK_SLATE);
      ctx.strokeLine(ox + 64, 42, ox + 64, 94, 3, C_CHROME);
      // Escápulas completamente juntas y apretadas
      ctx.fillPolygon([[ox + 48, 48], [ox + 62, 50], [ox + 56, 74]], C_ACCENT_ORANGE);
      ctx.fillPolygon([[ox + 80, 48], [ox + 66, 50], [ox + 72, 74]], C_ACCENT_ORANGE);
      ctx.strokeCircle(ox + 52, 60, 18, 3, C_ACCENT_ORANGE);
      ctx.strokeCircle(ox + 76, 60, 18, 3, C_ACCENT_ORANGE);
      ctx.fillPolygon([[ox + 64, 44], [ox + 72, 52], [ox + 56, 52]], C_CHROME);
    }
  },

  // 2. DISLOCATE (Dislocaciones de Hombro con Banda / Bastón)
  'warmup-dislocate': (ctx) => {
    // Fase 1: Bastón al frente (Cintura)
    {
      const ox = 0;
      drawFrameDecorations(ctx, ox, 1, 'INICIO');
      ctx.fillCircle(ox + 64, 42, 9, C_SILVER);
      ctx.fillRect(ox + 54, 52, 20, 36, C_DARK_SLATE);
      ctx.strokeLine(ox + 58, 88, ox + 54, 114, 4, C_STEEL);
      ctx.strokeLine(ox + 70, 88, ox + 74, 114, 4, C_STEEL);
      // Brazos hacia abajo al frente
      ctx.strokeLine(ox + 48, 54, ox + 36, 80, 4, C_SILVER);
      ctx.strokeLine(ox + 80, 54, ox + 92, 80, 4, C_SILVER);
      // Bastón horizontal abajo
      ctx.strokeLine(ox + 24, 80, ox + 104, 80, 4, C_CHROME);
    }
    // Fase 2: Bastón Overhead (90° sobre cabeza)
    {
      const ox = 128;
      drawFrameDecorations(ctx, ox, 2, 'MOVIMIENTO');
      ctx.fillCircle(ox + 64, 42, 9, C_SILVER);
      ctx.fillRect(ox + 54, 52, 20, 36, C_DARK_SLATE);
      ctx.strokeLine(ox + 58, 88, ox + 54, 114, 4, C_STEEL);
      ctx.strokeLine(ox + 70, 88, ox + 74, 114, 4, C_STEEL);
      // Brazos extendidos arriba en V
      ctx.strokeLine(ox + 48, 54, ox + 28, 26, 4, C_ACCENT_AMBER);
      ctx.strokeLine(ox + 80, 54, ox + 100, 26, 4, C_ACCENT_AMBER);
      // Bastón horizontal sobre cabeza
      ctx.strokeLine(ox + 16, 26, ox + 112, 26, 4, C_CHROME);
      ctx.strokeCircle(ox + 64, 64, 42, 2, C_ACCENT_AMBER);
    }
    // Fase 3: Bastón detrás de la espalda (Retracción completa)
    {
      const ox = 256;
      drawFrameDecorations(ctx, ox, 3, 'ACTIVACIÓN');
      ctx.fillCircle(ox + 64, 42, 9, C_CHROME);
      ctx.fillRect(ox + 54, 52, 20, 36, C_DARK_SLATE);
      ctx.strokeLine(ox + 58, 88, ox + 54, 114, 4, C_STEEL);
      ctx.strokeLine(ox + 70, 88, ox + 74, 114, 4, C_STEEL);
      // Hombros en máxima apertura
      ctx.fillCircle(ox + 48, 54, 7, C_ACCENT_ORANGE);
      ctx.fillCircle(ox + 80, 54, 7, C_ACCENT_ORANGE);
      // Brazos extendidos hacia atrás
      ctx.strokeLine(ox + 48, 54, ox + 32, 76, 4, C_ACCENT_ORANGE);
      ctx.strokeLine(ox + 80, 54, ox + 96, 76, 4, C_ACCENT_ORANGE);
      // Bastón horizontal detrás
      ctx.strokeLine(ox + 18, 76, ox + 110, 76, 4, C_CHROME);
      ctx.strokeCircle(ox + 64, 64, 46, 3, C_ACCENT_ORANGE);
    }
  },

  // 3. ROTATOR (Rotación Externa de Manguito Rotador)
  'warmup-rotator': (ctx) => {
    // Fase 1: Posición neutra al frente
    {
      const ox = 0;
      drawFrameDecorations(ctx, ox, 1, 'INICIO');
      ctx.fillCircle(ox + 46, 26, 8, C_SILVER);
      ctx.fillRoundedRect(ox + 34, 38, 22, 60, 6, C_DARK_SLATE);
      ctx.fillRect(ox + 52, 46, 8, 34, C_STEEL);
      ctx.fillCircle(ox + 56, 80, 6, C_CHROME);
      // Antebrazo apuntando hacia el frente / ombligo
      ctx.strokeLine(ox + 56, 80, ox + 68, 72, 6, C_SILVER);
      ctx.fillCircle(ox + 68, 72, 5, C_CHROME);
    }
    // Fase 2: Rotación a 45°
    {
      const ox = 128;
      drawFrameDecorations(ctx, ox, 2, 'MOVIMIENTO');
      ctx.fillCircle(ox + 46, 26, 8, C_SILVER);
      ctx.fillRoundedRect(ox + 34, 38, 22, 60, 6, C_DARK_SLATE);
      ctx.fillRect(ox + 52, 46, 8, 34, C_STEEL);
      ctx.fillCircle(ox + 56, 80, 6, C_CHROME);
      // Manguito activándose
      ctx.fillCircle(ox + 42, 50, 8, C_ACCENT_AMBER);
      // Antebrazo abriendo a 45°
      ctx.strokeLine(ox + 56, 80, ox + 88, 74, 6, C_ACCENT_AMBER);
      ctx.fillCircle(ox + 88, 74, 5, C_CHROME);
      ctx.strokeLine(ox + 88, 74, ox + 118, 74, 3, C_ACCENT_ORANGE);
    }
    // Fase 3: Rotación externa completa a 90°
    {
      const ox = 256;
      drawFrameDecorations(ctx, ox, 3, 'ACTIVACIÓN');
      ctx.fillCircle(ox + 46, 26, 8, C_CHROME);
      ctx.fillRoundedRect(ox + 34, 38, 22, 60, 6, C_DARK_SLATE);
      ctx.fillRect(ox + 52, 46, 8, 34, C_STEEL);
      ctx.fillCircle(ox + 56, 80, 6, C_CHROME);
      // Manguito en contracción máxima
      ctx.fillCircle(ox + 42, 50, 11, C_ACCENT_ORANGE);
      ctx.fillCircle(ox + 42, 50, 6, [255, 255, 255, 255]);
      // Antebrazo completamente perpendicular abierto a 90°
      ctx.strokeLine(ox + 56, 80, ox + 104, 76, 7, C_ACCENT_ORANGE);
      ctx.fillCircle(ox + 104, 76, 6, C_CHROME);
      ctx.strokeLine(ox + 104, 76, ox + 122, 74, 4, C_ACCENT_ORANGE);
      ctx.strokeCircle(ox + 56, 80, 34, 3, C_ACCENT_ORANGE);
    }
  },

  // 4. CHEST OPEN (Apertura Dinámica de Pectorales)
  'warmup-chest-open': (ctx) => {
    // Fase 1: Manos juntas al frente
    {
      const ox = 0;
      drawFrameDecorations(ctx, ox, 1, 'INICIO');
      ctx.fillCircle(ox + 64, 28, 9, C_SILVER);
      ctx.fillRect(ox + 58, 38, 12, 46, C_DARK_SLATE);
      // Brazos estirados al frente cerrados
      ctx.strokeLine(ox + 58, 48, ox + 64, 74, 5, C_SILVER);
      ctx.strokeLine(ox + 70, 48, ox + 64, 74, 5, C_SILVER);
      ctx.fillCircle(ox + 64, 74, 6, C_CHROME);
    }
    // Fase 2: Apertura en diagonal
    {
      const ox = 128;
      drawFrameDecorations(ctx, ox, 2, 'MOVIMIENTO');
      ctx.fillCircle(ox + 64, 28, 9, C_SILVER);
      ctx.fillRect(ox + 58, 38, 12, 46, C_DARK_SLATE);
      ctx.fillPolygon([[ox + 58, 46], [ox + 42, 50], [ox + 44, 70], [ox + 58, 66]], C_ACCENT_AMBER);
      ctx.fillPolygon([[ox + 70, 46], [ox + 86, 50], [ox + 84, 70], [ox + 70, 66]], C_ACCENT_AMBER);
      // Brazos a medio abrir
      ctx.strokeLine(ox + 58, 48, ox + 28, 64, 5, C_ACCENT_AMBER);
      ctx.strokeLine(ox + 70, 48, ox + 100, 64, 5, C_ACCENT_AMBER);
    }
    // Fase 3: Apertura en cruz completa y retracción
    {
      const ox = 256;
      drawFrameDecorations(ctx, ox, 3, 'ACTIVACIÓN');
      ctx.fillCircle(ox + 64, 28, 9, C_CHROME);
      ctx.fillRect(ox + 58, 38, 12, 46, C_DARK_SLATE);
      // Pectorales en máxima elongación e iluminación
      ctx.fillPolygon([[ox + 58, 44], [ox + 34, 48], [ox + 36, 72], [ox + 58, 68]], C_ACCENT_ORANGE);
      ctx.fillPolygon([[ox + 70, 44], [ox + 94, 48], [ox + 92, 72], [ox + 70, 68]], C_ACCENT_ORANGE);
      // Brazos extendidos hacia atrás
      ctx.strokeLine(ox + 34, 48, ox + 12, 54, 6, C_CHROME);
      ctx.strokeLine(ox + 94, 48, ox + 116, 54, 6, C_CHROME);
      ctx.strokeLine(ox + 38, 86, ox + 14, 86, 3, C_ACCENT_ORANGE);
      ctx.strokeLine(ox + 90, 86, ox + 114, 86, 3, C_ACCENT_ORANGE);
    }
  },

  // 5. HIP MOBILITY (Movilidad Dinámica 90/90)
  'warmup-hip-mobility': (ctx) => {
    // Fase 1: Posición inicial 90/90 sentado
    {
      const ox = 0;
      drawFrameDecorations(ctx, ox, 1, 'INICIO');
      ctx.fillRect(ox + 16, 110, 96, 4, C_DARK_SLATE);
      ctx.fillRoundedRect(ox + 46, 50, 36, 22, 5, C_DARK_SLATE);
      ctx.fillCircle(ox + 52, 60, 8, C_STEEL);
      ctx.fillCircle(ox + 76, 60, 8, C_STEEL);
      ctx.strokeLine(ox + 52, 60, ox + 28, 72, 6, C_SILVER);
      ctx.strokeLine(ox + 28, 72, ox + 38, 102, 5, C_SILVER);
      ctx.strokeLine(ox + 76, 60, ox + 100, 56, 6, C_SILVER);
    }
    // Fase 2: Transición central
    {
      const ox = 128;
      drawFrameDecorations(ctx, ox, 2, 'MOVIMIENTO');
      ctx.fillRect(ox + 16, 110, 96, 4, C_DARK_SLATE);
      ctx.fillRoundedRect(ox + 46, 50, 36, 22, 5, C_DARK_SLATE);
      ctx.fillCircle(ox + 52, 60, 10, C_ACCENT_AMBER);
      ctx.fillCircle(ox + 76, 60, 10, C_ACCENT_AMBER);
      // Rodillas elevadas pasando por el centro
      ctx.strokeLine(ox + 52, 60, ox + 40, 84, 6, C_ACCENT_AMBER);
      ctx.strokeLine(ox + 76, 60, ox + 88, 84, 6, C_ACCENT_AMBER);
      ctx.strokeCircle(ox + 64, 64, 28, 2, C_ACCENT_AMBER);
    }
    // Fase 3: Rotación opuesta completa
    {
      const ox = 256;
      drawFrameDecorations(ctx, ox, 3, 'ACTIVACIÓN');
      ctx.fillRect(ox + 16, 110, 96, 4, C_DARK_SLATE);
      ctx.fillRoundedRect(ox + 46, 50, 36, 22, 5, C_DARK_SLATE);
      // Articulaciones de cadera en máxima movilidad
      ctx.fillCircle(ox + 52, 60, 12, C_ACCENT_ORANGE);
      ctx.fillCircle(ox + 76, 60, 12, C_ACCENT_ORANGE);
      ctx.strokeLine(ox + 52, 60, ox + 32, 56, 7, C_ACCENT_ORANGE);
      ctx.strokeLine(ox + 76, 60, ox + 102, 72, 7, C_ACCENT_ORANGE);
      ctx.strokeLine(ox + 102, 72, ox + 90, 102, 6, C_CHROME);
      ctx.strokeCircle(ox + 52, 60, 22, 3, C_ACCENT_ORANGE);
      ctx.strokeCircle(ox + 76, 60, 22, 3, C_ACCENT_ORANGE);
    }
  },

  // 6. GLUTE BRIDGE (Puente de Glúteo e Isquios)
  'warmup-glute-bridge': (ctx) => {
    // Fase 1: Apoyo en suelo (Pelvis abajo)
    {
      const ox = 0;
      drawFrameDecorations(ctx, ox, 1, 'INICIO');
      ctx.fillRect(ox + 10, 108, 108, 4, C_DARK_SLATE);
      ctx.fillCircle(ox + 28, 100, 8, C_SILVER);
      // Espalda plana en el suelo
      ctx.strokeLine(ox + 28, 100, ox + 68, 100, 8, C_DARK_SLATE);
      ctx.strokeLine(ox + 68, 100, ox + 96, 78, 7, C_SILVER);
      ctx.strokeLine(ox + 96, 78, ox + 96, 108, 6, C_SILVER);
    }
    // Fase 2: Elevación media
    {
      const ox = 128;
      drawFrameDecorations(ctx, ox, 2, 'MOVIMIENTO');
      ctx.fillRect(ox + 10, 108, 108, 4, C_DARK_SLATE);
      ctx.fillCircle(ox + 28, 100, 8, C_SILVER);
      // Pelvis subiendo
      ctx.strokeLine(ox + 28, 100, ox + 68, 80, 8, C_STEEL);
      ctx.fillCircle(ox + 68, 80, 11, C_ACCENT_AMBER);
      ctx.strokeLine(ox + 68, 80, ox + 96, 76, 7, C_ACCENT_AMBER);
      ctx.strokeLine(ox + 96, 76, ox + 96, 108, 6, C_SILVER);
      ctx.strokeLine(ox + 68, 72, ox + 68, 54, 3, C_ACCENT_AMBER);
    }
    // Fase 3: Extensión máxima y bloqueo glúteo
    {
      const ox = 256;
      drawFrameDecorations(ctx, ox, 3, 'ACTIVACIÓN');
      ctx.fillRect(ox + 10, 108, 108, 4, C_DARK_SLATE);
      ctx.fillCircle(ox + 26, 102, 9, C_CHROME);
      // Puente alto alineado
      ctx.strokeLine(ox + 26, 102, ox + 68, 60, 9, C_DARK_SLATE);
      // Glúteo en contracción máxima
      ctx.fillCircle(ox + 68, 60, 15, C_ACCENT_ORANGE);
      ctx.fillCircle(ox + 68, 60, 8, [255, 255, 255, 255]);
      ctx.strokeLine(ox + 68, 60, ox + 98, 74, 8, C_ACCENT_ORANGE);
      ctx.strokeLine(ox + 98, 74, ox + 98, 108, 7, C_CHROME);
      // Vector de empuje
      ctx.strokeLine(ox + 68, 48, ox + 68, 20, 4, C_ACCENT_ORANGE);
      ctx.fillPolygon([[ox + 68, 14], [ox + 75, 25], [ox + 61, 25]], C_CHROME);
    }
  },

  // 7. CABLE WARMUP (Aproximación en Polea / Máquina)
  'warmup-cable-warmup': (ctx) => {
    // Fase 1: Agarre alto en estiramiento
    {
      const ox = 0;
      drawFrameDecorations(ctx, ox, 1, 'INICIO');
      ctx.fillRect(ox + 18, 16, 6, 96, C_BLACK);
      ctx.fillRect(ox + 18, 16, 74, 6, C_BLACK);
      ctx.fillCircle(ox + 82, 22, 9, C_SILVER);
      // Cable arriba y barra arriba
      ctx.strokeLine(ox + 82, 22, ox + 82, 42, 2, C_CHROME);
      ctx.strokeLine(ox + 64, 42, ox + 100, 42, 5, C_CHROME);
      // Atleta con brazos estirados hacia arriba
      ctx.fillCircle(ox + 72, 70, 8, C_SILVER);
      ctx.strokeLine(ox + 72, 70, ox + 72, 98, 6, C_DARK_SLATE);
      ctx.strokeLine(ox + 70, 72, ox + 72, 44, 4, C_SILVER);
      ctx.strokeLine(ox + 74, 72, ox + 90, 44, 4, C_SILVER);
    }
    // Fase 2: Recorrido descendente a la barbilla
    {
      const ox = 128;
      drawFrameDecorations(ctx, ox, 2, 'MOVIMIENTO');
      ctx.fillRect(ox + 18, 16, 6, 96, C_BLACK);
      ctx.fillRect(ox + 18, 16, 74, 6, C_BLACK);
      ctx.fillCircle(ox + 82, 22, 9, C_SILVER);
      // Cable bajando
      ctx.strokeLine(ox + 82, 22, ox + 82, 58, 2, C_CHROME);
      ctx.strokeLine(ox + 64, 58, ox + 100, 58, 5, C_ACCENT_AMBER);
      ctx.fillCircle(ox + 72, 70, 8, C_SILVER);
      ctx.strokeLine(ox + 72, 70, ox + 72, 98, 6, C_DARK_SLATE);
      ctx.strokeLine(ox + 70, 72, ox + 68, 60, 5, C_ACCENT_AMBER);
      ctx.strokeLine(ox + 74, 72, ox + 88, 60, 5, C_ACCENT_AMBER);
    }
    // Fase 3: Pico de contracción al pecho con dorsales apretados
    {
      const ox = 256;
      drawFrameDecorations(ctx, ox, 3, 'ACTIVACIÓN');
      ctx.fillRect(ox + 18, 16, 6, 96, C_BLACK);
      ctx.fillRect(ox + 18, 16, 74, 6, C_BLACK);
      ctx.fillCircle(ox + 82, 22, 9, C_SILVER);
      // Barra abajo al pecho
      ctx.strokeLine(ox + 82, 22, ox + 82, 68, 2, C_CHROME);
      ctx.strokeLine(ox + 62, 68, ox + 102, 68, 6, C_CHROME);
      ctx.fillCircle(ox + 72, 68, 9, C_CHROME);
      ctx.strokeLine(ox + 72, 68, ox + 72, 100, 7, C_DARK_SLATE);
      // Dorsal en contracción máxima
      ctx.fillPolygon([[ox + 64, 74], [ox + 74, 74], [ox + 72, 94], [ox + 66, 94]], C_ACCENT_ORANGE);
      ctx.strokeLine(ox + 68, 74, ox + 66, 70, 6, C_ACCENT_ORANGE);
      ctx.strokeLine(ox + 76, 74, ox + 94, 70, 6, C_ACCENT_ORANGE);
      ctx.strokeLine(ox + 82, 74, ox + 82, 94, 3, C_ACCENT_ORANGE);
      ctx.fillPolygon([[ox + 82, 100], [ox + 77, 92], [ox + 87, 92]], C_CHROME);
    }
  },

  // 8. CORE PLANK (Plancha y Estabilidad del Núcleo)
  'warmup-core-plank': (ctx) => {
    // Fase 1: Apoyo inicial en cuadrupedia
    {
      const ox = 0;
      drawFrameDecorations(ctx, ox, 1, 'INICIO');
      ctx.fillRect(ox + 12, 108, 104, 4, C_DARK_SLATE);
      ctx.fillCircle(ox + 34, 74, 7, C_SILVER);
      ctx.strokeLine(ox + 34, 74, ox + 34, 106, 5, C_SILVER);
      ctx.strokeLine(ox + 34, 78, ox + 74, 78, 7, C_DARK_SLATE);
      ctx.strokeLine(ox + 74, 78, ox + 74, 106, 5, C_SILVER);
    }
    // Fase 2: Extensión de piernas despegando rodillas
    {
      const ox = 128;
      drawFrameDecorations(ctx, ox, 2, 'MOVIMIENTO');
      ctx.fillRect(ox + 12, 108, 104, 4, C_DARK_SLATE);
      ctx.fillCircle(ox + 32, 70, 7, C_SILVER);
      ctx.strokeLine(ox + 32, 70, ox + 32, 106, 5, C_SILVER);
      ctx.strokeLine(ox + 32, 74, ox + 70, 80, 7, C_ACCENT_AMBER);
      ctx.strokeLine(ox + 70, 80, ox + 102, 104, 5, C_ACCENT_AMBER);
      ctx.fillCircle(ox + 52, 77, 9, C_ACCENT_AMBER);
    }
    // Fase 3: Plancha horizontal rígida y core activado
    {
      const ox = 256;
      drawFrameDecorations(ctx, ox, 3, 'ACTIVACIÓN');
      ctx.fillRect(ox + 12, 108, 104, 4, C_DARK_SLATE);
      ctx.fillCircle(ox + 28, 66, 8, C_CHROME);
      ctx.strokeLine(ox + 28, 66, ox + 28, 106, 6, C_CHROME);
      // Línea perfecta de plancha
      ctx.strokeLine(ox + 28, 72, ox + 104, 100, 7, C_DARK_SLATE);
      // Núcleo abdominal y glúteos en contracción isométrica total
      ctx.fillCircle(ox + 54, 79, 13, C_ACCENT_ORANGE);
      ctx.fillCircle(ox + 54, 79, 7, [255, 255, 255, 255]);
      ctx.fillCircle(ox + 78, 88, 11, C_ACCENT_ORANGE);
      ctx.strokeLine(ox + 28, 72, ox + 104, 100, 3, C_ACCENT_ORANGE);
      ctx.fillCircle(ox + 104, 102, 5, C_CHROME);
    }
  },

  // 9. ARM ELBOW CURL (Activación de Codos y Muñecas)
  'warmup-arm-elbow-curl': (ctx) => {
    // Fase 1: Brazos extendidos abajo
    {
      const ox = 0;
      drawFrameDecorations(ctx, ox, 1, 'INICIO');
      ctx.fillCircle(ox + 64, 30, 9, C_SILVER);
      ctx.fillRect(ox + 54, 40, 20, 38, C_DARK_SLATE);
      ctx.strokeLine(ox + 58, 78, ox + 54, 110, 4, C_STEEL);
      ctx.strokeLine(ox + 70, 78, ox + 74, 110, 4, C_STEEL);
      ctx.strokeLine(ox + 48, 44, ox + 42, 78, 4, C_SILVER);
      ctx.strokeLine(ox + 80, 44, ox + 86, 78, 4, C_SILVER);
      ctx.fillCircle(ox + 42, 80, 4, C_CHROME);
      ctx.fillCircle(ox + 86, 80, 4, C_CHROME);
    }
    // Fase 2: Flexión y supinación a 90°
    {
      const ox = 128;
      drawFrameDecorations(ctx, ox, 2, 'MOVIMIENTO');
      ctx.fillCircle(ox + 64, 30, 9, C_SILVER);
      ctx.fillRect(ox + 54, 40, 20, 38, C_DARK_SLATE);
      ctx.strokeLine(ox + 58, 78, ox + 54, 110, 4, C_STEEL);
      ctx.strokeLine(ox + 70, 78, ox + 74, 110, 4, C_STEEL);
      ctx.strokeLine(ox + 48, 44, ox + 46, 64, 4, C_ACCENT_AMBER);
      ctx.strokeLine(ox + 46, 64, ox + 36, 56, 4, C_ACCENT_AMBER);
      ctx.strokeLine(ox + 80, 44, ox + 82, 64, 4, C_ACCENT_AMBER);
      ctx.strokeLine(ox + 82, 64, ox + 92, 56, 4, C_ACCENT_AMBER);
      ctx.fillCircle(ox + 46, 64, 6, C_ACCENT_AMBER);
      ctx.fillCircle(ox + 82, 64, 6, C_ACCENT_AMBER);
    }
    // Fase 3: Flexión pico y lubricación articular
    {
      const ox = 256;
      drawFrameDecorations(ctx, ox, 3, 'ACTIVACIÓN');
      ctx.fillCircle(ox + 64, 30, 9, C_CHROME);
      ctx.fillRect(ox + 54, 40, 20, 38, C_DARK_SLATE);
      ctx.strokeLine(ox + 58, 78, ox + 54, 110, 4, C_STEEL);
      ctx.strokeLine(ox + 70, 78, ox + 74, 110, 4, C_STEEL);
      ctx.strokeLine(ox + 48, 44, ox + 46, 66, 5, C_ACCENT_ORANGE);
      ctx.strokeLine(ox + 46, 66, ox + 46, 48, 5, C_ACCENT_ORANGE);
      ctx.strokeLine(ox + 80, 44, ox + 82, 66, 5, C_ACCENT_ORANGE);
      ctx.strokeLine(ox + 82, 66, ox + 82, 48, 5, C_ACCENT_ORANGE);
      ctx.fillCircle(ox + 46, 54, 8, C_ACCENT_ORANGE);
      ctx.fillCircle(ox + 82, 54, 8, C_ACCENT_ORANGE);
      ctx.strokeCircle(ox + 64, 58, 30, 2, C_ACCENT_ORANGE);
    }
  },

  // 10. TRICEPS ROPE WARMUP (Extensión de Tríceps en Cuerda)
  'warmup-triceps-rope-warmup': (ctx) => {
    // Fase 1: Codos flexionados a 90°
    {
      const ox = 0;
      drawFrameDecorations(ctx, ox, 1, 'INICIO');
      ctx.fillRect(ox + 62, 16, 4, 34, C_CHROME);
      ctx.fillCircle(ox + 48, 42, 9, C_SILVER);
      ctx.fillRect(ox + 42, 52, 16, 36, C_DARK_SLATE);
      ctx.strokeLine(ox + 46, 54, ox + 56, 54, 4, C_SILVER);
      ctx.strokeLine(ox + 56, 54, ox + 62, 50, 4, C_SILVER);
      ctx.fillCircle(ox + 62, 50, 5, C_CHROME);
    }
    // Fase 2: Descenso de la cuerda
    {
      const ox = 128;
      drawFrameDecorations(ctx, ox, 2, 'MOVIMIENTO');
      ctx.fillRect(ox + 62, 16, 4, 50, C_CHROME);
      ctx.fillCircle(ox + 48, 42, 9, C_SILVER);
      ctx.fillRect(ox + 42, 52, 16, 36, C_DARK_SLATE);
      ctx.strokeLine(ox + 46, 54, ox + 54, 68, 4, C_ACCENT_AMBER);
      ctx.strokeLine(ox + 54, 68, ox + 62, 66, 4, C_ACCENT_AMBER);
      ctx.fillCircle(ox + 54, 68, 6, C_ACCENT_AMBER);
    }
    // Fase 3: Extensión total y apertura lateral de cuerda
    {
      const ox = 256;
      drawFrameDecorations(ctx, ox, 3, 'ACTIVACIÓN');
      ctx.fillRect(ox + 62, 16, 4, 62, C_CHROME);
      ctx.fillCircle(ox + 48, 42, 9, C_CHROME);
      ctx.fillRect(ox + 42, 52, 16, 36, C_DARK_SLATE);
      ctx.strokeLine(ox + 46, 54, ox + 50, 80, 5, C_ACCENT_ORANGE);
      ctx.strokeLine(ox + 50, 80, ox + 64, 82, 5, C_ACCENT_ORANGE);
      ctx.fillCircle(ox + 48, 64, 8, C_ACCENT_ORANGE);
      ctx.strokeCircle(ox + 48, 64, 12, 2, C_ACCENT_ORANGE);
    }
  },

  // 11. CHEST PRESS WARMUP (Aproximación Máquina de Pecho)
  'warmup-chest-press-warmup': (ctx) => {
    // Fase 1: Agarre inicial al pecho
    {
      const ox = 0;
      drawFrameDecorations(ctx, ox, 1, 'INICIO');
      ctx.fillRect(ox + 20, 24, 8, 84, C_BLACK);
      ctx.fillRect(ox + 24, 76, 26, 8, C_DARK_SLATE);
      ctx.fillCircle(ox + 44, 48, 9, C_SILVER);
      ctx.fillRect(ox + 40, 58, 14, 28, C_DARK_SLATE);
      ctx.strokeLine(ox + 46, 62, ox + 36, 68, 4, C_SILVER);
      ctx.strokeLine(ox + 36, 68, ox + 54, 68, 4, C_SILVER);
    }
    // Fase 2: Empuje medio hacia adelante
    {
      const ox = 128;
      drawFrameDecorations(ctx, ox, 2, 'MOVIMIENTO');
      ctx.fillRect(ox + 20, 24, 8, 84, C_BLACK);
      ctx.fillRect(ox + 24, 76, 26, 8, C_DARK_SLATE);
      ctx.fillCircle(ox + 44, 48, 9, C_SILVER);
      ctx.fillRect(ox + 40, 58, 14, 28, C_DARK_SLATE);
      ctx.strokeLine(ox + 46, 62, ox + 58, 66, 4, C_ACCENT_AMBER);
      ctx.strokeLine(ox + 58, 66, ox + 72, 66, 4, C_ACCENT_AMBER);
      ctx.fillCircle(ox + 52, 64, 6, C_ACCENT_AMBER);
    }
    // Fase 3: Extensión controlada y pecho apretado
    {
      const ox = 256;
      drawFrameDecorations(ctx, ox, 3, 'ACTIVACIÓN');
      ctx.fillRect(ox + 20, 24, 8, 84, C_BLACK);
      ctx.fillRect(ox + 24, 76, 26, 8, C_DARK_SLATE);
      ctx.fillCircle(ox + 44, 48, 9, C_CHROME);
      ctx.fillRect(ox + 40, 58, 14, 28, C_DARK_SLATE);
      ctx.strokeLine(ox + 46, 62, ox + 76, 64, 5, C_ACCENT_ORANGE);
      ctx.fillCircle(ox + 52, 64, 9, C_ACCENT_ORANGE);
      ctx.fillCircle(ox + 52, 64, 4, [255, 255, 255, 255]);
      ctx.strokeCircle(ox + 52, 64, 14, 2, C_ACCENT_ORANGE);
    }
  },

  // 12. ANKLE DORSIFLEXION (Dorsiflexión de Tobillo contra Pared)
  'warmup-ankle-dorsi': (ctx) => {
    // Fase 1: Posición neutra a 10cm de pared
    {
      const ox = 0;
      drawFrameDecorations(ctx, ox, 1, 'INICIO');
      ctx.fillRect(ox + 104, 20, 6, 92, C_CHROME);
      ctx.fillCircle(ox + 44, 46, 8, C_SILVER);
      ctx.strokeLine(ox + 44, 46, ox + 48, 76, 6, C_DARK_SLATE);
      ctx.strokeLine(ox + 48, 76, ox + 52, 108, 6, C_SILVER);
      ctx.strokeLine(ox + 52, 108, ox + 68, 108, 6, C_STEEL);
    }
    // Fase 2: Rodilla avanzando hacia pared
    {
      const ox = 128;
      drawFrameDecorations(ctx, ox, 2, 'MOVIMIENTO');
      ctx.fillRect(ox + 104, 20, 6, 92, C_CHROME);
      ctx.fillCircle(ox + 48, 48, 8, C_SILVER);
      ctx.strokeLine(ox + 48, 48, ox + 58, 78, 6, C_DARK_SLATE);
      ctx.strokeLine(ox + 58, 78, ox + 78, 92, 6, C_ACCENT_AMBER);
      ctx.strokeLine(ox + 78, 92, ox + 66, 108, 6, C_ACCENT_AMBER);
      ctx.strokeLine(ox + 66, 108, ox + 82, 108, 6, C_STEEL);
      ctx.fillCircle(ox + 70, 104, 6, C_ACCENT_AMBER);
    }
    // Fase 3: Rodilla toca pared y máxima dorsiflexión
    {
      const ox = 256;
      drawFrameDecorations(ctx, ox, 3, 'ACTIVACIÓN');
      ctx.fillRect(ox + 104, 20, 6, 92, C_CHROME);
      ctx.fillCircle(ox + 52, 50, 8, C_CHROME);
      ctx.strokeLine(ox + 52, 50, ox + 68, 80, 6, C_DARK_SLATE);
      ctx.strokeLine(ox + 68, 80, ox + 104, 90, 7, C_ACCENT_ORANGE);
      ctx.strokeLine(ox + 104, 90, ox + 76, 108, 7, C_ACCENT_ORANGE);
      ctx.strokeLine(ox + 76, 108, ox + 92, 108, 6, C_STEEL);
      ctx.fillCircle(ox + 82, 104, 9, C_ACCENT_ORANGE);
      ctx.strokeCircle(ox + 82, 104, 14, 2, C_ACCENT_ORANGE);
    }
  },

  // 13. LEG PRESS WARMUP (Aproximación en Prensa al 40%)
  'warmup-leg-press-warmup': (ctx) => {
    // Fase 1: Flexión a 90° en carro
    {
      const ox = 0;
      drawFrameDecorations(ctx, ox, 1, 'INICIO');
      ctx.strokeLine(ox + 20, 96, ox + 104, 32, 4, C_DARK_SLATE);
      ctx.fillCircle(ox + 34, 78, 8, C_SILVER);
      ctx.strokeLine(ox + 34, 78, ox + 56, 84, 7, C_STEEL);
      ctx.strokeLine(ox + 56, 84, ox + 64, 58, 6, C_SILVER);
      ctx.strokeLine(ox + 64, 58, ox + 76, 68, 6, C_SILVER);
      ctx.fillRect(ox + 74, 56, 6, 24, C_CHROME);
    }
    // Fase 2: Empuje medio
    {
      const ox = 128;
      drawFrameDecorations(ctx, ox, 2, 'MOVIMIENTO');
      ctx.strokeLine(ox + 20, 96, ox + 104, 32, 4, C_DARK_SLATE);
      ctx.fillCircle(ox + 34, 78, 8, C_SILVER);
      ctx.strokeLine(ox + 34, 78, ox + 56, 84, 7, C_STEEL);
      ctx.strokeLine(ox + 56, 84, ox + 72, 64, 6, C_ACCENT_AMBER);
      ctx.strokeLine(ox + 72, 64, ox + 86, 56, 6, C_ACCENT_AMBER);
      ctx.fillRect(ox + 84, 46, 6, 24, C_CHROME);
      ctx.fillCircle(ox + 68, 70, 7, C_ACCENT_AMBER);
    }
    // Fase 3: Extensión fluida al 95% activando cuádriceps
    {
      const ox = 256;
      drawFrameDecorations(ctx, ox, 3, 'ACTIVACIÓN');
      ctx.strokeLine(ox + 20, 96, ox + 104, 32, 4, C_DARK_SLATE);
      ctx.fillCircle(ox + 34, 78, 8, C_CHROME);
      ctx.strokeLine(ox + 34, 78, ox + 56, 84, 7, C_STEEL);
      ctx.strokeLine(ox + 56, 84, ox + 80, 60, 7, C_ACCENT_ORANGE);
      ctx.strokeLine(ox + 80, 60, ox + 94, 46, 7, C_ACCENT_ORANGE);
      ctx.fillRect(ox + 92, 38, 6, 24, C_CHROME);
      ctx.fillCircle(ox + 72, 66, 11, C_ACCENT_ORANGE);
      ctx.fillCircle(ox + 72, 66, 5, [255, 255, 255, 255]);
      ctx.strokeCircle(ox + 72, 66, 16, 2, C_ACCENT_ORANGE);
    }
  },

  // 14. JOINT CIRCLES (Círculos Articulares Cuello, Hombros y Cadera)
  'warmup-joint-circles': (ctx) => {
    // Fase 1: Posición neutra
    {
      const ox = 0;
      drawFrameDecorations(ctx, ox, 1, 'INICIO');
      ctx.fillCircle(ox + 64, 32, 9, C_SILVER);
      ctx.fillRect(ox + 54, 42, 20, 38, C_DARK_SLATE);
      ctx.strokeLine(ox + 58, 80, ox + 54, 110, 4, C_STEEL);
      ctx.strokeLine(ox + 70, 80, ox + 74, 110, 4, C_STEEL);
      ctx.strokeLine(ox + 48, 44, ox + 42, 74, 4, C_SILVER);
      ctx.strokeLine(ox + 80, 44, ox + 86, 74, 4, C_SILVER);
    }
    // Fase 2: Círculos amplios de hombros
    {
      const ox = 128;
      drawFrameDecorations(ctx, ox, 2, 'MOVIMIENTO');
      ctx.fillCircle(ox + 64, 32, 9, C_SILVER);
      ctx.fillRect(ox + 54, 42, 20, 38, C_DARK_SLATE);
      ctx.strokeLine(ox + 58, 80, ox + 54, 110, 4, C_STEEL);
      ctx.strokeLine(ox + 70, 80, ox + 74, 110, 4, C_STEEL);
      ctx.strokeCircle(ox + 46, 48, 14, 2, C_ACCENT_AMBER);
      ctx.strokeCircle(ox + 82, 48, 14, 2, C_ACCENT_AMBER);
      ctx.strokeLine(ox + 48, 44, ox + 40, 60, 4, C_ACCENT_AMBER);
      ctx.strokeLine(ox + 80, 44, ox + 88, 60, 4, C_ACCENT_AMBER);
    }
    // Fase 3: Circunducción completa
    {
      const ox = 256;
      drawFrameDecorations(ctx, ox, 3, 'ACTIVACIÓN');
      ctx.fillCircle(ox + 64, 32, 9, C_CHROME);
      ctx.fillRect(ox + 54, 42, 20, 38, C_DARK_SLATE);
      ctx.strokeLine(ox + 58, 80, ox + 54, 110, 4, C_STEEL);
      ctx.strokeLine(ox + 70, 80, ox + 74, 110, 4, C_STEEL);
      ctx.strokeCircle(ox + 64, 32, 16, 2, C_ACCENT_ORANGE);
      ctx.strokeCircle(ox + 46, 48, 16, 3, C_ACCENT_ORANGE);
      ctx.strokeCircle(ox + 82, 48, 16, 3, C_ACCENT_ORANGE);
      ctx.strokeCircle(ox + 64, 76, 22, 2, C_ACCENT_ORANGE);
    }
  },

  // 15. Y-T-W SCAPULAR (Y-T-W para Deltoides Posterior y Escápula)
  'warmup-ytw-scapular': (ctx) => {
    // Fase 1: Posición 'Y' Overhead
    {
      const ox = 0;
      drawFrameDecorations(ctx, ox, 1, 'POSICIÓN Y');
      ctx.fillCircle(ox + 64, 48, 8, C_SILVER);
      ctx.fillRect(ox + 56, 56, 16, 34, C_DARK_SLATE);
      ctx.strokeLine(ox + 52, 58, ox + 32, 24, 4, C_ACCENT_AMBER);
      ctx.strokeLine(ox + 76, 58, ox + 96, 24, 4, C_ACCENT_AMBER);
      ctx.fillCircle(ox + 32, 24, 5, C_CHROME);
      ctx.fillCircle(ox + 96, 24, 5, C_CHROME);
    }
    // Fase 2: Posición 'T' Apertura en Cruz
    {
      const ox = 128;
      drawFrameDecorations(ctx, ox, 2, 'POSICIÓN T');
      ctx.fillCircle(ox + 64, 48, 8, C_SILVER);
      ctx.fillRect(ox + 56, 56, 16, 34, C_DARK_SLATE);
      ctx.strokeLine(ox + 52, 60, ox + 18, 60, 4, C_ACCENT_AMBER);
      ctx.strokeLine(ox + 76, 60, ox + 110, 60, 4, C_ACCENT_AMBER);
      ctx.fillCircle(ox + 18, 60, 5, C_CHROME);
      ctx.fillCircle(ox + 110, 60, 5, C_CHROME);
      ctx.strokeCircle(ox + 64, 60, 16, 2, C_ACCENT_AMBER);
    }
    // Fase 3: Posición 'W' Retracción Máxima
    {
      const ox = 256;
      drawFrameDecorations(ctx, ox, 3, 'POSICIÓN W');
      ctx.fillCircle(ox + 64, 48, 8, C_CHROME);
      ctx.fillRect(ox + 56, 56, 16, 34, C_DARK_SLATE);
      ctx.strokeLine(ox + 52, 60, ox + 40, 74, 5, C_ACCENT_ORANGE);
      ctx.strokeLine(ox + 40, 74, ox + 30, 52, 5, C_ACCENT_ORANGE);
      ctx.strokeLine(ox + 76, 60, ox + 88, 74, 5, C_ACCENT_ORANGE);
      ctx.strokeLine(ox + 88, 74, ox + 98, 52, 5, C_ACCENT_ORANGE);
      ctx.fillCircle(ox + 46, 64, 7, C_ACCENT_ORANGE);
      ctx.fillCircle(ox + 82, 64, 7, C_ACCENT_ORANGE);
      ctx.strokeCircle(ox + 64, 66, 18, 2, C_ACCENT_ORANGE);
    }
  }
};

const outputDir = path.join(__dirname, '..', 'assets', 'icons');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

let generatedCount = 0;
for (const [key, drawFn] of Object.entries(WARMUP_ANIMATIONS)) {
  const fileName = `${key}-anim.png`;
  const filePath = path.join(outputDir, fileName);
  const pngBuffer = createPng(384, 128, drawFn);
  fs.writeFileSync(filePath, pngBuffer);
  console.log(`Generated warmup spritesheet: ${fileName} (${pngBuffer.length} bytes)`);
  generatedCount++;
}

console.log(`Successfully generated ${generatedCount} warmup 3-phase animated spritesheets.`);
