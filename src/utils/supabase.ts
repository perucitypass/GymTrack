import { createClient, User } from '@supabase/supabase-js';
import { WorkoutLog } from '../types/gym';

export const SUPABASE_URL = 'https://bezozutmbecupyhdxipb.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_Qv48SnujOuvnS4ihSVUAPA_jYbp6KLB';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export interface SupabaseSyncResult {
  success: boolean;
  count: number;
  message: string;
}

/**
 * Format a WorkoutLog into the Supabase database schema
 */
export function formatLogForSupabase(log: WorkoutLog, userId?: string | null) {
  return {
    id: log.id,
    user_id: userId || null,
    routine_day_id: log.routineDayId,
    routine_day_name: log.routineDayName,
    start_time: log.startTime,
    end_time: log.endTime,
    duration_seconds: log.durationSeconds,
    total_volume_kg: log.totalVolumeKg,
    total_sets_completed: log.totalSetsCompleted,
    total_reps_completed: log.totalRepsCompleted,
    notes: log.notes || '',
    exercises: log.exercises,
  };
}

/**
 * Convert a Supabase row back to WorkoutLog
 */
export function formatSupabaseRowToLog(row: any): WorkoutLog {
  return {
    id: row.id,
    routineDayId: row.routine_day_id,
    routineDayName: row.routine_day_name,
    startTime: row.start_time,
    endTime: row.end_time,
    durationSeconds: row.duration_seconds,
    totalVolumeKg: Number(row.total_volume_kg) || 0,
    totalSetsCompleted: Number(row.total_sets_completed) || 0,
    totalRepsCompleted: Number(row.total_reps_completed) || 0,
    notes: row.notes || '',
    exercises: row.exercises || [],
  };
}

/**
 * Upload & Upsert all local workout logs to Supabase
 */
export async function syncLogsToSupabase(
  logs: WorkoutLog[],
  user?: User | null
): Promise<SupabaseSyncResult> {
  if (!logs || logs.length === 0) {
    return {
      success: true,
      count: 0,
      message: 'No hay entrenamientos locales para sincronizar.',
    };
  }

  try {
    const payload = logs.map((log) => formatLogForSupabase(log, user?.id));

    const { error } = await supabase
      .from('workout_logs')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('Supabase upsert error:', error);
      return {
        success: false,
        count: 0,
        message: `Error al sincronizar con Supabase: ${error.message}`,
      };
    }

    return {
      success: true,
      count: logs.length,
      message: `¡${logs.length} entrenamientos sincronizados exitosamente en Supabase!`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido al sincronizar';
    return {
      success: false,
      count: 0,
      message: msg,
    };
  }
}

/**
 * Fetch all workout logs stored in Supabase
 */
export async function fetchLogsFromSupabase(): Promise<{
  logs: WorkoutLog[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .order('start_time', { ascending: false });

    if (error) {
      return { logs: [], error: error.message };
    }

    const parsedLogs = (data || []).map(formatSupabaseRowToLog);
    return { logs: parsedLogs };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al consultar Supabase';
    return { logs: [], error: msg };
  }
}
