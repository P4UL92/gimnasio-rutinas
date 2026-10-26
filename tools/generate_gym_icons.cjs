const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height, drawFn) {
  const buffer = Buffer.alloc(width * height * 4, 0);

  function setPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
    // Alpha composite over existing
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
    rawData[rowOffset] = 0; // Filter none
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = rowOffset + 1 + x * 4;
      rawData[dstIdx] = buffer[srcIdx];
      rawData[dstIdx + 1] = buffer[srcIdx + 1];
      rawData[dstIdx + 2] = buffer[srcIdx + 2];
      rawData[dstIdx + 3] = buffer[srcIdx + 3];
    }
  }

  const deflated = zlib.deflateSync(rawData);

  function createChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    let c = 0xffffffff;
    for (let i = 0; i < body.length; i++) {
      c ^= body[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (-(c & 1) & 0xedb88320);
    }
    crc.writeUInt32BE((c ^ 0xffffffff) >>> 0, 0);
    return Buffer.concat([len, body, crc]);
  }

  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdr = createChunk('IHDR', ihdrData);
  const idat = createChunk('IDAT', deflated);
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdr, idat, iend]);
}

// Gym Color Palette (Negro, Plomo Plateado, Acero y Destellos Metálicos)
const C_BLACK = [15, 18, 23, 255];          // Hierro forjado oscuro
const C_DARK_SLATE = [28, 33, 44, 255];     // Acero carbón mate
const C_GUNMETAL = [45, 52, 68, 255];       // Plomo grafito
const C_STEEL = [100, 116, 139, 255];       // Acero templado
const C_SILVER = [160, 175, 195, 255];      // Plomo plateado metálico
const C_CHROME = [226, 232, 240, 255];      // Destello cromo plateado
const C_ACCENT_ORANGE = [249, 115, 22, 255];// Fuego gym / energía

