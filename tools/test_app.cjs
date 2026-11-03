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

// 6. Verificar Descripción de Calentamiento Articular (5 min) en Pantalla Principal
const warmupItems = doc.querySelectorAll('#warmup-steps-list .warmup-step-item');
assert.equal(warmupItems.length, 4, 'Debe mostrar los 4 pasos de calentamiento articular específicos del día');
const descCard = doc.querySelector('#warmup-steps-list .warmup-desc-card');
assert.ok(descCard, 'Debe contener tarjetas descriptivas del ejercicio de calentamiento');
const descTitle = doc.querySelector('#warmup-steps-list .warmup-desc-title');
assert.ok(descTitle && descTitle.textContent.includes('Rotaciones escapulares'), 'Debe mostrar el título del paso de calentamiento');
const descText = doc.querySelector('#warmup-steps-list .warmup-desc-text');
assert.ok(descText && descText.textContent.length > 20, 'Debe mostrar la explicación técnica del ejercicio');
assert.ok(doc.getElementById('warmup-progress-pill').textContent.includes('pasos de activación'), 'El pill debe contener el contador de pasos de activación');

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

// 12. Verificar Cronómetro de Sesión y Retiro de Panel del Resumen Principal
app.restoreOriginalSchedule();
app.selectDay('lunes');
assert.equal(doc.getElementById('session-stopwatch-digits'), null, 'El panel de cronómetro de sesión fue removido de la pantalla principal');
assert.equal(doc.getElementById('compact-stopwatch-digits'), null, 'El texto Sesión: XX:XX:XX fue removido de la pantalla principal');
assert.equal(doc.getElementById('workout-stopwatch-bar'), null, 'El contenedor workout-stopwatch-bar fue retirado del resumen');

app.startSessionStopwatch();
assert.ok(app.getStopwatchElapsedMs() >= 0);
assert.equal(doc.getElementById('focus-stopwatch-display').textContent.length, 8);

app.lapSessionStopwatch();
app.pauseSessionStopwatch();
app.resetSessionStopwatch();
assert.equal(app.getStopwatchElapsedMs(), 0);
assert.equal(doc.getElementById('focus-stopwatch-display').textContent, '00:00:00');

// 13. Verificar Cronómetro de Serie (TUT - Time Under Tension) y avance de serie
assert.equal(doc.querySelectorAll('.exercise-card .btn-tut-stopwatch').length, 0, 'Las tarjetas de ejercicio en pantalla principal son solo de muestra sin botones TUT');

const firstEx = state.schedule.lunes.exercises[0];
const initialDoneSets = (firstEx.completedSets || []).filter(Boolean).length;
app.startTutStopwatch('lunes', firstEx.id);

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

// 27. Verificar Módulo Focus UI v1.8: Subopciones en Menú/Extras y Sin Botón de Opciones en Cabecera
assert.equal(doc.getElementById('header-tools-menu'), null, 'El botón/menú de opciones NO debe existir en la cabecera');
assert.ok(doc.querySelector('#screen-hub #btn-open-calc-dialog'), 'La calculadora de discos debe estar dentro de la pestaña Menú/Extras (#screen-hub)');
assert.ok(doc.querySelector('#screen-hub #btn-restore-schedule'), 'Restaura Días debe estar dentro de la pestaña Menú/Extras (#screen-hub)');
assert.ok(doc.getElementById('day-secondary-menu'), 'Debe existir el menú desplegable de opciones secundarias del día');
assert.equal(doc.querySelectorAll('.ex-card-options-menu').length, 0, 'Las tarjetas de ejercicio en pantalla principal no contienen menú de opciones secundarias (solo muestra)');
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
// En la app se debe mostrar el indicador de repeticiones prescritas por la app (.badge-reps-prescribed)
assert.ok(doc.querySelector('.badge-reps-prescribed'), 'La app debe incluir el indicador informativo de repeticiones prescritas');

// Comprobar que NO existen controles para que el usuario altere arbitrariamente las repeticiones
assert.equal(doc.getElementById('btn-focus-reps'), null, 'NO debe existir el botón interactivo #btn-focus-reps para modificación del usuario');
assert.equal(doc.getElementById('btn-focus-add-set'), null, 'NO debe existir el botón #btn-focus-add-set');
assert.equal(doc.getElementById('btn-focus-remove-set'), null, 'NO debe existir el botón #btn-focus-remove-set');
assert.equal(doc.querySelectorAll('.btn-quick-rep-preset').length, 0, 'NO deben existir selectores de repeticiones arbitrarias para el usuario');

// 29. Verificar Modo Inmersivo de Ejercicio Iniciado, Botones de Sesión (Terminar y Truncar), y Pantalla de Resultados con Próxima Proyección Muscular
app.restoreOriginalSchedule();
app.selectDay('lunes');

// 29.1 Iniciar el ejercicio: Solo se debe mostrar la pantalla del ejercicio y las funciones necesarias
app.startDayWorkoutSession('lunes', 0);
assert.equal(app.getState().activeScreen, 'workout', 'Debe cambiar a la pantalla de entrenamiento');
assert.ok(doc.body.classList.contains('in-workout-screen'), 'El body debe tener la clase .in-workout-screen');
assert.equal(doc.querySelector('.app-header').hidden, true, 'La cabecera global debe estar oculta para mostrar solo la pantalla del ejercicio');
assert.equal(doc.getElementById('bottom-app-nav').hidden, true, 'La barra de navegación inferior debe estar oculta en modo entrenamiento');
assert.equal(doc.getElementById('day-tabs-nav').hidden, true, 'Las pestañas de días deben estar ocultas en modo entrenamiento');
assert.equal(doc.getElementById('workout-focus-screen').hidden, false, 'La pantalla del ejercicio debe estar visible');

// 29.2 Verificar existencia de botones requeridos: Terminar sesión, Truncar sesión, Máquina Ocupada en cabecera
const btnFinishWorkout = doc.getElementById('btn-focus-finish-workout');
const btnTruncateWorkout = doc.getElementById('btn-focus-truncate-workout');
const btnTruncateTop = doc.getElementById('btn-focus-truncate-top');
const btnSwapHeader = doc.getElementById('btn-focus-swap-alt');
const btnSkipExercise = doc.getElementById('btn-focus-skip-exercise');

assert.ok(btnFinishWorkout, 'Debe existir el botón #btn-focus-finish-workout (Terminar Sesión)');
assert.ok(btnFinishWorkout.textContent.includes('Terminar Sesión'), 'El texto debe indicar Terminar Sesión');
assert.ok(btnTruncateWorkout, 'Debe existir el botón #btn-focus-truncate-workout (Truncar Sesión en pie)');
assert.ok(btnTruncateTop, 'Debe existir el botón #btn-focus-truncate-top (Truncar Sesión en barra superior)');
assert.ok(btnSwapHeader, 'Debe existir el botón #btn-focus-swap-alt (Máquina Ocupada) en la cabecera');
assert.ok(!btnSkipExercise || btnSkipExercise.style.display === 'none', 'El botón de saltar ejercicio no debe estar visible');

// 29.3 Probar Truncar Sesión: apertura de modal, visualización de progreso y registro parcial
app.openWorkoutTruncateDialog();
const truncateDialog = doc.getElementById('workout-truncate-dialog');
assert.ok(truncateDialog, 'Debe existir el modal #workout-truncate-dialog');
assert.equal(truncateDialog.hidden, false, 'El modal de truncar debe abrirse');
assert.ok(doc.getElementById('trunc-stat-sets'), 'Debe mostrar estadísticas de series completadas');
assert.ok(doc.getElementById('trunc-stat-time'), 'Debe mostrar el tiempo de sesión');
assert.ok(doc.getElementById('trunc-stat-vol'), 'Debe mostrar el volumen acumulado');

// Truncar sesión guardando progreso parcial
const prevHistoryCount = app.getState().history.length;
app.truncateWorkoutSession(true);
assert.equal(app.getState().activeScreen, 'plan', 'Al truncar debe volver a la pantalla del plan');
assert.equal(doc.body.classList.contains('in-workout-screen'), false, 'Al salir de la pantalla de ejercicio se debe remover la clase');
assert.equal(doc.querySelector('.app-header').hidden, false, 'Al volver al plan la cabecera debe restaurarse');
assert.equal(doc.getElementById('bottom-app-nav').hidden, false, 'Al volver al plan la barra inferior debe restaurarse');
assert.equal(app.getState().history.length, prevHistoryCount + 1, 'Debe registrar la sesión en el historial');
assert.equal(app.getState().history[0].status, 'truncated', 'La sesión truncada debe registrarse con status truncated');

// 29.4 Probar Terminar Sesión Satisfactoriamente y Pantalla de Resultados con Próxima Proyección
app.startDayWorkoutSession('lunes', 0);
// Completar todos los ejercicios del día para permitir terminar sesión
app.getState().schedule.lunes.exercises.forEach(e => {
  e.completedSets = [true, true, true, true];
});
app.renderWorkoutFocusScreen();
app.finishWorkoutSession();

const resultsDialog = doc.getElementById('workout-results-dialog');
assert.ok(resultsDialog, 'Debe existir el modal #workout-results-dialog');
assert.equal(resultsDialog.hidden, false, 'El modal de resultados del entrenamiento debe abrirse');
assert.ok(doc.getElementById('res-time-val').textContent.length > 0, 'Debe mostrar tiempo total');
assert.ok(doc.getElementById('res-vol-val').textContent.includes('kg'), 'Debe mostrar volumen levantado en kg');
assert.ok(doc.getElementById('res-reps-val').textContent.includes('reps'), 'Debe mostrar repeticiones totales');

// 29.5 Probar Actualización de la Siguiente Vez que se Entrenarán los Mismos Músculos
const projection = app.calculateNextWorkoutProjection('lunes');
assert.ok(projection, 'Debe calcular la proyección del próximo entrenamiento');
assert.equal(projection.currentDayId, 'lunes', 'Día actual debe ser lunes');
assert.equal(projection.nextDayId, 'viernes', 'Para Lunes (Espalda y Bíceps), el siguiente día en el split con Espalda/Bíceps debe ser Viernes (Torso)');
assert.ok(projection.hoursUntil > 0, 'Debe proyectar las horas de descanso óptimo');
assert.ok(projection.exerciseProgressions.length > 0, 'Debe calcular la progresión ejercicio por ejercicio');
assert.ok(projection.targetProteinGrams >= 25, 'Debe calcular la meta de proteína post-entreno en función del peso');

// Probar botón de Aplicar Progresión al Próximo Día
const appliedCount = app.applyNextDayProgression();
assert.ok(appliedCount > 0, 'Debe haber aplicado la sobrecarga progresiva a los ejercicios coincidentes del próximo día');
const viernesExs = app.getState().schedule.viernes.exercises;
const viernesPolea = viernesExs.find(e => e.name.includes('estrecho'));
assert.equal(viernesPolea.loadValue, 7, 'El Jalón en polea en Viernes debe haber subido a Nivel 7 (+1 placa)');

app.closeWorkoutResultsDialog();
app.exitWorkoutScreen();

// 30. Verificar Pantalla Compacta con Contador de Serie Actual y Repeticiones Calculadas Tras el Descanso
app.restoreOriginalSchedule();
app.startDayWorkoutSession('lunes', 0);

// Configurar un ejercicio con repeticiones piramidales dinámicas: [12, 10, 8, 6]
const testDay = app.getState().schedule.lunes;
const testEx = testDay.exercises[0];
testEx.seriesReps = [12, 10, 8, 6];
testEx.completedSets = [false, false, false, false];
app.renderWorkoutFocusScreen();

// 30.1 Verificar visualización única de la Serie 1
const counterPill = doc.getElementById('focus-active-set-counter');
const repsDigitsEl = doc.getElementById('focus-current-set-reps-digits');
const actionBtnEl = doc.getElementById('btn-focus-action-set');

assert.ok(counterPill, 'Debe existir el contador de serie actual #focus-active-set-counter');
assert.equal(counterPill.textContent.trim(), 'SERIE 1 DE 4', 'Al inicio debe mostrar SERIE 1 DE 4');
assert.equal(repsDigitsEl.textContent.trim(), '12', 'Debe mostrar en grande ÚNICAMENTE las repeticiones de la Serie 1 (12)');
assert.ok(actionBtnEl.textContent.includes('Serie 1 Completada - Descansar'), 'El botón debe indicar Serie 1 Completada - Descansar');
assert.ok(!actionBtnEl.textContent.includes('12 reps'), 'El botón para descansar NO debe incluir repeticiones');

// 30.2 Completar Serie 1 usando el botón de acción táctil -> debe activar descanso
actionBtnEl.click();
assert.equal(testEx.completedSets[0], true, 'Serie 1 debe quedar marcada como completada');
assert.ok(doc.getElementById('focus-active-set-card').classList.contains('is-resting-mode'), 'La card debe entrar en modo descanso activo');

// 30.3 Al terminar o saltar el tiempo de espera de descanso de la serie anterior
const skipRestBtn = doc.getElementById('btn-focus-rest-skip');
assert.ok(skipRestBtn, 'Debe existir el botón para finalizar o saltar el descanso');
skipRestBtn.click();

// 30.4 Verificar que el contador avanzó automáticamente a Serie 2 y calculó ÚNICAMENTE las reps de la Serie 2 (10)
assert.equal(counterPill.textContent.trim(), 'SERIE 2 DE 4', 'Tras el descanso de la Serie 1 debe avanzar automáticamente a SERIE 2 DE 4');
assert.equal(repsDigitsEl.textContent.trim(), '10', 'Debe mostrar ÚNICAMENTE las 10 reps calculadas para la Serie 2');
assert.ok(actionBtnEl.textContent.includes('Serie 2 Completada - Descansar'), 'El botón debe haber cambiado a Serie 2 Completada - Descansar');
assert.ok(!actionBtnEl.textContent.includes('10 reps'), 'El botón para descansar NO debe incluir repeticiones');

// 30.5 Completar Serie 2 y saltar descanso -> debe calcular y mostrar Serie 3 (8 reps)
actionBtnEl.click();
skipRestBtn.click();
assert.equal(counterPill.textContent.trim(), 'SERIE 3 DE 4', 'Debe avanzar a SERIE 3 DE 4');
assert.equal(repsDigitsEl.textContent.trim(), '8', 'Debe calcular y mostrar ÚNICAMENTE las 8 reps de la Serie 3');

// 30.6 Completar Serie 3 y saltar descanso -> debe calcular y mostrar Serie 4 (6 reps)
actionBtnEl.click();
skipRestBtn.click();
assert.equal(counterPill.textContent.trim(), 'SERIE 4 DE 4', 'Debe avanzar a SERIE 4 DE 4');
assert.equal(repsDigitsEl.textContent.trim(), '6', 'Debe calcular y mostrar ÚNICAMENTE las 6 reps de la Serie 4');

// 30.7 Completar última serie -> debe mostrar estado de ejercicio completado
actionBtnEl.click();
assert.ok(counterPill.textContent.includes('4 DE 4 SERIES'), 'Al terminar todas las series debe indicar completado');
assert.equal(repsDigitsEl.textContent.trim(), '✓', 'Dígitos deben mostrar el check de finalizado');

app.exitWorkoutScreen();

// 31. Verificación de Rutina de Piernas, Hip Thrust, Abductores, Aductores y Sprites Biomecánicos con Barras
const spriteCatalog = window.GYM_VISUALS.EXERCISE_SPRITE_CATALOG;
assert.ok(spriteCatalog['hip-thrust'], 'Debe existir hip-thrust en el catálogo');
assert.ok(spriteCatalog['hip-abductor'], 'Debe existir hip-abductor en el catálogo');
assert.ok(spriteCatalog['hip-adductor'], 'Debe existir hip-adductor en el catálogo');

