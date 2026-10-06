import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { WorkoutLog } from '../types/gym';
import {
  computeWeeklyVolumeEvolution,
  WeeklyVolumeEvolutionPoint,
} from '../utils/dateAndStats';
import {
  TrendingUp,
  TrendingDown,
  Dumbbell,
  BarChart3,
  Calendar,
  Award,
  Layers,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface WeeklyVolumeChartProps {
  logs: WorkoutLog[];
  referenceDate?: Date;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: WeeklyVolumeEvolutionPoint;
  }>;
  unit: 'kg' | 'tons';
}

const CustomChartTooltip: React.FC<CustomTooltipProps> = ({ active, payload, unit }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div className="bg-slate-950/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md min-w-[220px]">
      <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-2 border-b border-slate-800 pb-1.5">
        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
        <span className="font-semibold text-white">{data.fullLabel}</span>
        {data.isCurrentWeek && (
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-medium ml-auto">
            Actual
          </span>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Volumen Total:</span>
          <span className="font-mono-nums font-bold text-emerald-400">
            {unit === 'tons'
              ? `${data.volumeTons} Ton`
              : `${data.volumeKg.toLocaleString()} Kg`}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Sesiones realizadas:</span>
          <span className="font-mono-nums font-semibold text-white">
            {data.sessionsCount} {data.sessionsCount === 1 ? 'sesión' : 'sesiones'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Series y Repeticiones:</span>
          <span className="font-mono-nums text-slate-300">
            {data.setsCount} series · {data.repsCount} reps
          </span>
        </div>

        {data.sessionsCount > 0 && (
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-1 text-[11px]">
            <span className="text-slate-400">Promedio por sesión:</span>
            <span className="font-mono-nums text-slate-300 font-medium">
              {data.avgVolumePerSession.toLocaleString()} Kg
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const WeeklyVolumeChart: React.FC<WeeklyVolumeChartProps> = ({
  logs,
  referenceDate = new Date(),
}) => {
  const [weeksRange, setWeeksRange] = useState<number | 'all'>(8);
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [unit, setUnit] = useState<'kg' | 'tons'>('kg');

  const stats = useMemo(() => {
    return computeWeeklyVolumeEvolution(logs, weeksRange, referenceDate);
  }, [logs, weeksRange, referenceDate]);

  const hasData = stats.totalVolumeKg > 0;

  // Format y-axis values
  const formatYAxis = (val: number) => {
    if (val === 0) return '0';
    if (unit === 'tons') {
      return `${(val / 1000).toFixed(1)}t`;
    }
    if (val >= 1000) {
      return `${Math.round(val / 1000)}k`;
    }
    return `${val}`;
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl mb-6">
      {/* Header with Title and Interactive Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Sobrecarga y Volumen
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400">
              Evolución acumulada por semana
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold font-display text-white tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span>Evolución del Volumen de Levantamiento</span>
          </h2>
        </div>

        {/* Action Controls: Weeks Range Selector + Chart Style */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Weeks range segmented selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
            {[
              { id: 4, label: '4 Sem' },
              { id: 8, label: '8 Sem' },
              { id: 12, label: '12 Sem' },
              { id: 'all', label: 'Todo' },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setWeeksRange(option.id as number | 'all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  weeksRange === option.id
                    ? 'bg-slate-800 text-emerald-400 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Chart Type Toggle (Area vs Bar) */}
          <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                chartType === 'area'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Gráfica de curva suave con área"
            >
              Curva
            </button>
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                chartType === 'bar'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Gráfica de barras verticales"
            >
              Barras
            </button>
          </div>

          {/* Unit Toggle */}
          <button
            type="button"
            onClick={() => setUnit(unit === 'kg' ? 'tons' : 'kg')}
            className="px-2.5 py-1 bg-slate-950/80 hover:bg-slate-800 text-slate-300 text-xs font-mono-nums font-semibold rounded-xl border border-slate-800 transition-colors cursor-pointer"
            title="Alternar unidad entre Kg y Toneladas"
          >
            {unit === 'kg' ? 'Kg' : 'Toneladas'}
          </button>
        </div>
      </div>

      {/* Summary KPI Strip for the selected range */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {/* Metric 1: Total Volume in period */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Volumen Periodo</span>
            <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono-nums text-white">
            {(stats.totalVolumeKg / 1000).toFixed(1)}{' '}
            <span className="text-xs text-slate-400 font-sans font-normal">Ton</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono-nums mt-0.5">
            {stats.totalVolumeKg.toLocaleString()} Kg totales
          </div>
        </div>

        {/* Metric 2: Average weekly volume */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Promedio Semanal</span>
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono-nums text-emerald-400">
            {(stats.avgWeeklyVolumeKg / 1000).toFixed(1)}{' '}
            <span className="text-xs text-slate-400 font-sans font-normal">Ton/sem</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono-nums mt-0.5">
            {stats.avgWeeklyVolumeKg.toLocaleString()} Kg / semana activa
          </div>
        </div>

        {/* Metric 3: Record Week */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Semana Récord</span>
            <Award className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono-nums text-white">
            {stats.bestWeek ? (
              <>
                {(stats.bestWeek.volumeKg / 1000).toFixed(1)}{' '}
                <span className="text-xs text-slate-400 font-sans font-normal">Ton</span>
              </>
            ) : (
              '0 Ton'
            )}
          </div>
          <div className="text-[10px] text-slate-500 truncate mt-0.5" title={stats.bestWeek?.fullLabel}>
            {stats.bestWeek ? stats.bestWeek.shortRange : 'Sin datos'}
          </div>
        </div>

        {/* Metric 4: Trend vs Previous Week */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Tendencia Última Sem</span>
            {stats.percentageChangeLastWeek !== null && stats.percentageChangeLastWeek >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono-nums flex items-center gap-1">
            {stats.percentageChangeLastWeek !== null ? (
              <>
                <span
                  className={
                    stats.percentageChangeLastWeek >= 0 ? 'text-emerald-400' : 'text-slate-300'
                  }
                >
                  {stats.percentageChangeLastWeek >= 0 ? '+' : ''}
                  {stats.percentageChangeLastWeek}%
                </span>
                {stats.percentageChangeLastWeek >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-slate-400" />
                )}
              </>
            ) : (
              <span className="text-slate-500 font-sans text-sm font-normal">Base inicial</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {stats.percentageChangeLastWeek !== null
              ? 'Respecto a semana previa'
              : 'Primer registro del ciclo'}
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      {!hasData ? (
        <div className="h-64 flex flex-col items-center justify-center bg-slate-950/40 rounded-xl border border-slate-800/80 p-6 text-center">
          <Dumbbell className="w-8 h-8 text-slate-600 mb-2" />
          <h3 className="text-sm font-bold text-white mb-1">
            Sin volumen registrado en las últimas semanas
          </h3>
          <p className="text-xs text-slate-400 max-w-sm">
            Completa tus rutinas en la sección "Entrenar" o añade entrenamientos anteriores en "Historial" para visualizar la curva de sobrecarga progresiva.
          </p>
        </div>
      ) : (
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart
                data={stats.data}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="volumeAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  opacity={0.35}
                  vertical={false}
                />

                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />

                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatYAxis}
                />

                <Tooltip
                  content={<CustomChartTooltip unit={unit} />}
                  cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '3 3' }}
                />

                {stats.avgWeeklyVolumeKg > 0 && (
                  <ReferenceLine
                    y={stats.avgWeeklyVolumeKg}
                    stroke="#059669"
                    strokeDasharray="4 4"
                    strokeOpacity={0.7}
                    label={{
                      value: 'Promedio',
                      fill: '#10b981',
                      fontSize: 10,
                      position: 'insideTopRight',
                    }}
                  />
                )}

                <Area
                  type="monotone"
                  dataKey="volumeKg"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#volumeAreaGradient)"
                  activeDot={{
                    r: 6,
                    fill: '#34d399',
                    stroke: '#022c22',
                    strokeWidth: 2,
                  }}
                  dot={{
                    r: 3,
                    fill: '#10b981',
                    stroke: '#0f172a',
                    strokeWidth: 1.5,
                  }}
                />
              </AreaChart>
            ) : (
              <BarChart
                data={stats.data}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  opacity={0.35}
                  vertical={false}
                />

                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />

                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatYAxis}
                />

                <Tooltip
                  content={<CustomChartTooltip unit={unit} />}
                  cursor={{ fill: 'rgba(51, 65, 85, 0.2)' }}
                />

                {stats.avgWeeklyVolumeKg > 0 && (
                  <ReferenceLine
                    y={stats.avgWeeklyVolumeKg}
                    stroke="#059669"
                    strokeDasharray="4 4"
                    strokeOpacity={0.7}
                    label={{
                      value: 'Promedio',
                      fill: '#10b981',
                      fontSize: 10,
                      position: 'insideTopRight',
                    }}
                  />
                )}

                <Bar
                  dataKey="volumeKg"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={45}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottom Insights Note */}
      {hasData && (
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {stats.bestWeek
                ? `Pico máximo alcanzado: ${stats.bestWeek.volumeKg.toLocaleString()} Kg (${stats.bestWeek.shortRange})`
                : 'Monitoreo activo'}
            </span>
          </div>
          <span className="font-mono-nums text-[11px] text-slate-500">
            Total en periodo: {stats.totalSessions} sesiones realizadas
          </span>
        </div>
      )}
    </div>
  );
};
