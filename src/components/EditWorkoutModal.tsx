import React, { useState, useEffect, useMemo } from 'react';
import { WorkoutLog, LoggedExercise, LoggedSet } from '../types/gym';
import { DecimalWeightInput } from './DecimalWeightInput';
import { DEFAULT_ROUTINE } from '../data/defaultRoutine';
import {
  X,
  Plus,
  Trash2,
  Save,
  Dumbbell,
  Calendar,
  Check,
  Layers,
  Edit3,
  Clock,
} from 'lucide-react';

interface EditWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  workoutLog: WorkoutLog | null;
  onSave: (updatedLog: WorkoutLog) => void;
}

export const EditWorkoutModal: React.FC<EditWorkoutModalProps> = ({
  isOpen,
  onClose,
  workoutLog,
  onSave,
}) => {
  const [exercises, setExercises] = useState<LoggedExercise[]>([]);
  const [workoutDate, setWorkoutDate] = useState<string>('');
  const [routineDayName, setRoutineDayName] = useState<string>('');
  const [workoutNotes, setWorkoutNotes] = useState<string>('');
  const [showAddExerciseMenu, setShowAddExerciseMenu] = useState<boolean>(false);
  const [customExerciseName, setCustomExerciseName] = useState<string>('');
  const [customExerciseCategory, setCustomExerciseCategory] = useState<string>('General');

  // Initialize form state when workoutLog changes
  useEffect(() => {
    if (workoutLog) {
      // Deep clone exercises to avoid mutating props
      const clonedExercises: LoggedExercise[] = workoutLog.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => ({ ...s })),
      }));
      setExercises(clonedExercises);
      setRoutineDayName(workoutLog.routineDayName);
      setWorkoutNotes(workoutLog.notes || '');

      // Format ISO start time to datetime-local value (YYYY-MM-DDTHH:mm)
      try {
        const d = new Date(workoutLog.startTime);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        setWorkoutDate(`${year}-${month}-${day}T${hours}:${minutes}`);
      } catch {
        setWorkoutDate(new Date().toISOString().slice(0, 16));
      }
    }
  }, [workoutLog, isOpen]);

  // Real-time metrics recalculation
  const { totalVolumeKg, totalSetsCompleted, totalRepsCompleted, totalSetsPlanned } = useMemo(() => {
    let vol = 0;
    let completedSets = 0;
    let completedReps = 0;
    let plannedSets = 0;

    exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        plannedSets++;
        if (s.completed) {
          vol += (s.weightKg || 0) * (s.reps || 0);
          completedSets++;
          completedReps += s.reps || 0;
        }
      });
    });

    return {
      totalVolumeKg: Math.round(vol * 10) / 10,
      totalSetsCompleted: completedSets,
      totalRepsCompleted: completedReps,
      totalSetsPlanned: plannedSets,
    };
  }, [exercises]);

  if (!isOpen || !workoutLog) return null;

  // Handle set weight change
  const handleWeightChange = (exIdx: number, setIdx: number, val: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const nextEx = { ...next[exIdx] };
      const nextSets = [...nextEx.sets];
      nextSets[setIdx] = { ...nextSets[setIdx], weightKg: val };
      nextEx.sets = nextSets;
      next[exIdx] = nextEx;
      return next;
    });
  };

  // Handle set reps change
  const handleRepsChange = (exIdx: number, setIdx: number, val: number) => {
    const safeVal = Math.max(0, val);
    setExercises((prev) => {
      const next = [...prev];
      const nextEx = { ...next[exIdx] };
      const nextSets = [...nextEx.sets];
      nextSets[setIdx] = { ...nextSets[setIdx], reps: safeVal };
      nextEx.sets = nextSets;
      next[exIdx] = nextEx;
      return next;
    });
  };

  // Toggle set completed status
  const handleToggleSetCompleted = (exIdx: number, setIdx: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const nextEx = { ...next[exIdx] };
      const nextSets = [...nextEx.sets];
      nextSets[setIdx] = {
        ...nextSets[setIdx],
        completed: !nextSets[setIdx].completed,
      };
      nextEx.sets = nextSets;
      next[exIdx] = nextEx;
      return next;
    });
  };

  // Add set to an exercise
  const handleAddSet = (exIdx: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const targetEx = next[exIdx];
      const sets = targetEx.sets;
      const lastSet = sets.length > 0 ? sets[sets.length - 1] : null;

      const newSet: LoggedSet = {
        setNumber: sets.length + 1,
        weightKg: lastSet ? lastSet.weightKg : 20,
        reps: lastSet ? lastSet.reps : 10,
        completed: true,
      };

      const updatedEx = {
        ...targetEx,
        sets: [...sets, newSet],
      };
      next[exIdx] = updatedEx;
      return next;
    });
  };

  // Remove set from an exercise
  const handleRemoveSet = (exIdx: number, setIdx: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const targetEx = next[exIdx];
      const updatedSets = targetEx.sets
        .filter((_, idx) => idx !== setIdx)
        .map((s, idx) => ({ ...s, setNumber: idx + 1 }));

      next[exIdx] = {
        ...targetEx,
        sets: updatedSets,
      };
      return next;
    });
  };

  // Remove entire exercise
  const handleRemoveExercise = (exIdx: number, exName: string) => {
    if (window.confirm(`¿Eliminar el ejercicio "${exName}" de este entrenamiento?`)) {
      setExercises((prev) => prev.filter((_, idx) => idx !== exIdx));
    }
  };

  // Add new exercise from catalog or custom
  const handleAddCatalogExercise = (template: { name: string; category: string; defaultWeightKg: number; targetReps: number }) => {
    const newEx: LoggedExercise = {
      id: 'ex-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      name: template.name,
      category: template.category,
      sets: [
        { setNumber: 1, weightKg: template.defaultWeightKg || 20, reps: template.targetReps || 10, completed: true },
        { setNumber: 2, weightKg: template.defaultWeightKg || 20, reps: template.targetReps || 10, completed: true },
        { setNumber: 3, weightKg: template.defaultWeightKg || 20, reps: template.targetReps || 10, completed: true },
        { setNumber: 4, weightKg: template.defaultWeightKg || 20, reps: template.targetReps || 10, completed: true },
      ],
    };

    setExercises((prev) => [...prev, newEx]);
    setShowAddExerciseMenu(false);
  };

  const handleAddCustomExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customExerciseName.trim()) return;

    const newEx: LoggedExercise = {
      id: 'custom-' + Date.now(),
      name: customExerciseName.trim(),
      category: customExerciseCategory,
      sets: [
        { setNumber: 1, weightKg: 20, reps: 10, completed: true },
        { setNumber: 2, weightKg: 20, reps: 10, completed: true },
        { setNumber: 3, weightKg: 20, reps: 10, completed: true },
        { setNumber: 4, weightKg: 20, reps: 10, completed: true },
      ],
    };

    setExercises((prev) => [...prev, newEx]);
    setCustomExerciseName('');
    setShowAddExerciseMenu(false);
  };

  // Save all changes
  const handleSaveAll = () => {
    let finalStart = workoutLog.startTime;
    try {
      if (workoutDate) {
        finalStart = new Date(workoutDate).toISOString();
      }
    } catch {
      // keep original
    }

    const duration = workoutLog.durationSeconds || 60;
    const finalEnd = new Date(new Date(finalStart).getTime() + duration * 1000).toISOString();

    const updatedLog: WorkoutLog = {
      ...workoutLog,
      routineDayName: routineDayName.trim() || workoutLog.routineDayName,
      startTime: finalStart,
      endTime: finalEnd,
      notes: workoutNotes.trim(),
      exercises: exercises,
      totalVolumeKg,
      totalSetsCompleted,
      totalRepsCompleted,
    };

    onSave(updatedLog);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-semibold text-emerald-400">Modo Edición</span>
                <span>·</span>
                <span>Series, Reps y Pesos</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold font-display text-white tracking-tight">
                Editar Registro de {routineDayName}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar sin guardar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Metadata Controls: Date & Routine Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Fecha y Hora de la Sesión</span>
              </label>
              <input
                type="datetime-local"
                value={workoutDate}
                onChange={(e) => setWorkoutDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono-nums"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nombre o Día de la Rutina</span>
              </label>
              <input
                type="text"
                value={routineDayName}
                onChange={(e) => setRoutineDayName(e.target.value)}
                placeholder="ej. Día 1, Pecho y Espalda..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Exercises & Sets Editor Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Ejercicios Registrados ({exercises.length})</span>
              </h3>

              <button
                type="button"
                onClick={() => setShowAddExerciseMenu(!showAddExerciseMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Añadir Ejercicio</span>
              </button>
            </div>

            {/* Quick Add Exercise Dropdown / Drawer */}
            {showAddExerciseMenu && (
              <div className="p-4 bg-slate-950 border border-emerald-500/30 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white">Selecciona del catálogo o escribe uno nuevo</span>
                  <button
                    type="button"
                    onClick={() => setShowAddExerciseMenu(false)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    Cerrar
                  </button>
                </div>

                {/* From Default Routine */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                    Ejercicios sugeridos de tu plan:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                    {DEFAULT_ROUTINE.flatMap((r) => r.exercises)
                      .filter(
                        (ex, idx, self) =>
                          self.findIndex((e) => e.name.toLowerCase() === ex.name.toLowerCase()) === idx
                      )
                      .map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleAddCatalogExercise(item)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-900 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-slate-800 transition-colors cursor-pointer"
                        >
                          + {item.name}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Custom exercise form */}
                <form onSubmit={handleAddCustomExercise} className="flex gap-2 pt-2 border-t border-slate-800">
                  <input
                    type="text"
                    placeholder="Nombre del nuevo ejercicio..."
                    value={customExerciseName}
                    onChange={(e) => setCustomExerciseName(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <select
                    value={customExerciseCategory}
                    onChange={(e) => setCustomExerciseCategory(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="Pecho">Pecho</option>
                    <option value="Espalda">Espalda</option>
                    <option value="Pierna">Pierna</option>
                    <option value="Hombro">Hombro</option>
                    <option value="Brazo">Brazo</option>
                    <option value="Abdomen">Abdomen</option>
                    <option value="General">General</option>
                  </select>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Añadir
                  </button>
                </form>
              </div>
            )}

            {/* List of exercises to edit */}
            {exercises.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                No hay ejercicios en este entrenamiento. Pulsa "+ Añadir Ejercicio" para registrar tus series.
              </div>
            ) : (
              <div className="space-y-4">
                {exercises.map((exercise, exIdx) => {
                  const completedCount = exercise.sets.filter((s) => s.completed).length;
                  const maxWeight = Math.max(...exercise.sets.filter((s) => s.completed).map((s) => s.weightKg), 0);

                  return (
                    <div
                      key={exercise.id || exIdx}
                      className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 transition-all hover:border-slate-700/80"
                    >
                      {/* Exercise Header */}
                      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <div>
                            <h4 className="font-bold text-sm text-white">
                              {exercise.name}
                            </h4>
                            <span className="text-[10px] text-slate-400">
                              {exercise.category} · {completedCount} de {exercise.sets.length} completadas
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono-nums font-bold text-emerald-400">
                            {maxWeight > 0 ? `${maxWeight} Kg máx` : 'Peso corporal'}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveExercise(exIdx, exercise.name)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
                            title="Eliminar este ejercicio"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Sets Table Header */}
                      <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                        <div className="col-span-2 sm:col-span-1 text-center">Serie</div>
                        <div className="col-span-4 sm:col-span-4 text-center">Peso (Kg)</div>
                        <div className="col-span-3 sm:col-span-3 text-center">Reps</div>
                        <div className="col-span-2 sm:col-span-3 text-center">Estado</div>
                        <div className="col-span-1 sm:col-span-1 text-center"></div>
                      </div>

                      {/* Sets Rows */}
                      <div className="space-y-2">
                        {exercise.sets.map((set, setIdx) => (
                          <div
                            key={setIdx}
                            className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl border transition-colors ${
                              set.completed
                                ? 'bg-slate-900/90 border-slate-800'
                                : 'bg-slate-950/40 border-slate-900 opacity-60'
                            }`}
                          >
                            {/* Set Number */}
                            <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
                              <span className="font-mono-nums font-bold text-xs text-slate-300 bg-slate-800 px-2 py-1 rounded-lg">
                                S{set.setNumber}
                              </span>
                            </div>

                            {/* Weight Input (with 0.5kg precision steppers) */}
                            <div className="col-span-4 sm:col-span-4">
                              <DecimalWeightInput
                                value={set.weightKg}
                                onChange={(val) => handleWeightChange(exIdx, setIdx, val)}
                                size="sm"
                                placeholder="0"
                              />
                            </div>

                            {/* Reps Input */}
                            <div className="col-span-3 sm:col-span-3 flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleRepsChange(exIdx, setIdx, set.reps - 1)}
                                className="w-6 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={set.reps}
                                onChange={(e) => handleRepsChange(exIdx, setIdx, parseInt(e.target.value) || 0)}
                                className="w-12 bg-slate-950 border border-slate-700 rounded-lg py-1 text-center text-xs text-white font-mono-nums font-bold focus:outline-none focus:border-emerald-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleRepsChange(exIdx, setIdx, set.reps + 1)}
                                className="w-6 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>

                            {/* Completed Checkbox Toggle */}
                            <div className="col-span-2 sm:col-span-3 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => handleToggleSetCompleted(exIdx, setIdx)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                                  set.completed
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-slate-800/80 text-slate-500 border border-slate-700 hover:text-slate-300'
                                }`}
                              >
                                <Check className={`w-3.5 h-3.5 ${set.completed ? 'stroke-[3]' : 'opacity-30'}`} />
                                <span className="hidden sm:inline">
                                  {set.completed ? 'Hecha' : 'Saltada'}
                                </span>
                              </button>
                            </div>

                            {/* Delete Set */}
                            <div className="col-span-1 sm:col-span-1 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveSet(exIdx, setIdx)}
                                className="p-1 text-slate-600 hover:text-rose-400 rounded transition-colors cursor-pointer"
                                title="Eliminar serie"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add Set Button */}
                      <button
                        type="button"
                        onClick={() => handleAddSet(exIdx)}
                        className="mt-3 w-full py-1.5 border border-dashed border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 hover:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Añadir otra serie a {exercise.name}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Session Notes */}
          <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80">
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Notas de la Sesión
            </label>
            <textarea
              value={workoutNotes}
              onChange={(e) => setWorkoutNotes(e.target.value)}
              rows={2}
              placeholder="Sensaciones, descansos, cargas alcanzadas..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>
        </div>

        {/* Modal Sticky Bottom Footer with Recalculated KPIs and Save Action */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90 shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Live Recalculated Summary Stats */}
            <div className="flex items-center gap-4 text-xs text-slate-300 w-full sm:w-auto justify-between sm:justify-start">
              <div>
                <span className="text-slate-400">Series: </span>
                <span className="font-mono-nums font-bold text-white">
                  {totalSetsCompleted} / {totalSetsPlanned}
                </span>
              </div>
              <span className="text-slate-700">·</span>
              <div>
                <span className="text-slate-400">Reps: </span>
                <span className="font-mono-nums font-bold text-white">
                  {totalRepsCompleted}
                </span>
              </div>
              <span className="text-slate-700">·</span>
              <div>
                <span className="text-slate-400">Volumen: </span>
                <span className="font-mono-nums font-bold text-emerald-400">
                  {totalVolumeKg.toLocaleString()} Kg
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveAll}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
              >
                <Save className="w-4 h-4 stroke-[2.5]" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