// 31.1 Verificar que Hip Thrust y Abducción de Cadera NO comparten la misma hoja ni fila de sprites
assert.notEqual(
  spriteCatalog['hip-thrust'].spriteUrl,
  spriteCatalog['hip-abductor'].spriteUrl,
  'Hip Thrust y Abducción de Cadera deben tener hojas de sprites DIFERENTES e independientes'
);
assert.equal(spriteCatalog['hip-thrust'].spriteUrl, 'assets/sprites/sprite_glutes_hipthrust_rdl.jpg');
assert.equal(spriteCatalog['hip-abductor'].spriteUrl, 'assets/sprites/sprite_legs_adductor_abductor.jpg');
assert.equal(spriteCatalog['hip-abductor'].row, 'top');
assert.equal(spriteCatalog['hip-adductor'].spriteUrl, 'assets/sprites/sprite_legs_adductor_abductor.jpg');
assert.equal(spriteCatalog['hip-adductor'].row, 'bottom');

// 31.2 Verificar detección biomecánica en inglés y español sin colisiones
const detectType = window.GYM_VISUALS.detectExerciseAnimationType;
assert.equal(detectType({ id: 'sab-hip-thrust', name: 'Hip Thrust en máquina o multipower' }), 'hip-thrust');
assert.equal(detectType({ id: 'custom-1', name: 'Empuje de cadera con barra' }), 'hip-thrust');
assert.equal(detectType({ id: 'sab-abduccion-maquina', name: 'Abducción de cadera en máquina' }), 'hip-abductor');
assert.equal(detectType({ id: 'custom-2', name: 'Hip Abduction Machine' }), 'hip-abductor');
assert.equal(detectType({ id: 'mie-aductores-maquina', name: 'Aductores en máquina sentada' }), 'hip-adductor');
assert.equal(detectType({ id: 'custom-3', name: 'Inner Thigh Adductor Machine' }), 'hip-adductor');
assert.equal(detectType({ id: 'sab-peso-muerto-rumano', name: 'Peso muerto rumano con mancuernas' }), 'romanian-deadlift');
assert.equal(detectType({ id: 'custom-4', name: 'Romanian Deadlift (RDL)' }), 'romanian-deadlift');

// 31.3 Verificar que en Sábado con molestia lumbar NO se duplique Hip Thrust
const personalizedSchedule = window.GYM_VISUALS.generatePersonalizedSchedule(
  { limitations: 'lower_back', daysPerWeek: 6, level: 'intermediate' },
  window.GYM_DATA.INITIAL_SCHEDULE
);
const sabadoExercises = personalizedSchedule.sabado.exercises;
const hipThrustCount = sabadoExercises.filter(e => /hip thrust/i.test(e.name)).length;
assert.equal(hipThrustCount, 1, 'Sábado debe tener únicamente 1 Hip Thrust, sin duplicados por molestias lumbares');
const lumbarSubEx = sabadoExercises.find(e => e.id === 'sab-peso-muerto-rumano');
assert.ok(lumbarSubEx && !lumbarSubEx.name.includes('Hip Thrust'), 'Peso muerto rumano no debe sustituirse por Hip Thrust');
assert.ok(lumbarSubEx.name.includes('Hiperextensiones'), 'Peso muerto rumano debe sustituirse por Hiperextensiones 45° seguras');

// 31.4 Verificar alternativas de Hip Thrust y Abductor sin caer en polea de espalda
const htAlternatives = window.GYM_VISUALS.getExerciseAlternatives({ id: 'sab-hip-thrust', name: 'Hip Thrust' });
assert.ok(htAlternatives.some(a => /glúteo|cadera/i.test(a.name) || /glúteo/i.test(a.reason)), 'Alternativas de Hip Thrust deben ser de glúteo/cadera');

const abductorAlternatives = window.GYM_VISUALS.getExerciseAlternatives({ id: 'sab-abduccion-maquina', name: 'Abducción de cadera' });
assert.ok(abductorAlternatives.some(a => /abducción|glúteo medio/i.test(a.name) || /glúteo/i.test(a.reason)), 'Alternativas de Abductor deben ser de glúteo medio/abducción');

// 31.5 Verificar que los archivos físicos de sprites existen y tienen tamaño positivo
const hipThrustFile = path.join(root, 'assets/sprites/sprite_glutes_hipthrust_rdl.jpg');
const abductorFile = path.join(root, 'assets/sprites/sprite_legs_adductor_abductor.jpg');
assert.ok(fs.existsSync(hipThrustFile) && fs.statSync(hipThrustFile).size > 50000, 'sprite_glutes_hipthrust_rdl.jpg debe existir y tener peso válido');
assert.ok(fs.existsSync(abductorFile) && fs.statSync(abductorFile).size > 50000, 'sprite_legs_adductor_abductor.jpg debe existir y tener peso válido');

// --- Suite 32: Auditoría Integral de Sprites, Implementos Visibles y Patrones de Hombro/Core ---
console.log('Ejecutando Suite 32: Auditoría Integral de Sprites e Implementos...');

// 32.1 Verificación de existencia física de todas las hojas de sprites del catálogo
const spriteSheets = [
  'gym_exercise_sprite_sheet_closegrip.jpg',
  'gym_exercise_sprite_sheet_fullbody.jpg',
  'gym_exercise_sprite_sheet_chest_triceps.jpg',
  'gym_exercise_sprite_sheet_legs_shoulders.jpg',
  'sprite_back_row_pullover.jpg',
  'sprite_bicep_hammer_incline_chest.jpg',
  'sprite_chest_pecdeck_cable_crossover.jpg',
  'sprite_triceps_overhead_dips.jpg',
  'sprite_legs_quad_ext_hamstring_curl.jpg',
  'sprite_legs_hack_squat_calves.jpg',
  'sprite_glutes_hipthrust_rdl.jpg',
  'sprite_legs_adductor_abductor.jpg',
  'sprite_shoulders_lateral_facepull.jpg',
  'sprite_shoulders_reardelt_shrugs_abs.jpg'
];

spriteSheets.forEach(sheetName => {
  const filePath = path.join(root, 'assets/sprites', sheetName);
  assert.ok(fs.existsSync(filePath), `La hoja de sprites ${sheetName} debe existir físicamente en disco`);
  assert.ok(fs.statSync(filePath).size > 40000, `La hoja ${sheetName} debe tener un peso gráfico válido (>40KB)`);
});

// 32.2 Verificar mapeo exacto de las nuevas hojas de hombro y core
assert.equal(spriteCatalog['lateral-raise'].spriteUrl, 'assets/sprites/sprite_shoulders_lateral_facepull.jpg');
assert.equal(spriteCatalog['lateral-raise'].row, 'top');
assert.equal(spriteCatalog['face-pull'].spriteUrl, 'assets/sprites/sprite_shoulders_lateral_facepull.jpg');
assert.equal(spriteCatalog['face-pull'].row, 'bottom');

assert.equal(spriteCatalog['rear-delt-shrugs'].spriteUrl, 'assets/sprites/sprite_shoulders_reardelt_shrugs_abs.jpg');
assert.equal(spriteCatalog['rear-delt-shrugs'].row, 'top');
assert.equal(spriteCatalog['cable-crunch-abs'].spriteUrl, 'assets/sprites/sprite_shoulders_reardelt_shrugs_abs.jpg');
assert.equal(spriteCatalog['cable-crunch-abs'].row, 'bottom');

// 32.3 Verificar detección de Fondos en Máquina sin interferencia del grupo pectoral
assert.equal(detectType({ id: 'mar-fondos-maquina', name: 'Fondos de tríceps en máquina sentada', muscle: 'Tríceps y pectoral inferior' }), 'machine-dips');
assert.equal(spriteCatalog['machine-dips'].spriteUrl, 'assets/sprites/sprite_triceps_overhead_dips.jpg');
assert.equal(spriteCatalog['machine-dips'].row, 'bottom');

// 32.4 Verificar detección de hombros, trapecio y abdomen
assert.equal(detectType({ id: 'jue-elevaciones-laterales', name: 'Elevaciones laterales en polea o mancuernas' }), 'lateral-raise');
assert.equal(detectType({ id: 'jue-face-pull-polea', name: 'Face Pull en polea alta con cuerda' }), 'face-pull');
assert.equal(detectType({ id: 'jue-pajaros-maquina', name: 'Vuelos posteriores en máquina (Rear Delt)' }), 'rear-delt-shrugs');
assert.equal(detectType({ id: 'jue-encogimientos-trapecio', name: 'Encogimientos de hombros (Trapecio)' }), 'rear-delt-shrugs');
assert.equal(detectType({ id: 'jue-crunch-polea', name: 'Crunch abdominal en polea alta' }), 'cable-crunch-abs');

// 32.5 Verificar que todos los 24 patrones biomecánicos del catálogo tienen hoja y fila válida
for (const [key, config] of Object.entries(spriteCatalog)) {
  assert.ok(['top', 'bottom'].includes(config.row), `El patrón ${key} debe tener fila 'top' o 'bottom'`);
  const fullSpritePath = path.join(root, config.spriteUrl);
  assert.ok(fs.existsSync(fullSpritePath), `El sprite ${config.spriteUrl} del patrón ${key} debe existir`);
}

// --- Suite 33: Muestra de Máquina y Músculo en Tarjetas y Ficha Técnica en Entrenamiento ---
console.log('Ejecutando Suite 33: Máquina y Músculo Directos en Tarjetas y Ayuda en Entrenamiento...');

// 33.1 Seleccionar día lunes y verificar presencia directa de máquina y músculo en tarjetas (solo muestra)
app.selectDay('lunes');
const mondayCards = doc.querySelectorAll('#exercises-list .exercise-card');
assert.ok(mondayCards.length > 0, 'Deben existir tarjetas de ejercicios en la vista de rutina');
const firstCard = mondayCards[0];

const cardPillEquip = firstCard.querySelector('.exercise-preview-pill.pill-equip');
const cardPillMuscle = firstCard.querySelector('.exercise-preview-pill.pill-muscle');
assert.equal(cardPillEquip, null, 'Máquina / Implemento debe haber sido eliminado de la tarjeta según solicitud');
assert.equal(cardPillMuscle, null, 'Músculo Principal debe haber sido eliminado de la tarjeta según solicitud');

// 33.4 Verificar botón de ayuda e información en la pantalla de entrenamiento (Focus Mode)
const focusHelpBtn = doc.getElementById('btn-focus-help');
const focusHelpPanel = doc.getElementById('focus-help-panel');
assert.ok(focusHelpBtn, 'La pantalla de entrenamiento debe incluir el botón de ayuda #btn-focus-help');
assert.ok(focusHelpPanel, 'La pantalla de entrenamiento debe incluir el panel #focus-help-panel');
assert.ok(focusHelpPanel.classList.contains('is-hidden'), 'El panel de ayuda en entrenamiento debe iniciar oculto');

focusHelpBtn.click();
assert.ok(!focusHelpPanel.classList.contains('is-hidden'), 'Al tocar #btn-focus-help, el panel de ayuda debe abrirse');
assert.ok(doc.getElementById('focus-ex-muscle-badge'), 'Debe existir indicador de músculo en focus');
assert.ok(doc.getElementById('focus-ex-equip-badge'), 'Debe existir indicador de máquina en focus');

focusHelpBtn.click();
assert.ok(focusHelpPanel.classList.contains('is-hidden'), 'Al volver a tocar #btn-focus-help, el panel de ayuda debe cerrarse');

// --- Suite 34: Flujo Dinámico de Alternancia entre Serie en Curso y Temporizador de Descanso ---
console.log('Ejecutando Suite 34: Alternancia entre Serie en Curso y Temporizador de Descanso...');

// 34.1 Iniciar sesión de entrenamiento limpia en Lunes
app.restoreOriginalSchedule();
app.startDayWorkoutSession('lunes', 0);

const focusActiveSetCard = doc.getElementById('focus-active-set-card');
const focusRestCard = doc.getElementById('focus-rest-card');
const actionBtn = doc.getElementById('btn-focus-action-set');
const actionText = doc.getElementById('focus-btn-action-text');
const restStartBtn = doc.getElementById('btn-focus-rest-start');

// 34.2 En estado activo de serie, el temporizador de descanso debe estar oculto
assert.ok(!focusActiveSetCard.classList.contains('is-hidden'), 'El panel de serie en curso debe estar visible inicialmente');
assert.ok(focusRestCard.classList.contains('is-hidden'), 'El panel del temporizador de descanso debe estar oculto inicialmente');
assert.ok(actionText.textContent.includes('Serie 1 Completada - Descansar'), 'El botón debe decir "Serie 1 Completada - Descansar"');

// 34.3 Al presionar "Serie 1 Completada - Descansar":
// Debe ocultarse el panel de la serie en curso y mostrarse el temporizador de descanso activo
actionBtn.click();

assert.ok(focusActiveSetCard.classList.contains('is-hidden'), 'El panel de la serie en curso debe ocultarse durante el descanso');
assert.ok(!focusRestCard.classList.contains('is-hidden'), 'El panel de descanso debe mostrarse durante el descanso');
assert.ok(focusRestCard.classList.contains('is-resting'), 'El panel de descanso debe tener la clase is-resting');
assert.ok(restStartBtn.textContent.includes('¡Listo! Comenzar serie 2...'), 'El botón de descansar debe cambiar por "¡Listo! Comenzar serie 2..."');

// 34.4 Al presionar "¡Listo! Comenzar serie 2...":
// Debe terminar el descanso, ocultarse de nuevo el panel de descanso y mostrarse el panel de la serie en curso actualizado
restStartBtn.click();

assert.ok(focusRestCard.classList.contains('is-hidden'), 'El panel de descanso debe volver a ocultarse tras terminar el descanso');
assert.ok(!focusActiveSetCard.classList.contains('is-hidden'), 'El panel de la serie en curso debe mostrarse de nuevo');
assert.equal(doc.getElementById('focus-active-set-counter').textContent.trim(), 'SERIE 2 DE 4', 'Debe haber avanzado a SERIE 2 DE 4');
assert.ok(actionText.textContent.includes('Serie 2 Completada - Descansar'), 'El botón debe decir "Serie 2 Completada - Descansar"');

app.exitWorkoutScreen();

// --- Suite 35: Verificación de Confirmación al Iniciar, Supresión de Textos Repetitivos, Culminación y Máquina Ocupada ---
console.log('Ejecutando Suite 35: Confirmación de Rutina, Textos Limpios, Culminación y Máquina Ocupada...');

// 35.1 Pantalla/Modal de confirmación al iniciar rutina del día
app.restoreOriginalSchedule();
const confirmDialog = doc.getElementById('workout-confirm-start-dialog');
assert.ok(confirmDialog, 'Debe existir el modal #workout-confirm-start-dialog');
app.openConfirmStartWorkoutDialog('lunes', 0);
assert.equal(confirmDialog.hidden, false, 'El modal de confirmación debe abrirse');
const confirmTitle = doc.getElementById('confirm-start-day-title');
assert.ok(confirmTitle.textContent.includes('LUNES'), 'El título de confirmación debe incluir el día');

// Proceder con el inicio de entrenamiento
const btnConfirmProceed = doc.getElementById('btn-confirm-start-proceed');
btnConfirmProceed.click();
assert.equal(app.getState().activeScreen, 'workout', 'Debe haber ingresado a la pantalla de entrenamiento tras confirmar');

// 35.2 Supresión de textos repetitivos y ausencia de botón volver
const exitBtn = doc.getElementById('btn-exit-workout-screen');
assert.ok(!exitBtn || exitBtn.style.display === 'none' || doc.querySelector('#btn-exit-workout-screen') === null, 'No debe haber botón de volver visible');

const dayProgressBadge = doc.getElementById('focus-day-progress-badge');
assert.ok(!dayProgressBadge || dayProgressBadge.style.display === 'none', 'No debe haber badge de 1 / 24 series en la parte superior');

const schemeNote = doc.getElementById('focus-current-set-scheme-note');
assert.ok(!schemeNote || schemeNote.style.display === 'none' || schemeNote.textContent.trim() === '', 'No debe haber texto de "Meta calculada para Serie..."');

const setsRepsLabel = doc.getElementById('focus-sets-reps-label');
const restTargetLabel = doc.getElementById('focus-rest-target-label');
assert.ok(!setsRepsLabel || setsRepsLabel.style.display === 'none', 'No debe haber "Serie X de X" en el panel del peso');
assert.ok(!restTargetLabel || restTargetLabel.style.display === 'none', 'No debe haber "Descanso sugerido" en el panel del peso');

