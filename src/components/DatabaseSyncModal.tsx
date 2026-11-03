import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { WorkoutLog } from '../types/gym';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  createGoogleSpreadsheet,
  syncLogsToGoogleSheets,
  getSavedSpreadsheetId,
} from '../utils/googleWorkspace';
import { exportToExcel, exportToCSV } from '../utils/excelExport';
import {
  supabase,
  syncLogsToSupabase,
  fetchLogsFromSupabase,
  SUPABASE_URL,
} from '../utils/supabase';
import { saveWorkoutLogs, loadWorkoutLogs } from '../utils/storage';
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
  Zap,
  Copy,
  Check,
  ShieldCheck,
  UploadCloud,
  DownloadCloud,
} from 'lucide-react';

interface DatabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: WorkoutLog[];
  onLogsChanged?: () => void;
}

export const DatabaseSyncModal: React.FC<DatabaseSyncModalProps> = ({
  isOpen,
  onClose,
  logs,
  onLogsChanged,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'supabase' | 'excel' | 'sheets'>('supabase');

  // Supabase state
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [supabaseLoading, setSupabaseLoading] = useState<boolean>(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    type: 'success' | 'error' | 'idle';
    message: string;
  }>({ type: 'idle', message: '' });
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [showSqlGuide, setShowSqlGuide] = useState<boolean>(false);

  // Email/Password state for Supabase
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState<boolean>(false);
  const [showAuthForm, setShowAuthForm] = useState<boolean>(false);

  // Google Sheets state
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isLoadingGoogleAuth, setIsLoadingGoogleAuth] = useState<boolean>(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(getSavedSpreadsheetId());
  const [isGoogleSyncing, setIsGoogleSyncing] = useState<boolean>(false);
  const [googleSyncStatus, setGoogleSyncStatus] = useState<{
    type: 'success' | 'error' | 'idle';
    message: string;
  }>({ type: 'idle', message: '' });

  // Confirmation state for modifying Google Sheets
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);

  // Check Supabase session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check Google Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setGoogleUser(currentUser);
        setGoogleToken(accessToken);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (!isOpen) return null;

  // Supabase SQL table template
  const tableSql = `-- Ejecuta esto en Supabase > SQL Editor:
create table if not exists workout_logs (
  id text primary key,
  user_id uuid references auth.users(id),
  routine_day_id text not null,
  routine_day_name text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  duration_seconds int not null,
  total_volume_kg numeric default 0,
  total_sets_completed int default 0,
  total_reps_completed int default 0,
  notes text,
  exercises jsonb not null,
  created_at timestamptz default now()
);

-- Habilitar seguridad RLS
alter table workout_logs enable row level security;

-- Permitir guardar y consultar entrenamientos
create policy "Acceso a entrenamientos"
on workout_logs for all
using (true)
with check (true);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(tableSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Sync to Supabase
  const handleSyncToSupabase = async () => {
    setSupabaseLoading(true);
    setSupabaseStatus({ type: 'idle', message: '' });

    const currentLogs = loadWorkoutLogs();
    const result = await syncLogsToSupabase(currentLogs, supabaseUser);

    if (result.success) {
      setSupabaseStatus({
        type: 'success',
        message: result.message,
      });
    } else {
      setSupabaseStatus({
        type: 'error',
        message: result.message.includes('relation "workout_logs" does not exist')
          ? 'La tabla "workout_logs" aún no ha sido creada en tu Supabase. Despliega la guía SQL abajo para crearla en 1 clic.'
          : result.message,
      });
    }
    setSupabaseLoading(false);
  };

  // Restore from Supabase
  const handleRestoreFromSupabase = async () => {
    if (
      !window.confirm(
        '¿Deseas descargar los entrenamientos de Supabase y combinarlos con tu historial en este dispositivo?'
      )
    ) {
      return;
    }

    setSupabaseLoading(true);
    setSupabaseStatus({ type: 'idle', message: '' });

    const { logs: cloudLogs, error } = await fetchLogsFromSupabase();

    if (error) {
      setSupabaseStatus({
        type: 'error',
        message: `Error al consultar Supabase: ${error}`,
      });
      setSupabaseLoading(false);
      return;
    }

    if (cloudLogs.length === 0) {
      setSupabaseStatus({
        type: 'error',
        message: 'No se encontraron registros en Supabase para restaurar.',
      });
      setSupabaseLoading(false);
      return;
    }

    // Merge without duplicates based on id
    const existing = loadWorkoutLogs();
    const map = new Map<string, WorkoutLog>();
    existing.forEach((l) => map.set(l.id, l));
    cloudLogs.forEach((l) => map.set(l.id, l));

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    saveWorkoutLogs(merged);
    if (onLogsChanged) onLogsChanged();

    setSupabaseStatus({
      type: 'success',
      message: `¡${cloudLogs.length} entrenamientos descargados de Supabase e integrados exitosamente!`,
    });
    setSupabaseLoading(false);
  };

  // Supabase Auth Email/Password
  const handleSupabaseSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;
    setIsAuthSubmitting(true);
    setSupabaseStatus({ type: 'idle', message: '' });

    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
    });

    if (error) {
      setSupabaseStatus({ type: 'error', message: error.message });
    } else {
      setSupabaseUser(data.user);
      setSupabaseStatus({
        type: 'success',
        message: '¡Cuenta creada e iniciada exitosamente en Supabase!',
      });
      setShowAuthForm(false);
    }
    setIsAuthSubmitting(false);
  };

  const handleSupabaseSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;
    setIsAuthSubmitting(true);
    setSupabaseStatus({ type: 'idle', message: '' });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });

    if (error) {
      setSupabaseStatus({ type: 'error', message: error.message });
    } else {
      setSupabaseUser(data.user);
      setSupabaseStatus({
        type: 'success',
        message: '¡Sesión iniciada correctamente en Supabase!',
      });
      setShowAuthForm(false);
    }
    setIsAuthSubmitting(false);
  };

  const handleSupabaseSignOut = async () => {
    await supabase.auth.signOut();
    setSupabaseUser(null);
    setSupabaseStatus({ type: 'idle', message: '' });
  };

  // Google Sign In handlers
  const handleGoogleSignIn = async () => {
    setIsLoadingGoogleAuth(true);
    setGoogleSyncStatus({ type: 'idle', message: '' });
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con Google';
      if (msg.includes('unauthorized-domain')) {
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
        setGoogleSyncStatus({
          type: 'error',
          message: `Dominio no autorizado (${currentHost}). Te recomendamos usar la pestaña Supabase arriba, que funciona sin bloqueos de dominio.`,
        });
      } else if (msg.includes('popup-closed')) {
        setGoogleSyncStatus({
          type: 'error',
          message: 'La ventana de inicio de sesión fue cerrada.',
        });
      } else {
        setGoogleSyncStatus({
          type: 'error',
          message: msg,
        });
      }
    } finally {
      setIsLoadingGoogleAuth(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setGoogleToken(null);
    setGoogleSyncStatus({ type: 'idle', message: '' });
  };

  const handleCreateOrSyncGoogle = async () => {
    if (!googleToken) {
      setGoogleSyncStatus({ type: 'error', message: 'Debes iniciar sesión con Google primero.' });
      return;
    }

    setConfirmModalOpen(false);
    setIsGoogleSyncing(true);
    setGoogleSyncStatus({ type: 'idle', message: '' });

    try {
      let targetId = spreadsheetId;
      if (!targetId) {
        targetId = await createGoogleSpreadsheet(googleToken);
        setSpreadsheetId(targetId);
      }
      await syncLogsToGoogleSheets(googleToken, targetId, logs);
      setGoogleSyncStatus({
        type: 'success',
        message: `¡Sincronización exitosa! Se consolidaron ${logs.length} entrenamientos en Google Sheets.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al sincronizar';
      setGoogleSyncStatus({
        type: 'error',
        message: msg,
      });
    } finally {
      setIsGoogleSyncing(false);
    }
  };

  // Calculate stats
  let totalSeriesCount = 0;
  logs.forEach((log) => {
    log.exercises.forEach((ex) => {
      totalSeriesCount += ex.sets.length;
    });
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl p-6 relative my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-white tracking-tight">
                Consolidación y Respaldo de Base de Datos
              </h2>
              <p className="text-xs text-slate-400">
                {logs.length} entrenamientos · {totalSeriesCount} series con pesos y repeticiones
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 pt-4 pb-2 border-b border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('supabase')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'supabase'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Supabase Cloud (PostgreSQL)</span>
            <span className="text-[10px] bg-slate-950/40 px-1.5 py-0.5 rounded text-emerald-300 font-normal">
              Nuevo
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('excel')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'excel'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel / CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('sheets')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'sheets'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Google Sheets</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* TAB 1: SUPABASE */}
          {activeSubTab === 'supabase' && (
            <div className="space-y-4">
              {/* Connection Status Card */}
              <div className="bg-slate-950/70 border border-emerald-500/30 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Servidor Supabase Conectado
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    PostgreSQL Activo
                  </span>
                </div>

                <div className="text-xs text-slate-300 font-mono bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 truncate mb-3">
                  {SUPABASE_URL}
                </div>

                {supabaseUser ? (
                  <div className="flex items-center justify-between bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 mb-3">
                    <div className="flex items-center gap-2 text-xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-300 font-medium">
                        Sesión: <strong className="text-white">{supabaseUser.email}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSupabaseSignOut}
                      className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Salir</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                    <span>Modo directo activo (o puedes iniciar sesión con tu correo)</span>
                    <button
                      type="button"
                      onClick={() => setShowAuthForm(!showAuthForm)}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer underline text-[11px]"
                    >
                      {showAuthForm ? 'Ocultar cuenta' : 'Iniciar sesión con cuenta'}
                    </button>
                  </div>
                )}

                {/* Optional Email/Password Form */}
                {showAuthForm && !supabaseUser && (
                  <form onSubmit={handleSupabaseSignIn} className="bg-slate-900 p-3 rounded-xl border border-slate-800 mb-3 space-y-2">
                    <div className="text-[11px] font-bold text-slate-300">
                      Cuenta Supabase (Opcional para asociar a tu usuario):
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="email"
                        placeholder="tu-correo@gmail.com"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        required
                      />
                      <input
                        type="password"
                        placeholder="Contraseña"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSupabaseSignUp}
                        disabled={isAuthSubmitting}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        Crear Cuenta
                      </button>
                      <button
                        type="submit"
                        disabled={isAuthSubmitting}
                        className="px-3.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg cursor-pointer"
                      >
                        {isAuthSubmitting ? 'Verificando...' : 'Iniciar Sesión'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Main Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleSyncToSupabase}
                    disabled={supabaseLoading}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <UploadCloud className={`w-4 h-4 ${supabaseLoading ? 'animate-bounce' : ''}`} />
                    <span>
                      {supabaseLoading
                        ? 'Sincronizando con Supabase...'
                        : `Subir ${logs.length} sesiones a Supabase`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRestoreFromSupabase}
                    disabled={supabaseLoading}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <DownloadCloud className="w-4 h-4 text-emerald-400" />
                    <span>Descargar / Restaurar de la Nube</span>
                  </button>
                </div>

                {/* Feedback status */}
                {supabaseStatus.type !== 'idle' && (
                  <div
                    className={`mt-3 p-3 rounded-xl flex items-start gap-2 text-xs ${
                      supabaseStatus.type === 'success'
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {supabaseStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span className="flex-1 leading-relaxed">{supabaseStatus.message}</span>
                  </div>
                )}
              </div>

              {/* SQL Schema helper in case user hasn't run it yet */}
              <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-bold text-xs">
                      ¿Primera vez? Crear tabla en Supabase
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSqlGuide(!showSqlGuide)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                  >
                    {showSqlGuide ? 'Ocultar código SQL' : 'Ver código SQL para Supabase'}
                  </button>
                </div>

                {showSqlGuide && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[11px] text-slate-400">
                      Entra en tu proyecto de Supabase en <strong>SQL Editor</strong> ➔ <strong>New query</strong>, pega este script y pulsa <strong>Run</strong>:
                    </p>
                    <div className="relative">
                      <pre className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-40">
                        {tableSql}
                      </pre>
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className={`absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer shadow-sm ${
                          copiedSql
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                        }`}
                      >
                        {copiedSql ? (
                          <>
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-emerald-400" />
                            <span>Copiar SQL</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: EXCEL / CSV DIRECT DOWNLOAD */}
          {activeSubTab === 'excel' && (
            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-600/20 text-teal-400 flex items-center justify-center font-bold text-xs">
                    XLS
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Microsoft Excel y CSV (Descarga Directa)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Sin necesidad de login ni conexión en la nube
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  100% Offline
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Descarga un archivo Excel (.xlsx) estructurado con pestañas automáticas de detalle de series y resumen de sesiones para abrir en tu computadora o teléfono.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => exportToExcel(logs)}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-700/20 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportToCSV(logs)}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Descargar CSV Plano</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: GOOGLE SHEETS */}
          {activeSubTab === 'sheets' && (
            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    GS
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Google Sheets (Hojas de Cálculo)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Sincronización directa con tu Google Drive
                    </p>
                  </div>
                </div>
              </div>

              {!googleUser ? (
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                  <p className="text-xs text-slate-300">
                    Conecta tu cuenta de Google para crear y mantener actualizada tu hoja de cálculo.
                  </p>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoadingGoogleAuth}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    <Cloud className="w-4 h-4 text-emerald-600" />
                    <span>{isLoadingGoogleAuth ? 'Conectando con Google...' : 'Conectar con Google'}</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        {googleUser.email?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-white font-medium">{googleUser.email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleGoogleSignOut}
                      className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Desconectar</span>
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                    {spreadsheetId && (
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir en Google Sheets</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => setConfirmModalOpen(true)}
                      disabled={isGoogleSyncing}
                      className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGoogleSyncing ? 'animate-spin' : ''}`} />
                      <span>
                        {isGoogleSyncing
                          ? 'Sincronizando...'
                          : spreadsheetId
                          ? 'Actualizar Base en Sheets'
                          : 'Crear Base en Sheets'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {googleSyncStatus.type !== 'idle' && (
                <div
                  className={`p-3 rounded-xl flex items-start gap-2 text-xs ${
                    googleSyncStatus.type === 'success'
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  {googleSyncStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span className="flex-1 leading-relaxed">{googleSyncStatus.message}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Google Sheets */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">
              ¿Actualizar datos en Google Sheets?
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Esta acción actualizará tu hoja de cálculo con {logs.length} entrenamientos ({totalSeriesCount} series) en las pestañas "Base_Series" y "Resumen_Sesiones".
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateOrSyncGoogle}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl"
              >
                Confirmar y Sincronizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