const icons = {
  // 1. BARBELL (Barra Olímpica Cargada con Discos)
  'gym-barbell': (ctx) => {
    // Eje central de acero
    ctx.fillRect(8, 29, 48, 6, C_SILVER);
    ctx.fillRect(10, 30, 44, 4, C_CHROME);
    // Moleteado central
    ctx.fillRect(24, 29, 16, 6, C_DARK_SLATE);
    ctx.fillRect(26, 30, 12, 4, C_STEEL);
    // Topes / Collares
    ctx.fillRect(18, 25, 4, 14, C_SILVER);
    ctx.fillRect(42, 25, 4, 14, C_SILVER);
    // Discos exteriores (Plomo oscuro y contorno plateado)
    ctx.fillRoundedRect(12, 14, 6, 36, 2, C_BLACK);
    ctx.fillRoundedRect(13, 16, 4, 32, 1, C_GUNMETAL);
    ctx.fillRect(14, 18, 2, 28, C_SILVER);

    ctx.fillRoundedRect(46, 14, 6, 36, 2, C_BLACK);
    ctx.fillRoundedRect(47, 16, 4, 32, 1, C_GUNMETAL);
    ctx.fillRect(48, 18, 2, 28, C_SILVER);

    // Discos grandes principales
    ctx.fillRoundedRect(6, 10, 6, 44, 2, C_BLACK);
    ctx.fillRoundedRect(7, 12, 4, 40, 1, C_STEEL);
    ctx.fillRect(8, 14, 2, 36, C_CHROME);

    ctx.fillRoundedRect(52, 10, 6, 44, 2, C_BLACK);
    ctx.fillRoundedRect(53, 12, 4, 40, 1, C_STEEL);
    ctx.fillRect(54, 14, 2, 36, C_CHROME);
  },

  // 2. DUMBBELL (Mancuerna Hexagonal de Fuerza)
  'gym-dumbbell': (ctx) => {
    // Mango con moleteado
    ctx.strokeLine(18, 46, 46, 18, 7, C_GUNMETAL);
    ctx.strokeLine(20, 44, 44, 20, 5, C_SILVER);
    ctx.strokeLine(24, 40, 40, 24, 5, C_CHROME);

    // Cabezal inferior izquierdo
    ctx.fillPolygon([[12, 40], [22, 50], [18, 58], [8, 56], [4, 46], [8, 40]], C_BLACK);
    ctx.fillPolygon([[13, 42], [20, 49], [17, 55], [9, 54], [6, 47], [9, 42]], C_STEEL);
    ctx.fillCircle(12, 48, 4, C_SILVER);

    // Cabezal superior derecho
    ctx.fillPolygon([[42, 10], [52, 20], [58, 16], [56, 6], [46, 2], [40, 8]], C_BLACK);
    ctx.fillPolygon([[43, 12], [50, 19], [55, 15], [54, 8], [47, 4], [42, 9]], C_STEEL);
    ctx.fillCircle(48, 12, 4, C_CHROME);
  },

  // 3. PLATE (Disco Olímpico de 45 lb con ranuras de agarre)
  'gym-plate': (ctx) => {
    // Aro exterior
    ctx.fillCircle(32, 32, 28, C_BLACK);
    ctx.fillCircle(32, 32, 25, C_DARK_SLATE);
    ctx.strokeCircle(32, 32, 24, 2, C_SILVER);

    // Ranuras de agarre
    ctx.fillRoundedRect(12, 28, 8, 8, 2, C_BLACK);
    ctx.fillRoundedRect(44, 28, 8, 8, 2, C_BLACK);
    ctx.fillRoundedRect(28, 12, 8, 8, 2, C_BLACK);
    ctx.fillRoundedRect(28, 44, 8, 8, 2, C_BLACK);

    // Cubo central y anillo de acero
    ctx.fillCircle(32, 32, 11, C_STEEL);
    ctx.strokeCircle(32, 32, 11, 2, C_CHROME);
    ctx.fillCircle(32, 32, 5, C_BLACK);
    ctx.strokeCircle(32, 32, 5, 1, C_SILVER);
  },

  // 4. BICEPS (Silueta Muscular de Brazo y Bíceps en Flexión)
  'gym-biceps': (ctx) => {
    // Antebrazo vertical
    ctx.fillPolygon([[38, 56], [48, 54], [46, 28], [38, 30]], C_BLACK);
    ctx.fillPolygon([[39, 54], [46, 52], [44, 30], [39, 32]], C_STEEL);
    // Puño cerrado
    ctx.fillCircle(43, 24, 7, C_BLACK);
    ctx.fillCircle(43, 24, 5, C_SILVER);
    // Bíceps (Pico de contracción)
    ctx.fillCircle(28, 32, 13, C_BLACK);
    ctx.fillCircle(28, 32, 11, C_GUNMETAL);
    ctx.fillCircle(27, 30, 8, C_SILVER);
    // Tríceps y base del brazo
    ctx.fillPolygon([[14, 54], [38, 56], [32, 40], [16, 42]], C_BLACK);
    ctx.fillPolygon([[16, 52], [36, 54], [30, 42], [18, 44]], C_STEEL);
    // Deltoides
    ctx.fillCircle(14, 48, 9, C_BLACK);
    ctx.fillCircle(14, 48, 7, C_SILVER);
  },

  // 5. TROPHY (Copa de Potencia / Campeón)
  'gym-trophy': (ctx) => {
    // Base escalonada de hierro
    ctx.fillRoundedRect(16, 52, 32, 8, 2, C_BLACK);
    ctx.fillRect(18, 54, 28, 4, C_STEEL);
    ctx.fillRoundedRect(22, 46, 20, 6, 1, C_GUNMETAL);
    ctx.fillRect(24, 47, 16, 4, C_SILVER);

    // Tallo de la copa
    ctx.fillRect(28, 36, 8, 10, C_CHROME);

    // Asas sólidas
    ctx.strokeCircle(18, 24, 9, 4, C_SILVER);
    ctx.strokeCircle(46, 24, 9, 4, C_SILVER);

    // Cáliz de la copa
    ctx.fillPolygon([[16, 12], [48, 12], [42, 36], [22, 36]], C_BLACK);
    ctx.fillPolygon([[18, 14], [46, 14], [40, 34], [24, 34]], C_STEEL);
    ctx.fillPolygon([[20, 16], [34, 16], [30, 32], [24, 32]], C_CHROME);
    // Borde superior
    ctx.fillRoundedRect(14, 10, 36, 5, 2, C_CHROME);
  },

  // 6. LIGHTNING (Rayo de Fuerza y Potencia)
  'gym-lightning': (ctx) => {
    const pts = [
      [36, 4],
      [14, 32],
      [28, 32],
      [20, 60],
      [50, 24],
      [34, 24]
    ];
    ctx.fillPolygon(pts, C_BLACK);

    // Borde interior acero y plata
    const innerPts = [
      [35, 8],
      [18, 30],
      [30, 30],
      [24, 52],
      [44, 26],
      [32, 26]
    ];
    ctx.fillPolygon(innerPts, C_SILVER);

    const corePts = [
      [34, 12],
      [22, 28],
      [32, 28],
      [28, 44],
      [38, 26],
      [30, 26]
    ];
    ctx.fillPolygon(corePts, C_CHROME);
  },

  // 7. CALENDAR (Planificador Semanal de Rutinas)
  'gym-calendar': (ctx) => {
    // Cuerpo del calendario
    ctx.fillRoundedRect(8, 12, 48, 44, 4, C_BLACK);
    ctx.fillRoundedRect(10, 14, 44, 40, 3, C_DARK_SLATE);

    // Barra superior de sujeción
    ctx.fillRoundedRect(8, 12, 48, 12, 3, C_STEEL);
    ctx.fillRect(10, 14, 44, 8, C_SILVER);

    // Anillas de acero
    ctx.fillRoundedRect(18, 6, 6, 12, 2, C_CHROME);
    ctx.fillRoundedRect(40, 6, 6, 12, 2, C_CHROME);

    // Cuadrícula de días / bloques de fuerza
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const x = 15 + col * 12;
        const y = 30 + row * 11;
        ctx.fillRoundedRect(x, y, 9, 7, 1, C_BLACK);
        ctx.fillRect(x + 1, y + 1, 7, 5, (row === 0 && col === 1) ? C_ACCENT_ORANGE : C_SILVER);
      }
    }
  },

  // 8. STATS (Gráfico de Sobrecarga Progresiva / Barras de Rendimiento)
  'gym-stats': (ctx) => {
    // Ejes
    ctx.fillRect(8, 50, 48, 4, C_SILVER);
    ctx.fillRect(8, 10, 4, 44, C_SILVER);

    // Barra 1
    ctx.fillRoundedRect(16, 36, 7, 14, 1, C_BLACK);
    ctx.fillRect(17, 37, 5, 13, C_GUNMETAL);

    // Barra 2
    ctx.fillRoundedRect(26, 26, 7, 24, 1, C_BLACK);
    ctx.fillRect(27, 27, 5, 23, C_STEEL);

    // Barra 3
    ctx.fillRoundedRect(36, 16, 7, 34, 1, C_BLACK);
    ctx.fillRect(37, 17, 5, 33, C_SILVER);

    // Barra 4 (PR máximo)
    ctx.fillRoundedRect(46, 8, 7, 42, 1, C_BLACK);
    ctx.fillRect(47, 9, 5, 41, C_CHROME);

    // Flecha de tendencia ascendente
    ctx.strokeLine(16, 36, 48, 12, 3, C_CHROME);
  },

  // 9. USER (Atleta / Silueta Muscular con Hombros Fuertes)
  'gym-user': (ctx) => {
    // Cabeza atlética
    ctx.fillCircle(32, 16, 10, C_BLACK);
    ctx.fillCircle(32, 16, 8, C_SILVER);
    ctx.strokeCircle(32, 16, 8, 1, C_CHROME);

    // Cuello potente
    ctx.fillRect(28, 25, 8, 6, C_BLACK);
    ctx.fillRect(29, 25, 6, 6, C_STEEL);

    // Trapecios y hombros anchos (V-Taper)
    ctx.fillPolygon([
      [8, 56],
      [12, 36],
      [24, 30],
      [40, 30],
      [52, 36],
      [56, 56],
      [44, 56],
      [32, 48],
      [20, 56]
    ], C_BLACK);

    ctx.fillPolygon([
      [12, 54],
      [15, 38],
      [25, 32],
      [39, 32],
      [49, 38],
      [52, 54],
      [42, 54],
      [32, 46],
      [22, 54]
    ], C_STEEL);

    // Pectorales definidos
    ctx.fillRoundedRect(22, 38, 9, 7, 2, C_CHROME);
    ctx.fillRoundedRect(33, 38, 9, 7, 2, C_CHROME);
  },

  // 10. GEAR (Engranaje Industrial de Ajuste de Máquinas y Poleas)
  'gym-gear': (ctx) => {
    ctx.fillCircle(32, 32, 22, C_BLACK);
    // Dientes del engranaje (8 dientes)
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const x = 32 + Math.cos(angle) * 22;
      const y = 32 + Math.sin(angle) * 22;
      ctx.fillCircle(x, y, 6, C_BLACK);
      ctx.fillCircle(x, y, 4, C_STEEL);
    }
    // Cuerpo central
    ctx.fillCircle(32, 32, 18, C_STEEL);
    ctx.strokeCircle(32, 32, 17, 2, C_CHROME);
    // Agujero eje central
    ctx.fillCircle(32, 32, 8, C_BLACK);
    ctx.strokeCircle(32, 32, 8, 2, C_SILVER);
  },

  // 11. SHIELD (Escudo de Hierro y Recuperación Articular)
  'gym-shield': (ctx) => {
    const pts = [
      [32, 6],
      [54, 14],
      [50, 42],
      [32, 58],
      [14, 42],
      [10, 14]
    ];
    ctx.fillPolygon(pts, C_BLACK);

    const innerPts = [
      [32, 10],
      [50, 17],
      [46, 39],
      [32, 53],
      [18, 39],
      [14, 17]
    ];
    ctx.fillPolygon(innerPts, C_STEEL);

    // Cruz central de blindaje
    ctx.fillRect(30, 14, 4, 36, C_CHROME);
    ctx.fillRect(18, 26, 28, 4, C_CHROME);
  },

  // 12. SHAKER (Botella Shaker de Proteínas y Nutrición)
  'gym-shaker': (ctx) => {
    // Vaso cónico
    ctx.fillPolygon([[18, 20], [46, 20], [41, 56], [23, 56]], C_BLACK);
    ctx.fillPolygon([[20, 22], [44, 22], [39, 54], [25, 54]], C_DARK_SLATE);
    // Medidores de ml
    for (let y = 28; y <= 48; y += 5) {
      ctx.fillRect(25, y, 5, 2, C_SILVER);
    }
    // Tapa roscada
    ctx.fillRoundedRect(16, 14, 32, 7, 2, C_STEEL);
    ctx.fillRect(17, 15, 30, 5, C_CHROME);
    // Boquilla / flip-top
    ctx.fillRoundedRect(22, 7, 8, 8, 2, C_CHROME);
    ctx.fillRect(28, 9, 12, 3, C_SILVER);
  },

  // 13. TIMER (Cronómetro de Intervalos y TUT)
  'gym-timer': (ctx) => {
    // Pulsadores superiores
    ctx.fillRoundedRect(28, 4, 8, 6, 1, C_CHROME);
    ctx.fillRoundedRect(42, 8, 6, 6, 1, C_SILVER);

    // Cuerpo circular del cronómetro
    ctx.fillCircle(32, 36, 24, C_BLACK);
    ctx.fillCircle(32, 36, 21, C_DARK_SLATE);
    ctx.strokeCircle(32, 36, 20, 2, C_SILVER);

    // Marcas de cuadrante (12, 3, 6, 9)
    ctx.fillRect(31, 18, 2, 5, C_CHROME);
    ctx.fillRect(31, 49, 2, 5, C_CHROME);
    ctx.fillRect(14, 35, 5, 2, C_CHROME);
    ctx.fillRect(45, 35, 5, 2, C_CHROME);

    // Aguja apuntando a alta intensidad
    ctx.strokeLine(32, 36, 42, 26, 3, C_ACCENT_ORANGE);
    ctx.fillCircle(32, 36, 4, C_CHROME);
  },

  // 14. RESTORE (Flechas Circulares de Restablecimiento y Reorganización)
  'gym-restore': (ctx) => {
    // Arco circular superior
    ctx.strokeCircle(32, 32, 18, 6, C_BLACK);
    ctx.strokeCircle(32, 32, 18, 4, C_SILVER);
    // Huecos para flechas
    ctx.fillRect(10, 24, 12, 16, [0, 0, 0, 0]);
    ctx.fillRect(42, 24, 12, 16, [0, 0, 0, 0]);

    // Flecha superior derecha
    ctx.fillPolygon([[46, 16], [58, 28], [38, 28]], C_CHROME);
    // Flecha inferior izquierda
    ctx.fillPolygon([[18, 48], [6, 36], [26, 36]], C_CHROME);
  },

  // 15. FLAME (Llama de Quema Calórica / Racha de Días)
  'gym-flame': (ctx) => {
    const outerPts = [
      [32, 6],
      [42, 18],
      [52, 34],
      [48, 52],
      [32, 58],
      [16, 52],
      [12, 34],
      [22, 18]
    ];
    ctx.fillPolygon(outerPts, C_BLACK);

    const midPts = [
      [32, 12],
      [40, 22],
      [48, 36],
      [44, 50],
      [32, 54],
      [20, 50],
      [16, 36],
      [24, 22]
    ];
    ctx.fillPolygon(midPts, C_STEEL);

    // Núcleo caliente y vivo
    const corePts = [
      [32, 24],
      [38, 34],
      [38, 46],
      [32, 50],
      [26, 46],
      [26, 34]
    ];
    ctx.fillPolygon(corePts, C_ACCENT_ORANGE);
    ctx.fillCircle(32, 42, 5, C_CHROME);
  },

  // 16. ROCKET (Lanzador de Entrenamiento / Pantalla Enfoque)
  'gym-rocket': (ctx) => {
    // Ojiva y fuselaje
    ctx.fillPolygon([[32, 6], [44, 26], [42, 46], [22, 46], [20, 26]], C_BLACK);
    ctx.fillPolygon([[32, 9], [41, 26], [39, 44], [25, 44], [23, 26]], C_STEEL);
    ctx.fillPolygon([[32, 12], [35, 26], [34, 42], [30, 42], [29, 26]], C_CHROME);

    // Ventana de control
    ctx.fillCircle(32, 28, 4, C_BLACK);
    ctx.fillCircle(32, 28, 2, C_CHROME);

    // Alerones laterales
    ctx.fillPolygon([[20, 34], [10, 48], [22, 46]], C_SILVER);
    ctx.fillPolygon([[44, 34], [54, 48], [42, 46]], C_SILVER);

    // Fuego del propulsor
    ctx.fillPolygon([[25, 46], [32, 58], [39, 46]], C_ACCENT_ORANGE);
    ctx.fillPolygon([[28, 46], [32, 53], [36, 46]], C_CHROME);
  }
};

