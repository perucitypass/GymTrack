/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { RoutineDay, WorkoutLog, ActiveTab } from './types/gym';
import { loadRoutine, loadWorkoutLogs, loadActiveWorkout } from './utils/storage';
import { formatStopwatch } from './utils/dateAndStats';
import { Navbar } from './components/Navbar';
import { ActiveWorkout } from './components/ActiveWorkout';
import { WorkoutHistory } from './components/WorkoutHistory';
import { AnalyticsSummaries } from './components/AnalyticsSummaries';
import { RoutineManager } from './components/RoutineManager';
import { ManualWorkoutModal } from './components/ManualWorkoutModal';
import { DatabaseSyncModal } from './components/DatabaseSyncModal';
import { ShareModal } from './components/ShareModal';
import { Dumbbell, Sparkles } from 'lucide-react';

export default function App() {
  const [routineDays, setRoutineDays] = useState<RoutineDay[]>(() => {
    const loaded = loadRoutine();
    return loaded && loaded.length > 0 ? loaded : [];
  });
  const [logs, setLogs] = useState<WorkoutLog[]>(() => loadWorkoutLogs());
  const [activeTab, setActiveTab] = useState<ActiveTab>('rutina');
  const [isWorkoutActive, setIsWorkoutActive] = useState<boolean>(false);
  const [activeWorkoutDuration, setActiveWorkoutDuration] = useState<string>('00:00:00');
  const [manualModalOpen, setManualModalOpen] = useState<boolean>(false);
  const [databaseModalOpen, setDatabaseModalOpen] = useState<boolean>(false);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);

  // Initialize data on mount
  useEffect(() => {
    const loadedRoutine = loadRoutine();
    if (loadedRoutine && loadedRoutine.length > 0) {
      setRoutineDays(loadedRoutine);
    }

    setLogs(loadWorkoutLogs());

    // Check if workout active
    const active = loadActiveWorkout();
    if (active && active.exercises && active.exercises.length > 0) {
      setIsWorkoutActive(true);
      setActiveWorkoutDuration(formatStopwatch(active.elapsedSeconds));
    }
  }, []);

  // Poll active workout duration if active
  useEffect(() => {
    const interval = setInterval(() => {
      const active = loadActiveWorkout();
      if (active && active.exercises && active.exercises.length > 0) {
        setIsWorkoutActive(true);
        setActiveWorkoutDuration(formatStopwatch(active.elapsedSeconds));
      } else {
        setIsWorkoutActive(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const [targetDayId, setTargetDayId] = useState<string>('dia-1');

  const refreshLogs = () => {
    const current = loadWorkoutLogs();
    setLogs([...current]);
  };

  const handleStartSpecificDay = (dayId: string) => {
    setTargetDayId(dayId);
    setActiveTab('entrenar');
  };

  const handleQuickStart = () => {
    setActiveTab('entrenar');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Bar Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isWorkoutActive={isWorkoutActive}
        activeWorkoutDuration={activeWorkoutDuration}
        onQuickStart={handleQuickStart}
        onOpenDatabaseModal={() => setDatabaseModalOpen(true)}
        onOpenShareModal={() => setShareModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {activeTab === 'rutina' && (
          <RoutineManager
            routineDays={routineDays}
            onRoutineUpdated={(newRoutine) => setRoutineDays(newRoutine)}
            setActiveTab={setActiveTab}
            onStartSpecificDay={handleStartSpecificDay}
          />
        )}

        {activeTab === 'entrenar' && (
          <ActiveWorkout
            key={targetDayId}
            routineDays={routineDays}
            onWorkoutSaved={refreshLogs}
            setActiveTab={setActiveTab}
            initialDayId={targetDayId}
          />
        )}

        {activeTab === 'historial' && (
          <WorkoutHistory
            logs={logs}
            onLogsChanged={refreshLogs}
            setActiveTab={setActiveTab}
            onOpenManualModal={() => setManualModalOpen(true)}
            onOpenDatabaseModal={() => setDatabaseModalOpen(true)}
          />
        )}

        {activeTab === 'resumenes' && (
          <AnalyticsSummaries
            logs={logs}
            setActiveTab={setActiveTab}
            onOpenDatabaseModal={() => setDatabaseModalOpen(true)}
          />
        )}
      </main>

      {/* Manual Workout Registration Modal */}
      <ManualWorkoutModal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        routineDays={routineDays}
        onWorkoutAdded={refreshLogs}
      />

      {/* Google Sheets and Excel Database Consolidation Modal */}
      <DatabaseSyncModal
        isOpen={databaseModalOpen}
        onClose={() => setDatabaseModalOpen(false)}
        logs={logs}
      />

      {/* Share & Mobile Access Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />
    </div>
  );
}