// 35.3 Botón "Terminar Sesión" solo activo cuando todos los ejercicios se completen
const finishBtn = doc.getElementById('btn-focus-finish-workout');
assert.ok(finishBtn, 'Debe existir el botón #btn-focus-finish-workout');
assert.equal(finishBtn.disabled, true, 'El botón de terminar sesión debe estar bloqueado mientras queden ejercicios pendientes');

// 35.4 Botón de "Máquina Ocupada" en la cabecera, previsualizaciones en modal y actualización de interfaz alterna
const swapBtn = doc.getElementById('btn-focus-swap-alt');
assert.ok(swapBtn, 'Debe existir el botón #btn-focus-swap-alt');
assert.ok(swapBtn.textContent.includes('Máquina Ocupada'), 'El texto del botón debe decir "Máquina Ocupada"');
const origTitle = doc.getElementById('focus-ex-title').textContent.trim();
const origEquip = doc.getElementById('focus-ex-equip-badge').textContent.trim();
const origAnimType = doc.querySelector('#focus-sprite-stage .focus-sprite-box')?.dataset.animType;

// Abrir modal de máquina ocupada y verificar imagen de previsualización encima de cada opción
const currentEx = app.getState().schedule['lunes'].exercises[0];
app.openExerciseSwapModal('lunes', currentEx.id);
const swapCards = doc.querySelectorAll('#swap-alternatives-list .swap-card');
assert.ok(swapCards.length > 0, 'Debe listar alternativas de ejercicio');
swapCards.forEach(card => {
  const previewBox = card.querySelector('.swap-card-preview-box');
  assert.ok(previewBox, 'Cada opción en el panel de máquina ocupada debe tener una caja de imagen de previsualización encima del texto');
  const previewFrame = card.querySelector('.swap-card-preview-frame');
  assert.ok(previewFrame, 'Debe contener el marco de imagen del sprite');
});

// Aplicar alternativa
const alts = window.GYM_VISUALS.getExerciseAlternatives(currentEx);
assert.ok(alts.length > 0, 'Debe haber alternativas para el ejercicio');
const chosenAlt = alts[0];
app.swapExerciseAlternative('lunes', currentEx.id, chosenAlt);

const updatedTitle = doc.getElementById('focus-ex-title').textContent.trim();
const updatedEquip = doc.getElementById('focus-ex-equip-badge').textContent.trim();
const updatedAnimType = doc.querySelector('#focus-sprite-stage .focus-sprite-box')?.dataset.animType;

assert.notEqual(updatedTitle, origTitle, 'El título del ejercicio debe actualizarse al de la alternativa');
assert.notEqual(updatedAnimType, origAnimType, 'El tipo de animación/sprite del ejercicio debe actualizarse al de la alternativa');
assert.ok(swapBtn.textContent.includes('Máquina Ocupada'), 'El texto del botón debe mantener "Máquina Ocupada" para poder seleccionar otro ejercicio');
assert.ok(swapBtn.classList.contains('is-swapped'), 'El botón debe tener la clase de estado alternativo');

// Al abrir el modal nuevamente, la opción de restaurar ejercicio original debe estar presente
app.openExerciseSwapModal('lunes', currentEx.id);
const btnRestoreInModal = doc.getElementById('btn-restore-swap-original');
assert.ok(btnRestoreInModal && !btnRestoreInModal.hidden, 'La opción de restaurar ejercicio original debe estar visible en el panel');
btnRestoreInModal.click();

assert.equal(doc.getElementById('focus-ex-title').textContent.trim(), origTitle, 'Debe restaurarse el título original tras pulsar restaurar en el panel');
assert.equal(doc.querySelector('#focus-sprite-stage .focus-sprite-box')?.dataset.animType, origAnimType, 'Debe restaurarse el sprite original');

// 35.5 Culminación de ejercicio: quitar "REPETICIONES A REALIZAR..." y mostrar solo botón "Ejercicio completado..."
const dayObj35 = app.getState().schedule['lunes'];
const suite35Ex = dayObj35.exercises[0];
// Marcar todas las series del primer ejercicio
for (let s = 0; s < 4; s++) {
  suite35Ex.completedSets[s] = true;
}
app.stopRestTimer();
app.renderWorkoutFocusScreen();

const repsNumberBox = doc.getElementById('focus-reps-number-box');
assert.ok(!repsNumberBox || repsNumberBox.style.display === 'none', 'En ejercicio culminado debe ocultarse el cuadro de repeticiones a realizar');
const actionBtnCompleted = doc.getElementById('btn-focus-action-set');
assert.ok(actionBtnCompleted.textContent.includes('Ejercicio completado...'), 'El botón de acción debe decir "Ejercicio completado..."');

// Al presionar el botón de ejercicio completado, debe avanzar al siguiente ejercicio
actionBtnCompleted.click();
assert.equal(app.getState().activeExerciseIndex, 1, 'Debe haber avanzado automáticamente al Ejercicio 2');

// 35.6 Verificación de peso a ambos lados (mancuernas y discos) y etiqueta de reloj de sesión
const badgeDumbbell = app.formatLoadBadge({ name: 'Elevaciones Laterales con Mancuerna', loadValue: 12, equipment: 'Mancuernas' });
assert.equal(badgeDumbbell.main, '12 kg');
assert.ok(badgeDumbbell.sub.includes('c/mancuerna (ambos lados)'), 'Mancuernas deben indicar c/mancuerna (ambos lados)');

const badgeBarbell = app.formatLoadBadge({ name: 'Press de Pecho en Barra', loadValue: 60, equipment: 'Barra' });
assert.equal(badgeBarbell.main, '60 kg total');
assert.ok(badgeBarbell.sub.includes('30 kg a cada lado'), 'Barra/discos debe indicar peso a cada lado');

const badgePrensa = app.formatLoadBadge({ name: 'Prensa de piernas (Pies en parte alta)', loadValue: 100, equipment: 'Prensa 45' });
assert.equal(badgePrensa.main, '100 kg total');
assert.ok(badgePrensa.sub.includes('50 kg a cada lado'), 'Prensa debe indicar peso a cada lado');

const sessionClockLabel = doc.querySelector('.focus-live-clock .focus-clock-label');
assert.ok(sessionClockLabel && sessionClockLabel.textContent.includes('SESIÓN'), 'El cronómetro de la barra superior debe tener la etiqueta SESIÓN:');

app.exitWorkoutScreen();

// =========================================================================
// SUITE 36: Panel Informativo de Opciones Secundarias (Técnica y Descanso)
// =========================================================================
console.log('Ejecutando Suite 36: Panel Informativo de Opciones Secundarias (Técnica y Descanso)...');

app.startDayWorkoutSession('lunes', 0);
const focusEx = app.getState().schedule['lunes'].exercises[app.getState().activeExerciseIndex || 0];
assert.ok(focusEx, 'Debe haber un ejercicio activo en la sesión');

// Abrir el panel de técnica y descanso desde la opción secundaria
const btnFocusSetMode = doc.getElementById('btn-focus-set-mode');
assert.ok(btnFocusSetMode, 'Debe existir el botón de modo de serie en las opciones secundarias');
btnFocusSetMode.click();

const setModeDialog = doc.getElementById('exercise-setmode-dialog');
assert.ok(setModeDialog, 'Debe existir el modal de técnica de serie y descanso');
assert.equal(doc.getElementById('setmode-current-name').textContent, focusEx.name, 'El modal debe mostrar el nombre del ejercicio activo');

const optionsList = doc.getElementById('setmode-options-list');
assert.ok(optionsList, 'Debe existir la lista de opciones de técnica y descanso');
const optionCards = optionsList.querySelectorAll('.setmode-option-card');
assert.equal(optionCards.length, 4, 'Deben existir 4 tarjetas de técnica: normal, dropset, superserie, restpause');

optionCards.forEach(card => {
  const detailTexts = card.querySelectorAll('.setmode-detail-row');
  assert.ok(detailTexts.length >= 2, 'Cada técnica debe informar cómo se desarrolla la serie y cómo se descansa');
  assert.ok(card.textContent.includes('Cómo desarrollarla'), 'Debe incluir sección sobre cómo desarrollarla');
  assert.ok(card.textContent.includes('Cómo descansar'), 'Debe incluir sección sobre cómo descansar');
});

// Probar botón Cerrar sin cambiar
const initialMode = focusEx.setMode || 'normal';
const btnCloseSetMode = doc.getElementById('btn-setmode-close');
assert.ok(btnCloseSetMode, 'Debe existir el botón de cerrar en el panel informativo');
btnCloseSetMode.click();
assert.equal(focusEx.setMode || 'normal', initialMode, 'Cerrar el panel no debe alterar el modo del ejercicio');

// Volver a abrir y seleccionar Dropset
btnFocusSetMode.click();
const dropsetCard = optionsList.querySelector('.setmode-option-card[data-mode="dropset"]');
assert.ok(dropsetCard, 'Debe existir la tarjeta de Dropset');
dropsetCard.click();

const btnProceedSetMode = doc.getElementById('btn-setmode-proceed');
assert.ok(btnProceedSetMode, 'Debe existir el botón de continuar y aplicar modo');
assert.ok(btnProceedSetMode.textContent.includes('Dropset'), 'El botón continuar debe reflejar la opción seleccionada');
btnProceedSetMode.click();

assert.equal(focusEx.setMode, 'dropset', 'Al pulsar continuar debe aplicarse el modo Dropset al ejercicio');
assert.equal(focusEx.restSeconds, 45, 'El tiempo de descanso debe ajustarse a 45s para Dropset metabólico');

// Verificar que la interfaz del ejercicio refleje la técnica aplicada
app.renderWorkoutFocusScreen();
assert.ok(doc.getElementById('btn-focus-set-mode').textContent.includes('Dropset'), 'El botón en opciones secundarias debe mostrar el nuevo modo Dropset');

app.exitWorkoutScreen();

// =========================================================================
// SUITE 37: Paneles Informativos de RIR y Medición de Serie (TUT) + Quitar Cronómetro en Descanso
// =========================================================================
console.log('Ejecutando Suite 37: Paneles Informativos de RIR y TUT + Quitar Cronómetro en Descanso...');

app.startDayWorkoutSession('lunes', 0);
const focusEx37 = app.getState().schedule['lunes'].exercises[0];

// 37.1 Panel Informativo de RIR
const btnFocusRir = doc.getElementById('btn-focus-rir');
assert.ok(btnFocusRir, 'Debe existir el botón de RIR en opciones secundarias');
btnFocusRir.click();

const rirDialog = doc.getElementById('exercise-rir-dialog');
assert.ok(rirDialog, 'Debe existir el modal de RIR');
assert.equal(doc.getElementById('rir-current-name').textContent, focusEx37.name, 'El modal de RIR debe mostrar el nombre del ejercicio activo');

const rirList = doc.getElementById('rir-options-list');
assert.ok(rirList, 'Debe existir la lista de opciones de RIR');
const rirCards = rirList.querySelectorAll('.setmode-option-card');
assert.ok(rirCards.length >= 3, 'Deben existir opciones de RIR (RIR 2, RIR 1, RIR 0, RIR 3)');

rirCards.forEach(card => {
  assert.ok(card.textContent.includes('Qué significa'), 'Cada tarjeta de RIR debe explicar qué significa');
  assert.ok(card.textContent.includes('Cuándo aplicarlo'), 'Cada tarjeta de RIR debe explicar cuándo aplicarlo');
});

// Probar botón Cerrar sin cambiar RIR
const prevRir = focusEx37.targetRir || 'RIR 2';
const btnCloseRir = doc.getElementById('btn-rir-close');
assert.ok(btnCloseRir, 'Debe existir el botón de cerrar en el panel de RIR');
btnCloseRir.click();
assert.equal(focusEx37.targetRir || 'RIR 2', prevRir, 'Cerrar sin cambiar debe conservar el RIR anterior');

// Abrir y seleccionar RIR 1
btnFocusRir.click();
const rir1Card = rirList.querySelector('.setmode-option-card[data-rir="RIR 1"]');
assert.ok(rir1Card, 'Debe existir la tarjeta de RIR 1');
rir1Card.click();

const btnProceedRir = doc.getElementById('btn-rir-proceed');
assert.ok(btnProceedRir, 'Debe existir el botón de continuar en RIR');
assert.ok(btnProceedRir.textContent.includes('RIR 1'), 'El botón continuar debe reflejar RIR 1');
btnProceedRir.click();
assert.equal(focusEx37.targetRir, 'RIR 1', 'Al pulsar continuar debe aplicarse RIR 1 al ejercicio');

// 37.2 Panel Informativo de Medir Serie (TUT 3-1-1)
const btnFocusTut = doc.getElementById('btn-focus-tut');
assert.ok(btnFocusTut, 'Debe existir el botón de TUT en opciones secundarias');
btnFocusTut.click();

const tutDialog = doc.getElementById('exercise-tut-dialog');
assert.ok(tutDialog, 'Debe existir el modal de medición de serie (TUT)');
assert.equal(doc.getElementById('tut-current-name').textContent, focusEx37.name, 'El modal TUT debe mostrar el nombre del ejercicio');
assert.ok(tutDialog.textContent.includes('3 Segundos de Bajada'), 'Debe detallar la fase excéntrica (3s)');
assert.ok(tutDialog.textContent.includes('1 Segundo de Pausa'), 'Debe detallar la fase isométrica (1s)');
assert.ok(tutDialog.textContent.includes('1 Segundo de Subida'), 'Debe detallar la fase concéntrica (1s)');

// Probar botón Cerrar en TUT (debe decir solo Cerrar y tener tono rojo)
const btnCloseTut = doc.getElementById('btn-tut-close');
assert.ok(btnCloseTut, 'Debe existir botón de cerrar en TUT');
assert.ok(btnCloseTut.textContent.includes('Cerrar'), 'El botón debe decir Cerrar');
assert.ok(!btnCloseTut.textContent.includes('sin Iniciar'), 'El botón de TUT no debe contener "sin Iniciar"');
assert.ok(btnCloseTut.classList.contains('btn-close-danger'), 'El botón de cerrar debe tener la clase de tono rojo');
btnCloseTut.click();

// Abrir y presionar iniciar medición (debe decir "▶ Iniciar Medición" sin "Continuar e ")
btnFocusTut.click();
const btnProceedTut = doc.getElementById('btn-tut-proceed');
assert.ok(btnProceedTut, 'Debe existir botón de iniciar medición en TUT');
assert.ok(btnProceedTut.textContent.includes('Iniciar Medición'), 'El botón debe decir Iniciar Medición');
assert.ok(!btnProceedTut.textContent.includes('Continuar e'), 'No debe decir "Continuar e "');
btnProceedTut.click();

// Verificar que se inició la medición TUT para el ejercicio
assert.ok(btnFocusTut.classList.contains('is-timing') || doc.querySelector('.btn-tut-stopwatch-focus')?.textContent.includes('Finalizar'), 'El botón debe reflejar estado de medición activa');

// Detener la medición
btnFocusTut.click();

// 37.3 Verificación: quitar opción de cronómetro en el panel de descanso
// Completar una serie para activar el descanso
const actionBtn37 = doc.getElementById('btn-focus-action-set');
actionBtn37.click();

// Comprobar que en el descanso no existe o está suprimida la opción de cronómetro
const timerModeSwitcher = doc.querySelector('.timer-mode-switcher');
assert.ok(!timerModeSwitcher || timerModeSwitcher.style.display.includes('none') || timerModeSwitcher.getAttribute('aria-hidden') === 'true', 'La opción de cronómetro del panel de descanso debe estar suprimida');

// Limpiar timers
app.stopRestTimer();
app.exitWorkoutScreen();

// =========================================================================
// SUITE 38: Navegación Inteligente al Siguiente Ejercicio o al Pendiente
// =========================================================================
console.log('Ejecutando Suite 38: Navegación Inteligente al Siguiente Ejercicio o al Pendiente...');

app.restoreOriginalSchedule();
const suite38Exercises = app.getState().schedule['lunes'].exercises;
assert.ok(suite38Exercises.length >= 4, 'Deben haber al menos 4 ejercicios en Lunes');

