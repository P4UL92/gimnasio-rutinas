const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const routinesCode = fs.readFileSync(path.join(root, 'routines-data.js'), 'utf8');
const visualsCode = fs.readFileSync(path.join(root, 'visual-engine.js'), 'utf8');
const appCode = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost:8080/',
  runScripts: 'outside-only'
});

const { window } = dom;
window.eval(routinesCode);
window.eval(visualsCode);
window.eval(appCode);

const app = window.GymApp;
assert.ok(app, 'GymApp debe inicializarse en window');
assert.ok(window.GYM_VISUALS, 'GYM_VISUALS debe inicializarse en window');

// 1. Verificar marcas base exactas solicitadas por el usuario en Lunes
app.restoreOriginalSchedule();
app.selectDay('lunes');
const state = app.getState();

const lunesExercises = state.schedule.lunes.exercises;
assert.equal(lunesExercises.length, 6, 'Lunes debe tener 6 ejercicios');

const exPoleaEstrecho = lunesExercises.find(e => e.id === 'lun-espalda-polea-estrecho');
assert.ok(exPoleaEstrecho, 'Debe existir ejercicio de espalda en polea agarre estrecho');
assert.equal(exPoleaEstrecho.loadType, 'nivel');
assert.equal(exPoleaEstrecho.loadValue, 6);
assert.equal(exPoleaEstrecho.sets, 4);
assert.equal(exPoleaEstrecho.reps, 12);

const exMaquinaAmplio = lunesExercises.find(e => e.id === 'lun-espalda-maquina-amplio');
assert.ok(exMaquinaAmplio, 'Debe existir ejercicio de espalda con agarre amplio en máquina');
assert.equal(exMaquinaAmplio.loadType, 'kg');
assert.equal(exMaquinaAmplio.loadValue, 20);
assert.equal(exMaquinaAmplio.sets, 4);
assert.equal(exMaquinaAmplio.reps, 12);

const exBicepsPolea = lunesExercises.find(e => e.id === 'lun-biceps-press-polea');
assert.ok(exBicepsPolea, 'Debe existir ejercicio de bíceps en press/curl en polea');
assert.equal(exBicepsPolea.loadType, 'kg');
assert.equal(exBicepsPolea.loadValue, 10);
assert.equal(exBicepsPolea.sets, 4);
assert.equal(exBicepsPolea.reps, 12);

// 2. Verificar CERO SVGs en todo el DOM (100% Sprites e Imágenes Rasterizadas + CSS)
const doc = window.document;
const allDomSvgs = doc.querySelectorAll('svg');
assert.equal(allDomSvgs.length, 0, 'El DOM completo debe tener 0 etiquetas <svg> (100% libre de SVGs)');

const exerciseSprites = doc.querySelectorAll('.exercise-sprite-box');
assert.equal(exerciseSprites.length, 6, 'Cada uno de los 6 ejercicios del día debe renderizar su componente de sprite rasterizado');
const spriteFrames = doc.querySelectorAll('.exercise-sprite-frame');
assert.equal(spriteFrames.length, 6, 'Cada ejercicio debe tener su fotograma de animación por sprite');

const anatomyRasterImg = doc.querySelector('#day-anatomy-panel .anatomy-raster-img');
assert.ok(anatomyRasterImg, 'Debe renderizar el mapa anatómico corporal rasterizado');
assert.ok(fs.existsSync(path.join(root, 'assets/sprites/anatomy_body_map.jpg')), 'El archivo anatomy_body_map.jpg debe existir en disco');
const activeHotspots = doc.querySelectorAll('#day-anatomy-panel .anatomy-hotspot.is-active');
assert.ok(activeHotspots.length >= 4, 'El mapa anatómico debe iluminar los hotspots musculares activos del día');

const barCols = doc.querySelectorAll('#daily-bars-chart .bar-col');
assert.equal(barCols.length, 7, 'El gráfico de barras debe mostrar los 7 días (Lunes a Domingo)');

const muscleRows = doc.querySelectorAll('#muscle-stats-tbody tr');
assert.equal(muscleRows.length, 5, 'La tabla accesible del gráfico de distribución muscular debe tener 5 grupos');

// 3. Verificar todos los días de Lunes a Sábado y que cada ejercicio tenga su imagen de sprite real en disco
const catalog = window.GYM_VISUALS.EXERCISE_SPRITE_CATALOG;
assert.ok(catalog && Object.keys(catalog).length >= 24, 'El catálogo debe incluir los 24 patrones biomecánicos de ejercicios');
for (const [key, item] of Object.entries(catalog)) {
  const fullSpritePath = path.join(root, item.spriteUrl);
  assert.ok(fs.existsSync(fullSpritePath), `El archivo de sprite para ${key} debe existir en disco: ${item.spriteUrl}`);
}

