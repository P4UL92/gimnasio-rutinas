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

console.log(`PASS: Se generaron ${generatedCount} íconos PNG únicos de gimnasio en assets/icons/`);
