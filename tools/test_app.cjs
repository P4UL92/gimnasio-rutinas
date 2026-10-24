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

// 2.1 Verificar que el nombre del ejercicio esté como TÍTULO de la card (arriba) y que la imagen NO tenga texto superpuesto
const renderedCards = doc.querySelectorAll('#exercises-list .exercise-card');
assert.equal(renderedCards.length, 6, 'Deben renderizarse las 6 cards de ejercicios del día');
renderedCards.forEach((card, idx) => {
  const firstChild = card.firstElementChild;
  assert.ok(firstChild && firstChild.classList.contains('exercise-card-header'), `La card ${idx + 1} debe tener el encabezado con el título en la parte superior`);
  const titleEl = firstChild.querySelector('h3.exercise-card-title');
  assert.ok(titleEl && titleEl.textContent.trim().length > 0, `La card ${idx + 1} debe mostrar el nombre del ejercicio como título de la card`);
  const spriteBox = card.querySelector('.exercise-sprite-box');
  assert.ok(spriteBox, `La card ${idx + 1} debe incluir el contenedor de imagen del ejercicio`);
  assert.equal(spriteBox.textContent.trim(), '', `La imagen del ejercicio en la card ${idx + 1} NO debe contener texto superpuesto`);
  assert.equal(spriteBox.querySelectorAll('.sprite-overlay-badge, .sprite-overlay-bottom').length, 0, 'No deben existir overlays de texto sobre la imagen del ejercicio');
});

const anatomyRasterImg = doc.querySelector('#day-anatomy-panel .anatomy-raster-img');
assert.ok(anatomyRasterImg, 'Debe renderizar el mapa anatómico corporal rasterizado');
assert.ok(fs.existsSync(path.join(root, 'assets/sprites/anatomy_body_map.jpg')), 'El archivo anatomy_body_map.jpg debe existir en disco');
const activeHotspots = doc.querySelectorAll('#day-anatomy-panel .anatomy-hotspot.is-active');
assert.ok(activeHotspots.length >= 4, 'El mapa anatómico debe iluminar los hotspots musculares activos del día');

// Validación de correspondencia anatómica estricta por día (Cero falsos positivos)
app.selectDay('miercoles');
const wedActiveTags = [...doc.querySelectorAll('#day-anatomy-panel .muscle-zone.is-active')].map(el => el.textContent.trim());
assert.ok(!wedActiveTags.includes('Bíceps Braquial'), 'Miércoles de pierna NO debe tener tag activo de Bíceps Braquial');
assert.ok(!wedActiveTags.includes('Pectoral'), 'Miércoles de pierna NO debe tener tag activo de Pectoral');
assert.ok(wedActiveTags.includes('Cuádriceps') && wedActiveTags.includes('Gemelos / Sóleo'), 'Miércoles debe incluir Cuádriceps y Gemelos');
const wedActiveBicepsDots = doc.querySelectorAll('#day-anatomy-panel .anatomy-hotspot.is-active[title="Bíceps Braquial"]');
assert.equal(wedActiveBicepsDots.length, 0, 'Miércoles no debe tener hotspots activos de bíceps');

app.selectDay('jueves');
const thuActiveTags = [...doc.querySelectorAll('#day-anatomy-panel .muscle-zone.is-active')].map(el => el.textContent.trim());
assert.ok(!thuActiveTags.includes('Pectoral'), 'Jueves de Hombro/Core NO debe incluir Pectoral');
assert.ok(thuActiveTags.includes('Deltoides') && thuActiveTags.includes('Core / Abdomen'), 'Jueves debe incluir Deltoides y Core');
const thuActiveChestDots = doc.querySelectorAll('#day-anatomy-panel .anatomy-hotspot.is-active[title="Pectoral Mayor"]');
assert.equal(thuActiveChestDots.length, 0, 'Jueves no debe tener hotspots activos de pectoral');
app.selectDay('lunes');

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