const trainingDays = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const detectedTypesSet = new Set();
for (const d of trainingDays) {
  assert.ok(state.schedule[d].exercises.length >= 6, `${d} debe tener su rutina completa`);
  for (const ex of state.schedule[d].exercises) {
    assert.equal(ex.sets, 4, `${ex.name} en ${d} debe tener 4 series`);
    assert.equal(ex.reps, 12, `${ex.name} en ${d} debe tener 12 repeticiones`);
    const spriteInfo = window.GYM_VISUALS.getExerciseSpriteInfo(ex);
    assert.ok(spriteInfo && spriteInfo.spriteUrl, `${ex.name} debe tener sprite asignado`);
    assert.ok(fs.existsSync(path.join(root, spriteInfo.spriteUrl)), `La imagen ${spriteInfo.spriteUrl} de ${ex.name} debe existir`);
    detectedTypesSet.add(window.GYM_VISUALS.detectExerciseAnimationType(ex));
  }
}
assert.ok(detectedTypesSet.size >= 22, `Los ejercicios de la semana deben cubrir todos los movimientos específicos (detectados: ${detectedTypesSet.size})`);

// 4. Verificar cambio de unidad kg <-> Nivel, ajuste de peso y registro automático de Sobrecarga Progresiva (PRs / 1RM)
const prevPrCount = (app.getState().progressionHistory || []).length;
app.adjustExerciseLoad('lunes', 'lun-espalda-polea-estrecho', 1);
assert.equal(
  app.getState().schedule.lunes.exercises[0].loadValue,
  7,
  'Nivel debe subir de 6 a 7'
);
assert.equal(
  app.getState().progressionHistory.length,
  prevPrCount + 1,
  'Al subir de carga debe registrarse automáticamente un récord de sobrecarga progresiva (PR)'
);
assert.ok(app.getState().progressionHistory[0].e1rmKg > 0, 'El PR debe incluir el cálculo de 1RM estimado (Fórmula de Epley)');

app.adjustExerciseLoad('lunes', 'lun-espalda-polea-estrecho', -1);
assert.equal(
  app.getState().schedule.lunes.exercises[0].loadValue,
  6,
  'Nivel debe regresar a 6'
);

// 5. Verificar Visor Técnico Pantalla Completa de 3 Fases (#sprite-viewer-dialog)
app.openSpriteViewerDialog(exPoleaEstrecho);
assert.equal(doc.getElementById('sprite-viewer-title').textContent, exPoleaEstrecho.name);
app.setSpriteViewerPhase('phase-3');
assert.ok(doc.getElementById('sprite-viewer-stage').classList.contains('mode-phase-3'), 'El visor debe cambiar a la Fase 3 (Contracción Máxima)');
app.setSpriteViewerPhase('full-strip');
assert.ok(doc.getElementById('sprite-viewer-stage').classList.contains('mode-full-strip'), 'El visor debe permitir ver las 3 fases juntas');
app.setSpriteViewerSpeed('1.4s');
assert.equal(doc.getElementById('sprite-viewer-frame').style.animationDuration, '1.4s', 'El visor debe ajustar la velocidad de cadencia');

// 6. Verificar Checklist Interactivo de Calentamiento Articular (5 min)
const warmupItems = doc.querySelectorAll('#warmup-steps-list .warmup-step-btn');
assert.equal(warmupItems.length, 4, 'Debe mostrar los 4 pasos de calentamiento articular específicos del día');
app.toggleWarmupStep('lunes', 'w1');
assert.equal(app.getState().warmupByDay.lunes.w1, true, 'El paso w1 de calentamiento debe marcarse como completado');
app.completeAllWarmupSteps('lunes');
assert.ok(doc.getElementById('warmup-progress-pill').textContent.includes('4 / 4'), 'Todos los pasos de calentamiento deben quedar completados');

// 7. Verificar Modo Nativo (WakeLock)
app.toggleWakeLock(true);
assert.equal(app.getState().wakeLockEnabled, true, 'WakeLock debe activarse');
app.toggleWakeLock(false);
assert.equal(app.getState().wakeLockEnabled, false, 'WakeLock debe desactivarse');

// 8. Verificar marcado de series (4 series) y actualización de tonelaje
app.toggleSetCompletion('lunes', 'lun-espalda-maquina-amplio', 0);
assert.equal(
  app.getState().schedule.lunes.exercises[1].completedSets[0],
  true,
  'La serie 1 debe quedar marcada como completada'
);
assert.ok(
  doc.getElementById('kpi-done-kg').textContent.includes('240 kg'),
  'El tonelaje movido debe actualizarse a 240 kg (1 serie x 12 reps x 20 kg)'
);

