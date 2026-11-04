import React, { useState, useMemo } from 'react';
import { WorkoutLog, ActiveTab } from '../types/gym';
import {
  computeWeeklySummary,
  computeMonthlySummary,
  getExerciseProgression,
  formatDuration,
  formatDateSpanish,
} from '../utils/dateAndStats';
import {
  Calendar as CalendarIcon,
  Clock,
  Dumbbell,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Flame,
  Award,
  Layers,
  BarChart2,
  CalendarDays,
  Target,
  FileSpreadsheet,
} from 'lucide-react';
import { WeeklyVolumeChart } from './WeeklyVolumeChart';

interface AnalyticsSummariesProps {
  logs: WorkoutLog[];
  setActiveTab: (tab: ActiveTab) => void;
  onOpenDatabaseModal?: () => void;
}

export const AnalyticsSummaries: React.FC<AnalyticsSummariesProps> = ({
  logs,
  setActiveTab,
  onOpenDatabaseModal,
}) => {
  const [periodType, setPeriodType] = useState<'semanal' | 'mensual'>('semanal');
  const [currentReferenceDate, setCurrentReferenceDate] = useState<Date>(new Date());
  const [selectedExercise, setSelectedExercise] = useState<string>('Prensa');

  // Navigate periods
  const handlePrevPeriod = () => {
    const next = new Date(currentReferenceDate);
    if (periodType === 'semanal') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setMonth(next.getMonth() - 1);
    }
    setCurrentReferenceDate(next);
  };

  const handleNextPeriod = () => {
    const next = new Date(currentReferenceDate);
    if (periodType === 'semanal') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    setCurrentReferenceDate(next);
  };

  const handleResetToToday = () => {
    setCurrentReferenceDate(new Date());
  };

  // Summaries
  const weeklyStats = useMemo(() => {
    return computeWeeklySummary(logs, currentReferenceDate);
  }, [logs, currentReferenceDate]);

  const monthlyStats = useMemo(() => {
    return computeMonthlySummary(logs, currentReferenceDate);
  }, [logs, currentReferenceDate]);

  // Unique exercises list for progression tracker
  const allExerciseNames = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      l.exercises.forEach((e) => set.add(e.name));
    });
    // Add default routine exercise names if none in logs
    if (set.size === 0) {
      set.add('Prensa');
      set.add('Peck deck');
      set.add('Press plano mancuerna');
      set.add('Remo sentado');
      set.add('Curl bíceps');
    }
    return Array.from(set).sort();
  }, [logs]);

  // Progression data for selected exercise
  const exerciseProgression = useMemo(() => {
    return getExerciseProgression(logs, selectedExercise);
  }, [logs, selectedExercise]);

  // Calendar matrix calculation for the month
  const calendarDays = useMemo(() => {
    if (periodType !== 'mensual') return [];
    const year = monthlyStats.year;
    const month = monthlyStats.monthDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    // Start day of week (Monday = 1, Sunday = 0 -> convert to Mon=0..Sun=6)
    let startDay = firstDayOfMonth.getDay() - 1;
    if (startDay === -1) startDay = 6;

    const daysArray: { dayNum: number; dateStr: string; workouts: WorkoutLog[] }[] = [];

    // Empty placeholder slots for previous month
    for (let i = 0; i < startDay; i++) {
      daysArray.push({ dayNum: 0, dateStr: '', workouts: [] });
    }

    // Days of current month
    for (let d = 1; d <= totalDays; d++) {
      const dStr = new Date(year, month, d).toISOString().split('T')[0];
      const dayWorkouts = monthlyStats.workouts.filter((w) => {
        return new Date(w.startTime).toISOString().split('T')[0] === dStr;
      });
      daysArray.push({ dayNum: d, dateStr: dStr, workouts: dayWorkouts });
    }

    return daysArray;
  }, [periodType, monthlyStats]);

  // Max volume for relative bar scaling
  const maxWeeklyDuration = Math.max(...weeklyStats.days.map((d) => d.totalDurationMinutes), 60);
  const maxWeeklyVolume = Math.max(...weeklyStats.days.map((d) => d.totalVolumeKg), 1000);
  const maxMonthlyWeekVolume = Math.max(...monthlyStats.weeks.map((w) => w.totalVolumeKg), 1000);

  return (
    <div className="pb-32 pt-3 sm:pt-4 max-w-5xl mx-auto px-3 sm:px-6 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Análisis y Progreso
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400">
              Control de tiempo y volumen
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
            Resúmenes de Entrenamiento
          </h1>
        </div>

        {/* Period Selector Tabs (Semanal / Mensual) */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setPeriodType('semanal')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              periodType === 'semanal'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Resumen Semanal
          </button>
          <button
            onClick={() => setPeriodType('mensual')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              periodType === 'mensual'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Resumen Mensual
          </button>
        </div>
      </div>

      {/* Date Range Navigation Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevPeriod}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={periodType === 'semanal' ? 'Semana anterior' : 'Mes anterior'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="px-2">
            <span className="block text-[11px] text-slate-400 uppercase font-semibold">
              {periodType === 'semanal' ? 'Semana en curso' : 'Mes evaluado'}
            </span>
            <span className="text-base sm:text-lg font-bold text-white">
              {periodType === 'semanal'
                ? weeklyStats.weekLabel
                : `${monthlyStats.monthName} ${monthlyStats.year}`}
            </span>
          </div>

          <button
            onClick={handleNextPeriod}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={periodType === 'semanal' ? 'Semana siguiente' : 'Mes siguiente'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleResetToToday}
          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
        >
          {periodType === 'semanal' ? 'Esta Semana' : 'Este Mes'}
        </button>
      </div>

      {/* Database Consolidation Banner */}
      {onOpenDatabaseModal && (
        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-900/40 border border-emerald-500/20 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                Base de Datos en Google Sheets y Excel
              </span>
              <span className="text-[11px] text-slate-400">
                Consolida todas tus series y sesiones para análisis avanzado o respaldo en la nube.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenDatabaseModal}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all cursor-pointer shrink-0 shadow-sm"
          >
            <span>Consolidar en Sheets / Excel</span>
          </button>
        </div>
      )}

      {/* Big KPI Metric Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {/* KPI 1: Tiempo Total Entrenado */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">
              Tiempo Total
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono-nums text-white">
            {formatDuration(
              periodType === 'semanal'
                ? weeklyStats.totalDurationSeconds
                : monthlyStats.totalDurationSeconds
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {periodType === 'semanal'
              ? 'Tiempo activo en la semana'
              : `Promedio: ${monthlyStats.averageDurationMinutes}m / sesión`}
          </p>
        </div>

        {/* KPI 2: Sesiones Completadas */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">
              Sesiones Realizadas
            </span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono-nums text-white">
            {periodType === 'semanal'
              ? `${weeklyStats.totalSessions} / 3`
              : `${monthlyStats.totalSessions} sesiones`}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {periodType === 'semanal'
              ? weeklyStats.totalSessions >= 3
                ? '¡Meta semanal completada!'
                : `Faltan ${Math.max(0, 3 - weeklyStats.totalSessions)} para completar rutina`
              : `Distribución en ${monthlyStats.weeks.length} semanas`}
          </p>
        </div>

        {/* KPI 3: Volumen Total Levantado */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">
              Volumen Total
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Dumbbell className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono-nums text-emerald-400">
            {(
              (periodType === 'semanal'
                ? weeklyStats.totalVolumeKg
                : monthlyStats.totalVolumeKg) / 1000
            ).toFixed(1)}{' '}
            <span className="text-base text-slate-400 font-sans">Ton</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono-nums">
            {(periodType === 'semanal'
              ? weeklyStats.totalVolumeKg
              : monthlyStats.totalVolumeKg
            ).toLocaleString()}{' '}
            Kg totales
          </p>
        </div>

        {/* KPI 4: Series & Repeticiones */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">
              Series y Reps
            </span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono-nums text-white">
            {periodType === 'semanal' ? weeklyStats.totalSets : monthlyStats.totalSets}
            <span className="text-base text-slate-400 font-normal font-sans ml-1">series</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono-nums">
            {(periodType === 'semanal'
              ? weeklyStats.totalReps
              : monthlyStats.totalReps
            ).toLocaleString()}{' '}
            repeticiones totales
          </p>
        </div>
      </div>

      {/* Evolution of Total Lifting Volume Chart across Weeks (Recharts) */}
      <WeeklyVolumeChart logs={logs} referenceDate={currentReferenceDate} />

      {/* Main Visual Section */}
      {periodType === 'semanal' ? (
        /* WEEKLY BREAKDOWN VIEW */
        <div className="space-y-6">
          {/* Day by Day Activity Chart */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Actividad Diaria de la Semana
                </h2>
                <p className="text-xs text-slate-400">
                  Minutos entrenados y volumen por día de la semana
                </p>
              </div>
              <span className="text-xs text-emerald-400 font-semibold">
                Meta: 3 días de rutina
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2 sm:gap-3 pt-6 pb-2">
              {weeklyStats.days.map((day) => {
                const hasWorkouts = day.workouts.length > 0;
                const heightPercent =
                  maxWeeklyDuration > 0
                    ? Math.min(100, (day.totalDurationMinutes / maxWeeklyDuration) * 100)
                    : 0;

                return (
                  <div key={day.dateString} className="flex flex-col items-center">
                    {/* Bar container */}
                    <div className="w-full h-36 bg-slate-950/60 rounded-xl relative flex items-end justify-center p-1.5 border border-slate-800/80 group">
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-slate-800 text-white text-[10px] p-2 rounded-lg pointer-events-none whitespace-nowrap z-20 shadow-xl border border-slate-700">
                        <div className="font-bold text-emerald-400">{day.dayName} {day.dateString}</div>
                        <div>Tiempo: {day.totalDurationMinutes} min</div>
                        <div>Volumen: {day.totalVolumeKg.toLocaleString()} Kg</div>
                        {hasWorkouts && (
                          <div className="text-slate-300 mt-1">
                            {day.workouts.map((w) => w.routineDayName).join(', ')}
                          </div>
                        )}
                      </div>

                      {hasWorkouts ? (
                        <div
                          className="w-full rounded-lg bg-gradient-to-t from-emerald-600 to-teal-400 transition-all duration-500 shadow-md shadow-emerald-500/10 flex flex-col justify-between p-1 items-center"
                          style={{ height: `${Math.max(20, heightPercent)}%` }}
                        >
                          <span className="text-[10px] font-mono-nums font-bold text-slate-950">
                            {day.totalDurationMinutes}m
                          </span>
                        </div>
                      ) : (
                        <div className="w-full h-1 bg-slate-800 rounded-full" />
                      )}
                    </div>

                    {/* Day label */}
                    <span
                      className={`text-xs font-semibold mt-2 ${
                        hasWorkouts ? 'text-white' : 'text-slate-500'
                      }`}
                    >
                      {day.dayName}
                    </span>

                    {/* Badge or indicator */}
                    <span className="text-[10px] font-mono-nums text-slate-500 mt-0.5">
                      {hasWorkouts ? `${(day.totalVolumeKg / 1000).toFixed(1)}t` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sessions List for This Week */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
            <h2 className="text-base font-bold text-white tracking-tight mb-4">
              Entrenamientos Registrados en esta Semana ({weeklyStats.workouts.length})
            </h2>

            {weeklyStats.workouts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No hay entrenamientos registrados en esta semana.
                <div className="mt-3">
                  <button
                    onClick={() => setActiveTab('entrenar')}
                    className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold transition-all cursor-pointer"
                  >
                    Registrar Entrenamiento de Hoy
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {weeklyStats.workouts.map((w) => (
                  <div
                    key={w.id}
                    className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {w.routineDayName}
                        </span>
                        <span className="text-slate-500">·</span>
                        <span className="text-xs text-slate-400">
                          {formatDateSpanish(w.startTime)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {w.exercises.length} ejercicios · {w.totalSetsCompleted} series completadas
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono-nums">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{formatDuration(w.durationSeconds)}</span>
                      </div>
                      <span className="text-slate-600">·</span>
                      <div className="text-emerald-400 font-bold">
                        {w.totalVolumeKg.toLocaleString()} Kg
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* MONTHLY BREAKDOWN VIEW */
        <div className="space-y-6">
          {/* Week-by-Week Progress Chart */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Progreso por Semanas del Mes
                </h2>
                <p className="text-xs text-slate-400">
                  Volumen acumulado y sesiones realizadas por tramo semanal
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono-nums">
                {monthlyStats.monthName} {monthlyStats.year}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4">
              {monthlyStats.weeks.map((wk) => {
                const heightPercent =
                  maxMonthlyWeekVolume > 0
                    ? Math.min(100, (wk.totalVolumeKg / maxMonthlyWeekVolume) * 100)
                    : 0;

                return (
                  <div
                    key={wk.weekNum}
                    className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-300 block">
                        {wk.label}
                      </span>
                      <span className="text-[11px] text-emerald-400 font-semibold font-mono-nums">
                        {wk.sessionCount} {wk.sessionCount === 1 ? 'sesión' : 'sesiones'}
                      </span>
                    </div>

                    <div className="my-3">
                      <div className="w-full h-20 bg-slate-900 rounded-lg flex items-end p-1">
                        <div
                          className="w-full rounded bg-emerald-500 transition-all duration-500"
                          style={{ height: `${Math.max(8, heightPercent)}%` }}
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-800/60 pt-2 text-[11px] text-slate-400">
                      <div>
                        Vol: <strong className="text-white font-mono-nums">{(wk.totalVolumeKg / 1000).toFixed(1)}t</strong>
                      </div>
                      <div>
                        Tiempo: <strong className="text-white font-mono-nums">{wk.totalDurationMinutes}m</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Monthly Calendar View */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Calendario Mensual de Entrenamientos
                  </h2>
                  <p className="text-xs text-slate-400">
                    Días en los que acudiste al gimnasio
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-300">Día 1</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span className="text-slate-300">Día 2</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-slate-300">Día 3</span>
                </div>
              </div>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 mb-2">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((item, idx) => {
                if (item.dayNum === 0) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[56px] sm:min-h-[70px] bg-slate-950/20 rounded-xl"
                    />
                  );
                }

                const hasWorkouts = item.workouts.length > 0;
                return (
                  <div
                    key={item.dateStr}
                    className={`min-h-[56px] sm:min-h-[70px] p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between transition-colors ${
                      hasWorkouts
                        ? 'bg-slate-900 border-emerald-500/40'
                        : 'bg-slate-950/50 border-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-mono-nums font-semibold ${
                          hasWorkouts ? 'text-white' : 'text-slate-500'
                        }`}
                      >
                        {item.dayNum}
                      </span>
                      {hasWorkouts && (
                        <span className="text-[10px] text-emerald-400 font-mono-nums">
                          {formatDuration(item.workouts[0].durationSeconds)}
                        </span>
                      )}
                    </div>

                    {hasWorkouts ? (
                      <div className="space-y-1 mt-1">
                        {item.workouts.map((w, wIdx) => {
                          const isD1 = w.routineDayName.includes('1');
                          const isD2 = w.routineDayName.includes('2');
                          return (
                            <div
                              key={wIdx}
                              className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded truncate ${
                                isD1
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : isD2
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {w.routineDayName}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-700 select-none">·</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Progressive Overload / Weight Progression Tracker */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Evolución de Pesos y Sobrecarga Progresiva
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Observa cómo aumentaste la carga o repeticiones a lo largo de las sesiones
            </p>
          </div>

          {/* Exercise Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 whitespace-nowrap">
              Ejercicio:
            </label>
            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs text-emerald-300 font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
            >
              {allExerciseNames.map((name) => (
                <option key={name} value={name} className="bg-slate-900 text-white">
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {exerciseProgression.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm bg-slate-950/40 rounded-xl border border-slate-800">
            No hay registros previos para "{selectedExercise}". Al guardar entrenamientos que incluyan este ejercicio, verás aquí su gráfica y tabla de evolución de pesos.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Visual Bars of Maximum Weight */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
              <span className="text-xs font-semibold text-slate-400 block mb-3">
                Evolución de Peso Máximo (Kg) en {selectedExercise}
              </span>
              <div className="flex items-end gap-2 sm:gap-4 h-32 pt-4 overflow-x-auto">
                {exerciseProgression.map((p, idx) => {
                  const maxW = Math.max(...exerciseProgression.map((item) => item.maxWeightKg), 10);
                  const height = (p.maxWeightKg / maxW) * 100;
                  return (
                    <div
                      key={idx}
                      className="flex-1 min-w-[50px] flex flex-col items-center justify-end h-full group"
                    >
                      <span className="text-[10px] font-mono-nums font-bold text-emerald-400 mb-1">
                        {p.maxWeightKg}k
                      </span>
                      <div
                        className="w-full bg-emerald-500/80 group-hover:bg-emerald-400 rounded-t-lg transition-all"
                        style={{ height: `${Math.max(15, height)}%` }}
                      />
                      <span className="text-[9px] text-slate-400 mt-2 truncate max-w-[50px] text-center">
                        {p.date.split(',')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Progression History Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="py-2">Fecha</th>
                    <th className="py-2">Rutina</th>
                    <th className="py-2">Peso Máximo</th>
                    <th className="py-2">Series</th>
                    <th className="py-2">Reps Totales</th>
                    <th className="py-2">Volumen Ejercicio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono-nums">
                  {exerciseProgression.map((point, pIdx) => (
                    <tr key={pIdx} className="hover:bg-slate-800/30 text-slate-300">
                      <td className="py-2.5 font-sans font-medium text-white">
                        {point.date}
                      </td>
                      <td className="py-2.5 font-sans text-slate-400">
                        {point.workoutName}
                      </td>
                      <td className="py-2.5 font-bold text-emerald-400">
                        {point.maxWeightKg} Kg
                      </td>
                      <td className="py-2.5 text-slate-300">{point.setsCount}</td>
                      <td className="py-2.5 text-slate-300">{point.totalReps}</td>
                      <td className="py-2.5 text-slate-300">
                        {point.totalVolumeKg.toLocaleString()} Kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