// 16. Verificar Módulo Élite 1: Calculadora de Discos / Placas / 1RM y Registro Corporal Antropométrico
const calcResult = app.renderCalculatorModal();
assert.ok(calcResult && calcResult.breakdown, 'La calculadora de discos debe retornar el desglose por lado');
app.openCalculatorDialog(100, 10);
const platePills = doc.querySelectorAll('#calc-plates-visual .plate-pill');
assert.ok(platePills.length > 0, 'Debe renderizar píldoras visuales de discos olímpicos por lado (ej. para 100kg con barra de 20kg -> 40kg por lado)');
const zonesRows = doc.querySelectorAll('#calc-1rm-tbody tr');
assert.equal(zonesRows.length, 5, 'La tabla de zonas de 1RM debe mostrar los 5 rangos porcentuales (100% a 60%)');

const bodyEntry = app.recordBodyMetrics({
  weightKg: 75.2,
  fatPct: 14.5,
  bicepsCm: 38.2,
  chestCm: 105.0,
  waistCm: 79.5
});
assert.equal(bodyEntry.weightKg, 75.2, 'Debe registrar el peso corporal en kg');
assert.equal(app.getState().bodyMetrics.length, 1, 'El historial antropométrico debe tener 1 registro');
assert.ok(doc.getElementById('body-metrics-history-list').textContent.includes('38.2 cm'), 'Debe renderizar la medida de bíceps en la lista');

// 17. Verificar Módulo Élite 2: Modo Avanzado por Serie (Dropsets, Superseries, Rest-Pause) y Selector RIR
const nextMode1 = app.cycleExerciseSetMode('lunes', 'lun-espalda-polea-estrecho');
assert.equal(nextMode1, 'dropset', 'El modo de serie debe ciclar de normal a dropset');
const nextMode2 = app.cycleExerciseSetMode('lunes', 'lun-espalda-polea-estrecho');
assert.equal(nextMode2, 'superserie', 'El modo de serie debe ciclar de dropset a superserie');
const nextRir = app.cycleExerciseRir('lunes', 'lun-espalda-polea-estrecho');
assert.equal(nextRir, 'RIR 1', 'El selector de RIR debe avanzar de RIR 2 a RIR 1');

// 18. Verificar Módulo Élite 3: Entrenador de Voz (TTS) y Metrónomo de Cadencia (3-1-1) en TUT
app.toggleVoiceCoach(true);
assert.equal(app.getState().voiceCoachEnabled, true, 'El entrenador de voz debe activarse');
const cadSec0 = app.getCadencePhaseForSecond(0);
assert.ok(cadSec0.text.includes('Excéntrica'), 'El segundo 0 del ciclo 3-1-1 debe corresponder a la Fase Excéntrica');
const cadSec3 = app.getCadencePhaseForSecond(3);
assert.ok(cadSec3.text.includes('Isométrica'), 'El segundo 3 del ciclo 3-1-1 debe corresponder a la Pausa Isométrica');
const cadSec4 = app.getCadencePhaseForSecond(4);
assert.ok(cadSec4.text.includes('Concéntrica'), 'El segundo 4 del ciclo 3-1-1 debe corresponder a la Subida Concéntrica');
app.toggleVoiceCoach(false);

// 19. Verificar Módulo Élite 4: Selector de Plantillas de Rutina y Tarjeta Resumen Compartible (PNG)
const appliedDensity = app.applyWorkoutTemplate('densidad_poleas');
assert.equal(appliedDensity, true, 'Debe aplicar la plantilla de Alta Densidad en Poleas');
assert.equal(app.getState().activeTemplate, 'densidad_poleas');
// Confirmar que las 3 marcas base del usuario en Lunes jamás se alteran al cambiar de plantilla
const lunesAfterTpl = app.getState().schedule.lunes.exercises;
assert.equal(lunesAfterTpl.find(e => e.id === 'lun-espalda-polea-estrecho').loadValue, 6);
assert.equal(lunesAfterTpl.find(e => e.id === 'lun-espalda-maquina-amplio').loadValue, 20);
assert.equal(lunesAfterTpl.find(e => e.id === 'lun-biceps-press-polea').loadValue, 10);