// Caso 1: Ejercicio 0 se concluye, Ejercicio 1 está pendiente -> debe ir a Ejercicio 1
suite38Exercises.forEach(ex => {
  ex.completedSets = Array.from({ length: Number(ex.sets) || 4 }, () => false);
});
// Marcar completado solo el ejercicio 0
for (let s = 0; s < 4; s++) suite38Exercises[0].completedSets[s] = true;

app.startDayWorkoutSession('lunes', 0);
assert.equal(app.getState().activeExerciseIndex, 0, 'Debe iniciar en Ejercicio 0');
const advResult1 = app.advanceFromCompletedExercise('lunes');
assert.ok(advResult1, 'Debe haber avanzado');
assert.equal(app.getState().activeExerciseIndex, 1, 'Habiendo completado Ejercicio 0, debe avanzar al siguiente (Ejercicio 1)');

// Caso 2: Ejercicio 0 concluido, Ejercicio 1 YA CULMINADO, Ejercicio 2 pendiente
// -> al concluirse Ejercicio 0, debe saltar Ejercicio 1 y mostrar Ejercicio 2
app.selectFocusExercise(0);
assert.equal(app.getState().activeExerciseIndex, 0);
for (let s = 0; s < 4; s++) {
  suite38Exercises[0].completedSets[s] = true;
  suite38Exercises[1].completedSets[s] = true; // Ejercicio 1 ya culminado
  suite38Exercises[2].completedSets[s] = false; // Ejercicio 2 pendiente
}
const advResult2 = app.advanceFromCompletedExercise('lunes');
assert.ok(advResult2, 'Debe avanzar');
assert.equal(app.getState().activeExerciseIndex, 2, 'Si el siguiente (Ejercicio 1) ya fue culminado, debe mostrar el que falte terminar (Ejercicio 2)');

// Caso 3: Ejercicio 2 concluido, Ejercicios 3, 4 y 5 ya culminados, pero Ejercicio 1 quedó pendiente
// -> al concluirse Ejercicio 2, debe dar la vuelta hacia el que falta terminar (Ejercicio 1)
suite38Exercises.forEach((ex, idx) => {
  const isPending = idx === 1; // Solo el ejercicio 1 está incompleto
  ex.completedSets = Array.from({ length: Number(ex.sets) || 4 }, () => !isPending);
});
app.selectFocusExercise(2);
assert.equal(app.getState().activeExerciseIndex, 2);
const advResult3 = app.advanceFromCompletedExercise('lunes');
assert.ok(advResult3, 'Debe avanzar hacia el ejercicio pendiente');
assert.equal(app.getState().activeExerciseIndex, 1, 'Si los siguientes ya fueron culminados, debe mostrar el ejercicio que falte terminar (Ejercicio 1)');

// Caso 4: Todos los ejercicios del día culminados
suite38Exercises.forEach(ex => {
  ex.completedSets = Array.from({ length: Number(ex.sets) || 4 }, () => true);
});
app.renderWorkoutFocusScreen();
const finishBtn38 = doc.getElementById('btn-focus-finish-workout');
assert.ok(finishBtn38, 'Debe existir el botón de finalizar');
assert.equal(finishBtn38.disabled, false, 'Cuando todos los ejercicios están concluidos el botón terminar sesión debe estar activo');

app.exitWorkoutScreen();

// =========================================================================
// SUITE 39: Transiciones de Notificaciones, Animaciones en Botones y Arrastre de Paneles
// =========================================================================
console.log('Ejecutando Suite 39: Transiciones de Notificaciones, Animaciones en Botones y Arrastre de Paneles...');

// 39.1 Notificación Toast con animación y clase is-active
const toastEl = doc.getElementById('celebration-toast');
assert.ok(toastEl, 'Debe existir el contenedor #celebration-toast');
app.showCelebrationToast('🔥 ¡Prueba de notificación con transición fluida!');
assert.equal(toastEl.hidden, false, 'El toast no debe estar oculto al dispararse');
assert.ok(toastEl.classList.contains('is-active'), 'El toast debe tener la clase .is-active para la transición de entrada elástica');

// 39.2 Paneles modales con transición de arrastre desde abajo
const sampleDialog = doc.getElementById('exercise-setmode-dialog');
assert.ok(sampleDialog, 'Debe existir el modal de técnicas');
assert.ok(sampleDialog.classList.contains('gym-dialog'), 'Debe contener la clase .gym-dialog con transition translateY');

// 39.3 Verificación de paneles de serie y descanso en modo workout
app.restoreOriginalSchedule();
app.startDayWorkoutSession('lunes', 0);
const activeSetCard39 = doc.getElementById('focus-active-set-card');
assert.ok(activeSetCard39, 'Debe existir la tarjeta de serie activa');
assert.ok(!activeSetCard39.classList.contains('is-hidden'), 'La tarjeta de serie en curso debe estar visible al iniciar');

const actionBtn39 = doc.getElementById('btn-focus-action-set');
assert.ok(actionBtn39, 'Debe existir el botón principal de serie');

// Completar una serie y verificar que se active el descanso con transición de arrastre
actionBtn39.click();
const restCard39 = doc.getElementById('focus-rest-card');
assert.ok(restCard39, 'Debe existir la tarjeta de descanso');
assert.ok(!restCard39.classList.contains('is-hidden'), 'La tarjeta de descanso debe mostrarse al descansar');

app.stopRestTimer();
app.exitWorkoutScreen();

// =========================================================================
// SUITE 40: Adaptación Responsive de Cuadros de Notificaciones y Textos Largos
// =========================================================================
console.log('Ejecutando Suite 40: Adaptación Responsive de Cuadros de Notificaciones y Textos Largos...');

// 40.1 Verificación de Notificación Corta y Clase is-active
const toastEl40 = doc.getElementById('celebration-toast');
assert.ok(toastEl40, 'Debe existir el elemento #celebration-toast');
app.showCelebrationToast('🔊 Coach de Voz activado');
assert.equal(toastEl40.hidden, false, 'El toast debe ser visible');
assert.equal(toastEl40.textContent, '🔊 Coach de Voz activado');
assert.ok(toastEl40.classList.contains('is-active'), 'El toast debe tener la clase .is-active');
assert.ok(!toastEl40.classList.contains('is-warning'), 'Una notificación informativa normal no debe tener is-warning');

// 40.2 Verificación de Notificación Larga (Sobrecarga Progresiva / Textos extensos)
const longMessage = '📈 ¡Sobrecarga Progresiva en Prensa de piernas (Pies en parte alta)! 100 kg total → 105 kg total (1RM Est: 140 kg)';
app.showCelebrationToast(longMessage);
assert.equal(toastEl40.textContent, longMessage, 'El toast debe alojar el texto largo completo');
assert.ok(toastEl40.classList.contains('is-active'), 'El toast largo debe mantenerse activo');

// 40.3 Verificación de Notificación de Alerta / Advertencia (is-warning)
const warningMessage = '⚠️ Debes completar todos los ejercicios del día para terminar la sesión.';
app.showCelebrationToast(warningMessage);
assert.equal(toastEl40.textContent, warningMessage);
assert.ok(toastEl40.classList.contains('is-warning'), 'El toast con ⚠️ debe activar la clase .is-warning');

// 40.4 Auditoría de Reglas CSS Responsive para Cuadros de Notificaciones
const cssContent = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
assert.ok(cssContent.includes('.celebration-toast {'), 'styles.css debe contener regla para .celebration-toast');
assert.ok(cssContent.includes('max-width: min(calc(100vw - 28px), 480px);') || cssContent.includes('max-width:'), 'Debe contar con max-width responsive');
assert.ok(cssContent.includes('word-break: break-word;') || cssContent.includes('overflow-wrap: anywhere;'), 'Debe contar con adaptación de quiebre de palabra word-break');
assert.ok(cssContent.includes('.celebration-toast.is-warning'), 'Debe contar con estilos diferenciados para alertas is-warning');
assert.ok(cssContent.includes('@media (max-width: 480px)'), 'Debe contar con adaptación en media query de 480px');

// Re-verificación final absoluta: 0 etiquetas <svg> tras todas las pantallas y modales
assert.equal(doc.querySelectorAll('svg').length, 0, 'El DOM debe seguir teniendo CERO etiquetas <svg> tras todas las operaciones v1.9');

// =========================================================================
// SUITE 41: Panel de Estadísticas Finales por Pestañas, Copa con Espacio Superior, Botón Anaranjado y Bloqueo de Re-inicio en Días Culminados
// =========================================================================
console.log('Ejecutando Suite 41: Panel de Estadísticas Finales por Pestañas, Copa Superior, Botón Anaranjado y Bloqueo de Re-inicio...');

// 41.1 Verificación de Espaciado Superior para la Copa y Botón de Cierre
const trophyEl = doc.querySelector('.results-trophy-badge');
assert.ok(trophyEl, 'Debe existir el elemento .results-trophy-badge para la copa triunfal');
const closeResultsTopBtn = doc.getElementById('btn-close-results-top');
assert.ok(closeResultsTopBtn, 'Debe existir el botón de cierre superior #btn-close-results-top');
assert.ok(cssContent.includes('.results-dialog-header {'), 'Debe existir la regla CSS para .results-dialog-header');
assert.ok(cssContent.includes('padding-top: 22px;') || cssContent.includes('padding-top:'), 'La cabecera debe contar con padding superior para alejar la copa del límite del panel');

// 41.2 Verificación de Paneles y Navegación Exclusiva por Botones Inferiores (Sin Barra de Pestañas)
assert.ok(!doc.querySelector('.results-tabs-bar'), 'No debe existir la barra de pestañas superiores en las estadísticas');

const panelMetrics = doc.getElementById('results-tab-metrics');
const panelRecovery = doc.getElementById('results-tab-recovery');
const panelOverload = doc.getElementById('results-tab-overload');
assert.ok(panelMetrics && panelRecovery && panelOverload, 'Deben existir los 3 paneles de resultados');

// Abrir diálogo de resultados
app.openWorkoutResultsDialog(null, null);
assert.ok(!panelMetrics.hidden, 'El panel de métricas debe estar visible por defecto al abrir');
assert.ok(panelRecovery.hidden, 'El panel de recuperación debe estar oculto inicialmente');
assert.ok(panelOverload.hidden, 'El panel de sobrecarga debe estar oculto inicialmente');

// 41.3 Verificación de Texto de Recuperación y Nutrición Limpio
const recNoteEl = doc.getElementById('results-recovery-note');
assert.ok(recNoteEl, 'Debe existir el elemento #results-recovery-note');
assert.ok(!recNoteEl.textContent.includes('se aplicarán las siguientes cargas'), 'El texto de recuperación no debe mencionar cargas proyectadas');

// Navegar a Panel 2 mediante botón Siguiente
const nextBtn1 = doc.getElementById('btn-results-next-1');
assert.ok(nextBtn1, 'Debe existir el botón siguiente en panel 1');
nextBtn1.click();
assert.ok(panelMetrics.hidden, 'Panel 1 debe ocultarse');
assert.ok(!panelRecovery.hidden, 'Panel 2 debe mostrarse');

// Navegar a Panel 1 mediante botón Anterior
const prevBtn2 = doc.getElementById('btn-results-prev-2');
assert.ok(prevBtn2, 'Debe existir el botón anterior en panel 2');
prevBtn2.click();
assert.ok(!panelMetrics.hidden, 'Panel 1 debe volver a mostrarse');

// Navegar a Panel 3 mediante botón Siguiente
const nextBtn2 = doc.getElementById('btn-results-next-2');
assert.ok(nextBtn2, 'Debe existir el botón siguiente en panel 2');
nextBtn1.click(); // ir a 2
nextBtn2.click(); // ir a 3
assert.ok(panelRecovery.hidden, 'Panel 2 debe ocultarse');
assert.ok(!panelOverload.hidden, 'Panel 3 debe mostrarse');

// 41.4 Verificación de Botones de Acción en el Panel Final
const applyProgBtn = doc.getElementById('btn-results-apply-progression');
const viewStatsBtn = doc.getElementById('btn-results-view-stats');
const closePlanBtn = doc.getElementById('btn-results-close-plan');
assert.ok(applyProgBtn, 'Debe existir #btn-results-apply-progression');
assert.ok(viewStatsBtn, 'Debe existir #btn-results-view-stats');
assert.ok(closePlanBtn, 'Debe existir #btn-results-close-plan');

// Verificar que los botones residen dentro del panel final #results-tab-overload
assert.ok(panelOverload.contains(applyProgBtn), 'El botón de aplicar cargas debe estar dentro de la pestaña final');
assert.ok(panelOverload.contains(viewStatsBtn), 'El botón de ver estadísticas debe estar dentro de la pestaña final');
assert.ok(panelOverload.contains(closePlanBtn), 'El botón de volver al plan semanal debe estar dentro de la pestaña final');

// Verificar que el botón de volver al plan tiene estilo anaranjado
assert.ok(closePlanBtn.classList.contains('btn-results-amber'), 'El botón de volver al plan semanal debe tener la clase .btn-results-amber');
assert.ok(cssContent.includes('.btn-results-amber {'), 'styles.css debe definir el estilo .btn-results-amber');

app.closeWorkoutResultsDialog();

// 41.4 Verificación de Bloqueo de Re-inicio en Días Culminados
app.restoreOriginalSchedule();
const lunesExs = app.getState().schedule.lunes.exercises;
lunesExs.forEach(ex => {
  ex.completedSets = Array.from({ length: Number(ex.sets) || 4 }, () => true);
});
assert.equal(app.isDayCompleted('lunes'), true, 'El día Lunes debe ser detectado como culminado');

// Al llamar openConfirmStartWorkoutDialog para un día culminado, NO debe abrir la pantalla de workout
app.selectDay('lunes');
app.openConfirmStartWorkoutDialog('lunes');
assert.notEqual(app.getState().activeScreen, 'workout', 'No debe abrir la pantalla de entrenamiento activa');
const resultsDlg = doc.getElementById('workout-results-dialog');
assert.ok(resultsDlg.hasAttribute('open') || !resultsDlg.hidden, 'Debe abrir el diálogo de resultados y estadísticas');

app.closeWorkoutResultsDialog();

// Al llamar startDayWorkoutSession para un día culminado, tampoco debe abrir la pantalla workout
app.startDayWorkoutSession('lunes');
assert.notEqual(app.getState().activeScreen, 'workout', 'startDayWorkoutSession tampoco debe abrir la interfaz de workout');

// =========================================================================
// 42. VERIFICACIÓN INTEGRAL DE ACTUALIZACIÓN v1.9.22
// - Retiro de opciones redundantes de la barra superior
// - Panel de Restaurar Días específicos o todos
// - Botón Cerrar (X) rojo institucional en perfil de usuario
// - Detección del día actual y panel de reorganización/desplazamiento muscular
// - Navegación principal limpia de 3 opciones con transición lateral de paneles
// - Limpieza de cronómetro/sesión en drawer y texto complementario en hub
// - Nuevos íconos de gym/fuerza oscuros y metálicos
// =========================================================================
console.log('Ejecutando Suite 42: Opciones Limpias, Restaurar Días, Reorganización Muscular, Botón Rojo y Estilo Gym...');

// 42.1 Opciones removidas de la cabecera
assert.equal(doc.getElementById('btn-toggle-voice-coach'), null, 'Coach Activo debe estar retirado');
assert.equal(doc.getElementById('btn-toggle-wakelock'), null, 'Pantalla Activa/Fija debe estar retirada');
assert.equal(doc.getElementById('btn-toggle-animations'), null, 'Pausar Animaciones debe estar retirada');
assert.equal(doc.getElementById('btn-reset-week-progress'), null, 'Reiniciar Series directo debe estar retirado');

// 42.2 Panel de Restaurar Días
const restoreScheduleBtn = doc.getElementById('btn-restore-schedule');
assert.ok(restoreScheduleBtn, 'El botón de Restaurar Días debe existir en las herramientas');
const restoreDaysDlg = doc.getElementById('restore-days-dialog');
assert.ok(restoreDaysDlg, 'Debe existir el diálogo #restore-days-dialog');

