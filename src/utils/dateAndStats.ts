import { WorkoutLog } from '../types/gym';

export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0 min';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (mins > 0) {
    return `${mins}m ${secs > 0 ? `${secs}s` : ''}`.trim();
  }
  return `${secs}s`;
}

export function formatStopwatch(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatDateSpanish(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatTimeSpanish(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

// Get the Monday of a given date's week
export function getStartOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  // In JS: 0 is Sunday, 1 is Monday... 6 is Saturday
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getEndOfWeek(startOfWeek: Date): Date {
  const end = new Date(startOfWeek);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function getStartOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

export function getEndOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export interface DayStats {
  dayName: string; // 'Lun', 'Mar', 'Mié', etc.
  dateString: string; // YYYY-MM-DD
  workouts: WorkoutLog[];
  totalDurationMinutes: number;
  totalVolumeKg: number;
}

export interface WeeklyStats {
  weekStart: Date;
  weekEnd: Date;
  weekLabel: string;
  totalSessions: number;
  totalDurationSeconds: number;
  totalVolumeKg: number;
  totalSets: number;
  totalReps: number;
  workouts: WorkoutLog[];
  days: DayStats[];
}

export function computeWeeklySummary(logs: WorkoutLog[], referenceDate: Date): WeeklyStats {
  const weekStart = getStartOfWeek(referenceDate);
  const weekEnd = getEndOfWeek(weekStart);

  const weekLogs = logs.filter((log) => {
    const logDate = new Date(log.startTime);
    return logDate >= weekStart && logDate <= weekEnd;
  });

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const days: DayStats[] = [];

  for (let i = 0; i < 7; i++) {
    const currentDayDate = new Date(weekStart);
    currentDayDate.setDate(currentDayDate.getDate() + i);
    const dateStr = currentDayDate.toISOString().split('T')[0];

    const dayWorkouts = weekLogs.filter((log) => {
      const d = new Date(log.startTime).toISOString().split('T')[0];
      return d === dateStr;
    });

    const dayDurationMin = Math.round(
      dayWorkouts.reduce((acc, curr) => acc + curr.durationSeconds, 0) / 60
    );
    const dayVolume = dayWorkouts.reduce((acc, curr) => acc + curr.totalVolumeKg, 0);

    days.push({
      dayName: dayNames[i],
      dateString: dateStr,
      workouts: dayWorkouts,
      totalDurationMinutes: dayDurationMin,
      totalVolumeKg: dayVolume,
    });
  }

  const totalSessions = weekLogs.length;
  const totalDurationSeconds = weekLogs.reduce((acc, curr) => acc + curr.durationSeconds, 0);
  const totalVolumeKg = weekLogs.reduce((acc, curr) => acc + curr.totalVolumeKg, 0);
  const totalSets = weekLogs.reduce((acc, curr) => acc + curr.totalSetsCompleted, 0);
  const totalReps = weekLogs.reduce((acc, curr) => acc + curr.totalRepsCompleted, 0);

  const startFormatted = weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const endFormatted = weekEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const weekLabel = `${startFormatted} – ${endFormatted}`;

  return {
    weekStart,
    weekEnd,
    weekLabel,
    totalSessions,
    totalDurationSeconds,
    totalVolumeKg,
    totalSets,
    totalReps,
    workouts: weekLogs,
    days,
  };
}

export interface MonthlyWeekItem {
  weekNum: number;
  label: string;
  totalDurationMinutes: number;
  totalVolumeKg: number;
  sessionCount: number;
}

export interface MonthlyStats {
  monthDate: Date;
  monthName: string;
  year: number;
  totalSessions: number;
  totalDurationSeconds: number;
  totalVolumeKg: number;
  totalSets: number;
  totalReps: number;
  averageDurationMinutes: number;
  dayDistribution: { [key: string]: number }; // 'Día 1': 4, 'Día 2': 3
  workouts: WorkoutLog[];
  weeks: MonthlyWeekItem[];
}

export function computeMonthlySummary(logs: WorkoutLog[], referenceDate: Date): MonthlyStats {
  const start = getStartOfMonth(referenceDate);
  const end = getEndOfMonth(referenceDate);

  const monthLogs = logs.filter((log) => {
    const logDate = new Date(log.startTime);
    return logDate >= start && logDate <= end;
  });

  const totalSessions = monthLogs.length;
  const totalDurationSeconds = monthLogs.reduce((acc, curr) => acc + curr.durationSeconds, 0);
  const totalVolumeKg = monthLogs.reduce((acc, curr) => acc + curr.totalVolumeKg, 0);
  const totalSets = monthLogs.reduce((acc, curr) => acc + curr.totalSetsCompleted, 0);
  const totalReps = monthLogs.reduce((acc, curr) => acc + curr.totalRepsCompleted, 0);
  const averageDurationMinutes = totalSessions > 0 ? Math.round(totalDurationSeconds / totalSessions / 60) : 0;

  const dayDistribution: { [key: string]: number } = {
    'Día 1': 0,
    'Día 2': 0,
    'Día 3': 0,
    'Otro': 0,
  };

  monthLogs.forEach((l) => {
    if (l.routineDayName.includes('1')) dayDistribution['Día 1']++;
    else if (l.routineDayName.includes('2')) dayDistribution['Día 2']++;
    else if (l.routineDayName.includes('3')) dayDistribution['Día 3']++;
    else dayDistribution['Otro']++;
  });

  // Calculate 4-5 weeks of the month
  const weeks: MonthlyWeekItem[] = [];
  const daysInMonth = end.getDate();
  const weekChunkSize = 7;
  let weekIndex = 1;

  for (let d = 1; d <= daysInMonth; d += weekChunkSize) {
    const endD = Math.min(d + weekChunkSize - 1, daysInMonth);
    const chunkStart = new Date(start.getFullYear(), start.getMonth(), d, 0, 0, 0);
    const chunkEnd = new Date(start.getFullYear(), start.getMonth(), endD, 23, 59, 59);

    const chunkLogs = monthLogs.filter((l) => {
      const dt = new Date(l.startTime);
      return dt >= chunkStart && dt <= chunkEnd;
    });

    const durationMin = Math.round(chunkLogs.reduce((a, b) => a + b.durationSeconds, 0) / 60);
    const volume = chunkLogs.reduce((a, b) => a + b.totalVolumeKg, 0);

    weeks.push({
      weekNum: weekIndex,
      label: `Sem ${weekIndex} (${d}-${endD})`,
      totalDurationMinutes: durationMin,
      totalVolumeKg: volume,
      sessionCount: chunkLogs.length,
    });
    weekIndex++;
  }

  const monthName = start.toLocaleDateString('es-ES', { month: 'long' });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return {
    monthDate: start,
    monthName: capitalizedMonth,
    year: start.getFullYear(),
    totalSessions,
    totalDurationSeconds,
    totalVolumeKg,
    totalSets,
    totalReps,
    averageDurationMinutes,
    dayDistribution,
    workouts: monthLogs,
    weeks,
  };
}

export interface ExerciseProgressionPoint {
  date: string;
  workoutName: string;
  maxWeightKg: number;
  totalVolumeKg: number;
  setsCount: number;
  totalReps: number;
}

export interface WeeklyVolumeEvolutionPoint {
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  label: string;
  shortRange: string;
  fullLabel: string;
  volumeKg: number;
  volumeTons: number;
  sessionsCount: number;
  setsCount: number;
  repsCount: number;
  durationMinutes: number;
  avgVolumePerSession: number;
  isCurrentWeek: boolean;
}

export function computeWeeklyVolumeEvolution(
  logs: WorkoutLog[],
  numberOfWeeks: number | 'all' = 8,
  referenceDate: Date = new Date()
): {
  data: WeeklyVolumeEvolutionPoint[];
  maxVolumeKg: number;
  avgWeeklyVolumeKg: number;
  totalVolumeKg: number;
  totalSessions: number;
  percentageChangeLastWeek: number | null;
  bestWeek: WeeklyVolumeEvolutionPoint | null;
} {
  // Find latest date between referenceDate and newest log
  const now = new Date(referenceDate);
  const currentWeekMonday = getStartOfWeek(now);

  // If 'all', find the oldest log date
  let weeksCount = typeof numberOfWeeks === 'number' ? numberOfWeeks : 8;
  if (numberOfWeeks === 'all' && logs.length > 0) {
    const oldestTimestamp = Math.min(...logs.map((l) => new Date(l.startTime).getTime()));
    const oldestMonday = getStartOfWeek(new Date(oldestTimestamp));
    const diffWeeks = Math.ceil(
      (currentWeekMonday.getTime() - oldestMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
    ) + 1;
    weeksCount = Math.max(4, Math.min(52, diffWeeks));
  }

  const result: WeeklyVolumeEvolutionPoint[] = [];

  // Generate weeks from oldest to newest
  for (let i = weeksCount - 1; i >= 0; i--) {
    const wStart = new Date(currentWeekMonday);
    wStart.setDate(currentWeekMonday.getDate() - i * 7);
    wStart.setHours(0, 0, 0, 0);

    const wEnd = new Date(wStart);
    wEnd.setDate(wStart.getDate() + 6);
    wEnd.setHours(23, 59, 59, 999);

    const weekWorkouts = logs.filter((log) => {
      const logDate = new Date(log.startTime);
      return logDate >= wStart && logDate <= wEnd;
    });

    const volumeKg = weekWorkouts.reduce((sum, w) => sum + (w.totalVolumeKg || 0), 0);
    const setsCount = weekWorkouts.reduce((sum, w) => sum + (w.totalSetsCompleted || 0), 0);
    const repsCount = weekWorkouts.reduce((sum, w) => sum + (w.totalRepsCompleted || 0), 0);
    const durationMinutes = Math.round(
      weekWorkouts.reduce((sum, w) => sum + (w.durationSeconds || 0), 0) / 60
    );
    const sessionsCount = weekWorkouts.length;
    const avgVolumePerSession = sessionsCount > 0 ? Math.round(volumeKg / sessionsCount) : 0;

    const startDay = wStart.getDate();
    const startMonth = wStart.toLocaleDateString('es-ES', { month: 'short' });
    const endDay = wEnd.getDate();
    const endMonth = wEnd.toLocaleDateString('es-ES', { month: 'short' });

    const label = `${startDay} ${startMonth}`;
    const shortRange =
      startMonth === endMonth
        ? `${startDay} - ${endDay} ${startMonth}`
        : `${startDay} ${startMonth} - ${endDay} ${endMonth}`;

    const isCurrentWeek = i === 0;

    result.push({
      weekKey: wStart.toISOString().slice(0, 10),
      weekStart: wStart.toISOString().slice(0, 10),
      weekEnd: wEnd.toISOString().slice(0, 10),
      label,
      shortRange,
      fullLabel: `Semana ${shortRange}`,
      volumeKg: Math.round(volumeKg * 10) / 10,
      volumeTons: Math.round((volumeKg / 1000) * 10) / 10,
      sessionsCount,
      setsCount,
      repsCount,
      durationMinutes,
      avgVolumePerSession,
      isCurrentWeek,
    });
  }

  const maxVolumeKg = Math.max(...result.map((r) => r.volumeKg), 0);
  const totalVolumeKg = result.reduce((sum, r) => sum + r.volumeKg, 0);
  const totalSessions = result.reduce((sum, r) => sum + r.sessionsCount, 0);

  // Compute average weekly volume across active weeks (or all weeks if active > 0)
  const activeWeeks = result.filter((r) => r.volumeKg > 0);
  const avgWeeklyVolumeKg =
    activeWeeks.length > 0 ? Math.round(totalVolumeKg / activeWeeks.length) : 0;

  // Percentage change between latest week and previous week
  let percentageChangeLastWeek: number | null = null;
  if (result.length >= 2) {
    const currentWeekVol = result[result.length - 1].volumeKg;
    const prevWeekVol = result[result.length - 2].volumeKg;
    if (prevWeekVol > 0) {
      percentageChangeLastWeek = Math.round(((currentWeekVol - prevWeekVol) / prevWeekVol) * 100);
    } else if (currentWeekVol > 0) {
      percentageChangeLastWeek = 100;
    }
  }

  // Find best week
  let bestWeek: WeeklyVolumeEvolutionPoint | null = null;
  if (result.length > 0 && maxVolumeKg > 0) {
    bestWeek = [...result].sort((a, b) => b.volumeKg - a.volumeKg)[0];
  }

  return {
    data: result,
    maxVolumeKg,
    avgWeeklyVolumeKg,
    totalVolumeKg,
    totalSessions,
    percentageChangeLastWeek,
    bestWeek,
  };
}

export function getExerciseProgression(logs: WorkoutLog[], exerciseName: string): ExerciseProgressionPoint[] {
  const points: ExerciseProgressionPoint[] = [];

  // Logs ordered from oldest to newest
  const sorted = [...logs].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  sorted.forEach((log) => {
    const ex = log.exercises.find((e) => e.name.toLowerCase().trim() === exerciseName.toLowerCase().trim());
    if (ex && ex.sets.some((s) => s.completed)) {
      const completedSets = ex.sets.filter((s) => s.completed);
      const maxWeight = Math.max(...completedSets.map((s) => s.weightKg), 0);
      const vol = completedSets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
      const totalReps = completedSets.reduce((sum, s) => sum + s.reps, 0);

      points.push({
        date: formatDateSpanish(log.startTime),
        workoutName: log.routineDayName,
        maxWeightKg: maxWeight,
        totalVolumeKg: vol,
        setsCount: completedSets.length,
        totalReps,
      });
    }
  });

  return points;
}

