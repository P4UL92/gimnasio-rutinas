(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GYM_VISUALS = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Clasifica cada ejercicio por su patrón biomecánico para generar su ilustración animada SVG
  function detectExerciseAnimationType(exercise) {
    const id = (exercise.id || '').toLowerCase();
    const name = (exercise.name || '').toLowerCase();

    if (id.includes('polea-estrecho') || name.includes('agarre estrecho') || name.includes('remo')) {
      return 'pulley-narrow-back';
    }
    if (id.includes('maquina-amplio') || name.includes('agarre amplio') || name.includes('pull-over')) {
      return 'machine-wide-back';
    }
    if (id.includes('biceps') || name.includes('bíceps') || name.includes('curl martillo')) {
      return 'cable-bicep-curl';
    }
    if (name.includes('pecho') || name.includes('inclinado') || name.includes('apertura') || name.includes('cruces')) {
      return 'chest-press';
    }
    if (name.includes('tríceps') || name.includes('triceps') || name.includes('fondos')) {
      return 'tricep-pushdown';
    }
    if (name.includes('prensa') || name.includes('sentadilla') || name.includes('cuádriceps')) {
      return 'leg-press';
    }
    if (name.includes('hip thrust') || name.includes('peso muerto') || name.includes('femoral') || name.includes('abducción') || name.includes('aductores') || name.includes('talones') || name.includes('gemelos')) {
      return 'posterior-legs';
    }
    return 'shoulder-core';
  }

  // Mapeo de spritesheets rasterizados para cada ejercicio (Sin SVGs de animación)
  function getExerciseSpriteInfo(exercise) {
    const type = detectExerciseAnimationType(exercise);
    switch (type) {
      case 'pulley-narrow-back':
        return {
          spriteUrl: 'assets/sprites/gym_exercise_sprite_sheet_closegrip.jpg',
          label: 'POLEA ESTRECHA',
          cssModifier: 'sprite-pulley-narrow'
        };
      case 'machine-wide-back':
        return {
          spriteUrl: 'assets/sprites/gym_exercise_sprite_sheet_fullbody.jpg',
          label: 'AGARRE AMPLIO',
          cssModifier: 'sprite-machine-wide'
        };
      case 'cable-bicep-curl':
        return {
          spriteUrl: 'assets/sprites/gym_exercise_sprite_sheet_closegrip.jpg',
          label: 'CURL BÍCEPS',
          cssModifier: 'sprite-cable-bicep'
        };
      case 'chest-press':
        return {
          spriteUrl: 'assets/sprites/gym_exercise_sprite_sheet_chest_triceps.jpg',
          label: 'PRESS PECHO',
          cssModifier: 'sprite-chest-press'
        };
      case 'tricep-pushdown':
        return {
          spriteUrl: 'assets/sprites/gym_exercise_sprite_sheet_chest_triceps.jpg',
          label: 'TRÍCEPS CUERDA',
          cssModifier: 'sprite-tricep-pushdown'
        };
      case 'leg-press':
      case 'posterior-legs':
        return {
          spriteUrl: 'assets/sprites/gym_exercise_sprite_sheet_legs_shoulders.jpg',
          label: 'PRENSA PIERNAS',
          cssModifier: 'sprite-leg-press'
        };
      case 'shoulder-core':
      default:
        return {
          spriteUrl: 'assets/sprites/gym_exercise_sprite_sheet_legs_shoulders.jpg',
          label: 'PRESS HOMBRO',
          cssModifier: 'sprite-shoulder-press'
        };
    }
  }

  // Genera el contenedor de imagen/sprite rasterizado del ejercicio (Cero SVGs para animaciones)
  function renderExerciseSprite(exercise) {
    const info = getExerciseSpriteInfo(exercise);
    const loadLabel =
      exercise.loadType === 'nivel'
        ? `NIVEL ${exercise.loadValue}`
        : `${exercise.loadValue} KG`;

    return `
      <div class="exercise-sprite-box ${info.cssModifier}" role="img" aria-label="Demostración visual del ejercicio ${exercise.name}">
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
    detectExerciseAnimationType,
    renderExerciseIllustrationSVG,
    renderExerciseSprite,
    renderAnatomyMapSVG,
    computeAnalytics
  };
});
