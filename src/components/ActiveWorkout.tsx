import React, { useState, useEffect, useRef } from 'react';
import {
  RoutineDay,
  WorkoutLog,
  LoggedExercise,
  LoggedSet,
  ActiveTab,
} from '../types/gym';
import {
  formatStopwatch,
  formatDuration,
} from '../utils/dateAndStats';
import {
  saveWorkoutLogs,
  loadWorkoutLogs,
  saveActiveWorkout,
  loadActiveWorkout,
  addWorkoutLog,
} from '../utils/storage';
import { DEFAULT_ROUTINE } from '../data/defaultRoutine';
import { syncLogsToSupabase } from '../utils/supabase';
import { DecimalWeightInput } from './DecimalWeightInput';
import {
  Play,
  RotateCcw,
  Check,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Save,
  Flame,
  ChevronDown,
  Dumbbell,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ActiveWorkoutProps {
  routineDays: RoutineDay[];
  onWorkoutSaved: () => void;
  setActiveTab: (tab: ActiveTab) => void;
  initialDayId?: string;
}

const getElapsedSecondsFromStart = (startIso: string): number => {
  try {
    const startMs = new Date(startIso).getTime();
    if (isNaN(startMs)) return 0;
    return Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  } catch {
    return 0;
  }
};

export const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({
  routineDays,
  onWorkoutSaved,
  setActiveTab,
  initialDayId,
}) => {
  const effectiveDays = routineDays && routineDays.length > 0 ? routineDays : DEFAULT_ROUTINE;
  const [selectedDayId, setSelectedDayId] = useState<string>(initialDayId || 'dia-1');
  const [isStarted, setIsStarted] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<string>(() => new Date().toISOString());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [workoutDate, setWorkoutDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 16)
  ); // For input datetime-local
  const [workoutNotes, setWorkoutNotes] = useState<string>('');
  const [exercises, setExercises] = useState<LoggedExercise[]>([]);
  const [newExerciseName, setNewExerciseName] = useState<string>('');
  const [showAddCustomModal, setShowAddCustomModal] = useState<boolean>(false);

  // Load from local storage if workout was active
  useEffect(() => {
    const saved = loadActiveWorkout();
    if (saved && saved.exercises && saved.exercises.length > 0) {
      setSelectedDayId(saved.routineDayId);
      setIsStarted(true);
      setStartTime(saved.startTime);
      try {
        setWorkoutDate(new Date(saved.startTime).toISOString().slice(0, 16));
      } catch {
        // fallback
      }
      setWorkoutNotes(saved.notes || '');
      setExercises(saved.exercises);

      // Immediately calculate true wall-clock elapsed time
      const actualElapsed = getElapsedSecondsFromStart(saved.startTime);
      setElapsedSeconds(actualElapsed);
    } else {
      // Initialize with Day 1
      loadDayTemplate(initialDayId || 'dia-1');
    }
  }, []);

  // Continuous Wall-Clock synchronization (keeps measuring accurately even when phone screen is locked or asleep)
  useEffect(() => {
    if (!isStarted) {
      setElapsedSeconds(0);
      return;
    }

    const syncElapsed = () => {
      setElapsedSeconds(getElapsedSecondsFromStart(startTime));
    };

    syncElapsed();
    const interval = setInterval(syncElapsed, 1000);

    const handleWakeOrFocus = () => {
      syncElapsed();
    };

    document.addEventListener('visibilitychange', handleWakeOrFocus);
    window.addEventListener('focus', handleWakeOrFocus);
    window.addEventListener('pageshow', handleWakeOrFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleWakeOrFocus);
      window.removeEventListener('focus', handleWakeOrFocus);
      window.removeEventListener('pageshow', handleWakeOrFocus);
    };
  }, [isStarted, startTime]);

  // Persist active state to localStorage on changes
  useEffect(() => {
    if (isStarted && exercises.length > 0) {
      const dayObj = effectiveDays.find((d) => d.id === selectedDayId) || effectiveDays[0];
      saveActiveWorkout({
        routineDayId: selectedDayId,
        routineDayName: dayObj ? dayObj.name : 'Entrenamiento',
        startTime,
        elapsedSeconds,
        isRunning: true,
        notes: workoutNotes,
        exercises,
      });
    }
  }, [
    isStarted,
    selectedDayId,
    startTime,
    elapsedSeconds,
    workoutNotes,
    exercises,
    effectiveDays,
  ]);

  const loadDayTemplate = (dayId: string) => {
    const targetDay = effectiveDays.find((d) => d.id === dayId) || effectiveDays[0];
    if (!targetDay) return;

    // Look at past logs to find last used weights if available for smart progression
    const pastLogs = loadWorkoutLogs();

    const preparedExercises: LoggedExercise[] = targetDay.exercises.map((template) => {
      // Check last log for this exercise
      let previousWeight = template.defaultWeightKg;
      let previousReps = template.targetReps;

      for (const log of pastLogs) {
        const found = log.exercises.find((e) => e.name.toLowerCase() === template.name.toLowerCase());
        if (found && found.sets.length > 0) {
          const completed = found.sets.filter((s) => s.completed);
          if (completed.length > 0) {
            previousWeight = completed[0].weightKg;
            previousReps = completed[0].reps;
            break;
          }
        }
      }

      const sets: LoggedSet[] = [];
      for (let i = 1; i <= template.targetSets; i++) {
        sets.push({
          setNumber: i,
          weightKg: previousWeight,
          reps: previousReps,
          completed: false,
        });
      }

      return {
        id: template.id,
        name: template.name,
        category: template.category,
        notes: template.notes || template.weightRangeNote || '',
        sets,
      };
    });

    setExercises(preparedExercises);
    setSelectedDayId(dayId);
  };

  const handleDaySelect = (dayId: string) => {
    if (isStarted && elapsedSeconds > 30) {
      if (
        !window.confirm(
          '¿Deseas cambiar de día? Se reiniciarán las series actuales del entrenamiento.'
        )
      ) {
        return;
      }
    }
    setSelectedDayId(dayId);
    loadDayTemplate(dayId);
  };

  const startWorkout = () => {
    const now = new Date();
    const nowIso = now.toISOString();
    setStartTime(nowIso);
    setWorkoutDate(nowIso.slice(0, 16));
    setIsStarted(true);
    setElapsedSeconds(0);
  };

  const resetStartTimeToNow = () => {
    if (window.confirm('¿Reiniciar el tiempo de inicio de entrenamiento a este momento (00:00:00)?')) {
      const now = new Date();
      const nowIso = now.toISOString();
      setStartTime(nowIso);
      setWorkoutDate(nowIso.slice(0, 16));
      setElapsedSeconds(0);
    }
  };

  // Set management
  const toggleSetCompleted = (exerciseIndex: number, setIndex: number) => {
    const updated = [...exercises];
    const targetSet = updated[exerciseIndex].sets[setIndex];
    const willBeCompleted = !targetSet.completed;
    targetSet.completed = willBeCompleted;
    setExercises(updated);

    if (!isStarted) {
      const now = new Date();
      const nowIso = now.toISOString();
      setStartTime(nowIso);
      setWorkoutDate(nowIso.slice(0, 16));
      setIsStarted(true);
    }
  };

  const updateSetWeight = (
    exerciseIndex: number,
    setIndex: number,
    value: number
  ) => {
    const updated = [...exercises];
    updated[exerciseIndex].sets[setIndex].weightKg = Math.max(0, value);
    setExercises(updated);
  };

  const adjustSetWeight = (
    exerciseIndex: number,
    setIndex: number,
    delta: number
  ) => {
    const updated = [...exercises];
    const current = updated[exerciseIndex].sets[setIndex].weightKg;
    updated[exerciseIndex].sets[setIndex].weightKg = Math.max(0, Math.round((current + delta) * 10) / 10);
    setExercises(updated);
  };

  const updateSetReps = (
    exerciseIndex: number,
    setIndex: number,
    value: number
  ) => {
    const updated = [...exercises];
    updated[exerciseIndex].sets[setIndex].reps = Math.max(0, value);
    setExercises(updated);
  };

  const adjustSetReps = (
    exerciseIndex: number,
    setIndex: number,
    delta: number
  ) => {
    const updated = [...exercises];
    const current = updated[exerciseIndex].sets[setIndex].reps;
    updated[exerciseIndex].sets[setIndex].reps = Math.max(1, current + delta);
    setExercises(updated);
  };


  const removeSetFromExercise = (exerciseIndex: number, setIndex: number) => {
    const updated = [...exercises];
    if (updated[exerciseIndex].sets.length <= 1) return;
    updated[exerciseIndex].sets.splice(setIndex, 1);
    // Renumber
    updated[exerciseIndex].sets.forEach((s, idx) => {
      s.setNumber = idx + 1;
    });
    setExercises(updated);
  };

  const updateExerciseNotes = (exerciseIndex: number, notes: string) => {
    const updated = [...exercises];
    updated[exerciseIndex].notes = notes;
    setExercises(updated);
  };

  const removeExercise = (exerciseIndex: number) => {
    if (window.confirm(`¿Quitar "${exercises[exerciseIndex].name}" de la sesión de hoy?`)) {
      const updated = exercises.filter((_, idx) => idx !== exerciseIndex);
      setExercises(updated);
    }
  };

  const addCustomExercise = () => {
    if (!newExerciseName.trim()) return;
    const newEx: LoggedExercise = {
      id: 'custom-' + Date.now(),
      name: newExerciseName.trim(),
      category: 'General',
      notes: '',
      sets: [
        { setNumber: 1, weightKg: 20, reps: 15, completed: false },
        { setNumber: 2, weightKg: 20, reps: 15, completed: false },
        { setNumber: 3, weightKg: 20, reps: 15, completed: false },
        { setNumber: 4, weightKg: 20, reps: 15, completed: false },
      ],
    };
    setExercises([...exercises, newEx]);
    setNewExerciseName('');
    setShowAddCustomModal(false);
  };

  // Metrics
  let totalSetsCompleted = 0;
  let totalSetsPlanned = 0;
  let totalVolumeKg = 0;
  let totalRepsCompleted = 0;

  exercises.forEach((ex) => {
    totalSetsPlanned += ex.sets.length;
    ex.sets.forEach((s) => {
      if (s.completed) {
        totalSetsCompleted += 1;
        totalVolumeKg += s.weightKg * s.reps;
        totalRepsCompleted += s.reps;
      }
    });
  });

  const completionRate =
    totalSetsPlanned > 0
      ? Math.round((totalSetsCompleted / totalSetsPlanned) * 100)
      : 0;

  const handleFinishAndSave = () => {
    if (totalSetsCompleted === 0) {
      if (
        !window.confirm(
          'No has marcado ninguna serie como completada. ¿Guardar el entrenamiento de todas formas?'
        )
      ) {
        return;
      }
    }

    const dayObj = effectiveDays.find((d) => d.id === selectedDayId) || effectiveDays[0];
    const dayName = dayObj ? dayObj.name : 'Entrenamiento';

    let finalStart = startTime;
    try {
      finalStart = new Date(workoutDate).toISOString();
    } catch {
      // keep
    }

    const calculatedDuration = getElapsedSecondsFromStart(finalStart);
    const durationSec = Math.max(calculatedDuration, 60); // at least 1 min
    const finalEnd = new Date(
      new Date(finalStart).getTime() + durationSec * 1000
    ).toISOString();

    const newLog: WorkoutLog = {
      id: 'log-' + Date.now(),
      routineDayId: selectedDayId,
      routineDayName: dayName,
      startTime: finalStart,
      endTime: finalEnd,
      durationSeconds: durationSec,
      notes: workoutNotes.trim(),
      exercises: exercises,
      totalVolumeKg: Math.round(totalVolumeKg * 10) / 10,
      totalSetsCompleted,
      totalRepsCompleted,
    };

    // Save directly to real history
    addWorkoutLog(newLog);
    saveActiveWorkout(null); // Clear active

    // Silent background sync to Supabase
    syncLogsToSupabase([newLog]).catch(() => {});

    // Trigger celebratory confetti
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    setIsStarted(false);
    setElapsedSeconds(0);
    setWorkoutNotes('');
    loadDayTemplate(selectedDayId); // Reset to fresh routine template
    onWorkoutSaved();
    setActiveTab('historial');
  };

  const handleDiscard = () => {
    if (
      window.confirm(
        '¿Estás seguro de cancelar y descartar este entrenamiento en curso?'
      )
    ) {
      saveActiveWorkout(null);
      setIsStarted(false);
      setElapsedSeconds(0);
      loadDayTemplate(selectedDayId);
    }
  };

  const currentDayObj = effectiveDays.find((d) => d.id === selectedDayId) || effectiveDays[0];

  return (
    <div className="pb-44 md:pb-28 pt-2 sm:pt-4 max-w-5xl mx-auto px-3 sm:px-6 w-full max-w-full overflow-hidden">
      {/* Top Banner / Day Selector */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Control de Entrenamiento
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-400">
                {currentDayObj?.subtitle || 'Rutina de Gimnasio'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
              {currentDayObj?.name || 'Entrenamiento'}: {currentDayObj?.subtitle}
            </h1>
          </div>

          {/* Routine Day Switcher Tabs & Quick Finish */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
              {effectiveDays.map((day) => (
                <button
                  key={day.id}
                  onClick={() => handleDaySelect(day.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedDayId === day.id
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {day.name}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleFinishAndSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 cursor-pointer transition-all active:scale-95"
              title="Guardar sesión y registrar en el historial"
            >
              <Save className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Finalizar Sesión</span>
            </button>
          </div>
        </div>

        {/* Workout Control Bar: Date & Live Stopwatch */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 pt-5 border-t border-slate-800/80 items-center">
          {/* Date and time picker */}
          <div className="flex items-center gap-2.5 bg-slate-950/60 px-3.5 py-2.5 rounded-xl border border-slate-800 text-slate-300">
            <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex-1">
              <label className="block text-[10px] text-slate-400 font-medium uppercase leading-none mb-1">
                Fecha y Hora de Inicio
              </label>
              <input
                type="datetime-local"
                value={workoutDate}
                onChange={(e) => {
                  setWorkoutDate(e.target.value);
                  try {
                    const newD = new Date(e.target.value);
                    if (!isNaN(newD.getTime())) {
                      const iso = newD.toISOString();
                      setStartTime(iso);
                      setElapsedSeconds(getElapsedSecondsFromStart(iso));
                    }
                  } catch {
                    // ignore
                  }
                }}
                className="bg-transparent text-xs text-white font-medium focus:outline-none w-full font-mono-nums"
              />
            </div>
          </div>

          {/* Live Total Workout Time (Wall-Clock based) */}
          <div className="flex items-center justify-between bg-slate-950/60 px-4 py-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                <Clock className={`w-4 h-4 ${isStarted ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="block text-[10px] text-slate-400 font-medium uppercase leading-none">
                    Tiempo Total de Entrenamiento
                  </span>
                  {isStarted && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      En vivo
                    </span>
                  )}
                </div>
                <span className="text-xl font-bold font-mono-nums text-white tracking-wider">
                  {formatStopwatch(elapsedSeconds)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {!isStarted ? (
                <button
                  type="button"
                  onClick={startWorkout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-sm"
                  title="Iniciar cronómetro de entrenamiento"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Iniciar</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resetStartTimeToNow}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Reiniciar hora de inicio a este momento"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Global Progress Indicator */}
        <div className="mt-4 pt-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span>
              Series: <strong className="text-white font-mono-nums">{totalSetsCompleted}</strong> / {totalSetsPlanned}
            </span>
            <span>·</span>
            <span>
              Volumen: <strong className="text-emerald-400 font-mono-nums">{totalVolumeKg.toLocaleString()}</strong> Kg
            </span>
            <span>·</span>
            <span>
              Reps: <strong className="text-white font-mono-nums">{totalRepsCompleted}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 w-32 sm:w-44">
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <span className="font-mono-nums text-[11px] text-slate-300 font-medium shrink-0">
              {completionRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Exercise Cards List */}
      <div className="space-y-4">
        {exercises.map((exercise, exerciseIdx) => (
          <div
            key={exercise.id + '-' + exerciseIdx}
            className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-lg hover:border-slate-700/80 transition-all"
          >
            {/* Exercise Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">
                    #{exerciseIdx + 1}
                  </span>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    {exercise.name}
                  </h2>
                  <span className="text-xs text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                    {exercise.category}
                  </span>
                </div>
                {exercise.notes && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{exercise.notes}</span>
                  </p>
                )}
              </div>

              <button
                onClick={() => removeExercise(exerciseIdx)}
                className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800 transition-colors"
                title="Quitar ejercicio"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Sets Table */}
            <div className="overflow-x-auto w-full -mx-1 sm:mx-0 px-1 sm:px-0">
              <table className="w-full text-left text-sm min-w-[320px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800/80">
                    <th className="pb-2 w-14 text-center">Serie</th>
                    <th className="pb-2 pl-2">Peso (Kg)</th>
                    <th className="pb-2 pl-2">Repeticiones</th>
                    <th className="pb-2 w-28 text-center">Estado</th>
                    <th className="pb-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {exercise.sets.map((set, setIdx) => (
                    <tr
                      key={setIdx}
                      className={`group transition-colors ${
                        set.completed
                          ? 'bg-emerald-950/15 text-slate-200'
                          : 'hover:bg-slate-800/30 text-slate-300'
                      }`}
                    >
                      {/* Set Number */}
                      <td className="py-2.5 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-mono-nums text-xs font-bold ${
                            set.completed
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {set.setNumber}
                        </span>
                      </td>

                      {/* Weight Control */}
                      <td className="py-2.5 pl-2">
                        <div className="flex items-center gap-1">
                          <DecimalWeightInput
                            value={set.weightKg}
                            onChange={(val) => updateSetWeight(exerciseIdx, setIdx, val)}
                            onAdjust={(delta) => adjustSetWeight(exerciseIdx, setIdx, delta)}
                            placeholder="0"
                          />
                          <span className="text-xs text-slate-400 font-medium ml-1">
                            Kg
                          </span>
                        </div>
                      </td>

                      {/* Reps Control */}
                      <td className="py-2.5 pl-2">
                        <div className="flex items-center gap-1 max-w-[150px]">
                          <button
                            type="button"
                            onClick={() => adjustSetReps(exerciseIdx, setIdx, -1)}
                            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold"
                            title="-1 rep"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={set.reps}
                            onChange={(e) =>
                              updateSetReps(
                                exerciseIdx,
                                setIdx,
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-14 px-2 py-1 bg-slate-950/80 border border-slate-700 rounded-lg text-center font-mono-nums text-sm font-semibold text-white focus:border-emerald-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => adjustSetReps(exerciseIdx, setIdx, 1)}
                            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold"
                            title="+1 rep"
                          >
                            +
                          </button>
                          <span className="text-xs text-slate-400 font-medium ml-1">
                            reps
                          </span>
                        </div>
                      </td>

                      {/* Complete Check Button */}
                      <td className="py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSetCompleted(exerciseIdx, setIdx)}
                          className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            set.completed
                              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                          }`}
                        >
                          <Check
                            className={`w-3.5 h-3.5 stroke-[3] ${
                              set.completed ? 'text-slate-950' : 'text-slate-400'
                            }`}
                          />
                          <span>{set.completed ? 'Lista' : 'Marcar'}</span>
                        </button>
                      </td>

                      {/* Remove Set */}
                      <td className="py-2.5 text-right">
                        {exercise.sets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSetFromExercise(exerciseIdx, setIdx)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                            title="Eliminar serie"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Exercise Footer: Note input */}
            <div className="mt-3 pt-3 border-t border-slate-800/80">
              <input
                type="text"
                placeholder="Añadir nota de sensaciones (opcional)..."
                value={exercise.notes || ''}
                onChange={(e) => updateExerciseNotes(exerciseIdx, e.target.value)}
                className="bg-slate-950/50 border border-slate-800 focus:border-slate-700 text-xs text-slate-300 px-3 py-1.5 rounded-lg w-full focus:outline-none placeholder:text-slate-600"
              />
            </div>
          </div>
        ))}

        {/* Add custom exercise to today's workout */}
        <div className="pt-2">
          {showAddCustomModal ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                placeholder="Nombre del nuevo ejercicio (ej. Fondos paralelas, Polea alta)..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addCustomExercise();
                }}
              />
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={addCustomExercise}
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-md"
                >
                  Añadir a la sesión
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddCustomModal(true)}
              className="w-full py-3.5 border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-2xl text-slate-400 hover:text-slate-200 text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Añadir otro ejercicio a la sesión de hoy</span>
            </button>
          )}
        </div>

        {/* Session General Notes */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 mt-6">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Notas generales de la sesión
          </label>
          <textarea
            value={workoutNotes}
            onChange={(e) => setWorkoutNotes(e.target.value)}
            rows={2}
            placeholder="¿Cómo te sentiste hoy? (ej. Buena fuerza en prensa, hombros descansados, hidratación adecuada)..."
            className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none resize-none"
          />
        </div>
      </div>

      {/* Sticky Bottom Bar for Final Action (Positioned cleanly above mobile nav bar) */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-30 p-3 sm:p-4 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-md shadow-2xl">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Quick Summary Pill / Metadata */}
          <div className="flex items-center gap-4 text-xs text-slate-300 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono-nums font-semibold text-white">
                {formatDuration(elapsedSeconds)}
              </span>
            </div>
            <span>·</span>
            <div>
              <span className="text-slate-400">Series: </span>
              <span className="font-mono-nums font-semibold text-white">
                {totalSetsCompleted} / {totalSetsPlanned}
              </span>
            </div>
            <span>·</span>
            <div>
              <span className="text-slate-400">Volumen: </span>
              <span className="font-mono-nums font-bold text-emerald-400">
                {totalVolumeKg.toLocaleString()} Kg
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleDiscard}
              className="px-3.5 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-rose-400 text-xs font-semibold transition-colors cursor-pointer"
            >
              Descartar
            </button>

            <button
              type="button"
              onClick={handleFinishAndSave}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>Finalizar y Guardar</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
