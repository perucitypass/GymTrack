import React from 'react';
import { ActiveTab } from '../types/gym';
import { Dumbbell, Calendar, BarChart3, Clock, Play, FileSpreadsheet, Smartphone, Database } from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isWorkoutActive: boolean;
  activeWorkoutDuration: string;
  onQuickStart: () => void;
  onOpenDatabaseModal: () => void;
  onOpenShareModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isWorkoutActive,
  activeWorkoutDuration,
  onQuickStart,
  onOpenDatabaseModal,
  onOpenShareModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('rutina')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Dumbbell className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="font-display font-extrabold text-xl tracking-tight text-white block leading-none">
                  GymTrack
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-400">
                  3 Días Split
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Clean navigation links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('rutina')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'rutina'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Dumbbell className="w-4 h-4" />
              <span>Mi Rutina</span>
            </button>

            <button
              onClick={() => setActiveTab('entrenar')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all relative ${
                activeTab === 'entrenar'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>Entrenar</span>
              {isWorkoutActive && (
                <span className="relative flex h-2 w-2 ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('historial')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'historial'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Historial</span>
            </button>

            <button
              onClick={() => setActiveTab('resumenes')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'resumenes'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Resúmenes</span>
            </button>
          </nav>

          {/* Zone 3: Primary action */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onOpenShareModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-all cursor-pointer shadow-sm"
              title="Abrir en celular o ver enlace de la app"
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Móvil / Link</span>
            </button>

            <button
              type="button"
              onClick={onOpenDatabaseModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-all cursor-pointer shadow-sm"
              title="Sincronizar en Supabase Cloud, Google Sheets o descargar Excel"
            >
              <Database className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Nube / Backup</span>
            </button>

            {isWorkoutActive ? (
              <button
                onClick={() => setActiveTab('entrenar')}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-medium hover:bg-emerald-500/30 transition-all cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono-nums font-semibold">{activeWorkoutDuration}</span>
                <span className="hidden sm:inline text-xs text-emerald-300/80">· En curso</span>
              </button>
            ) : (
              <button
                onClick={onQuickStart}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950 stroke-none" />
                <span className="whitespace-nowrap">Empezar Hoy</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (Pattern 1 from Mobile skill) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 pb-safe">
        <div className="grid grid-cols-4 items-center h-16">
          <button
            onClick={() => setActiveTab('rutina')}
            className={`flex flex-col items-center justify-center h-full transition-colors ${
              activeTab === 'rutina' ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Dumbbell className="w-5 h-5" />
            <span className="text-[11px] tracking-tight mt-1">Rutina</span>
          </button>

          <button
            onClick={() => setActiveTab('entrenar')}
            className={`flex flex-col items-center justify-center h-full relative transition-colors ${
              activeTab === 'entrenar' ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Play className="w-5 h-5" />
              {isWorkoutActive && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <span className="text-[11px] tracking-tight mt-1">
              {isWorkoutActive ? 'En vivo' : 'Entrenar'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('historial')}
            className={`flex flex-col items-center justify-center h-full transition-colors ${
              activeTab === 'historial' ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[11px] tracking-tight mt-1">Historial</span>
          </button>

          <button
            onClick={() => setActiveTab('resumenes')}
            className={`flex flex-col items-center justify-center h-full transition-colors ${
              activeTab === 'resumenes' ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[11px] tracking-tight mt-1">Resumen</span>
          </button>
        </div>
      </div>
    </header>
  );
};
