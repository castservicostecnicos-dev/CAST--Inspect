import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DashboardStats, Inspection } from '../types';
import { PdfViewerModal } from '../components/PdfViewerModal';

interface DashboardProps {
  onNavigate: (view: string, param?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { company, user, canExecuteInspection, isDev } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedInspectionForPdf, setSelectedInspectionForPdf] = useState<Inspection | null>(null);

  const fetchStats = async () => {
    if (!company) return;
    try {
      const res = await fetch('/api/stats', {
        headers: {
          'x-company-id': company.id,
          'x-user-role': user?.role || '',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [company]);

  return (
    <div className="space-y-6 pb-12 w-full max-w-full">
      {/* Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {company?.tradeName || company?.name || 'CAST Inspect'}
          </p>
        </div>

        {canExecuteInspection && (
          <button
            onClick={() => onNavigate('new-inspection')}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 shrink-0 self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nova Vistoria</span>
          </button>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className={`grid gap-3 sm:gap-4 ${isDev ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
        {/* Total Inspections */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {stats?.totalInspections || 0}
            </span>
            <p className="text-xs text-slate-400 mt-0.5">Vistorias registradas</p>
          </div>
        </div>

        {/* Concluídas */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
              Concluídas
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {stats?.completedInspections || 0}
            </span>
            <p className="text-xs text-slate-400 mt-0.5">Laudos prontos</p>
          </div>
        </div>

        {/* Em Andamento */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
              Em Andamento
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {stats?.inProgressInspections || 0}
            </span>
            <p className="text-xs text-slate-400 mt-0.5">Em vistoria</p>
          </div>
        </div>

        {/* Critical Maintenance Counter (Company alert - NOT for DEV) */}
        {!isDev && (
          <div className="bg-white border border-red-200 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">
                Manutenção
              </span>
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-bold text-red-700">
                {stats?.criticalMaintenanceCount || 0}
              </span>
              <p className="text-xs text-red-500 mt-0.5">Itens com pendência</p>
            </div>
          </div>
        )}
      </div>

      {/* Two Column Layout: Recent Inspections & Urgent Maintenance Items */}
      <div className={`grid grid-cols-1 ${!isDev ? 'lg:grid-cols-12' : ''} gap-6`}>
        {/* Left Col: Recent Inspections */}
        <div className={`${!isDev ? 'lg:col-span-7' : 'w-full'} bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden`}>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Vistorias Recentes
            </h2>
            <button
              onClick={() => onNavigate('inspections')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {!stats?.recentInspections || stats.recentInspections.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Nenhuma vistoria encontrada.
              </div>
            ) : (
              stats.recentInspections.map((insp) => (
                <div
                  key={insp.id}
                  className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {insp.condominiumName}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          insp.status === 'CONCLUIDA'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {insp.status === 'CONCLUIDA' ? 'Concluída' : 'Em Andamento'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {insp.blockName} &bull; {insp.inspectorName} &bull; {insp.date}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onNavigate('inspection-detail', insp.id)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Detalhes</span>
                    </button>
                    <button
                      onClick={() => setSelectedInspectionForPdf(insp)}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors flex items-center gap-1"
                      title="Relatório PDF"
                    >
                      <FileText className="w-3 h-3" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Attention Items ("AGENDAR MANUTENÇÃO") - Only for company users, not DEV */}
        {!isDev && (
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                Agendar Manutenção
              </h2>
              <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                {stats?.criticalItems?.length || 0}
              </span>
            </div>

            <div className="p-4 overflow-y-auto max-h-[420px] space-y-2.5">
              {!stats?.criticalItems || stats.criticalItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Nenhuma pendência de manutenção no momento.
                </div>
              ) : (
                stats.criticalItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-red-200 bg-red-50/40 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">{item.itemName}</span>
                      <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.2 rounded shrink-0">
                        Pendente
                      </span>
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      {item.condominiumName} &bull; {item.blockName} ({item.environmentName})
                    </div>
                    {item.observations && (
                      <div className="text-slate-600 bg-white/80 p-1.5 rounded border border-red-100 text-[11px] italic">
                        "{item.observations}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* PDF Viewer Modal */}
      {selectedInspectionForPdf && (
        <PdfViewerModal
          isOpen={!!selectedInspectionForPdf}
          onClose={() => setSelectedInspectionForPdf(null)}
          inspection={selectedInspectionForPdf}
        />
      )}
    </div>
  );
};
