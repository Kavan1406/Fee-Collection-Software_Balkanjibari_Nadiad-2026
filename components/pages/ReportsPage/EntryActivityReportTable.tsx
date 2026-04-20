'use client';

import React from 'react';
import { Download, Loader2, FileText } from 'lucide-react';
import { EntryActivityReportData } from '@/lib/api/reports';

interface EntryActivityReportTableProps {
  data: EntryActivityReportData[];
  loading: boolean;
  startDate?: string;
  endDate?: string;
  onExportCSV: () => Promise<void>;
  onExportPDF: () => Promise<void>;
}

export const EntryActivityReportTable: React.FC<EntryActivityReportTableProps> = ({
  data,
  loading,
  startDate,
  endDate,
  onExportCSV,
  onExportPDF,
}) => {
  const [exporting, setExporting] = React.useState(false);

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(true);
    try {
      if (format === 'csv') {
        await onExportCSV();
      } else {
        await onExportPDF();
      }
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-600 mr-3" size={24} />
        <p className="text-slate-600 font-medium">Loading entry activity report...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Export Buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => handleExport('csv')}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 font-medium text-sm"
        >
          <Download size={16} />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
        <button
          onClick={() => handleExport('pdf')}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 font-medium text-sm"
        >
          <FileText size={16} />
          {exporting ? 'Exporting...' : 'Export PDF'}
        </button>
      </div>

      {/* Table */}
      {data.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No entry activity records found</p>
          {startDate && endDate && (
            <p className="text-sm text-slate-500 mt-1">
              for period {startDate} to {endDate}
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Entry Date & Time
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Student Name
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Student ID
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Entry Type
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Recorded By
                </th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((entry) => (
                <tr key={entry.entry_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-slate-900">{entry.entry_date}</div>
                    <div className="text-xs text-slate-500">{entry.entry_time}</div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-slate-900">{entry.student_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900 font-mono">{entry.student_id}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-700">{entry.subject_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-blue-50 text-blue-700">
                      {entry.entry_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-700">{entry.recorded_by}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600">{entry.notes || '-'}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {data.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-blue-900">
            Total Entries: <span className="text-lg text-blue-700">{data.length}</span>
          </p>
          {startDate && endDate && (
            <p className="text-xs text-blue-700 mt-2">
              Period: {startDate} to {endDate}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