// 9. Verificar registro de sesión en el historial
app.logCurrentWorkoutSession();
assert.equal(app.getState().history.length, 1, 'Debe guardar la sesión en el historial');

// 10. Verificar excepción: Mover un día al Domingo
assert.equal(app.getState().schedule.domingo.exercises.length, 0, 'Domingo inicia libre');
app.moveDayToSunday('miercoles');
assert.equal(
  app.getState().schedule.miercoles.status,
  'skipped_to_sunday',
  'Miércoles debe marcarse como reprogramado al domingo'
);
assert.equal(
  app.getState().schedule.miercoles.exercises.length,
  0,
  'Miércoles queda libre de ejercicios'
);
assert.equal(
  app.getState().schedule.domingo.exercises.length,
  6,
  'Domingo recibe los 6 ejercicios del Miércoles'
);

// 11. Verificar restaurar semana original y recorrer días al Domingo
app.restoreOriginalSchedule();
assert.equal(app.getState().schedule.domingo.exercises.length, 0);
app.shiftChainToSunday('jueves');
assert.equal(app.getState().schedule.jueves.status, 'skipped_to_sunday');
assert.equal(
  app.getState().schedule.domingo.exercises.length,
  6,
  'Al recorrer desde Jueves, Sábado pasa al Domingo'
);

// 12. Verificar Cronómetro de Sesión (Inicio, Vuelta, Pausa, Reinicio)
app.restoreOriginalSchedule();
app.selectDay('lunes');
assert.equal(doc.getElementById('session-stopwatch-digits').textContent, '00:00:00');
app.startSessionStopwatch();
assert.equal(doc.getElementById('btn-stopwatch-toggle').textContent.trim(), '⏸ Pausar');
assert.ok(app.getStopwatchElapsedMs() >= 0);

app.lapSessionStopwatch();
const laps = doc.querySelectorAll('#stopwatch-laps-list .lap-item');
assert.equal(laps.length, 1, 'Debe haber 1 vuelta registrada');
assert.ok(laps[0].textContent.includes('Vuelta 1'));

app.pauseSessionStopwatch();
assert.equal(doc.getElementById('btn-stopwatch-toggle').textContent.trim(), '▶ Iniciar');

app.resetSessionStopwatch();
assert.equal(doc.getElementById('session-stopwatch-digits').textContent, '00:00:00');
assert.equal(doc.querySelectorAll('#stopwatch-laps-list .lap-item').length, 0);

// 13. Verificar Cronómetro de Serie (TUT - Time Under Tension) y avance de serie
const tutButtons = doc.querySelectorAll('.btn-tut-stopwatch');
assert.equal(tutButtons.length, 6, 'Cada ejercicio debe tener su botón de cronómetro de serie (TUT)');

const firstEx = state.schedule.lunes.exercises[0];
const initialDoneSets = (firstEx.completedSets || []).filter(Boolean).length;
app.startTutStopwatch('lunes', firstEx.id);
const timingBtn = doc.querySelector(`.btn-tut-stopwatch[data-exercise-id="${firstEx.id}"]`);
assert.ok(timingBtn.classList.contains('is-timing'), 'El botón debe activarse en modo cronometraje');

app.stopTutStopwatch();
app.stopRestTimer();
const afterDoneSets = (firstEx.completedSets || []).filter(Boolean).length;
assert.equal(afterDoneSets, initialDoneSets + 1, 'Al finalizar TUT debe marcar la serie como completada');

// 14. Verificar Modo Flotante Dual (Descanso vs Cronómetro)
app.switchFloatingTimerMode('stopwatch');
assert.equal(doc.getElementById('panel-timer-stopwatch').hidden, false);
assert.equal(doc.getElementById('panel-timer-rest').hidden, true);

app.switchFloatingTimerMode('rest');
assert.equal(doc.getElementById('panel-timer-rest').hidden, false);
assert.equal(doc.getElementById('panel-timer-stopwatch').hidden, true);

// 15. Verificar que el registro de sesión guarde la duración del cronómetro
app.startSessionStopwatch();
app.logCurrentWorkoutSession();
const lastHistory = app.getState().history[0];
assert.ok(typeof lastHistory.durationMs === 'number', 'El historial debe registrar durationMs');
assert.ok(typeof lastHistory.durationText === 'string', 'El historial debe registrar durationText');
app.resetSessionStopwatch();
app.stopRestTimer();

app.restoreOriginalSchedule();
console.log('PASS: Todas las pruebas (0% SVGs en DOM, 24 patrones de sprites en 3 fases, visor técnico fullscreen, mapa anatómico rasterizado, calentamiento articular, sobrecarga progresiva 1RM, WakeLock, cargas kg/Nivel, series 4x12, excepciones al Domingo y cronómetro) pasaron con éxito.');
process.exit(0);
