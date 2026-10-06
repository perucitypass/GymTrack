import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { WorkoutLog } from '../types/gym';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  getAccessToken,
  createGoogleSpreadsheet,
  syncLogsToGoogleSheets,
  getSavedSpreadsheetId,
  saveSpreadsheetId,
} from '../utils/googleWorkspace';
import { exportToExcel, exportToCSV } from '../utils/excelExport';
import {
  FileSpreadsheet,
  Download,
  Cloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  X,
  LogOut,
  Layers,
  Database,
  ArrowRight,
} from 'lucide-react';

interface DatabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: WorkoutLog[];
}

export const DatabaseSyncModal: React.FC<DatabaseSyncModalProps> = ({
  isOpen,
  onClose,
  logs,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(getSavedSpreadsheetId());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<{
    type: 'success' | 'error' | 'idle';
    message: string;
  }>({ type: 'idle', message: '' });

  // Confirmation state for modifying Google Sheets
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsLoadingAuth(true);
    setSyncStatus({ type: 'idle', message: '' });
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con Google';
      setSyncStatus({
        type: 'error',
        message: msg.includes('popup-closed')
          ? 'La ventana de inicio de sesión fue cerrada.'
          : msg,
      });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleSignOut = async () => {
    await logoutGoogle();
    setUser(null);
    setToken(null);
    setSyncStatus({ type: 'idle', message: '' });
  };

  const handleCreateOrSync = async () => {
    if (!token) {
      setSyncStatus({ type: 'error', message: 'Debes iniciar sesión con Google primero.' });
      return;
    }

    setConfirmModalOpen(false);
    setIsSyncing(true);
    setSyncStatus({ type: 'idle', message: '' });

    try {
      let targetId = spreadsheetId;
      if (!targetId) {
        targetId = await createGoogleSpreadsheet(token);
        setSpreadsheetId(targetId);
      }

      await syncLogsToGoogleSheets(token, targetId, logs);
      setSyncStatus({
        type: 'success',
        message: `¡Consolidación exitosa! Se actualizaron ${logs.length} sesiones en tu Google Sheet.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error durante la sincronización';
      setSyncStatus({ type: 'error', message: msg });
    } finally {
      setIsSyncing(false);
    }
  };

  // Calculate total series count for stats
  let totalSeriesCount = 0;
  logs.forEach((l) => {
    l.exercises.forEach((ex) => {
      totalSeriesCount += ex.sets.length;
    });
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Consolidar en Base de Datos
              </h2>
              <p className="text-xs text-slate-400">
                Sincroniza tus sesiones en Google Sheets o exporta a Excel (.xlsx)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          {/* Data Summary Counter */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 block">
                  Data Registrada Lista para Consolidar
                </span>
                <span className="text-sm font-bold text-white">
                  {logs.length} entrenamientos · {totalSeriesCount} series con pesos y repeticiones
                </span>
              </div>
            </div>
          </div>

          {/* Option 1: Google Sheets (Cloud Live Database) */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  GS
                </div>
                <h3 className="text-base font-bold text-white">
                  Google Sheets (En la Nube)
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Automático
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Crea o actualiza una hoja de cálculo en tu Google Drive con 2 tablas estructuradas:
              <strong className="text-slate-300"> "Base_Series"</strong> (cada serie con fecha, ejercicio, peso y reps) y
              <strong className="text-slate-300"> "Resumen_Sesiones"</strong> (duración y volumen total).
            </p>

            {/* Google Authentication Box */}
            {!user ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-300 text-center sm:text-left">
                  Conéctate con tu cuenta de Google para acceder a tus hojas de cálculo.
                </div>

                {/* Google Sign In Button */}
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isLoadingAuth}
                  className="flex items-center gap-2.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 rounded-xl font-medium text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>{isLoadingAuth ? 'Conectando...' : 'Iniciar sesión con Google'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* User connected info */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Google User'}
                        className="w-8 h-8 rounded-full border border-slate-700"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        {user.email?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {user.displayName || 'Usuario de Google'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {user.email}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleSignOut}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                    title="Cerrar sesión de Google"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                {/* Google Sheet status & Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  {spreadsheetId && (
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir Hoja en Google Sheets</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => setConfirmModalOpen(true)}
                    disabled={isSyncing}
                    className="w-full sm:flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>
                      {isSyncing
                        ? 'Sincronizando con Google Sheets...'
                        : spreadsheetId
                        ? 'Actualizar Base de Datos en Sheets'
                        : 'Crear y Consolidar en Sheets'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Sync Feedback Message */}
            {syncStatus.type !== 'idle' && (
              <div
                className={`mt-3 p-3 rounded-xl flex items-center gap-2 text-xs ${
                  syncStatus.type === 'success'
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                }`}
              >
                {syncStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{syncStatus.message}</span>
              </div>
            )}
          </div>

          {/* Option 2: Excel / CSV Export (Direct Download) */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-600/20 text-teal-400 flex items-center justify-center font-bold text-xs">
                  XLS
                </div>
                <h3 className="text-base font-bold text-white">
                  Microsoft Excel y CSV (Descarga Directa)
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                Sin Login
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Descarga un archivo Excel (.xlsx) estructurado con pestañas automáticas o un CSV para abrir en cualquier programa de hojas de cálculo.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => exportToExcel(logs)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Descargar en Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => exportToCSV(logs)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-400" />
                <span>Descargar en CSV (.csv)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Modifying Google Sheets (MANDATORY per Workspace Skill) */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">
              ¿Confirmar consolidación en Google Sheets?
            </h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Esta acción actualizará tu hoja de cálculo con {logs.length} entrenamientos ({totalSeriesCount} series) en las pestañas "Base_Series" y "Resumen_Sesiones".
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateOrSync}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-md cursor-pointer"
              >
                Sí, Consolidar en Sheets
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
