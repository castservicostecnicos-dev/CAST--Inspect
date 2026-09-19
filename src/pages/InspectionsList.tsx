import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Search,
  Filter,
  FileText,
  Eye,
  Edit,
  Trash2,
  Share2,
  PlusCircle,
  Building,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Calendar,
  Loader2,
  WifiOff,
  CloudCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Inspection, Condominium } from '../types';
import { PdfViewerModal } from '../components/PdfViewerModal';
import { ShareModal } from '../components/ShareModal';
import {
  cacheInspectionsIDB,
  getCachedInspectionsIDB,
  getPendingInspectionsIDB,
} from '../lib/indexedDb';

interface InspectionsListProps {
  onNavigate: (view: string, param?: string) => void;
}

export const InspectionsList: React.FC<InspectionsListProps> = ({ onNavigate }) => {
  const { company, canExecuteInspection, canManageUsers } = useAuth();

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [condos, setCondos] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondo, setFilterCondo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Modals
  const [pdfInspection, setPdfInspection] = useState<Inspection | null>(null);
  const [shareInspection, setShareInspection] = useState<Inspection | null>(null);

  const fetchInspections = async () => {
    if (!company) return;
    setLoading(true);
    try {
      let list: Inspection[] = [];

      if (navigator.onLine) {
        try {
          const [resInsp, resCondos] = await Promise.all([
            fetch('/api/inspections', { headers: { 'x-company-id': company.id } }),
            fetch('/api/condominiums', { headers: { 'x-company-id': company.id } }),
          ]);

          if (resInsp.ok) {
            const data: Inspection[] = await resInsp.json();
            list = data;
            // Cache inspections in IndexedDB for offline access
            await cacheInspectionsIDB(data);
          }
          if (resCondos.ok) {
            const condosData = await resCondos.json();
            setCondos(condosData);
          }
        } catch (netErr) {
          console.warn('Falha de rede em InspectionsList, recorrendo ao IndexedDB:', netErr);
        }
      }

      // If offline or fetch failed, load from IndexedDB cache
      if (list.length === 0) {
        list = await getCachedInspectionsIDB(company.id);
      }

      // Retrieve any pending offline inspections from IndexedDB
      const pending = await getPendingInspectionsIDB();
      const companyPending = pending.filter((p) => p.companyId === company.id);

      // Merge and ensure pending items are visible
      const combinedMap = new Map<string, Inspection>();
      for (const item of list) {
        combinedMap.set(item.id, item);
      }
      for (const p of companyPending) {
        combinedMap.set(p.id, p);
      }

      setInspections(Array.from(combinedMap.values()));
    } catch (e) {
      console.error('Error loading inspections', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, [company]);

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Deseja realmente excluir a vistoria ${id}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/inspections/${id}`, {
        method: 'DELETE',
        headers: { 'x-company-id': company?.id || '' },
      });
      if (res.ok) {
        setInspections((prev) => prev.filter((i) => i.id !== id));
      }
    } catch (e) {
      alert('Erro ao excluir vistoria.');
    }
  };

  // Filter logic
  const filtered = inspections.filter((insp) => {
    const matchesSearch =
      searchTerm === '' ||
      insp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insp.condominiumName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insp.blockName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insp.inspectorName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCondo = filterCondo === '' || insp.condominiumId === filterCondo;
    const matchesStatus = filterStatus === '' || insp.status === filterStatus;
    const matchesDate = filterDate === '' || insp.date === filterDate;

    return matchesSearch && matchesCondo && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-6 pb-16 w-full max-w-full">
      {/* Header and CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">
            Vistorias Realizadas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Histórico completo de inspeções, relatórios técnicos e laudos periciais da empresa.
          </p>
        </div>

        {canExecuteInspection && (
          <button
            onClick={() => onNavigate('new-inspection')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-95 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nova Vistoria</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ID, condomínio, bloco..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Filter by Condominium */}
          <div>
            <select
              value={filterCondo}
              onChange={(e) => setFilterCondo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Todos os Condomínios</option>
              {condos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Status */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Todos os Status</option>
              <option value="CONCLUIDA">Concluídas</option>
              <option value="EM_ANDAMENTO">Em Andamento</option>
            </select>
          </div>

          {/* Filter by Date */}
          <div>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {(searchTerm || filterCondo || filterStatus || filterDate) && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>Filtros ativos ({filtered.length} resultados)</span>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterCondo('');
                setFilterStatus('');
                setFilterDate('');
              }}
              className="text-blue-600 hover:underline font-semibold"
            >
              Limpar Filtros
            </button>
          </div>
        )}
      </div>

      {/* Inspections Grid / Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <span className="text-xs font-semibold">Carregando vistorias...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <ClipboardList className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-bold text-slate-700">Nenhuma vistoria encontrada</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Não foram encontradas vistorias para os filtros selecionados nesta empresa.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((insp) => {
            const isCompleted = insp.status === 'CONCLUIDA';
            const critical = insp.criticalItemsCount || 0;

            // Total photos in this inspection
            let totalPhotos = 0;
            insp.environments?.forEach((e) => {
              e.items?.forEach((i) => {
                totalPhotos += i.photos?.length || 0;
              });
            });

            return (
              <div
                key={insp.id}
                className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                        {insp.id}
                      </span>
                      {insp.syncStatus === 'pending_sync' && (
                        <span
                          className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-xs"
                          title="Vistoria salva no IndexedDB, aguardando sincronização com o Firestore"
                        >
                          <WifiOff className="w-2.5 h-2.5 text-amber-600" />
                          <span>Offline</span>
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isCompleted ? 'Concluída' : 'Em Andamento'}
                    </span>
                  </div>

                  {/* Condominium and Block */}
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {insp.condominiumName}
                  </h3>
                  <div className="text-xs font-medium text-slate-600 mt-0.5">
                    {insp.blockName}
                  </div>

                  {/* Details List */}
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-1.5 text-slate-500">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Data:</span>
                      </span>
                      <span className="font-semibold text-slate-700">{insp.date}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>Vistoriador:</span>
                      </span>
                      <span className="font-semibold text-slate-700 truncate max-w-[130px]">
                        {insp.inspectorName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Registros Fotográficos:</span>
                      <span className="font-semibold text-slate-700">{totalPhotos} fotos verticais</span>
                    </div>
                  </div>

                  {/* Status Summary Banner */}
                  <div className="mt-3 p-2 rounded-xl bg-slate-50 flex items-center justify-between text-xs">
                    {critical > 0 ? (
                      <span className="flex items-center gap-1 text-red-700 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        {critical} Manutenções a Agendar
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Conforme / Manutenção em Dia
                      </span>
                    )}

                    {insp.geolocation && (
                      <span
                        className="text-[10px] text-blue-700 font-semibold bg-blue-100/70 px-1.5 py-0.5 rounded flex items-center gap-0.5"
                        title="GPS confirmado no local"
                      >
                        <MapPin className="w-3 h-3" /> GPS
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onNavigate('inspection-detail', insp.id)}
                      className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      title="Abrir Detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {canExecuteInspection && (
                      <button
                        onClick={() => onNavigate('edit-inspection', insp.id)}
                        className="p-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar Itens"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => setShareInspection(insp)}
                      className="p-2 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      title="Compartilhar"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    {canManageUsers && (
                      <button
                        onClick={() => handleDelete(insp.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Excluir Vistoria"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Primary PDF Report Button */}
                  <button
                    onClick={() => setPdfInspection(insp)}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-lg shadow-sm transition-colors shrink-0"
                    title="Visualizar e Baixar Relatório PDF (5 fotos verticais por linha)"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PDF Viewer Modal */}
      {pdfInspection && (
        <PdfViewerModal
          isOpen={!!pdfInspection}
          onClose={() => setPdfInspection(null)}
          inspection={pdfInspection}
        />
      )}

      {/* Share Modal */}
      {shareInspection && (
        <ShareModal
          isOpen={!!shareInspection}
          onClose={() => setShareInspection(null)}
          inspection={shareInspection}
        />
      )}
    </div>
  );
};