// Abrir diálogo de restaurar días
app.openRestoreDaysDialog();
assert.ok(restoreDaysDlg.hasAttribute('open') || !restoreDaysDlg.hidden, 'El diálogo de restaurar días debe abrirse');
const dayCheckboxes = restoreDaysDlg.querySelectorAll('input[name="restoreDayOption"]');
assert.equal(dayCheckboxes.length, 7, 'Debe haber un checkbox por cada día de la semana');

// Probar función de restaurar días seleccionados
app.getState().schedule.lunes.exercises[0].completedSets = [true, true, true, true];
assert.equal(app.getState().schedule.lunes.exercises[0].completedSets.filter(Boolean).length, 4);
app.restoreSelectedDays(['lunes']);
assert.equal(app.getState().schedule.lunes.exercises[0].completedSets.filter(Boolean).length, 0, 'Lunes debe haberse reiniciado');
app.closeRestoreDaysDialog();

// 42.3 Botón de salida (X) en el panel de usuario
const profileDlg = doc.getElementById('profile-onboarding-dialog');
const closeProfileBtn = doc.getElementById('btn-close-profile-dialog');
assert.ok(profileDlg && closeProfileBtn, 'Debe existir el diálogo de perfil y su botón de salida');
assert.ok(closeProfileBtn.classList.contains('btn-close-danger'), 'El botón X de salida debe tener la clase .btn-close-danger de color rojo');
assert.ok(cssContent.includes('.btn-close-danger') || cssContent.includes('#btn-close-profile-dialog'), 'styles.css debe definir el estilo rojo para el botón X');

// Abrir y cerrar perfil
app.openProfileOnboardingDialog();
assert.ok(profileDlg.hasAttribute('open') || !profileDlg.hidden, 'El diálogo de perfil debe abrirse');
closeProfileBtn.click();
assert.ok(!profileDlg.hasAttribute('open') || profileDlg.hidden, 'El diálogo de perfil debe cerrarse al hacer clic en X');

// 42.4 Navegación de 3 opciones y transiciones laterales
const bottomNav = doc.getElementById('bottom-app-nav');
assert.ok(bottomNav, 'Debe existir #bottom-app-nav');
const navButtons = bottomNav.querySelectorAll('.bottom-nav-btn');
assert.equal(navButtons.length, 3, 'La barra de navegación debe tener exactamente 3 opciones (plan, stats, hub), sin opción redundante de entrenar');
assert.equal(doc.querySelector('.bottom-nav-btn[data-nav-screen="workout"]'), null, 'No debe existir el botón Entrenar en la barra de navegación');

// Probar transiciones laterales de panel
app.switchAppScreen('stats');
const statsScreen = doc.getElementById('screen-stats');
assert.ok(statsScreen.classList.contains('slide-in-right') || statsScreen.classList.contains('slide-in-left'), 'El panel de estadísticas debe tener clase de animación lateral');

app.switchAppScreen('plan');
const planScreen = doc.getElementById('screen-plan');
assert.ok(planScreen.classList.contains('slide-in-right') || planScreen.classList.contains('slide-in-left'), 'El panel del plan debe tener clase de animación lateral');

// 42.5 Limpieza en Hub y Drawer
assert.equal(doc.getElementById('workout-stopwatch-bar'), null, 'El cronómetro del drawer debe estar removido');
assert.equal(doc.getElementById('compact-stopwatch-digits'), null, 'El texto Sesión: XX:XX:XX debe estar removido');
const hubScreen = doc.getElementById('screen-hub');
assert.ok(!hubScreen.textContent.includes('Opciones complementarias agrupadas'), 'El texto Opciones complementarias agrupadas debe estar retirado');

// 42.6 Íconos de Gym y Fuerza con estilo oscuro y metálico
const gymIcons = doc.querySelectorAll('.gym-strength-icon');
assert.ok(gymIcons.length >= 3, 'Deben existir los íconos de fuerza de gimnasio');
assert.ok(cssContent.includes('.gym-strength-icon'), 'styles.css debe definir los estilos de .gym-strength-icon');

// 42.7 Detección de día actual y Reorganización Muscular
const todayId = app.detectDefaultDay();
assert.ok(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].includes(todayId));

// Simular selección de otro día
const otherDay = todayId === 'lunes' ? 'miercoles' : 'lunes';
app.selectDay(otherDay);
const dayCta = doc.getElementById('btn-start-day-workout');
assert.ok(dayCta.classList.contains('btn-move-muscle-cta'), 'Al ver otro día, el CTA debe transformarse en botón de mover entrenamiento');
assert.ok(dayCta.textContent.includes('Mover'), 'El texto debe indicar mover entrenamiento a hoy');

// Abrir panel de confirmación de movimiento muscular
app.openMoveMuscleDialog(otherDay);
const moveDlg = doc.getElementById('move-muscle-confirm-dialog');
assert.ok(moveDlg.hasAttribute('open') || !moveDlg.hidden, 'El diálogo de reorganización debe estar abierto');
assert.ok(moveDlg.textContent.includes('actualizarán') || moveDlg.textContent.includes('reorganizarán'), 'Debe advertir que se actualizarán los demás días');

// Ejecutar movimiento muscular
const prevOtherTitle = app.getState().schedule[otherDay].title;
app.moveMuscleToCurrentDay(otherDay);
assert.equal(app.getState().schedule[todayId].title, prevOtherTitle, 'El músculo de otro día debe pasar a ser el de hoy');
app.closeMoveMuscleDialog();

// =========================================================================
// 43. VERIFICACIÓN INTEGRAL DE ACTUALIZACIÓN v1.9.23
// - Ocultamiento de '...Opciones del Día' al ver día distinto de hoy
// - Retiro de búsqueda de ejercicios en la vista de rutina
// - Tarjetas de ejercicio solo de muestra (nada de modificación)
// - Solo muestra nivel/peso, reps, máquina y músculo
// - Retiro de botones Ver Ejercicio, Opciones y Técnica, y Marca actual
// - Calentamientos solo de muestra
// - Prevención total de desbordes en navegación y pantallas
// =========================================================================
console.log('Ejecutando Suite 43: Tarjetas Solo Muestra, Sin Opciones en Otro Día, Sin Búsqueda y Sin Desbordes...');

// 43.1 Ocultar '...Opciones del día' al ver otro día
const currentDayToday = app.detectDefaultDay();
const dayNotToday = currentDayToday === 'lunes' ? 'martes' : 'lunes';
app.selectDay(dayNotToday);
const dayMenuNotToday = doc.getElementById('day-secondary-menu');
assert.ok(dayMenuNotToday, 'Debe existir el elemento #day-secondary-menu');
assert.equal(dayMenuNotToday.hidden, true, 'El botón ...Opciones del día NO debe mostrarse en días distintos al actual');

// Al volver al día actual
app.selectDay(currentDayToday);
if (currentDayToday === 'domingo') {
  assert.equal(doc.getElementById('day-secondary-menu').hidden, true, 'En domingo NO debe haber botón de opciones del día');
} else {
  assert.equal(doc.getElementById('day-secondary-menu').hidden, false, 'El botón ...Opciones del día debe mostrarse en el día actual');
}

// 43.2 Retiro de la opción de buscar ejercicio en la rutina
assert.equal(doc.getElementById('exercise-search-input'), null, 'La barra de búsqueda de ejercicio debe estar removida de la interfaz del día');
assert.equal(doc.querySelector('.exercise-search-bar'), null, 'El contenedor exercise-search-bar debe estar removido');

// 43.3 Tarjetas de ejercicios de la pantalla principal solo de muestra (nada de modificación)
app.selectDay('lunes');
const previewCards = doc.querySelectorAll('#exercises-list .exercise-card');
assert.equal(previewCards.length, 6, 'Deben renderizarse las 6 tarjetas de ejercicios');

previewCards.forEach((card, idx) => {
  // Debe tener encabezado con el título
  const title = card.querySelector('h3.exercise-card-title');
  assert.ok(title && title.textContent.trim().length > 0, `Card ${idx + 1} debe mostrar el nombre del ejercicio`);

  // Textos de Carga y Reps eliminados de las tarjetas según solicitud 10
  const pillLoad = card.querySelector('.exercise-preview-pill.pill-load');
  const pillReps = card.querySelector('.exercise-preview-pill.pill-reps');
  const pillEquip = card.querySelector('.exercise-preview-pill.pill-equip');
  const pillMuscle = card.querySelector('.exercise-preview-pill.pill-muscle');

  assert.equal(pillLoad, null, `Card ${idx + 1} NO debe mostrar Carga / Nivel según solicitud 10`);
  assert.equal(pillReps, null, `Card ${idx + 1} NO debe mostrar Series y Reps según solicitud 10`);
  assert.equal(pillEquip, null, `Card ${idx + 1} NO debe mostrar Máquina/Implemento`);
  assert.equal(pillMuscle, null, `Card ${idx + 1} NO debe mostrar Músculo Principal`);

  // NO debe tener botones de Ver Ejercicio, Opciones y Técnica, ni Marca actual
  assert.equal(card.querySelector('.btn-open-ex-focus'), null, `Card ${idx + 1} NO debe tener el botón de Ver ejercicio`);
  assert.equal(card.querySelector('.ex-card-options-menu'), null, `Card ${idx + 1} NO debe tener el menú de Opciones y Técnica`);
  assert.equal(card.querySelector('.badge-user-base'), null, `Card ${idx + 1} NO debe tener el texto de Marca actual`);

  // NO debe tener controles de modificación interactivos
  assert.equal(card.querySelectorAll('.btn-step-load').length, 0, `Card ${idx + 1} no debe tener botones de aumentar/disminuir carga`);
  assert.equal(card.querySelectorAll('.btn-set-check').length, 0, `Card ${idx + 1} no debe tener botones interactivos de series`);
  assert.equal(card.querySelectorAll('.btn-tut-stopwatch').length, 0, `Card ${idx + 1} no debe tener botones de cronómetro TUT`);
});

// 43.4 Calentamientos solo de muestra
const warmupCards = doc.querySelectorAll('#warmup-steps-list .warmup-step-item');
assert.ok(warmupCards.length > 0, 'Deben mostrarse los pasos de calentamiento');
assert.equal(doc.getElementById('btn-complete-all-warmup'), null, 'El botón interactivo de marcar todos los calentamientos debe estar retirado');

// 43.5 Reglas CSS contra desbordes
assert.ok(cssContent.includes('overflow-x: hidden'), 'styles.css debe incluir contención overflow-x: hidden');
assert.ok(cssContent.includes('.exercise-preview-pill'), 'styles.css debe definir el estilo para las pills de muestra');

// 43.6 Verificación Responsive del Botón de Perfil de Usuario en Pantalla Principal
const btnProfile = doc.getElementById('btn-header-profile');
assert.ok(btnProfile, 'Debe existir el botón #btn-header-profile');
assert.ok(btnProfile.querySelector('.btn-profile-avatar'), 'El botón de perfil debe incluir avatar/icono dedicado .btn-profile-avatar');
const tagProfile = doc.getElementById('header-profile-tag');
assert.ok(tagProfile, 'El botón de perfil debe incluir el tag .btn-profile-tag');

// Verificar apertura y cierre del panel de usuario
btnProfile.click();
assert.ok(doc.getElementById('profile-onboarding-dialog').hasAttribute('open') || !doc.getElementById('profile-onboarding-dialog').hidden, 'Al hacer clic en el botón de perfil debe abrirse el diálogo');
app.closeProfileOnboardingDialog();
assert.ok(!doc.getElementById('profile-onboarding-dialog').hasAttribute('open') || doc.getElementById('profile-onboarding-dialog').hidden, 'Al cerrar el diálogo debe quedar oculto');

// Verificar estilos responsive y contención en CSS
assert.ok(cssContent.includes('.btn-header-profile'), 'styles.css debe definir estilos dedicados para .btn-header-profile');
assert.ok(cssContent.includes('.btn-profile-tag'), 'styles.css debe definir estilos responsive con elipsis para .btn-profile-tag');
assert.ok(cssContent.includes('.btn-profile-avatar'), 'styles.css debe definir avatar para el botón de perfil');

// =========================================================================
// SUITE 44: INTERFAZ DOMINICAL CON CONTROL BIOMECÁNICO DE DESCANSO Y RECÁLCULO
// =========================================================================
console.log('Ejecutando Suite 44: Interfaz Dominical, Control Biomecánico de Descanso y Recálculo...');

// 44.1 Configuración de Domingo en pantalla principal
app.restoreOriginalSchedule();
app.selectDay('domingo');

const sundayStartBtn = doc.getElementById('btn-start-day-workout');
assert.ok(sundayStartBtn, 'Debe existir el botón principal de inicio en domingo');
const todayKey44 = app.detectDefaultDay();
if (todayKey44 === 'domingo') {
  assert.equal(sundayStartBtn.textContent.trim(), 'Iniciar día de ejercicio', 'El botón en domingo debe titular "Iniciar día de ejercicio"');
  assert.ok(sundayStartBtn.classList.contains('btn-sunday-recover-cta'), 'El botón debe tener la clase temática .btn-sunday-recover-cta');
} else {
  assert.equal(sundayStartBtn.style.display, 'none', 'En día de descanso no se muestra el botón si el día actual no es de descanso');
}

// 44.2 Elementos prohibidos en Domingo: Sin opciones de día, sin mapa anatómico, sin opciones de días incrustadas
const sundayMenu = doc.getElementById('day-secondary-menu');
assert.equal(sundayMenu.hidden, true, 'En Domingo NO debe haber el botón de ...Opciones del día');

const sundayAnatomy = doc.getElementById('anatomy-collapsible');
assert.equal(sundayAnatomy.hidden, true, 'En Domingo NO debe mostrarse el mapa anatómico');

const quickImportDays = doc.querySelector('#exercises-list .quick-import-days');
assert.equal(quickImportDays, null, 'En Domingo NO deben mostrarse opciones de recuperación incrustadas en la lista');

// 44.3 Apertura del Panel de Recuperación Dominical
app.openSundayRecoveryDialog();
const recoverDialog = doc.getElementById('sunday-recovery-dialog');
assert.ok(recoverDialog.hasAttribute('open') || !recoverDialog.hidden, 'El panel de recuperación dominical debe abrirse');

// 44.4 Cálculo Biomecánico de Horas de Descanso
const recoveryOpts = app.calculateSundayRecoveryOptions();
assert.equal(recoveryOpts.length, 6, 'Debe evaluar los 6 días de Lunes a Sábado');

// Sábado debe estar bloqueado (entrenado ayer sábado ~18h)
const optSabado = recoveryOpts.find(o => o.dayKey === 'sabado');
assert.ok(optSabado, 'Debe evaluar sábado');
assert.equal(optSabado.canTrain, false, 'Sábado debe estar bloqueado por falta de descanso (< 48h)');
assert.ok(optSabado.reason.includes('ayer sábado'), 'El motivo de bloqueo de sábado debe indicar descanso insuficiente');

// Miércoles (si tiene piernas/glúteos coincidente con sábado) debe estar bloqueado por músculo reciente
const optMiercoles = recoveryOpts.find(o => o.dayKey === 'miercoles');
if (optMiercoles && (optMiercoles.muscleGroup.toLowerCase().includes('pierna') || optMiercoles.muscleGroup.toLowerCase().includes('glúteo'))) {
  assert.equal(optMiercoles.canTrain, false, 'Días que compartan pierna/glúteo estimulado ayer deben estar bloqueados');
}

// Lunes y Martes (torso/espalda/pecho) deben estar aptos (>= 48h)
const optLunes = recoveryOpts.find(o => o.dayKey === 'lunes');
assert.ok(optLunes, 'Debe evaluar lunes');
assert.equal(optLunes.canTrain, true, 'Lunes debe estar disponible y recuperado');
assert.ok(optLunes.hoursSince >= 48, 'Lunes debe tener más de 48h de recuperación');

// 44.5 Selección de rutina apta y apertura del Panel de Confirmación con Recálculo
app.openSundayConfirmDialog('lunes');
const sundayConfirmDlg = doc.getElementById('sunday-confirm-dialog');
assert.ok(sundayConfirmDlg.hasAttribute('open') || !sundayConfirmDlg.hidden, 'Elegir una rutina debe abrir #sunday-confirm-dialog');

