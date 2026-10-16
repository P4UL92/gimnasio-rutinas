const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const routinesCode = fs.readFileSync(path.join(root, 'routines-data.js'), 'utf8');
const appCode = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost:8080/',
  runScripts: 'outside-only'
});

const { window } = dom;
window.eval(routinesCode);
window.eval(appCode);

const app = window.GymApp;
assert.ok(app, 'GymApp debe inicializarse en window');

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

// 2. Verificar todos los días de Lunes a Sábado
const trainingDays = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
for (const d of trainingDays) {
  assert.ok(state.schedule[d].exercises.length >= 6, `${d} debe tener su rutina completa`);
  for (const ex of state.schedule[d].exercises) {
    assert.equal(ex.sets, 4, `${ex.name} en ${d} debe tener 4 series`);
    assert.equal(ex.reps, 12, `${ex.name} en ${d} debe tener 12 repeticiones`);
  }
}

// 3. Verificar cambio de unidad kg <-> Nivel y ajuste de peso
app.adjustExerciseLoad('lunes', 'lun-espalda-polea-estrecho', 1);
assert.equal(
  app.getState().schedule.lunes.exercises[0].loadValue,
  7,
  'Nivel debe subir de 6 a 7'
);
app.adjustExerciseLoad('lunes', 'lun-espalda-polea-estrecho', -1);
assert.equal(
  app.getState().schedule.lunes.exercises[0].loadValue,
  6,
  'Nivel debe regresar a 6'
);

// 4. Verificar marcado de series (4 series)
app.toggleSetCompletion('lunes', 'lun-espalda-maquina-amplio', 0);
assert.equal(
  app.getState().schedule.lunes.exercises[1].completedSets[0],
  true,
  'La serie 1 debe quedar marcada como completada'
);

// 5. Verificar excepción: Mover un día al Domingo
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

// 6. Verificar restaurar semana original y recorrer días al Domingo
app.restoreOriginalSchedule();
assert.equal(app.getState().schedule.domingo.exercises.length, 0);
app.shiftChainToSunday('jueves');
assert.equal(app.getState().schedule.jueves.status, 'skipped_to_sunday');
assert.equal(
  app.getState().schedule.domingo.exercises.length,
  6,
  'Al recorrer desde Jueves, Sábado pasa al Domingo'
);

app.restoreOriginalSchedule();
console.log('PASS: Todas las pruebas de rutinas, cargas (kg/Nivel), series 4x12 y excepciones al Domingo pasaron con éxito.');
