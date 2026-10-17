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
      <div class="exercise-sprite-box ${info.cssModifier}" data-sprite-type="${detectExerciseAnimationType(exercise)}" role="img" aria-label="Demostración visual del ejercicio ${exercise.name}">
        <div class="exercise-sprite-frame" style="background-image: url('${info.spriteUrl}');"></div>
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

  // Renderiza el Mapa Anatómico Corporal Dual (Vista Frontal + Vista Posterior)
  function renderAnatomyMapSVG(day) {
    const z = getActiveAnatomyZones(day);
    const active = flag => (flag ? 'muscle-zone is-active' : 'muscle-zone');

    return `
      <div class="anatomy-figures-grid">
        <figure class="anatomy-figure">
          <figcaption>Vista Frontal</figcaption>
          <svg viewBox="0 0 140 240" width="140" height="240" role="img" aria-label="Mapa anatómico frontal de músculos activos">
            <!-- Cabeza y cuello -->
            <circle cx="70" cy="24" r="14" class="body-base"/>
            <rect x="64" y="38" width="12" height="10" rx="3" class="body-base"/>
            <!-- Hombros (Deltoides) -->
            <ellipse cx="42" cy="58" rx="10" ry="12" class="${active(z.shoulders)}"/>
            <ellipse cx="98" cy="58" rx="10" ry="12" class="${active(z.shoulders)}"/>
            <!-- Pectorales -->
            <path d="M50 48 Q70 52 90 48 L88 74 Q70 78 52 74 Z" class="${active(z.chest)}"/>
            <!-- Bíceps -->
            <rect x="30" y="70" width="11" height="28" rx="5" class="${active(z.biceps)}"/>
            <rect x="99" y="70" width="11" height="28" rx="5" class="${active(z.biceps)}"/>
            <!-- Antebrazos -->
            <rect x="26" y="100" width="10" height="26" rx="4" class="body-base"/>
            <rect x="104" y="100" width="10" height="26" rx="4" class="body-base"/>
            <!-- Core / Abdomen -->
            <rect x="54" y="76" width="32" height="42" rx="6" class="${active(z.core)}"/>
            <!-- Cuádriceps -->
            <rect x="48" y="122" width="19" height="52" rx="8" class="${active(z.quads)}"/>
            <rect x="73" y="122" width="19" height="52" rx="8" class="${active(z.quads)}"/>
            <!-- Pantorrillas / Tibiales -->
            <rect x="50" y="178" width="15" height="44" rx="6" class="${active(z.calves)}"/>
            <rect x="75" y="178" width="15" height="44" rx="6" class="${active(z.calves)}"/>
          </svg>
        </figure>

        <figure class="anatomy-figure">
          <figcaption>Vista Posterior (Espalda)</figcaption>
          <svg viewBox="0 0 140 240" width="140" height="240" role="img" aria-label="Mapa anatómico posterior de espalda y piernas">
            <circle cx="70" cy="24" r="14" class="body-base"/>
            <!-- Trapecio y Deltoides Posterior -->
            <polygon points="50,44 90,44 82,64 58,64" class="${active(z.traps)}"/>
            <ellipse cx="42" cy="58" rx="10" ry="12" class="${active(z.shoulders)}"/>
            <ellipse cx="98" cy="58" rx="10" ry="12" class="${active(z.shoulders)}"/>
            <!-- Dorsal Ancho y Espalda Media -->
            <polygon points="46,60 94,60 84,108 56,108" class="${active(z.lats)}"/>
            <!-- Tríceps -->
            <rect x="30" y="70" width="11" height="28" rx="5" class="${active(z.triceps)}"/>
            <rect x="99" y="70" width="11" height="28" rx="5" class="${active(z.triceps)}"/>
            <!-- Glúteos -->
            <rect x="48" y="110" width="44" height="24" rx="10" class="${active(z.glutesHams)}"/>
            <!-- Isquiotibiales (Femoral) -->
            <rect x="49" y="136" width="18" height="40" rx="7" class="${active(z.glutesHams)}"/>
            <rect x="73" y="136" width="18" height="40" rx="7" class="${active(z.glutesHams)}"/>
            <!-- Gemelos / Sóleo -->
            <rect x="50" y="178" width="15" height="44" rx="6" class="${active(z.calves)}"/>
            <rect x="75" y="178" width="15" height="44" rx="6" class="${active(z.calves)}"/>
          </svg>
        </figure>
      </div>
    `;
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

  return {
    EXERCISE_SPRITE_CATALOG,
    detectExerciseAnimationType,
    getExerciseSpriteInfo,
    renderExerciseIllustrationSVG,
    renderExerciseSprite,
    renderAnatomyMapSVG,
    computeAnalytics
  };
});
