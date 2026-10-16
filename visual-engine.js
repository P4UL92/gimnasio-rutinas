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

  // Genera una ilustración SVG animada del ejercicio (máquina/polea + atleta + vector de fuerza)
  function renderExerciseIllustrationSVG(exercise) {
    const type = detectExerciseAnimationType(exercise);
    const loadLabel =
      exercise.loadType === 'nivel'
        ? `NIVEL ${exercise.loadValue}`
        : `${exercise.loadValue} KG`;

    switch (type) {
      case 'pulley-narrow-back':
        return `
          <svg class="ex-anim-svg" viewBox="0 0 180 120" width="180" height="120" aria-hidden="true">
            <rect x="8" y="8" width="164" height="104" rx="12" fill="#0d1526" stroke="#1e293b"/>
            <!-- Torre de Poleas Nivel 6 -->
            <rect x="24" y="18" width="26" height="84" rx="4" fill="#1e293b" stroke="#334155"/>
            <g class="anim-weight-stack">
              <rect x="27" y="58" width="20" height="6" rx="2" fill="#f59e0b"/>
              <rect x="27" y="66" width="20" height="6" rx="2" fill="#10b981"/>
              <rect x="27" y="74" width="20" height="6" rx="2" fill="#334155"/>
            </g>
            <circle cx="37" cy="24" r="5" fill="#10b981"/>
            <!-- Cable y Agarre Estrecho -->
            <line x1="42" y1="24" x2="108" y2="54" stroke="#34d399" stroke-width="2" stroke-dasharray="3 2" class="anim-cable-line"/>
            <!-- Atleta traccionando espalda -->
            <circle cx="126" cy="36" r="9" fill="#94a3b8"/>
            <path d="M126 46 L122 82 L102 98" stroke="#64748b" stroke-width="6" stroke-linecap="round" fill="none"/>
            <!-- Músculo Dorsal Activo -->
            <ellipse cx="128" cy="62" rx="7" ry="13" fill="#10b981" class="anim-muscle-glow"/>
            <!-- Brazo en Tracción Estrecha -->
            <g class="anim-pull-arm">
              <path d="M124 50 L102 56 L114 64" stroke="#34d399" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              <polygon points="98,52 105,56 98,60" fill="#f59e0b"/>
            </g>
            <text x="162" y="26" text-anchor="end" fill="#fcd34d" font-size="9" font-weight="800">${loadLabel}</text>
            <text x="162" y="104" text-anchor="end" fill="#6ee7b7" font-size="8" font-weight="700">POLEA ESTRECHA</text>
          </svg>`;

      case 'machine-wide-back':
        return `
          <svg class="ex-anim-svg" viewBox="0 0 180 120" width="180" height="120" aria-hidden="true">
            <rect x="8" y="8" width="164" height="104" rx="12" fill="#0d1526" stroke="#1e293b"/>
            <!-- Marco de Máquina Agarre Amplio -->
            <path d="M40 96 L40 20 L140 20 L140 96" stroke="#334155" stroke-width="4" fill="none"/>
            <!-- Barra Amplia Animada -->
            <g class="anim-vertical-pull">
              <line x1="52" y1="32" x2="128" y2="32" stroke="#06b6d4" stroke-width="4" stroke-linecap="round"/>
              <line x1="52" y1="32" x2="66" y2="54" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
              <line x1="128" y1="32" x2="114" y2="54" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/>
            </g>
            <!-- Silueta Dorsal en V -->
            <circle cx="90" cy="48" r="8" fill="#94a3b8"/>
            <polygon points="70,58 110,58 98,90 82,90" fill="#10b981" class="anim-muscle-glow"/>
            <text x="90" y="106" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="800">AGARRE AMPLIO · ${loadLabel}</text>
          </svg>`;

      case 'cable-bicep-curl':
        return `
          <svg class="ex-anim-svg" viewBox="0 0 180 120" width="180" height="120" aria-hidden="true">
            <rect x="8" y="8" width="164" height="104" rx="12" fill="#0d1526" stroke="#1e293b"/>
            <!-- Polea Baja -->
            <rect x="26" y="22" width="18" height="76" rx="3" fill="#1e293b" stroke="#334155"/>
            <circle cx="35" cy="90" r="5" fill="#06b6d4"/>
            <line x1="40" y1="90" x2="92" y2="62" stroke="#38bdf8" stroke-width="2" stroke-dasharray="3 2"/>
            <!-- Torso y Bíceps Activo -->
            <circle cx="118" cy="30" r="9" fill="#94a3b8"/>
            <line x1="118" y1="40" x2="118" y2="92" stroke="#64748b" stroke-width="8" stroke-linecap="round"/>
            <!-- Bíceps Iluminado -->
            <circle cx="107" cy="56" r="7" fill="#10b981" class="anim-muscle-glow"/>
            <!-- Antebrazo animando el Curl -->
            <g class="anim-curl-forearm">
              <line x1="108" y1="62" x2="86" y2="48" stroke="#34d399" stroke-width="5" stroke-linecap="round"/>
              <circle cx="84" cy="47" r="4" fill="#f59e0b"/>
            </g>
            <text x="162" y="26" text-anchor="end" fill="#67e8f9" font-size="9" font-weight="800">${loadLabel}</text>
            <text x="162" y="104" text-anchor="end" fill="#6ee7b7" font-size="8" font-weight="700">CURL POLEA</text>
          </svg>`;

      case 'chest-press':
        return `
          <svg class="ex-anim-svg" viewBox="0 0 180 120" width="180" height="120" aria-hidden="true">
            <rect x="8" y="8" width="164" height="104" rx="12" fill="#0d1526" stroke="#1e293b"/>
            <!-- Respaldo y Máquina de Pecho -->
            <line x1="54" y1="26" x2="54" y2="94" stroke="#475569" stroke-width="6" stroke-linecap="round"/>
            <circle cx="70" cy="36" r="8" fill="#94a3b8"/>
            <!-- Pectoral Activo -->
            <ellipse cx="76" cy="56" rx="9" ry="11" fill="#38bdf8" class="anim-muscle-glow"/>
            <!-- Brazo de Empuje Horizontal -->
            <g class="anim-push-arm">
              <line x1="74" y1="54" x2="124" y2="54" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>
              <rect x="122" y="42" width="10" height="24" rx="3" fill="#10b981"/>
            </g>
            <text x="162" y="26" text-anchor="end" fill="#38bdf8" font-size="9" font-weight="800">${loadLabel}</text>
            <text x="162" y="104" text-anchor="end" fill="#bae6fd" font-size="8" font-weight="700">EMPUJE PECHO</text>
          </svg>`;

      case 'tricep-pushdown':
        return `
          <svg class="ex-anim-svg" viewBox="0 0 180 120" width="180" height="120" aria-hidden="true">
            <rect x="8" y="8" width="164" height="104" rx="12" fill="#0d1526" stroke="#1e293b"/>
            <rect x="30" y="18" width="18" height="82" rx="3" fill="#1e293b" stroke="#334155"/>
            <circle cx="39" cy="24" r="5" fill="#38bdf8"/>
            <line x1="44" y1="24" x2="90" y2="66" stroke="#38bdf8" stroke-width="2" stroke-dasharray="3 2"/>
            <circle cx="114" cy="30" r="8" fill="#94a3b8"/>
            <line x1="114" y1="40" x2="114" y2="92" stroke="#64748b" stroke-width="8" stroke-linecap="round"/>
            <!-- Tríceps Activo -->
            <ellipse cx="118" cy="54" rx="6" ry="10" fill="#38bdf8" class="anim-muscle-glow"/>
            <g class="anim-vertical-pull">
              <line x1="110" y1="56" x2="90" y2="76" stroke="#10b981" stroke-width="5" stroke-linecap="round"/>
              <circle cx="88" cy="78" r="4" fill="#f59e0b"/>
            </g>
            <text x="162" y="26" text-anchor="end" fill="#38bdf8" font-size="9" font-weight="800">${loadLabel}</text>
            <text x="162" y="104" text-anchor="end" fill="#6ee7b7" font-size="8" font-weight="700">EXTENSIÓN TRÍCEPS</text>
          </svg>`;

      case 'leg-press':
        return `
          <svg class="ex-anim-svg" viewBox="0 0 180 120" width="180" height="120" aria-hidden="true">
            <rect x="8" y="8" width="164" height="104" rx="12" fill="#0d1526" stroke="#1e293b"/>
            <!-- Riel de Prensa 45° -->
            <line x1="36" y1="88" x2="142" y2="28" stroke="#334155" stroke-width="4"/>
            <!-- Cuádriceps Activo -->
            <path d="M52 82 L82 58 L104 68" stroke="#f59e0b" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none" class="anim-muscle-glow"/>
            <!-- Plataforma de Prensa Animada -->
            <g class="anim-push-arm">
              <line x1="102" y1="36" x2="122" y2="68" stroke="#10b981" stroke-width="6" stroke-linecap="round"/>
              <circle cx="120" cy="44" r="9" fill="#f59e0b"/>
            </g>
            <text x="162" y="26" text-anchor="end" fill="#fcd34d" font-size="9" font-weight="800">${loadLabel}</text>
            <text x="162" y="104" text-anchor="end" fill="#fde68a" font-size="8" font-weight="700">FUERZA PIERNA</text>
          </svg>`;

      case 'posterior-legs':
        return `
          <svg class="ex-anim-svg" viewBox="0 0 180 120" width="180" height="120" aria-hidden="true">
            <rect x="8" y="8" width="164" height="104" rx="12" fill="#0d1526" stroke="#1e293b"/>
            <!-- Banco de Hip Thrust / Femoral -->
            <rect x="30" y="64" width="34" height="28" rx="4" fill="#334155"/>
            <g class="anim-vertical-pull">
              <path d="M46 62 L92 54 L126 88" stroke="#f43f5e" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              <circle cx="90" cy="50" r="8" fill="#10b981"/>
            </g>
            <circle cx="88" cy="58" r="10" fill="#f43f5e" opacity="0.45" class="anim-muscle-glow"/>
            <text x="162" y="26" text-anchor="end" fill="#fda4af" font-size="9" font-weight="800">${loadLabel}</text>
            <text x="162" y="104" text-anchor="end" fill="#fda4af" font-size="8" font-weight="700">GLÚTEO · FEMORAL</text>
          </svg>`;

      default:
        return `
          <svg class="ex-anim-svg" viewBox="0 0 180 120" width="180" height="120" aria-hidden="true">
            <rect x="8" y="8" width="164" height="104" rx="12" fill="#0d1526" stroke="#1e293b"/>
            <circle cx="90" cy="52" r="9" fill="#94a3b8"/>
            <rect x="76" y="62" width="28" height="32" rx="6" fill="#475569"/>
            <!-- Deltoides Iluminados -->
            <circle cx="72" cy="64" r="7" fill="#a855f7" class="anim-muscle-glow"/>
            <circle cx="108" cy="64" r="7" fill="#a855f7" class="anim-muscle-glow"/>
            <!-- Press de Hombros Animado -->
            <g class="anim-vertical-pull">
              <line x1="56" y1="36" x2="124" y2="36" stroke="#c084fc" stroke-width="4" stroke-linecap="round"/>
              <rect x="50" y="28" width="8" height="16" rx="2" fill="#10b981"/>
              <rect x="122" y="28" width="8" height="16" rx="2" fill="#10b981"/>
            </g>
            <text x="162" y="26" text-anchor="end" fill="#d8b4fe" font-size="9" font-weight="800">${loadLabel}</text>
            <text x="162" y="104" text-anchor="end" fill="#d8b4fe" font-size="8" font-weight="700">HOMBRO · CORE</text>
          </svg>`;
    }
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
    renderAnatomyMapSVG,
    computeAnalytics
  };
});
