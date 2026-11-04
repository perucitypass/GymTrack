import React, { useState } from 'react';
import { WorkoutLog, ActiveTab } from '../types/gym';
import {
  formatDateSpanish,
  formatTimeSpanish,
  formatDuration,
} from '../utils/dateAndStats';
import {
  deleteWorkoutLog,
  clearAllWorkoutLogs,
  updateWorkoutLog,
} from '../utils/storage';
import {
  Calendar,
  Clock,
  Dumbbell,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  Plus,
  Flame,
  Filter,
  CheckCircle2,
  RotateCcw,
  FileSpreadsheet,
  Edit2,
  Edit3,
  Check,
  X,
} from 'lucide-react';
import { EditWorkoutModal } from './EditWorkoutModal';

interface WorkoutHistoryProps {
  logs: WorkoutLog[];
  onLogsChanged: () => void;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenManualModal: () => void;
  onOpenDatabaseModal?: () => void;
}

export const WorkoutHistory: React.FC<WorkoutHistoryProps> = ({
  logs,
  onLogsChanged,
  setActiveTab,
  onOpenManualModal,
  onOpenDatabaseModal,
}) => {
  const [filterDay, setFilterDay] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingDateTime, setEditingDateTime] = useState<string>('');
  const [editingWorkout, setEditingWorkout] = useState<WorkoutLog | null>(null);

  const handleSaveEditedWorkout = (updatedLog: WorkoutLog) => {
    updateWorkoutLog(updatedLog);
    onLogsChanged();
    setEditingWorkout(null);
  };

  const handleStartEditDate = (log: WorkoutLog) => {
    setEditingLogId(log.id);
    try {
      const d = new Date(log.startTime);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      setEditingDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
    } catch {
      setEditingDateTime(new Date().toISOString().slice(0, 16));
    }
  };

  const handleSaveDate = (log: WorkoutLog) => {
    if (!editingDateTime) return;
    const newStart = new Date(editingDateTime);
    if (isNaN(newStart.getTime())) {
      alert('Por favor selecciona una fecha válida.');
      return;
    }
    const newStartISO = newStart.toISOString();
    const duration = log.durationSeconds || 60;
    const newEndISO = new Date(newStart.getTime() + duration * 1000).toISOString();

    const updatedLog: WorkoutLog = {
      ...log,
      startTime: newStartISO,
      endTime: newEndISO,
    };

    updateWorkoutLog(updatedLog);
    setEditingLogId(null);
    onLogsChanged();
  };

  const handleDelete = (logId: string, logTitle: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el registro de ${logTitle}?`)) {
      deleteWorkoutLog(logId);
      onLogsChanged();
    }
  };

  const handleClearAll = () => {
    if (
      window.confirm(
        '¿Estás seguro de vaciar todos los registros del historial? Esta acción no se puede deshacer.'
      )
    ) {
      clearAllWorkoutLogs();
      onLogsChanged();
    }
  };

  // Sort logs by date descending
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  // Filter logs
  const filteredLogs = sortedLogs.filter((log) => {
    if (filterDay !== 'all') {
      if (filterDay === 'dia-1' && !log.routineDayName.includes('1')) return false;
      if (filterDay === 'dia-2' && !log.routineDayName.includes('2')) return false;
      if (filterDay === 'dia-3' && !log.routineDayName.includes('3')) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDay = log.routineDayName.toLowerCase().includes(q);
      const matchNotes = (log.notes || '').toLowerCase().includes(q);
      const matchEx = log.exercises.some((e) => e.name.toLowerCase().includes(q));
      if (!matchDay && !matchNotes && !matchEx) return false;
    }
    return true;
  });

  return (
    <div className="pb-32 pt-3 sm:pt-4 max-w-5xl mx-auto px-3 sm:px-6 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Control de Fechas y Registro
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400 font-mono-nums">
              {logs.length} sesiones guardadas
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
            Historial de Entrenamientos
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {logs.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-rose-400 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 rounded-xl transition-all cursor-pointer"
              title="Vaciar todo el historial"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Vaciar</span>
            </button>
          )}

          {onOpenDatabaseModal && (
            <button
              onClick={onOpenDatabaseModal}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Sheets / Excel</span>
            </button>
          )}

          <button
            onClick={onOpenManualModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-md shadow-emerald-500/10 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Pasado</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 mb-6 flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por ejercicio o nota..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Day Filter */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto p-1 bg-slate-950/60 rounded-xl border border-slate-800/80">
          <Filter className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1 shrink-0" />
          {[
            { id: 'all', label: 'Todos' },
            { id: 'dia-1', label: 'Día 1' },
            { id: 'dia-2', label: 'Día 2' },
            { id: 'dia-3', label: 'Día 3' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterDay(tab.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                filterDay === tab.id
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredLogs.length === 0 && (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 sm:p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {logs.length === 0
              ? 'Aún no tienes entrenamientos registrados'
              : 'No se encontraron entrenamientos'}
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            {logs.length === 0
              ? 'Los entrenamientos reales que realices aparecerán aquí automáticamente al finalizar tu sesión en "Entrenar". También puedes agregar una sesión anterior pulsando "Registrar Pasado".'
              : 'No hay entrenamientos que coincidan con los filtros aplicados.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setActiveTab('entrenar')}
              className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Iniciar Entrenamiento Ahora
            </button>
            <button
              onClick={onOpenManualModal}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
            >
              Registrar Pasado
            </button>
          </div>
        </div>
      )}

      {/* Workout Logs List */}
      <div className="space-y-4">
        {filteredLogs.map((log) => {
          const isExpanded = expandedLogId === log.id;
          return (
            <div
              key={log.id}
              className="bg-slate-900/80 border border-slate-800/90 rounded-2xl overflow-hidden shadow-lg transition-all hover:border-slate-700/80"
            >
              {/* Card Header */}
              <div className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    {editingLogId === log.id ? (
                      <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-950 border border-emerald-500/40 rounded-xl mb-2.5 shadow-inner">
                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-semibold text-white">Editar fecha:</span>
                        </div>
                        <input
                          type="datetime-local"
                          value={editingDateTime}
                          onChange={(e) => setEditingDateTime(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono-nums"
                        />
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSaveDate(log)}
                            className="flex items-center gap-1 px-3 py-1 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Guardar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingLogId(null)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-white rounded-lg cursor-pointer transition-colors"
                          >
                            <X className="w-3 h-3" />
                            <span>Cancelar</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-1 flex-wrap">
                        <span className="font-semibold text-emerald-400">
                          {log.routineDayName}
                        </span>
                        <span>·</span>
                        <span className="text-white font-medium">{formatDateSpanish(log.startTime)}</span>
                        <span>·</span>
                        <span>{formatTimeSpanish(log.startTime)}</span>
                        <button
                          type="button"
                          onClick={() => handleStartEditDate(log)}
                          className="ml-1 text-slate-400 hover:text-emerald-400 p-1 rounded-lg hover:bg-slate-800 transition-colors inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                          title="Editar fecha y hora del entrenamiento"
                        >
                          <Edit2 className="w-3 h-3 text-emerald-400" />
                          <span>Editar fecha</span>
                        </button>
                      </div>
                    )}

                    <h2 className="text-lg font-bold text-white tracking-tight">
                      {log.routineDayName === 'Día 1'
                        ? 'Día 1: Pecho, Espalda y Abdomen'
                        : log.routineDayName === 'Día 2'
                        ? 'Día 2: Pierna y Pantorrillas'
                        : log.routineDayName === 'Día 3'
                        ? 'Día 3: Hombros, Brazos y Abdomen'
                        : log.routineDayName}
                    </h2>
                  </div>

                  {/* Summary Metric Chips (Clean text with separators) */}
                  <div className="flex items-center gap-4 text-xs text-slate-300 bg-slate-950/60 px-3.5 py-2 rounded-xl border border-slate-800/80 self-start sm:self-auto">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-mono-nums font-semibold text-white">
                        {formatDuration(log.durationSeconds)}
                      </span>
                    </div>
                    <span className="text-slate-600">·</span>
                    <div>
                      <span className="text-slate-400">Vol: </span>
                      <span className="font-mono-nums font-bold text-emerald-400">
                        {log.totalVolumeKg.toLocaleString()} Kg
                      </span>
                    </div>
                    <span className="text-slate-600">·</span>
                    <div>
                      <span className="text-slate-400">Series: </span>
                      <span className="font-mono-nums font-semibold text-white">
                        {log.totalSetsCompleted}
                      </span>
                    </div>
                  </div>
                </div>

                {log.notes && (
                  <p className="text-xs text-slate-300 mt-2.5 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60 italic">
                    "{log.notes}"
                  </p>
                )}

                {/* Footer Controls of the card */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/60">
                  <button
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    <span>{isExpanded ? 'Ocultar desglose de series' : 'Ver detalle por ejercicios'}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingWorkout(log)}
                      className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-sm"
                      title="Editar series, repeticiones y pesos de este entrenamiento"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar series y pesos</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartEditDate(log)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Cambiar fecha u hora de la sesión"
                    >
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Cambiar fecha</span>
                    </button>

                    <button
                      onClick={() => handleDelete(log.id, `${log.routineDayName} (${formatDateSpanish(log.startTime)})`)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Eliminar este entrenamiento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Collapsible Exercise Details */}
              {isExpanded && (
                <div className="bg-slate-950/70 border-t border-slate-800/80 p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Detalle de Ejercicios y Series Realizadas
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingWorkout(log)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Modificar series o pesos</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {log.exercises.map((ex, idx) => {
                      const completedSets = ex.sets.filter((s) => s.completed);
                      const maxWeight = Math.max(...completedSets.map((s) => s.weightKg), 0);
                      return (
                        <div
                          key={idx}
                          className="bg-slate-900/90 border border-slate-800 rounded-xl p-3"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="font-semibold text-sm text-white block">
                                {ex.name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {ex.category}
                              </span>
                            </div>
                            <span className="text-xs font-mono-nums font-bold text-emerald-400">
                              {maxWeight > 0 ? `${maxWeight} Kg máx` : 'Peso corp.'}
                            </span>
                          </div>

                          {/* Sets list */}
                          <div className="flex flex-wrap gap-1.5">
                            {ex.sets.map((s, sIdx) => (
                              <div
                                key={sIdx}
                                className={`text-[11px] font-mono-nums px-2 py-1 rounded-md border flex items-center gap-1 ${
                                  s.completed
                                    ? 'bg-slate-950 border-emerald-500/30 text-emerald-300'
                                    : 'bg-slate-950/50 border-slate-800 text-slate-500 line-through'
                                }`}
                              >
                                <span className="font-bold text-slate-400">S{s.setNumber}:</span>
                                <span>{s.weightKg > 0 ? `${s.weightKg}k` : 'PC'}</span>
                                <span className="text-slate-500">×</span>
                                <span>{s.reps}</span>
                              </div>
                            ))}
                          </div>

                          {ex.notes && (
                            <p className="text-[11px] text-slate-400 mt-2 italic">
                              Nota: {ex.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Edit Workout Sets, Reps & Weights Modal */}
      <EditWorkoutModal
        isOpen={!!editingWorkout}
        workoutLog={editingWorkout}
        onClose={() => setEditingWorkout(null)}
        onSave={handleSaveEditedWorkout}
      />
    </div>
  );
};