app.applyWorkoutTemplate('default_ppl');
const cardSummary = app.renderShareableSummaryCard();
assert.ok(cardSummary && cardSummary.dayName, 'Debe generar el resumen táctico en el canvas compartible');
assert.ok(doc.getElementById('share-card-canvas').dataset.renderedSummary.includes('Lunes'), 'El canvas debe almacenar el payload renderizado');

// 20. Verificar Módulo Master 1: Nutrición Deportiva, Macros, Agua y Creatina
app.setNutritionGoal('definicion');
assert.equal(app.getState().nutrition.goal, 'definicion', 'El objetivo nutricional debe actualizarse a definición');
const nutPlan = app.renderNutritionDashboard();
assert.ok(nutPlan.proteinGrams >= 150, 'Debe calcular proteína diaria acorde al peso corporal');
app.addHydrationWater(500);
app.addHydrationWater(250);
assert.equal(app.getState().nutrition.waterMl, 750, 'El contador de hidratación debe acumular 750 ml');
assert.ok(doc.getElementById('water-current-label').textContent.includes('750 /'), 'La etiqueta de hidratación debe reflejar 750 ml');
app.toggleSupplementCheck('creatineTaken');
assert.equal(app.getState().nutrition.creatineTaken, true, 'El check de creatina diaria debe activarse');
app.resetHydrationWater();
app.setNutritionGoal('hipertrofia');

// 21. Verificar Módulo Master 2: Sustitución Inteligente ("Máquina Ocupada") y Modo Semana de Descarga (Deload)
const originalName = app.getState().schedule.lunes.exercises[0].name;
const swappedEx = app.swapExerciseAlternative('lunes', 'lun-espalda-polea-estrecho');
assert.equal(swappedEx.isSwappedAlternative, true, 'El ejercicio debe marcarse como alternativa activa');
assert.notEqual(swappedEx.name, originalName, 'El nombre del ejercicio debe cambiar al sustituto biomecánico');
const restoredEx = app.swapExerciseAlternative('lunes', 'lun-espalda-polea-estrecho');
assert.equal(restoredEx.isSwappedAlternative, false, 'Al volver a pulsar debe restaurar el ejercicio original');
assert.equal(restoredEx.name, originalName, 'El nombre original de Lunes debe restaurarse intacto');

app.toggleDeloadMode(true);
assert.equal(app.getState().deloadModeActive, true, 'El modo descarga debe activarse');
assert.equal(app.getState().schedule.lunes.exercises[1].loadValue, 16, 'En descarga (-20%), 20 kg baja temporalmente a 16 kg');
app.toggleDeloadMode(false);
assert.equal(app.getState().deloadModeActive, false, 'El modo descarga debe desactivarse');
assert.equal(app.getState().schedule.lunes.exercises[0].loadValue, 6, 'Al salir de descarga, Nivel 6 se restaura intacto');
assert.equal(app.getState().schedule.lunes.exercises[1].loadValue, 20, 'Al salir de descarga, 20 kg se restaura intacto');
assert.equal(app.getState().schedule.lunes.exercises[2].loadValue, 10, 'Al salir de descarga, 10 kg se restaura intacto');

// 22. Verificar Módulo Master 3: Gamificación (Calendario Heatmap 28 días y 6 Medallas Tácticas)
const gamData = app.renderGamificationDashboard();
assert.equal(gamData.heatmap.cells.length, 28, 'El heatmap de constancia debe generar exactamente 28 días');
assert.equal(doc.querySelectorAll('#consistency-heatmap-grid .heatmap-cell').length, 28, 'El DOM debe mostrar las 28 celdas del heatmap');
assert.equal(doc.querySelectorAll('#achievements-grid .achievement-card').length, 6, 'El DOM debe mostrar las 6 tarjetas de medallas/trofeos');
assert.ok(doc.querySelectorAll('#achievements-grid .achievement-card.is-unlocked').length >= 2, 'Las medallas base de Dorsal Nivel 6 y Bíceps 10 kg deben estar desbloqueadas');

