(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GYM_VISUALS = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Catálogo completo de 24 patrones biomecánicos en 14 hojas de sprites rasterizados (3 fases por ejercicio)
  const EXERCISE_SPRITE_CATALOG = {
    'pulley-narrow-back': {
      spriteUrl: 'assets/sprites/gym_exercise_sprite_sheet_closegrip.jpg',
      row: 'top',
      label: 'POLEA ESTRECHA',
      title: 'Jalón en Polea Agarre Estrecho',
      cssModifier: 'sprite-pulley-narrow sprite-row-top'
    },
    'machine-wide-back': {
      spriteUrl: 'assets/sprites/gym_exercise_sprite_sheet_fullbody.jpg',
      row: 'top',
      label: 'AGARRE AMPLIO',
      title: 'Espalda Agarre Amplio en Máquina / Polea',
      cssModifier: 'sprite-machine-wide sprite-row-top'
    },
    'seated-cable-row': {
      spriteUrl: 'assets/sprites/sprite_back_row_pullover.jpg',
      row: 'top',
      label: 'REMO SENTADO',
      title: 'Remo Horizontal Sentado en Polea Baja',
      cssModifier: 'sprite-seated-row sprite-row-top'
    },
    'cable-pullover': {
      spriteUrl: 'assets/sprites/sprite_back_row_pullover.jpg',
      row: 'bottom',
      label: 'PULL-OVER POLEA',
      title: 'Pull-Over en Polea Alta con Cuerda',
      cssModifier: 'sprite-cable-pullover sprite-row-bottom'
    },
    'cable-bicep-curl': {
      spriteUrl: 'assets/sprites/gym_exercise_sprite_sheet_closegrip.jpg',
      row: 'bottom',
      label: 'CURL BÍCEPS',
      title: 'Curl / Press de Bíceps en Polea Baja',
      cssModifier: 'sprite-cable-bicep sprite-row-bottom'
    },
    'hammer-curl': {
      spriteUrl: 'assets/sprites/sprite_bicep_hammer_incline_chest.jpg',
      row: 'top',
      label: 'CURL MARTILLO',
      title: 'Curl Martillo con Mancuernas o Cuerda',
      cssModifier: 'sprite-hammer-curl sprite-row-top'
    },
    'chest-press': {
      spriteUrl: 'assets/sprites/gym_exercise_sprite_sheet_chest_triceps.jpg',
      row: 'top',
      label: 'PRESS PECHO',
      title: 'Press de Pecho Sentado / Convergente',
      cssModifier: 'sprite-chest-press sprite-row-top'
    },
    'incline-chest-press': {
      spriteUrl: 'assets/sprites/sprite_bicep_hammer_incline_chest.jpg',
      row: 'bottom',
      label: 'PRESS INCLINADO',
      title: 'Press Inclinado de Pecho (Superior)',
      cssModifier: 'sprite-incline-chest sprite-row-bottom'
    },
    'pec-deck-fly': {
      spriteUrl: 'assets/sprites/sprite_chest_pecdeck_cable_crossover.jpg',
      row: 'top',
      label: 'PEC DECK',
      title: 'Aperturas en Contractora (Pec Deck)',
      cssModifier: 'sprite-pec-deck sprite-row-top'
    },
    'cable-crossover': {
      spriteUrl: 'assets/sprites/sprite_chest_pecdeck_cable_crossover.jpg',
      row: 'bottom',
      label: 'CRUCES POLEA',
      title: 'Cruces de Pecho en Polea Alta',
      cssModifier: 'sprite-cable-crossover sprite-row-bottom'
    },
    'tricep-pushdown': {
      spriteUrl: 'assets/sprites/gym_exercise_sprite_sheet_chest_triceps.jpg',
      row: 'bottom',
      label: 'TRÍCEPS POLEA',
      title: 'Extensión de Tríceps en Polea Alta (Pushdown)',
      cssModifier: 'sprite-tricep-pushdown sprite-row-bottom'
    },
    'tricep-overhead': {
      spriteUrl: 'assets/sprites/sprite_triceps_overhead_dips.jpg',
      row: 'top',
      label: 'TRÍCEPS TRAS NUCA',
      title: 'Extensión de Tríceps Sobre la Cabeza',
      cssModifier: 'sprite-tricep-overhead sprite-row-top'
    },
    'machine-dips': {
      spriteUrl: 'assets/sprites/sprite_triceps_overhead_dips.jpg',
      row: 'bottom',
      label: 'FONDOS MÁQUINA',
      title: 'Fondos de Tríceps en Máquina Sentada',
      cssModifier: 'sprite-machine-dips sprite-row-bottom'
    },
    'leg-press': {
      spriteUrl: 'assets/sprites/gym_exercise_sprite_sheet_legs_shoulders.jpg',
      row: 'top',
      label: 'PRENSA PIERNAS',
      title: 'Prensa de Piernas Inclinada 45°',
      cssModifier: 'sprite-leg-press sprite-row-top'
    },
    'quad-extension': {
      spriteUrl: 'assets/sprites/sprite_legs_quad_ext_hamstring_curl.jpg',
      row: 'top',
      label: 'EXT. CUÁDRICEPS',
      title: 'Extensión de Cuádriceps en Máquina',
      cssModifier: 'sprite-quad-ext sprite-row-top'
    },
    'hamstring-curl': {
      spriteUrl: 'assets/sprites/sprite_legs_quad_ext_hamstring_curl.jpg',
      row: 'bottom',
      label: 'CURL FEMORAL',
      title: 'Curl Femoral Tumbado o Sentado',
      cssModifier: 'sprite-hamstring-curl sprite-row-bottom'
    },
    'hack-squat': {
      spriteUrl: 'assets/sprites/sprite_legs_hack_squat_calves.jpg',
      row: 'top',
      label: 'SENTADILLA HACK',
      title: 'Sentadilla Hack / Goblet / Libre',
      cssModifier: 'sprite-hack-squat sprite-row-top'
    },
    'calf-raise': {
      spriteUrl: 'assets/sprites/sprite_legs_hack_squat_calves.jpg',
      row: 'bottom',
      label: 'GEMELOS / SÓLEO',
      title: 'Elevación de Talones (Gemelos y Sóleo)',
      cssModifier: 'sprite-calf-raise sprite-row-bottom'
    },
    'hip-thrust': {
      spriteUrl: 'assets/sprites/sprite_glutes_hipthrust_rdl.jpg',
      row: 'top',
      label: 'HIP THRUST',
      title: 'Hip Thrust (Empuje de Cadera Glúteo)',
      cssModifier: 'sprite-hip-thrust sprite-row-top'
    },
    'romanian-deadlift': {
      spriteUrl: 'assets/sprites/sprite_glutes_hipthrust_rdl.jpg',
      row: 'bottom',
      label: 'PESO MUERTO',
      title: 'Peso Muerto Rumano (Femoral y Glúteo)',
      cssModifier: 'sprite-rdl sprite-row-bottom'
    },
    'hip-adductor': {
      spriteUrl: 'assets/sprites/sprite_legs_adductor_abductor.jpg',
      row: 'top',
      label: 'ADUCTORES',
      title: 'Aductores en Máquina Sentada',
      cssModifier: 'sprite-hip-adductor sprite-row-top'
    },
    'hip-abductor': {
      spriteUrl: 'assets/sprites/sprite_legs_adductor_abductor.jpg',
      row: 'bottom',
      label: 'ABDUCCIÓN CADERA',
      title: 'Abducción de Cadera en Máquina (Glúteo Medio)',
      cssModifier: 'sprite-hip-abductor sprite-row-bottom'
    },
    'shoulder-press': {
      spriteUrl: 'assets/sprites/gym_exercise_sprite_sheet_legs_shoulders.jpg',
      row: 'bottom',
      label: 'PRESS HOMBRO',
      title: 'Press Militar de Hombros',
      cssModifier: 'sprite-shoulder-press sprite-row-bottom'
    },
    'lateral-raise': {
      spriteUrl: 'assets/sprites/sprite_shoulders_lateral_facepull.jpg',
      row: 'top',
      label: 'ELEV. LATERALES',
      title: 'Elevaciones Laterales de Hombro',
      cssModifier: 'sprite-lateral-raise sprite-row-top'
    },
    'face-pull': {
      spriteUrl: 'assets/sprites/sprite_shoulders_lateral_facepull.jpg',
      row: 'bottom',
      label: 'FACE PULL',
      title: 'Face Pull en Polea Alta con Cuerda',
      cssModifier: 'sprite-face-pull sprite-row-bottom'
    },
    'rear-delt-shrugs': {
      spriteUrl: 'assets/sprites/sprite_shoulders_reardelt_shrugs_abs.jpg',
      row: 'top',
      label: 'POSTERIOR / TRAP',
      title: 'Vuelos Posteriores y Encogimientos de Trapecio',
      cssModifier: 'sprite-rear-delt sprite-row-top'
    },
    'cable-crunch-abs': {
      spriteUrl: 'assets/sprites/sprite_shoulders_reardelt_shrugs_abs.jpg',
      row: 'bottom',
      label: 'CRUNCH CORE',
      title: 'Crunch Abdominal en Polea Alta / Core',
      cssModifier: 'sprite-cable-crunch sprite-row-bottom'
    }
  };

  // Clasifica cada ejercicio (preconfigurado o personalizado) en su patrón biomecánico exacto
  function detectExerciseAnimationType(exercise) {
    if (exercise && exercise.spriteType && exercise.spriteType !== 'auto' && EXERCISE_SPRITE_CATALOG[exercise.spriteType]) {
      return exercise.spriteType;
    }

    const id = ((exercise && exercise.id) || '').toLowerCase();
    const name = ((exercise && exercise.name) || '').toLowerCase();
    const muscle = ((exercise && exercise.muscle) || '').toLowerCase();
    const text = `${id} ${name} ${muscle}`;

    // 1. Espalda
    if (id.includes('remo') || name.includes('remo')) return 'seated-cable-row';
    if (id.includes('pullover') || id.includes('pull-over') || name.includes('pull-over') || name.includes('pullover')) return 'cable-pullover';
    if (id.includes('polea-estrecho') || name.includes('agarre estrecho') || name.includes('triángulo')) return 'pulley-narrow-back';
    if (id.includes('maquina-amplio') || name.includes('agarre amplio') || name.includes('dominada') || name.includes('jalón')) return 'machine-wide-back';

    // 2. Bíceps y Antebrazo
    if (id.includes('martillo') || name.includes('martillo') || name.includes('braquial') || name.includes('neutro')) return 'hammer-curl';
    if (id.includes('biceps') || name.includes('bíceps') || name.includes('biceps') || name.includes('curl de brazo') || name.includes('predicador')) return 'cable-bicep-curl';

    // 3. Pecho
    if (id.includes('inclinado') || name.includes('inclinado') || name.includes('clavicular')) return 'incline-chest-press';
    if (id.includes('pec-deck') || name.includes('pec deck') || name.includes('apertura') || name.includes('contractora') || name.includes('mariposa')) return 'pec-deck-fly';
    if (id.includes('cruces') || name.includes('cruces') || name.includes('crossover')) return 'cable-crossover';
    if (name.includes('pecho') || name.includes('banca') || muscle.includes('pectoral')) return 'chest-press';

    // 4. Tríceps
    if (id.includes('tras-nuca') || name.includes('sobre la cabeza') || name.includes('tras nuca') || name.includes('francés')) return 'tricep-overhead';
    if (id.includes('fondos') || name.includes('fondos') || name.includes('dip')) return 'machine-dips';
    if (name.includes('tríceps') || name.includes('triceps') || name.includes('pushdown')) return 'tricep-pushdown';

    // 5. Piernas y Glúteos
    if (id.includes('hip-thrust') || name.includes('hip thrust') || name.includes('puente de glúteo')) return 'hip-thrust';
    if (id.includes('peso-muerto') || name.includes('peso muerto') || name.includes('rumano') || name.includes('buenos días')) return 'romanian-deadlift';
    if (id.includes('extension-cuadriceps') || name.includes('extensión de cuádriceps') || name.includes('silla de cuádriceps')) return 'quad-extension';
    if (id.includes('curl-femoral') || name.includes('femoral') || name.includes('isquiotibial')) return 'hamstring-curl';
    if (id.includes('sentadilla') || name.includes('sentadilla') || name.includes('hack') || name.includes('goblet') || name.includes('zancada') || name.includes('búlgara')) return 'hack-squat';
    if (id.includes('aductores') || name.includes('aductores') || name.includes('aducción')) return 'hip-adductor';
    if (id.includes('abduccion') || name.includes('abducción') || name.includes('abductora')) return 'hip-abductor';
    if (id.includes('talones') || id.includes('gemelos') || name.includes('talones') || name.includes('gemelos') || name.includes('pantorrilla') || name.includes('sóleo')) return 'calf-raise';
    if (id.includes('prensa') || name.includes('prensa') || text.includes('cuádriceps') || text.includes('pierna')) return 'leg-press';

    // 6. Hombros, Trapecio y Core
    if (id.includes('laterales') || name.includes('laterales') || name.includes('elevación lateral')) return 'lateral-raise';
    if (id.includes('face-pull') || name.includes('face pull')) return 'face-pull';
    if (id.includes('pajaros') || id.includes('trapecio') || name.includes('posteriores') || name.includes('rear delt') || name.includes('encogimiento') || name.includes('trapecio')) return 'rear-delt-shrugs';
    if (id.includes('crunch') || name.includes('crunch') || name.includes('abdomen') || name.includes('abdominal') || name.includes('plancha') || text.includes('core')) return 'cable-crunch-abs';
    if (text.includes('espalda') || text.includes('dorsal')) return 'pulley-narrow-back';

    return 'shoulder-press';
  }

  // Mapeo de spritesheets rasterizados para cada ejercicio (Sin SVGs de animación)
  function getExerciseSpriteInfo(exercise) {
    const type = detectExerciseAnimationType(exercise);
    return EXERCISE_SPRITE_CATALOG[type] || EXERCISE_SPRITE_CATALOG['shoulder-press'];
  }

  // Genera el contenedor de imagen/sprite rasterizado del ejercicio (Cero SVGs para animaciones)
  function renderExerciseSprite(exercise) {
    const info = getExerciseSpriteInfo(exercise);
    const loadLabel =
      exercise.loadType === 'nivel'
        ? `NIVEL ${exercise.loadValue}`
        : `${exercise.loadValue} KG`;

    return `
      <div class="exercise-sprite-box ${info.cssModifier}" data-sprite-type="${detectExerciseAnimationType(exercise)}" role="button" tabindex="0" title="Toca para abrir el Visor Técnico de 3 Fases" aria-label="Demostración visual del ejercicio ${exercise.name}. Toca para ampliar las 3 fases">
        <div class="exercise-sprite-frame" style="background-image: url('${info.spriteUrl}');"></div>
        <span class="sprite-zoom-hint" aria-hidden="true">🔍 3 Fases</span>
        <div class="sprite-overlay-badge">
          <span class="sprite-badge-tag">${info.label}</span>
          <span class="sprite-badge-load">${loadLabel}</span>
        </div>
      </div>
    `.trim();
  }

  // Compatibilidad hacia atrás (retorna el componente de imagen/sprite rasterizado sin SVGs)
  function renderExerciseIllustrationSVG(exercise) {
    return renderExerciseSprite(exercise);
  }

  // Determina qué zonas anatómicas se iluminan según el día seleccionado
  function getActiveAnatomyZones(day) {
    const text = `${day.title} ${day.muscleGroup} ${(day.exercises || []).map(e => e.muscle).join(' ')}`.toLowerCase();
    return {
      lats: text.includes('espalda') || text.includes('dorsal') || text.includes('romboides') || text.includes('torso'),
      traps: text.includes('trapecio') || text.includes('espalda') || text.includes('posterior'),
      biceps: text.includes('bíceps') || text.includes('biceps') || text.includes('braquial') || text.includes('brazos'),
      chest: text.includes('pecho') || text.includes('pectoral') || text.includes('torso'),
      triceps: text.includes('tríceps') || text.includes('triceps') || text.includes('brazos'),
      shoulders: text.includes('hombro') || text.includes('deltoides') || text.includes('torso'),
      core: text.includes('core') || text.includes('abdomen') || text.includes('abdominal'),
      quads: text.includes('cuádriceps') || text.includes('pierna') || text.includes('aductores'),
      glutesHams: text.includes('glúteo') || text.includes('femoral') || text.includes('isquiotibiales') || text.includes('pierna'),
      calves: text.includes('gemelos') || text.includes('pantorrilla') || text.includes('sóleo') || text.includes('talones')
    };
  }

  // Renderiza el Mapa Anatómico Corporal Dual 100% Rasterizado + Hotspots CSS (Cero SVGs en todo el DOM)
  function renderAnatomyMapSVG(day) {
    const z = getActiveAnatomyZones(day);
    const activeLabels = [];
    if (z.lats) activeLabels.push('Dorsal / Espalda');
    if (z.traps) activeLabels.push('Trapecio');
    if (z.biceps) activeLabels.push('Bíceps');
    if (z.chest) activeLabels.push('Pectoral');
    if (z.triceps) activeLabels.push('Tríceps');
    if (z.shoulders) activeLabels.push('Deltoides');
    if (z.core) activeLabels.push('Core / Abdomen');
    if (z.quads) activeLabels.push('Cuádriceps');
    if (z.glutesHams) activeLabels.push('Glúteo / Femoral');
    if (z.calves) activeLabels.push('Gemelos / Sóleo');

    const dotClass = flag => (flag ? 'anatomy-hotspot is-active' : 'anatomy-hotspot');

    return `
      <div class="anatomy-raster-card" role="img" aria-label="Mapa anatómico corporal frontal y dorsal de músculos activos">
        <div class="anatomy-raster-stage">
          <img src="assets/sprites/anatomy_body_map.jpg" alt="Mapa Anatómico Frontal y Dorsal" class="anatomy-raster-img" loading="eager">
          <!-- Hotspots Vista Frontal (Izquierda ~28% X) -->
          <span class="${dotClass(z.shoulders)}" style="left: 20%; top: 24%;" title="Deltoides Frontal"></span>
          <span class="${dotClass(z.shoulders)}" style="left: 36%; top: 24%;" title="Deltoides Frontal"></span>
          <span class="${dotClass(z.chest)}" style="left: 28%; top: 28%;" title="Pectoral Mayor"></span>
          <span class="${dotClass(z.biceps)}" style="left: 17%; top: 34%;" title="Bíceps Braquial"></span>
          <span class="${dotClass(z.biceps)}" style="left: 39%; top: 34%;" title="Bíceps Braquial"></span>
          <span class="${dotClass(z.core)}" style="left: 28%; top: 41%;" title="Core y Recto Abdominal"></span>
          <span class="${dotClass(z.quads)}" style="left: 24%; top: 58%;" title="Cuádriceps"></span>
          <span class="${dotClass(z.quads)}" style="left: 32%; top: 58%;" title="Cuádriceps"></span>
          <!-- Hotspots Vista Posterior / Dorsal (Derecha ~72% X) -->
          <span class="${dotClass(z.traps)}" style="left: 72%; top: 22%;" title="Trapecio y Espalda Alta"></span>
          <span class="${dotClass(z.lats)}" style="left: 67%; top: 33%;" title="Dorsal Ancho"></span>
          <span class="${dotClass(z.lats)}" style="left: 77%; top: 33%;" title="Dorsal Ancho"></span>
          <span class="${dotClass(z.triceps)}" style="left: 61%; top: 35%;" title="Tríceps"></span>
          <span class="${dotClass(z.triceps)}" style="left: 83%; top: 35%;" title="Tríceps"></span>
          <span class="${dotClass(z.glutesHams)}" style="left: 72%; top: 49%;" title="Glúteos"></span>
          <span class="${dotClass(z.glutesHams)}" style="left: 68%; top: 62%;" title="Isquiotibiales / Femoral"></span>
          <span class="${dotClass(z.glutesHams)}" style="left: 76%; top: 62%;" title="Isquiotibiales / Femoral"></span>
          <span class="${dotClass(z.calves)}" style="left: 68%; top: 78%;" title="Gemelos y Sóleo"></span>
          <span class="${dotClass(z.calves)}" style="left: 76%; top: 78%;" title="Gemelos y Sóleo"></span>
        </div>
        <div class="anatomy-active-tags">
          ${
            activeLabels.length > 0
              ? activeLabels.map(l => `<span class="muscle-zone is-active">${l}</span>`).join('')
              : '<span class="muscle-zone">Recuperación Activa</span>'
          }
        </div>
      </div>
    `.trim();
  }

  // Calcula el 1RM Estimado (Fórmula de Epley) a partir de la carga (kg o nivel) y repeticiones
  function calculateE1RM(loadType, loadValue, reps) {
    const r = Math.max(1, Number(reps) || 12);
    const val = Number(loadValue) || 0;
    const effectiveKg =
      loadType === 'nivel'
        ? val * 3.5
        : loadType === 'corporal'
          ? 35 + val
          : val;
    return Math.round(effectiveKg * (1 + r / 30) * 10) / 10;
  }

  // Genera el protocolo de calentamiento articular de 5 minutos adaptado al grupo muscular del día
  function getWarmupProtocolForDay(day) {
    const text = `${day?.title || ''} ${day?.muscleGroup || ''}`.toLowerCase();
    if (text.includes('espalda') || text.includes('bíceps') || text.includes('tracción')) {
      return [
        { id: 'w1', label: 'Rotaciones escapulares y movilidad torácica (2 × 15 reps)', duration: '60s' },
        { id: 'w2', label: 'Dislocaciones de hombro con banda o bastón suave', duration: '60s' },
        { id: 'w3', label: 'Serie de aproximación en polea alta al 40% (15 reps fluidas)', duration: '90s' },
        { id: 'w4', label: 'Activación de codos y muñecas (curl ligero sin fatiga)', duration: '60s' }
      ];
    }
    if (text.includes('pecho') || text.includes('tríceps') || text.includes('empuje')) {
      return [
        { id: 'w1', label: 'Rotación externa de manguito rotador en polea o banda (2 × 15)', duration: '75s' },
        { id: 'w2', label: 'Aperturas dinámicas de pectoral y retracción escapular', duration: '60s' },
        { id: 'w3', label: 'Extensión suave de codos en cuerda para lubricar tríceps', duration: '60s' },
        { id: 'w4', label: 'Serie de aproximación en máquina de pecho al 40% (15 reps)', duration: '90s' }
      ];
    }
    if (text.includes('pierna') || text.includes('cuádriceps') || text.includes('glúteo') || text.includes('femoral')) {
      return [
        { id: 'w1', label: 'Movilidad dinámica de cadera 90/90 y flexores pélvicos', duration: '75s' },
        { id: 'w2', label: 'Dorsiflexión de tobillo contra pared y activación tibial', duration: '60s' },
        { id: 'w3', label: 'Puente de glúteo isométrico en suelo (2 × 12 reps)', duration: '75s' },
        { id: 'w4', label: 'Serie de aproximación en prensa / máquina al 40% (15 reps)', duration: '90s' }
      ];
    }
    return [
      { id: 'w1', label: 'Círculos articulares de cuello, hombros y cadera', duration: '60s' },
      { id: 'w2', label: 'Activación de core (Plancha abdominal / Bird-dog 2 × 30s)', duration: '75s' },
      { id: 'w3', label: 'Y-T-W escapular sin peso para deltoides posterior', duration: '75s' },
      { id: 'w4', label: 'Serie de aproximación ligera en el primer ejercicio (15 reps)', duration: '90s' }
    ];
  }

  // Calcula tonelaje estimado y métricas estadísticas de toda la semana
  function computeAnalytics(schedule, daysOrder) {
    const perDay = [];
    const muscleMap = {
      'Espalda y Dorsal': { sets: 0, completedSets: 0, color: '#10b981' },
      'Bíceps y Tríceps': { sets: 0, completedSets: 0, color: '#06b6d4' },
      'Pecho y Hombro': { sets: 0, completedSets: 0, color: '#3b82f6' },
      'Pierna y Glúteo': { sets: 0, completedSets: 0, color: '#f59e0b' },
      'Core y Trapecio': { sets: 0, completedSets: 0, color: '#a855f7' }
    };

    let totalWeeklyVolumeKg = 0;
    let completedWeeklyVolumeKg = 0;
    let totalRepsPlanned = 0;
    let totalRepsDone = 0;

    for (const dayKey of daysOrder) {
      const day = schedule[dayKey];
      let dayPlannedSets = 0;
      let dayDoneSets = 0;
      let dayPlannedKg = 0;
      let dayDoneKg = 0;

      for (const ex of day.exercises || []) {
        const sets = Number(ex.sets) || 4;
        const reps = Number(ex.reps) || 12;
        const doneCount = (ex.completedSets || []).filter(Boolean).length;
        // Para poleas por Nivel donde no se ve el peso, estimamos ~3.5 kg por placa para el cálculo de tonelaje
        const effectiveKg =
          ex.loadType === 'nivel'
            ? Number(ex.loadValue) * 3.5
            : ex.loadType === 'corporal'
              ? 35 + Number(ex.loadValue || 0)
              : Number(ex.loadValue) || 0;

        const exPlannedVolume = Math.round(sets * reps * effectiveKg);
        const exDoneVolume = Math.round(doneCount * reps * effectiveKg);

        dayPlannedSets += sets;
        dayDoneSets += doneCount;
        dayPlannedKg += exPlannedVolume;
        dayDoneKg += exDoneVolume;

        totalWeeklyVolumeKg += exPlannedVolume;
        completedWeeklyVolumeKg += exDoneVolume;
        totalRepsPlanned += sets * reps;
        totalRepsDone += doneCount * reps;

        const m = `${ex.name} ${ex.muscle}`.toLowerCase();
        if (m.includes('espalda') || m.includes('dorsal') || m.includes('romboides')) {
          muscleMap['Espalda y Dorsal'].sets += sets;
          muscleMap['Espalda y Dorsal'].completedSets += doneCount;
        } else if (m.includes('bíceps') || m.includes('biceps') || m.includes('tríceps') || m.includes('triceps') || m.includes('braquial')) {
          muscleMap['Bíceps y Tríceps'].sets += sets;
          muscleMap['Bíceps y Tríceps'].completedSets += doneCount;
        } else if (m.includes('pecho') || m.includes('pectoral') || m.includes('hombro') || m.includes('deltoides')) {
          muscleMap['Pecho y Hombro'].sets += sets;
          muscleMap['Pecho y Hombro'].completedSets += doneCount;
        } else if (m.includes('cuádriceps') || m.includes('femoral') || m.includes('glúteo') || m.includes('prensa') || m.includes('gemelos') || m.includes('sóleo') || m.includes('aductores')) {
          muscleMap['Pierna y Glúteo'].sets += sets;
          muscleMap['Pierna y Glúteo'].completedSets += doneCount;
        } else {
          muscleMap['Core y Trapecio'].sets += sets;
          muscleMap['Core y Trapecio'].completedSets += doneCount;
        }
      }

      perDay.push({
        id: dayKey,
        shortName: day.shortName,
        dayName: day.dayName,
        title: day.title,
        plannedSets: dayPlannedSets,
        doneSets: dayDoneSets,
        plannedKg: dayPlannedKg,
        doneKg: dayDoneKg,
        status: day.status
      });
    }

    return {
      perDay,
      muscleMap,
      totalWeeklyVolumeKg,
      completedWeeklyVolumeKg,
      totalRepsPlanned,
      totalRepsDone,
      estimatedKcal: Math.round(totalRepsDone * 1.45)
    };
  }

  // Calculadora de Discos por lado (Estándar Olímpico / Gimnasio)
  function calculatePlateBreakdown(targetWeightKg, barWeightKg = 20) {
    const total = Math.max(0, Number(targetWeightKg) || 0);
    const bar = Math.max(0, Number(barWeightKg) || 0);
    const netLoad = Math.max(0, total - bar);
    let remainingPerSide = netLoad / 2;

    const standardPlates = [
      { weight: 25, color: '#ef4444', label: '25 kg' },
      { weight: 20, color: '#3b82f6', label: '20 kg' },
      { weight: 15, color: '#eab308', label: '15 kg' },
      { weight: 10, color: '#10b981', label: '10 kg' },
      { weight: 5, color: '#f8fafc', label: '5 kg' },
      { weight: 2.5, color: '#a855f7', label: '2.5 kg' },
      { weight: 1.25, color: '#64748b', label: '1.25 kg' }
    ];

    const platesPerSide = [];
    for (const p of standardPlates) {
      const count = Math.floor((remainingPerSide + 0.001) / p.weight);
      if (count > 0) {
        platesPerSide.push({ ...p, count });
        remainingPerSide = Number((remainingPerSide - count * p.weight).toFixed(2));
      }
    }

    return {
      totalKg: total,
      barKg: bar,
      perSideKg: Number((netLoad / 2).toFixed(2)),
      platesPerSide,
      remainderKg: remainingPerSide
    };
  }

  // Zonas de porcentaje sobre el 1RM para hipertrofia y fuerza
  function calculate1RMZones(e1rmKg) {
    const base = Math.max(1, Number(e1rmKg) || 40);
    return [
      { pct: 100, reps: '1 rep (Máximo)', weightKg: Math.round(base * 10) / 10, zone: 'Fuerza Máxima' },
      { pct: 85, reps: '5–6 reps', weightKg: Math.round(base * 0.85 * 10) / 10, zone: 'Fuerza / Tensión' },
      { pct: 75, reps: '8–10 reps', weightKg: Math.round(base * 0.75 * 10) / 10, zone: 'Hipertrofia Pesada' },
      { pct: 70, reps: '12 reps (Tu Estándar)', weightKg: Math.round(base * 0.70 * 10) / 10, zone: 'Hipertrofia Óptima 4×12' },
      { pct: 60, reps: '15–18 reps', weightKg: Math.round(base * 0.60 * 10) / 10, zone: 'Bombeo / Resistencia' }
    ];
  }

  // Modos Avanzados de Serie (Normal, Dropset, Superserie, Rest-Pause) y RIR
  const SET_MODE_CATALOG = {
    normal: { id: 'normal', label: 'Estándar 4×12', badge: '🎯 Serie Normal', css: 'mode-normal' },
    dropset: { id: 'dropset', label: 'Dropset en última serie (-25% peso al fallo)', badge: '🔥 Dropset Final', css: 'mode-dropset' },
    superset: { id: 'superset', label: 'Superserie / Biserie sin descanso intermedio', badge: '⚡ Superserie', css: 'mode-superset' },
    restpause: { id: 'restpause', label: 'Rest-Pause (12 reps + 15s + 4 reps extra)', badge: '⏸️ Rest-Pause', css: 'mode-restpause' }
  };

  const RIR_ORDER = ['RIR 2', 'RIR 1', 'RIR 0 (Fallo)'];

  const WORKOUT_TEMPLATES = {
    default_ppl: {
      id: 'default_ppl',
      name: 'PPL × 2 Clásico (Tracción / Empuje / Pierna)',
      description: 'Distribución original Lunes a Sábado con tus marcas base intactas en Lunes (Nivel 6, 20 kg, 10 kg, 4×12).'
    },
    torso_pierna: {
      id: 'torso_pierna',
      name: 'Torso / Pierna + Especialización Espalda y Brazos',
      description: 'Agrupa Torso y Pierna de Lunes a Jueves, dejando Viernes y Sábado para énfasis intensivo en Espalda, Bíceps, Hombros y Core.'
    },
    densidad_poleas: {
      id: 'densidad_poleas',
      name: 'Alta Densidad en Poleas y Máquinas (Superseries & Dropsets)',
      description: 'Activa automáticamente biseries, dropsets en polea y RIR 1–2 en los ejercicios clave de la semana para máxima hipertrofia en menos tiempo.'
    }
  };

  return {
    EXERCISE_SPRITE_CATALOG,
    detectExerciseAnimationType,
    getExerciseSpriteInfo,
    renderExerciseIllustrationSVG,
    renderExerciseSprite,
    renderAnatomyMapSVG,
    calculateE1RM,
    getWarmupProtocolForDay,
    calculatePlateBreakdown,
    calculate1RMZones,
    SET_MODE_CATALOG,
    RIR_ORDER,
    WORKOUT_TEMPLATES,
    computeAnalytics
  };
});

