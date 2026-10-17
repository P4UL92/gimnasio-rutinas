const CACHE_NAME = 'gym-rutinas-pro-v6';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './routines-data.js',
  './visual-engine.js',
  './app.js',
  './manifest.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/sprites/anatomy_body_map.jpg',
  './assets/sprites/gym_exercise_sprite_sheet_closegrip.jpg',
  './assets/sprites/gym_exercise_sprite_sheet_fullbody.jpg',
  './assets/sprites/gym_exercise_sprite_sheet_chest_triceps.jpg',
  './assets/sprites/gym_exercise_sprite_sheet_legs_shoulders.jpg',
  './assets/sprites/sprite_back_row_pullover.jpg',
  './assets/sprites/sprite_bicep_hammer_incline_chest.jpg',
  './assets/sprites/sprite_chest_pecdeck_cable_crossover.jpg',
  './assets/sprites/sprite_triceps_overhead_dips.jpg',
  './assets/sprites/sprite_legs_quad_ext_hamstring_curl.jpg',
  './assets/sprites/sprite_legs_hack_squat_calves.jpg',
  './assets/sprites/sprite_glutes_hipthrust_rdl.jpg',
  './assets/sprites/sprite_legs_adductor_abductor.jpg',
  './assets/sprites/sprite_shoulders_lateral_facepull.jpg',
  './assets/sprites/sprite_shoulders_reardelt_shrugs_abs.jpg'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
