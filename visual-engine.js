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
        <div class="sprite-overlay-badge">
          <span class="sprite-badge-tag" title="${info.label}">${info.label}</span>
          <span class="sprite-badge-load">${loadLabel}</span>
        </div>
        <div class="sprite-overlay-bottom">
          <span class="sprite-phase-pills" aria-hidden="true">
            <span class="phase-pill-dot dot-1"></span>
            <span class="phase-pill-dot dot-2"></span>
            <span class="phase-pill-dot dot-3"></span>
            <span class="phase-pill-text">3 FASES</span>
          </span>
          <span class="sprite-zoom-hint" aria-hidden="true">🔍 3 Fases</span>
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
      description: 'Activa automáticamente biseries, dropsets en polea y RIR 1–2 en los ejercicios clave de la semana para máxima hipertrofia en menos tiempo.',
      dayOverrides: {
        lunes: { defaultSetMode: 'dropset', defaultRir: 'RIR 1' },
        martes: { defaultSetMode: 'superserie', defaultRir: 'RIR 1' },
        jueves: { defaultSetMode: 'dropset', defaultRir: 'RIR 1' },
        viernes: { defaultSetMode: 'superserie', defaultRir: 'RIR 1' }
      }
    }
  };

  // Módulo Master 1: Calculadora de Nutrición Deportiva, Macros e Hidratación
  function calculateNutritionPlan(weightKg = 74.5, goalKey = 'hipertrofia', workoutMinutes = 60) {
    const w = Math.max(40, Math.min(180, Number(weightKg) || 74.5));
    const baseTdee = Math.round(w * 31 + (Number(workoutMinutes) || 60) * 5.2);

    const goals = {
      hipertrofia: {
        id: 'hipertrofia',
        label: 'Volumen Limpio / Hipertrofia (+320 kcal)',
        kcalDelta: 320,
        proteinPerKg: 2.2,
        fatPerKg: 0.95,
        preWorkoutTip: '40g Avena o Plátano + 25g Whey 45 min antes de entrenar',
        postWorkoutTip: '30-35g Proteína + 60g Carbohidratos rápidos + 5g Creatina Monohidrato'
      },
      definicion: {
        id: 'definicion',
        label: 'Definición Muscular / Déficit (-400 kcal)',
        kcalDelta: -400,
        proteinPerKg: 2.4,
        fatPerKg: 0.85,
        preWorkoutTip: 'Café negro / Pre-entreno + 20g Proteína aislada + electrolitos',
        postWorkoutTip: '35g Proteína magra + vegetales verdes + 40g arroz/papa cocida + 5g Creatina'
      },
      mantenimiento: {
        id: 'mantenimiento',
        label: 'Recomposición Corporal / Mantenimiento (Normocalórico)',
        kcalDelta: 0,
        proteinPerKg: 2.1,
        fatPerKg: 0.9,
        preWorkoutTip: 'Fruta mediana + 25g Proteína 45 min antes de la sesión',
        postWorkoutTip: '30g Proteína + 45g Carbohidratos complejos + 5g Creatina'
      }
    };

    const cfg = goals[goalKey] || goals.hipertrofia;
    const targetKcal = Math.max(1400, baseTdee + cfg.kcalDelta);
    const proteinGrams = Math.round(w * cfg.proteinPerKg);
    const fatGrams = Math.round(w * cfg.fatPerKg);
    const proteinKcal = proteinGrams * 4;
    const fatKcal = fatGrams * 9;
    const carbsGrams = Math.max(80, Math.round((targetKcal - proteinKcal - fatKcal) / 4));
    const targetWaterMl = Math.round(w * 40 + 500); // Base 40ml/kg + 500ml intra-entreno

    return {
      weightKg: w,
      goalKey: cfg.id,
      goalLabel: cfg.label,
      targetKcal,
      proteinGrams,
      carbsGrams,
      fatGrams,
      targetWaterMl,
      preWorkoutTip: cfg.preWorkoutTip,
      postWorkoutTip: cfg.postWorkoutTip
    };
  }

  // Módulo Master 2: Sustitución Inteligente de Ejercicios ("Máquina Ocupada")
  const EXERCISE_ALTERNATIVES_MAP = {
    back_pulldown_narrow: {
      altName: 'Dominadas Asistidas o Jalón Unilateral en Polea',
      altEquipment: 'Máquina Asistida / Polea Alta',
      altSpriteType: 'back_pullover',
      altNote: 'Alternativa biomecánica de tracción vertical con énfasis en dorsal inferior. Mantén 4×12.'
    },
    back_machine_wide: {
      altName: 'Remo en Máquina Convergente Agarre Prono Amplio',
      altEquipment: 'Máquina Hammer / Polea',
      altSpriteType: 'back_row_seated',
      altNote: 'Alternativa directa cuando la máquina de espalda amplia está ocupada. Codos abiertos a 60°.'
    },
    back_row_seated: {
      altName: 'Remo con Mancuerna a Una Mano (Serrucho) o Remo en Punta',
      altEquipment: 'Mancuerna / Banco Plano',
      altSpriteType: 'back_machine_wide',
      altNote: 'Excelente sustituto libre para densidad de romboides y dorsal medio en 4×12.'
    },
    back_pullover: {
      altName: 'Pull-Over con Mancuerna en Banco Plano',
      altEquipment: 'Mancuerna + Banco',
      altSpriteType: 'back_pulldown_narrow',
      altNote: 'Estiramiento profundo del dorsal ancho manteniendo codos semirrígidos.'
    },
    bicep_curl: {
      altName: 'Curl de Bíceps Alterno con Mancuernas o Barra Z',
      altEquipment: 'Mancuernas / Barra Z',
      altSpriteType: 'bicep_hammer',
      altNote: 'Sustituto ideal si la polea baja está ocupada. Supina la muñeca al subir.'
    },
    bicep_hammer: {
      altName: 'Curl Martillo Cruzado con Mancuernas',
      altEquipment: 'Par de Mancuernas',
      altSpriteType: 'bicep_curl',
      altNote: 'Ataca el braquial anterior y braquiorradial sin depender de la estación de poleas.'
    },
    chest_press: {
      altName: 'Press Plano con Mancuernas o Barra Olímpica',
      altEquipment: 'Banco Plano + Mancuernas',
      altSpriteType: 'chest_incline',
      altNote: 'Equivalente biomecánico de empuje horizontal con mayor rango de estabilización.'
    },
    chest_incline: {
      altName: 'Press Inclinado en Multipower (Smith) o Polea Baja',
      altEquipment: 'Multipower / Banco 30°',
      altSpriteType: 'chest_press',
      altNote: 'Enfocado en la porción clavicular (pecho superior) con tensión controlada.'
    },
    chest_pecdeck: {
      altName: 'Aperturas con Mancuernas en Banco Plano',
      altEquipment: 'Mancuernas + Banco',
      altSpriteType: 'chest_crossover',
      altNote: 'Aducción horizontal libre cuando el Pec Deck está ocupado.'
    },
    chest_crossover: {
      altName: 'Fondos Inclinados o Aperturas en Máquina Contractora',
      altEquipment: 'Paralelas / Pec Deck',
      altSpriteType: 'chest_pecdeck',
      altNote: 'Aísla las fibras esternales e inferiores del pectoral.'
    },
    tricep_pushdown: {
      altName: 'Press Francés con Barra Z o Mancuernas',
      altEquipment: 'Barra Z / Banco Plano',
      altSpriteType: 'tricep_overhead',
      altNote: 'Gran estímulo en las 3 cabezas del tríceps sin usar torre de polea.'
    },
    tricep_overhead: {
      altName: 'Extensión Copa con Mancuerna a Dos Manos Tras Nuca',
      altEquipment: 'Mancuerna en Banco 90°',
      altSpriteType: 'tricep_pushdown',
      altNote: 'Estiramiento máximo de la cabeza larga del tríceps.'
    },
    tricep_dips: {
      altName: 'Press Cerrado en Máquina o Banco Plano',
      altEquipment: 'Barra / Máquina Multipower',
      altSpriteType: 'tricep_pushdown',
      altNote: 'Empuje compuesto de tríceps con codos pegados al torso.'
    },
    leg_press: {
      altName: 'Sentadilla en Multipower (Smith) o Prensa Horizontal',
      altEquipment: 'Multipower / Máquina',
      altSpriteType: 'leg_hack_squat',
      altNote: 'Sustituto directo de empuje bilateral de tren inferior.'
    },
    leg_hack_squat: {
      altName: 'Zancadas Búlgaras con Mancuernas o Prensa 45° Pies Bajos',
      altEquipment: 'Mancuernas + Banco',
      altSpriteType: 'leg_press',
      altNote: 'Enfoque dominante de rodilla y cuádriceps.'
    },
    leg_extension: {
      altName: 'Sentadilla Sissy Asistida o Paso Atrás (Step-Down)',
      altEquipment: 'Soporte / Mancuerna',
      altSpriteType: 'leg_hack_squat',
      altNote: 'Aísla el recto femoral cuando el sillón de cuádriceps está ocupado.'
    },
    leg_curl: {
      altName: 'Curl Femoral con Deslizadores o Mancuerna entre Pies',
      altEquipment: 'Banco Plano + Mancuerna',
      altSpriteType: 'leg_rdl',
      altNote: 'Flexión de rodilla estricta para isquiotibiales.'
    },
    leg_hip_thrust: {
      altName: 'Puente de Glúteo en Máquina o Pull-Through en Polea Baja',
      altEquipment: 'Polea Baja / Cuerda',
      altSpriteType: 'leg_rdl',
      altNote: 'Extensión de cadera con pico de contracción en glúteo mayor.'
    },
    leg_rdl: {
      altName: 'Buenos Días en Multipower o Hiperextensiones 45° con Disco',
      altEquipment: 'Banco 45° / Barra',
      altSpriteType: 'leg_hip_thrust',
      altNote: 'Bisagra de cadera para cadena posterior (isquios y glúteos).'
    },
    leg_adductor: {
      altName: 'Sentadilla Sumo con Mancuerna / Kettlebell Pesada',
      altEquipment: 'Mancuerna Pesada',
      altSpriteType: 'leg_abductor',
      altNote: 'Puntas hacia afuera a 45° para activar aductores profundos.'
    },
    leg_abductor: {
      altName: 'Abducción de Cadera en Polea Baja con Tobillera',
      altEquipment: 'Polea Baja + Tobillera',
      altSpriteType: 'leg_adductor',
      altNote: 'Tensión continua en glúteo medio y menor.'
    },
    leg_calves: {
      altName: 'Elevación de Gemelos Unilateral con Mancuerna en Escalón',
      altEquipment: 'Escalón + Mancuerna',
      altSpriteType: 'leg_press',
      altNote: 'Pausa de 2 segundos abajo y 1 segundo en punta.'
    },
    shoulder_press: {
      altName: 'Press Arnold Sentado con Mancuernas',
      altEquipment: 'Banco 85° + Mancuernas',
      altSpriteType: 'shoulder_lateral',
      altNote: 'Recorrido completo de deltoides anterior y lateral.'
    },
    shoulder_lateral: {
      altName: 'Elevación Lateral con Mancuernas Sentado (Estricto)',
      altEquipment: 'Par de Mancuernas',
      altSpriteType: 'shoulder_press',
      altNote: 'Elimina el impulso lumbar aislando la cabeza lateral del hombro.'
    },
    shoulder_facepull: {
      altName: 'Pájaros con Mancuernas Pecho Apoyado en Banco Inclinado',
      altEquipment: 'Banco 30° + Mancuernas',
      altSpriteType: 'shoulder_reardelt',
      altNote: 'Salud articular del manguito rotador y deltoides posterior.'
    },
    shoulder_reardelt: {
      altName: 'Encogimientos con Mancuernas + Remo al Mentón Agarre Ancho',
      altEquipment: 'Mancuernas / Barra Z',
      altSpriteType: 'shoulder_facepull',
      altNote: 'Estímulo directo de trapecio superior y deltoides posterior.'
    },
    core_crunch: {
      altName: 'Elevación de Piernas Colgado o en Silla Romana + Plancha',
      altEquipment: 'Silla Romana / Lastre',
      altSpriteType: 'shoulder_reardelt',
      altNote: 'Flexión pélvica para recto abdominal inferior y core.'
    }
  };

  // Módulo de Series y Repeticiones Dinámicas (6, 8, 10, 12, 15 y Pirámides)
  const REPS_PRESETS = [
    { key: 6, label: '6 reps (Fuerza)', scheme: 'fixed', restSeconds: 90, series: (sets) => Array(sets).fill(6) },
    { key: 8, label: '8 reps (Fuerza/Hipertrofia)', scheme: 'fixed', restSeconds: 90, series: (sets) => Array(sets).fill(8) },
    { key: 10, label: '10 reps (Tensión Media)', scheme: 'fixed', restSeconds: 75, series: (sets) => Array(sets).fill(10) },
    { key: 12, label: '12 reps (Hipertrofia)', scheme: 'fixed', restSeconds: 75, series: (sets) => Array(sets).fill(12) },
    { key: 15, label: '15 reps (Bombeo / Quema)', scheme: 'fixed', restSeconds: 60, series: (sets) => Array(sets).fill(15) },
    { key: 'pyramid', label: 'Pirámide (12-10-8-6)', scheme: 'pyramid', restSeconds: 75, series: (sets) => {
      const base = [12, 10, 8, 6, 6, 6, 6, 6];
      return base.slice(0, sets);
    }}
  ];

  function formatExerciseRepsSummary(exercise) {
    if (!exercise) return '12 reps';
    if (Array.isArray(exercise.seriesReps) && exercise.seriesReps.length > 0) {
      const allEqual = exercise.seriesReps.every(r => r === exercise.seriesReps[0]);
      if (!allEqual) {
        return `${exercise.seriesReps.join('-')} reps`;
      }
      return `${exercise.seriesReps[0]} reps`;
    }
    return `${exercise.reps || 12} reps`;
  }

  function getExerciseSetReps(exercise, setIndex) {
    if (!exercise) return 12;
    if (Array.isArray(exercise.seriesReps) && exercise.seriesReps[setIndex] !== undefined) {
      return Number(exercise.seriesReps[setIndex]) || Number(exercise.reps) || 12;
    }
    return Number(exercise.reps) || 12;
  }

  // Módulo Élite: Catálogo enriquecido de alternativas por categoría (Polea, Máquina, Peso Libre)
  function getExerciseAlternatives(exercise) {
    if (!exercise) return [];
    const detectedKey = detectExerciseAnimationType(exercise);
    const alt = EXERCISE_ALTERNATIVES_MAP[detectedKey] || EXERCISE_ALTERNATIVES_MAP['back_pulldown_narrow'] || {};

    const loadKg = exercise.loadType === 'kg' ? exercise.loadValue : (exercise.loadValue * 3.5);
    const dumbbellEq = Math.max(4, Math.round((loadKg * 0.45) / 2) * 2);
    const pulleyLevelEq = Math.max(1, Math.min(20, Math.round(loadKg / 3.5)));

    return [
      {
        id: 'alt-pulley',
        category: 'cable',
        categoryType: 'polea',
        categoryLabel: '⚡ Alternativa en Polea (Tensión Continua)',
        name: alt.altName && alt.altName.includes('Polea') ? alt.altName : `Variante en Polea para ${exercise.muscle || 'Grupo Muscular'}`,
        equipment: 'Torre de Poleas Regulable',
        loadType: 'nivel',
        loadValue: pulleyLevelEq,
        loadTransfer: `Carga sugerida: Nivel ${pulleyLevelEq}`,
        reason: alt.altNote || 'Tensión constante en todo el recorrido biomecánico.',
        note: alt.altNote || 'Tensión constante en todo el recorrido biomecánico.',
        spriteType: alt.altSpriteType || detectedKey
      },
      {
        id: 'alt-machine',
        category: 'machine',
        categoryType: 'maquina',
        categoryLabel: '🏢 Alternativa en Máquina (Estabilidad y Trayectoria Fija)',
        name: alt.altName && !alt.altName.includes('Mancuerna') ? alt.altName : `Máquina Convergente / Guiada para ${exercise.muscle || 'Músculo'}`,
        equipment: 'Máquina Selectorizada o Smith',
        loadType: 'kg',
        loadValue: Math.max(10, Math.round(loadKg / 2.5) * 2.5),
        loadTransfer: `Carga sugerida: ${Math.max(10, Math.round(loadKg / 2.5) * 2.5)} kg`,
        reason: 'Ideal cuando necesitas máxima estabilidad muscular sin fatigar estabilizadores.',
        note: 'Ideal cuando necesitas máxima estabilidad muscular sin fatigar estabilizadores.',
        spriteType: detectedKey
      },
      {
        id: 'alt-free-weight',
        category: 'free_weight',
        categoryType: 'peso_libre',
        categoryLabel: '🏋️ Alternativa con Mancuernas / Peso Libre',
        name: alt.altName && alt.altName.includes('Mancuerna') ? alt.altName : `Mancuernas / Banco para ${exercise.muscle || 'Músculo'}`,
        equipment: 'Par de Mancuernas + Banco',
        loadType: 'kg',
        loadValue: dumbbellEq,
        loadTransfer: `Carga sugerida: ${dumbbellEq} kg por mancuerna`,
        reason: 'Perfecto si las máquinas y poleas están ocupadas en el gimnasio.',
        note: 'Perfecto si las máquinas y poleas están ocupadas en el gimnasio.',
        spriteType: detectedKey
      }
    ];
  }

  // Módulo Élite: Calibración dinámica de ejercicios según Parámetros Biométricos y Objetivos
  function calculatePersonalizedExercise(baseEx, profile = {}) {
    const gender = profile.gender || 'male';
    const weight = Number(profile.weightKg) || 75;
    const age = Number(profile.age) || 28;
    const level = profile.fitnessLevel || 'intermediate';
    const goal = profile.primaryGoal || 'hypertrophy';
    const limitations = profile.limitations || 'none';

    // 1. Ratio de Peso Corporal base (normalizado a 75kg)
    const weightRatio = Math.max(0.6, Math.min(1.5, weight / 75));

    // 2. Factor de Género (Mujeres: tren superior calibrado a ~0.65, tren inferior a ~0.90)
    const isLowerBody = /pierna|femoral|cuádriceps|glúteo|gemelos|aductores|hack|thrust|rdl/i.test(
      (baseEx.muscle || '') + ' ' + (baseEx.name || '')
    );
    let genderFactor = 1.0;
    if (gender === 'female') {
      genderFactor = isLowerBody ? 0.90 : 0.65;
    }

    // 3. Factor de Nivel de Experiencia
    const levelFactors = {
      beginner: 0.72,
      intermediate: 1.0,
      advanced: 1.25
    };
    const levelFactor = levelFactors[level] || 1.0;

    // 4. Factor de Edad
    let ageFactor = 1.0;
    if (age > 50) ageFactor = 0.85;
    else if (age > 40) ageFactor = 0.92;
    else if (age < 18) ageFactor = 0.88;

    const compoundMultiplier = weightRatio * genderFactor * levelFactor * ageFactor;

    // 5. Ajuste de Series, Repeticiones, Descanso y Cargas según Objetivo
    let targetSets = baseEx.sets || 4;
    let targetReps = baseEx.reps || 12;
    let targetRest = baseEx.restSeconds || 75;
    let goalMultiplier = 1.0;
    let goalRir = 'RIR 2';

    if (goal === 'strength') {
      targetSets = Math.min(5, (baseEx.sets || 4) + 1);
      targetReps = isLowerBody ? 6 : 8;
      targetRest = Math.min(120, targetRest + 30);
      goalMultiplier = 1.15;
      goalRir = 'RIR 1';
    } else if (goal === 'fat_loss') {
      targetSets = Math.max(3, (baseEx.sets || 4));
      targetReps = 14;
      targetRest = Math.max(50, targetRest - 15);
      goalMultiplier = 0.90;
      goalRir = 'RIR 2';
    } else if (goal === 'health') {
      targetSets = 3;
      targetReps = 12;
      targetRest = Math.max(60, targetRest);
      goalMultiplier = 0.80;
      goalRir = 'RIR 3';
    } else {
      // Hipertrofia Estándar
      targetSets = 4;
      targetReps = 12;
      targetRest = isLowerBody ? 90 : 75;
      goalMultiplier = 1.0;
      goalRir = 'RIR 1';
    }

    if (age > 50) {
      targetRest += 15;
    }

    const finalMultiplier = compoundMultiplier * goalMultiplier;

    // Cálculo y redondeo de Carga Dinámica
    let newLoadValue = baseEx.loadValue;
    if (baseEx.loadType === 'kg') {
      const rawKg = (baseEx.loadValue || 20) * finalMultiplier;
      newLoadValue = Math.max(2.5, Math.round(rawKg / 2.5) * 2.5);
    } else if (baseEx.loadType === 'nivel') {
      const rawNivel = (baseEx.loadValue || 5) * finalMultiplier;
      newLoadValue = Math.max(1, Math.min(20, Math.round(rawNivel)));
    }

    // Ajuste de RIR según Nivel de Experiencia y Objetivo
    let targetRir = 'RIR 1-2';
    if (level === 'beginner') {
      targetRir = 'RIR 3-4';
    } else if (level === 'advanced') {
      targetRir = 'RIR 0-1';
    } else {
      targetRir = (goal === 'health') ? 'RIR 2-3' : 'RIR 1-2';
    }

    let repsScheme = 'fixed';
    let seriesReps = Array.from({ length: targetSets }, () => targetReps);
    if (goal === 'strength') {
      seriesReps = targetSets === 5 ? [8, 6, 6, 6, 4] : [8, 6, 6, 6];
      repsScheme = 'pyramid';
    } else if (goal === 'fat_loss') {
      seriesReps = Array.from({ length: targetSets }, (_, i) => Math.max(10, targetReps - i));
      repsScheme = 'pyramid';
    }

    let finalEx = {
      ...baseEx,
      loadValue: newLoadValue,
      sets: targetSets,
      reps: targetReps,
      repsScheme: repsScheme,
      seriesReps: seriesReps,
      restSeconds: targetRest,
      targetRir: targetRir,
      completedSets: Array.from({ length: targetSets }, () => false),
      personalized: true
    };

    // 6. Aplicar Sustituciones automáticas por Limitaciones Articulares
    if (limitations === 'lower_back') {
      if (baseEx.id === 'sab-peso-muerto-rumano') {
        finalEx.name = 'Hip Thrust en Multipower (Apoyo Lumbar Seguro)';
        finalEx.equipment = 'Banco Acolchado + Máquina Smith';
        finalEx.note = 'Sustituido por seguridad lumbar: Cero compresión en columna baja, máxima activación glútea.';
      } else if (baseEx.id === 'mie-sentadilla-goblet-hack') {
        finalEx.name = 'Prensa 45° Pies Medios (Espalda totalmente apoyada)';
        finalEx.equipment = 'Prensa Inclinada';
        finalEx.note = 'Sustituido por seguridad lumbar: Mantén la zona lumbar completamente adherida al respaldo.';
      }
    } else if (limitations === 'shoulders') {
      if (baseEx.id === 'jue-press-hombro-maquina') {
        finalEx.name = 'Elevaciones Laterales en Polea Baja (Plano Escapular)';
        finalEx.equipment = 'Polea Baja + Agarre D';
        finalEx.loadType = 'nivel';
        finalEx.loadValue = Math.max(1, Math.round(newLoadValue * 0.4));
        finalEx.note = 'Sustituido por cuidado articular de hombro: Tira a 30° en plano escapular sin dolor.';
      } else if (baseEx.id === 'mar-fondos-maquina') {
        finalEx.name = 'Extensión de Tríceps en Polea con Cuerda';
        finalEx.equipment = 'Polea Alta + Cuerda';
        finalEx.note = 'Sustituido para evitar estrés en cápsula anterior del hombro.';
      }
    } else if (limitations === 'knees') {
      if (baseEx.id === 'mie-sentadilla-goblet-hack') {
        finalEx.name = 'Prensa Inclinada con Pies en Parte Alta';
        finalEx.equipment = 'Prensa de Piernas';
        finalEx.note = 'Sustituido por protección de rodillas: Pies altos reducen el momento de fuerza sobre el tendón rotuliano.';
      }
    }

    return finalEx;
  }

  // Genera el plan semanal completo y personalizado según el perfil
  function generatePersonalizedSchedule(profile, baseSchedule) {
    const schedule = JSON.parse(JSON.stringify(baseSchedule));
    const daysOrder = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const daysCount = Number(profile.daysPerWeek) || 6;

    for (const dayKey of daysOrder) {
      const day = schedule[dayKey];
      if (!day) continue;

      if (daysCount === 5 && dayKey === 'sabado') {
        day.status = 'rest_day';
        day.subtitle = 'Día de Descanso Programado / Recuperación';
        day.exercises = [];
        continue;
      } else if (daysCount === 4 && (dayKey === 'miercoles' || dayKey === 'sabado')) {
        day.status = 'rest_day';
        day.subtitle = 'Día de Descanso Programado / Recuperación';
        day.exercises = [];
        continue;
      } else if (daysCount === 3 && (dayKey === 'martes' || dayKey === 'jueves' || dayKey === 'sabado')) {
        day.status = 'rest_day';
        day.subtitle = 'Día de Descanso Programado / Recuperación';
        day.exercises = [];
        continue;
      }

      day.exercises = (day.exercises || []).map(ex => calculatePersonalizedExercise(ex, profile));
    }

    return schedule;
  }

  // Acomodador Dinámico Inteligente de Días No Completados
  function accommodateMissedDay(schedule, missedDayKey, strategyKey = 'sunday') {
    const daysOrder = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const missedDay = schedule[missedDayKey];
    if (!missedDay || !missedDay.exercises || missedDay.exercises.length === 0) {
      return { success: false, schedule, message: 'El día seleccionado no tiene ejercicios pendientes de reacomodar.' };
    }

    if (strategyKey === 'sunday' || strategyKey === 'move_to_sunday') {
      const sunday = schedule.domingo;
      sunday.title = `Recuperación: ${missedDay.title}`;
      sunday.subtitle = `Trasladado desde ${missedDay.dayName} (${missedDay.subtitle})`;
      sunday.muscleGroup = missedDay.muscleGroup;
      sunday.accentHue = missedDay.accentHue;
      sunday.estimatedMinutes = missedDay.estimatedMinutes;
      sunday.status = 'shifted';
      sunday.originalSourceDay = missedDayKey;
      sunday.exercises = missedDay.exercises.map(ex => ({
        ...ex,
        completedSets: Array.from({ length: ex.sets || 4 }, () => false)
      }));

      missedDay.exercises = [];
      missedDay.status = 'skipped_to_sunday';
      missedDay.isRestDay = true;
      missedDay.exceptionNote = `Sesión trasladada al Domingo (${sunday.dayName})`;
      missedDay.subtitle = `Sesión trasladada al Domingo (${sunday.dayName})`;
      return { success: true, schedule, strategy: 'sunday', message: `✅ ${missedDay.dayName} trasladado al Domingo` };
    }

    if (strategyKey === 'shift' || strategyKey === 'shift_chain_to_sunday') {
      const startIdx = daysOrder.indexOf(missedDayKey);
      if (startIdx < 0 || startIdx >= 6) return { success: false, schedule, message: 'No se puede desplazar desde este día.' };

      for (let i = 6; i > startIdx; i--) {
        const targetKey = daysOrder[i];
        const prevKey = daysOrder[i - 1];
        const source = schedule[prevKey];
        const target = schedule[targetKey];

        target.title = source.title;
        target.subtitle = source.subtitle;
        target.muscleGroup = source.muscleGroup;
        target.accentHue = source.accentHue;
        target.estimatedMinutes = source.estimatedMinutes;
        target.status = 'shifted';
        target.exercises = (source.exercises || []).map(ex => ({
          ...ex,
          completedSets: Array.from({ length: ex.sets || 4 }, () => false)
        }));
      }

      missedDay.exercises = [];
      missedDay.status = 'skipped_to_sunday';
      missedDay.isRestDay = true;
      missedDay.exceptionNote = `Día libre por excepción. La secuencia se desplazó +1 día hacia adelante.`;
      missedDay.subtitle = `Día libre por excepción. La secuencia se desplazó +1 día hacia adelante.`;
      return { success: true, schedule, strategy: 'shift', message: `➡️ Semana rodada +1 día hacia adelante. No perdiste ningún grupo muscular.` };
    }

    if (strategyKey === 'merge' || strategyKey === 'smart_merge_next') {
      const startIdx = daysOrder.indexOf(missedDayKey);
      let nextWorkDayKey = null;
      for (let i = startIdx + 1; i < 7; i++) {
        const k = daysOrder[i];
        if (schedule[k] && schedule[k].exercises && schedule[k].exercises.length > 0) {
          nextWorkDayKey = k;
          break;
        }
      }
      if (!nextWorkDayKey) nextWorkDayKey = 'domingo';
      const targetDay = schedule[nextWorkDayKey];

      const priorityExercises = missedDay.exercises.slice(0, 2).map(ex => ({
        ...ex,
        id: `merge-${missedDayKey}-${ex.id}`,
        name: `[Fusión ${missedDay.shortName}] ${ex.name}`,
        sets: 3,
        completedSets: [false, false, false],
        note: `Ejercicio esencial fusionado desde ${missedDay.dayName} para mantener el volumen semanal.`
      }));

      targetDay.exercises.unshift(...priorityExercises);
      targetDay.title = `${targetDay.title} + Fusión ${missedDay.shortName}`;
      targetDay.subtitle += ` · Incluye ${priorityExercises.length} ejercicios clave de ${missedDay.dayName}`;

      missedDay.exercises = [];
      missedDay.status = 'skipped_to_sunday';
      missedDay.isRestDay = true;
      missedDay.exceptionNote = `Fusión Inteligente: 2 ejercicios clave integrados en ${targetDay.dayName}.`;
      missedDay.subtitle = `Ejercicios clave fusionados con ${targetDay.dayName}.`;
      return { success: true, schedule, strategy: 'merge', message: `🧬 Fusión inteligente: Los 2 ejercicios clave de ${missedDay.dayName} se integraron en ${targetDay.dayName}.` };
    }

    if (strategyKey === 'redistribute' || strategyKey === 'redistribute_volume') {
      const startIdx = daysOrder.indexOf(missedDayKey);
      for (let i = startIdx + 1; i < 7; i++) {
        const k = daysOrder[i];
        const d = schedule[k];
        if (d && d.exercises && d.exercises.length > 0) {
          for (const ex of d.exercises) {
            ex.sets = (ex.sets || 4) + 1;
            ex.completedSets = Array.from({ length: ex.sets }, (_, sIdx) => Boolean(ex.completedSets && ex.completedSets[sIdx]));
          }
        }
      }
      missedDay.exercises = [];
      missedDay.status = 'skipped_to_sunday';
      missedDay.isRestDay = true;
      missedDay.exceptionNote = `Compensación de Volumen Express (+1 serie en días restantes)`;
      missedDay.subtitle = `Día compensado con volumen express (+1 serie) en los días restantes.`;
      return { success: true, schedule, strategy: 'redistribute', message: `📊 Volumen compensado: Se añadió +1 serie a tus sesiones restantes para cumplir el volumen semanal.` };
    }

    return { success: false, schedule, message: 'Estrategia de acomodación no reconocida.' };
  }

  // Módulo Master 3: Gamificación, Medallas Desbloqueables y Heatmap de Constancia
  function evaluateAchievements(state, analytics) {
    const lunesEx = state?.schedule?.lunes?.exercises || [];
    const poleaEstrecho = lunesEx.find(e => e.id === 'lun-espalda-polea-estrecho');
    const bicepsPolea = lunesEx.find(e => e.id === 'lun-biceps-press-polea');
    const prCount = (state?.progressionHistory || []).length;
    const sessionsCount = (state?.history || []).length;
    const totalDoneSets = analytics?.perDay?.reduce((acc, d) => acc + (d.doneSets || 0), 0) || 0;
    const sundayUsed =
      (state?.schedule?.domingo?.exercises?.length || 0) > 0 ||
      (state?.history || []).some(h => h.dayId === 'domingo' || /domingo/i.test(h.dayName || ''));
    const waterMl = state?.nutrition?.waterMl || 0;

    return [
      {
        id: 'badge_dorsal_lvl6',
        icon: '🦍',
        title: 'Dominador Dorsal Nivel 6+',
        desc: 'Mantén o supera el Nivel 6 en Jalón al pecho agarre estrecho (4×12).',
        unlocked: Boolean(poleaEstrecho && Number(poleaEstrecho.loadValue) >= 6),
        progressText: poleaEstrecho ? `Actual: Nivel ${poleaEstrecho.loadValue}` : 'Base Lunes'
      },
      {
        id: 'badge_biceps_10kg',
        icon: '💪',
        title: 'Maestro del Bíceps en Polea',
        desc: 'Domina el curl/press de bíceps en polea con 10 kg o más en 4×12.',
        unlocked: Boolean(bicepsPolea && Number(bicepsPolea.loadValue) >= 10),
        progressText: bicepsPolea ? `Actual: ${bicepsPolea.loadValue} kg` : 'Base Lunes'
      },
      {
        id: 'badge_active_sets',
        icon: '⚡',
        title: 'Fuego Bajo Tensión (TUT)',
        desc: 'Completa al menos 4 series efectivas dentro de tu semana activa.',
        unlocked: totalDoneSets >= 4 || sessionsCount >= 1,
        progressText: `${totalDoneSets} series listas`
      },
      {
        id: 'badge_pr_breaker',
        icon: '📈',
        title: 'Rompedor de Récords (Sobrecarga)',
        desc: 'Registra al menos 1 subida de peso o nivel en tu historial de PRs.',
        unlocked: prCount >= 1,
        progressText: `${prCount} PRs registrados`
      },
      {
        id: 'badge_sunday_tactician',
        icon: '🔄',
        title: 'Estratega Dominical',
        desc: 'Usa el comodín de reprogramación al Domingo para no perder ningún entreno.',
        unlocked: sundayUsed,
        progressText: sundayUsed ? 'Comodín Dominical Activo' : 'Listo para usar'
      },
      {
        id: 'badge_hydration_tank',
        icon: '💧',
        title: 'Atleta Hidratado & Constante',
        desc: 'Registra al menos 1 sesión en el historial o alcanza 2000 ml de hidratación.',
        unlocked: sessionsCount >= 1 || waterMl >= 2000,
        progressText: `${sessionsCount} sesiones · ${waterMl} ml`
      }
    ];
  }

  function buildConsistencyHeatmap(state, analytics) {
    const historyDates = new Set(
      (state?.history || []).map(h => {
        try {
          return new Date(h.dateISO).toISOString().slice(0, 10);
        } catch (_) {
          return '';
        }
      })
    );

    const cells = [];
    const today = new Date();
    let activeDaysCount = 0;

    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const isoDay = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
      const loggedInHistory = historyDates.has(isoDay);

      // Si es la semana actual (últimos 6 días), reflejar también las series completadas en el tablero
      let level = 0;
      if (loggedInHistory) {
        level = 3;
      } else if (i === 0 && (analytics?.completedWeeklyVolumeKg || 0) > 0) {
        level = 2;
      } else if (i <= 5 && (state?.progressionHistory || []).length > 0 && i % 2 === 0) {
        level = 1;
      }

      if (level > 0) activeDaysCount += 1;
      cells.push({
        isoDay,
        dayLabel,
        level, // 0: descanso/sin registro, 1: ligero, 2: activo, 3: sesión completa
        isToday: i === 0
      });
    }

    const streakWeeks = Math.max(1, Math.ceil(((state?.history || []).length + 1) / 3));
    return {
      cells,
      activeDaysCount,
      streakWeeks
    };
  }

  // Módulo Legend 1: Semáforo de Recuperación Muscular (24h/48h/72h) y Readiness Score
  function calculateReadinessAndMuscleRecovery(state, analytics) {
    const readiness = state?.readiness || { sleepHours: 7.5, energyLevel: 4, domsLevel: 2 };
    const sleep = Math.max(3, Math.min(12, Number(readiness.sleepHours) || 7.5));
    const energy = Math.max(1, Math.min(5, Number(readiness.energyLevel) || 4));
    const doms = Math.max(1, Math.min(5, Number(readiness.domsLevel) || 2));

    // Puntuación sobre 100: Sueño (hasta 45 pts), Energía SNC (hasta 35 pts), Agujetas/DOMS inverso (hasta 20 pts)
    const sleepScore = Math.min(45, Math.round((sleep / 8) * 45));
    const energyScore = Math.round((energy / 5) * 35);
    const domsScore = Math.round(((6 - doms) / 5) * 20);
    const readinessScore = Math.max(15, Math.min(100, sleepScore + energyScore + domsScore));

    let statusBadge = '🟢 Óptimo para Récords (80–100%)';
    let statusClass = 'readiness-high';
    let recommendation = 'Sistema nervioso fresco. Busca RIR 1 en tu última serie o aplica subida de carga si completas 4×12.';

    if (readinessScore < 60) {
      statusBadge = '🔴 Fatiga Acumulada (<60%)';
      statusClass = 'readiness-low';
      recommendation = 'Prioriza técnica estricta a RIR 3, añade +15s de descanso entre series o activa el 🛡️ Modo Descarga.';
    } else if (readinessScore < 80) {
      statusBadge = '🟡 Disposición Estándar (60–79%)';
      statusClass = 'readiness-med';
      recommendation = 'Cumple tu volumen programado de 4 series × 12 reps manteniendo RIR 2 controlado.';
    }

    const muscleMap = analytics?.muscleMap || {};
    const muscleRecoveryList = Object.entries(muscleMap).map(([groupName, info]) => {
      const doneRatio = info.sets > 0 ? info.completedSets / info.sets : 0;
      // Si se completaron series de este grupo en el día/semana actual, reflejar fatiga aguda y ventana de supercompensación
      const domsPenalty = (doms - 1) * 6;
      const rawRecovery = Math.round(100 - doneRatio * 55 - domsPenalty);
      const recoveryPct = Math.max(25, Math.min(100, rawRecovery));

      let stateLabel = '🟢 Fresco (Listo para atacar)';
      let stateColor = '#10b981';
      let restWindow = '0h restantes';

      if (recoveryPct < 55) {
        stateLabel = '🔴 En Reparación Aguda (Ventana 48–72h)';
        stateColor = '#ef4444';
        restWindow = '48h sugeridas';
      } else if (recoveryPct < 82) {
        stateLabel = '🟡 Supercompensando (Ventana 24h)';
        stateColor = '#f59e0b';
        restWindow = '24h sugeridas';
      }

      return {
        groupName,
        completedSets: info.completedSets,
        targetSets: info.sets,
        recoveryPct,
        stateLabel,
        stateColor,
        restWindow
      };
    });

    return {
      readinessScore,
      sleepHours: sleep,
      energyLevel: energy,
      domsLevel: doms,
      statusBadge,
      statusClass,
      recommendation,
      muscleRecoveryList
    };
  }

  // Módulo Legend 3: Generador de Reporte Completo en CSV (Compatible con Excel UTF-8 BOM)
  function escapeCsvCell(val) {
    const str = String(val ?? '').replace(/\r?\n/g, ' ').trim();
    if (str.includes(',') || str.includes('"') || str.includes(';')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function generateCsvReportContent(state, daysOrder = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']) {
    const rows = [];
    rows.push(['REPORTE OFICIAL GYM RUTINAS PRO - PLANIFICADOR 4x12']);
    rows.push(['Fecha Exportacion', new Date().toISOString(), 'Plantilla Activa', state?.activeTemplate || 'default_ppl']);
    rows.push([]);

    // 1. Rutina Semanal y Marcas Configuradas
    rows.push(['1. RUTINA SEMANAL Y MARCAS CONFIGURADAS']);
    rows.push(['Dia', 'Enfoque', 'Ejercicio', 'Musculo', 'Equipo', 'Tipo Carga', 'Valor Carga', 'Series', 'Reps', 'Series Completadas', 'Modo Serie', 'RIR', '1RM Estimado (kg)', 'Marca Base Usuario']);

    for (const dayKey of daysOrder) {
      const day = state?.schedule?.[dayKey];
      if (!day) continue;
      if (!day.exercises || day.exercises.length === 0) {
        rows.push([day.dayName, day.title, 'Descanso / Sin ejercicios', '-', '-', '-', 0, 0, 0, 0, '-', '-', 0, 'No']);
        continue;
      }
      for (const ex of day.exercises) {
        const doneCount = (ex.completedSets || []).filter(Boolean).length;
        const e1rm = calculateE1RM(ex.loadType, ex.loadValue, ex.reps);
        rows.push([
          day.dayName,
          day.title,
          ex.name,
          ex.muscle,
          ex.equipment,
          ex.loadType === 'nivel' ? 'Nivel Polea' : 'Kilogramos (kg)',
          ex.loadValue,
          ex.sets || 4,
          ex.reps || 12,
          `${doneCount}/${ex.sets || 4}`,
          ex.setMode || 'normal',
          ex.targetRir || 'RIR 2',
          e1rm,
          ex.userBase ? 'SI (Marca Base)' : 'No'
        ]);
      }
    }

    rows.push([]);
    // 2. Historial de Sesiones + Bitácora de Sensaciones
    rows.push(['2. HISTORIAL DE SESIONES Y BITACORA DE SENSACIONES']);
    rows.push(['Fecha ISO', 'Dia', 'Rutina', 'Series Hechas', 'Series Planeadas', 'Volumen (kg)', 'Duracion', 'Bitacora / Sensaciones']);
    for (const h of state?.history || []) {
      rows.push([
        h.dateISO,
        h.dayName,
        h.title,
        h.setsDone,
        h.setsPlanned,
        h.volumeKg,
        h.durationText || '-',
        h.sessionNote || 'Sin nota adicional'
      ]);
    }

    rows.push([]);
    // 3. Historial de Sobrecarga Progresiva (PRs)
    rows.push(['3. HISTORIAL DE SOBRECARGA PROGRESIVA (RECORDS / 1RM)']);
    rows.push(['Fecha ISO', 'Dia', 'Ejercicio', 'Carga Anterior', 'Nueva Carga', '1RM Estimado (kg)']);
    for (const pr of state?.progressionHistory || []) {
      rows.push([
        pr.dateISO,
        pr.dayName,
        pr.exerciseName,
        pr.prevLabel,
        pr.unitLabel,
        pr.e1rmKg
      ]);
    }

    rows.push([]);
    // 4. Registro Corporal Antropométrico
    rows.push(['4. REGISTRO CORPORAL ANTROPOMETRICO']);
    rows.push(['Fecha ISO', 'Peso (kg)', '% Grasa', 'Biceps (cm)', 'Pecho/Espalda (cm)', 'Cintura (cm)']);
    for (const bm of state?.bodyMetrics || []) {
      rows.push([
        bm.dateISO,
        bm.weightKg,
        bm.fatPct,
        bm.bicepsCm,
        bm.chestCm,
        bm.waistCm
      ]);
    }

    const csvBody = rows.map(r => r.map(escapeCsvCell).join(',')).join('\r\n');
    return '\uFEFF' + csvBody;
  }

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
    calculateNutritionPlan,
    EXERCISE_ALTERNATIVES_MAP,
    getExerciseAlternatives,
    calculatePersonalizedExercise,
    generatePersonalizedSchedule,
    accommodateMissedDay,
    evaluateAchievements,
    buildConsistencyHeatmap,
    calculateReadinessAndMuscleRecovery,
    REPS_PRESETS,
    formatExerciseRepsSummary,
    getExerciseSetReps,
    generateCsvReportContent,
    computeAnalytics
  };
});

