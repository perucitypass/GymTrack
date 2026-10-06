import { RoutineDay, WorkoutLog } from '../types/gym';
import { DEFAULT_ROUTINE } from '../data/defaultRoutine';

const ROUTINE_KEY = 'gymtrack_routine_v1';
const LOGS_KEY = 'gymtrack_logs_v1';
const ACTIVE_WORKOUT_KEY = 'gymtrack_active_workout_v1';

export function loadRoutine(): RoutineDay[] {
  try {
    const data = localStorage.getItem(ROUTINE_KEY);
    if (!data) {
      saveRoutine(DEFAULT_ROUTINE);
      return DEFAULT_ROUTINE;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading routine', e);
    return DEFAULT_ROUTINE;
  }
}

export function saveRoutine(routine: RoutineDay[]): void {
  try {
    localStorage.setItem(ROUTINE_KEY, JSON.stringify(routine));
  } catch (e) {
    console.error('Error saving routine', e);
  }
}

export function resetRoutineToDefault(): RoutineDay[] {
  saveRoutine(DEFAULT_ROUTINE);
  return DEFAULT_ROUTINE;
}

export function loadWorkoutLogs(): WorkoutLog[] {
  try {
    const data = localStorage.getItem(LOGS_KEY);
    if (!data) return [];
    const parsed: WorkoutLog[] = JSON.parse(data);
    // Purge any demo or sample logs so history is strictly real user data
    const realOnly = parsed.filter((log) => !log.id.startsWith('demo-log-'));
    if (realOnly.length !== parsed.length) {
      saveWorkoutLogs(realOnly);
    }
    return realOnly;
  } catch (e) {
    console.error('Error loading logs', e);
    return [];
  }
}

export function saveWorkoutLogs(logs: WorkoutLog[]): void {
  try {
    const realOnly = logs.filter((log) => !log.id.startsWith('demo-log-'));
    localStorage.setItem(LOGS_KEY, JSON.stringify(realOnly));
  } catch (e) {
    console.error('Error saving logs', e);
  }
}

export function addWorkoutLog(log: WorkoutLog): WorkoutLog[] {
  const current = loadWorkoutLogs();
  const updated = [log, ...current];
  saveWorkoutLogs(updated);
  return updated;
}

export function updateWorkoutLog(updatedLog: WorkoutLog): WorkoutLog[] {
  const current = loadWorkoutLogs();
  const updated = current.map((item) => (item.id === updatedLog.id ? updatedLog : item));
  saveWorkoutLogs(updated);
  return updated;
}

export function deleteWorkoutLog(logId: string): WorkoutLog[] {
  const current = loadWorkoutLogs();
  const updated = current.filter((item) => item.id !== logId);
  saveWorkoutLogs(updated);
  return updated;
}

export function clearAllWorkoutLogs(): void {
  try {
    localStorage.removeItem(LOGS_KEY);
  } catch (e) {
    console.error('Error clearing logs', e);
  }
}

// Active workout preservation
export interface ActiveWorkoutState {
  routineDayId: string;
  routineDayName: string;
  startTime: string;
  elapsedSeconds: number;
  isRunning: boolean;
  notes: string;
  exercises: {
    id: string;
    name: string;
    category: string;
    notes?: string;
    sets: {
      setNumber: number;
      weightKg: number;
      reps: number;
      completed: boolean;
    }[];
  }[];
}

export function loadActiveWorkout(): ActiveWorkoutState | null {
  try {
    const data = localStorage.getItem(ACTIVE_WORKOUT_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveActiveWorkout(state: ActiveWorkoutState | null): void {
  try {
    if (state === null) {
      localStorage.removeItem(ACTIVE_WORKOUT_KEY);
    } else {
      localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(state));
    }
  } catch (e) {
    console.error('Error saving active workout', e);
  }
}

export function seedSampleWorkoutHistory(): WorkoutLog[] {
  // Demo seeding disabled: history uses real workouts only
  return [];
}

export function exportBackupJSON(): string {
  const routine = loadRoutine();
  const logs = loadWorkoutLogs();
  return JSON.stringify({ routine, logs, exportedAt: new Date().toISOString() }, null, 2);
}

export function importBackupJSON(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.routine && Array.isArray(parsed.routine)) {
      saveRoutine(parsed.routine);
    }
    if (parsed.logs && Array.isArray(parsed.logs)) {
      saveWorkoutLogs(parsed.logs);
    }
    return true;
  } catch {
    return false;
  }
}
