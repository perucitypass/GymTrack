import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { WorkoutLog } from '../types/gym';

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Storage for existing spreadsheet ID
const SPREADSHEET_ID_KEY = 'gymtrack_spreadsheet_id_v1';

export function getSavedSpreadsheetId(): string | null {
  return localStorage.getItem(SPREADSHEET_ID_KEY);
}

export function saveSpreadsheetId(id: string): void {
  localStorage.setItem(SPREADSHEET_ID_KEY, id);
}

export function removeSpreadsheetId(): void {
  localStorage.removeItem(SPREADSHEET_ID_KEY);
}

// Prepare 2D matrix of rows for "Base_Series" sheet
export function prepareSeriesRows(logs: WorkoutLog[]): (string | number)[][] {
  const header = [
    'ID_Sesion',
    'Fecha',
    'Hora',
    'Dia_Rutina',
    'Grupo_Muscular',
    'Ejercicio',
    'Serie_Num',
    'Peso_Kg',
    'Reps',
    'Volumen_Serie_Kg',
    'Completada',
    'Notas_Ejercicio',
  ];

  const rows: (string | number)[][] = [header];

  // Sort logs by date ascending
  const sorted = [...logs].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  sorted.forEach((log) => {
    const dateObj = new Date(log.startTime);
    const dateStr = dateObj.toISOString().slice(0, 10);
    const timeStr = dateObj.toTimeString().slice(0, 5);

    log.exercises.forEach((ex) => {
      ex.sets.forEach((set) => {
        rows.push([
          log.id,
          dateStr,
          timeStr,
          log.routineDayName,
          ex.category,
          ex.name,
          set.setNumber,
          set.weightKg,
          set.reps,
          Math.round(set.weightKg * set.reps * 10) / 10,
          set.completed ? 'SI' : 'NO',
          ex.notes || '',
        ]);
      });
    });
  });

  return rows;
}

// Prepare 2D matrix of rows for "Resumen_Sesiones" sheet
export function prepareSessionsSummaryRows(logs: WorkoutLog[]): (string | number)[][] {
  const header = [
    'ID_Sesion',
    'Fecha',
    'Hora_Inicio',
    'Dia_Rutina',
    'Duracion_Minutos',
    'Total_Series_Completadas',
    'Total_Reps_Completadas',
    'Volumen_Total_Kg',
    'Notas_Generales',
  ];

  const rows: (string | number)[][] = [header];

  const sorted = [...logs].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  sorted.forEach((log) => {
    const dateObj = new Date(log.startTime);
    const dateStr = dateObj.toISOString().slice(0, 10);
    const timeStr = dateObj.toTimeString().slice(0, 5);
    const durationMinutes = Math.round(log.durationSeconds / 60);

    rows.push([
      log.id,
      dateStr,
      timeStr,
      log.routineDayName,
      durationMinutes,
      log.totalSetsCompleted,
      log.totalRepsCompleted,
      log.totalVolumeKg,
      log.notes || '',
    ]);
  });

  return rows;
}

// Create a new Google Spreadsheet
export async function createGoogleSpreadsheet(accessToken: string): Promise<string> {
  const body = {
    properties: {
      title: 'GymTrack - Base de Datos de Entrenamientos',
    },
    sheets: [
      {
        properties: {
          title: 'Base_Series',
          gridProperties: { rowCount: 1000, columnCount: 15 },
        },
      },
      {
        properties: {
          title: 'Resumen_Sesiones',
          gridProperties: { rowCount: 500, columnCount: 12 },
        },
      },
    ],
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error creando la hoja en Google Sheets: ${errorText}`);
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  saveSpreadsheetId(spreadsheetId);
  return spreadsheetId;
}

// Sync all workout logs into the Google Spreadsheet
export async function syncLogsToGoogleSheets(
  accessToken: string,
  spreadsheetId: string,
  logs: WorkoutLog[]
): Promise<void> {
  const seriesData = prepareSeriesRows(logs);
  const sessionsData = prepareSessionsSummaryRows(logs);

  // Clear previous values first to avoid stale rows
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Base_Series!A1:Z:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Resumen_Sesiones!A1:Z:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // Write Base_Series
  const writeSeriesRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Base_Series!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: seriesData }),
    }
  );

  if (!writeSeriesRes.ok) {
    const err = await writeSeriesRes.text();
    throw new Error(`Error escribiendo en Base_Series: ${err}`);
  }

  // Write Resumen_Sesiones
  const writeSessionsRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Resumen_Sesiones!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: sessionsData }),
    }
  );

  if (!writeSessionsRes.ok) {
    const err = await writeSessionsRes.text();
    throw new Error(`Error escribiendo en Resumen_Sesiones: ${err}`);
  }
}
