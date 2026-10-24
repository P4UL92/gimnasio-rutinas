(function () {
  'use strict';

  const STORAGE_KEY = 'gym_rutinas_pro_state_v1';
  const GYM_DATA = window.GYM_DATA;
  const GYM_VISUALS = window.GYM_VISUALS;
  if (!GYM_DATA) {
    throw new Error('GYM_DATA no cargado. Asegúrate de incluir routines-data.js antes de app.js');
  }

  const DAYS_ORDER = GYM_DATA.DAYS_ORDER;

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function createInitialState() {
    const schedule = deepClone(GYM_DATA.INITIAL_SCHEDULE);
    for (const dayKey of DAYS_ORDER) {
      const day = schedule[dayKey];
      day.exercises = (day.exercises || []).map(ex => ({
        ...ex,
        setMode: ex.setMode || 'normal',
        targetRir: ex.targetRir || 'RIR 2',
        completedSets: Array.from({ length: ex.sets || 4 }, () => false)
      }));
    }
    return {
      version: 5,
      selectedDay: detectDefaultDay(),
      activeScreen: 'plan',
      activeExerciseIndex: 0,
      searchQuery: '',
      animationsPaused: false,
      wakeLockEnabled: false,
      voiceCoachEnabled: false,
      deloadModeActive: false,
      activeTemplate: 'default_ppl',
      nutrition: {
        goal: 'hipertrofia',
        waterMl: 0,
        creatineTaken: false,
        postProteinTaken: false
      },
      readiness: {
        sleepHours: 7.5,
        energyLevel: 4,
        domsLevel: 2
      },
      journalNotesByDay: {},
      warmupByDay: {},
      progressionHistory: [],
      bodyMetrics: [],
      history: [],
      userProfile: {
        configured: false,
        name: 'Atleta',
        gender: 'male',
        age: 28,
        weightKg: 75,
        heightCm: 175,
        fitnessLevel: 'intermediate',
        primaryGoal: 'hypertrophy',
        daysPerWeek: 6,
        limitations: 'none',
        updatedAt: null
      },
      schedule
    };
  }

  function detectDefaultDay() {
    const jsDay = new Date().getDay();
    const map = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    return map[jsDay] || 'lunes';
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createInitialState();
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.schedule || !parsed.schedule.lunes) {
        return createInitialState();
      }
      for (const dayKey of DAYS_ORDER) {
        if (!parsed.schedule[dayKey]) {
          parsed.schedule[dayKey] = deepClone(GYM_DATA.INITIAL_SCHEDULE[dayKey]);
        }
        for (const ex of parsed.schedule[dayKey].exercises) {
          const targetSets = Number(ex.sets) || 4;
          if (!ex.setMode) ex.setMode = 'normal';
          if (!ex.targetRir) ex.targetRir = 'RIR 2';
          if (!Array.isArray(ex.completedSets) || ex.completedSets.length !== targetSets) {
            ex.completedSets = Array.from({ length: targetSets }, (_, idx) =>
              Boolean(ex.completedSets && ex.completedSets[idx])
            );
          }
        }
      }
      if (!DAYS_ORDER.includes(parsed.selectedDay)) {
        parsed.selectedDay = 'lunes';
      }
      if (!Array.isArray(parsed.history)) {
        parsed.history = [];
      }
      if (!Array.isArray(parsed.progressionHistory)) {
        parsed.progressionHistory = [];
      }
      if (!Array.isArray(parsed.bodyMetrics)) {
        parsed.bodyMetrics = [];
      }
      if (!parsed.warmupByDay || typeof parsed.warmupByDay !== 'object') {
        parsed.warmupByDay = {};
      }
      if (!parsed.activeTemplate) {
        parsed.activeTemplate = 'default_ppl';
      }
      if (typeof parsed.deloadModeActive !== 'boolean') {
        parsed.deloadModeActive = false;
      }
      if (!parsed.nutrition || typeof parsed.nutrition !== 'object') {
        parsed.nutrition = {
          goal: 'hipertrofia',
          waterMl: 0,
          creatineTaken: false,
          postProteinTaken: false
        };
      }
      if (!parsed.readiness || typeof parsed.readiness !== 'object') {
        parsed.readiness = {
          sleepHours: 7.5,
          energyLevel: 4,
          domsLevel: 2
        };
      }
      if (!parsed.journalNotesByDay || typeof parsed.journalNotesByDay !== 'object') {
        parsed.journalNotesByDay = {};
      }
      if (!['plan', 'workout', 'stats', 'hub'].includes(parsed.activeScreen)) {
        parsed.activeScreen = 'plan';
      }
      if (typeof parsed.activeExerciseIndex !== 'number' || parsed.activeExerciseIndex < 0) {
        parsed.activeExerciseIndex = 0;
      }
      if (!parsed.userProfile || typeof parsed.userProfile !== 'object') {
        parsed.userProfile = {
          configured: false,
          name: 'Atleta',
          gender: 'male',
          age: 28,
          weightKg: 75,
          heightCm: 175,
          fitnessLevel: 'intermediate',
          primaryGoal: 'hypertrophy',
          daysPerWeek: 6,
          limitations: 'none',
          updatedAt: null
        };
      }
      parsed.searchQuery = '';
      return parsed;
    } catch (_) {
      return createInitialState();
    }
  }

  let state = loadState();
  let restTimerInterval = null;
  let restTotalSeconds = 75;
  let restRemainingSeconds = 0;
  let wakeLockSentinel = null;

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      // Ignore storage quota errors
    }
  }

  // Cronómetro General de Sesión y Cronómetro TUT de Serie
  const stopwatchState = {
    running: false,
    startTime: 0,
    accumulatedMs: 0,
    intervalId: null,
    laps: []
  };

  const tutState = {
    activeDayId: null,
    activeExerciseId: null,
    startTime: 0,
    intervalId: null,
    elapsedSeconds: 0,
    lastSpokenSecond: -1
  };

  let currentFloatingTimerMode = 'rest'; // 'rest' | 'stopwatch'

  function speakCoachMessage(text) {
    if (!state.voiceCoachEnabled) return;
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function') {
        window.speechSynthesis.cancel();
        const utter = new window.SpeechSynthesisUtterance(text);
        utter.lang = 'es-ES';
        utter.rate = 1.08;
        window.speechSynthesis.speak(utter);
      }
    } catch (_) {
      // Ignore TTS errors in headless or unsupported environments
    }
  }

  function toggleVoiceCoach(forceState) {
    const nextState = typeof forceState === 'boolean' ? forceState : !state.voiceCoachEnabled;
    state.voiceCoachEnabled = nextState;
    saveState();

    const btnVoice = document.getElementById('btn-toggle-voice-coach');
    if (btnVoice) {
      btnVoice.setAttribute('aria-pressed', state.voiceCoachEnabled ? 'true' : 'false');
      btnVoice.textContent = state.voiceCoachEnabled ? '🔊 Coach Activo (3-1-1)' : '🔊 Coach Voz / Cadencia';
    }
    if (state.voiceCoachEnabled) {
      speakCoachMessage('Entrenador de voz y metrónomo de cadencia activados.');
      showCelebrationToast('🔊 Coach de Voz y Cadencia 3-1-1 activados');
    }
    return state.voiceCoachEnabled;
  }

  function formatStopwatchTime(totalMs) {
    const totalSec = Math.floor(totalMs / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function formatStopwatchDurationText(totalMs) {
    const totalSec = Math.floor(totalMs / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }

  function getStopwatchElapsedMs() {
    if (!stopwatchState.running) return stopwatchState.accumulatedMs;
    return stopwatchState.accumulatedMs + (Date.now() - stopwatchState.startTime);
  }

  function updateStopwatchDisplays() {
    const elapsedMs = getStopwatchElapsedMs();
    const formatted = formatStopwatchTime(elapsedMs);

    const mainDigitsEl = document.getElementById('session-stopwatch-digits');
    if (mainDigitsEl) mainDigitsEl.textContent = formatted;

    const compactDigitsEl = document.getElementById('compact-stopwatch-digits');
    if (compactDigitsEl) compactDigitsEl.textContent = formatted;

    const focusDigitsEl = document.getElementById('focus-stopwatch-display');
    if (focusDigitsEl) focusDigitsEl.textContent = formatted;

    const floatDigitsEl = document.getElementById('floating-stopwatch-digits');
    if (floatDigitsEl) floatDigitsEl.textContent = formatted;

    const dotEl = document.getElementById('stopwatch-pulse-dot');
    if (dotEl) {
      dotEl.classList.toggle('is-running', stopwatchState.running);
    }

    const focusDotEl = document.getElementById('focus-clock-dot');
    if (focusDotEl) {
      focusDotEl.classList.toggle('is-running', stopwatchState.running);
    }

    const toggleBtn = document.getElementById('btn-stopwatch-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = stopwatchState.running ? '⏸ Pausar' : '▶ Iniciar';
      toggleBtn.classList.toggle('is-active', stopwatchState.running);
    }

    const focusClockBtn = document.getElementById('btn-focus-clock-toggle');
    if (focusClockBtn) {
      focusClockBtn.textContent = stopwatchState.running ? '⏸' : '▶';
    }

    const floatToggleBtn = document.getElementById('btn-floating-stopwatch-toggle');
    if (floatToggleBtn) {
      floatToggleBtn.textContent = stopwatchState.running ? 'Pausa' : 'Seguir';
    }

    const lapBtn = document.getElementById('btn-stopwatch-lap');
    if (lapBtn) {
      lapBtn.disabled = !stopwatchState.running && elapsedMs === 0;
    }
  }

  function startSessionStopwatch() {
    if (stopwatchState.running) return;
    stopwatchState.running = true;
    stopwatchState.startTime = Date.now();
    if (stopwatchState.intervalId) clearInterval(stopwatchState.intervalId);
    stopwatchState.intervalId = setInterval(updateStopwatchDisplays, 250);
    updateStopwatchDisplays();
  }

  function pauseSessionStopwatch() {
    if (!stopwatchState.running) return;
    stopwatchState.accumulatedMs += Date.now() - stopwatchState.startTime;
    stopwatchState.running = false;
    if (stopwatchState.intervalId) {
      clearInterval(stopwatchState.intervalId);
      stopwatchState.intervalId = null;
    }
    updateStopwatchDisplays();
  }

  function toggleSessionStopwatch() {
    if (stopwatchState.running) {
      pauseSessionStopwatch();
    } else {
      startSessionStopwatch();
    }
  }

  function resetSessionStopwatch() {
    if (stopwatchState.intervalId) {
      clearInterval(stopwatchState.intervalId);
      stopwatchState.intervalId = null;
    }
    stopwatchState.running = false;
    stopwatchState.startTime = 0;
    stopwatchState.accumulatedMs = 0;
    stopwatchState.laps = [];
    renderStopwatchLaps();
    updateStopwatchDisplays();
  }

  function lapSessionStopwatch() {
    const elapsedMs = getStopwatchElapsedMs();
    const lapTimeFormatted = formatStopwatchTime(elapsedMs);
    const lapNumber = stopwatchState.laps.length + 1;
    stopwatchState.laps.unshift({
      lapNumber,
      timeFormatted: lapTimeFormatted,
      totalMs: elapsedMs
    });
    renderStopwatchLaps();
    showCelebrationToast(`🚩 Vuelta ${lapNumber}: ${lapTimeFormatted}`);
  }

  function renderStopwatchLaps() {
    const drawer = document.getElementById('stopwatch-laps-drawer');
    const list = document.getElementById('stopwatch-laps-list');
    if (!drawer || !list) return;

    if (stopwatchState.laps.length === 0) {
      drawer.hidden = true;
      list.innerHTML = '';
      return;
    }

    drawer.hidden = false;
    list.innerHTML = '';
    for (const lap of stopwatchState.laps) {
      const li = document.createElement('li');
      li.className = 'lap-item';
      li.innerHTML = `<strong>Vuelta ${lap.lapNumber}</strong> <span>${lap.timeFormatted}</span>`;
      list.appendChild(li);
    }
  }

  function switchFloatingTimerMode(mode) {
    currentFloatingTimerMode = mode;
    const btnRest = document.getElementById('btn-mode-rest');
    const btnStopwatch = document.getElementById('btn-mode-stopwatch');
    const panelRest = document.getElementById('panel-timer-rest');
    const panelStopwatch = document.getElementById('panel-timer-stopwatch');
    const bar = document.getElementById('rest-timer-bar');

    if (btnRest) btnRest.classList.toggle('is-active', mode === 'rest');
    if (btnStopwatch) btnStopwatch.classList.toggle('is-active', mode === 'stopwatch');
    if (panelRest) panelRest.hidden = mode !== 'rest';
    if (panelStopwatch) panelStopwatch.hidden = mode !== 'stopwatch';
    if (bar) bar.hidden = false;

    if (mode === 'stopwatch') {
      updateStopwatchDisplays();
    }
  }

  function getCadencePhaseForSecond(elapsedSec) {
    const repNum = Math.min(12, Math.floor(elapsedSec / 5) + 1);
    const phaseSec = elapsedSec % 5;
    if (phaseSec < 3) {
      const label = `Fase Excéntrica (${3 - phaseSec}s)`;
      return { repNum, phaseLabel: label, text: label, phaseClass: 'phase-eccentric', shortCue: 'Controla bajada' };
    }
    if (phaseSec === 3) {
      const label = 'Contracción Isométrica (1s)';
      return { repNum, phaseLabel: label, text: label, phaseClass: 'phase-isometric', shortCue: 'Aprieta' };
    }
    const label = 'Subida Concéntrica (1s)';
    return { repNum, phaseLabel: label, text: label, phaseClass: 'phase-concentric', shortCue: 'Sube potente' };
  }

  function startTutStopwatch(dayId, exerciseId) {
    if (tutState.intervalId) {
      clearInterval(tutState.intervalId);
    }
    tutState.activeDayId = dayId;
    tutState.activeExerciseId = exerciseId;
    tutState.startTime = Date.now();
    tutState.elapsedSeconds = 0;
    tutState.lastSpokenSecond = -1;

    if (!stopwatchState.running) {
      startSessionStopwatch();
    }

    const day = state.schedule[dayId];
    const ex = day?.exercises?.find(e => e.id === exerciseId);
    if (ex) {
      speakCoachMessage(`Iniciando serie de ${ex.name}. Doce repeticiones, cadencia tres, uno, uno.`);
    }

    tutState.intervalId = setInterval(() => {
      tutState.elapsedSeconds = Math.floor((Date.now() - tutState.startTime) / 1000);
      updateTutButton(exerciseId);
    }, 250);

    renderExercisesList();
    showCelebrationToast('⏱️ Serie iniciada. Ejecuta tus 12 repeticiones (Cadencia 3-1-1)');
  }

  function stopTutStopwatch() {
    if (!tutState.activeExerciseId) return;
    const dayId = tutState.activeDayId || state.selectedDay;
    const exId = tutState.activeExerciseId;
    const finalSeconds = Math.max(1, Math.floor((Date.now() - tutState.startTime) / 1000));

    if (tutState.intervalId) {
      clearInterval(tutState.intervalId);
      tutState.intervalId = null;
    }
    tutState.activeExerciseId = null;
    tutState.activeDayId = null;
    tutState.elapsedSeconds = 0;

    const day = state.schedule[dayId];
    if (day) {
      const ex = day.exercises.find(e => e.id === exId);
      if (ex) {
        const nextIdx = (ex.completedSets || []).findIndex(done => !done);
        const setNumToComplete = nextIdx !== -1 ? nextIdx : (ex.completedSets.length - 1);
        ex.completedSets[setNumToComplete] = true;
        saveState();
        renderAll();
        showCelebrationToast(`✅ Serie ${setNumToComplete + 1} completada (${finalSeconds}s bajo tensión)`);
        playCompletionTone();
        speakCoachMessage(`Serie ${setNumToComplete + 1} completada en ${finalSeconds} segundos. Inicia descanso.`);
        startRestTimer(ex.restSeconds || 75, `${ex.name} (Serie ${setNumToComplete + 1}/${ex.sets} · TUT: ${finalSeconds}s)`);
        return;
      }
    }
    renderExercisesList();
  }

  function updateTutButton(exerciseId) {
    const btn = document.querySelector(`.btn-tut-stopwatch[data-exercise-id="${exerciseId}"]`);
    if (btn) {
      const mins = Math.floor(tutState.elapsedSeconds / 60);
      const secs = tutState.elapsedSeconds % 60;
      const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      btn.classList.add('is-timing');
      btn.innerHTML = `<span class="tut-icon">⏹️</span> Finalizar Serie (${timeStr})`;

      const statusSpan = btn.parentElement?.querySelector('.tut-status-text');
      if (statusSpan) {
        const cad = getCadencePhaseForSecond(tutState.elapsedSeconds);
        statusSpan.className = 'tut-status-text tut-cadence-banner';
        statusSpan.textContent = `🎵 Rep ~${cad.repNum}/12 · ${cad.phaseLabel}`;
      }
    }
  }

  function showCelebrationToast(message) {
    const toast = document.getElementById('celebration-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    setTimeout(() => {
      toast.hidden = true;
    }, 3200);
  }

  function triggerHaptic(pattern = [60]) {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch (_) {
      // Ignore vibration errors on unsupported environments
    }
  }

  function sendRestFinishedNotification(titleText, bodyText) {
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(titleText, {
          body: bodyText,
          icon: 'assets/icons/icon-192.png',
          silent: false
        });
      }
    } catch (_) {
      // Ignore notification errors in headless/WebView without permission
    }
  }

  async function toggleWakeLock(forceState) {
    const nextState = typeof forceState === 'boolean' ? forceState : !state.wakeLockEnabled;
    state.wakeLockEnabled = nextState;

    try {
      if (nextState && typeof navigator !== 'undefined' && navigator.wakeLock && typeof navigator.wakeLock.request === 'function') {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
      } else if (!nextState && wakeLockSentinel && typeof wakeLockSentinel.release === 'function') {
        await wakeLockSentinel.release();
        wakeLockSentinel = null;
      }
    } catch (_) {
      // Fallback gracefully if WakeLock API is restricted
    }

    saveState();
    const btnWake = document.getElementById('btn-toggle-wakelock');
    if (btnWake) {
      btnWake.setAttribute('aria-pressed', state.wakeLockEnabled ? 'true' : 'false');
      btnWake.textContent = state.wakeLockEnabled ? '🔆 Pantalla Fija' : '🔆 Pantalla Activa';
    }
    return state.wakeLockEnabled;
  }

  function recordProgressionEntry(dayId, ex, previousLoad, newLoad) {
    if (newLoad <= previousLoad) return null;
    const day = state.schedule[dayId];
    const e1rm = GYM_VISUALS && typeof GYM_VISUALS.calculateE1RM === 'function'
      ? GYM_VISUALS.calculateE1RM(ex.loadType, newLoad, ex.reps)
      : Math.round(newLoad * (1 + (ex.reps || 12) / 30) * 10) / 10;

    const unitLabel = ex.loadType === 'nivel' ? `Nivel ${newLoad}` : `${newLoad} kg`;
    const prevLabel = ex.loadType === 'nivel' ? `Nivel ${previousLoad}` : `${previousLoad} kg`;

    const entry = {
      id: `pr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dateISO: new Date().toISOString(),
      dayId,
      dayName: day ? day.dayName : dayId,
      exerciseId: ex.id,
      exerciseName: ex.name,
      loadType: ex.loadType,
      previousLoad,
      newLoad,
      unitLabel,
      prevLabel,
      reps: ex.reps || 12,
      e1rmKg: e1rm
    };

    if (!Array.isArray(state.progressionHistory)) {
      state.progressionHistory = [];
    }
    state.progressionHistory.unshift(entry);
    if (state.progressionHistory.length > 40) {
      state.progressionHistory.length = 40;
    }
    triggerHaptic([50, 40, 90]);
    speakCoachMessage(`Nuevo récord personal en ${ex.name}. ${unitLabel}.`);
    showCelebrationToast(`📈 ¡Sobrecarga Progresiva en ${ex.name}! ${prevLabel} → ${unitLabel} (1RM Est: ${e1rm} kg)`);
    return entry;
  }

  function playCompletionTone() {
    triggerHaptic([70, 40, 70]);
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (_) {
      // Audio context blocked or unavailable in headless test
    }
  }

  function formatLoadBadge(ex) {
    if (ex.loadType === 'nivel') {
      return {
        main: `Nivel ${ex.loadValue}`,
        sub: 'Placa / Polea (sin kg)',
        cssClass: 'unit-nivel'
      };
    }
    if (ex.loadType === 'corporal') {
      return {
        main: ex.loadValue > 0 ? `Corporal +${ex.loadValue}kg` : 'Peso Corporal',
        sub: 'Calistenia / Asistido',
        cssClass: 'unit-corporal'
      };
    }
    return {
      main: `${ex.loadValue} kg`,
      sub: 'Peso en kilogramos',
      cssClass: 'unit-kg'
    };
  }

  function toggleExerciseLoadUnit(dayId, exerciseId) {
    const day = state.schedule[dayId];
    if (!day) return;
    const ex = day.exercises.find(item => item.id === exerciseId);
    if (!ex) return;

    if (ex.loadType === 'kg') {
      ex.savedKgValue = ex.loadValue;
      ex.loadType = 'nivel';
      ex.loadValue = ex.savedNivelValue || Math.max(1, Math.round(ex.loadValue / 3.5));
    } else if (ex.loadType === 'nivel') {
      ex.savedNivelValue = ex.loadValue;
      ex.loadType = 'kg';
      ex.loadValue = ex.savedKgValue || ex.loadValue * 3.5;
    } else {
      ex.loadType = 'kg';
      ex.loadValue = ex.savedKgValue || 10;
    }
    saveState();
    renderAll();
  }

  function adjustExerciseLoad(dayId, exerciseId, deltaDirection) {
    const day = state.schedule[dayId];
    if (!day) return;
    const ex = day.exercises.find(item => item.id === exerciseId);
    if (!ex) return;

    const prevVal = Number(ex.loadValue) || 0;
    const step = ex.loadType === 'nivel' ? 1 : 2.5;
    const nextVal = Math.max(0, Number((prevVal + deltaDirection * step).toFixed(1)));
    ex.loadValue = nextVal;
    if (nextVal > prevVal) {
      recordProgressionEntry(dayId, ex, prevVal, nextVal);
    }
    saveState();
    renderAll();
  }

  function toggleSetCompletion(dayId, exerciseId, setIndex) {
    const day = state.schedule[dayId];
    if (!day) return;
    const ex = day.exercises.find(item => item.id === exerciseId);
    if (!ex || !Array.isArray(ex.completedSets)) return;

    const newState = !ex.completedSets[setIndex];
    ex.completedSets[setIndex] = newState;
    saveState();
    renderAll();

    if (newState) {
      triggerHaptic([45]);
      const doneInEx = ex.completedSets.filter(Boolean).length;
      if (doneInEx === (Number(ex.sets) || 4)) {
        showCelebrationToast(`🔥 ¡4 series de ${ex.name} completadas!`);
        playCompletionTone();
      }
      startRestTimer(ex.restSeconds || 75, `${ex.name} (Serie ${setIndex + 1}/${ex.sets})`);
    }
  }

  function logCurrentWorkoutSession(options = {}) {
    const day = state.schedule[state.selectedDay];
    if (!day || day.exercises.length === 0) return false;

    const analytics = GYM_VISUALS
      ? GYM_VISUALS.computeAnalytics(state.schedule, DAYS_ORDER)
      : null;
    const dayStat = analytics
      ? analytics.perDay.find(d => d.id === state.selectedDay)
      : null;

    const totalSets = day.exercises.reduce((acc, ex) => acc + (Number(ex.sets) || 4), 0);
    const doneSets = day.exercises.reduce(
      (acc, ex) => acc + (ex.completedSets || []).filter(Boolean).length,
      0
    );

    const isTruncated = Boolean(options.isTruncated);
    const durationMs = getStopwatchElapsedMs();
    const durationText = formatStopwatchDurationText(durationMs);
    const journalInput = document.getElementById('session-journal-note');
    let sessionNote = options.customNote;
    if (!sessionNote) {
      sessionNote = (journalInput?.value || state.journalNotesByDay?.[state.selectedDay] || '').trim();
      if (!sessionNote) {
        sessionNote = isTruncated
          ? `Sesión truncada por el usuario tras ${doneSets} de ${totalSets} series completadas.`
          : '4×12 completado con buena técnica y control excéntrico.';
      }
    }

    let totalRepsDone = 0;
    for (const ex of day.exercises) {
      const sets = Number(ex.sets) || 4;
      for (let s = 0; s < sets; s++) {
        if (isTruncated) {
          if (ex.completedSets && ex.completedSets[s]) {
            totalRepsDone += getExerciseSetReps(ex, s);
          }
        } else {
          totalRepsDone += getExerciseSetReps(ex, s);
        }
      }
    }

    const volumeKg = dayStat
      ? (isTruncated ? (dayStat.doneKg || 0) : (dayStat.doneKg || dayStat.plannedKg))
      : 0;

    const record = {
      id: `session-${Date.now()}`,
      dateISO: new Date().toISOString(),
      dayId: state.selectedDay,
      dayName: day.dayName,
      title: day.title,
      muscleGroup: day.muscleGroup,
      status: isTruncated ? 'truncated' : 'completed',
      setsDone: isTruncated ? doneSets : (doneSets || totalSets),
      setsPlanned: totalSets,
      totalRepsDone,
      volumeKg,
      durationMs: durationMs,
      durationText: durationText,
      sessionNote
    };

    state.history.unshift(record);
    if (state.history.length > 30) {
      state.history.length = 30;
    }
    saveState();
    renderAll();
    const durMsg = durationText ? ` · ⏱️ ${durationText}` : '';
    if (!options.silent) {
      if (isTruncated) {
        showCelebrationToast(`⚠️ Sesión truncada registrada (${doneSets}/${totalSets} series)${durMsg}`);
      } else {
        showCelebrationToast(`🏆 Sesión de ${day.dayName} registrada en tu historial${durMsg}`);
        playCompletionTone();
      }
    }
    return true;
  }

  // Exception / Rescheduling Logic (Monday-Saturday -> Sunday)
  function moveDayToSunday(sourceDayId) {
    if (sourceDayId === 'domingo' || !state.schedule[sourceDayId]) return false;
    const sourceDay = state.schedule[sourceDayId];
    if (!sourceDay.exercises || sourceDay.exercises.length === 0) return false;

    const sunday = state.schedule.domingo;
    const movedExercises = deepClone(sourceDay.exercises);

    if (sunday.status === 'reprogrammed' && sunday.exercises.length > 0) {
      const existingIds = new Set(sunday.exercises.map(e => e.id));
      for (const ex of movedExercises) {
        const clonedId = existingIds.has(ex.id) ? `${ex.id}-dom` : ex.id;
        sunday.exercises.push({ ...ex, id: clonedId });
      }
      sunday.title = `${sunday.title} + ${sourceDay.title}`;
      sunday.muscleGroup = `${sunday.muscleGroup} · ${sourceDay.muscleGroup}`;
      sunday.estimatedMinutes = (sunday.estimatedMinutes || 45) + (sourceDay.estimatedMinutes || 45);
    } else {
      sunday.title = `${sourceDay.title} (De ${sourceDay.dayName})`;
      sunday.subtitle = `Reprogramado por excepción del ${sourceDay.dayName} — ${sourceDay.subtitle}`;
      sunday.muscleGroup = sourceDay.muscleGroup;
      sunday.accentHue = sourceDay.accentHue;
      sunday.estimatedMinutes = sourceDay.estimatedMinutes || 55;
      sunday.exercises = movedExercises;
      sunday.status = 'reprogrammed';
      sunday.originalSourceDay = sourceDayId;
    }

    sourceDay.backupSnapshot = {
      title: sourceDay.title,
      subtitle: sourceDay.subtitle,
      muscleGroup: sourceDay.muscleGroup,
      estimatedMinutes: sourceDay.estimatedMinutes,
      exercises: deepClone(sourceDay.exercises)
    };
    sourceDay.status = 'skipped_to_sunday';
    sourceDay.exercises = [];
    sourceDay.estimatedMinutes = 0;

    saveState();
    renderAll();
    return true;
  }

  function shiftChainToSunday(startDayId) {
    const startIdx = DAYS_ORDER.indexOf(startDayId);
    if (startIdx < 0 || startIdx >= 6) return false;

    for (let i = 6; i > startIdx; i--) {
      const targetKey = DAYS_ORDER[i];
      const prevKey = DAYS_ORDER[i - 1];
      const prevDay = state.schedule[prevKey];
      const targetDay = state.schedule[targetKey];

      targetDay.title = `${prevDay.title} (Recorrido de ${prevDay.dayName})`;
      targetDay.subtitle = prevDay.subtitle;
      targetDay.muscleGroup = prevDay.muscleGroup;
      targetDay.accentHue = prevDay.accentHue;
      targetDay.estimatedMinutes = prevDay.estimatedMinutes;
      targetDay.exercises = deepClone(prevDay.exercises);
      targetDay.status = targetKey === 'domingo' ? 'reprogrammed' : 'shifted';
      targetDay.originalSourceDay = prevKey;
    }

    const skippedDay = state.schedule[startDayId];
    skippedDay.status = 'skipped_to_sunday';
    skippedDay.title = 'Descanso por Excepción';
    skippedDay.subtitle = 'Los entrenamientos siguientes se recorrieron hasta el Domingo';
    skippedDay.muscleGroup = 'Descanso';
    skippedDay.estimatedMinutes = 0;
    skippedDay.exercises = [];

    saveState();
    renderAll();
    return true;
  }

  function swapDays(dayAId, dayBId) {
    if (!state.schedule[dayAId] || !state.schedule[dayBId] || dayAId === dayBId) return false;
    const a = state.schedule[dayAId];
    const b = state.schedule[dayBId];

    const fields = ['title', 'subtitle', 'muscleGroup', 'accentHue', 'estimatedMinutes', 'exercises', 'status'];
    for (const f of fields) {
      const temp = deepClone(a[f]);
      a[f] = deepClone(b[f]);
      b[f] = temp;
    }

    if (dayBId === 'domingo' && b.exercises.length > 0) {
      b.status = 'reprogrammed';
    }
    if (dayAId === 'domingo' && a.exercises.length > 0) {
      a.status = 'reprogrammed';
    }

    saveState();
    renderAll();
    return true;
  }

  function revertSkippedDay(dayId) {
    const day = state.schedule[dayId];
    if (!day) return;
    if (day.backupSnapshot) {
      day.title = day.backupSnapshot.title;
      day.subtitle = day.backupSnapshot.subtitle;
      day.muscleGroup = day.backupSnapshot.muscleGroup;
      day.estimatedMinutes = day.backupSnapshot.estimatedMinutes;
      day.exercises = deepClone(day.backupSnapshot.exercises);
      day.status = 'normal';
      delete day.backupSnapshot;

      const sunday = state.schedule.domingo;
      if (sunday.originalSourceDay === dayId) {
        state.schedule.domingo = deepClone(GYM_DATA.INITIAL_SCHEDULE.domingo);
      }
      saveState();
      renderAll();
    } else {
      restoreOriginalSchedule();
    }
  }

  function restoreOriginalSchedule() {
    stopRestTimer();
    const fresh = createInitialState();
    state.schedule = fresh.schedule;
    saveState();
    renderAll();
  }

  function resetWeeklySeriesProgress() {
    for (const dayKey of DAYS_ORDER) {
      for (const ex of state.schedule[dayKey].exercises) {
        ex.completedSets = Array.from({ length: Number(ex.sets) || 4 }, () => false);
      }
    }
    saveState();
    renderAll();
  }

  function getActiveFocusExercise() {
    const day = state.schedule[state.selectedDay];
    return day?.exercises?.[state.activeExerciseIndex || 0] || null;
  }

  // Rest Timer with CSS Conic Ring Progress (0% SVG)
  function startRestTimer(seconds, labelText) {
    const bar = document.getElementById('rest-timer-bar');
    const countdownEl = document.getElementById('timer-countdown');
    const labelEl = document.getElementById('timer-exercise-label');
    if (!bar || !countdownEl || !labelEl) return;

    if (restTimerInterval) clearInterval(restTimerInterval);
    restTotalSeconds = Math.max(5, Number(seconds) || 75);
    restRemainingSeconds = restTotalSeconds;
    labelEl.textContent = labelText || 'Descanso entre series';
    switchFloatingTimerMode('rest');

    restTimerInterval = setInterval(() => {
      restRemainingSeconds -= 1;
      if (restRemainingSeconds <= 0) {
        restRemainingSeconds = 0;
        clearInterval(restTimerInterval);
        restTimerInterval = null;
        updateTimerDisplay();
        labelEl.textContent = '¡Descanso terminado! Lista la siguiente serie 💪';
        playCompletionTone();
        triggerHaptic([120, 60, 120]);

        // Recalcular y mostrar automáticamente la serie siguiente y sus repeticiones calculadas
        renderWorkoutFocusScreen();
        const ex = getActiveFocusExercise();
        const nextIdx = ex?.completedSets ? ex.completedSets.findIndex(d => !d) : 0;
        if (ex && nextIdx !== -1) {
          const nextReps = getExerciseSetReps(ex, nextIdx);
          sendRestFinishedNotification('⏱️ ¡Descanso terminado!', `Es hora de tu Serie ${nextIdx + 1}: ${nextReps} repeticiones 💪`);
          showCelebrationToast(`⏱️ ¡Descanso terminado! Serie ${nextIdx + 1}: realiza ${nextReps} repeticiones.`);
        }
        return;
      }
      updateTimerDisplay();
    }, 1000);

    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    const countdownEl = document.getElementById('timer-countdown');
    const conicRingEl = document.getElementById('timer-ring-conic');
    const focusRestDigitsEl = document.getElementById('focus-rest-digits');
    const focusRestStatusEl = document.getElementById('focus-rest-status-text');
    const focusRestCardEl = document.getElementById('focus-rest-card');

    const mins = Math.floor(restRemainingSeconds / 60);
    const secs = restRemainingSeconds % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (countdownEl) {
      countdownEl.textContent = timeStr;
    }
    if (focusRestDigitsEl) {
      focusRestDigitsEl.textContent = timeStr;
    }
    if (focusRestStatusEl) {
      focusRestStatusEl.textContent = restTimerInterval
        ? '🔥 En descanso activo...'
        : (restRemainingSeconds === 0 ? '✅ ¡Listo para la siguiente serie!' : 'Listo para usar');
    }
    if (focusRestCardEl) {
      focusRestCardEl.classList.toggle('is-resting', Boolean(restTimerInterval));
    }
    const activeSetCardEl = document.getElementById('focus-active-set-card');
    if (activeSetCardEl) {
      activeSetCardEl.classList.toggle('is-resting-mode', Boolean(restTimerInterval));
    }
    const actionBtn = document.getElementById('btn-focus-action-set');
    const actionIcon = document.getElementById('focus-btn-action-icon');
    const actionText = document.getElementById('focus-btn-action-text');
    if (actionBtn && actionText && restTimerInterval) {
      actionBtn.classList.add('is-resting-state');
      if (actionIcon) actionIcon.textContent = '⚡';
      const ex = getActiveFocusExercise();
      const activeIdx = ex?.completedSets ? ex.completedSets.findIndex(d => !d) : 0;
      const repsCount = ex && activeIdx !== -1 ? getExerciseSetReps(ex, activeIdx) : 12;
      actionText.textContent = `¡Listo! Comenzar Serie ${activeIdx + 1} (${repsCount} reps)`;
    }
    if (conicRingEl) {
      const ratio = restTotalSeconds > 0 ? Math.max(0, restRemainingSeconds / restTotalSeconds) : 0;
      const pct = Math.round(ratio * 100);
      conicRingEl.style.setProperty('--ring-pct', `${pct}%`);
    }
  }

  function stopRestTimer() {
    if (restTimerInterval) {
      clearInterval(restTimerInterval);
      restTimerInterval = null;
    }
    const bar = document.getElementById('rest-timer-bar');
    if (bar) bar.hidden = true;
    const focusRestCardEl = document.getElementById('focus-rest-card');
    if (focusRestCardEl) focusRestCardEl.classList.remove('is-resting');
    const activeSetCardEl = document.getElementById('focus-active-set-card');
    if (activeSetCardEl) activeSetCardEl.classList.remove('is-resting-mode');
    const focusRestStatusEl = document.getElementById('focus-rest-status-text');
    if (focusRestStatusEl) focusRestStatusEl.textContent = 'Listo para usar';
  }

  // Rendering Functions
  function calculateWeeklyStats() {
    let totalSets = 0;
    let doneSets = 0;
    let skippedCount = 0;

    for (const dayKey of DAYS_ORDER) {
      const day = state.schedule[dayKey];
      if (day.status === 'skipped_to_sunday') skippedCount += 1;
      for (const ex of day.exercises) {
        const setsCount = Number(ex.sets) || 4;
        totalSets += setsCount;
        doneSets += (ex.completedSets || []).filter(Boolean).length;
      }
    }

    const pct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;
    const sundayActive = state.schedule.domingo.exercises.length > 0;
    const analytics = GYM_VISUALS
      ? GYM_VISUALS.computeAnalytics(state.schedule, DAYS_ORDER)
      : null;

    return { totalSets, doneSets, pct, skippedCount, sundayActive, analytics };
  }

  function renderWeeklySummary() {
    const stats = calculateWeeklyStats();
    const setsEl = document.getElementById('metric-sets-done');
    const volEl = document.getElementById('metric-volume-kg');
    const daysEl = document.getElementById('metric-days-status');
    const progBar = document.getElementById('weekly-progress-bar');
    const progText = document.getElementById('weekly-progress-text');
    const compactWeekPctEl = document.getElementById('compact-week-pct');

    if (setsEl) setsEl.textContent = `${stats.doneSets} / ${stats.totalSets}`;
    if (volEl && stats.analytics) {
      volEl.textContent = `${stats.analytics.completedWeeklyVolumeKg} / ${stats.analytics.totalWeeklyVolumeKg} kg`;
    }
    if (daysEl) {
      daysEl.textContent = stats.sundayActive
        ? 'Domingo Activo (Reprogramado)'
        : 'Lun–Sáb (Dom libre)';
    }
    if (progBar) {
      progBar.value = stats.pct;
      progBar.style.setProperty('--progress-hue', String(140 + Math.round(stats.pct * 0.2)));
    }
    if (progText) {
      progText.textContent = `${stats.pct}% completado (${stats.doneSets} series)`;
    }
    if (compactWeekPctEl) {
      compactWeekPctEl.textContent = `${stats.pct}% (${stats.doneSets}/${stats.totalSets})`;
    }
  }

  function renderDayTabs() {
    const listEl = document.getElementById('day-tabs-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    for (const dayKey of DAYS_ORDER) {
      const day = state.schedule[dayKey];
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'day-tab-btn';
      btn.dataset.day = dayKey;

      if (state.selectedDay === dayKey) {
        btn.setAttribute('aria-current', 'page');
      }
      if (day.status === 'skipped_to_sunday') {
        btn.classList.add('is-skipped');
      }
      if (dayKey === 'domingo' && day.exercises.length > 0) {
        btn.classList.add('is-sunday-active');
      }

      const dayTotalSets = day.exercises.reduce((acc, ex) => acc + (Number(ex.sets) || 4), 0);
      const dayDoneSets = day.exercises.reduce(
        (acc, ex) => acc + (ex.completedSets || []).filter(Boolean).length,
        0
      );
      if (dayTotalSets > 0 && dayDoneSets === dayTotalSets) {
        btn.classList.add('is-completed');
      }

      const shortSpan = document.createElement('span');
      shortSpan.className = 'tab-short';
      shortSpan.textContent = day.shortName;

      const groupSpan = document.createElement('span');
      groupSpan.className = 'tab-group';
      groupSpan.textContent =
        day.status === 'skipped_to_sunday'
          ? '→ DOM'
          : dayKey === 'domingo' && day.exercises.length === 0
            ? 'Libre'
            : day.muscleGroup.split('·')[0].trim();

      const dotSpan = document.createElement('span');
      dotSpan.className = 'tab-dot';
      dotSpan.setAttribute('aria-hidden', 'true');

      btn.append(shortSpan, groupSpan, dotSpan);
      btn.addEventListener('click', () => {
        state.selectedDay = dayKey;
        saveState();
        renderAll();
      });

      li.appendChild(btn);
      listEl.appendChild(li);
    }
  }

  function renderDayHero() {
    const day = state.schedule[state.selectedDay];
    if (!day) return;

    const heroCard = document.getElementById('day-hero-card');
    const badgesEl = document.getElementById('day-badges');
    const titleEl = document.getElementById('day-title');
    const subtitleEl = document.getElementById('day-subtitle');
    const setsCounterEl = document.getElementById('day-sets-counter');
    const durationEl = document.getElementById('day-duration-pill');
    const volumePillEl = document.getElementById('day-volume-pill');
    const exceptionBtn = document.getElementById('btn-open-exception');
    const exceptionLabel = document.getElementById('btn-exception-label');
    const anatomyPanel = document.getElementById('day-anatomy-panel');

    if (heroCard) {
      heroCard.style.setProperty('--day-hue', String(day.accentHue || 160));
    }

    if (badgesEl) {
      badgesEl.innerHTML = '';
      const muscleBadge = document.createElement('span');
      muscleBadge.className = 'badge badge-muscle';
      muscleBadge.textContent = day.muscleGroup;
      badgesEl.appendChild(muscleBadge);

      if (day.status === 'skipped_to_sunday') {
        const excBadge = document.createElement('span');
        excBadge.className = 'badge badge-exception';
        excBadge.textContent = 'Reprogramado al Domingo';
        badgesEl.appendChild(excBadge);
      } else if (day.status === 'reprogrammed' || day.status === 'shifted') {
        const repBadge = document.createElement('span');
        repBadge.className = 'badge badge-exception';
        repBadge.textContent = 'Entrenamiento Reprogramado';
        badgesEl.appendChild(repBadge);
      }
    }

    if (titleEl) {
      titleEl.textContent = `${day.dayName}: ${day.title}`;
    }
    if (subtitleEl) {
      subtitleEl.textContent = day.subtitle;
    }

    const totalSets = day.exercises.reduce((acc, ex) => acc + (Number(ex.sets) || 4), 0);
    const doneSets = day.exercises.reduce(
      (acc, ex) => acc + (ex.completedSets || []).filter(Boolean).length,
      0
    );

    if (setsCounterEl) {
      setsCounterEl.textContent = `${doneSets} / ${totalSets} series`;
    }
    if (durationEl) {
      durationEl.textContent = day.estimatedMinutes > 0 ? `~${day.estimatedMinutes} min` : 'Descanso';
    }

    if (volumePillEl && GYM_VISUALS) {
      const analytics = GYM_VISUALS.computeAnalytics(state.schedule, DAYS_ORDER);
      const dayStat = analytics.perDay.find(d => d.id === state.selectedDay);
      if (dayStat) {
        volumePillEl.textContent = `${dayStat.doneKg} / ${dayStat.plannedKg} kg est.`;
      }
    }

    if (anatomyPanel && GYM_VISUALS) {
      anatomyPanel.innerHTML = GYM_VISUALS.renderAnatomyMapSVG(day);
    }

    if (exceptionBtn && exceptionLabel) {
      if (state.selectedDay === 'domingo') {
        exceptionBtn.hidden = true;
      } else if (day.status === 'skipped_to_sunday') {
        exceptionBtn.hidden = false;
        exceptionLabel.textContent = 'Revertir excepción y entrenar hoy';
      } else {
        exceptionBtn.hidden = false;
        exceptionLabel.textContent = 'No entrenaré hoy → Mover al Domingo';
      }
    }
  }

  function createExerciseCard(dayId, ex) {
    const li = document.createElement('li');
    li.className = 'exercise-card';
    li.dataset.exerciseId = ex.id;

    const doneCount = (ex.completedSets || []).filter(Boolean).length;
    const totalSets = Number(ex.sets) || 4;
    if (doneCount === totalSets && totalSets > 0) {
      li.classList.add('is-all-done');
    }

    const visualLayout = document.createElement('div');
    visualLayout.className = 'exercise-visual-layout';

    const illustrationWrap = document.createElement('div');
    illustrationWrap.className = 'exercise-illustration-wrap';
    if (GYM_VISUALS) {
      illustrationWrap.innerHTML = GYM_VISUALS.renderExerciseIllustrationSVG(ex);
    }
    illustrationWrap.addEventListener('click', () => openSpriteViewerDialog(ex));
    illustrationWrap.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openSpriteViewerDialog(ex);
      }
    });

    const contentCol = document.createElement('div');
    contentCol.className = 'exercise-content-col';

    const topRow = document.createElement('header');
    topRow.className = 'exercise-top exercise-card-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'exercise-title-group';

    const h3 = document.createElement('h3');
    h3.className = 'exercise-card-title';
    h3.textContent = ex.name;
    titleGroup.appendChild(h3);

    const metaRow = document.createElement('div');
    metaRow.className = 'exercise-meta';

    const muscleSpan = document.createElement('span');
    muscleSpan.textContent = `🎯 ${ex.muscle}`;
    metaRow.appendChild(muscleSpan);

    const equipSpan = document.createElement('span');
    equipSpan.textContent = `⚙️ ${ex.equipment}`;
    metaRow.appendChild(equipSpan);

    if (ex.userBase) {
      const baseBadge = document.createElement('span');
      baseBadge.className = 'badge badge-user-base';
      baseBadge.textContent = '★ Marca actual configurada';
      metaRow.appendChild(baseBadge);
    }

    titleGroup.appendChild(metaRow);

    const loadBox = document.createElement('div');
    loadBox.className = 'load-control-box';

    const btnMinus = document.createElement('button');
    btnMinus.type = 'button';
    btnMinus.className = 'btn-step-load';
    btnMinus.setAttribute('aria-label', `Disminuir carga en ${ex.name}`);
    btnMinus.textContent = '−';
    btnMinus.addEventListener('click', () => adjustExerciseLoad(dayId, ex.id, -1));

    const badgeInfo = formatLoadBadge(ex);
    const btnUnit = document.createElement('button');
    btnUnit.type = 'button';
    btnUnit.className = `btn-toggle-unit ${badgeInfo.cssClass}`;
    btnUnit.title = 'Toca para alternar entre kg y Nivel de polea';

    const unitMain = document.createElement('span');
    unitMain.textContent = badgeInfo.main;
    const unitSub = document.createElement('span');
    unitSub.className = 'unit-subtext';
    unitSub.textContent = badgeInfo.sub;
    btnUnit.append(unitMain, unitSub);
    btnUnit.addEventListener('click', () => toggleExerciseLoadUnit(dayId, ex.id));

    const btnPlus = document.createElement('button');
    btnPlus.type = 'button';
    btnPlus.className = 'btn-step-load';
    btnPlus.setAttribute('aria-label', `Aumentar carga en ${ex.name}`);
    btnPlus.textContent = '+';
    btnPlus.addEventListener('click', () => adjustExerciseLoad(dayId, ex.id, 1));

    loadBox.append(btnMinus, btnUnit, btnPlus);
    topRow.append(titleGroup, loadBox);
    li.appendChild(topRow);

    // CONTROLES ESENCIALES EN PANTALLA: Series y Repeticiones (4 × 12)
    const setsRow = document.createElement('div');
    setsRow.className = 'sets-tracker-row';

    for (let s = 0; s < totalSets; s++) {
      const isDone = Boolean(ex.completedSets && ex.completedSets[s]);
      const setBtn = document.createElement('button');
      setBtn.type = 'button';
      setBtn.className = 'btn-set-check';
      setBtn.setAttribute('aria-pressed', isDone ? 'true' : 'false');

      const sNum = document.createElement('span');
      sNum.className = 'set-num';
      sNum.textContent = isDone ? `✓ Serie ${s + 1}` : `Serie ${s + 1}`;

      const sReps = document.createElement('span');
      sReps.className = 'set-reps';
      const sRepsCount = getExerciseSetReps(ex, s);
      sReps.textContent = `${sRepsCount} reps`;

      setBtn.append(sNum, sReps);
      setBtn.addEventListener('click', () => toggleSetCompletion(dayId, ex.id, s));
      setsRow.appendChild(setBtn);
    }
    contentCol.appendChild(setsRow);

    // Asistente de Doble Progresión Inteligente (Cuando se completan las 4 series × 12 reps)
    if (doneCount === totalSets && totalSets > 0) {
      const overloadBanner = document.createElement('div');
      overloadBanner.className = 'smart-overload-banner';
      const nextVal = ex.loadType === 'nivel' ? Number(ex.loadValue) + 1 : Number(ex.loadValue) + 2.5;
      const nextLabel = ex.loadType === 'nivel' ? `Nivel ${nextVal}` : `${nextVal} kg`;

      const msgSpan = document.createElement('span');
      msgSpan.textContent = `🚀 ¡${totalSets}×${ex.reps} dominado! Listo para sobrecarga progresiva:`;

      const btnApplyOverload = document.createElement('button');
      btnApplyOverload.type = 'button';
      btnApplyOverload.className = 'btn-smart-overload-suggest';
      btnApplyOverload.dataset.exerciseId = ex.id;
      btnApplyOverload.textContent = `⚡ Subir a ${nextLabel} (+1 toque)`;
      btnApplyOverload.addEventListener('click', () => applySmartProgressionSuggestion(dayId, ex.id));

      overloadBanner.append(msgSpan, btnApplyOverload);
      contentCol.appendChild(overloadBanner);
    }

    // Barra Inferior Compacta: Botón "▶ Entrenar" (cambia a Pantalla de Ejercicio) + Menú Agrupado "⚙️ Ajustes y Técnica"
    const bottomActionsRow = document.createElement('div');
    bottomActionsRow.className = 'ex-card-compact-bar';

    const btnFocusEx = document.createElement('button');
    btnFocusEx.type = 'button';
    btnFocusEx.className = 'btn-open-ex-focus';
    btnFocusEx.dataset.exerciseId = ex.id;
    btnFocusEx.title = 'Abrir este ejercicio en la pantalla dedicada de entrenamiento';
    btnFocusEx.textContent = `▶ Entrenar (${ex.restSeconds || 75}s descanso)`;
    btnFocusEx.addEventListener('click', () => {
      const dayObj = state.schedule[dayId];
      const idx = dayObj ? dayObj.exercises.findIndex(item => item.id === ex.id) : 0;
      startDayWorkoutSession(dayId, idx >= 0 ? idx : 0);
    });

    // Menú desplegable que agrupa las opciones no esenciales para despejar la vista vertical
    const optionsMenu = document.createElement('details');
    optionsMenu.className = 'ex-card-options-menu';
    const isTimingThis = tutState.activeExerciseId === ex.id;
    if (isTimingThis) {
      optionsMenu.open = true;
    }

    const optionsSummary = document.createElement('summary');
    optionsSummary.className = 'ex-card-options-summary';
    const setModeKey = ex.setMode || 'normal';
    const modeCatalog = (GYM_VISUALS && GYM_VISUALS.SET_MODE_CATALOG) || {};
    const modeMeta = modeCatalog[setModeKey] || { badge: '⚡ Serie Normal', desc: '4×12' };
    const rirLabel = ex.targetRir || 'RIR 2';
    optionsSummary.innerHTML = `<span>⚙️ Opciones y Técnica</span> <small class="ex-options-pill">${rirLabel}${ex.isSwappedAlternative ? ' · 🔄 Sustituto' : ''}</small>`;

    const optionsBody = document.createElement('div');
    optionsBody.className = 'ex-card-options-body';

    // Fila de Modo de Serie (Normal, Dropset, Superserie, Rest-Pause), RIR, Calculadora y Máquina Ocupada
    const intensityRow = document.createElement('div');
    intensityRow.className = 'ex-intensity-row';

    const btnModeChip = document.createElement('button');
    btnModeChip.type = 'button';
    btnModeChip.className = `btn-set-mode-chip mode-${setModeKey}`;
    btnModeChip.dataset.exerciseId = ex.id;
    btnModeChip.title = `${modeMeta.desc}. Toca para alternar técnica (Normal → Dropset → Superserie → Rest-Pause).`;
    btnModeChip.textContent = modeMeta.badge;
    btnModeChip.addEventListener('click', () => cycleExerciseSetMode(dayId, ex.id));

    const btnRirChip = document.createElement('button');
    btnRirChip.type = 'button';
    btnRirChip.className = 'btn-rir-chip';
    btnRirChip.dataset.exerciseId = ex.id;
    btnRirChip.title = 'Repeticiones en Reserva (RIR) / Esfuerzo percibido. Toca para alternar.';
    btnRirChip.textContent = `🎯 ${rirLabel}`;
    btnRirChip.addEventListener('click', () => cycleExerciseRir(dayId, ex.id));

    const btnCalcChip = document.createElement('button');
    btnCalcChip.type = 'button';
    btnCalcChip.className = 'btn-rir-chip';
    btnCalcChip.title = 'Abrir calculadora de discos olímpicos y 1RM con la carga de este ejercicio';
    btnCalcChip.textContent = '🧮 Discos / 1RM';
    btnCalcChip.addEventListener('click', () => {
      const effKg = GYM_VISUALS && typeof GYM_VISUALS.resolveEffectiveLoadKg === 'function'
        ? GYM_VISUALS.resolveEffectiveLoadKg(ex)
        : Number(ex.loadValue) || 20;
      openCalculatorDialog(effKg, ex.reps || 12);
    });

    const btnAltSwapChip = document.createElement('button');
    btnAltSwapChip.type = 'button';
    btnAltSwapChip.className = `btn-alt-swap-chip ${ex.isSwappedAlternative ? 'is-swapped' : ''}`;
    btnAltSwapChip.dataset.exerciseId = ex.id;
    btnAltSwapChip.title = ex.isSwappedAlternative
      ? 'Volver al ejercicio titular original'
      : '¿Máquina o polea ocupada? Toca para cambiar por su ejercicio equivalente biomecánico';
    btnAltSwapChip.textContent = ex.isSwappedAlternative ? '↩️ Volver a Original' : '🔄 Máquina Ocupada';
    btnAltSwapChip.addEventListener('click', () => openExerciseSwapModal(dayId, ex.id));

    const repsLabel = formatExerciseRepsSummary(ex);
    const repsBadge = document.createElement('span');
    repsBadge.className = 'badge-reps-prescribed';
    repsBadge.title = 'Series y repeticiones dinámicas establecidas por la aplicación';
    repsBadge.textContent = `📊 ${repsLabel}`;

    const btnEdit = document.createElement('button');
    btnEdit.type = 'button';
    btnEdit.className = 'btn-edit-ex';
    btnEdit.textContent = '✏️ Editar';
    btnEdit.addEventListener('click', () => openExerciseDialog(ex));

    intensityRow.append(btnModeChip, btnRirChip, repsBadge, btnCalcChip, btnAltSwapChip, btnEdit);
    optionsBody.appendChild(intensityRow);

    const tutRow = document.createElement('div');
    tutRow.className = 'set-stopwatch-row';

    const tutBtn = document.createElement('button');
    tutBtn.type = 'button';
    tutBtn.className = 'btn-tut-stopwatch';
    tutBtn.dataset.exerciseId = ex.id;
    if (isTimingThis) {
      tutBtn.classList.add('is-timing');
      const mins = Math.floor(tutState.elapsedSeconds / 60);
      const secs = tutState.elapsedSeconds % 60;
      const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      tutBtn.innerHTML = `<span class="tut-icon">⏹️</span> Finalizar Serie (${timeStr})`;
    } else {
      tutBtn.innerHTML = `<span class="tut-icon">⏱️</span> Iniciar Serie (TUT)`;
    }
    tutBtn.addEventListener('click', () => {
      if (tutState.activeExerciseId === ex.id) {
        stopTutStopwatch();
      } else {
        startTutStopwatch(dayId, ex.id);
      }
    });

    const tutInfo = document.createElement('span');
    tutInfo.className = 'tut-status-text';
    if (isTimingThis) {
      const cad = getCadencePhaseForSecond(tutState.elapsedSeconds);
      tutInfo.innerHTML = `<span class="tut-cadence-banner ${cad.phaseClass}">${cad.text} · Rep ~${cad.repNum}/${ex.reps || 12}</span>`;
    } else {
      tutInfo.textContent = 'Mide tiempo bajo tensión (TUT 3-1-1) y avanza serie';
    }

    tutRow.append(tutBtn, tutInfo);
    optionsBody.appendChild(tutRow);

    const noteP = document.createElement('p');
    noteP.className = 'exercise-note-body';
    noteP.textContent = ex.note || 'Mantén técnica estricta y controla la fase excéntrica.';
    optionsBody.appendChild(noteP);

    optionsMenu.append(optionsSummary, optionsBody);
    bottomActionsRow.append(btnFocusEx, optionsMenu);
    contentCol.appendChild(bottomActionsRow);

    visualLayout.append(illustrationWrap, contentCol);
    li.appendChild(visualLayout);

    return li;
  }

  function cycleExerciseSetMode(dayId, exerciseId) {
    const day = state.schedule[dayId];
    if (!day) return null;
    const ex = day.exercises.find(e => e.id === exerciseId);
    if (!ex) return null;

    const modesOrder = ['normal', 'dropset', 'superserie', 'restpause'];
    const currentIdx = modesOrder.indexOf(ex.setMode || 'normal');
    const nextMode = modesOrder[(currentIdx + 1) % modesOrder.length];
    ex.setMode = nextMode;

    const modeCatalog = (GYM_VISUALS && GYM_VISUALS.SET_MODE_CATALOG) || {};
    const meta = modeCatalog[nextMode];
    if (meta && meta.restFactor) {
      const baseRest = 75;
      ex.restSeconds = Math.max(20, Math.round(baseRest * meta.restFactor));
    }
    triggerHaptic([35]);
    saveState();
    renderExercisesList();
    renderWorkoutFocusScreen();
    return nextMode;
  }

  function cycleExerciseRir(dayId, exerciseId) {
    const day = state.schedule[dayId];
    if (!day) return null;
    const ex = day.exercises.find(e => e.id === exerciseId);
    if (!ex) return null;

    const rirOrder = (GYM_VISUALS && GYM_VISUALS.RIR_ORDER) || ['RIR 3', 'RIR 2', 'RIR 1', 'RIR 0 (Fallo)'];
    const currentIdx = rirOrder.indexOf(ex.targetRir || 'RIR 2');
    const nextRir = rirOrder[(currentIdx + 1) % rirOrder.length];
    ex.targetRir = nextRir;

    triggerHaptic([30]);
    saveState();
    renderExercisesList();
    renderWorkoutFocusScreen();
    return nextRir;
  }

  function formatExerciseRepsSummary(exercise) {
    if (GYM_VISUALS && typeof GYM_VISUALS.formatExerciseRepsSummary === 'function') {
      return GYM_VISUALS.formatExerciseRepsSummary(exercise);
    }
    if (!exercise) return '12 reps';
    if (Array.isArray(exercise.seriesReps) && exercise.seriesReps.length > 0) {
      const allEqual = exercise.seriesReps.every(r => r === exercise.seriesReps[0]);
      if (!allEqual) return `${exercise.seriesReps.join('-')} reps`;
      return `${exercise.seriesReps[0]} reps`;
    }
    return `${exercise.reps || 12} reps`;
  }

  function getExerciseSetReps(exercise, setIndex) {
    if (GYM_VISUALS && typeof GYM_VISUALS.getExerciseSetReps === 'function') {
      return GYM_VISUALS.getExerciseSetReps(exercise, setIndex);
    }
    if (!exercise) return 12;
    if (Array.isArray(exercise.seriesReps) && exercise.seriesReps[setIndex] !== undefined) {
      return Number(exercise.seriesReps[setIndex]) || Number(exercise.reps) || 12;
    }
    return Number(exercise.reps) || 12;
  }

  function cycleExerciseReps(dayId, exerciseId, forcePreset = null) {
    const day = state.schedule[dayId];
    if (!day) return null;
    const ex = day.exercises.find(e => e.id === exerciseId);
    if (!ex) return null;

    const presets = [
      { key: 6, label: '6 reps (Fuerza)', reps: 6, scheme: 'fixed', restSeconds: 90, seriesReps: (s) => Array(s).fill(6) },
      { key: 8, label: '8 reps (Fuerza/Hipertrofia)', reps: 8, scheme: 'fixed', restSeconds: 90, seriesReps: (s) => Array(s).fill(8) },
      { key: 10, label: '10 reps (Tensión Media)', reps: 10, scheme: 'fixed', restSeconds: 75, seriesReps: (s) => Array(s).fill(10) },
      { key: 12, label: '12 reps (Hipertrofia)', reps: 12, scheme: 'fixed', restSeconds: 75, seriesReps: (s) => Array(s).fill(12) },
      { key: 15, label: '15 reps (Bombeo / Quema)', reps: 15, scheme: 'fixed', restSeconds: 60, seriesReps: (s) => Array(s).fill(15) },
      { key: 'pyramid', label: 'Pirámide (12-10-8-6)', reps: 12, scheme: 'pyramid', restSeconds: 75, seriesReps: (s) => [12, 10, 8, 6, 6, 6, 6, 6].slice(0, s) }
    ];

    let nextPreset = null;
    if (forcePreset !== null && forcePreset !== undefined) {
      nextPreset = presets.find(p => p.key === forcePreset || p.key === Number(forcePreset)) || presets[3];
    } else {
      let currentKey = ex.repsScheme === 'pyramid' ? 'pyramid' : Number(ex.reps) || 12;
      const currentIdx = presets.findIndex(p => p.key === currentKey);
      const nextIdx = (currentIdx + 1) % presets.length;
      nextPreset = presets[nextIdx];
    }

    const currentSets = Number(ex.sets) || 4;
    ex.reps = nextPreset.reps;
    ex.repsScheme = nextPreset.scheme;
    ex.seriesReps = nextPreset.seriesReps(currentSets);
    ex.restSeconds = nextPreset.restSeconds;

    triggerHaptic([35, 25]);
    saveState();
    renderExercisesList();
    renderWorkoutFocusScreen();
    showCelebrationToast(`🔁 Reps dinámicas: ${nextPreset.label}`);
    return { reps: ex.reps, seriesReps: ex.seriesReps, repsScheme: ex.repsScheme, label: nextPreset.label };
  }

  function adjustExerciseSeriesCount(dayId, exerciseId, delta) {
    const day = state.schedule[dayId];
    if (!day) return null;
    const ex = day.exercises.find(e => e.id === exerciseId);
    if (!ex) return null;

    const currentSets = Number(ex.sets) || 4;
    const newSets = Math.max(1, Math.min(8, currentSets + delta));
    if (newSets === currentSets) return currentSets;

    ex.sets = newSets;
    const prevDone = Array.isArray(ex.completedSets) ? ex.completedSets : [];
    ex.completedSets = Array.from({ length: newSets }, (_, i) => Boolean(prevDone[i]));

    if (Array.isArray(ex.seriesReps)) {
      if (newSets > ex.seriesReps.length) {
        const lastVal = ex.seriesReps[ex.seriesReps.length - 1] || ex.reps || 12;
        while (ex.seriesReps.length < newSets) {
          ex.seriesReps.push(lastVal);
        }
      } else {
        ex.seriesReps = ex.seriesReps.slice(0, newSets);
      }
    }

    triggerHaptic([40]);
    saveState();
    renderExercisesList();
    renderWorkoutFocusScreen();
    showCelebrationToast(`📊 Series actualizadas a ${newSets} series`);
    return newSets;
  }

  function recordBodyMetrics(customMetrics) {
    const weightInput = document.getElementById('body-weight-kg');
    const fatInput = document.getElementById('body-fat-pct');
    const bicepsInput = document.getElementById('body-biceps-cm');
    const chestInput = document.getElementById('body-chest-cm');
    const waistInput = document.getElementById('body-waist-cm');

    const weightKg = customMetrics?.weightKg ?? (Number(weightInput?.value) || 74.5);
    const fatPct = customMetrics?.fatPct ?? (Number(fatInput?.value) || 15.0);
    const bicepsCm = customMetrics?.bicepsCm ?? (Number(bicepsInput?.value) || 37.5);
    const chestCm = customMetrics?.chestCm ?? (Number(chestInput?.value) || 104.0);
    const waistCm = customMetrics?.waistCm ?? (Number(waistInput?.value) || 80.0);

    if (!Array.isArray(state.bodyMetrics)) {
      state.bodyMetrics = [];
    }

    const prev = state.bodyMetrics[0] || null;
    const deltaWeight = prev ? Math.round((weightKg - prev.weightKg) * 10) / 10 : 0;
    const deltaBiceps = prev ? Math.round((bicepsCm - prev.bicepsCm) * 10) / 10 : 0;

    const entry = {
      id: `bm-${Date.now()}`,
      dateISO: new Date().toISOString(),
      weightKg,
      fatPct,
      bicepsCm,
      chestCm,
      waistCm,
      deltaWeight,
      deltaBiceps
    };

    state.bodyMetrics.unshift(entry);
    state.bodyMetrics = state.bodyMetrics.slice(0, 24);
    triggerHaptic([50, 40]);
    saveState();
    renderBodyMetricsHistory();
    showCelebrationToast(`⚖️ Medida corporal registrada: ${weightKg} kg · Bíceps ${bicepsCm} cm`);
    return entry;
  }

  function renderBodyMetricsHistory() {
    const listEl = document.getElementById('body-metrics-history-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const records = Array.isArray(state.bodyMetrics) ? state.bodyMetrics : [];
    if (records.length === 0) {
      const emptyLi = document.createElement('li');
      emptyLi.className = 'history-item';
      emptyLi.innerHTML = `
        <div>
          <strong>Sin registros antropométricos aún</strong>
          <div><small>Guarda tu peso y perímetros semanales para medir hipertrofia real junto a tus cargas.</small></div>
        </div>
        <div><span>Meta: Control Semanal</span></div>
      `;
      listEl.appendChild(emptyLi);
      return;
    }

    for (const item of records) {
      const li = document.createElement('li');
      li.className = 'history-item';
      const dateStr = new Date(item.dateISO).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short'
      });
      const wSign = item.deltaWeight > 0 ? `+${item.deltaWeight}` : `${item.deltaWeight}`;
      const bSign = item.deltaBiceps > 0 ? `+${item.deltaBiceps}` : `${item.deltaBiceps}`;
      li.innerHTML = `
        <div>
          <strong>⚖️ ${item.weightKg} kg (${item.fatPct}% grasa) · ${dateStr}</strong>
          <div><small>💪 Bíceps: ${item.bicepsCm} cm (${bSign} cm) · 🦍 Torso: ${item.chestCm} cm · Cintura: ${item.waistCm} cm</small></div>
        </div>
        <div>
          <strong>Δ Peso: ${wSign} kg</strong>
        </div>
      `;
      listEl.appendChild(li);
    }
  }

  function applyWorkoutTemplate(templateKey) {
    if (!GYM_VISUALS || !GYM_VISUALS.WORKOUT_TEMPLATES || !GYM_VISUALS.WORKOUT_TEMPLATES[templateKey]) {
      return false;
    }
    const tpl = GYM_VISUALS.WORKOUT_TEMPLATES[templateKey];
    state.activeTemplate = templateKey;

    // Reiniciar con el horario base intacto (preservando siempre las 3 marcas base del usuario en Lunes)
    const freshSchedule = deepClone(GYM_DATA.INITIAL_SCHEDULE);
    for (const dayKey of DAYS_ORDER) {
      const day = freshSchedule[dayKey];
      const override = tpl.dayOverrides && tpl.dayOverrides[dayKey];
      if (override) {
        if (override.title) day.title = override.title;
        if (override.subtitle) day.subtitle = override.subtitle;
      }
      day.exercises = (day.exercises || []).map(ex => ({
        ...ex,
        setMode: ex.userBase ? 'normal' : (override?.defaultSetMode || 'normal'),
        targetRir: ex.userBase ? 'RIR 2' : (override?.defaultRir || 'RIR 2'),
        completedSets: Array.from({ length: ex.sets || 4 }, () => false)
      }));
    }

    state.schedule = freshSchedule;
    saveState();
    renderAll();

    document.querySelectorAll('.btn-template-select').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.template === templateKey);
    });

    showCelebrationToast(`🧩 Plantilla aplicada: ${tpl.name} (Marcas base de Lunes preservadas)`);
    return true;
  }

  function renderShareableSummaryCard() {
    const canvas = document.getElementById('share-card-canvas');
    if (!canvas || !GYM_VISUALS) return null;

    const analytics = GYM_VISUALS.computeAnalytics(state.schedule, DAYS_ORDER);
    const currentDay = state.schedule[state.selectedDay] || state.schedule.lunes;
    const prCount = (state.progressionHistory || []).length;

    const summaryPayload = {
      dayName: currentDay.dayName,
      title: currentDay.title,
      weeklyVolumeKg: analytics.completedWeeklyVolumeKg || analytics.totalWeeklyVolumeKg,
      completedSets: analytics.completedSetsCount,
      plannedSets: analytics.plannedSetsCount,
      prCount,
      template: state.activeTemplate || 'default_ppl'
    };
    canvas.dataset.renderedSummary = JSON.stringify(summaryPayload);

    try {
      const isJsDom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '');
      const ctx = !isJsDom && typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
      if (ctx) {
        const w = canvas.width || 720;
        const h = canvas.height || 400;

        // Fondo Oscuro Táctico
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#070b14');
        grad.addColorStop(1, '#111c33');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Borde Esmeralda
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4;
        ctx.strokeRect(12, 12, w - 24, h - 24);

        // Cabecera
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('GYM RUTINAS PRO · REPORTE TÁCTICO ANDROID', 36, 56);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText(`${currentDay.dayName}: ${currentDay.title}`, 36, 102);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '18px sans-serif';
        ctx.fillText(`Estándar: 4 series × 12 reps · Marcas Base: Nivel 6 | 20 kg | 10 kg`, 36, 138);

        // Bloques de KPIs
        const boxes = [
          { label: 'VOLUMEN SEMANAL', val: `${analytics.completedWeeklyVolumeKg} / ${analytics.totalWeeklyVolumeKg} kg`, color: '#10b981' },
          { label: 'SERIES COMPLETADAS', val: `${analytics.completedSetsCount} / ${analytics.plannedSetsCount}`, color: '#38bdf8' },
          { label: 'RÉCORDS / PRs', val: `${prCount} progresiones`, color: '#f59e0b' }
        ];

        boxes.forEach((b, idx) => {
          const bx = 36 + idx * 218;
          const by = 175;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.fillRect(bx, by, 202, 110);
          ctx.strokeStyle = b.color;
          ctx.lineWidth = 2;
          ctx.strokeRect(bx, by, 202, 110);

          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 13px sans-serif';
          ctx.fillText(b.label, bx + 14, by + 34);

          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 21px sans-serif';
          ctx.fillText(b.val, bx + 14, by + 74);
        });

        // Pie de tarjeta
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '16px sans-serif';
        const dateNow = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
        ctx.fillText(`Generado el ${dateNow} · 100% Sprites Rasterizados · 0% SVGs`, 36, 345);
      }
    } catch (_) {
      // En entornos headless sin soporte nativo de canvas 2D se conserva dataset.renderedSummary
    }

    return summaryPayload;
  }

  function downloadShareableSummaryCard() {
    renderShareableSummaryCard();
    const canvas = document.getElementById('share-card-canvas');
    if (!canvas) return;
    try {
      const dataUrl = typeof canvas.toDataURL === 'function' ? canvas.toDataURL('image/png') : '';
      if (dataUrl && dataUrl.startsWith('data:image')) {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `gym-rutinas-pro-${state.selectedDay}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (_) {
      // Ignore canvas export restrictions in headless tests
    }
    showCelebrationToast('📸 Tarjeta resumen generada lista para compartir');
  }

  function renderCalculatorModal() {
    if (!GYM_VISUALS || typeof GYM_VISUALS.calculatePlateBreakdown !== 'function') return null;
    const targetInput = document.getElementById('calc-target-kg');
    const barSelect = document.getElementById('calc-bar-kg');
    const repsInput = document.getElementById('calc-reps-done');
    const platesVisual = document.getElementById('calc-plates-visual');
    const summaryLine = document.getElementById('calc-plate-summary-line');
    const tbody1rm = document.getElementById('calc-1rm-tbody');

    const targetKg = Number(targetInput?.value) || 60;
    const barKg = Number(barSelect?.value ?? 20);
    const repsDone = Number(repsInput?.value) || 12;

    const breakdown = GYM_VISUALS.calculatePlateBreakdown(targetKg, barKg);
    const e1rm = GYM_VISUALS.calculateE1RM('kg', targetKg, repsDone);
    const zones = GYM_VISUALS.calculate1RMZones(e1rm);

    if (platesVisual) {
      platesVisual.innerHTML = '';
      if (barKg === 0) {
        const pill = document.createElement('span');
        pill.className = 'plate-pill';
        pill.style.background = '#d97706';
        pill.textContent = `Torre de Polea: Nivel ${breakdown.pulleyEquivalentLevel} (~${targetKg} kg)`;
        platesVisual.appendChild(pill);
      } else if (breakdown.platesPerSide.length === 0) {
        const pill = document.createElement('span');
        pill.className = 'plate-pill';
        pill.style.background = '#475569';
        pill.textContent = `Solo barra / soporte (${barKg} kg sin discos adicionales)`;
        platesVisual.appendChild(pill);
      } else {
        const colors = {
          25: '#ef4444',
          20: '#3b82f6',
          15: '#eab308',
          10: '#10b981',
          5: '#6366f1',
          2.5: '#ec4899',
          1.25: '#64748b'
        };
        for (const p of breakdown.platesPerSide) {
          const pill = document.createElement('span');
          pill.className = 'plate-pill';
          pill.style.background = colors[p.weight] || '#10b981';
          pill.textContent = `${p.count} × ${p.weight} kg`;
          platesVisual.appendChild(pill);
        }
      }
    }

    if (summaryLine) {
      summaryLine.textContent =
        barKg === 0
          ? `Equivalencia en polea: Nivel ${breakdown.pulleyEquivalentLevel} · 1RM Estimado: ${e1rm} kg`
          : `Carga por lado: ${breakdown.perSideKg} kg + Barra (${barKg} kg) = ${breakdown.achievedTotalKg} kg · 1RM Est.: ${e1rm} kg (Equiv. Polea Nivel ${breakdown.pulleyEquivalentLevel})`;
    }

    if (tbody1rm) {
      tbody1rm.innerHTML = '';
      for (const z of zones) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${z.pct}%</strong></td>
          <td><strong>${z.weightKg} kg</strong></td>
          <td>${z.repsRange}</td>
          <td>${z.zone}</td>
        `;
        tbody1rm.appendChild(tr);
      }
    }

    return { breakdown, e1rm, zones };
  }

  function openCalculatorDialog(initialKg = 60, initialReps = 12) {
    const dialog = document.getElementById('calc-dialog');
    const targetInput = document.getElementById('calc-target-kg');
    const repsInput = document.getElementById('calc-reps-done');

    if (targetInput && typeof initialKg === 'number') {
      targetInput.value = String(initialKg);
    }
    if (repsInput && typeof initialReps === 'number') {
      repsInput.value = String(initialReps);
    }

    renderCalculatorModal();
    if (dialog && typeof dialog.showModal === 'function') {
      dialog.showModal();
    }
  }

  function toggleWarmupStep(dayId, stepId) {
    if (!state.warmupByDay || typeof state.warmupByDay !== 'object') {
      state.warmupByDay = {};
    }
    if (!state.warmupByDay[dayId]) {
      state.warmupByDay[dayId] = {};
    }
    const nextVal = !state.warmupByDay[dayId][stepId];
    state.warmupByDay[dayId][stepId] = nextVal;
    if (nextVal) triggerHaptic([35]);
    saveState();
    renderWarmupChecklist();
  }

  function completeAllWarmupSteps(dayId) {
    const day = state.schedule[dayId];
    if (!day || !GYM_VISUALS || typeof GYM_VISUALS.getWarmupProtocolForDay !== 'function') return;
    const steps = GYM_VISUALS.getWarmupProtocolForDay(day);
    if (!state.warmupByDay || typeof state.warmupByDay !== 'object') {
      state.warmupByDay = {};
    }
    state.warmupByDay[dayId] = {};
    for (const s of steps) {
      state.warmupByDay[dayId][s.id] = true;
    }
    triggerHaptic([50, 40, 50]);
    saveState();
    renderWarmupChecklist();
    showCelebrationToast('🔥 ¡Calentamiento articular completado! Listo para tus series efectivas.');
  }

  function renderWarmupChecklist() {
    const card = document.getElementById('warmup-checklist-card');
    const titleEl = document.getElementById('warmup-title-text');
    const pillEl = document.getElementById('warmup-progress-pill');
    const listEl = document.getElementById('warmup-steps-list');
    if (!card || !listEl || !GYM_VISUALS || typeof GYM_VISUALS.getWarmupProtocolForDay !== 'function') return;

    const dayId = state.selectedDay;
    const day = state.schedule[dayId];
    if (!day || day.exercises.length === 0) {
      card.hidden = true;
      return;
    }
    card.hidden = false;

    const steps = GYM_VISUALS.getWarmupProtocolForDay(day);
    const dayWarmupMap = (state.warmupByDay && state.warmupByDay[dayId]) || {};
    let doneCount = 0;

    listEl.innerHTML = '';
    for (const step of steps) {
      const isDone = Boolean(dayWarmupMap[step.id]);
      if (isDone) doneCount += 1;

      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'warmup-step-btn';
      btn.dataset.stepId = step.id;
      btn.setAttribute('aria-pressed', isDone ? 'true' : 'false');
      btn.innerHTML = `
        <span>${isDone ? '✅' : '⬜'} ${step.label}</span>
        <strong>${step.duration}</strong>
      `;
      btn.addEventListener('click', () => toggleWarmupStep(dayId, step.id));
      li.appendChild(btn);
      listEl.appendChild(li);
    }

    if (titleEl) {
      titleEl.textContent = `Calentamiento Articular (${day.muscleGroup.split('·')[0].trim()}) · 5 min`;
    }
    if (pillEl) {
      pillEl.textContent = `${doneCount} / ${steps.length} listos`;
      pillEl.classList.toggle('is-done', doneCount === steps.length);
    }
  }

  function renderProgressionHistory() {
    const prList = document.getElementById('pr-history-list');
    if (!prList) return;
    prList.innerHTML = '';

    const records = Array.isArray(state.progressionHistory) ? state.progressionHistory : [];
    if (records.length === 0) {
      // Mostrar resumen base de las 3 marcas iniciales del usuario con su 1RM estimado
      const lunesEx = state.schedule.lunes?.exercises || [];
      const baseItems = lunesEx.filter(e => e.userBase);
      for (const ex of baseItems) {
        const e1rm = GYM_VISUALS && typeof GYM_VISUALS.calculateE1RM === 'function'
          ? GYM_VISUALS.calculateE1RM(ex.loadType, ex.loadValue, ex.reps)
          : 0;
        const unitLabel = ex.loadType === 'nivel' ? `Nivel ${ex.loadValue}` : `${ex.loadValue} kg`;
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
          <div>
            <strong>★ Base: ${ex.name}</strong>
            <div><small>Marca inicial configurada (${ex.sets} × ${ex.reps} reps)</small></div>
          </div>
          <div>
            <strong>${unitLabel}</strong> · <span>1RM Est: ${e1rm} kg</span>
          </div>
        `;
        prList.appendChild(li);
      }
      return;
    }

    for (const item of records) {
      const li = document.createElement('li');
      li.className = 'history-item';
      const dateStr = new Date(item.dateISO).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
      li.innerHTML = `
        <div>
          <strong>📈 ${item.exerciseName} (${item.dayName})</strong>
          <div><small>${dateStr} · Subida: ${item.prevLabel} → ${item.unitLabel}</small></div>
        </div>
        <div>
          <strong>${item.unitLabel}</strong> · <span>1RM Est: ${item.e1rmKg} kg</span>
        </div>
      `;
      prList.appendChild(li);
    }
  }

  function renderExercisesList() {
    const listEl = document.getElementById('exercises-list');
    const headingEl = document.getElementById('exercises-heading');
    if (!listEl) return;
    listEl.innerHTML = '';

    const query = (state.searchQuery || '').trim().toLowerCase();

    if (query) {
      if (headingEl) {
        headingEl.textContent = `Resultados de búsqueda para "${state.searchQuery}"`;
      }
      let matches = 0;
      for (const dayKey of DAYS_ORDER) {
        const day = state.schedule[dayKey];
        for (const ex of day.exercises) {
          const haystack = `${day.dayName} ${ex.name} ${ex.muscle} ${ex.equipment} ${ex.note}`.toLowerCase();
          if (haystack.includes(query)) {
            matches += 1;
            const card = createExerciseCard(dayKey, ex);
            listEl.appendChild(card);
          }
        }
      }
      if (matches === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.className = 'empty-day-box';
        emptyLi.innerHTML = '<h3>Sin coincidencias</h3><p>No se encontraron ejercicios con ese término.</p>';
        listEl.appendChild(emptyLi);
      }
      return;
    }

    const currentDay = state.schedule[state.selectedDay];
    if (!currentDay) return;

    if (headingEl) {
      headingEl.textContent = `Ejercicios de ${currentDay.dayName} (Estándar 4 series × 12 reps)`;
    }

    if (currentDay.exercises.length === 0) {
      const emptyLi = document.createElement('li');
      emptyLi.className = 'empty-day-box';

      if (currentDay.status === 'skipped_to_sunday') {
        const h3 = document.createElement('h3');
        h3.textContent = `📅 Día reprogramado al Domingo`;
        const p = document.createElement('p');
        p.textContent = `Marcaste que el ${currentDay.dayName} no se entrenará. Tu rutina completa te espera en la pestaña del Domingo.`;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'quick-import-days';

        const btnGoSun = document.createElement('button');
        btnGoSun.type = 'button';
        btnGoSun.className = 'btn-primary';
        btnGoSun.textContent = 'Ir a la rutina en Domingo →';
        btnGoSun.addEventListener('click', () => {
          state.selectedDay = 'domingo';
          saveState();
          renderAll();
        });

        const btnRevert = document.createElement('button');
        btnRevert.type = 'button';
        btnRevert.className = 'btn-secondary';
        btnRevert.textContent = 'Revertir y entrenar hoy';
        btnRevert.addEventListener('click', () => revertSkippedDay(state.selectedDay));

        actionsDiv.append(btnGoSun, btnRevert);
        emptyLi.append(h3, p, actionsDiv);
      } else {
        const h3 = document.createElement('h3');
        h3.textContent = '🌿 Domingo Libre / Día Comodín de Recuperación';
        const p = document.createElement('p');
        p.textContent =
          'Si algún día de Lunes a Sábado no pudiste entrenar, puedes trasladar su rutina aquí al Domingo con un toque:';

        const quickWrap = document.createElement('div');
        quickWrap.className = 'quick-import-days';

        for (const dayKey of DAYS_ORDER.slice(0, 6)) {
          const d = state.schedule[dayKey];
          if (d.exercises.length > 0) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn-secondary';
            btn.textContent = `Traer ${d.dayName} (${d.title})`;
            btn.addEventListener('click', () => moveDayToSunday(dayKey));
            quickWrap.appendChild(btn);
          }
        }
        emptyLi.append(h3, p, quickWrap);
      }

      listEl.appendChild(emptyLi);
      return;
    }

    for (const ex of currentDay.exercises) {
      listEl.appendChild(createExerciseCard(state.selectedDay, ex));
    }
  }

  function renderAnalyticsDashboard() {
    if (!GYM_VISUALS) return;
    const data = GYM_VISUALS.computeAnalytics(state.schedule, DAYS_ORDER);

    const kpiDoneKg = document.getElementById('kpi-done-kg');
    const kpiPlannedKg = document.getElementById('kpi-planned-kg');
    const kpiDoneReps = document.getElementById('kpi-done-reps');
    const kpiPlannedReps = document.getElementById('kpi-planned-reps');
    const kpiKcal = document.getElementById('kpi-kcal');
    const kpiSessions = document.getElementById('kpi-sessions-count');

    if (kpiDoneKg) kpiDoneKg.textContent = `${data.completedWeeklyVolumeKg} kg`;
    if (kpiPlannedKg) kpiPlannedKg.textContent = `de ${data.totalWeeklyVolumeKg} kg programados`;
    if (kpiDoneReps) kpiDoneReps.textContent = String(data.totalRepsDone);
    if (kpiPlannedReps) kpiPlannedReps.textContent = `de ${data.totalRepsPlanned} reps (4×12)`;
    if (kpiKcal) kpiKcal.textContent = `${data.estimatedKcal} kcal`;
    if (kpiSessions) kpiSessions.textContent = String((state.history || []).length);

    // 1. Renderizar Gráfico de Barras Diario
    const barsChart = document.getElementById('daily-bars-chart');
    if (barsChart) {
      barsChart.innerHTML = '';
      for (const dayInfo of data.perDay) {
        const col = document.createElement('div');
        col.className = 'bar-col';
        if (dayInfo.doneSets === 0 && dayInfo.plannedSets > 0) {
          col.classList.add('is-planned-only');
        }

        const pct =
          dayInfo.plannedSets > 0
            ? dayInfo.doneSets > 0
              ? Math.round((dayInfo.doneSets / dayInfo.plannedSets) * 100)
              : 18
            : 0;

        const valSpan = document.createElement('span');
        valSpan.className = 'bar-val';
        valSpan.textContent = `${dayInfo.doneSets}/${dayInfo.plannedSets}`;

        const track = document.createElement('div');
        track.className = 'bar-track';

        const fill = document.createElement('div');
        fill.className = 'bar-fill';
        fill.style.setProperty('--bar-pct', `${pct}%`);
        track.appendChild(fill);

        const daySpan = document.createElement('span');
        daySpan.className = 'bar-day';
        daySpan.textContent = dayInfo.shortName;

        col.append(valSpan, track, daySpan);
        col.addEventListener('click', () => {
          state.selectedDay = dayInfo.id;
          saveState();
          renderAll();
        });
        barsChart.appendChild(col);
      }
    }

    // 2. Renderizar Donut Chart (conic-gradient) + Tabla Semántica Accesible
    const donutEl = document.getElementById('muscle-donut-chart');
    const centerTotalEl = document.getElementById('donut-center-total');
    const tbodyEl = document.getElementById('muscle-stats-tbody');

    const entries = Object.entries(data.muscleMap);
    const totalPlannedSets = entries.reduce((acc, [, item]) => acc + item.sets, 0) || 1;

    if (centerTotalEl) {
      centerTotalEl.textContent = String(totalPlannedSets);
    }

    if (donutEl) {
      let accPct = 0;
      const stops = [];
      for (const [, item] of entries) {
        const slicePct = (item.sets / totalPlannedSets) * 100;
        const start = accPct.toFixed(1);
        accPct += slicePct;
        const end = accPct.toFixed(1);
        stops.push(`${item.color} ${start}% ${end}%`);
      }
      donutEl.style.background = `conic-gradient(${stops.join(', ')})`;
    }

    if (tbodyEl) {
      tbodyEl.innerHTML = '';
      for (const [groupName, item] of entries) {
        const tr = document.createElement('tr');
        const tdName = document.createElement('td');
        const dot = document.createElement('span');
        dot.className = 'swatch-dot';
        dot.style.setProperty('--swatch-color', item.color);
        tdName.append(dot, document.createTextNode(groupName));

        const tdDone = document.createElement('td');
        tdDone.textContent = `${item.completedSets}`;

        const tdTarget = document.createElement('td');
        tdTarget.textContent = `${item.sets} series`;

        tr.append(tdName, tdDone, tdTarget);
        tbodyEl.appendChild(tr);
      }
    }

    // 3. Renderizar Historial de Entrenamientos
    const historyList = document.getElementById('workout-history-list');
    if (historyList) {
      historyList.innerHTML = '';
      if (!state.history || state.history.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.className = 'history-item';
        emptyLi.textContent = 'Aún no has guardado sesiones. Pulsa "🏆 Registrar Sesión" al finalizar tu día.';
        historyList.appendChild(emptyLi);
      } else {
        for (const item of state.history) {
          const li = document.createElement('li');
          li.className = 'history-item';
          const dateStr = new Date(item.dateISO).toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          });
          const durBadge = item.durationText ? ` · ⏱️ ${item.durationText}` : '';
          const noteLine = item.sessionNote ? `<div><small>📝 ${item.sessionNote}</small></div>` : '';
          li.innerHTML = `
            <div>
              <strong>${item.dayName}: ${item.title}</strong>
              <div><small>${dateStr}${durBadge}</small></div>
              ${noteLine}
            </div>
            <div>
              <strong>${item.setsDone}/${item.setsPlanned} series</strong> · <span>${item.volumeKg} kg</span>
            </div>
          `;
          historyList.appendChild(li);
        }
      }
    }
  }

  function renderWeeklyMatrix() {
    const grid = document.getElementById('weekly-matrix-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (const dayKey of DAYS_ORDER) {
      const day = state.schedule[dayKey];
      const card = document.createElement('div');
      card.className = 'matrix-day-card';

      const header = document.createElement('div');
      header.className = 'matrix-day-header';

      const strong = document.createElement('strong');
      strong.textContent = day.dayName;

      const statusSpan = document.createElement('span');
      statusSpan.className = 'matrix-day-status';
      statusSpan.textContent =
        day.status === 'skipped_to_sunday'
          ? 'Movido a Dom'
          : day.exercises.length === 0
            ? 'Descanso'
            : `${day.exercises.length} ejercicios`;

      header.append(strong, statusSpan);

      const titleDiv = document.createElement('div');
      titleDiv.className = 'matrix-day-title';
      titleDiv.textContent = day.title;

      const countDiv = document.createElement('div');
      countDiv.className = 'matrix-day-ex-count';
      if (day.exercises.length > 0) {
        const previewNames = day.exercises
          .slice(0, 2)
          .map(e => e.name)
          .join(' · ');
        countDiv.textContent = previewNames;
      } else {
        countDiv.textContent = 'Disponible para excepciones';
      }

      card.append(header, titleDiv, countDiv);
      card.addEventListener('click', () => {
        state.selectedDay = dayKey;
        saveState();
        renderAll();
      });

      grid.appendChild(card);
    }
  }

  // Módulo Master: Sustitución Inteligente ("Máquina Ocupada") y Alternativas Biomecánicas
  let currentSwapTarget = { dayId: null, exerciseId: null };

  function swapExerciseAlternative(dayId, exerciseId, chosenAlt = null) {
    const day = state.schedule[dayId];
    if (!day) return null;
    const ex = day.exercises.find(e => e.id === exerciseId);
    if (!ex) return null;

    if (!chosenAlt && ex.isSwappedAlternative && ex.originalSnapshot) {
      ex.name = ex.originalSnapshot.name;
      ex.equipment = ex.originalSnapshot.equipment;
      ex.spriteType = ex.originalSnapshot.spriteType;
      ex.note = ex.originalSnapshot.note;
      ex.isSwappedAlternative = false;
      delete ex.originalSnapshot;
      triggerHaptic([35]);
      saveState();
      renderExercisesList();
      if (state.activeScreen === 'workout') {
        renderWorkoutFocusScreen();
      }
      showCelebrationToast(`↩️ Ejercicio restaurado: ${ex.name}`);
      return ex;
    }

    const detectedKey = GYM_VISUALS ? GYM_VISUALS.detectExerciseAnimationType(ex) : 'back_row_seated';
    let altMeta = chosenAlt;

    if (!altMeta) {
      if (GYM_VISUALS && typeof GYM_VISUALS.getExerciseAlternatives === 'function') {
        const alts = GYM_VISUALS.getExerciseAlternatives(ex);
        if (alts && alts.length > 0) {
          const first = alts[0];
          altMeta = {
            altName: first.name,
            altEquipment: first.equipment,
            altSpriteType: first.spriteType,
            altNote: first.reason
          };
        }
      }
      if (!altMeta && GYM_VISUALS && GYM_VISUALS.EXERCISE_ALTERNATIVES_MAP) {
        altMeta = GYM_VISUALS.EXERCISE_ALTERNATIVES_MAP[detectedKey] ||
          GYM_VISUALS.EXERCISE_ALTERNATIVES_MAP.back_row_seated;
      }
    }

    if (!altMeta) return null;

    if (!ex.originalSnapshot) {
      ex.originalSnapshot = {
        name: ex.name,
        equipment: ex.equipment,
        spriteType: ex.spriteType || detectedKey,
        note: ex.note
      };
    }

    ex.name = altMeta.altName || altMeta.name;
    ex.equipment = altMeta.altEquipment || altMeta.equipment;
    ex.spriteType = altMeta.altSpriteType || altMeta.spriteType;
    ex.note = altMeta.altNote || altMeta.reason || ex.note;
    ex.isSwappedAlternative = true;

    triggerHaptic([45, 35]);
    saveState();
    renderExercisesList();
    if (state.activeScreen === 'workout') {
      renderWorkoutFocusScreen();
    }
    showCelebrationToast(`🔄 Alternativa activada: ${ex.name}`);
    return ex;
  }

  function openExerciseSwapModal(dayId, exerciseId) {
    const day = state.schedule[dayId];
    if (!day) return;
    const ex = day.exercises.find(e => e.id === exerciseId);
    if (!ex) return;

    currentSwapTarget = { dayId, exerciseId };
    const dialog = document.getElementById('exercise-swap-dialog');
    const nameEl = document.getElementById('swap-current-name');
    const metaEl = document.getElementById('swap-current-meta');
    const listEl = document.getElementById('swap-alternatives-list');
    const btnRestore = document.getElementById('btn-restore-swap-original');

    if (nameEl) nameEl.textContent = ex.name;
    if (metaEl) {
      const loadStr = ex.loadType === 'nivel' ? `Nivel ${ex.loadValue}` : `${ex.loadValue} kg`;
      metaEl.textContent = `${ex.sets || 4} × ${ex.reps || 12} reps · ${loadStr} · ${ex.equipment || 'Máquina'}`;
    }

    if (btnRestore) {
      btnRestore.hidden = !Boolean(ex.isSwappedAlternative && ex.originalSnapshot);
    }

    if (listEl) {
      listEl.innerHTML = '';
      const alts = (GYM_VISUALS && typeof GYM_VISUALS.getExerciseAlternatives === 'function')
        ? GYM_VISUALS.getExerciseAlternatives(ex)
        : [];

      const categoryLabels = {
        cable: { badge: '🟡 Polea / Cable', cls: 'cat-cable' },
        machine: { badge: '🔴 Máquina Guiada', cls: 'cat-machine' },
        free_weight: { badge: '🟢 Peso Libre / Mancuerna', cls: 'cat-freeweight' }
      };

      if (alts.length === 0) {
        listEl.innerHTML = '<p class="swap-empty">No se encontraron alternativas directas para este movimiento.</p>';
      } else {
        alts.forEach(alt => {
          const catInfo = categoryLabels[alt.category] || { badge: '⚡ Alternativa', cls: 'cat-generic' };
          const card = document.createElement('div');
          card.className = `swap-card ${catInfo.cls}`;
          card.innerHTML = `
            <div class="swap-card-top">
              <span class="swap-badge ${catInfo.cls}">${catInfo.badge}</span>
              <span class="swap-equip">${alt.equipment}</span>
            </div>
            <h4 class="swap-name">${alt.name}</h4>
            <p class="swap-reason">${alt.reason}</p>
            <div class="swap-card-footer">
              <button type="button" class="btn-primary btn-apply-this-swap">⚡ Usar este Ejercicio</button>
            </div>
          `;
          card.querySelector('.btn-apply-this-swap').addEventListener('click', () => {
            swapExerciseAlternative(dayId, exerciseId, alt);
            if (dialog && typeof dialog.close === 'function') {
              dialog.close();
            }
          });
          listEl.appendChild(card);
        });
      }
    }

    if (dialog && typeof dialog.showModal === 'function') {
      try {
        dialog.showModal();
      } catch (_) {}
    }
  }

  // Módulo de Onboarding y Perfil Biométrico Dinámico
  function getUserProfile() {
    return deepClone(state.userProfile);
  }

  function updateProfilePreviewFromInputs() {
    const previewEl = document.getElementById('profile-preview-text');
    if (!previewEl) return;

    const gender = document.getElementById('profile-gender-select')?.value || 'male';
    const weight = Number(document.getElementById('profile-weight-input')?.value) || 75;
    const height = Number(document.getElementById('profile-height-input')?.value) || 175;
    const level = document.getElementById('profile-level-select')?.value || 'intermediate';
    const goal = document.getElementById('profile-goal-select')?.value || 'hypertrophy';
    const days = Number(document.getElementById('profile-days-select')?.value) || 6;

    const heightM = height / 100;
    const bmi = (weight / (heightM * heightM)).toFixed(1);

    const goalDescriptions = {
      hypertrophy: '4 series × 10-12 reps · 75s descanso (Volumen óptimo y congestión)',
      strength: '4-5 series × 6-8 reps · 90-120s descanso (Alta tensión mecánica y fuerza)',
      fat_loss: '3-4 series × 12-15 reps · 60s descanso (Densidad metabólica y definición)',
      health: '3 series × 12-15 reps · 60-75s descanso (Acondicionamiento y longevidad)'
    };

    const levelDescriptions = {
      beginner: 'Principiante: RIR 3-4 (Cargas controladas al 72% para asimilar patrones)',
      intermediate: 'Intermedio: RIR 1-2 (Cargas base 100% con sobrecarga progresiva)',
      advanced: 'Avanzado: RIR 0-1 (Cargas altas 125% cerca del fallo muscular)'
    };

    const genderText = gender === 'female' ? 'Mujer' : 'Hombre';
    previewEl.innerHTML = `
      <strong>Perfil:</strong> ${genderText}, ${weight} kg, ${height} cm (IMC ${bmi}).<br>
      <strong>Intensidad:</strong> ${levelDescriptions[level] || levelDescriptions.intermediate}.<br>
      <strong>Objetivo:</strong> ${goalDescriptions[goal] || goalDescriptions.hypertrophy}.<br>
      <strong>Frecuencia:</strong> ${days} días/semana con acomodación inteligente ante imprevistos.
    `;
  }

  function openProfileOnboardingDialog(isFirstTime = false) {
    const dialog = document.getElementById('profile-onboarding-dialog');
    if (!dialog) return;

    const p = state.userProfile || {};
    const nameInput = document.getElementById('profile-name-input');
    const genderSelect = document.getElementById('profile-gender-select');
    const ageInput = document.getElementById('profile-age-input');
    const weightInput = document.getElementById('profile-weight-input');
    const heightInput = document.getElementById('profile-height-input');
    const levelSelect = document.getElementById('profile-level-select');
    const goalSelect = document.getElementById('profile-goal-select');
    const daysSelect = document.getElementById('profile-days-select');
    const limitsSelect = document.getElementById('profile-limitations-select');
    const btnCancel = document.getElementById('btn-cancel-profile');

    if (nameInput) nameInput.value = p.name || 'Atleta';
    if (genderSelect) genderSelect.value = p.gender || 'male';
    if (ageInput) ageInput.value = p.age || 28;
    if (weightInput) weightInput.value = p.weightKg || 75;
    if (heightInput) heightInput.value = p.heightCm || 175;
    if (levelSelect) levelSelect.value = p.fitnessLevel || 'intermediate';
    if (goalSelect) goalSelect.value = p.primaryGoal || 'hypertrophy';
    if (daysSelect) daysSelect.value = String(p.daysPerWeek || 6);
    if (limitsSelect) limitsSelect.value = p.limitations || 'none';

    if (btnCancel) {
      btnCancel.hidden = Boolean(isFirstTime && !p.configured);
    }

    updateProfilePreviewFromInputs();

    if (typeof dialog.showModal === 'function') {
      try {
        dialog.showModal();
      } catch (_) {}
    }
  }

  function saveUserProfile(profileData) {
    state.userProfile = {
      configured: true,
      name: (profileData.name || 'Atleta').trim(),
      gender: profileData.gender || 'male',
      age: Number(profileData.age) || 28,
      weightKg: Number(profileData.weightKg) || 75,
      heightCm: Number(profileData.heightCm) || 175,
      fitnessLevel: profileData.fitnessLevel || 'intermediate',
      primaryGoal: profileData.primaryGoal || 'hypertrophy',
      daysPerWeek: Number(profileData.daysPerWeek) || 6,
      limitations: profileData.limitations || 'none',
      updatedAt: new Date().toISOString()
    };

    if (GYM_VISUALS && typeof GYM_VISUALS.generatePersonalizedSchedule === 'function') {
      state.schedule = GYM_VISUALS.generatePersonalizedSchedule(state.userProfile, GYM_DATA.INITIAL_SCHEDULE);
    }

    saveState();
    renderAll();
    triggerHaptic([60, 40, 80]);
    showCelebrationToast(`🎯 Rutina personalizada generada para ${state.userProfile.name}`);
    return state.userProfile;
  }

  function renderUserProfileSummary() {
    const p = state.userProfile;
    const headerTag = document.getElementById('header-profile-tag');
    if (headerTag) {
      if (p && p.configured) {
        const levelEmoji = p.fitnessLevel === 'beginner' ? '🟢' : p.fitnessLevel === 'advanced' ? '🔴' : '🟡';
        headerTag.textContent = `${levelEmoji} ${p.name || 'Atleta'} (${p.weightKg || 75}kg)`;
        headerTag.title = `Perfil activo: ${p.primaryGoal} · ${p.fitnessLevel}`;
      } else {
        headerTag.textContent = '⚙️ Configurar Perfil';
      }
    }

    const summaryEl = document.getElementById('profile-card-summary');
    if (!summaryEl) return;

    if (!p || !p.configured) {
      summaryEl.innerHTML = `
        <div class="profile-empty-state">
          <p>⚠️ Aún no has configurado tu perfil biométrico inicial.</p>
          <button type="button" id="btn-quick-onboarding" class="btn-primary" style="margin-top: 8px;">
            🚀 Configurar mi Perfil Ahora
          </button>
        </div>
      `;
      document.getElementById('btn-quick-onboarding')?.addEventListener('click', () => {
        openProfileOnboardingDialog(false);
      });
      return;
    }

    const heightM = (p.heightCm || 175) / 100;
    const bmi = ((p.weightKg || 75) / (heightM * heightM)).toFixed(1);
    const genderLabel = p.gender === 'female' ? 'Mujer' : 'Hombre';
    const goalLabels = {
      hypertrophy: '💪 Hipertrofia Muscular',
      strength: '🏋️ Fuerza Máxima y Potencia',
      fat_loss: '🔥 Definición y Pérdida Grasa',
      health: '🧘 Salud y Acondicionamiento'
    };
    const levelLabels = {
      beginner: '🟢 Principiante (RIR 3-4)',
      intermediate: '🟡 Intermedio (RIR 1-2)',
      advanced: '🔴 Avanzado (RIR 0-1)'
    };
    const limitLabels = {
      none: 'Ninguna (100% móvil)',
      lower_back: 'Espalda baja protegida',
      shoulders: 'Hombros protegidos',
      knees: 'Rodillas protegidas'
    };

    summaryEl.innerHTML = `
      <div class="profile-summary-grid">
        <div class="profile-metric-tile">
          <span class="pm-label">Atleta</span>
          <strong class="pm-val">${p.name || 'Atleta'} (${genderLabel})</strong>
        </div>
        <div class="profile-metric-tile">
          <span class="pm-label">Biometría</span>
          <strong class="pm-val">${p.weightKg} kg · ${p.heightCm} cm · ${p.age} años</strong>
          <small class="pm-sub">IMC: ${bmi}</small>
        </div>
        <div class="profile-metric-tile">
          <span class="pm-label">Nivel & RIR</span>
          <strong class="pm-val">${levelLabels[p.fitnessLevel] || p.fitnessLevel}</strong>
        </div>
        <div class="profile-metric-tile">
          <span class="pm-label">Objetivo</span>
          <strong class="pm-val">${goalLabels[p.primaryGoal] || p.primaryGoal}</strong>
        </div>
        <div class="profile-metric-tile">
          <span class="pm-label">Frecuencia</span>
          <strong class="pm-val">${p.daysPerWeek} días semanales</strong>
        </div>
        <div class="profile-metric-tile">
          <span class="pm-label">Cuidado Articular</span>
          <strong class="pm-val">${limitLabels[p.limitations] || 'Estándar'}</strong>
        </div>
      </div>
    `;
  }

  function accommodateMissedDayAction(missedDayKey, strategyKey) {
    if (!GYM_VISUALS || typeof GYM_VISUALS.accommodateMissedDay !== 'function') {
      showCelebrationToast('⚠️ Módulo de acomodación no disponible');
      return;
    }
    const result = GYM_VISUALS.accommodateMissedDay(state.schedule, missedDayKey, strategyKey);
    if (result && result.schedule) {
      state.schedule = result.schedule;
    }
    saveState();
    renderExercisesList();
    renderDayTabs();
    if (state.activeScreen === 'workout') {
      renderWorkoutFocusScreen();
    }
    triggerHaptic([50, 40, 50]);
    showCelebrationToast(result.message);
  }

  function toggleDeloadMode(forceState) {
    const nextState = typeof forceState === 'boolean' ? forceState : !state.deloadModeActive;
    if (nextState === state.deloadModeActive) return state.deloadModeActive;

    state.deloadModeActive = nextState;
    for (const dayKey of DAYS_ORDER) {
      const day = state.schedule[dayKey];
      for (const ex of day.exercises) {
        if (nextState) {
          ex.preDeloadSnapshot = {
            loadValue: ex.loadValue,
            targetRir: ex.targetRir || 'RIR 2'
          };
          if (ex.loadType === 'nivel') {
            ex.loadValue = Math.max(1, Math.round(Number(ex.loadValue) * 0.8));
          } else {
            ex.loadValue = Math.max(2.5, Math.round(Number(ex.loadValue) * 0.8 * 2) / 2);
          }
          ex.targetRir = 'RIR 3';
        } else if (ex.preDeloadSnapshot) {
          ex.loadValue = ex.preDeloadSnapshot.loadValue;
          ex.targetRir = ex.preDeloadSnapshot.targetRir;
          delete ex.preDeloadSnapshot;
        }
      }
    }

    triggerHaptic([50, 40]);
    saveState();
    renderAll();
    showCelebrationToast(
      state.deloadModeActive
        ? '🛡️ Modo Semana de Descarga activo (-20% carga y RIR 3 para recuperación articular)'
        : '🔥 Modo Intensidad Normal restaurado (100% de tus cargas titulares)'
    );
    return state.deloadModeActive;
  }

  // Módulo Master: Nutrición Deportiva, Macros, Agua y Suplementación
  function getLatestUserBodyWeight() {
    if (Array.isArray(state.bodyMetrics) && state.bodyMetrics.length > 0) {
      return Number(state.bodyMetrics[0].weightKg) || 74.5;
    }
    const inputEl = document.getElementById('body-weight-kg');
    return Number(inputEl?.value) || 74.5;
  }

  function setNutritionGoal(goalKey) {
    if (!state.nutrition || typeof state.nutrition !== 'object') {
      state.nutrition = { goal: 'hipertrofia', waterMl: 0, creatineTaken: false, postProteinTaken: false };
    }
    state.nutrition.goal = goalKey;
    saveState();
    renderNutritionDashboard();
    return state.nutrition;
  }

  function addHydrationWater(deltaMl) {
    if (!state.nutrition || typeof state.nutrition !== 'object') {
      state.nutrition = { goal: 'hipertrofia', waterMl: 0, creatineTaken: false, postProteinTaken: false };
    }
    state.nutrition.waterMl = Math.max(0, Math.min(6000, (Number(state.nutrition.waterMl) || 0) + Number(deltaMl)));
    triggerHaptic([30]);
    saveState();
    renderNutritionDashboard();
    renderGamificationDashboard();
    return state.nutrition.waterMl;
  }

  function resetHydrationWater() {
    if (state.nutrition) {
      state.nutrition.waterMl = 0;
      saveState();
      renderNutritionDashboard();
      renderGamificationDashboard();
    }
  }

  function toggleSupplementCheck(field) {
    if (!state.nutrition || typeof state.nutrition !== 'object') {
      state.nutrition = { goal: 'hipertrofia', waterMl: 0, creatineTaken: false, postProteinTaken: false };
    }
    state.nutrition[field] = !state.nutrition[field];
    triggerHaptic([35]);
    saveState();
    renderNutritionDashboard();
    return state.nutrition[field];
  }

  function renderNutritionDashboard() {
    if (!GYM_VISUALS || typeof GYM_VISUALS.calculateNutritionPlan !== 'function') return null;
    const weightKg = getLatestUserBodyWeight();
    const goalKey = state.nutrition?.goal || 'hipertrofia';
    const currentDay = state.schedule[state.selectedDay];
    const workoutMins = currentDay?.estimatedMinutes || 60;

    const plan = GYM_VISUALS.calculateNutritionPlan(weightKg, goalKey, workoutMins);

    const goalSelect = document.getElementById('nutrition-goal-select');
    if (goalSelect && goalSelect.value !== goalKey) {
      goalSelect.value = goalKey;
    }

    const kcalEl = document.getElementById('macro-kcal-val');
    const weightRefEl = document.getElementById('macro-weight-ref');
    const protEl = document.getElementById('macro-protein-val');
    const carbsEl = document.getElementById('macro-carbs-val');
    const fatEl = document.getElementById('macro-fat-val');
    const preTipEl = document.getElementById('nutrition-pre-tip');
    const postTipEl = document.getElementById('nutrition-post-tip');

    if (kcalEl) kcalEl.textContent = `${plan.targetKcal} kcal`;
    if (weightRefEl) weightRefEl.textContent = `Base: ${plan.weightKg} kg`;
    if (protEl) protEl.textContent = `${plan.proteinGrams} g`;
    if (carbsEl) carbsEl.textContent = `${plan.carbsGrams} g`;
    if (fatEl) fatEl.textContent = `${plan.fatGrams} g`;
    if (preTipEl) preTipEl.textContent = plan.preWorkoutTip;
    if (postTipEl) postTipEl.textContent = plan.postWorkoutTip;

    const waterMl = Number(state.nutrition?.waterMl) || 0;
    const waterPct = Math.min(100, Math.round((waterMl / plan.targetWaterMl) * 100));
    const waterLabelEl = document.getElementById('water-current-label');
    const waterFillEl = document.getElementById('water-progress-fill');
    if (waterLabelEl) {
      waterLabelEl.textContent = `${waterMl} / ${plan.targetWaterMl} ml consumidos (${waterPct}%)`;
    }
    if (waterFillEl) {
      waterFillEl.style.width = `${waterPct}%`;
    }

    const btnCreatine = document.getElementById('btn-toggle-creatine');
    if (btnCreatine) {
      const taken = Boolean(state.nutrition?.creatineTaken);
      btnCreatine.setAttribute('aria-pressed', taken ? 'true' : 'false');
      btnCreatine.textContent = `${taken ? '✅' : '⬜'} ⚡ Creatina Monohidrato (5g hoy)`;
    }

    const btnPostProt = document.getElementById('btn-toggle-post-protein');
    if (btnPostProt) {
      const taken = Boolean(state.nutrition?.postProteinTaken);
      btnPostProt.setAttribute('aria-pressed', taken ? 'true' : 'false');
      btnPostProt.textContent = `${taken ? '✅' : '⬜'} 🥤 Batido / Comida Post-Entreno Cumplida`;
    }

    return plan;
  }

  // Módulo Master: Gamificación, Heatmap de 28 días y Medallas Tácticas
  function renderGamificationDashboard() {
    if (!GYM_VISUALS || typeof GYM_VISUALS.evaluateAchievements !== 'function') return null;
    const analytics = GYM_VISUALS.computeAnalytics(state.schedule, DAYS_ORDER);
    const achievements = GYM_VISUALS.evaluateAchievements(state, analytics);
    const heatmap = GYM_VISUALS.buildConsistencyHeatmap(state, analytics);

    const streakEl = document.getElementById('streak-badge-pill');
    if (streakEl) {
      const unlockedCount = achievements.filter(a => a.unlocked).length;
      streakEl.textContent = `🔥 Racha: ${heatmap.streakWeeks} Sem. · 🏅 ${unlockedCount}/${achievements.length} Trofeos`;
    }

    const heatmapGrid = document.getElementById('consistency-heatmap-grid');
    if (heatmapGrid) {
      heatmapGrid.innerHTML = '';
      for (const cell of heatmap.cells) {
        const div = document.createElement('div');
        div.className = `heatmap-cell level-${cell.level} ${cell.isToday ? 'is-today' : ''}`;
        div.title = `${cell.dayLabel}: ${cell.level > 0 ? 'Día activo / entrenado' : 'Descanso / sin registro'}`;
        div.textContent = cell.dayLabel;
        heatmapGrid.appendChild(div);
      }
    }

    const achGrid = document.getElementById('achievements-grid');
    if (achGrid) {
      achGrid.innerHTML = '';
      for (const ach of achievements) {
        const card = document.createElement('div');
        card.className = `achievement-card ${ach.unlocked ? 'is-unlocked' : ''}`;
        card.dataset.badgeId = ach.id;
        card.innerHTML = `
          <span class="achievement-icon" aria-hidden="true">${ach.icon}</span>
          <div class="achievement-body">
            <strong>${ach.title}</strong>
            <p>${ach.desc}</p>
            <span class="achievement-status">${ach.unlocked ? '✓ DESBLOQUEADO' : '🔒 EN PROGRESO'} · ${ach.progressText}</span>
          </div>
        `;
        achGrid.appendChild(card);
      }
    }

    return { achievements, heatmap };
  }

  // Módulo Legend 1: Semáforo de Recuperación Muscular (24h/48h/72h) y Readiness Score
  function updateReadinessMetrics(partial = {}) {
    if (!state.readiness || typeof state.readiness !== 'object') {
      state.readiness = { sleepHours: 7.5, energyLevel: 4, domsLevel: 2 };
    }
    if (partial.sleepHours !== undefined) {
      state.readiness.sleepHours = Math.max(3, Math.min(12, Number(partial.sleepHours) || 7.5));
    }
    if (partial.energyLevel !== undefined) {
      state.readiness.energyLevel = Math.max(1, Math.min(5, Number(partial.energyLevel) || 4));
    }
    if (partial.domsLevel !== undefined) {
      state.readiness.domsLevel = Math.max(1, Math.min(5, Number(partial.domsLevel) || 2));
    }
    saveState();
    return renderRecoveryAndReadinessDashboard();
  }

  function renderRecoveryAndReadinessDashboard() {
    if (!GYM_VISUALS || typeof GYM_VISUALS.calculateReadinessAndMuscleRecovery !== 'function') return null;
    const analytics = GYM_VISUALS.computeAnalytics(state.schedule, DAYS_ORDER);
    const data = GYM_VISUALS.calculateReadinessAndMuscleRecovery(state, analytics);

    const sleepInput = document.getElementById('readiness-sleep-hours');
    const energySelect = document.getElementById('readiness-energy-level');
    const domsSelect = document.getElementById('readiness-doms-level');
    if (sleepInput && Number(sleepInput.value) !== data.sleepHours) {
      sleepInput.value = String(data.sleepHours);
    }
    if (energySelect && Number(energySelect.value) !== data.energyLevel) {
      energySelect.value = String(data.energyLevel);
    }
    if (domsSelect && Number(domsSelect.value) !== data.domsLevel) {
      domsSelect.value = String(data.domsLevel);
    }

    const pillEl = document.getElementById('readiness-score-pill');
    if (pillEl) {
      pillEl.textContent = `${data.statusBadge.split(' ')[0]} Readiness: ${data.readinessScore}% · ${data.statusBadge.replace(/^[^\s]+\s/, '')}`;
    }

    const recEl = document.getElementById('readiness-recommendation-text');
    if (recEl) {
      recEl.textContent = data.recommendation;
    }

    const gridEl = document.getElementById('muscle-recovery-grid');
    if (gridEl) {
      gridEl.innerHTML = '';
      for (const item of data.muscleRecoveryList) {
        const card = document.createElement('div');
        card.className = 'recovery-muscle-card';
        card.innerHTML = `
          <div class="recovery-muscle-top">
            <strong>${item.groupName}</strong>
            <span style="color: ${item.stateColor}; font-weight: 800;">${item.recoveryPct}%</span>
          </div>
          <div class="recovery-bar-track">
            <div class="recovery-bar-fill" style="width: ${item.recoveryPct}%; background: ${item.stateColor};"></div>
          </div>
          <div class="recovery-muscle-sub">
            <span>${item.stateLabel}</span>
            <strong>${item.completedSets}/${item.targetSets} series (${item.restWindow})</strong>
          </div>
        `;
        gridEl.appendChild(card);
      }
    }

    return data;
  }

  // Módulo Legend 2: Asistente de Doble Progresión Inteligente (1 toque al dominar 4×12)
  function getSmartProgressionSuggestions(dayId = state.selectedDay) {
    const day = state.schedule[dayId];
    if (!day || !Array.isArray(day.exercises)) return [];
    const suggestions = [];
    for (const ex of day.exercises) {
      const totalSets = Number(ex.sets) || 4;
      const doneCount = (ex.completedSets || []).filter(Boolean).length;
      if (doneCount === totalSets && totalSets > 0) {
        const nextLoadValue = ex.loadType === 'nivel' ? Number(ex.loadValue) + 1 : Number(ex.loadValue) + 2.5;
        suggestions.push({
          dayId,
          exerciseId: ex.id,
          exerciseName: ex.name,
          loadType: ex.loadType,
          currentLoad: ex.loadValue,
          suggestedLoad: nextLoadValue
        });
      }
    }
    return suggestions;
  }

  function applySmartProgressionSuggestion(dayId, exerciseId) {
    const day = state.schedule[dayId];
    if (!day) return null;
    const ex = day.exercises.find(e => e.id === exerciseId);
    if (!ex) return null;

    const prevLoad = Number(ex.loadValue) || 0;
    const nextLoad = ex.loadType === 'nivel' ? prevLoad + 1 : prevLoad + 2.5;
    ex.loadValue = nextLoad;

    const prEntry = recordProgressionEntry(dayId, ex, prevLoad, nextLoad);
    triggerHaptic([60, 40, 80]);
    saveState();
    renderAll();
    const label = ex.loadType === 'nivel' ? `Nivel ${nextLoad}` : `${nextLoad} kg`;
    showCelebrationToast(`🚀 ¡Doble Progresión Aplicada! ${ex.name} subió a ${label}`);
    return { exercise: ex, prEntry, nextLoad };
  }

  // Módulo Legend 3: Bitácora de Sensaciones y Exportación a Excel (.CSV)
  function setSessionJournalNote(noteText, dayId = state.selectedDay) {
    if (!state.journalNotesByDay || typeof state.journalNotesByDay !== 'object') {
      state.journalNotesByDay = {};
    }
    state.journalNotesByDay[dayId] = String(noteText || '');
    const inputEl = document.getElementById('session-journal-note');
    if (inputEl && inputEl.value !== state.journalNotesByDay[dayId]) {
      inputEl.value = state.journalNotesByDay[dayId];
    }
    saveState();
    return state.journalNotesByDay[dayId];
  }

  function exportWorkoutCsv() {
    if (!GYM_VISUALS || typeof GYM_VISUALS.generateCsvReportContent !== 'function') return '';
    const csvContent = GYM_VISUALS.generateCsvReportContent(state, DAYS_ORDER);
    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gym-rutinas-pro-reporte-${state.selectedDay}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (_) {
      // Ignore blob download restrictions in headless JSDOM
    }
    showCelebrationToast('📊 Reporte completo exportado en formato Excel (.CSV)');
    return csvContent;
  }

  // =========================================================================
  // Módulo Focus UI v1.8: Navegación Direccional Multi-Pantalla y Modo Entrenamiento Activo
  // =========================================================================
  const SCREENS_ORDER = ['plan', 'workout', 'stats', 'hub'];

  function navigateWithDirection(updateDOM, direction = 'forward') {
    if (typeof document === 'undefined' || typeof document.startViewTransition !== 'function') {
      updateDOM();
      return;
    }
    try {
      document.startViewTransition({
        update: updateDOM,
        types: [direction]
      });
    } catch (_) {
      updateDOM();
    }
  }

  function syncScreenVisibility() {
    const activeScreen = SCREENS_ORDER.includes(state.activeScreen) ? state.activeScreen : 'plan';
    const mainEl = document.getElementById('main-content');
    if (mainEl) {
      mainEl.dataset.activeScreen = activeScreen;
    }

    const isWorkout = activeScreen === 'workout';
    document.body.classList.toggle('in-workout-screen', isWorkout);

    document.querySelectorAll('[data-screen-panel]').forEach(panel => {
      const isCurrent = panel.dataset.screenPanel === activeScreen;
      panel.hidden = !isCurrent;
      panel.classList.toggle('is-active-screen', isCurrent);
    });

    document.querySelectorAll('#bottom-app-nav .bottom-nav-btn').forEach(btn => {
      const isCurrent = btn.dataset.navScreen === activeScreen;
      btn.classList.toggle('is-active', isCurrent);
      if (isCurrent) {
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.removeAttribute('aria-current');
      }
    });

    const dayTabsNav = document.getElementById('day-tabs-nav');
    if (dayTabsNav) {
      dayTabsNav.hidden = isWorkout;
    }

    const appHeader = document.querySelector('.app-header');
    if (appHeader) {
      appHeader.hidden = isWorkout;
    }

    const bottomNav = document.getElementById('bottom-app-nav');
    if (bottomNav) {
      bottomNav.hidden = isWorkout;
    }

    const appFooter = document.querySelector('.app-footer');
    if (appFooter) {
      appFooter.hidden = isWorkout;
    }
  }

  function switchAppScreen(targetScreen, options = {}) {
    if (!SCREENS_ORDER.includes(targetScreen)) return state.activeScreen;
    const prevIdx = SCREENS_ORDER.indexOf(state.activeScreen || 'plan');
    const nextIdx = SCREENS_ORDER.indexOf(targetScreen);
    const direction = nextIdx >= prevIdx ? 'forward' : 'backward';

    const performSwitch = () => {
      state.activeScreen = targetScreen;
      if (typeof options.exerciseIndex === 'number' && options.exerciseIndex >= 0) {
        state.activeExerciseIndex = options.exerciseIndex;
      }
      saveState();
      syncScreenVisibility();
      renderWorkoutFocusScreen();
    };

    if (options.instant) {
      performSwitch();
    } else {
      navigateWithDirection(performSwitch, direction);
    }
    return state.activeScreen;
  }

  function startDayWorkoutSession(dayId = state.selectedDay, exerciseIndex = null) {
    stopRestTimer();
    if (DAYS_ORDER.includes(dayId)) {
      state.selectedDay = dayId;
    }
    const day = state.schedule[state.selectedDay];
    const exercises = day?.exercises || [];

    let targetIdx = 0;
    if (typeof exerciseIndex === 'number' && exerciseIndex >= 0 && exerciseIndex < exercises.length) {
      targetIdx = exerciseIndex;
    } else {
      const firstIncomplete = exercises.findIndex(ex => {
        const total = Number(ex.sets) || 4;
        const done = (ex.completedSets || []).filter(Boolean).length;
        return done < total;
      });
      targetIdx = firstIncomplete >= 0 ? firstIncomplete : 0;
    }

    state.activeExerciseIndex = targetIdx;
    if (!stopwatchState.running) {
      startSessionStopwatch();
    }
    switchAppScreen('workout', { exerciseIndex: targetIdx, instant: true });
    renderAll();
    return {
      activeScreen: state.activeScreen,
      dayId: state.selectedDay,
      activeExerciseIndex: state.activeExerciseIndex,
      exercise: exercises[targetIdx] || null
    };
  }

  function exitWorkoutScreen() {
    stopRestTimer();
    switchAppScreen('plan', { instant: true });
    renderAll();
    return state.activeScreen;
  }

  function selectFocusExercise(index) {
    const day = state.schedule[state.selectedDay];
    const exercises = day?.exercises || [];
    if (exercises.length === 0) return null;
    const clamped = Math.max(0, Math.min(exercises.length - 1, Number(index) || 0));
    state.activeExerciseIndex = clamped;
    saveState();
    renderWorkoutFocusScreen();
    return exercises[clamped];
  }

  function renderWorkoutFocusScreen() {
    const day = state.schedule[state.selectedDay];
    const exercises = day?.exercises || [];
    const totalDaySets = exercises.reduce((acc, ex) => acc + (Number(ex.sets) || 4), 0);
    const doneDaySets = exercises.reduce((acc, ex) => acc + (ex.completedSets || []).filter(Boolean).length, 0);

    const dayProgressBadge = document.getElementById('focus-day-progress-badge');
    if (dayProgressBadge) {
      dayProgressBadge.textContent = `${doneDaySets} / ${totalDaySets} series`;
    }

    const dayNameLabel = document.getElementById('focus-day-name-label');
    if (dayNameLabel && day) {
      dayNameLabel.textContent = `${day.dayName.toUpperCase()} · ${day.muscleGroup.toUpperCase()}`;
    }

    const pillsContainer = document.getElementById('focus-stepper-pills');
    const counterLabel = document.getElementById('focus-ex-counter-label');
    const prevBtn = document.getElementById('btn-focus-prev-ex');
    const nextBtn = document.getElementById('btn-focus-next-ex');

    if (exercises.length === 0) {
      if (counterLabel) counterLabel.textContent = 'Día de Descanso / Sin ejercicios';
      if (pillsContainer) pillsContainer.innerHTML = '';
      return null;
    }

    if (state.activeExerciseIndex >= exercises.length || state.activeExerciseIndex < 0) {
      state.activeExerciseIndex = 0;
    }

    const idx = state.activeExerciseIndex;
    const ex = exercises[idx];

    if (counterLabel) {
      counterLabel.textContent = `Ejercicio ${idx + 1} de ${exercises.length}`;
    }
    if (prevBtn) prevBtn.disabled = idx <= 0;
    if (nextBtn) nextBtn.disabled = idx >= exercises.length - 1;

    if (pillsContainer) {
      pillsContainer.innerHTML = '';
      exercises.forEach((item, i) => {
        const itemTotal = Number(item.sets) || 4;
        const itemDone = (item.completedSets || []).filter(Boolean).length;
        const isAllDone = itemDone === itemTotal && itemTotal > 0;

        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = `focus-step-pill ${i === idx ? 'is-active' : ''} ${isAllDone ? 'is-completed' : ''}`;
        pill.dataset.exerciseIndex = String(i);
        pill.setAttribute('aria-label', `Ir a ejercicio ${i + 1}: ${item.name}`);
        pill.textContent = isAllDone ? `✓ ${i + 1}` : `${i + 1}`;
        pill.addEventListener('click', () => selectFocusExercise(i));
        pillsContainer.appendChild(pill);
      });
    }

    // 1. Ilustración / Sprite en 3 Fases (Solo imagen limpia sin texto superpuesto)
    const spriteStage = document.getElementById('focus-sprite-stage');
    if (spriteStage && GYM_VISUALS) {
      const spriteInfo = GYM_VISUALS.getExerciseSpriteInfo(ex);
      const rowClass = spriteInfo.row === 'bottom' ? 'sprite-row-bottom' : 'sprite-row-top';
      spriteStage.innerHTML = `
        <div class="focus-sprite-box ${spriteInfo.cssClass || ''} ${rowClass}" data-anim-type="${spriteInfo.typeKey || ''}">
          <div class="focus-sprite-frame" style="background-image: url('${spriteInfo.spriteUrl}?v=calibrated');"></div>
        </div>
      `;
    }

    // 2. Encabezado del Ejercicio
    const muscleBadge = document.getElementById('focus-ex-muscle-badge');
    const equipBadge = document.getElementById('focus-ex-equip-badge');
    const titleEl = document.getElementById('focus-ex-title');
    if (muscleBadge) muscleBadge.textContent = `🎯 ${ex.muscle || 'Principal'}`;
    if (equipBadge) equipBadge.textContent = `⚙️ ${ex.equipment || 'Polea / Máquina'}`;
    if (titleEl) titleEl.textContent = ex.name;

    // 3. Control Esencial de Peso / Nivel y Repeticiones
    const badgeInfo = formatLoadBadge(ex);
    const btnUnit = document.getElementById('btn-focus-load-unit');
    const loadMain = document.getElementById('focus-load-main');
    const loadSub = document.getElementById('focus-load-sub');
    const setsRepsLabel = document.getElementById('focus-sets-reps-label');
    const restTargetLabel = document.getElementById('focus-rest-target-label');

    if (btnUnit) {
      btnUnit.className = `btn-toggle-unit ${badgeInfo.cssClass}`;
    }
    if (loadMain) loadMain.textContent = badgeInfo.main;
    if (loadSub) loadSub.textContent = badgeInfo.sub;
    const repsSummaryText = formatExerciseRepsSummary(ex);
    const totalSets = Number(ex.sets) || 4;
    const doneCount = (ex.completedSets || []).filter(Boolean).length;
    let activeSetIndex = (ex.completedSets || []).findIndex(done => !done);
    const isAllDone = doneCount === totalSets && totalSets > 0;
    if (activeSetIndex === -1) {
      activeSetIndex = Math.max(0, totalSets - 1);
    }

    const activeSetReps = getExerciseSetReps(ex, activeSetIndex);
    const isResting = Boolean(restTimerInterval);

    // Actualizar Contador de Serie Actual
    const counterBadge = document.getElementById('focus-active-set-counter');
    if (counterBadge) {
      if (isAllDone) {
        counterBadge.textContent = `✓ ${totalSets} DE ${totalSets} SERIES`;
        counterBadge.classList.add('is-completed-all');
      } else {
        counterBadge.textContent = `SERIE ${activeSetIndex + 1} DE ${totalSets}`;
        counterBadge.classList.remove('is-completed-all');
      }
    }

    // Actualizar Dígitos de Repeticiones Únicas para la Serie Actual
    const repsDigits = document.getElementById('focus-current-set-reps-digits');
    const repsSchemeNote = document.getElementById('focus-current-set-scheme-note');
    if (repsDigits) {
      repsDigits.textContent = isAllDone ? '✓' : String(activeSetReps);
    }
    if (repsSchemeNote) {
      if (isAllDone) {
        repsSchemeNote.textContent = '¡Excelente trabajo! Todas las series completadas.';
      } else if (isResting) {
        repsSchemeNote.textContent = `Descanso activo... Próxima serie: ${activeSetReps} repeticiones.`;
      } else {
        repsSchemeNote.textContent = `Meta calculada para Serie ${activeSetIndex + 1}: ${activeSetReps} reps`;
      }
    }

    if (setsRepsLabel) {
      setsRepsLabel.textContent = isAllDone
        ? `✓ ${totalSets} series completadas`
        : `Serie ${activeSetIndex + 1} de ${totalSets}: ${activeSetReps} reps`;
      setsRepsLabel.title = 'Repeticiones de la serie activa en curso';
      setsRepsLabel.style.cursor = 'default';
    }
    if (restTargetLabel) restTargetLabel.textContent = `⏳ Descanso sugerido: ${ex.restSeconds || 75}s`;

    // Botón de Acción Principal de la Serie
    const actionBtn = document.getElementById('btn-focus-action-set');
    const actionIcon = document.getElementById('focus-btn-action-icon');
    const actionText = document.getElementById('focus-btn-action-text');
    const activeSetCard = document.getElementById('focus-active-set-card');

    if (activeSetCard) {
      activeSetCard.classList.toggle('is-resting-mode', isResting);
    }

    if (actionBtn && actionText) {
      actionBtn.classList.remove('is-resting-state', 'is-all-completed');
      if (isAllDone) {
        actionBtn.classList.add('is-all-completed');
        if (actionIcon) actionIcon.textContent = '🏆';
        actionText.textContent = `Ejercicio Completado (${totalSets}/${totalSets})`;
      } else if (isResting) {
        actionBtn.classList.add('is-resting-state');
        if (actionIcon) actionIcon.textContent = '⚡';
        actionText.textContent = `¡Listo! Comenzar Serie ${activeSetIndex + 1} (${activeSetReps} reps)`;
      } else {
        if (actionIcon) actionIcon.textContent = '✓';
        actionText.textContent = `Completar Serie ${activeSetIndex + 1} (${activeSetReps} reps)`;
      }
    }

    // 4. Mini-track horizontal discreto de las 4 Series (0% scroll innecesario)
    const setsGrid = document.getElementById('focus-sets-grid');
    if (setsGrid) {
      setsGrid.innerHTML = '';
      for (let s = 0; s < totalSets; s++) {
        const isDone = Boolean(ex.completedSets && ex.completedSets[s]);
        const isCurrent = s === activeSetIndex && !isAllDone;
        const setBtn = document.createElement('button');
        setBtn.type = 'button';
        setBtn.className = `btn-set-check btn-focus-set ${isDone ? 'is-done' : ''} ${isCurrent ? 'is-active-focus' : ''}`;
        setBtn.setAttribute('aria-pressed', isDone ? 'true' : 'false');
        setBtn.dataset.setIndex = String(s);

        const sNum = document.createElement('span');
        sNum.className = 'set-num';
        sNum.textContent = isDone ? `✓ S${s + 1}` : `S${s + 1}`;

        const sReps = document.createElement('span');
        sReps.className = 'set-reps sr-only';
        const sRepsCount = getExerciseSetReps(ex, s);
        sReps.textContent = `${sRepsCount} reps`;

        setBtn.append(sNum, sReps);
        setBtn.addEventListener('click', () => toggleSetCompletion(state.selectedDay, ex.id, s));
        setsGrid.appendChild(setBtn);
      }
    }

    // 5. Banner de Doble Progresión 1-Toque en Pantalla Activa
    const overloadContainer = document.getElementById('focus-overload-container');
    if (overloadContainer) {
      overloadContainer.innerHTML = '';
      if (doneCount === totalSets && totalSets > 0) {
        const overloadBanner = document.createElement('div');
        overloadBanner.className = 'smart-overload-banner';
        const nextVal = ex.loadType === 'nivel' ? Number(ex.loadValue) + 1 : Number(ex.loadValue) + 2.5;
        const nextLabel = ex.loadType === 'nivel' ? `Nivel ${nextVal}` : `${nextVal} kg`;

        const msgSpan = document.createElement('span');
        msgSpan.textContent = `🚀 ¡${totalSets}×${repsSummaryText} completado! Sube de nivel con 1 toque:`;

        const btnApplyOverload = document.createElement('button');
        btnApplyOverload.type = 'button';
        btnApplyOverload.className = 'btn-smart-overload-suggest';
        btnApplyOverload.textContent = `⚡ Subir a ${nextLabel}`;
        btnApplyOverload.addEventListener('click', () => applySmartProgressionSuggestion(state.selectedDay, ex.id));

        overloadBanner.append(msgSpan, btnApplyOverload);
        overloadContainer.appendChild(overloadBanner);
      }
    }

    // 6. Temporizador de Descanso Integrado
    const focusRestDigits = document.getElementById('focus-rest-digits');
    if (focusRestDigits && !restTimerInterval) {
      const defaultRest = Number(ex.restSeconds) || 75;
      const mins = Math.floor(defaultRest / 60);
      const secs = defaultRest % 60;
      focusRestDigits.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // 7. Menú Agrupado de Opciones Secundarias del Ejercicio
    const btnSwap = document.getElementById('btn-focus-swap-alt');
    const btnMode = document.getElementById('btn-focus-set-mode');
    const btnRir = document.getElementById('btn-focus-rir');
    const btnTut = document.getElementById('btn-focus-tut');
    const noteEl = document.getElementById('focus-ex-note');

    const setModeKey = ex.setMode || 'normal';
    const modeCatalog = (GYM_VISUALS && GYM_VISUALS.SET_MODE_CATALOG) || {};
    const modeMeta = modeCatalog[setModeKey] || { badge: '⚡ Serie Normal', desc: '4×12' };

    if (btnSwap) {
      btnSwap.className = `btn-alt-swap-chip ${ex.isSwappedAlternative ? 'is-swapped' : ''}`;
      btnSwap.textContent = ex.isSwappedAlternative ? '↩️ Volver a Original' : '🔄 Máquina Ocupada';
    }
    if (btnMode) {
      btnMode.className = `btn-set-mode-chip mode-${setModeKey}`;
      btnMode.textContent = modeMeta.badge;
    }
    if (btnRir) {
      btnRir.textContent = `🎯 ${ex.targetRir || 'RIR 2'}`;
    }
    if (btnTut) {
      const isTimingThis = tutState.activeExerciseId === ex.id;
      btnTut.classList.toggle('is-timing', isTimingThis);
      btnTut.textContent = isTimingThis ? '⏹️ Finalizar Serie TUT' : '⏱️ Medir Serie (TUT 3-1-1)';
    }
    if (noteEl) {
      noteEl.textContent = ex.note || 'Mantén técnica estricta y controla la fase excéntrica.';
    }

    const skipBtn = document.getElementById('btn-focus-skip-exercise');
    if (skipBtn) {
      if (idx >= exercises.length - 1) {
        skipBtn.textContent = '🏁 Último Ejercicio';
        skipBtn.disabled = true;
      } else {
        skipBtn.textContent = '⏭️ Saltar Ejercicio';
        skipBtn.disabled = false;
      }
    }

    return ex;
  }

  let activeProjectionCache = null;

  function skipCurrentFocusExercise() {
    const day = state.schedule[state.selectedDay];
    const exercises = day?.exercises || [];
    if (exercises.length === 0) return;
    if (state.activeExerciseIndex < exercises.length - 1) {
      state.activeExerciseIndex++;
      saveState();
      renderWorkoutFocusScreen();
      showCelebrationToast(`Ejercicio omitido. Pasando a Ejercicio ${state.activeExerciseIndex + 1}: ${exercises[state.activeExerciseIndex].name}`);
    } else {
      showCelebrationToast('Has alcanzado el último ejercicio de la sesión.');
    }
  }

  function openWorkoutTruncateDialog() {
    const dialog = document.getElementById('workout-truncate-dialog');
    if (!dialog) return;
    const day = state.schedule[state.selectedDay];
    if (!day) return;

    const totalSets = day.exercises.reduce((acc, ex) => acc + (Number(ex.sets) || 4), 0);
    const doneSets = day.exercises.reduce((acc, ex) => acc + (ex.completedSets || []).filter(Boolean).length, 0);
    const pct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;

    const statSets = document.getElementById('trunc-stat-sets');
    const statTime = document.getElementById('trunc-stat-time');
    const statVol = document.getElementById('trunc-stat-vol');

    if (statSets) statSets.textContent = `${doneSets} / ${totalSets} series (${pct}%)`;
    if (statTime) statTime.textContent = formatStopwatchDurationText(getStopwatchElapsedMs()) || '00:00';

    const analytics = GYM_VISUALS ? GYM_VISUALS.computeAnalytics(state.schedule, DAYS_ORDER) : null;
    const dayStat = analytics ? analytics.perDay.find(d => d.id === state.selectedDay) : null;
    const doneKg = dayStat ? (dayStat.doneKg || 0) : 0;
    if (statVol) statVol.textContent = `${doneKg.toLocaleString()} kg`;

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.hidden = false;
      dialog.setAttribute('open', '');
    }
  }

  function closeWorkoutTruncateDialog() {
    const dialog = document.getElementById('workout-truncate-dialog');
    if (!dialog) return;
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.hidden = true;
      dialog.removeAttribute('open');
    }
  }

  function truncateWorkoutSession(savePartial = true) {
    closeWorkoutTruncateDialog();
    const day = state.schedule[state.selectedDay];
    const totalSets = day ? day.exercises.reduce((acc, ex) => acc + (Number(ex.sets) || 4), 0) : 24;
    const doneSets = day ? day.exercises.reduce((acc, ex) => acc + (ex.completedSets || []).filter(Boolean).length, 0) : 0;

    if (savePartial) {
      logCurrentWorkoutSession({ isTruncated: true, silent: true });
      pauseSessionStopwatch();
      resetSessionStopwatch();
      exitWorkoutScreen();
      showCelebrationToast(`⚠️ Sesión truncada guardada (${doneSets}/${totalSets} series) en tu historial.`);
    } else {
      pauseSessionStopwatch();
      resetSessionStopwatch();
      exitWorkoutScreen();
      showCelebrationToast('Sesión cancelada sin registrar.');
    }
  }

  function calculateNextWorkoutProjection(dayId = state.selectedDay) {
    const currentDay = state.schedule[dayId];
    if (!currentDay) return null;

    const currentMuscles = (currentDay.exercises || []).map(e => (e.muscle || '').toLowerCase());
    const currentDayGroup = (currentDay.muscleGroup || '').toLowerCase();

    // Búsqueda circular del próximo día programado que entrene el mismo grupo muscular
    const currentIdx = DAYS_ORDER.indexOf(dayId);
    let nextDayId = null;
    let daysUntil = 0;

    for (let step = 1; step < DAYS_ORDER.length; step++) {
      const candIdx = (currentIdx + step) % DAYS_ORDER.length;
      const candKey = DAYS_ORDER[candIdx];
      const candDay = state.schedule[candKey];
      if (!candDay || candDay.isRestDay || candDay.status === 'skipped_to_sunday') continue;
      if (candKey === 'domingo' && candDay.exercises.length === 0) continue;

      const candGroup = (candDay.muscleGroup || '').toLowerCase();
      const candMuscles = (candDay.exercises || []).map(e => (e.muscle || '').toLowerCase());
      const sharesMuscle = candMuscles.some(m => currentMuscles.some(cm => cm.includes(m) || m.includes(cm))) ||
        (currentDayGroup.includes('espalda') && candGroup.includes('espalda')) ||
        (currentDayGroup.includes('pecho') && candGroup.includes('pecho')) ||
        (currentDayGroup.includes('pierna') && candGroup.includes('pierna')) ||
        (currentDayGroup.includes('hombro') && candGroup.includes('hombro')) ||
        (currentDayGroup.includes('brazos') && (candGroup.includes('bíceps') || candGroup.includes('tríceps')));

      if (sharesMuscle) {
        nextDayId = candKey;
        daysUntil = step;
        break;
      }
    }

    if (!nextDayId) {
      nextDayId = dayId;
      daysUntil = 7;
    }

    const nextDay = state.schedule[nextDayId];
    const hoursUntil = daysUntil * 24;

    // Proyecciones de sobrecarga progresiva ejercicio por ejercicio
    const exerciseProgressions = (currentDay.exercises || []).map(ex => {
      const prevLoad = Number(ex.loadValue) || 0;
      const isNivel = ex.loadType === 'nivel';
      const nextLoadValue = isNivel ? prevLoad + 1 : prevLoad + 2.5;
      const nextLoadLabel = isNivel ? `Nivel ${nextLoadValue} (+1 placa)` : `${nextLoadValue} kg (+2.5 kg)`;
      const repsSummary = formatExerciseRepsSummary(ex);
      const alts = (GYM_VISUALS && typeof GYM_VISUALS.getExerciseAlternatives === 'function')
        ? GYM_VISUALS.getExerciseAlternatives(ex)
        : [];

      return {
        id: ex.id,
        name: ex.name,
        muscle: ex.muscle || 'Músculo Principal',
        equipment: ex.equipment || 'Polea / Máquina',
        currentLoad: isNivel ? `Nivel ${prevLoad}` : `${prevLoad} kg`,
        nextLoadValue,
        nextLoadLabel,
        sets: Number(ex.sets) || 4,
        repsSummary,
        alternatives: alts
      };
    });

    const profile = getUserProfile();
    const weightKg = Number(profile.weightKg) || 74;
    const targetProteinGrams = Math.max(25, Math.round(weightKg * 0.4));

    return {
      currentDayId: dayId,
      currentDayName: currentDay.dayName,
      currentMuscleGroup: currentDay.muscleGroup,
      nextDayId,
      nextDayName: nextDay ? nextDay.dayName : dayId,
      nextDayTitle: nextDay ? nextDay.title : currentDay.title,
      daysUntil,
      hoursUntil,
      exerciseProgressions,
      targetProteinGrams,
      recommendedWaterMl: 650
    };
  }

  function openWorkoutResultsDialog(sessionRecord, projection) {
    const dialog = document.getElementById('workout-results-dialog');
    if (!dialog) return;

    activeProjectionCache = projection;
    const day = state.schedule[projection?.currentDayId || state.selectedDay];

    const subtitleEl = document.getElementById('results-day-subtitle');
    const adherenceEl = document.getElementById('results-adherence-pill');
    if (subtitleEl && day) {
      subtitleEl.textContent = `${day.dayName} · ${day.title} (${day.muscleGroup})`;
    }

    const setsDone = sessionRecord?.setsDone || (day ? day.exercises.reduce((a, e) => a + (e.completedSets || []).filter(Boolean).length, 0) : 24);
    const setsPlanned = sessionRecord?.setsPlanned || (day ? day.exercises.reduce((a, e) => a + (Number(e.sets) || 4), 0) : 24);
    const adherencePct = setsPlanned > 0 ? Math.round((setsDone / setsPlanned) * 100) : 100;
    if (adherenceEl) {
      adherenceEl.textContent = `${setsDone}/${setsPlanned} Series Completadas · ${adherencePct}% Adherencia`;
    }

    const timeVal = document.getElementById('res-time-val');
    const volVal = document.getElementById('res-vol-val');
    const setsVal = document.getElementById('res-sets-val');
    const repsVal = document.getElementById('res-reps-val');
    const calVal = document.getElementById('res-cal-val');
    const rpeVal = document.getElementById('res-rpe-val');

    if (timeVal) timeVal.textContent = sessionRecord?.durationText || '45:00';
    if (volVal) volVal.textContent = `${(sessionRecord?.volumeKg || 0).toLocaleString()} kg`;
    if (setsVal) setsVal.textContent = `${setsDone} / ${setsPlanned}`;

    let totalReps = sessionRecord?.totalRepsDone || 0;
    if (totalReps === 0 && day) {
      for (const ex of day.exercises) {
        const sCount = Number(ex.sets) || 4;
        for (let s = 0; s < sCount; s++) {
          totalReps += getExerciseSetReps(ex, s);
        }
      }
    }
    if (repsVal) repsVal.textContent = `${totalReps} reps`;

    const durMs = sessionRecord?.durationMs || 2700000;
    const estCal = Math.max(80, Math.round((durMs / 60000) * 7.2));
    if (calVal) calVal.textContent = `~${estCal} kcal`;
    if (rpeVal) rpeVal.textContent = 'RPE 8.0 (Óptimo)';

    const nextEyebrow = document.getElementById('results-next-eyebrow');
    const nextHeading = document.getElementById('results-next-heading');
    const recBadge = document.getElementById('results-recovery-badge');
    const recNote = document.getElementById('results-recovery-note');

    if (projection) {
      if (nextEyebrow) nextEyebrow.textContent = `PRÓXIMO ESTÍMULO DE ${projection.currentMuscleGroup.toUpperCase()}`;
      if (nextHeading) nextHeading.textContent = `${projection.nextDayName} · ${projection.nextDayTitle}`;
      if (recBadge) recBadge.textContent = `⏳ En ~${projection.hoursUntil}h (${projection.daysUntil} días de descanso)`;
      if (recNote) {
        recNote.textContent = `Tus fibras musculares requieren entre 48 y 72 horas para sintetizar nuevas miofibrillas. En tu próxima sesión del ${projection.nextDayName} se aplicarán las siguientes cargas y repeticiones dinámicas:`;
      }
    }

    const progList = document.getElementById('results-progressions-list');
    if (progList && projection) {
      progList.innerHTML = '';
      projection.exerciseProgressions.forEach(prog => {
        const item = document.createElement('div');
        item.className = 'res-prog-item';
        item.innerHTML = `
          <div class="res-prog-info">
            <span class="res-prog-name">${prog.name}</span>
            <span class="res-prog-meta">🎯 ${prog.muscle} · ${prog.sets} series × ${prog.repsSummary}</span>
          </div>
          <div class="res-prog-badge-box">
            <span class="res-curr-load" title="Carga actual">${prog.currentLoad}</span>
            <span class="res-next-load" title="Próxima carga proyectada">➔ ${prog.nextLoadLabel}</span>
          </div>
        `;
        progList.appendChild(item);
      });
    }

    const altList = document.getElementById('results-alternatives-list');
    if (altList && projection && projection.exerciseProgressions.length > 0) {
      altList.innerHTML = '';
      const firstProg = projection.exerciseProgressions[0];
      const alts = firstProg.alternatives || [];
      alts.forEach(alt => {
        const card = document.createElement('div');
        card.className = 'res-alt-card';
        card.innerHTML = `
          <span class="res-alt-cat">${alt.categoryLabel ? alt.categoryLabel.split(' ')[0] : '⚡'} ${alt.categoryType ? alt.categoryType.replace('_', ' ') : 'variante'}</span>
          <h5 class="res-alt-name">${alt.name}</h5>
          <span class="res-alt-load">${alt.loadTransfer}</span>
        `;
        altList.appendChild(card);
      });
    }

    const proteinTarget = document.getElementById('res-protein-target');
    const waterTarget = document.getElementById('res-water-target');
    if (proteinTarget && projection) proteinTarget.textContent = `${projection.targetProteinGrams}g`;
    if (waterTarget && projection) waterTarget.textContent = `+${projection.recommendedWaterMl} ml`;

    const btnApply = document.getElementById('btn-results-apply-progression');
    if (btnApply) {
      btnApply.disabled = false;
      btnApply.textContent = '⚡ Aplicar Cargas Proyectadas al Próximo Día';
    }

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.hidden = false;
      dialog.setAttribute('open', '');
    }
  }

  function closeWorkoutResultsDialog() {
    const dialog = document.getElementById('workout-results-dialog');
    if (!dialog) return;
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.hidden = true;
      dialog.removeAttribute('open');
    }
  }

  function applyNextDayProgression() {
    if (!activeProjectionCache) return 0;
    const { nextDayId, exerciseProgressions } = activeProjectionCache;
    const targetDay = state.schedule[nextDayId];
    if (!targetDay || !targetDay.exercises) return 0;

    let appliedCount = 0;
    for (const prog of exerciseProgressions) {
      const targetEx = targetDay.exercises.find(e => e.id === prog.id || e.name === prog.name) ||
        targetDay.exercises.find(e => e.muscle === prog.muscle);
      if (targetEx) {
        targetEx.loadValue = prog.nextLoadValue;
        appliedCount++;
      }
    }

    const currDay = state.schedule[activeProjectionCache.currentDayId];
    if (currDay && currDay.exercises) {
      for (const prog of exerciseProgressions) {
        const currEx = currDay.exercises.find(e => e.id === prog.id);
        if (currEx) {
          currEx.loadValue = prog.nextLoadValue;
        }
      }
    }

    saveState();
    renderAll();

    const btnApply = document.getElementById('btn-results-apply-progression');
    if (btnApply) {
      btnApply.disabled = true;
      btnApply.textContent = `✓ ¡Cargas Proyectadas Aplicadas (${appliedCount} ejercicios)!`;
    }
    showCelebrationToast(`🚀 ¡Sobrecarga Progresiva aplicada para ${targetDay.dayName}!`);
    return appliedCount;
  }

  function finishWorkoutSession() {
    const day = state.schedule[state.selectedDay];
    if (!day) return;

    stopRestTimer();
    logCurrentWorkoutSession({ silent: true });
    const sessionRecord = state.history[0];
    pauseSessionStopwatch();
    resetSessionStopwatch();

    const projection = calculateNextWorkoutProjection(state.selectedDay);
    openWorkoutResultsDialog(sessionRecord, projection);
    playCompletionTone();
  }

  function renderAll() {
    document.body.classList.toggle('animations-paused', Boolean(state.animationsPaused));
    const btnAnim = document.getElementById('btn-toggle-animations');
    if (btnAnim) {
      btnAnim.setAttribute('aria-pressed', state.animationsPaused ? 'false' : 'true');
      btnAnim.textContent = state.animationsPaused ? '▶️ Reanudar Anim.' : '⏸️ Pausar Anim.';
    }

    const btnWake = document.getElementById('btn-toggle-wakelock');
    if (btnWake) {
      btnWake.setAttribute('aria-pressed', state.wakeLockEnabled ? 'true' : 'false');
      btnWake.textContent = state.wakeLockEnabled ? '🔆 Pantalla Fija' : '🔆 Pantalla Activa';
    }

    const btnVoice = document.getElementById('btn-toggle-voice-coach');
    if (btnVoice) {
      btnVoice.setAttribute('aria-pressed', state.voiceCoachEnabled ? 'true' : 'false');
      btnVoice.textContent = state.voiceCoachEnabled ? '🔊 Coach Activo (3-1-1)' : '🔊 Coach Voz / Cadencia';
    }

    const btnDeload = document.getElementById('btn-toggle-deload-mode');
    if (btnDeload) {
      btnDeload.setAttribute('aria-pressed', state.deloadModeActive ? 'true' : 'false');
      btnDeload.textContent = state.deloadModeActive ? '🛡️ Descarga Activa (-20%)' : '🛡️ Modo Descarga';
    }

    const journalInput = document.getElementById('session-journal-note');
    if (journalInput) {
      journalInput.value = (state.journalNotesByDay && state.journalNotesByDay[state.selectedDay]) || '';
    }

    document.querySelectorAll('.btn-template-select').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.template === (state.activeTemplate || 'default_ppl'));
    });

    syncScreenVisibility();
    renderWeeklySummary();
    renderDayTabs();
    renderDayHero();
    renderWarmupChecklist();
    renderExercisesList();
    renderWorkoutFocusScreen();
    renderAnalyticsDashboard();
    renderProgressionHistory();
    renderBodyMetricsHistory();
    renderCalculatorModal();
    renderShareableSummaryCard();
    renderNutritionDashboard();
    renderGamificationDashboard();
    renderRecoveryAndReadinessDashboard();
    renderUserProfileSummary();
    renderWeeklyMatrix();
  }

  // Visor Técnico Pantalla Completa de 3 Fases
  function setSpriteViewerPhase(phaseMode) {
    const stage = document.getElementById('sprite-viewer-stage');
    const phaseBadge = document.getElementById('sprite-viewer-phase-badge');
    if (!stage) return;

    stage.classList.remove('mode-animated', 'mode-phase-1', 'mode-phase-2', 'mode-phase-3', 'mode-full-strip');
    stage.classList.add(`mode-${phaseMode}`);

    const labels = {
      'animated': 'Secuencia Animada (Fases 1 → 2 → 3)',
      'phase-1': 'Fase 1: Posición Inicial y Estiramiento',
      'phase-2': 'Fase 2: Recorrido Concéntrico Medio',
      'phase-3': 'Fase 3: Contracción Isométrica Máxima',
      'full-strip': 'Vista Completa: Las 3 Fases Biomecánicas'
    };
    if (phaseBadge) {
      phaseBadge.textContent = labels[phaseMode] || labels.animated;
    }

    document.querySelectorAll('.btn-phase-step').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.phase === phaseMode);
    });
  }

  function setSpriteViewerSpeed(speedCss) {
    const frame = document.getElementById('sprite-viewer-frame');
    if (frame) {
      frame.style.animationDuration = speedCss;
    }
    document.querySelectorAll('.btn-speed-step').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.speed === speedCss);
    });
  }

  function openSpriteViewerDialog(exercise) {
    if (!exercise || !GYM_VISUALS) return;
    const dialog = document.getElementById('sprite-viewer-dialog');
    const titleEl = document.getElementById('sprite-viewer-title');
    const eyebrowEl = document.getElementById('sprite-viewer-eyebrow');
    const stageEl = document.getElementById('sprite-viewer-stage');
    const frameEl = document.getElementById('sprite-viewer-frame');
    const loadBadgeEl = document.getElementById('sprite-viewer-load-badge');
    const noteEl = document.getElementById('sprite-viewer-note');
    const e1rmEl = document.getElementById('sprite-viewer-e1rm');
    const setsRepsEl = document.getElementById('sprite-viewer-sets-reps');

    const info = GYM_VISUALS.getExerciseSpriteInfo(exercise);
    const e1rm = typeof GYM_VISUALS.calculateE1RM === 'function'
      ? GYM_VISUALS.calculateE1RM(exercise.loadType, exercise.loadValue, exercise.reps)
      : 0;
    const loadText = exercise.loadType === 'nivel' ? `Nivel ${exercise.loadValue}` : `${exercise.loadValue} kg`;

    if (titleEl) titleEl.textContent = exercise.name;
    if (eyebrowEl) eyebrowEl.textContent = `${info.label} · ${exercise.muscle || 'Técnica en 3 Fases'}`;
    if (stageEl) {
      stageEl.classList.toggle('row-bottom', info.row === 'bottom');
    }
    if (frameEl) {
      frameEl.style.backgroundImage = `url('${info.spriteUrl}')`;
    }
    if (loadBadgeEl) {
      loadBadgeEl.textContent = `Carga: ${loadText}`;
    }
    if (noteEl) {
      noteEl.textContent = exercise.note || 'Controla la fase excéntrica y mantén 1 segundo en máxima contracción.';
    }
    if (e1rmEl) {
      e1rmEl.textContent = `📈 1RM Est.: ${e1rm} kg`;
    }
    if (setsRepsEl) {
      setsRepsEl.textContent = `🎯 Meta: ${exercise.sets || 4} series × ${exercise.reps || 12} reps`;
    }

    setSpriteViewerPhase('animated');
    setSpriteViewerSpeed('2.4s');

    if (dialog && typeof dialog.showModal === 'function') {
      dialog.showModal();
    }
  }

  // Dialog Modal Controllers
  function openExceptionDialog() {
    const currentDay = state.schedule[state.selectedDay];
    if (!currentDay) return;

    if (currentDay.status === 'skipped_to_sunday') {
      revertSkippedDay(state.selectedDay);
      return;
    }

    const dialog = document.getElementById('exception-dialog');
    const descEl = document.getElementById('exception-dialog-desc');
    if (descEl) {
      descEl.innerHTML = `Configura qué hacer con la rutina de <strong>${currentDay.dayName} (${currentDay.title})</strong> si hoy no se entrenará:`;
    }
    if (dialog && typeof dialog.showModal === 'function') {
      dialog.showModal();
    }
  }

  function openExerciseDialog(exerciseToEdit = null) {
    const dialog = document.getElementById('exercise-dialog');
    const titleEl = document.getElementById('exercise-dialog-title');
    const idInput = document.getElementById('edit-exercise-id');
    const nameInput = document.getElementById('edit-exercise-name');
    const muscleInput = document.getElementById('edit-exercise-muscle');
    const equipInput = document.getElementById('edit-exercise-equipment');
    const loadTypeSelect = document.getElementById('edit-load-type');
    const loadValInput = document.getElementById('edit-load-value');
    const setsInput = document.getElementById('edit-sets');
    const repsInput = document.getElementById('edit-reps');
    const restInput = document.getElementById('edit-rest');
    const setModeSelect = document.getElementById('edit-set-mode');
    const rirSelect = document.getElementById('edit-rir');
    const spriteTypeSelect = document.getElementById('edit-sprite-type');
    const noteInput = document.getElementById('edit-note');
    const btnDelete = document.getElementById('btn-delete-exercise');

    if (exerciseToEdit) {
      titleEl.textContent = 'Editar Ejercicio y Carga';
      idInput.value = exerciseToEdit.id;
      nameInput.value = exerciseToEdit.name;
      muscleInput.value = exerciseToEdit.muscle || '';
      equipInput.value = exerciseToEdit.equipment || '';
      loadTypeSelect.value = exerciseToEdit.loadType || 'kg';
      loadValInput.value = exerciseToEdit.loadValue ?? 10;
      setsInput.value = exerciseToEdit.sets || 4;
      repsInput.value = exerciseToEdit.reps || 12;
      restInput.value = exerciseToEdit.restSeconds || 75;
      if (setModeSelect) setModeSelect.value = exerciseToEdit.setMode || 'normal';
      if (rirSelect) rirSelect.value = exerciseToEdit.targetRir || 'RIR 2';
      if (spriteTypeSelect) spriteTypeSelect.value = exerciseToEdit.spriteType || 'auto';
      noteInput.value = exerciseToEdit.note || '';
      btnDelete.hidden = false;
    } else {
      titleEl.textContent = 'Nuevo Ejercicio (4 × 12)';
      idInput.value = '';
      nameInput.value = '';
      muscleInput.value = state.schedule[state.selectedDay].muscleGroup;
      equipInput.value = 'Polea / Máquina';
      loadTypeSelect.value = 'kg';
      loadValInput.value = 15;
      setsInput.value = 4;
      repsInput.value = 12;
      restInput.value = 75;
      if (setModeSelect) setModeSelect.value = 'normal';
      if (rirSelect) rirSelect.value = 'RIR 2';
      if (spriteTypeSelect) spriteTypeSelect.value = 'auto';
      noteInput.value = '';
      btnDelete.hidden = true;
    }

    if (dialog && typeof dialog.showModal === 'function') {
      dialog.showModal();
    }
  }

  function bindEvents() {
    const btnWake = document.getElementById('btn-toggle-wakelock');
    if (btnWake) {
      btnWake.addEventListener('click', () => {
        toggleWakeLock();
      });
    }

    const btnVoice = document.getElementById('btn-toggle-voice-coach');
    if (btnVoice) {
      btnVoice.addEventListener('click', () => {
        toggleVoiceCoach();
      });
    }

    const btnDeload = document.getElementById('btn-toggle-deload-mode');
    if (btnDeload) {
      btnDeload.addEventListener('click', () => {
        toggleDeloadMode();
      });
    }

    ['readiness-sleep-hours', 'readiness-energy-level', 'readiness-doms-level'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const handler = () => {
          updateReadinessMetrics({
            sleepHours: document.getElementById('readiness-sleep-hours')?.value,
            energyLevel: document.getElementById('readiness-energy-level')?.value,
            domsLevel: document.getElementById('readiness-doms-level')?.value
          });
        };
        el.addEventListener('input', handler);
        el.addEventListener('change', handler);
      }
    });

    const journalInput = document.getElementById('session-journal-note');
    if (journalInput) {
      journalInput.addEventListener('input', () => {
        setSessionJournalNote(journalInput.value, state.selectedDay);
      });
    }

    document.querySelectorAll('.btn-journal-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        const tagText = btn.dataset.tag || '';
        const current = (state.journalNotesByDay && state.journalNotesByDay[state.selectedDay]) || '';
        const nextText = current ? `${current} · ${tagText}` : tagText;
        setSessionJournalNote(nextText, state.selectedDay);
      });
    });

    document.getElementById('btn-export-csv')?.addEventListener('click', () => {
      exportWorkoutCsv();
    });

    document.getElementById('nutrition-goal-select')?.addEventListener('change', e => {
      setNutritionGoal(e.target.value);
    });

    document.getElementById('btn-water-add-250')?.addEventListener('click', () => {
      addHydrationWater(250);
    });

    document.getElementById('btn-water-add-500')?.addEventListener('click', () => {
      addHydrationWater(500);
    });

    document.getElementById('btn-water-reset')?.addEventListener('click', () => {
      resetHydrationWater();
    });

    document.getElementById('btn-toggle-creatine')?.addEventListener('click', () => {
      toggleSupplementCheck('creatineTaken');
    });

    document.getElementById('btn-toggle-post-protein')?.addEventListener('click', () => {
      toggleSupplementCheck('postProteinTaken');
    });

    const btnOpenCalc = document.getElementById('btn-open-calc-dialog');
    if (btnOpenCalc) {
      btnOpenCalc.addEventListener('click', () => {
        openCalculatorDialog(60, 12);
      });
    }

    ['calc-target-kg', 'calc-bar-kg', 'calc-reps-done'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', renderCalculatorModal);
        el.addEventListener('change', renderCalculatorModal);
      }
    });

    document.getElementById('btn-save-body-metrics')?.addEventListener('click', () => {
      recordBodyMetrics();
      renderNutritionDashboard();
    });

    document.querySelectorAll('.btn-template-select').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.template) {
          applyWorkoutTemplate(btn.dataset.template);
        }
      });
    });

    document.getElementById('btn-generate-share-card')?.addEventListener('click', () => {
      renderShareableSummaryCard();
      showCelebrationToast('🎨 Tarjeta resumen actualizada en el lienzo');
    });

    document.getElementById('btn-download-share-card')?.addEventListener('click', () => {
      downloadShareableSummaryCard();
    });

    const btnToggleAnim = document.getElementById('btn-toggle-animations');
    if (btnToggleAnim) {
      btnToggleAnim.addEventListener('click', () => {
        state.animationsPaused = !state.animationsPaused;
        saveState();
        renderAll();
      });
    }

    document.querySelectorAll('.btn-phase-step').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.phase) setSpriteViewerPhase(btn.dataset.phase);
      });
    });

    document.querySelectorAll('.btn-speed-step').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.speed) setSpriteViewerSpeed(btn.dataset.speed);
      });
    });

    document.getElementById('btn-start-warmup-timer')?.addEventListener('click', () => {
      startRestTimer(300, '🔥 Calentamiento Articular y Activación (5 min)');
      showCelebrationToast('🔥 Temporizador de calentamiento de 5 min iniciado');
    });

    document.getElementById('btn-complete-all-warmup')?.addEventListener('click', () => {
      completeAllWarmupSteps(state.selectedDay);
    });

    const btnLogWorkout = document.getElementById('btn-log-workout');
    if (btnLogWorkout) {
      btnLogWorkout.addEventListener('click', logCurrentWorkoutSession);
    }

    const btnException = document.getElementById('btn-open-exception');
    if (btnException) {
      btnException.addEventListener('click', openExceptionDialog);
    }

    const exceptionRadios = document.querySelectorAll('input[name="exceptionMode"]');
    const swapWrap = document.getElementById('swap-day-selector-wrap');
    exceptionRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (swapWrap) {
          swapWrap.hidden = radio.value !== 'swap_with_day' || !radio.checked;
        }
      });
    });

    const exceptionDialog = document.getElementById('exception-dialog');
    if (exceptionDialog) {
      exceptionDialog.addEventListener('close', () => {
        if (exceptionDialog.returnValue !== 'apply') return;
        const selectedMode = document.querySelector('input[name="exceptionMode"]:checked')?.value;
        if (selectedMode === 'move_to_sunday') {
          moveDayToSunday(state.selectedDay);
        } else if (selectedMode === 'shift_chain_to_sunday') {
          shiftChainToSunday(state.selectedDay);
        } else if (selectedMode === 'swap_with_day') {
          const targetDay = document.getElementById('swap-target-day')?.value || 'domingo';
          swapDays(state.selectedDay, targetDay);
        } else if (selectedMode === 'smart_merge_next' || selectedMode === 'redistribute_volume') {
          accommodateMissedDayAction(state.selectedDay, selectedMode);
        }
      });
    }

    const btnAddEx = document.getElementById('btn-add-exercise');
    if (btnAddEx) {
      btnAddEx.addEventListener('click', () => openExerciseDialog(null));
    }

    const exerciseDialog = document.getElementById('exercise-dialog');
    if (exerciseDialog) {
      exerciseDialog.addEventListener('close', () => {
        if (exerciseDialog.returnValue !== 'save') return;
        const idVal = document.getElementById('edit-exercise-id').value;
        const nameVal = document.getElementById('edit-exercise-name').value.trim();
        if (!nameVal) return;

        const muscleVal = document.getElementById('edit-exercise-muscle').value.trim() || 'General';
        const equipVal = document.getElementById('edit-exercise-equipment').value.trim() || 'Máquina / Polea';
        const loadTypeVal = document.getElementById('edit-load-type').value;
        const loadVal = Number(document.getElementById('edit-load-value').value) || 0;
        const setsVal = Math.max(1, Math.min(10, Number(document.getElementById('edit-sets').value) || 4));
        const repsVal = Math.max(1, Math.min(50, Number(document.getElementById('edit-reps').value) || 12));
        const restVal = Math.max(15, Number(document.getElementById('edit-rest').value) || 75);
        const setModeVal = document.getElementById('edit-set-mode')?.value || 'normal';
        const rirVal = document.getElementById('edit-rir')?.value || 'RIR 2';
        const spriteTypeVal = document.getElementById('edit-sprite-type')?.value || 'auto';
        const noteVal = document.getElementById('edit-note').value.trim();

        const day = state.schedule[state.selectedDay];
        if (idVal) {
          const existing = day.exercises.find(e => e.id === idVal);
          if (existing) {
            const prevLoad = Number(existing.loadValue) || 0;
            const sameType = existing.loadType === loadTypeVal;
            existing.name = nameVal;
            existing.muscle = muscleVal;
            existing.equipment = equipVal;
            existing.loadType = loadTypeVal;
            existing.loadValue = loadVal;
            existing.sets = setsVal;
            existing.reps = repsVal;
            existing.restSeconds = restVal;
            existing.setMode = setModeVal;
            existing.targetRir = rirVal;
            existing.spriteType = spriteTypeVal;
            existing.note = noteVal;
            existing.completedSets = Array.from(
              { length: setsVal },
              (_, idx) => Boolean(existing.completedSets && existing.completedSets[idx])
            );
            if (sameType && loadVal > prevLoad) {
              recordProgressionEntry(state.selectedDay, existing, prevLoad, loadVal);
            }
          }
        } else {
          day.exercises.push({
            id: `${state.selectedDay}-custom-${Date.now()}`,
            name: nameVal,
            muscle: muscleVal,
            equipment: equipVal,
            loadType: loadTypeVal,
            loadValue: loadVal,
            sets: setsVal,
            reps: repsVal,
            restSeconds: restVal,
            setMode: setModeVal,
            targetRir: rirVal,
            spriteType: spriteTypeVal,
            userBase: false,
            note: noteVal,
            completedSets: Array.from({ length: setsVal }, () => false)
          });
          if (state.selectedDay === 'domingo') {
            day.status = 'reprogrammed';
          }
        }
        saveState();
        renderAll();
      });
    }

    const btnDeleteEx = document.getElementById('btn-delete-exercise');
    if (btnDeleteEx && exerciseDialog) {
      btnDeleteEx.addEventListener('click', () => {
        const idVal = document.getElementById('edit-exercise-id').value;
        if (!idVal) return;
        const day = state.schedule[state.selectedDay];
        day.exercises = day.exercises.filter(e => e.id !== idVal);
        exerciseDialog.close('deleted');
        saveState();
        renderAll();
      });
    }

    const btnResetProgress = document.getElementById('btn-reset-week-progress');
    if (btnResetProgress) {
      btnResetProgress.addEventListener('click', resetWeeklySeriesProgress);
    }

    const btnRestoreSchedule = document.getElementById('btn-restore-schedule');
    if (btnRestoreSchedule) {
      btnRestoreSchedule.addEventListener('click', restoreOriginalSchedule);
    }

    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('exercise-search-input');
    const btnClearSearch = document.getElementById('btn-clear-search');
    if (searchForm) {
      searchForm.addEventListener('submit', e => e.preventDefault());
    }
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        state.searchQuery = searchInput.value;
        if (btnClearSearch) btnClearSearch.hidden = !state.searchQuery;
        renderExercisesList();
      });
    }
    if (btnClearSearch && searchInput) {
      btnClearSearch.addEventListener('click', () => {
        searchInput.value = '';
        state.searchQuery = '';
        btnClearSearch.hidden = true;
        renderExercisesList();
      });
    }

    // Cronómetro de Sesión y Flotante
    document.getElementById('btn-stopwatch-toggle')?.addEventListener('click', toggleSessionStopwatch);
    document.getElementById('btn-stopwatch-lap')?.addEventListener('click', lapSessionStopwatch);
    document.getElementById('btn-stopwatch-reset')?.addEventListener('click', resetSessionStopwatch);

    document.getElementById('btn-mode-rest')?.addEventListener('click', () => switchFloatingTimerMode('rest'));
    document.getElementById('btn-mode-stopwatch')?.addEventListener('click', () => switchFloatingTimerMode('stopwatch'));

    document.getElementById('btn-floating-stopwatch-toggle')?.addEventListener('click', toggleSessionStopwatch);
    document.getElementById('btn-floating-stopwatch-lap')?.addEventListener('click', lapSessionStopwatch);
    document.getElementById('btn-floating-stopwatch-hide')?.addEventListener('click', () => {
      const bar = document.getElementById('rest-timer-bar');
      if (bar) bar.hidden = true;
    });

    document.getElementById('btn-timer-minus')?.addEventListener('click', () => {
      restRemainingSeconds = Math.max(0, restRemainingSeconds - 15);
      updateTimerDisplay();
    });
    document.getElementById('btn-timer-plus')?.addEventListener('click', () => {
      restRemainingSeconds += 15;
      restTotalSeconds = Math.max(restTotalSeconds, restRemainingSeconds);
      updateTimerDisplay();
    });
    document.getElementById('btn-timer-skip')?.addEventListener('click', stopRestTimer);

    // Controles de la Pantalla de Entrenamiento Activo (#workout-focus-screen) y Navegación Inferior
    document.getElementById('btn-start-day-workout')?.addEventListener('click', () => {
      startDayWorkoutSession(state.selectedDay, null);
    });
    document.getElementById('btn-header-start-day')?.addEventListener('click', () => {
      startDayWorkoutSession(state.selectedDay, null);
    });
    document.getElementById('btn-exit-workout-screen')?.addEventListener('click', () => {
      exitWorkoutScreen();
    });
    document.getElementById('btn-focus-clock-toggle')?.addEventListener('click', () => {
      toggleSessionStopwatch();
    });
    document.getElementById('btn-focus-prev-ex')?.addEventListener('click', () => {
      selectFocusExercise((state.activeExerciseIndex || 0) - 1);
    });
    document.getElementById('btn-focus-next-ex')?.addEventListener('click', () => {
      selectFocusExercise((state.activeExerciseIndex || 0) + 1);
    });

    document.getElementById('focus-sprite-stage')?.addEventListener('click', () => {
      const ex = getActiveFocusExercise();
      if (ex) openSpriteViewerDialog(ex);
    });
    document.getElementById('btn-focus-load-minus')?.addEventListener('click', () => {
      const ex = getActiveFocusExercise();
      if (ex) adjustExerciseLoad(state.selectedDay, ex.id, -1);
    });
    document.getElementById('btn-focus-load-plus')?.addEventListener('click', () => {
      const ex = getActiveFocusExercise();
      if (ex) adjustExerciseLoad(state.selectedDay, ex.id, 1);
    });
    document.getElementById('btn-focus-load-unit')?.addEventListener('click', () => {
      const ex = getActiveFocusExercise();
      if (ex) toggleExerciseLoadUnit(state.selectedDay, ex.id);
    });

    // Botón de Acción Principal de Serie (Módulo Ultra-Compacto de Serie Actual)
    document.getElementById('btn-focus-action-set')?.addEventListener('click', () => {
      const ex = getActiveFocusExercise();
      if (!ex) return;

      const totalSets = Number(ex.sets) || 4;
      const doneCount = (ex.completedSets || []).filter(Boolean).length;
      if (doneCount === totalSets) {
        showCelebrationToast('🏆 ¡Todas las series de este ejercicio están completadas!');
        return;
      }

      // Si estaba en descanso activo, el usuario le da para iniciar la siguiente serie
      if (restTimerInterval) {
        stopRestTimer();
        renderWorkoutFocusScreen();
        const activeIdx = (ex.completedSets || []).findIndex(done => !done);
        const repsCount = getExerciseSetReps(ex, activeIdx !== -1 ? activeIdx : 0);
        showCelebrationToast(`💪 ¡Comenzando Serie ${(activeIdx !== -1 ? activeIdx : 0) + 1}! Objetivo: ${repsCount} repeticiones.`);
        return;
      }

      // Completar la serie activa actual e iniciar descanso automáticamente
      const activeIdx = (ex.completedSets || []).findIndex(done => !done);
      if (activeIdx !== -1) {
        toggleSetCompletion(state.selectedDay, ex.id, activeIdx);
      }
    });

    document.getElementById('btn-focus-rest-start')?.addEventListener('click', () => {
      const ex = getActiveFocusExercise();
      startRestTimer(ex?.restSeconds || 75, ex ? `${ex.name} (Descanso)` : 'Descanso entre series');
    });
    document.getElementById('btn-focus-rest-minus')?.addEventListener('click', () => {
      restRemainingSeconds = Math.max(0, restRemainingSeconds - 15);
      updateTimerDisplay();
    });
    document.getElementById('btn-focus-rest-plus')?.addEventListener('click', () => {
      restRemainingSeconds += 15;
      restTotalSeconds = Math.max(restTotalSeconds, restRemainingSeconds);
      updateTimerDisplay();
    });
    document.getElementById('btn-focus-rest-skip')?.addEventListener('click', () => {
      stopRestTimer();
      renderWorkoutFocusScreen();
      const ex = getActiveFocusExercise();
      const nextIdx = ex?.completedSets ? ex.completedSets.findIndex(d => !d) : 0;
      if (ex && nextIdx !== -1) {
        const nextReps = getExerciseSetReps(ex, nextIdx);
        showCelebrationToast(`⚡ Descanso terminado. Serie ${nextIdx + 1}: ${nextReps} repeticiones.`);
      }
    });

    document.getElementById('btn-focus-swap-alt')?.addEventListener('click', () => {
      const ex = getActiveFocusExercise();
      if (ex) openExerciseSwapModal(state.selectedDay, ex.id);
    });
    document.getElementById('btn-focus-set-mode')?.addEventListener('click', () => {
      const ex = getActiveFocusExercise();
      if (ex) cycleExerciseSetMode(state.selectedDay, ex.id);
    });
    document.getElementById('btn-focus-rir')?.addEventListener('click', () => {
      const ex = getActiveFocusExercise();
      if (ex) cycleExerciseRir(state.selectedDay, ex.id);
    });
    document.getElementById('btn-focus-calc')?.addEventListener('click', () => {
      const ex = getActiveFocusExercise();
      if (ex) {
        const effKg = GYM_VISUALS && typeof GYM_VISUALS.resolveEffectiveLoadKg === 'function'
          ? GYM_VISUALS.resolveEffectiveLoadKg(ex)
          : Number(ex.loadValue) || 20;
        openCalculatorDialog(effKg, ex.reps || 12);
      }
    });
    document.getElementById('btn-focus-tut')?.addEventListener('click', () => {
      const ex = getActiveFocusExercise();
      if (!ex) return;
      if (tutState.activeExerciseId === ex.id) {
        stopTutStopwatch();
      } else {
        startTutStopwatch(state.selectedDay, ex.id);
      }
      renderWorkoutFocusScreen();
    });
    document.getElementById('btn-focus-edit')?.addEventListener('click', () => {
      const ex = getActiveFocusExercise();
      if (ex) openExerciseDialog(ex);
    });
    document.getElementById('btn-focus-finish-workout')?.addEventListener('click', () => {
      finishWorkoutSession();
    });
    document.getElementById('btn-focus-truncate-workout')?.addEventListener('click', () => {
      openWorkoutTruncateDialog();
    });
    document.getElementById('btn-focus-truncate-top')?.addEventListener('click', () => {
      openWorkoutTruncateDialog();
    });
    document.getElementById('btn-close-truncate-dialog')?.addEventListener('click', () => {
      closeWorkoutTruncateDialog();
    });
    document.getElementById('btn-truncate-cancel')?.addEventListener('click', () => {
      closeWorkoutTruncateDialog();
    });
    document.getElementById('btn-truncate-save-exit')?.addEventListener('click', () => {
      truncateWorkoutSession(true);
    });
    document.getElementById('btn-truncate-discard-exit')?.addEventListener('click', () => {
      truncateWorkoutSession(false);
    });
    document.getElementById('btn-focus-skip-exercise')?.addEventListener('click', () => {
      skipCurrentFocusExercise();
    });

    document.getElementById('btn-results-apply-progression')?.addEventListener('click', () => {
      applyNextDayProgression();
    });
    document.getElementById('btn-results-view-stats')?.addEventListener('click', () => {
      closeWorkoutResultsDialog();
      exitWorkoutScreen();
      switchAppScreen('stats');
    });
    document.getElementById('btn-results-close-plan')?.addEventListener('click', () => {
      closeWorkoutResultsDialog();
      exitWorkoutScreen();
    });

    // Fallback de Light Dismiss para navegadores sin closedby nativo
    ['workout-truncate-dialog', 'workout-results-dialog'].forEach(dlgId => {
      const dlg = document.getElementById(dlgId);
      if (dlg && typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
        dlg.addEventListener('click', event => {
          if (event.target !== dlg) return;
          const rect = dlg.getBoundingClientRect();
          const isInside = (
            rect.top <= event.clientY &&
            event.clientY <= rect.top + rect.height &&
            rect.left <= event.clientX &&
            event.clientX <= rect.left + rect.width
          );
          if (!isInside && typeof dlg.close === 'function') {
            dlg.close();
          }
        });
      }
    });

    document.querySelectorAll('#bottom-app-nav .bottom-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.navScreen;
        if (target === 'workout') {
          startDayWorkoutSession(state.selectedDay, state.activeExerciseIndex || 0);
        } else if (target) {
          switchAppScreen(target);
        }
      });
    });

    // Cerrar menús desplegables de cabecera/día al tocar fuera
    document.addEventListener('click', e => {
      const headerMenu = document.getElementById('header-tools-menu');
      if (headerMenu && headerMenu.open && !headerMenu.contains(e.target)) {
        headerMenu.open = false;
      }
      const dayMenu = document.getElementById('day-secondary-menu');
      if (dayMenu && dayMenu.open && !dayMenu.contains(e.target)) {
        dayMenu.open = false;
      }
    });

    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      const dataStr = JSON.stringify(state, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gym-rutinas-pro-backup.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    const importTrigger = document.getElementById('btn-import-json-trigger');
    const importInput = document.getElementById('input-import-json');
    if (importTrigger && importInput) {
      importTrigger.addEventListener('click', () => importInput.click());
      importInput.addEventListener('change', e => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          try {
            const imported = JSON.parse(String(ev.target?.result || ''));
            if (imported && imported.schedule && imported.schedule.lunes) {
              state = imported;
              saveState();
              renderAll();
            }
          } catch (_) {
            // Invalid JSON ignored
          }
        };
        reader.readAsText(file);
      });
    }

    // Listeners del Onboarding & Perfil Biométrico Dinámico
    const btnHeaderProfile = document.getElementById('btn-header-profile');
    if (btnHeaderProfile) {
      btnHeaderProfile.addEventListener('click', () => openProfileOnboardingDialog(false));
    }
    const btnReconfigProfile = document.getElementById('btn-reconfigure-profile');
    if (btnReconfigProfile) {
      btnReconfigProfile.addEventListener('click', () => openProfileOnboardingDialog(false));
    }
    const btnResetProfile = document.getElementById('btn-reset-profile-default');
    if (btnResetProfile) {
      btnResetProfile.addEventListener('click', () => {
        if (typeof confirm !== 'function' || confirm('¿Restablecer el entrenamiento a la rutina original base?')) {
          restoreOriginalSchedule();
          showCelebrationToast('🔄 Rutina restablecida a los valores originales');
        }
      });
    }
    const btnCancelProfile = document.getElementById('btn-cancel-profile');
    if (btnCancelProfile) {
      btnCancelProfile.addEventListener('click', () => {
        document.getElementById('profile-onboarding-dialog')?.close();
      });
    }
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const profileData = {
          name: document.getElementById('profile-name-input')?.value,
          gender: document.getElementById('profile-gender-select')?.value,
          age: document.getElementById('profile-age-input')?.value,
          weightKg: document.getElementById('profile-weight-input')?.value,
          heightCm: document.getElementById('profile-height-input')?.value,
          fitnessLevel: document.getElementById('profile-level-select')?.value,
          primaryGoal: document.getElementById('profile-goal-select')?.value,
          daysPerWeek: document.getElementById('profile-days-select')?.value,
          limitations: document.getElementById('profile-limitations-select')?.value
        };
        saveUserProfile(profileData);
        document.getElementById('profile-onboarding-dialog')?.close();
      });
      profileForm.addEventListener('input', updateProfilePreviewFromInputs);
      profileForm.addEventListener('change', updateProfilePreviewFromInputs);
    }

    // Modal de Sustitución por Máquina Ocupada
    const btnCloseSwap = document.getElementById('btn-close-swap-dialog');
    if (btnCloseSwap) {
      btnCloseSwap.addEventListener('click', () => {
        document.getElementById('exercise-swap-dialog')?.close();
      });
    }
    const btnRestoreSwap = document.getElementById('btn-restore-swap-original');
    if (btnRestoreSwap) {
      btnRestoreSwap.addEventListener('click', () => {
        if (currentSwapTarget.dayId && currentSwapTarget.exerciseId) {
          swapExerciseAlternative(currentSwapTarget.dayId, currentSwapTarget.exerciseId);
          document.getElementById('exercise-swap-dialog')?.close();
        }
      });
    }
  }

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  window.GymApp = {
    getState: () => state,
    selectDay: dayId => {
      if (DAYS_ORDER.includes(dayId)) {
        state.selectedDay = dayId;
        state.activeExerciseIndex = 0;
        saveState();
        renderAll();
      }
    },
    moveDayToSunday,
    shiftChainToSunday,
    swapDays,
    restoreOriginalSchedule,
    toggleExerciseLoadUnit,
    adjustExerciseLoad,
    toggleSetCompletion,
    logCurrentWorkoutSession,
    // Cronómetro & TUT APIs
    startSessionStopwatch,
    pauseSessionStopwatch,
    toggleSessionStopwatch,
    resetSessionStopwatch,
    lapSessionStopwatch,
    getStopwatchElapsedMs,
    startTutStopwatch,
    stopTutStopwatch,
    switchFloatingTimerMode,
    startRestTimer,
    stopRestTimer,
    // APIs Pro v1.4 (Visor Técnico 3 Fases, Calentamiento, Sobrecarga Progresiva y WakeLock)
    openSpriteViewerDialog,
    setSpriteViewerPhase,
    setSpriteViewerSpeed,
    toggleWarmupStep,
    completeAllWarmupSteps,
    toggleWakeLock,
    // APIs Élite v1.5 (Calculadora Discos/1RM, Medidas Corporales, Modos Serie/RIR, Coach Voz/Cadencia y Plantillas/PNG)
    openCalculatorDialog,
    renderCalculatorModal,
    recordBodyMetrics,
    cycleExerciseSetMode,
    cycleExerciseRir,
    toggleVoiceCoach,
    getCadencePhaseForSecond,
    applyWorkoutTemplate,
    renderShareableSummaryCard,
    downloadShareableSummaryCard,
    // APIs Master v1.6 (Nutrición/Hidratación, Sustitución Máquina Ocupada, Modo Descarga Deload y Gamificación)
    swapExerciseAlternative,
    openExerciseSwapModal,
    toggleDeloadMode,
    setNutritionGoal,
    addHydrationWater,
    resetHydrationWater,
    toggleSupplementCheck,
    renderNutritionDashboard,
    renderGamificationDashboard,
    // APIs Legend v1.7 (Semáforo Recuperación/Readiness, Doble Progresión 1-Toque y Bitácora + Exportación Excel CSV)
    updateReadinessMetrics,
    renderRecoveryAndReadinessDashboard,
    getSmartProgressionSuggestions,
    applySmartProgressionSuggestion,
    setSessionJournalNote,
    exportWorkoutCsv,
    // APIs Focus UI v1.8 (Navegación Multi-Pantalla, Modo Entrenamiento Activo por Ejercicio y Menús Agrupados)
    switchAppScreen,
    startDayWorkoutSession,
    exitWorkoutScreen,
    selectFocusExercise,
    renderWorkoutFocusScreen,
    // APIs Workout Session Focus & Results v1.9.8
    openWorkoutTruncateDialog,
    closeWorkoutTruncateDialog,
    truncateWorkoutSession,
    finishWorkoutSession,
    calculateNextWorkoutProjection,
    openWorkoutResultsDialog,
    closeWorkoutResultsDialog,
    applyNextDayProgression,
    skipCurrentFocusExercise,
    // APIs Dynamic Onboarding & Personalized Training v1.9
    getUserProfile,
    saveUserProfile,
    openProfileOnboardingDialog,
    renderUserProfileSummary,
    accommodateMissedDayAction,
    // APIs Dynamic Series & Reps v1.9.1
    cycleExerciseReps,
    adjustExerciseSeriesCount,
    getExerciseSetReps,
    formatExerciseRepsSummary
  };

  bindEvents();
  renderAll();

  if (typeof window !== 'undefined' && !window.__TEST_MODE__ && !state.userProfile?.configured) {
    setTimeout(() => {
      openProfileOnboardingDialog(true);
    }, 450);
  }
})();