const confirmContent = doc.getElementById('sunday-confirm-content');
assert.ok(confirmContent.textContent.includes('Lunes'), 'El panel de confirmación debe detallar la rutina elegida');
assert.ok(confirmContent.textContent.includes('Recálculo Preventivo Requerido') || confirmContent.textContent.includes('Ajuste Automático'), 'Debe advertir sobre el recálculo necesario para los días siguientes');

// 44.6 Aplicación de la Rutina y Recálculo Automático
app.applySundayRoutine('lunes');

// Domingo ahora debe tener los ejercicios de la rutina de lunes cargados
const sundayExercises = doc.querySelectorAll('#exercises-list .exercise-card');
assert.equal(sundayExercises.length, 6, 'Domingo debe tener cargados los 6 ejercicios de la rutina elegida');

// Botón de inicio de domingo ahora debe permitir iniciar el entrenamiento activo
const updatedSundayBtn = doc.getElementById('btn-start-day-workout');
assert.ok(updatedSundayBtn.textContent.includes('Pantalla Enfoque') || updatedSundayBtn.textContent.includes('Iniciar'), 'El botón debe reflejar la rutina lista');

// Los diálogos deben estar cerrados
assert.ok(!recoverDialog.hasAttribute('open') || recoverDialog.hidden, 'El diálogo de recuperación debe estar cerrado');
assert.ok(!sundayConfirmDlg.hasAttribute('open') || sundayConfirmDlg.hidden, 'El diálogo de confirmación debe estar cerrado');

// Re-verificación final absoluta: 0 etiquetas <svg>
assert.equal(doc.querySelectorAll('svg').length, 0, 'El DOM debe seguir teniendo CERO etiquetas <svg>');

// =========================================================================
// SUITE 45: EXPANSIÓN Y CONTRACCIÓN SUAVE DE PANELES E ÍCONOS ÚNICOS DE GYM
// =========================================================================
console.log('Ejecutando Suite 45: Expansión y Contracción Suave de Paneles e Íconos Propios de Gym...');

// 45.1 Efecto suave y fluido de expansión y contracción de paneles
assert.equal(typeof app.initSmoothCollapsibles, 'function', 'GymApp debe exportar initSmoothCollapsibles');
app.initSmoothCollapsibles();

const accordionEl = doc.querySelector('.overview-accordion');
assert.ok(accordionEl, 'Debe existir al menos un acordeón .overview-accordion');
assert.equal(accordionEl.dataset.smoothBound, 'true', 'El acordeón debe estar vinculado al controlador de expansión suave');

const summaryEl = accordionEl.querySelector('summary');
assert.ok(summaryEl, 'El acordeón debe tener su elemento summary');

// Simular clic para abrir/cerrar suavemente
const initialOpen = accordionEl.open;
summaryEl.click();
// El estado debe alternar correctamente
assert.equal(accordionEl.open, !initialOpen, 'El clic en summary debe alternar el estado de apertura');

// Reglas CSS de animación suave y chevron rotatorio
assert.ok(cssContent.includes('details.overview-accordion'), 'styles.css debe definir estilos de transición para details.overview-accordion');
assert.ok(cssContent.includes('panelSmoothExpand'), 'styles.css debe definir keyframes panelSmoothExpand para entrada suave');
assert.ok(cssContent.includes('transform: rotate(-135deg)'), 'styles.css debe definir la rotación de chevron fluido en [open]');

// 45.2 Íconos propios de gimnasio (sin íconos de sistema, estilo fuerza/hierro/plomo)
const fsMod = require('fs');
const pathMod = require('path');
const iconDir = pathMod.join(__dirname, '../assets/icons');

const expectedIcons = [
  'gym-barbell.png',
  'gym-dumbbell.png',
  'gym-plate.png',
  'gym-biceps.png',
  'gym-trophy.png',
  'gym-lightning.png',
  'gym-calendar.png',
  'gym-stats.png',
  'gym-user.png',
  'gym-gear.png',
  'gym-shield.png',
  'gym-shaker.png',
  'gym-timer.png',
  'gym-restore.png',
  'gym-flame.png',
  'gym-rocket.png'
];

expectedIcons.forEach(iconName => {
  const iconPath = pathMod.join(iconDir, iconName);
  assert.ok(fsMod.existsSync(iconPath), `Debe existir el archivo de ícono propio ${iconName}`);
  const stat = fsMod.statSync(iconPath);
  assert.ok(stat.size > 200, `El archivo ${iconName} debe ser un PNG válido no vacío`);
});

// 45.3 Verificación de íconos coloridos en navegación inferior
const navPlan = doc.querySelector('.bottom-nav-btn[data-nav-screen="plan"] .bottom-nav-icon');
const navStats = doc.querySelector('.bottom-nav-btn[data-nav-screen="stats"] .bottom-nav-icon');
const navHub = doc.querySelector('.bottom-nav-btn[data-nav-screen="hub"] .bottom-nav-icon');

assert.ok(navPlan && navPlan.textContent.includes('🏋️'), 'El botón de Rutina debe mostrar el ícono colorido 🏋️');
assert.ok(navStats && navStats.textContent.includes('📈'), 'El botón de Progreso debe mostrar el ícono colorido 📈');
assert.ok(navHub && navHub.textContent.includes('⚙️'), 'El botón de Menú/Extras debe mostrar el ícono colorido ⚙️');

// 45.4 Estilos CSS para el sistema de íconos
assert.ok(cssContent.includes('.gym-ico'), 'styles.css debe definir la clase base .gym-ico');
assert.ok(cssContent.includes('.gym-ico-barbell'), 'styles.css debe definir el ícono barbell');
assert.ok(cssContent.includes('.gym-ico-stats'), 'styles.css debe definir el ícono stats');
assert.ok(cssContent.includes('.gym-ico-gear'), 'styles.css debe definir el ícono gear');

// Re-verificación final absoluta: 0 etiquetas <svg>
assert.equal(doc.querySelectorAll('svg').length, 0, 'El DOM debe seguir teniendo CERO etiquetas <svg>');

// =========================================================================
// SUITE 46: LIMPIEZA DE TEXTOS EN EJERCICIOS, CALENTAMIENTO CON IMÁGENES Y REEMPLAZO DOMINGO
// =========================================================================
console.log('Ejecutando Suite 46: Limpieza de Textos, Calentamiento con Imágenes y Reemplazo Domingo...');

// 46.1 Eliminación del texto de cabecera de la sección de ejercicios
app.selectDay('lunes');
assert.equal(doc.querySelector('.exercises-section .unit-legend'), null, 'El texto "Visualización y datos del entrenamiento programado" debe estar eliminado');
assert.ok(!doc.body.textContent.includes('Visualización y datos del entrenamiento programado'), 'El texto no debe existir en el documento');
const exHeading = doc.getElementById('exercises-heading');
assert.ok(!exHeading || exHeading.textContent.trim() === '' || exHeading.classList.contains('visually-hidden'), 'El texto "Ejercicios de Lunes (Estándar 4 series × 12 reps)" debe estar eliminado');

// 46.2 Eliminación de "Frecuencia X..." y "Descanso" en subtítulos y etiquetas
app.selectDay('viernes');
const fridaySub = doc.getElementById('day-subtitle');
assert.ok(!fridaySub.textContent.includes('Frecuencia 2'), 'El subtítulo de Viernes no debe decir "Frecuencia 2"');
assert.ok(!fridaySub.textContent.includes('en Polea/Máquina'), 'El subtítulo no debe incluir "en Polea/Máquina"');

app.selectDay('domingo');
const sundayDurationPill = doc.getElementById('day-duration-pill');
if (sundayDurationPill) {
  assert.ok(!sundayDurationPill.textContent.includes('Descanso'), 'La píldora de duración no debe mostrar el texto "Descanso"');
}

// 46.3 Calentamiento descriptivo y responsive
app.selectDay('lunes');
const warmupSteps = doc.querySelectorAll('#warmup-steps-list .warmup-step-item');
assert.ok(warmupSteps.length > 0, 'Deben renderizarse los pasos de calentamiento');

warmupSteps.forEach((item, idx) => {
  const descTitle = item.querySelector('.warmup-desc-title');
  assert.ok(descTitle, `Paso ${idx + 1} de calentamiento debe tener título descriptivo`);
  const descText = item.querySelector('.warmup-desc-text');
  assert.ok(descText, `Paso ${idx + 1} de calentamiento debe tener instrucción técnica`);
});

const warmupPill = doc.getElementById('warmup-progress-pill');
assert.ok(warmupPill, 'Debe existir #warmup-progress-pill');
assert.ok(warmupPill.textContent.includes('pasos de activación'), 'El pill debe contener el contador de pasos de activación');

// 46.4 Modal de Demostración de Calentamiento Previo
assert.equal(typeof app.openWarmupPreviewDialog, 'function', 'GymApp debe exportar openWarmupPreviewDialog');
const testStep = { id: 'w1', label: 'Rotaciones escapulares', duration: '60s' };
const testVisual = app.getWarmupStepVisual(testStep, app.getState().schedule.lunes);
app.openWarmupPreviewDialog(testStep, testVisual, 'lunes');

const warmupModal = doc.getElementById('warmup-preview-dialog');
assert.ok(warmupModal.hasAttribute('open') || !warmupModal.hidden, 'El modal de demostración de calentamiento debe abrirse');
const previewImg = doc.getElementById('warmup-preview-img');
assert.ok(previewImg && previewImg.getAttribute('src').includes('warmup-'), 'El modal debe mostrar la imagen grande de calentamiento');

app.closeWarmupPreviewDialog();
assert.ok(!warmupModal.hasAttribute('open') || warmupModal.hidden, 'El modal de calentamiento debe cerrarse');

// 46.5 Reemplazo de día en Domingo: Actualización de los demás días y donor NO seleccionado
app.restoreOriginalSchedule();
app.selectDay('domingo');
const beforeSchedule = JSON.parse(JSON.stringify(app.getState().schedule));

app.applySundayRoutine('lunes');

// Domingo debe tener la rutina y quedar seleccionado
assert.equal(app.getState().selectedDay, 'domingo', 'Domingo debe quedar seleccionado tras el reemplazo');

// El día donor (lunes) NO debe estar seleccionado
const dayTabs = doc.querySelectorAll('#day-tabs-list .day-tab-btn');
dayTabs.forEach(btn => {
  if (btn.dataset.day === 'lunes') {
    assert.notEqual(btn.getAttribute('aria-current'), 'page', 'Lunes NO debe quedar seleccionado');
  }
  if (btn.dataset.day === 'domingo') {
    assert.equal(btn.getAttribute('aria-current'), 'page', 'Domingo debe estar activo y seleccionado');
  }
});

// Los demás días deben haberse actualizado (secuencia rotada/desplazada)
const afterSchedule = app.getState().schedule;
assert.notEqual(afterSchedule.lunes.title, beforeSchedule.lunes.title, 'Lunes debe haberse actualizado con la siguiente rutina');
assert.equal(afterSchedule.lunes.title, beforeSchedule.martes.title, 'Lunes debe haber recibido la rutina de Martes para continuar la semana');

// Re-verificación final absoluta: 0 etiquetas <svg>
assert.equal(doc.querySelectorAll('svg').length, 0, 'El DOM debe seguir teniendo CERO etiquetas <svg>');

app.restoreOriginalSchedule();

// =========================================================================
// SUITE 47: AUDITORÍA DE ÍCONOS COLORIDOS, TARJETAS LIMPIAS, DÍA DE DESCANSO Y DIBUJOS
// =========================================================================
console.log('Ejecutando Suite 47: Íconos Coloridos, Tarjetas Limpias, Subtítulo Muscular y Día de Descanso...');

// 47.1 Versión anterior y colorida de los íconos
const navPlanIco = doc.querySelector('.bottom-nav-btn[data-nav-screen="plan"] .bottom-nav-icon');
const navStatsIco = doc.querySelector('.bottom-nav-btn[data-nav-screen="stats"] .bottom-nav-icon');
const navHubIco = doc.querySelector('.bottom-nav-btn[data-nav-screen="hub"] .bottom-nav-icon');
assert.ok(navPlanIco && navPlanIco.textContent.includes('🏋️'), 'Bottom nav Rutina debe tener emoji colorido 🏋️');
assert.ok(navStatsIco && navStatsIco.textContent.includes('📈'), 'Bottom nav Progreso debe tener emoji colorido 📈');
assert.ok(navHubIco && navHubIco.textContent.includes('⚙️'), 'Bottom nav Menú/Extras debe tener emoji colorido ⚙️');

const profileAvatar = doc.querySelector('.btn-header-profile .btn-profile-avatar');
assert.ok(profileAvatar && profileAvatar.textContent.includes('👤'), 'Header perfil debe tener emoji 👤');

const hubToolsSummary = doc.querySelector('#screen-hub #tools-settings-accordion summary');
assert.ok(hubToolsSummary && hubToolsSummary.textContent.includes('Herramientas'), 'Menú/Extras debe incluir el acordeón de Herramientas y Ajustes');

const warmupBadge = doc.querySelector('.warmup-badge');
assert.ok(warmupBadge && warmupBadge.textContent.includes('🔥 CALENTAMIENTO'), 'Badge de calentamiento debe mostrar 🔥 CALENTAMIENTO');

// 47.2 Eliminación de textos de carga y reps en tarjetas de la pantalla principal
app.selectDay('lunes');
const previewCards47 = doc.querySelectorAll('#exercises-list .exercise-card');
assert.ok(previewCards47.length > 0, 'Deben existir tarjetas de ejercicio en pantalla principal');
previewCards47.forEach((card, idx) => {
  assert.equal(card.querySelector('.pill-load'), null, `Tarjeta ${idx + 1} no debe mostrar Carga/Nivel`);
  assert.equal(card.querySelector('.pill-reps'), null, `Tarjeta ${idx + 1} no debe mostrar Series y Reps`);
  assert.ok(!card.textContent.includes('Peso total seleccionado'), `Tarjeta ${idx + 1} no debe tener texto "Peso total seleccionado"`);
  assert.ok(!card.textContent.includes('Series y Reps'), `Tarjeta ${idx + 1} no debe tener texto "Series y Reps"`);
});

// 47.3 Paneles superiores visibles hasta los días de entrenamiento
const appHeaderEl = doc.querySelector('.app-header');
const weeklySummaryEl = doc.querySelector('.weekly-summary-bar');
const dayTabsNavEl = doc.getElementById('day-tabs-nav');
assert.ok(appHeaderEl && !appHeaderEl.hidden, 'El panel superior .app-header debe mantenerse mostrado');
assert.ok(weeklySummaryEl, 'El panel .weekly-summary-bar debe mantenerse presente y visible');
assert.ok(dayTabsNavEl && !dayTabsNavEl.hidden, 'La barra de días #day-tabs-nav debe mantenerse mostrada');

// 47.4 En días de entrenamiento, se retira el texto debajo del título (Día: músculos)
app.selectDay('lunes');
const subLunes = doc.getElementById('day-subtitle');
assert.ok(!subLunes || subLunes.style.display === 'none' || subLunes.textContent.trim() === '', 'El texto debajo del título debe retirarse en días de entrenamiento');

app.selectDay('martes');
const subMartes = doc.getElementById('day-subtitle');
assert.ok(!subMartes || subMartes.style.display === 'none' || subMartes.textContent.trim() === '', 'El texto debajo del título de Martes debe retirarse');

// 47.5 Botón de iniciar día de ejercicio solo dice "Iniciar día de ejercicio"
const defaultDayKey = app.detectDefaultDay();
app.selectDay(defaultDayKey);
const startBtn47 = doc.getElementById('btn-start-day-workout');
assert.ok(startBtn47, 'Debe existir el botón #btn-start-day-workout');
if (!app.isDayCompleted(defaultDayKey)) {
  assert.equal(startBtn47.textContent.trim(), 'Iniciar día de ejercicio', 'El botón principal debe decir estrictamente "Iniciar día de ejercicio"');
}

