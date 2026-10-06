import React, { useState, useEffect } from 'react';
import { Timer, Play, Pause, RotateCcw, X, Plus, Minus, Volume2 } from 'lucide-react';
import { playTimerFinishBeep } from '../utils/audio';

interface RestTimerProps {
  initialSeconds?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const RestTimerFloating: React.FC<RestTimerProps> = ({
  initialSeconds = 90,
  isOpen,
  onClose,
}) => {
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    setTotalSeconds(initialSeconds);
    setRemainingSeconds(initialSeconds);
    setIsActive(true);
  }, [initialSeconds]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && remainingSeconds > 0) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            playTimerFinishBeep();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, remainingSeconds]);

  if (!isOpen) return null;

  const selectPreset = (secs: number) => {
    setTotalSeconds(secs);
    setRemainingSeconds(secs);
    setIsActive(true);
  };

  const adjustSeconds = (delta: number) => {
    setRemainingSeconds((prev) => Math.max(5, prev + delta));
    setTotalSeconds((prev) => Math.max(5, prev + delta));
  };

  const resetTimer = () => {
    setRemainingSeconds(totalSeconds);
    setIsActive(false);
  };

  const progressPercent = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;
  const isFinished = remainingSeconds === 0;

  const formatMinSec = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full shadow-xl border cursor-pointer transition-all ${
            isFinished
              ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 animate-bounce'
              : isActive
              ? 'bg-slate-900/95 text-emerald-400 border-emerald-500/40'
              : 'bg-slate-900 text-slate-200 border-slate-700'
          }`}
        >
          <Timer className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
          <span className="font-mono-nums font-bold text-sm">
            {isFinished ? '¡Tiempo!' : formatMinSec(remainingSeconds)}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-72 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-slate-100 transition-all">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Timer className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Descanso entre series
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 text-slate-400 hover:text-slate-200 text-xs rounded hover:bg-slate-800"
            title="Minimizar"
          >
            _
          </button>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800"
            title="Cerrar temporizador"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timer Display */}
      <div className="text-center py-2 relative">
        <div className={`text-4xl font-black font-mono-nums tracking-tight ${
          isFinished ? 'text-amber-400 animate-pulse' : 'text-white'
        }`}>
          {formatMinSec(remainingSeconds)}
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {isFinished ? '¡Listo para la siguiente serie!' : isActive ? 'Descansando...' : 'En pausa'}
        </p>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isFinished ? 'bg-amber-400' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Preset buttons */}
      <div className="grid grid-cols-4 gap-1.5 my-3">
        {[30, 60, 90, 120].map((secs) => (
          <button
            key={secs}
            onClick={() => selectPreset(secs)}
            className={`py-1 text-xs font-semibold rounded-lg border transition-colors ${
              totalSeconds === secs && !isFinished
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {secs < 60 ? `${secs}s` : `${secs / 60}m`}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => adjustSeconds(-15)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
            title="-15s"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => adjustSeconds(15)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
            title="+15s"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={resetTimer}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Reiniciar"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsActive(!isActive)}
            className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md ${
              isActive
                ? 'bg-slate-800 text-amber-400 border border-amber-500/40'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            {isActive ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Reanudar</span>
              </>
            )}
          </button>

          <button
            onClick={() => playTimerFinishBeep()}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200"
            title="Probar sonido"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
