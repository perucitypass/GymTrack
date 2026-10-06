import React, { useState } from 'react';
import { RoutineDay, WorkoutLog, LoggedExercise, LoggedSet } from '../types/gym';
import { DEFAULT_ROUTINE } from '../data/defaultRoutine';
import { addWorkoutLog } from '../utils/storage';
import { DecimalWeightInput } from './DecimalWeightInput';
import { X, Calendar, Clock, Check, Plus, Trash2 } from 'lucide-react';

interface ManualWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  routineDays: RoutineDay[];
  onWorkoutAdded: () => void;
}

export const ManualWorkoutModal: React.FC<ManualWorkoutModalProps> = ({
  isOpen,
  onClose,
  routineDays,
  onWorkoutAdded,
}) => {
  const effectiveDays = routineDays && routineDays.length > 0 ? routineDays : DEFAULT_ROUTINE;
  const [selectedDayId, setSelectedDayId] = useState<string>('dia-1');
  const [workoutDateTime, setWorkoutDateTime] = useState<string>(
    new Date().toISOString().slice(0, 16)
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [notes, setNotes] = useState<string>('');

  // Initial exercises from template
  const initialExercises = React.useMemo(() => {
    const targetDay = effectiveDays.find((d) => d.id === selectedDayId) || effectiveDays[0];
    return targetDay.exercises.map((tpl) => {
      const sets: LoggedSet[] = [];
      for (let s = 1; s <= tpl.targetSets; s++) {
        sets.push({
          setNumber: s,
          weightKg: tpl.defaultWeightKg,
          reps: tpl.targetReps,
          completed: true,
        });
      }
      return {
        id: tpl.id,
        name: tpl.name,
        category: tpl.category,
        notes: tpl.notes || '',
        sets,
      };
    });
  }, [effectiveDays, selectedDayId]);

  const [exercises, setExercises] = useState<LoggedExercise[]>(initialExercises);

  // Sync when selected day changes
  React.useEffect(() => {
    const targetDay = effectiveDays.find((d) => d.id === selectedDayId) || effectiveDays[0];
    const prepared = targetDay.exercises.map((tpl) => {
      const sets: LoggedSet[] = [];
      for (let s = 1; s <= tpl.targetSets; s++) {
        sets.push({
          setNumber: s,
          weightKg: tpl.defaultWeightKg,
          reps: tpl.targetReps,
          completed: true,
        });
      }
      return {
        id: tpl.id,
        name: tpl.name,
        category: tpl.category,
        notes: tpl.notes || '',
        sets,
      };
    });
    setExercises(prepared);
  }, [selectedDayId, effectiveDays]);

  if (!isOpen) return null;

  const handleWeightChange = (exIdx: number, setIdx: number, weight: number) => {
    const copy = [...exercises];
    copy[exIdx].sets[setIdx].weightKg = Math.max(0, weight);
    setExercises(copy);
  };

  const handleRepsChange = (exIdx: number, setIdx: number, reps: number) => {
    const copy = [...exercises];
    copy[exIdx].sets[setIdx].reps = Math.max(1, reps);
    setExercises(copy);
  };

  const handleToggleComplete = (exIdx: number, setIdx: number) => {
    const copy = [...exercises];
    copy[exIdx].sets[setIdx].completed = !copy[exIdx].sets[setIdx].completed;
    setExercises(copy);
  };

  const handleSave = () => {
    const targetDay = routineDays.find((d) => d.id === selectedDayId) || routineDays[0];
    const durationSeconds = Math.max(60, durationMinutes * 60);

    const startDate = new Date(workoutDateTime);
    const endDate = new Date(startDate.getTime() + durationSeconds * 1000);

    let totalVolume = 0;
    let totalSets = 0;
    let totalReps = 0;

    exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.completed) {
          totalVolume += s.weightKg * s.reps;
          totalSets += 1;
          totalReps += s.reps;
        }
      });
    });

    const newLog: WorkoutLog = {
      id: 'manual-log-' + Date.now(),
      routineDayId: selectedDayId,
      routineDayName: targetDay.name,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      durationSeconds,
      notes: notes.trim(),
      exercises,
      totalVolumeKg: Math.round(totalVolume),
      totalSetsCompleted: totalSets,
      totalRepsCompleted: totalReps,
    };

    addWorkoutLog(newLog);
    onWorkoutAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white">
              Registrar Entrenamiento Pasado
            </h3>
            <p className="text-xs text-slate-400">
              Añade una sesión que realizaste sin abrir el cronómetro en vivo
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Day selection */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">
              Día de la Rutina
            </label>
            <div className="grid grid-cols-3 gap-2">
              {routineDays.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDayId(d.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedDayId === d.id
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>

          {/* Date, Time and Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Fecha y Hora Realizada
              </label>
              <input
                type="datetime-local"
                value={workoutDateTime}
                onChange={(e) => setWorkoutDateTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Duración Estimada (Minutos)
              </label>
              <input
                type="number"
                min="5"
                max="300"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Notas de la Sesión
            </label>
            <input
              type="text"
              placeholder="Sensaciones, descansos, etc. (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Exercises and sets preview */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-2">
              Series y Cargas Registradas
            </label>
            <div className="space-y-3">
              {exercises.map((ex, exIdx) => (
                <div
                  key={ex.id}
                  className="bg-slate-950/70 border border-slate-800 rounded-xl p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-white">{ex.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono-nums">
                      {ex.sets.length} series
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ex.sets.map((s, sIdx) => (
                      <div
                        key={sIdx}
                        className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                          <span>S{s.setNumber}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(exIdx, sIdx)}
                            className={`w-4 h-4 rounded flex items-center justify-center ${
                              s.completed ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <DecimalWeightInput
                            value={s.weightKg}
                            onChange={(val) => handleWeightChange(exIdx, sIdx, val)}
                            onAdjust={(delta) =>
                              handleWeightChange(
                                exIdx,
                                sIdx,
                                Math.max(0, Math.round((s.weightKg + delta) * 10) / 10)
                              )
                            }
                            size="sm"
                            className="w-12 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-center text-xs text-white font-mono-nums"
                          />
                          <span className="text-[10px] text-slate-400">kg</span>
                          <span className="text-[10px] text-slate-600">×</span>
                          <input
                            type="number"
                            value={s.reps}
                            onChange={(e) =>
                              handleRepsChange(exIdx, sIdx, parseInt(e.target.value) || 1)
                            }
                            className="w-10 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-center text-xs text-white font-mono-nums"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-md transition-all cursor-pointer"
          >
            Guardar Entrenamiento
          </button>
        </div>
      </div>
    </div>
  );
};
