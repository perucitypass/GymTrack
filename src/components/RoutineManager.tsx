import React, { useState } from 'react';
import { RoutineDay, ExerciseTemplate, ActiveTab } from '../types/gym';
import { DEFAULT_ROUTINE } from '../data/defaultRoutine';
import { DecimalWeightInput } from './DecimalWeightInput';
import {
  saveRoutine,
  resetRoutineToDefault,
  exportBackupJSON,
  importBackupJSON,
} from '../utils/storage';
import {
  Dumbbell,
  Play,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  Download,
  Upload,
  Info,
  Layers,
} from 'lucide-react';

interface RoutineManagerProps {
  routineDays: RoutineDay[];
  onRoutineUpdated: (newRoutine: RoutineDay[]) => void;
  setActiveTab: (tab: ActiveTab) => void;
  onStartSpecificDay: (dayId: string) => void;
}

export const RoutineManager: React.FC<RoutineManagerProps> = ({
  routineDays,
  onRoutineUpdated,
  setActiveTab,
  onStartSpecificDay,
}) => {
  const [selectedDayTab, setSelectedDayTab] = useState<string>('dia-1');
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editSets, setEditSets] = useState<number>(4);
  const [editReps, setEditReps] = useState<number>(15);
  const [editWeight, setEditWeight] = useState<number>(20);
  const [editNote, setEditNote] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newExName, setNewExName] = useState<string>('');
  const [newExCategory, setNewExCategory] = useState<ExerciseTemplate['category']>('Pecho');
  const [newExSets, setNewExSets] = useState<number>(4);
  const [newExReps, setNewExReps] = useState<number>(15);
  const [newExWeight, setNewExWeight] = useState<number>(20);
  const [newExNote, setNewExNote] = useState<string>('');

  const effectiveDays = routineDays && routineDays.length > 0 ? routineDays : DEFAULT_ROUTINE;
  const currentDay = effectiveDays.find((d) => d.id === selectedDayTab) || effectiveDays[0] || DEFAULT_ROUTINE[0];

  const handleStartEdit = (ex: ExerciseTemplate) => {
    setEditingExerciseId(ex.id);
    setEditSets(ex.targetSets);
    setEditReps(ex.targetReps);
    setEditWeight(ex.defaultWeightKg);
    setEditNote(ex.weightRangeNote || ex.notes || '');
  };

  const handleSaveEdit = (exId: string) => {
    const updated = effectiveDays.map((d) => {
      if (d.id === currentDay.id) {
        return {
          ...d,
          exercises: d.exercises.map((ex) => {
            if (ex.id === exId) {
              return {
                ...ex,
                targetSets: editSets,
                targetReps: editReps,
                defaultWeightKg: editWeight,
                weightRangeNote: editNote,
              };
            }
            return ex;
          }),
        };
      }
      return d;
    });

    saveRoutine(updated);
    onRoutineUpdated(updated);
    setEditingExerciseId(null);
  };

  const handleDeleteExercise = (exId: string, exName: string) => {
    if (window.confirm(`¿Eliminar "${exName}" de la plantilla del ${currentDay.name}?`)) {
      const updated = effectiveDays.map((d) => {
        if (d.id === currentDay.id) {
          return {
            ...d,
            exercises: d.exercises.filter((ex) => ex.id !== exId),
          };
        }
        return d;
      });
      saveRoutine(updated);
      onRoutineUpdated(updated);
    }
  };

  const handleAddExercise = () => {
    if (!newExName.trim()) return;

    const newExercise: ExerciseTemplate = {
      id: `custom-tpl-${Date.now()}`,
      name: newExName.trim(),
      category: newExCategory,
      targetSets: newExSets,
      targetReps: newExReps,
      defaultWeightKg: newExWeight,
      weightRangeNote: newExNote.trim() || undefined,
    };

    const updated = effectiveDays.map((d) => {
      if (d.id === currentDay.id) {
        return {
          ...d,
          exercises: [...d.exercises, newExercise],
        };
      }
      return d;
    });

    saveRoutine(updated);
    onRoutineUpdated(updated);
    setShowAddModal(false);
    setNewExName('');
    setNewExNote('');
  };

  const handleResetDefaults = () => {
    if (
      window.confirm(
        '¿Deseas restaurar la rutina original de 3 días con los pesos y notas iniciales?'
      )
    ) {
      const def = resetRoutineToDefault();
      onRoutineUpdated(def);
    }
  };

  const handleExportBackup = () => {
    const json = exportBackupJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gymtrack-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (importBackupJSON(content)) {
        alert('¡Respaldo importado correctamente!');
        window.location.reload();
      } else {
        alert('Error al leer el archivo de respaldo.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="pb-32 pt-3 sm:pt-4 max-w-5xl mx-auto px-3 sm:px-6 w-full max-w-full overflow-hidden">
      {/* Top Routine Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Estructura del Programa
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400">
              Rutina de 3 Días Personalizable
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
            Mi Rutina de Gimnasio
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => onStartSpecificDay(currentDay.id)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-md shadow-emerald-500/10 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>Entrenar {currentDay.name} Hoy</span>
          </button>
        </div>
      </div>

      {/* Routine Day Tabs */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
        {effectiveDays.map((day) => {
          const isSelected = selectedDayTab === day.id;
          return (
            <button
              key={day.id}
              onClick={() => setSelectedDayTab(day.id)}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/40'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700/80 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-extrabold font-display ${
                    isSelected ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {day.name}
                </span>
                <span className="text-[10px] text-slate-500 font-mono-nums">
                  {day.exercises.length} ejer.
                </span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-white block truncate">
                {day.subtitle}
              </span>
            </button>
          );
        })}
      </div>

      {/* Day Overview Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            {currentDay.name}: {currentDay.subtitle}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {currentDay.description || 'Ejercicios configurados para este día de entrenamiento.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Añadir Ejercicio</span>
          </button>
        </div>
      </div>

      {/* Exercise Cards */}
      <div className="space-y-3">
        {currentDay.exercises.map((ex, idx) => {
          const isEditing = editingExerciseId === ex.id;
          return (
            <div
              key={ex.id}
              className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 transition-all hover:border-slate-700/80"
            >
              {isEditing ? (
                /* Edit Mode */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">
                      Editando: {ex.name}
                    </span>
                    <button
                      onClick={() => handleSaveEdit(ex.id)}
                      className="flex items-center gap-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Guardar</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">
                        Series Objetivo
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editSets}
                        onChange={(e) => setEditSets(parseInt(e.target.value) || 1)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">
                        Reps Objetivo
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editReps}
                        onChange={(e) => setEditReps(parseInt(e.target.value) || 1)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                        Peso (Kg) · Paso 0.5
                      </label>
                      <DecimalWeightInput
                        value={editWeight}
                        onChange={(val) => setEditWeight(val)}
                        size="sm"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono-nums text-center focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-semibold">
                        Rango / Nota (ej. 15-17.5 Kg)
                      </label>
                      <input
                        type="text"
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 font-mono-nums shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {ex.name}
                        </span>
                        <span className="text-[10px] bg-slate-800/80 text-slate-400 px-2 py-0.5 rounded">
                          {ex.category}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                        <span className="font-mono-nums font-semibold text-emerald-400">
                          {ex.targetSets} × {ex.targetReps}
                        </span>
                        <span>·</span>
                        <span className="font-mono-nums text-slate-300">
                          {ex.isBodyweight ? 'Peso Corporal' : `${ex.defaultWeightKg} Kg`}
                        </span>
                        {ex.weightRangeNote && (
                          <>
                            <span>·</span>
                            <span className="text-slate-400 italic">
                              ({ex.weightRangeNote})
                            </span>
                          </>
                        )}
                      </div>

                      {ex.notes && (
                        <p className="text-[11px] text-slate-400 mt-1">
                          {ex.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 self-end sm:self-auto">
                    <button
                      onClick={() => handleStartEdit(ex)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                      title="Editar parámetros"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteExercise(ex.id, ex.name)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Eliminar de la plantilla"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Exercise Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">
              Añadir Ejercicio a {currentDay.name}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">
                  Nombre del Ejercicio *
                </label>
                <input
                  type="text"
                  placeholder="ej. Prensa inclinada, Dominadas..."
                  value={newExName}
                  onChange={(e) => setNewExName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">
                  Grupo Muscular
                </label>
                <select
                  value={newExCategory}
                  onChange={(e) =>
                    setNewExCategory(e.target.value as ExerciseTemplate['category'])
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Pecho">Pecho</option>
                  <option value="Espalda">Espalda</option>
                  <option value="Pierna">Pierna</option>
                  <option value="Hombro">Hombro</option>
                  <option value="Brazo">Brazo</option>
                  <option value="Abdomen">Abdomen</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">
                    Series
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newExSets}
                    onChange={(e) => setNewExSets(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">
                    Reps
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newExReps}
                    onChange={(e) => setNewExReps(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold block mb-1">
                    Peso (Kg) · Paso 0.5
                  </label>
                  <DecimalWeightInput
                    value={newExWeight}
                    onChange={(val) => setNewExWeight(val)}
                    size="sm"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-sm text-white font-mono-nums text-center focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">
                  Nota / Rango de peso (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="ej. 30 Kg a 35 Kg"
                  value={newExNote}
                  onChange={(e) => setNewExNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddExercise}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-md"
              >
                Añadir Ejercicio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Routine Management Utilities (Reset & Backup) */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 sm:p-5 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-0.5">
            Opciones y Respaldo de Datos
          </span>
          <p className="text-xs text-slate-400">
            Descarga un respaldo JSON de tus rutinas e historial para no perder ningún dato.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportBackup}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Respaldo</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Importar</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>

          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-amber-400 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors cursor-pointer"
            title="Restaurar rutina inicial"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Original</span>
          </button>
        </div>
      </div>
    </div>
  );
};
