import * as XLSX from 'xlsx';
import { WorkoutLog } from '../types/gym';
import { prepareSeriesRows, prepareSessionsSummaryRows } from './googleWorkspace';

export function exportToExcel(logs: WorkoutLog[]): void {
  const seriesRows = prepareSeriesRows(logs);
  const sessionsRows = prepareSessionsSummaryRows(logs);

  const wb = XLSX.utils.book_new();

  // Sheet 1: Base_Series
  const wsSeries = XLSX.utils.aoa_to_sheet(seriesRows);
  XLSX.utils.book_append_sheet(wb, wsSeries, 'Base_Series');

  // Sheet 2: Resumen_Sesiones
  const wsSessions = XLSX.utils.aoa_to_sheet(sessionsRows);
  XLSX.utils.book_append_sheet(wb, wsSessions, 'Resumen_Sesiones');

  const todayStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `GymTrack_BaseDatos_${todayStr}.xlsx`);
}

export function exportToCSV(logs: WorkoutLog[]): void {
  const seriesRows = prepareSeriesRows(logs);
  const ws = XLSX.utils.aoa_to_sheet(seriesRows);
  const csv = XLSX.utils.sheet_to_csv(ws);

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const todayStr = new Date().toISOString().slice(0, 10);
  a.download = `GymTrack_Series_${todayStr}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
