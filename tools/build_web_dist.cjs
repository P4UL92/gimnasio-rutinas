const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const target = path.join(root, 'www');

if (path.dirname(target) !== root || path.basename(target) !== 'www') {
  throw new Error('Directorio de compilación inválido');
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });

const webFiles = [
  'index.html',
  'styles.css',
  'routines-data.js',
  'app.js',
  'manifest.json',
  'sw.js'
];

for (const file of webFiles) {
  const src = path.join(root, file);
  if (!fs.existsSync(src)) {
    throw new Error(`Archivo requerido no encontrado: ${file}`);
  }
  fs.copyFileSync(src, path.join(target, file));
}

const assetsDir = path.join(root, 'assets');
if (fs.existsSync(assetsDir)) {
  fs.cpSync(assetsDir, path.join(target, 'assets'), { recursive: true });
}

console.log('Distribución web lista en www/');