const C_MUSCLE_HOT = [255, 107, 53, 255];   // Fuego de activación muscular
const C_MUSCLE_AMBER = [255, 170, 0, 255]; // Resplandor muscular secundario

const warmupIcons = {
  // 17. WARMUP SCAPULAR (Retracción y Protracción Escapular con detalle anatómico y activación)
  'warmup-scapular': (ctx) => {
    // Fondo sutil de foco muscular
    ctx.fillCircle(64, 60, 48, [20, 25, 34, 180]);
    // Cabeza y vértebras cervicales
    ctx.fillCircle(64, 24, 12, C_BLACK);
    ctx.fillCircle(64, 24, 9, C_SILVER);
    ctx.fillCircle(64, 22, 6, C_CHROME);
    ctx.fillRect(60, 34, 8, 8, C_STEEL);
    // Caja torácica posterior y espalda dorsal
    ctx.fillPolygon([[36, 40], [92, 40], [82, 102], [46, 102]], C_BLACK);
    ctx.fillPolygon([[40, 42], [88, 42], [78, 98], [50, 98]], C_DARK_SLATE);
    // Columna vertebral torácica con segmentos
    ctx.strokeLine(64, 40, 64, 102, 3, C_CHROME);
    for (let y = 46; y <= 96; y += 10) {
      ctx.fillRect(61, y, 6, 3, C_SILVER);
    }
    // Músculos trapecios y romboides
    ctx.fillPolygon([[64, 38], [86, 46], [64, 76], [42, 46]], [60, 70, 88, 220]);
    // Escápula izquierda con iluminación de activación muscular
    ctx.fillPolygon([[40, 46], [58, 48], [50, 76]], C_MUSCLE_HOT);
    ctx.fillPolygon([[42, 48], [56, 50], [49, 72]], C_MUSCLE_AMBER);
    // Escápula derecha con iluminación de activación muscular
    ctx.fillPolygon([[88, 46], [70, 48], [78, 76]], C_MUSCLE_HOT);
    ctx.fillPolygon([[86, 48], [72, 50], [79, 72]], C_MUSCLE_AMBER);
    // Pivotes de articulación acromioclavicular y glenoidea
    ctx.fillCircle(34, 46, 6, C_BLACK);
    ctx.fillCircle(34, 46, 4, C_CHROME);
    ctx.fillCircle(94, 46, 6, C_BLACK);
    ctx.fillCircle(94, 46, 4, C_CHROME);
    // Arcos cinemáticos de rotación y deslizamiento escapular 360°
    ctx.strokeCircle(46, 60, 20, 3, C_ACCENT_ORANGE);
    ctx.strokeCircle(82, 60, 20, 3, C_ACCENT_ORANGE);
    // Flechas de dirección de movimiento articular (retracción / elevación / protracción)
    ctx.fillPolygon([[46, 38], [52, 44], [40, 44]], C_CHROME);
    ctx.fillPolygon([[82, 38], [88, 44], [76, 44]], C_CHROME);
    ctx.fillPolygon([[46, 82], [40, 76], [52, 76]], C_CHROME);
    ctx.fillPolygon([[82, 82], [76, 76], [88, 76]], C_CHROME);
  },

  // 18. WARMUP DISLOCATE (Dislocaciones de Hombro con Banda / Pica sobre la cabeza)
  'warmup-dislocate': (ctx) => {
    // Fondo de movilidad
    ctx.fillCircle(64, 64, 52, [20, 25, 34, 180]);
    // Suelo
    ctx.fillRect(20, 118, 88, 4, C_DARK_SLATE);
    // Atleta erguido de cuerpo entero
    ctx.fillCircle(64, 38, 11, C_BLACK);
    ctx.fillCircle(64, 38, 8, C_SILVER);
    // Cuello y torso
    ctx.fillRect(60, 48, 8, 8, C_STEEL);
    ctx.fillPolygon([[48, 54], [80, 54], [74, 90], [54, 90]], C_BLACK);
    ctx.fillPolygon([[50, 56], [78, 56], [72, 88], [56, 88]], C_DARK_SLATE);
    // Piernas
    ctx.strokeLine(58, 90, 52, 118, 5, C_STEEL);
    ctx.strokeLine(70, 90, 76, 118, 5, C_STEEL);
    // Hombros / Deltoides iluminados en activación
    ctx.fillCircle(44, 56, 9, C_MUSCLE_HOT);
    ctx.fillCircle(44, 56, 6, C_MUSCLE_AMBER);
    ctx.fillCircle(84, 56, 9, C_MUSCLE_HOT);
    ctx.fillCircle(84, 56, 6, C_MUSCLE_AMBER);
    // Brazos extendidos en 'Y' sujetando el bastón/banda
    ctx.strokeLine(44, 56, 22, 26, 6, C_BLACK);
    ctx.strokeLine(44, 56, 22, 26, 4, C_SILVER);
    ctx.strokeLine(84, 56, 106, 26, 6, C_BLACK);
    ctx.strokeLine(84, 56, 106, 26, 4, C_SILVER);
    // Bastón rígido / Banda elástica horizontal sobre la cabeza
    ctx.strokeLine(12, 24, 116, 24, 6, C_BLACK);
    ctx.strokeLine(14, 24, 114, 24, 4, C_CHROME);
    ctx.fillCircle(14, 24, 4, C_ACCENT_ORANGE);
    ctx.fillCircle(114, 24, 4, C_ACCENT_ORANGE);
    // Gran arco de movilidad escapulo-humeral 180°
    ctx.strokeCircle(64, 64, 46, 3, C_ACCENT_ORANGE);
    // Flechas de arco adelante / atrás
    ctx.fillPolygon([[64, 14], [72, 20], [56, 20]], C_CHROME);
    ctx.fillPolygon([[20, 56], [24, 48], [16, 48]], C_ACCENT_ORANGE);
    ctx.fillPolygon([[108, 56], [112, 48], [104, 48]], C_ACCENT_ORANGE);
  },

  // 19. WARMUP ROTATOR (Rotación Externa de Manguito Rotador a 90° con Banda)
  'warmup-rotator': (ctx) => {
    ctx.fillCircle(64, 64, 50, [20, 25, 34, 180]);
    // Torso lateral erguido
    ctx.fillRoundedRect(32, 34, 26, 68, 8, C_BLACK);
    ctx.fillRoundedRect(34, 36, 22, 64, 6, C_DARK_SLATE);
    // Cabeza de perfil
    ctx.fillCircle(45, 24, 10, C_BLACK);
    ctx.fillCircle(45, 24, 7, C_SILVER);
    // Músculos del manguito rotador (infraespinoso / redondo menor) iluminados
    ctx.fillCircle(42, 50, 11, C_MUSCLE_HOT);
    ctx.fillCircle(42, 50, 7, C_MUSCLE_AMBER);
    // Brazo superior pegado al torso
    ctx.fillRect(54, 46, 10, 36, C_STEEL);
    // Codo flexionado exactamente a 90 grados
    ctx.fillCircle(59, 82, 8, C_BLACK);
    ctx.fillCircle(59, 82, 5, C_CHROME);
    // Antebrazo rotando hacia afuera
    ctx.strokeLine(59, 82, 104, 72, 8, C_BLACK);
    ctx.strokeLine(59, 82, 104, 72, 5, C_SILVER);
    // Mano empuñada
    ctx.fillCircle(104, 72, 7, C_CHROME);
    // Banda elástica tensada fijada a poste
    ctx.strokeLine(104, 72, 122, 70, 5, C_ACCENT_ORANGE);
    ctx.fillRect(120, 40, 6, 60, C_BLACK);
    // Guía de arco de rotación externa de 90°
    ctx.strokeCircle(59, 82, 34, 3, C_ACCENT_ORANGE);
    // Flecha de rotación hacia el plano exterior
    ctx.fillPolygon([[102, 58], [108, 66], [96, 66]], C_CHROME);
  },

  // 20. WARMUP CHEST OPEN (Apertura Torácica y Estiramiento Dinámico de Pectorales)
  'warmup-chest-open': (ctx) => {
    ctx.fillCircle(64, 64, 52, [20, 25, 34, 180]);
    // Cabeza frontal
    ctx.fillCircle(64, 24, 11, C_BLACK);
    ctx.fillCircle(64, 24, 8, C_SILVER);
    ctx.fillRect(60, 34, 8, 8, C_STEEL);
    // Esternón central
    ctx.fillRect(62, 42, 4, 46, C_CHROME);
    // Pectoral izquierdo en máxima activación y elongación
    ctx.fillPolygon([[60, 44], [32, 48], [34, 74], [60, 70]], C_MUSCLE_HOT);
    ctx.fillPolygon([[58, 46], [36, 50], [38, 70], [58, 68]], C_MUSCLE_AMBER);
    // Pectoral derecho en máxima activación y elongación
    ctx.fillPolygon([[68, 44], [96, 48], [94, 74], [68, 70]], C_MUSCLE_HOT);
    ctx.fillPolygon([[70, 46], [92, 50], [90, 70], [70, 68]], C_MUSCLE_AMBER);
    // Brazos abiertos en cruz extendidos
    ctx.strokeLine(32, 50, 10, 56, 7, C_BLACK);
    ctx.strokeLine(32, 50, 10, 56, 4, C_SILVER);
    ctx.strokeLine(96, 50, 118, 56, 7, C_BLACK);
    ctx.strokeLine(96, 50, 118, 56, 4, C_SILVER);
    // Flechas de apertura dinámica horizontal
    ctx.strokeLine(48, 86, 20, 86, 3, C_ACCENT_ORANGE);
    ctx.fillPolygon([[14, 86], [22, 80], [22, 92]], C_CHROME);
    ctx.strokeLine(80, 86, 108, 86, 3, C_ACCENT_ORANGE);
    ctx.fillPolygon([[114, 86], [106, 80], [106, 92]], C_CHROME);
  },

  // 21. WARMUP HIP MOBILITY (Movilidad Dinámica de Cadera 90/90 y Rotación)
  'warmup-hip-mobility': (ctx) => {
    ctx.fillCircle(64, 64, 52, [20, 25, 34, 180]);
    // Suelo
    ctx.fillRect(10, 110, 108, 4, C_DARK_SLATE);
    // Pelvis y cadera
    ctx.fillRoundedRect(44, 46, 40, 24, 6, C_BLACK);
    ctx.fillRoundedRect(46, 48, 36, 20, 5, C_DARK_SLATE);
    // Articulaciones de cadera (glúteo medio / flexores) iluminadas
    ctx.fillCircle(48, 58, 12, C_MUSCLE_HOT);
    ctx.fillCircle(48, 58, 8, C_MUSCLE_AMBER);
    ctx.fillCircle(80, 58, 12, C_MUSCLE_HOT);
    ctx.fillCircle(80, 58, 8, C_MUSCLE_AMBER);
    // Pierna izquierda en 90°
    ctx.strokeLine(48, 58, 20, 72, 8, C_SILVER);
    ctx.fillCircle(20, 72, 5, C_CHROME);
    ctx.strokeLine(20, 72, 34, 104, 7, C_SILVER);
    // Pierna derecha en 90°
    ctx.strokeLine(80, 58, 108, 50, 8, C_SILVER);
    ctx.fillCircle(108, 50, 5, C_CHROME);
    ctx.strokeLine(108, 50, 94, 82, 7, C_SILVER);
    // Arcos de rotación interna y externa de cadera
    ctx.strokeCircle(48, 58, 22, 3, C_ACCENT_ORANGE);
    ctx.strokeCircle(80, 58, 22, 3, C_ACCENT_ORANGE);
    ctx.fillPolygon([[48, 34], [54, 40], [42, 40]], C_CHROME);
    ctx.fillPolygon([[80, 34], [86, 40], [74, 40]], C_CHROME);
  },

  // 22. WARMUP GLUTE BRIDGE (Puente de Glúteo e Isquios con Extensión Pélvica)
  'warmup-glute-bridge': (ctx) => {
    ctx.fillCircle(64, 64, 52, [20, 25, 34, 180]);
    // Suelo / colchoneta
    ctx.fillRect(8, 110, 112, 5, C_DARK_SLATE);
    // Hombros y cabeza apoyados en el suelo
    ctx.fillCircle(26, 102, 10, C_BLACK);
    ctx.fillCircle(26, 102, 7, C_SILVER);
    // Espalda y torso en inclinación ascendente hacia el puente
    ctx.strokeLine(26, 102, 68, 62, 10, C_BLACK);
    ctx.strokeLine(26, 102, 68, 62, 7, C_STEEL);
    // Glúteo Mayor e Isquiosurales contraídos en extensión completa
    ctx.fillCircle(68, 62, 15, C_MUSCLE_HOT);
    ctx.fillCircle(68, 62, 10, C_MUSCLE_AMBER);
    // Muslos descendiendo hacia las rodillas
    ctx.strokeLine(68, 62, 98, 76, 9, C_SILVER);
    ctx.fillCircle(98, 76, 6, C_CHROME);
    // Pantorrillas verticales apoyadas firmes en el suelo
    ctx.strokeLine(98, 76, 98, 110, 8, C_SILVER);
    ctx.fillCircle(98, 108, 6, C_CHROME);
    // Gran vector de empuje pélvico hacia arriba
    ctx.strokeLine(68, 50, 68, 18, 5, C_ACCENT_ORANGE);
    ctx.fillPolygon([[68, 12], [76, 24], [60, 24]], C_CHROME);
  },

  // 23. WARMUP CABLE WARMUP (Serie de Aproximación en Polea / Máquina Ligera al 40%)
  'warmup-cable-warmup': (ctx) => {
    ctx.fillCircle(64, 64, 52, [20, 25, 34, 180]);
    // Estructura de polea
    ctx.fillRect(16, 14, 8, 100, C_BLACK);
    ctx.fillRect(16, 14, 84, 8, C_BLACK);
    ctx.strokeLine(16, 16, 100, 16, 3, C_STEEL);
    // Rueda de polea giratoria
    ctx.fillCircle(84, 22, 11, C_BLACK);
    ctx.fillCircle(84, 22, 8, C_SILVER);
    ctx.fillCircle(84, 22, 3, C_CHROME);
    // Cable descendente
    ctx.strokeLine(84, 24, 76, 58, 3, C_CHROME);
    // Barra de agarre
    ctx.strokeLine(60, 58, 92, 58, 6, C_BLACK);
    ctx.strokeLine(62, 58, 90, 58, 4, C_CHROME);
    // Atleta realizando el jalón de activación
    ctx.fillCircle(68, 70, 9, C_SILVER);
    ctx.fillPolygon([[60, 78], [76, 78], [72, 110], [64, 110]], C_DARK_SLATE);
    // Dorsal / Bíceps iluminados en activación
    ctx.fillPolygon([[60, 80], [70, 80], [68, 98], [62, 98]], C_MUSCLE_HOT);
    ctx.fillPolygon([[61, 82], [68, 82], [67, 95], [63, 95]], C_MUSCLE_AMBER);
    // Placas de carga ligera 40%
    ctx.fillRoundedRect(30, 48, 24, 16, 4, C_BLACK);
    ctx.strokeCircle(42, 56, 5, 2, C_ACCENT_ORANGE);
    // Flecha de recorrido controlado
    ctx.strokeLine(84, 64, 84, 88, 3, C_ACCENT_ORANGE);
    ctx.fillPolygon([[84, 94], [78, 86], [90, 86]], C_CHROME);
  },

  // 24. WARMUP CORE PLANK (Plancha Isométrica y Estabilidad del Núcleo Abdominal)
  'warmup-core-plank': (ctx) => {
    ctx.fillCircle(64, 64, 52, [20, 25, 34, 180]);
    // Suelo
    ctx.fillRect(8, 108, 112, 5, C_DARK_SLATE);
    // Apoyo en antebrazos
    ctx.strokeLine(30, 108, 30, 86, 7, C_SILVER);
    ctx.strokeLine(30, 108, 46, 108, 6, C_CHROME);
    // Cabeza neutra
    ctx.fillCircle(22, 78, 9, C_BLACK);
    ctx.fillCircle(22, 78, 6, C_SILVER);
    // Columna y cuerpo recto en plancha isométrica
    ctx.strokeLine(30, 86, 106, 94, 10, C_BLACK);
    ctx.strokeLine(30, 86, 106, 94, 7, C_STEEL);
    // Puntas de pies firmes
    ctx.fillCircle(106, 104, 6, C_CHROME);
    // Núcleo / Faja abdominal y lumbares con resplandor completo
    ctx.fillCircle(64, 88, 14, C_MUSCLE_HOT);
    ctx.fillCircle(64, 88, 9, C_MUSCLE_AMBER);
    ctx.fillCircle(64, 88, 4, C_CHROME);
    // Anillo concéntrico de tensión del core y vectores de estabilidad
    ctx.strokeCircle(64, 88, 22, 3, C_ACCENT_ORANGE);
    ctx.strokeLine(48, 64, 80, 64, 3, C_CHROME);
    ctx.fillPolygon([[44, 64], [50, 60], [50, 68]], C_CHROME);
    ctx.fillPolygon([[84, 64], [78, 60], [78, 68]], C_CHROME);
  }
};

const outputDir = path.join(__dirname, '../assets/icons');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

let generatedCount = 0;
for (const [name, drawFn] of Object.entries(icons)) {
  const pngBuf = createPng(64, 64, drawFn);
  const filePath = path.join(outputDir, `${name}.png`);
  fs.writeFileSync(filePath, pngBuf);
  generatedCount++;
}

for (const [name, drawFn] of Object.entries(warmupIcons)) {
  const pngBuf = createPng(128, 128, drawFn);
  const filePath = path.join(outputDir, `${name}.png`);
  fs.writeFileSync(filePath, pngBuf);
  generatedCount++;
}

console.log(`PASS: Se generaron ${generatedCount} íconos y dibujos de calentamiento en assets/icons/`);