// 47.6 Dibujos de calentamiento generados a detalle
const warmupFiles = [
  'warmup-scapular.png',
  'warmup-dislocate.png',
  'warmup-rotator.png',
  'warmup-chest-open.png',
  'warmup-hip-mobility.png',
  'warmup-glute-bridge.png',
  'warmup-cable-warmup.png',
  'warmup-core-plank.png'
];
warmupFiles.forEach(file => {
  const filePath = pathMod.join(iconDir, file);
  assert.ok(fsMod.existsSync(filePath), `Debe existir el archivo ${file}`);
  const stat = fsMod.statSync(filePath);
  assert.ok(stat.size > 1500, `El archivo ${file} debe ser una ilustración detallada (>1.5KB)`);
});

// 47.7 Día de descanso: domingo u otro recalculado
app.selectDay('domingo');
const domTitle = doc.getElementById('day-title');
const domSub = doc.getElementById('day-subtitle');
const domBadges = doc.getElementById('day-badges');
const domSets = doc.getElementById('day-sets-counter');
const domDur = doc.getElementById('day-duration-pill');
const domVol = doc.getElementById('day-volume-pill');

assert.ok(domTitle.textContent.includes('🌿 Día de descanso'), 'El título de domingo debe indicar Día de descanso con ícono');
assert.ok(domSub.textContent.includes('🌿 Día de descanso'), 'El subtítulo debe ser "🌿 Día de descanso" con ícono');
assert.equal(domBadges.children.length, 0, 'No debe mostrar insignias de grupo muscular en día de descanso');
assert.equal(domSets.style.display, 'none', 'El contador de series debe estar oculto en día de descanso');
assert.equal(domDur.style.display, 'none', 'La duración debe estar oculta en día de descanso');
assert.equal(domVol.style.display, 'none', 'El tonelaje debe estar oculto en día de descanso');

// Tarjeta de día de descanso en exercises-list
const emptyDayBox = doc.querySelector('#exercises-list .empty-day-box');
assert.ok(emptyDayBox, 'Debe renderizarse el panel de día de descanso');
assert.ok(emptyDayBox.querySelector('h3').textContent.includes('Día de descanso'), 'El encabezado debe decir "Día de descanso"');
assert.ok(!emptyDayBox.textContent.includes('Domingo Libre / Día Comodín'), 'NO debe contener "Domingo Libre / Día Comodín"');

// Botón de mover a Hoy especifica el día cuando se ve otro día de entrenamiento
const targetOtherDay47 = defaultDayKey === 'martes' ? 'miercoles' : 'martes';
app.selectDay(targetOtherDay47);
const moveBtn = doc.getElementById('btn-start-day-workout');
const todayName = app.getState().schedule[defaultDayKey].dayName;
assert.ok(moveBtn.textContent.includes(`Mover entrenamiento a Hoy (${todayName})`), 'El botón de mover debe especificar el día de Hoy');

// ==========================================
// SUITE 48: Fase Inicial de Calentamiento en Enfoque, Desbloqueo de Ejercicios, Ícono de Hoja y Botón de Descanso
// ==========================================
console.log('Ejecutando Suite 48: Fase Inicial de Calentamiento en Enfoque, Desbloqueo de Ejercicios, Ícono de Hoja y Botón de Descanso...');

app.restoreOriginalSchedule();

// 48.1 Calentamiento en pantalla principal solo descriptivo
app.selectDay('lunes');
const mainWarmupList = doc.getElementById('warmup-steps-list');
assert.ok(mainWarmupList, 'Debe existir la lista de calentamiento en la pantalla principal');
const warmupDescItems = mainWarmupList.querySelectorAll('.warmup-desc-only');
assert.equal(warmupDescItems.length, 4, 'Debe renderizar los 4 pasos descriptivos');
assert.equal(mainWarmupList.querySelectorAll('input[type="checkbox"]').length, 0, 'No debe haber checkboxes en el calentamiento de la pantalla principal');
assert.equal(mainWarmupList.querySelectorAll('.btn-check-warmup').length, 0, 'No debe haber botones de chequeo interactivo');
const firstDescCard = mainWarmupList.querySelector('.warmup-desc-card');
assert.ok(firstDescCard, 'Debe contener tarjetas con clase .warmup-desc-card');
assert.ok(firstDescCard.querySelector('.warmup-desc-title'), 'Debe contener título del ejercicio preparatorio');
assert.ok(firstDescCard.querySelector('.warmup-desc-text'), 'Debe contener descripción técnica del calentamiento');

// 48.2 Pantalla de entrenamiento completa con fase inicial (Solo ejercicios de calentamiento)
app.selectDay('martes');
// Iniciar sesión pasando null (flujo real del usuario al presionar Iniciar día de ejercicio)
const launchMartes = app.startDayWorkoutSession('martes', null);
assert.equal(launchMartes.activeScreen, 'workout', 'Debe cambiar a la pantalla de entrenamiento');
assert.equal(launchMartes.activeExerciseIndex, -1, 'El índice activo debe ser -1 (fase inicial de calentamiento)');

const focusWarmupViewEl = doc.getElementById('focus-warmup-view');
const focusExCardEl = doc.getElementById('focus-exercise-card');
assert.equal(focusWarmupViewEl.hidden, false, 'La vista de calentamiento inicial debe estar visible');
assert.equal(focusExCardEl.hidden, true, 'La tarjeta de ejercicio debe estar oculta durante el calentamiento');

const focusCounter = doc.getElementById('focus-ex-counter-label');
assert.ok(focusCounter.textContent.includes('Calentamiento'), 'El contador debe indicar Calentamiento');

const btnPrevEx = doc.getElementById('btn-focus-prev-ex');
const btnNextEx = doc.getElementById('btn-focus-next-ex');
assert.ok(btnPrevEx.disabled || btnPrevEx.hidden, 'El botón anterior debe estar deshabilitado u oculto en calentamiento');
assert.ok(btnNextEx.disabled || btnNextEx.hidden, 'El botón siguiente debe estar deshabilitado u oculto en calentamiento');

// 48.3 Durante el calentamiento SOLO se muestran los ejercicios de calentamiento (sin pills de ejercicios 1..N)
const pillsDuringWarmup = doc.querySelectorAll('#focus-stepper-pills .focus-step-pill');
assert.equal(pillsDuringWarmup.length, 0, 'Durante el calentamiento NO deben mostrarse los botones de los ejercicios 1..N');
const warmupBadgeEl = doc.querySelector('#focus-stepper-pills .focus-warmup-stepper-badge');
assert.ok(warmupBadgeEl, 'Debe mostrar el indicador de Fase de Calentamiento');

// 48.4 Intentar saltar a otro ejercicio mientras esté en calentamiento debe ser bloqueado
const tryJump = app.selectFocusExercise(1);
assert.equal(tryJump, null, 'No se debe poder saltar a otro ejercicio mientras esté en calentamiento');
assert.equal(app.getState().activeExerciseIndex, -1, 'El índice activo debe seguir siendo -1');

// 48.5 Animaciones en 3 fases biomecánicas de los ejercicios de calentamiento a partir de imágenes generadas
const warmupCardsInFocus = doc.querySelectorAll('#focus-warmup-exercises-list .warmup-exercise-card');
assert.equal(warmupCardsInFocus.length, 4, 'Deben renderizarse las 4 tarjetas de calentamiento en modo enfoque');
warmupCardsInFocus.forEach((card, idx) => {
  const animFrame = card.querySelector('.warmup-animated-frame');
  assert.ok(animFrame, `La tarjeta ${idx + 1} debe tener marco animado (.warmup-animated-frame)`);
  const spriteFrame = animFrame.querySelector('.warmup-sprite-frame');
  assert.ok(spriteFrame, `La tarjeta ${idx + 1} debe tener el contenedor .warmup-sprite-frame`);
  assert.ok(spriteFrame.style.backgroundImage.includes('-anim.png') || spriteFrame.style.backgroundImage.includes('warmup-'), `Debe cargar la animación generada en 3 fases`);
  const phasesStrip = card.querySelector('.warmup-phases-strip');
  assert.ok(phasesStrip, `La tarjeta ${idx + 1} debe tener la guía de 3 fases biomecánicas (Inicio → Recorrido → Activación)`);
  const nameEl = card.querySelector('.warmup-exercise-name');
  assert.ok(nameEl && nameEl.textContent.length > 5, `La tarjeta ${idx + 1} debe mostrar el nombre del ejercicio`);
  const descEl = card.querySelector('.warmup-exercise-desc');
  assert.ok(descEl && descEl.textContent.length > 15, `La tarjeta ${idx + 1} debe mostrar la explicación técnica detallada`);
});

// 48.6 Botón único: Calentamiento Terminado culmina y RECIÉN muestra el primer ejercicio para el músculo
const finishWarmupBtn = doc.getElementById('btn-finish-focus-warmup');
assert.ok(finishWarmupBtn, 'Debe existir el botón único #btn-finish-focus-warmup');
assert.ok(finishWarmupBtn.textContent.includes('Calentamiento Terminado'), 'El botón debe decir Calentamiento Terminado');

finishWarmupBtn.click();

assert.equal(app.getState().workoutWarmupCompletedByDay.martes, true, 'El estado debe registrar el calentamiento como completado para Martes');
assert.equal(app.getState().activeExerciseIndex, 0, 'Debe cambiar automáticamente a la pestaña del primer ejercicio (Ejercicio 1)');
assert.equal(focusWarmupViewEl.hidden, true, 'La vista de calentamiento debe ocultarse tras culminar');
assert.equal(focusExCardEl.hidden, false, 'RECIÉN se debe mostrar el primer ejercicio para el músculo desbloqueado');

const updatedPills = doc.querySelectorAll('#focus-stepper-pills .focus-step-pill');
assert.ok(updatedPills.length >= 6, 'Tras culminar deben mostrarse las píldoras de los ejercicios del día');
const ex1Pill = updatedPills[1];
assert.ok(!ex1Pill.classList.contains('is-locked'), 'El ejercicio 1 no debe estar bloqueado');
assert.equal(ex1Pill.disabled, false, 'El ejercicio 1 debe estar habilitado para interactuar');
assert.ok(ex1Pill.classList.contains('is-active'), 'El ejercicio 1 debe estar activo');

// Ahora navegar al ejercicio 2 sí debe permitirse
const jumpToEx2 = app.selectFocusExercise(1);
assert.ok(jumpToEx2, 'Ahora que el calentamiento está culminado, debe permitir seleccionar el Ejercicio 2');
assert.equal(app.getState().activeExerciseIndex, 1, 'El índice activo debe ser 1 (Ejercicio 2)');

// 48.7 Botón para descansar solo debe decir "Serie X Completada - Descansar"
const actionTextEl = doc.getElementById('focus-btn-action-text');
assert.ok(actionTextEl, 'Debe existir #focus-btn-action-text');
assert.equal(actionTextEl.textContent.trim(), 'Serie 1 Completada - Descansar', 'El botón para descansar debe decir estrictamente "Serie 1 Completada - Descansar"');
assert.ok(!actionTextEl.textContent.includes('reps'), 'No debe incluir repeticiones en el texto del botón');

// 48.8 Se quitó el Modo Descarga de las opciones de la pantalla principal
const deloadOptionBtn = doc.getElementById('btn-toggle-deload-mode');
assert.equal(deloadOptionBtn, null, 'El botón de Modo Descarga no debe existir en las opciones de la pantalla principal');

app.exitWorkoutScreen();

// 48.9 Ícono de hoja en día de descanso en la pantalla principal
app.selectDay('domingo');
const restTitle = doc.getElementById('day-title');
const restSub = doc.getElementById('day-subtitle');
const domTab = doc.querySelector('.day-tab-btn[data-day="domingo"] .tab-group');
const emptyRestBox = doc.querySelector('#exercises-list .empty-day-box');

assert.ok(restTitle.textContent.includes('🌿'), 'El título de domingo debe contener el ícono de hoja 🌿');
assert.ok(restTitle.textContent.includes('Día de descanso'), 'El título de domingo debe indicar Día de descanso');
assert.ok(restSub.textContent.includes('🌿 Día de descanso'), 'El subtítulo debe contener 🌿 Día de descanso');
assert.ok(domTab.textContent.includes('🌿 Descanso'), 'La pestaña de domingo debe incluir 🌿 Descanso');
assert.ok(emptyRestBox.querySelector('h3').textContent.includes('🌿 Día de descanso'), 'El panel vacío de descanso debe contener 🌿 Día de descanso');

// 48.9 CERO etiquetas <svg>
assert.equal(doc.querySelectorAll('svg').length, 0, 'El DOM debe cumplir estrictamente con CERO etiquetas <svg>');

// ==========================================
// SUITE 49: Retiro de Modo Descarga, Subtítulo Limpio, Animaciones de Calentamiento y Visualización Secuencial
// ==========================================
console.log('Ejecutando Suite 49: Retiro de Modo Descarga, Subtítulo Limpio, Animaciones de Calentamiento y Visualización Secuencial...');

// 49.1 Quitar modo Descarga de las opciones de la pantalla principal
const deloadBtn49 = doc.getElementById('btn-toggle-deload-mode');
assert.equal(deloadBtn49, null, 'El botón Modo Descarga debe estar completamente retirado del menú de opciones');

// 49.2 Quitar el texto de los ejercicios que se entrenarán debajo del título (Día: músculos) en pantalla principal
app.selectDay('lunes');
const subtitleEl49 = doc.getElementById('day-subtitle');
assert.ok(!subtitleEl49 || subtitleEl49.style.display === 'none' || subtitleEl49.textContent.trim() === '', 'El texto debajo del título debe estar retirado en Lunes');

app.selectDay('miercoles');
const subtitleMie49 = doc.getElementById('day-subtitle');
assert.ok(!subtitleMie49 || subtitleMie49.style.display === 'none' || subtitleMie49.textContent.trim() === '', 'El texto debajo del título debe estar retirado en Miércoles');

// 49.3 Animaciones en 3 fases para ejercicios de calentamiento en la pantalla de entrenamiento
const warmupAnimFiles = [
  'warmup-scapular-anim.png',
  'warmup-dislocate-anim.png',
  'warmup-rotator-anim.png',
  'warmup-chest-open-anim.png',
  'warmup-hip-mobility-anim.png',
  'warmup-glute-bridge-anim.png',
  'warmup-cable-warmup-anim.png',
  'warmup-core-plank-anim.png'
];
warmupAnimFiles.forEach(file => {
  const filePath = pathMod.join(iconDir, file);
  assert.ok(fsMod.existsSync(filePath), `Debe existir la animación generada en 3 fases ${file}`);
  const stat = fsMod.statSync(filePath);
  assert.ok(stat.size > 2000, `El archivo ${file} debe tener tamaño suficiente (>2KB)`);
});

// 49.4 Solo debe mostrarse los ejercicios de calentamiento inicialmente
app.selectDay('lunes');
app.startDayWorkoutSession('lunes', null);

const warmupView49 = doc.getElementById('focus-warmup-view');
const exCard49 = doc.getElementById('focus-exercise-card');
assert.equal(warmupView49.hidden, false, 'Solo deben mostrarse los ejercicios de calentamiento');
assert.equal(exCard49.hidden, true, 'El primer ejercicio para el músculo NO debe mostrarse todavía');

const pillsContainer49 = doc.getElementById('focus-stepper-pills');
assert.equal(pillsContainer49.querySelectorAll('.focus-step-pill').length, 0, 'No deben mostrarse píldoras de ejercicios mientras se calienta');
assert.ok(pillsContainer49.querySelector('.focus-warmup-stepper-badge'), 'Debe mostrar el badge de fase de calentamiento');

// 49.5 Una vez culminados, recién se debe mostrar el primer ejercicio para el músculo
const btnFinish49 = doc.getElementById('btn-finish-focus-warmup');
btnFinish49.click();

assert.equal(warmupView49.hidden, true, 'La vista de calentamiento debe ocultarse al culminar');
assert.equal(exCard49.hidden, false, 'RECIÉN debe mostrarse la tarjeta del primer ejercicio para el músculo');
assert.equal(app.getState().activeExerciseIndex, 0, 'Debe posicionarse en el Ejercicio 1');

const exerciseTitle49 = doc.getElementById('focus-ex-title');
assert.ok(exerciseTitle49 && exerciseTitle49.textContent.length > 3, 'El primer ejercicio debe tener su nombre cargado');