// 23. Verificar Módulo Master 4: Iconos Nativos PNG (Web/PWA y Mipmaps Android)
assert.ok(fs.existsSync(path.join(root, 'assets/icons/icon-192.png')), 'Debe existir el icono PNG 192x192');
assert.ok(fs.existsSync(path.join(root, 'assets/icons/icon-512.png')), 'Debe existir el icono PNG 512x512');
if (fs.existsSync(path.join(root, 'android/app/src/main/res'))) {
  assert.ok(fs.existsSync(path.join(root, 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png')), 'Debe existir el icono nativo Android mipmap-xxxhdpi');
}

// 24. Verificar Módulo Legend 1: Semáforo de Recuperación Muscular (24h/48h/72h) y Readiness Score
const recReport = app.updateReadinessMetrics({ sleepHours: 8, energyLevel: 5, domsLevel: 1 });
assert.ok(recReport.readinessScore >= 90, 'Con 8h de sueño, energía 5/5 y DOMS 1/5 el Readiness Score debe ser >= 90%');
assert.equal(recReport.muscleRecoveryList.length, 5, 'El semáforo debe evaluar los 5 grandes grupos musculares');
assert.equal(doc.querySelectorAll('#muscle-recovery-grid .recovery-muscle-card').length, 5, 'El DOM debe renderizar 5 tarjetas de recuperación muscular');
assert.ok(doc.getElementById('readiness-score-pill').textContent.includes('%'), 'El pill de Readiness debe mostrar el porcentaje');

// 25. Verificar Módulo Legend 2: Asistente de Doble Progresión Inteligente con 1 Toque
app.selectDay('lunes');
for (let s = 0; s < 4; s++) {
  const exState = app.getState().schedule.lunes.exercises.find(e => e.id === 'lun-espalda-maquina-amplio');
  if (!exState.completedSets[s]) {
    app.toggleSetCompletion('lunes', 'lun-espalda-maquina-amplio', s);
  }
}
const suggestions = app.getSmartProgressionSuggestions('lunes');
assert.ok(suggestions.some(s => s.exerciseId === 'lun-espalda-maquina-amplio' && s.suggestedLoad === 22.5), 'Al completar 4x12 en Espalda Agarre Amplio (20 kg) debe sugerir subir a 22.5 kg');
assert.ok(doc.querySelector('.btn-smart-overload-suggest[data-exercise-id="lun-espalda-maquina-amplio"]'), 'La tarjeta del ejercicio debe mostrar el botón 1-toque de Doble Progresión');
const appliedOverload = app.applySmartProgressionSuggestion('lunes', 'lun-espalda-maquina-amplio');
assert.equal(appliedOverload.nextLoad, 22.5, 'El botón de Doble Progresión debe incrementar la carga de 20 kg a 22.5 kg con 1 toque');
assert.equal(app.getState().schedule.lunes.exercises.find(e => e.id === 'lun-espalda-maquina-amplio').loadValue, 22.5, 'El estado debe reflejar los 22.5 kg actualizados');
app.restoreOriginalSchedule();

// 26. Verificar Módulo Legend 3: Bitácora de Sensaciones por Sesión y Exportación a Excel (.CSV)
app.selectDay('lunes');
app.setSessionJournalNote('Gran bombeo dorsal Nivel 6, sin fatiga articular', 'lunes');
assert.equal(app.getState().journalNotesByDay.lunes, 'Gran bombeo dorsal Nivel 6, sin fatiga articular', 'La nota de bitácora debe guardarse por día');
const loggedOk = app.logCurrentWorkoutSession();
assert.equal(loggedOk, true, 'Debe registrar la sesión correctamente');
assert.equal(app.getState().history[0].sessionNote, 'Gran bombeo dorsal Nivel 6, sin fatiga articular', 'La sesión registrada en el historial debe conservar la nota de sensaciones');
const csvContent = app.exportWorkoutCsv();
assert.ok(csvContent.includes('REPORTE OFICIAL GYM RUTINAS PRO'), 'El archivo CSV debe incluir el encabezado oficial');
assert.ok(csvContent.includes('Gran bombeo dorsal Nivel 6, sin fatiga articular'), 'El archivo CSV debe incluir las notas de la bitácora de sesiones');
assert.ok(csvContent.includes(exPoleaEstrecho.name), 'El archivo CSV debe incluir el plan semanal de ejercicios');

// 27. Verificar Módulo Focus UI v1.8: Menús Agrupados, Responsive Vertical y Cambio de Pantalla al Iniciar Día
assert.ok(doc.getElementById('header-tools-menu'), 'Debe existir el menú desplegable agrupado de opciones en cabecera');
assert.ok(doc.getElementById('day-secondary-menu'), 'Debe existir el menú desplegable de opciones secundarias del día');
assert.equal(doc.querySelectorAll('.ex-card-options-menu').length, 6, 'Cada tarjeta de ejercicio debe agrupar sus opciones secundarias en un menú desplegable');
assert.ok(doc.getElementById('bottom-app-nav'), 'Debe existir la barra de navegación inferior estilo Android');

const workoutLaunch = app.startDayWorkoutSession('lunes', 0);
assert.equal(workoutLaunch.activeScreen, 'workout', 'Al iniciar el día debe cambiar a la pantalla dedicada de entrenamiento');
assert.equal(doc.getElementById('workout-focus-screen').hidden, false, 'La pantalla de entrenamiento activo debe mostrarse');
assert.equal(doc.getElementById('screen-plan').hidden, true, 'La pantalla del plan general debe ocultarse durante el enfoque del ejercicio');
assert.ok(doc.querySelector('#focus-sprite-stage .focus-sprite-box'), 'La pantalla de entrenamiento debe mostrar la ilustración/sprite de 3 fases del ejercicio activo');
assert.equal(doc.querySelector('#focus-sprite-stage .focus-sprite-box').textContent.trim(), '', 'La imagen del ejercicio en la pantalla activa NO debe tener texto superpuesto');
assert.ok(doc.getElementById('focus-exercise-card').firstElementChild.classList.contains('focus-ex-header'), 'El título del ejercicio debe estar en la cabecera superior de la card activa');
assert.equal(doc.getElementById('focus-load-main').textContent, 'Nivel 6', 'Debe mostrar la carga esencial del primer ejercicio de Lunes (Nivel 6)');
assert.equal(doc.querySelectorAll('#focus-sets-grid .btn-focus-set').length, 4, 'Debe mostrar los 4 botones grandes de series (4x12 reps)');
assert.ok(doc.getElementById('focus-rest-digits').textContent.includes(':'), 'Debe mostrar el temporizador de descanso integrado en la pantalla del ejercicio');
assert.ok(doc.getElementById('focus-secondary-menu'), 'Las opciones no esenciales del ejercicio activo deben estar agrupadas en #focus-secondary-menu');

const switchedEx = app.selectFocusExercise(2);
assert.equal(switchedEx.id, 'lun-biceps-press-polea', 'El selector paso a paso debe cambiar al ejercicio 3 (Bíceps en polea)');
assert.equal(doc.getElementById('focus-load-main').textContent, '10 kg', 'La pantalla activa debe actualizar el peso a 10 kg');

app.exitWorkoutScreen();
assert.equal(app.getState().activeScreen, 'plan', 'Al salir del modo entrenamiento debe regresar a la pantalla principal del día');
assert.equal(doc.getElementById('screen-plan').hidden, false, 'La pantalla del plan debe volver a estar visible');

// Re-verificación final: 0 etiquetas <svg> tras todos los renders dinámicos
assert.equal(doc.querySelectorAll('svg').length, 0, 'El DOM debe seguir teniendo 0 etiquetas <svg> tras renderizar la arquitectura multi-pantalla v1.8 Focus UI');

// 28. Verificar Módulo Personalización v1.9: Perfil Biométrico Dinámico, Variación de Ejercicios y Acomodación Inteligente
const initialProfile = app.getUserProfile();
assert.ok(initialProfile, 'getUserProfile debe devolver el perfil inicial');
assert.equal(typeof initialProfile, 'object', 'El perfil debe ser un objeto');
assert.equal(initialProfile.configured, false, 'Inicialmente no debe estar configurado');

// 28.1 Generación personalizada para Atleta Mujer Principiante (55 kg, Objetivo Pérdida de Grasa / Definición, Rodillas protegidas)
const savedProfileFem = app.saveUserProfile({
  name: 'Valeria',
  gender: 'female',
  age: 26,
  weightKg: 55,
  heightCm: 162,
  fitnessLevel: 'beginner',
  primaryGoal: 'fat_loss',
  daysPerWeek: 5,
  limitations: 'knees'
});

assert.equal(savedProfileFem.configured, true, 'El perfil debe quedar configurado');
assert.equal(app.getState().userProfile.name, 'Valeria', 'El nombre debe persistir en el estado');

const femState = app.getState();
const femLunes = femState.schedule.lunes.exercises;
assert.ok(femLunes.length >= 6, 'Lunes debe conservar los ejercicios');
const femPolea = femLunes.find(e => e.id === 'lun-espalda-polea-estrecho');
assert.ok(femPolea, 'Debe existir el ejercicio de espalda en polea');
// En principiante + mujer (55kg / 75kg * 0.65 * 0.72 ~ 0.34 ratio), la carga en nivel debe ser menor o igual a nivel 4
assert.ok(femPolea.loadValue <= 4, `Carga de polea para principiante mujer debe adaptarse (calculado: ${femPolea.loadValue})`);
assert.equal(femPolea.targetRir, 'RIR 3-4', 'Principiante debe entrenar con RIR 3-4');
assert.equal(femPolea.restSeconds, 60, 'Objetivo definición debe pautar 60s de descanso');

// 28.2 Generación personalizada para Atleta Hombre Avanzado (85 kg, Objetivo Fuerza Máxima)
const savedProfileMasc = app.saveUserProfile({
  name: 'Carlos',
  gender: 'male',
  age: 32,
  weightKg: 85,
  heightCm: 180,
  fitnessLevel: 'advanced',
  primaryGoal: 'strength',
  daysPerWeek: 6,
  limitations: 'none'
});
assert.equal(savedProfileMasc.name, 'Carlos');
const mascLunes = app.getState().schedule.lunes.exercises;
const mascMaquina = mascLunes.find(e => e.id === 'lun-espalda-maquina-amplio');
assert.ok(mascMaquina, 'Debe existir espalda en máquina');
// Hombre 85kg avanzado en fuerza: carga mayor a la base de 20kg (85/75 * 1.25 * 20 = 28.3 -> 27.5 o 30 kg)
assert.ok(mascMaquina.loadValue >= 25, `Carga para avanzado 85kg en fuerza debe ser >= 25kg (calculado: ${mascMaquina.loadValue})`);
assert.equal(mascMaquina.targetRir, 'RIR 0-1', 'Avanzado debe entrenar a RIR 0-1');
assert.ok(mascMaquina.restSeconds >= 90, 'Objetivo fuerza debe tener descanso >= 90s');

// 28.3 Variación de ejercicios biomecánicamente equivalentes (Máquina ocupada)
const exToSwap = mascLunes[0];
const alternatives = window.GYM_VISUALS.getExerciseAlternatives(exToSwap);
assert.ok(Array.isArray(alternatives) && alternatives.length === 3, 'Debe devolver exactamente 3 alternativas biomecánicas');
const catSet = new Set(alternatives.map(a => a.category));
assert.ok(catSet.has('cable'), 'Debe incluir alternativa en polea/cable');
assert.ok(catSet.has('machine'), 'Debe incluir alternativa en máquina');
assert.ok(catSet.has('free_weight'), 'Debe incluir alternativa en peso libre/mancuerna');

// Sustitución por alternativa específica
const swappedAltEx = app.swapExerciseAlternative('lunes', exToSwap.id, alternatives[2]);
assert.equal(swappedAltEx.isSwappedAlternative, true, 'El ejercicio debe marcarse como sustitución');
assert.equal(swappedAltEx.name, alternatives[2].name, 'El nombre debe actualizarse al de la alternativa');
assert.ok(swappedAltEx.originalSnapshot, 'Debe preservar el snapshot original');

// Restauración al ejercicio original
const restoredAltEx = app.swapExerciseAlternative('lunes', exToSwap.id);
assert.equal(restoredAltEx.isSwappedAlternative, false, 'Debe desmarcarse la sustitución');
assert.equal(restoredAltEx.name, restoredAltEx.originalSnapshot === undefined ? restoredAltEx.name : restoredAltEx.originalSnapshot.name);

// 28.4 Acomodación Inteligente ante días no entrenados: smart_merge_next
app.restoreOriginalSchedule();
app.accommodateMissedDayAction('martes', 'smart_merge_next');
const scheduleAfterMerge = app.getState().schedule;
assert.equal(scheduleAfterMerge.martes.isRestDay, true, 'Martes debe quedar marcado como descanso');
assert.ok(scheduleAfterMerge.martes.exceptionNote.includes('Fusión Inteligente'), 'Martes debe registrar nota de excepción');
const miercolesExs = scheduleAfterMerge.miercoles.exercises;
assert.ok(miercolesExs.length > 6, 'Miércoles debe haber incorporado los ejercicios clave de Martes');

// 28.5 Acomodación Inteligente ante días no entrenados: redistribute_volume (+1 serie en días restantes)
app.restoreOriginalSchedule();
app.accommodateMissedDayAction('lunes', 'redistribute_volume');
const scheduleAfterVol = app.getState().schedule;
assert.equal(scheduleAfterVol.lunes.isRestDay, true, 'Lunes debe quedar marcado como descanso');
assert.equal(scheduleAfterVol.martes.exercises[0].sets, 5, 'Los ejercicios del resto de la semana deben tener 1 serie extra de compensación (5 series)');

// 28.6 Resumen del Perfil en DOM y Header Tag
doc.getElementById('btn-header-profile')?.click();
assert.equal(doc.getElementById('profile-onboarding-dialog').hidden, false, 'El modal de perfil debe abrirse');
const headerProfileTag = doc.getElementById('header-profile-tag');
assert.ok(headerProfileTag, 'Debe existir el tag de perfil en cabecera');

// 28.7 Verificar Módulo de Series y Repeticiones Dinámicas Prescritas por la Aplicación (No modificables por el usuario)
app.restoreOriginalSchedule();

// Caso 1: Objetivo Fuerza (strength), Nivel Avanzado
app.saveUserProfile({
  gender: 'male',
  weightKg: 85,
  age: 26,
  fitnessLevel: 'advanced',
  primaryGoal: 'strength',
  limitations: 'none'
});
app.selectDay('lunes');
const dayExercisesStrength = app.getState().schedule.lunes.exercises;
const compExStrength = dayExercisesStrength[0]; // Ejercicio primario compuesto
assert.equal(compExStrength.sets, 5, 'En Fuerza Avanzado el ejercicio primario debe tener 5 series prescritas');
assert.equal(compExStrength.repsScheme, 'pyramid', 'El ejercicio primario de fuerza debe ser piramidal');
assert.deepEqual(Array.from(compExStrength.seriesReps), [8, 6, 6, 6, 4], 'El desglose de series debe ser [8, 6, 6, 6, 4]');
assert.equal(app.formatExerciseRepsSummary(compExStrength), '8-6-6-6-4 reps', 'El resumen de reps debe coincidir');

const secExStrength = dayExercisesStrength[1]; // Secundario
assert.equal(secExStrength.sets, 4, 'El secundario debe tener 4 series');
assert.equal(secExStrength.reps, 8, 'El secundario debe prescribir 8 reps');
assert.deepEqual(Array.from(secExStrength.seriesReps), [8, 8, 8, 8], 'El secundario debe tener [8, 8, 8, 8]');

const accExStrength = dayExercisesStrength[dayExercisesStrength.length - 1]; // Accesorio
assert.equal(accExStrength.sets, 3, 'El accesorio en fuerza debe tener 3 series');
assert.equal(accExStrength.reps, 10, 'El accesorio en fuerza debe prescribir 10 reps');
assert.deepEqual(Array.from(accExStrength.seriesReps), [10, 10, 10], 'El accesorio debe tener [10, 10, 10]');

// Caso 2: Objetivo Hipertrofia (hypertrophy)
app.saveUserProfile({
  gender: 'male',
  weightKg: 78,
  age: 30,
  fitnessLevel: 'intermediate',
  primaryGoal: 'hypertrophy',
  limitations: 'none'
});
const dayExercisesHyp = app.getState().schedule.lunes.exercises;
const compExHyp = dayExercisesHyp[0];
assert.equal(compExHyp.repsScheme, 'pyramid', 'Primario en hipertrofia debe ser piramidal');
assert.deepEqual(Array.from(compExHyp.seriesReps), [12, 10, 8, 6], 'Primario debe prescribir 12-10-8-6 reps');
assert.equal(app.formatExerciseRepsSummary(compExHyp), '12-10-8-6 reps', 'Resumen de hipertrofia debe ser 12-10-8-6 reps');

// Caso 3: Objetivo Pérdida de Grasa (fat_loss)
app.saveUserProfile({
  gender: 'female',
  weightKg: 65,
  age: 28,
  fitnessLevel: 'intermediate',
  primaryGoal: 'fat_loss',
  limitations: 'none'
});
const dayExercisesFat = app.getState().schedule.lunes.exercises;
const exFat = dayExercisesFat[0];
assert.deepEqual(Array.from(exFat.seriesReps), [15, 14, 13, 12], 'En pérdida de grasa debe prescribir repeticiones metabólicas [15, 14, 13, 12]');

// Verificación de elementos DOM:
// En la tarjeta de ejercicios se debe mostrar el badge de repeticiones prescritas por la app (.badge-reps-prescribed)
assert.ok(doc.querySelector('.badge-reps-prescribed'), 'Las tarjetas de ejercicios deben incluir el badge informativo de repeticiones prescritas');

// Comprobar que NO existen controles para que el usuario altere arbitrariamente las repeticiones
assert.equal(doc.getElementById('btn-focus-reps'), null, 'NO debe existir el botón interactivo #btn-focus-reps para modificación del usuario');
assert.equal(doc.getElementById('btn-focus-add-set'), null, 'NO debe existir el botón #btn-focus-add-set');
assert.equal(doc.getElementById('btn-focus-remove-set'), null, 'NO debe existir el botón #btn-focus-remove-set');
assert.equal(doc.querySelectorAll('.btn-quick-rep-preset').length, 0, 'NO deben existir selectores de repeticiones arbitrarias para el usuario');

// Re-verificación final absoluta: 0 etiquetas <svg> tras todas las pantallas y modales
assert.equal(doc.querySelectorAll('svg').length, 0, 'El DOM debe seguir teniendo CERO etiquetas <svg> tras todas las operaciones v1.9');

app.restoreOriginalSchedule();
console.log('PASS: Todas las pruebas v1.9.2 (Series y Repeticiones Dinámicas Prescritas por la App sin Modificación Manual, Perfil Biométrico y 28 módulos verificados) pasaron con éxito.');
process.exit(0);


