export interface ExerciseTemplate {
  id: string;
  name: string;
  category: 'Pecho' | 'Espalda' | 'Pierna' | 'Hombro' | 'Brazo' | 'Abdomen' | 'General';
  targetSets: number;
  targetReps: number;
  defaultWeightKg: number; // e.g. 36
  defaultSetWeights?: number[]; // individual weights for each set, e.g. [38, 45, 38, 45]
  weightRangeNote?: string; // e.g. "15 Kg - 17.5 Kg", "36 Kg (3)", "38 Kg a 45 Kg (2 y 4)"
  notes?: string;
  isBodyweight?: boolean;
}

export interface RoutineDay {
  id: string; // 'dia-1' | 'dia-2' | 'dia-3'
  name: string; // 'Día 1'
  subtitle: string; // 'Pecho, Espalda y Abdomen'
  description?: string;
  exercises: ExerciseTemplate[];
}

export interface LoggedSet {
  setNumber: number;
  weightKg: number;
  reps: number;
  completed: boolean;
}

export interface LoggedExercise {
  id: string; // template id or generated id
  name: string;
  category: string;
  notes?: string;
  sets: LoggedSet[];
}

export interface WorkoutLog {
  id: string;
  routineDayId: string; // 'dia-1', 'dia-2', 'dia-3' or 'custom'
  routineDayName: string; // 'Día 1'
  startTime: string; // ISO string
  endTime: string; // ISO string
  durationSeconds: number; // total duration
  notes?: string;
  exercises: LoggedExercise[];
  totalVolumeKg: number; // sum of (weightKg * reps)
  totalSetsCompleted: number;
  totalRepsCompleted: number;
}

export type ActiveTab = 'rutina' | 'entrenar' | 'historial' | 'resumenes';
