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
        completedSets: Array.from({ length: ex.sets || 4 }, () => false)
      }));
    }
    return {
      version: 2,
      selectedDay: detectDefaultDay(),
      searchQuery: '',
      animationsPaused: false,
      wakeLockEnabled: false,
      warmupByDay: {},
      progressionHistory: [],
      history: [],
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
      if (!parsed.warmupByDay || typeof parsed.warmupByDay !== 'object') {
        parsed.warmupByDay = {};
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
    elapsedSeconds: 0
  };

  let currentFloatingTimerMode = 'rest'; // 'rest' | 'stopwatch'

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

    const floatDigitsEl = document.getElementById('floating-stopwatch-digits');
    if (floatDigitsEl) floatDigitsEl.textContent = formatted;

    const dotEl = document.getElementById('stopwatch-pulse-dot');
    if (dotEl) {
      dotEl.classList.toggle('is-running', stopwatchState.running);
    }

    const toggleBtn = document.getElementById('btn-stopwatch-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = stopwatchState.running ? '⏸ Pausar' : '▶ Iniciar';
      toggleBtn.classList.toggle('is-active', stopwatchState.running);
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

  function startTutStopwatch(dayId, exerciseId) {
    if (tutState.intervalId) {
      clearInterval(tutState.intervalId);
    }
    tutState.activeDayId = dayId;
    tutState.activeExerciseId = exerciseId;
    tutState.startTime = Date.now();
    tutState.elapsedSeconds = 0;

    if (!stopwatchState.running) {
      startSessionStopwatch();
    }

    tutState.intervalId = setInterval(() => {
      tutState.elapsedSeconds = Math.floor((Date.now() - tutState.startTime) / 1000);
      updateTutButton(exerciseId);
    }, 250);

    renderExercisesList();
    showCelebrationToast('⏱️ Serie iniciada. Ejecuta tus 12 repeticiones');
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
          icon: 'assets/icon.svg',
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

  function logCurrentWorkoutSession() {
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

    const durationMs = getStopwatchElapsedMs();
    const durationText = formatStopwatchDurationText(durationMs);

    const record = {
      id: `session-${Date.now()}`,
      dateISO: new Date().toISOString(),
      dayName: day.dayName,
      title: day.title,
      setsDone: doneSets || totalSets,
      setsPlanned: totalSets,
      volumeKg: dayStat ? (dayStat.doneKg || dayStat.plannedKg) : 0,
      durationMs: durationMs,
      durationText: durationText
    };

    state.history.unshift(record);
    if (state.history.length > 30) {
      state.history.length = 30;
    }
    saveState();
    renderAll();
    const durMsg = durationText ? ` · ⏱️ ${durationText}` : '';
    showCelebrationToast(`🏆 Sesión de ${day.dayName} registrada en tu historial${durMsg}`);
    playCompletionTone();
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
    updateTimerDisplay();

    restTimerInterval = setInterval(() => {
      restRemainingSeconds -= 1;
      if (restRemainingSeconds <= 0) {
        restRemainingSeconds = 0;
        updateTimerDisplay();
        clearInterval(restTimerInterval);
        restTimerInterval = null;
        labelEl.textContent = '¡Descanso terminado! Lista la siguiente serie 💪';
        playCompletionTone();
        triggerHaptic([120, 60, 120]);
        sendRestFinishedNotification('⏱️ ¡Descanso terminado!', 'Es hora de iniciar tu siguiente serie de 12 repeticiones 💪');
        return;
      }
      updateTimerDisplay();
    }, 1000);
  }

  function updateTimerDisplay() {
    const countdownEl = document.getElementById('timer-countdown');
    const conicRingEl = document.getElementById('timer-ring-conic');
    if (countdownEl) {
      const mins = Math.floor(restRemainingSeconds / 60);
      const secs = restRemainingSeconds % 60;
      countdownEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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

    const topRow = document.createElement('div');
    topRow.className = 'exercise-top';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'exercise-title-group';

    const h3 = document.createElement('h3');
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
    contentCol.appendChild(topRow);

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
      sReps.textContent = `${ex.reps} reps`;

      setBtn.append(sNum, sReps);
      setBtn.addEventListener('click', () => toggleSetCompletion(dayId, ex.id, s));
      setsRow.appendChild(setBtn);
    }
    contentCol.appendChild(setsRow);

    const tutRow = document.createElement('div');
    tutRow.className = 'set-stopwatch-row';

    const isTimingThis = tutState.activeExerciseId === ex.id;
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
    tutInfo.textContent = 'Mide tiempo bajo tensión (TUT) y avanza serie';

    tutRow.append(tutBtn, tutInfo);
    contentCol.appendChild(tutRow);

    const footer = document.createElement('div');
    footer.className = 'exercise-card-footer';

    const details = document.createElement('details');
    details.className = 'exercise-note-details';
    const summary = document.createElement('summary');
    summary.textContent = `Técnica y referencia (Descanso ${ex.restSeconds || 75}s)`;
    const noteP = document.createElement('p');
    noteP.className = 'exercise-note-body';
    noteP.textContent = ex.note || 'Mantén técnica estricta y controla la fase excéntrica.';
    details.append(summary, noteP);

    const btnEdit = document.createElement('button');
    btnEdit.type = 'button';
    btnEdit.className = 'btn-edit-ex';
    btnEdit.textContent = 'Editar';
    btnEdit.addEventListener('click', () => openExerciseDialog(ex));

    footer.append(details, btnEdit);
    contentCol.appendChild(footer);

    visualLayout.append(illustrationWrap, contentCol);
    li.appendChild(visualLayout);

    return li;
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
          li.innerHTML = `
            <div>
              <strong>${item.dayName}: ${item.title}</strong>
              <div><small>${dateStr}${durBadge}</small></div>
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

    renderWeeklySummary();
    renderDayTabs();
    renderDayHero();
    renderWarmupChecklist();
    renderExercisesList();
    renderAnalyticsDashboard();
    renderProgressionHistory();
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
    // Nuevas APIs Pro (Visor Técnico 3 Fases, Calentamiento, Sobrecarga Progresiva y WakeLock)
    openSpriteViewerDialog,
    setSpriteViewerPhase,
    setSpriteViewerSpeed,
    toggleWarmupStep,
    completeAllWarmupSteps,
    toggleWakeLock
  };

  bindEvents();
  renderAll();
})();