const pillsAfterFinish49 = doc.querySelectorAll('#focus-stepper-pills .focus-step-pill');
assert.ok(pillsAfterFinish49.length >= 6, 'RECIÉN deben mostrarse las pestañas de navegación de ejercicios');
assert.equal(pillsAfterFinish49[1].classList.contains('is-active'), true, 'La píldora del primer ejercicio debe estar activa');

app.exitWorkoutScreen();

// ==========================================
// SUITE 50: Reubicación de Subopciones a Menú/Extras, Responsive de Perfil, Pestaña de Días Exclusiva en Rutina, Día de Descanso y Textos Limpios
// ==========================================
console.log('Ejecutando Suite 50: Reubicación de Subopciones a Menú/Extras, Responsive de Perfil, Pestaña de Días Exclusiva en Rutina, Día de Descanso y Textos Limpios...');

// 50.1 Subopciones en Menú/Extras y sin botón de opciones en cabecera
assert.equal(doc.getElementById('header-tools-menu'), null, 'No debe existir el botón/menú de opciones en la cabecera');
const calcBtn50 = doc.querySelector('#screen-hub #btn-open-calc-dialog');
const restoreBtn50 = doc.querySelector('#screen-hub #btn-restore-schedule');
assert.ok(calcBtn50, 'El botón de Calc. Discos / 1RM debe estar dentro de #screen-hub');
assert.ok(restoreBtn50, 'El botón de Restaura Días debe estar dentro de #screen-hub');

// 50.2 Menú y Perfil de Usuario responsive
const profileBtn50 = doc.getElementById('btn-header-profile');
assert.ok(profileBtn50, 'Debe existir el botón de perfil de usuario en la cabecera');
const profileTag50 = doc.getElementById('header-profile-tag');
assert.ok(profileTag50 && profileTag50.textContent.length > 0, 'El botón de perfil debe mostrar el tag del usuario');
const profileDialog50 = doc.getElementById('profile-onboarding-dialog');
assert.ok(profileDialog50, 'Debe existir el diálogo de perfil de usuario');
const closeProfileBtn50 = doc.getElementById('btn-close-profile-dialog');
assert.ok(closeProfileBtn50 && closeProfileBtn50.classList.contains('btn-close-danger'), 'El botón de cerrar perfil debe tener estilo rojo peligro');

// 50.3 Barra de días (#day-tabs-nav) visible SOLO en la pestaña Rutina (plan)
app.switchAppScreen('plan');
const dayTabsNav50 = doc.getElementById('day-tabs-nav');
assert.equal(dayTabsNav50.hidden, false, 'La lista superior de días debe estar visible en la pestaña Rutina');

app.switchAppScreen('stats');
assert.equal(dayTabsNav50.hidden, true, 'La lista superior de días debe estar oculta en la pestaña Progreso');

app.switchAppScreen('hub');
assert.equal(dayTabsNav50.hidden, true, 'La lista superior de días debe estar oculta en la pestaña Menú/Extras');

app.switchAppScreen('plan');
assert.equal(dayTabsNav50.hidden, false, 'La lista superior de días debe volver a mostrarse al regresar a Rutina');

// 50.4 Día de descanso en pantalla principal: botón de mover entrenamiento solo si el día actual es de descanso
// Cuando el día actual es un día normal (por ejemplo, Lunes) y el usuario visualiza Domingo (descanso):
app.selectDay('domingo');
const startBtnRestDay = doc.getElementById('btn-start-day-workout');
assert.equal(startBtnRestDay.style.display, 'none', 'En el día de descanso NO debe mostrarse el botón de mover entrenamiento si el día actual no es de descanso');

// 50.5 Mapa Anatómico de Músculos sin "Trabajados Hoy"
const anatomySummary = doc.querySelector('.anatomy-collapsible-summary span');
assert.ok(anatomySummary && anatomySummary.textContent.includes('Mapa Anatómico de Músculos'), 'Debe decir Mapa Anatómico de Músculos');
assert.ok(!anatomySummary.textContent.includes('Trabajados Hoy'), 'No debe incluir el texto Trabajados Hoy');

// 50.6 Título de Calentamiento con formato: Calentamiento (Músculo X) - X min.
app.selectDay('lunes');
const warmupTitle50 = doc.getElementById('warmup-title-text');
assert.ok(warmupTitle50.textContent.startsWith('Calentamiento (Espalda)'), 'El título de calentamiento de Lunes debe iniciar con Calentamiento (Espalda)');
assert.ok(warmupTitle50.textContent.includes('5 min'), 'El título de calentamiento debe indicar los minutos (- 5 min)');
assert.ok(!warmupTitle50.textContent.includes('Protocolo Articular y Activación'), 'No debe incluir textos largos como Protocolo Articular y Activación');

// Verificación absoluta de CERO etiquetas SVG
assert.equal(doc.querySelectorAll('svg').length, 0, 'El DOM debe cumplir con 0% <svg>');

// ==========================================
// SUITE 51: Visualización Exclusiva de Calentamiento, Cards Animadas del Recorrido y Desbloqueo de Rutina
// ==========================================
console.log('Ejecutando Suite 51: Visualización Exclusiva de Calentamiento, Cards Animadas del Recorrido y Desbloqueo de Rutina...');

// 51.1 Validar existencia de los 15 spritesheets animados de calentamiento
const all15WarmupSprites = [
  'warmup-scapular-anim.png',
  'warmup-dislocate-anim.png',
  'warmup-rotator-anim.png',
  'warmup-chest-open-anim.png',
  'warmup-hip-mobility-anim.png',
  'warmup-glute-bridge-anim.png',
  'warmup-cable-warmup-anim.png',
  'warmup-core-plank-anim.png',
  'warmup-arm-elbow-curl-anim.png',
  'warmup-triceps-rope-warmup-anim.png',
  'warmup-chest-press-warmup-anim.png',
  'warmup-ankle-dorsi-anim.png',
  'warmup-leg-press-warmup-anim.png',
  'warmup-joint-circles-anim.png',
  'warmup-ytw-scapular-anim.png'
];

all15WarmupSprites.forEach(file => {
  const p = pathMod.join(iconDir, file);
  assert.ok(fsMod.existsSync(p), `Debe existir el spritesheet animado del recorrido: ${file}`);
  assert.ok(fsMod.statSync(p).size > 2000, `El archivo ${file} debe tener tamaño suficiente`);
});

// 51.2 Al iniciar el día de ejercicio, SOLO se debe mostrar los ejercicios de calentamiento
app.selectDay('lunes');
app.getState().workoutWarmupCompletedByDay = {}; // Resetear estado para probar inicio limpio
app.startDayWorkoutSession('lunes');

const stepperCard51 = doc.querySelector('.focus-stepper-card');
const warmupView51 = doc.getElementById('focus-warmup-view');
const exerciseCard51 = doc.getElementById('focus-exercise-card');
const finishWarmupBtn51 = doc.getElementById('btn-finish-focus-warmup');

assert.equal(stepperCard51.hidden, true, 'El stepper de ejercicios debe estar oculto durante el calentamiento');
assert.equal(warmupView51.hidden, false, 'Solo debe mostrarse la vista de ejercicios de calentamiento');
assert.equal(exerciseCard51.hidden, true, 'El ejercicio de la rutina NO debe mostrarse todavía');
assert.ok(finishWarmupBtn51, 'Debe existir el botón para culminar el calentamiento');

// 51.3 Cards de calentamiento estructuradas con animación del recorrido al igual que los demás ejercicios
const warmupCards51 = warmupView51.querySelectorAll('.warmup-exercise-card');
assert.ok(warmupCards51.length >= 3, 'Deben renderizarse las cards de calentamiento');

warmupCards51.forEach((card, idx) => {
  const spriteBox = card.querySelector('.warmup-sprite-box');
  const spriteFrame = card.querySelector('.warmup-sprite-frame');
  const phasePills = card.querySelector('.sprite-phase-pills');
  const instructionDesc = card.querySelector('.warmup-exercise-desc');
  
  assert.ok(spriteBox, `Card ${idx + 1} debe contener el contenedor de imagen/animación .warmup-sprite-box`);
  assert.ok(spriteFrame, `Card ${idx + 1} debe contener el frame de spritesheet .warmup-sprite-frame`);
  assert.ok(phasePills, `Card ${idx + 1} debe contener el indicador de 3 fases del recorrido`);
  assert.ok(instructionDesc && instructionDesc.textContent.length > 20, `Card ${idx + 1} debe explicar el recorrido biomecánico`);
});

// 51.4 Al pulsar el botón de completado, RECIÉN se muestra el primer ejercicio de la rutina
finishWarmupBtn51.click();

assert.equal(warmupView51.hidden, true, 'Al completar el calentamiento, la vista de calentamiento debe ocultarse');
assert.equal(exerciseCard51.hidden, false, 'RECIÉN debe mostrarse la tarjeta del primer ejercicio');
assert.equal(stepperCard51.hidden, false, 'El navegador de ejercicios debe mostrarse');
assert.equal(app.getState().activeExerciseIndex, 0, 'Debe mostrar el ejercicio 1 de la rutina');

const focusExTitle51 = doc.getElementById('focus-ex-title');
assert.ok(focusExTitle51 && focusExTitle51.textContent.length > 0, 'El primer ejercicio debe tener su título visible');

app.exitWorkoutScreen();

// Verificación absoluta de CERO etiquetas SVG
assert.equal(doc.querySelectorAll('svg').length, 0, 'El DOM debe cumplir con 0% <svg>');

// ==========================================
// SUITE 52: Días de Descanso Estrictos, Botón en Día Actual de Entrenamiento y Animación Fluida de Horarios
// ==========================================
console.log('Ejecutando Suite 52: Días de Descanso Estrictos, Botón en Día Actual de Entrenamiento y Animación Fluida de Horarios...');

app.restoreOriginalSchedule();

// 52.1 Botón #btn-switch-rest-today presente en el DOM y visible en día actual de entrenamiento
const switchRestBtn = doc.getElementById('btn-switch-rest-today');
assert.ok(switchRestBtn, 'Debe existir el botón #btn-switch-rest-today en el DOM');
assert.ok(switchRestBtn.textContent.includes('Cambiar día de descanso a hoy'), 'El botón debe indicar "Cambiar día de descanso a hoy"');

// Simular un día normal de entrenamiento (por ejemplo Lunes)
app.setSimulatedDay('lunes');
app.selectDay('lunes');
assert.equal(switchRestBtn.hidden, false, 'El botón debe estar visible cuando se visualiza el día actual de entrenamiento');
assert.equal(switchRestBtn.style.display, '', 'El botón debe tener display normal cuando se visualiza el día actual de entrenamiento');

// 52.2 Botón oculto cuando se visualiza otro día (no es hoy)
app.selectDay('martes');
assert.equal(switchRestBtn.hidden, true, 'El botón debe estar oculto cuando se visualiza otro día que no es hoy');
assert.equal(switchRestBtn.style.display, 'none', 'El botón debe tener display:none al ver otro día');

// 52.3 Botón oculto cuando el día es de descanso
app.selectDay('domingo');
assert.equal(switchRestBtn.hidden, true, 'El botón debe estar oculto en un día de descanso');
assert.equal(switchRestBtn.style.display, 'none', 'El botón debe tener display:none en un día de descanso');

// 52.4 Cambiar día de descanso a hoy (simulando Martes como día actual)
app.setSimulatedDay('martes');
app.selectDay('martes');

const scheduleBeforeSwitch = app.getState().schedule;
const routinesCountBefore = Object.values(scheduleBeforeSwitch).filter(d => d.exercises && d.exercises.length > 0).length;
assert.equal(routinesCountBefore, 6, 'Inicialmente deben haber 6 días de entrenamiento');

const targetRestDaysLimit = 7 - (Number(app.getState().userProfile?.daysPerWeek) || 6); // 1 día de descanso para 6 días/semana
const restDaysBefore = Object.keys(scheduleBeforeSwitch).filter(k => (!scheduleBeforeSwitch[k].exercises || scheduleBeforeSwitch[k].exercises.length === 0));
assert.equal(restDaysBefore.length, targetRestDaysLimit, 'Inicialmente debe haber exactamente el número de días de descanso establecido');

// Ejecutar el cambio
const switchResult = app.switchRestDayToToday();
assert.equal(switchResult, true, 'switchRestDayToToday debe retornar true al aplicarse');

// 52.5 Verificar que hoy (Martes) ahora es día de descanso
const scheduleAfterSwitch = app.getState().schedule;
assert.equal(scheduleAfterSwitch.martes.exercises.length, 0, 'Martes debe quedar sin ejercicios (día de descanso)');
assert.ok(scheduleAfterSwitch.martes.title.includes('Día de descanso'), 'El título de Martes debe decir Día de descanso');
assert.ok(scheduleAfterSwitch.martes.muscleGroup.includes('Día de descanso'), 'El grupo muscular de Martes debe ser Día de descanso');

// 52.6 Verificar que Domingo ahora es día de entrenamiento (no queda como descanso extra)
assert.ok(scheduleAfterSwitch.domingo.exercises.length > 0, 'Domingo debe convertirse en día de entrenamiento');
assert.ok(!scheduleAfterSwitch.domingo.title.includes('Día de descanso'), 'Domingo ya NO debe tener título de día de descanso');

// 52.7 Verificar regla crítica: NUNCA más días de descanso que lo establecido
const restDaysAfter = Object.keys(scheduleAfterSwitch).filter(k => (!scheduleAfterSwitch[k].exercises || scheduleAfterSwitch[k].exercises.length === 0));
assert.equal(restDaysAfter.length, targetRestDaysLimit, 'NUNCA debe haber más días de descanso que lo establecido por el cálculo del entrenamiento');
assert.deepEqual(restDaysAfter, ['martes'], 'El único día de descanso de la semana debe ser estrictamente Martes');

// 52.8 Verificar conservación del 100% de rutinas y ejercicios (desplazamiento continuo)
const routinesCountAfter = Object.values(scheduleAfterSwitch).filter(d => d.exercises && d.exercises.length > 0).length;
assert.equal(routinesCountAfter, 6, 'Se debe mantener el 100% de los 6 entrenamientos semanales');

// Miércoles debe haber tomado la rutina que tocaba el Martes (Pecho y Tríceps)
assert.ok(scheduleAfterSwitch.miercoles.muscleGroup.includes('Pecho') || scheduleAfterSwitch.miercoles.title.includes('Pecho'), 'Miércoles debe recibir la rutina de Pecho desplazada de Martes');
// Domingo debe haber tomado la última rutina para completar el 100% del volumen
assert.ok(scheduleAfterSwitch.domingo.muscleGroup.includes('Piernas') || scheduleAfterSwitch.domingo.muscleGroup.includes('Espalda') || scheduleAfterSwitch.domingo.exercises.length >= 6, 'Domingo debe recibir la rutina para completar el 100% del volumen');

// 52.9 Contenedor de animación fluida de horarios (#schedule-fx-container)
const fxContainer = doc.getElementById('schedule-fx-container');
assert.ok(fxContainer, 'Debe existir el contenedor #schedule-fx-container para los efectos');

// Disparar la animación de fuegos artificiales y burbujas
app.playScheduleRecalcAnimation();
const fxAnchor = fxContainer.querySelector('.fx-origin-anchor');
assert.ok(fxAnchor, 'La animación debe generar el ancla .fx-origin-anchor');
const sparks = fxAnchor.querySelectorAll('.fx-firework-spark');
assert.ok(sparks.length >= 12, 'Debe generar chispas de fuegos artificiales');
const bubbles = fxAnchor.querySelectorAll('.fx-bubble');
assert.ok(bubbles.length >= 8, 'Debe generar burbujas iridiscentes flotantes');
const rings = fxAnchor.querySelectorAll('.fx-energy-ring');
assert.ok(rings.length >= 1, 'Debe generar anillos de choque de energía');

// 52.10 Verificación absoluta de CERO etiquetas SVG
assert.equal(doc.querySelectorAll('svg').length, 0, 'El DOM debe cumplir estrictamente con 0% <svg>');

app.restoreOriginalSchedule();
console.log('PASS: Todas las 52 Suites de pruebas pasaron con éxito.');
process.exit(0);


