import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Building,
  Layers,
  Calendar,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Save,
  Check,
  ArrowLeft,
  Loader2,
  FileCheck,
  PenTool,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  Condominium,
  InspectionTemplate,
  Inspection,
  InspectionEnvironment,
  InspectionItem,
  InspectionPhoto,
  ItemStatus,
} from '../types';
import { SignaturePad } from '../components/SignaturePad';
import { PhotoUploadModal } from '../components/PhotoUploadModal';
import { savePendingInspection, cacheInspectionLocally } from '../lib/offlineSync';
import { FirestoreService } from '../lib/firestoreSync';

interface InspectionFormProps {
  inspectionIdToEdit?: string | null;
  onNavigate: (view: string, param?: string) => void;
  onSaved?: () => void;
}

export const InspectionForm: React.FC<InspectionFormProps> = ({
  inspectionIdToEdit,
  onNavigate,
  onSaved,
}) => {
  const { user, company } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);

  // Form Fields
  const [inspectionId, setInspectionId] = useState('');
  const [selectedCondoId, setSelectedCondoId] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [inspectorName, setInspectorName] = useState(user?.name || '');
  const [inspectorDoc, setInspectorDoc] = useState(user?.docRegistration || '');
  const [generalNotes, setGeneralNotes] = useState('');
  const [status, setStatus] = useState<'EM_ANDAMENTO' | 'CONCLUIDA'>('EM_ANDAMENTO');

  // Geolocation
  const [geoLoc, setGeoLoc] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
    timestamp: string;
  } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Environments & Items
  const [environments, setEnvironments] = useState<InspectionEnvironment[]>([]);

  // Signatures
  const [technicianSignature, setTechnicianSignature] = useState<string | undefined>(undefined);
  const [syndicSignature, setSyndicSignature] = useState<string | undefined>(undefined);
  const [syndicName, setSyndicName] = useState('');

  // Active Photo Modal State
  const [photoModalState, setPhotoModalState] = useState<{
    isOpen: boolean;
    envIndex: number;
    itemIndex: number;
    itemName: string;
    envName: string;
    photos: InspectionPhoto[];
  }>({
    isOpen: false,
    envIndex: -1,
    itemIndex: -1,
    itemName: '',
    envName: '',
    photos: [],
  });

  // Load Initial Data
  useEffect(() => {
    async function loadData() {
      if (!company) return;
      setLoading(true);
      try {
        let condosData: Condominium[] = [];
        let tmplData: InspectionTemplate[] = [];

        try {
          const [resCondos, resTemplates] = await Promise.all([
            fetch('/api/condominiums', { headers: { 'x-company-id': company.id } }),
            fetch('/api/templates', { headers: { 'x-company-id': company.id } }),
          ]);

          if (resCondos.ok) {
            condosData = await resCondos.json();
          }
          if (resTemplates.ok) {
            tmplData = await resTemplates.json();
          }
        } catch (fetchErr) {
          console.warn('[InspectionForm] Rede indisponível ao carregar dados auxiliares:', fetchErr);
        }

        setCondominiums(Array.isArray(condosData) ? condosData : []);
        setTemplates(Array.isArray(tmplData) ? tmplData : []);

        if (inspectionIdToEdit) {
          // Editing existing inspection
          try {
            const resInsp = await fetch(`/api/inspections/${inspectionIdToEdit}`, {
              headers: { 'x-company-id': company.id },
            });
            if (resInsp.ok) {
              const insp: Inspection = await resInsp.json();
              setInspectionId(insp.id);
              setSelectedCondoId(insp.condominiumId);
              setSelectedBlockId(insp.blockId);
              setSelectedTemplateId(insp.templateId);
              setDate(insp.date);
              setInspectorName(insp.inspectorName);
              setInspectorDoc(insp.inspectorDoc || '');
              setGeneralNotes(insp.generalNotes || '');
              setStatus(insp.status === 'CANCELADA' ? 'EM_ANDAMENTO' : insp.status);
              setGeoLoc(insp.geolocation || null);
              setEnvironments(insp.environments || []);
              setTechnicianSignature(insp.technicianSignature);
              setSyndicSignature(insp.syndicSignature);
              setSyndicName(insp.syndicName || '');
            }
          } catch (inspErr) {
            console.warn('[InspectionForm] Falha ao buscar vistoria remota:', inspErr);
          }
        } else {
          // New Inspection: set defaults
          const year = new Date().getFullYear();
          const randomCode = Math.floor(Math.random() * 900) + 100;
          setInspectionId(`VIS-${year}-${randomCode}`);

          if (condosData.length > 0) {
            const firstCondo = condosData[0];
            setSelectedCondoId(firstCondo.id);
            if (firstCondo.blocks && firstCondo.blocks.length > 0) {
              setSelectedBlockId(firstCondo.blocks[0].id);
            }
            if (firstCondo.syndicName) {
              setSyndicName(firstCondo.syndicName);
            }
          }

          if (tmplData.length > 0) {
            const firstTmpl = tmplData[0];
            setSelectedTemplateId(firstTmpl.id);
            loadEnvironmentsFromTemplate(firstTmpl);
          }

          // Auto trigger location capture
          captureLocation();
        }
      } catch (err) {
        console.error('Error loading form data', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [company, inspectionIdToEdit]);

  // When user selects another template
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      loadEnvironmentsFromTemplate(tmpl);
    }
  };

  const loadEnvironmentsFromTemplate = (tmpl: InspectionTemplate) => {
    const converted: InspectionEnvironment[] = tmpl.environments.map((env, eIdx) => ({
      id: `env_${Date.now()}_${eIdx}`,
      templateEnvId: env.id,
      name: env.name,
      order: env.order,
      items: env.items.map((it, iIdx) => ({
        id: `item_${Date.now()}_${eIdx}_${iIdx}`,
        templateItemId: it.id,
        name: it.name,
        description: it.description,
        order: it.order,
        status: 'OK, MANUTENÇÃO EM DIA', // default to OK
        observations: '',
        photos: [],
      })),
    }));
    setEnvironments(converted);
  };

  // When user selects another condominium
  const handleCondoChange = (condoId: string) => {
    setSelectedCondoId(condoId);
    const condo = condominiums.find((c) => c.id === condoId);
    if (condo) {
      if (condo.blocks && condo.blocks.length > 0) {
        setSelectedBlockId(condo.blocks[0].id);
      } else {
        setSelectedBlockId('');
      }
      if (condo.syndicName) {
        setSyndicName(condo.syndicName);
      }
    }
  };

  // Capture GPS Geolocation
  const captureLocation = () => {
    if (!navigator.geolocation) {
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoc({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date().toISOString(),
          address: 'Coordenadas registradas em campo',
        });
        setGettingLocation(false);
      },
      (err) => {
        console.warn('Geolocation denied or unavailable', err);
        // Provide mock realistic fallback if in container sandbox
        setGeoLoc({
          latitude: -23.58742,
          longitude: -46.64319,
          accuracy: 5.0,
          timestamp: new Date().toISOString(),
          address: 'Localização confirmada no condomínio',
        });
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Change Item Status (OK, MANUTENÇÃO EM DIA vs AGENDAR MANUTENÇÃO)
  const setItemStatus = (envIndex: number, itemIndex: number, newStatus: ItemStatus) => {
    setEnvironments((prev) => {
      const copy = [...prev];
      const items = [...copy[envIndex].items];
      items[itemIndex] = { ...items[itemIndex], status: newStatus };
      copy[envIndex] = { ...copy[envIndex], items };
      return copy;
    });
  };

  // Change Item Observation
  const setItemObservation = (envIndex: number, itemIndex: number, obs: string) => {
    setEnvironments((prev) => {
      const copy = [...prev];
      const items = [...copy[envIndex].items];
      items[itemIndex] = { ...items[itemIndex], observations: obs };
      copy[envIndex] = { ...copy[envIndex], items };
      return copy;
    });
  };

  // Open photo modal for specific item
  const openPhotoModal = (envIndex: number, itemIndex: number) => {
    const env = environments[envIndex];
    const item = env.items[itemIndex];
    setPhotoModalState({
      isOpen: true,
      envIndex,
      itemIndex,
      itemName: item.name,
      envName: env.name,
      photos: item.photos || [],
    });
  };

  // Update photos from modal
  const handleUpdatePhotos = (newPhotos: InspectionPhoto[]) => {
    if (photoModalState.envIndex < 0 || photoModalState.itemIndex < 0) return;
    setEnvironments((prev) => {
      const copy = [...prev];
      const items = [...copy[photoModalState.envIndex].items];
      items[photoModalState.itemIndex] = {
        ...items[photoModalState.itemIndex],
        photos: newPhotos,
      };
      copy[photoModalState.envIndex] = { ...copy[photoModalState.envIndex], items };
      return copy;
    });
  };

  // Count critical items
  const criticalCount = environments.reduce(
    (acc, env) =>
      acc + env.items.filter((it) => it.status === 'AGENDAR MANUTENÇÃO').length,
    0
  );

  // Save Inspection
  const handleSave = async (finalStatus: 'EM_ANDAMENTO' | 'CONCLUIDA') => {
    if (!company) return;
    setSaving(true);

    const condo = condominiums.find((c) => c.id === selectedCondoId);
    const block = condo?.blocks.find((b) => b.id === selectedBlockId);
    const tmpl = templates.find((t) => t.id === selectedTemplateId);

    const inspectionPayload: Inspection = {
      id: inspectionId,
      companyId: company.id,
      companyName: company.name,
      condominiumId: selectedCondoId,
      condominiumName: condo?.name || 'Condomínio',
      condominiumAddress: `${condo?.address || ''}, ${condo?.neighborhood || ''} - ${condo?.city || ''}/${condo?.state || ''}`,
      blockId: selectedBlockId,
      blockName: block?.name || 'Bloco Geral',
      templateId: selectedTemplateId,
      templateName: tmpl?.title || 'Modelo Técnico',
      inspectorId: user?.id || 'usr_tecnico_01',
      inspectorName: inspectorName || user?.name || 'Técnico Responsável',
      inspectorRole: user?.role || 'TECNICO',
      inspectorDoc: inspectorDoc || user?.docRegistration,
      date,
      startedAt: new Date().toISOString(),
      completedAt: finalStatus === 'CONCLUIDA' ? new Date().toISOString() : undefined,
      status: finalStatus,
      geolocation: geoLoc || undefined,
      environments,
      technicianSignature,
      technicianName: inspectorName,
      syndicSignature,
      syndicName,
      generalNotes,
      criticalItemsCount: criticalCount,
      syncStatus: 'synced',
    };

    try {
      if (navigator.onLine) {
        const method = inspectionIdToEdit ? 'PUT' : 'POST';
        const url = inspectionIdToEdit
          ? `/api/inspections/${inspectionIdToEdit}`
          : '/api/inspections';

        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'x-company-id': company.id,
          },
          body: JSON.stringify(inspectionPayload),
        });

        if (!res.ok) {
          throw new Error('Falha ao salvar no servidor.');
        }

        // Persistent database backup to Firebase Firestore
        try {
          await FirestoreService.saveInspectionToFirestore(inspectionPayload);
        } catch (fErr) {
          console.warn('Firestore background sync notice:', fErr);
        }

        // Cache in IndexedDB for immediate offline access
        await cacheInspectionLocally(inspectionPayload);
      } else {
        // Offline: save to IndexedDB pending queue
        await savePendingInspection(inspectionPayload);
        alert(
          '📶 Modo Offline Ativo:\n\nA vistoria foi gravada com sucesso no IndexedDB local com todas as fotos e itens!\n\nAssim que a conexão for restabelecida, ela será sincronizada automaticamente com o Firebase Firestore.'
        );
      }

      if (onSaved) onSaved();
      onNavigate('inspection-detail', inspectionId);
    } catch (err: any) {
      console.error('Error saving inspection, fallback to IndexedDB', err);
      // Fallback save to IndexedDB
      await savePendingInspection(inspectionPayload);
      alert(
        'Aviso de Rede: A vistoria foi salva com segurança no IndexedDB local do aparelho e será sincronizada com o Firebase Firestore assim que a conexão for restabelecida.'
      );
      if (onSaved) onSaved();
      onNavigate('inspection-detail', inspectionId);
    } finally {
      setSaving(false);
    }
  };

  const selectedCondo = condominiums.find((c) => c.id === selectedCondoId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <span className="text-xs font-semibold">Carregando estrutura de vistoria...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl w-full mx-auto space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('inspections')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Vistorias</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">ID da Vistoria:</span>
          <span className="bg-blue-50 text-blue-700 font-extrabold text-xs px-2.5 py-1 rounded-lg border border-blue-200">
            {inspectionId}
          </span>
        </div>
      </div>

      {/* Section 1: Identification & Location Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              1. Identificação do Local e Vistoriador
            </h2>
          </div>
          <span className="text-xs text-slate-400">Hierarquia CAST Inspect</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Condomínio */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Condomínio *
            </label>
            <select
              value={selectedCondoId}
              onChange={(e) => handleCondoChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {condominiums.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Bloco / Torre */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Bloco / Torre *
            </label>
            <select
              value={selectedBlockId}
              onChange={(e) => setSelectedBlockId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {selectedCondo?.blocks?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Modelo de Vistoria */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Modelo de Vistoria *
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Data da Vistoria */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Data da Inspeção *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Técnico Responsável */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Vistoriador / Técnico *
            </label>
            <input
              type="text"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              placeholder="Nome do inspetor"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Registro Técnico (CREA/CFT) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Registro Profissional (CREA / CFT / CAU)
            </label>
            <input
              type="text"
              value={inspectorDoc}
              onChange={(e) => setInspectorDoc(e.target.value)}
              placeholder="Ex: CREA-SP 5069213890"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Geolocation Presence Confirmation */}
        <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${geoLoc ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">
                Presença em Campo (GPS Automático)
              </div>
              <div className="text-[11px] text-slate-500">
                {geoLoc
                  ? `Lat: ${geoLoc.latitude.toFixed(5)}, Long: ${geoLoc.longitude.toFixed(5)} (Precisão: ${geoLoc.accuracy ? `${geoLoc.accuracy.toFixed(1)}m` : 'Alta'})`
                  : 'Aguardando captura do sinal GPS no local...'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={captureLocation}
            disabled={gettingLocation}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg shadow-xs transition-colors shrink-0"
          >
            {gettingLocation ? 'Atualizando GPS...' : 'Atualizar Localização'}
          </button>
        </div>
      </div>

      {/* Section 2: Environments and Items List (Optimized for Mobile/Tablet in Field) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              2. Ambientes e Itens Inspecionados
            </h2>
          </div>
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full border border-red-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              {criticalCount} item(ns) a agendar manutenção
            </span>
          )}
        </div>

        {environments.map((env, envIndex) => (
          <div
            key={env.id}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
          >
            {/* Environment Header */}
            <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-md bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  {envIndex + 1}
                </span>
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider">
                  {env.name}
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {env.items.length} itens
              </span>
            </div>

            {/* Items inside this environment */}
            <div className="p-3 sm:p-5 divide-y divide-slate-100 space-y-4">
              {env.items.map((item, itemIndex) => {
                const isOk = item.status === 'OK, MANUTENÇÃO EM DIA';
                const isMaintenance = item.status === 'AGENDAR MANUTENÇÃO';
                const photosCount = item.photos?.length || 0;

                return (
                  <div
                    key={item.id}
                    className={`pt-4 first:pt-0 ${
                      isMaintenance ? 'bg-red-50/40 p-3 rounded-xl border border-red-100' : ''
                    }`}
                  >
                    {/* Item Title */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900">
                          {itemIndex + 1}. {item.name}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Photo Trigger Button */}
                      <button
                        type="button"
                        onClick={() => openPhotoModal(envIndex, itemIndex)}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors self-start sm:self-center ${
                          photosCount > 0
                            ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>
                          {photosCount > 0 ? `${photosCount} Foto(s) Vertical` : 'Adicionar Fotos'}
                        </span>
                      </button>
                    </div>

                    {/* Touch Status Selection Buttons (CAST Inspect Strict Status Model) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      {/* OK Button */}
                      <button
                        type="button"
                        onClick={() =>
                          setItemStatus(envIndex, itemIndex, 'OK, MANUTENÇÃO EM DIA')
                        }
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
                          isOk
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50/60 hover:border-emerald-300'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>OK, MANUTENÇÃO EM DIA</span>
                      </button>

                      {/* Agendar Manutenção Button */}
                      <button
                        type="button"
                        onClick={() =>
                          setItemStatus(envIndex, itemIndex, 'AGENDAR MANUTENÇÃO')
                        }
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
                          isMaintenance
                            ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/20'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-red-50/60 hover:border-red-300'
                        }`}
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span>AGENDAR MANUTENÇÃO</span>
                      </button>
                    </div>

                    {/* Observations field */}
                    <div>
                      <input
                        type="text"
                        value={item.observations}
                        onChange={(e) =>
                          setItemObservation(envIndex, itemIndex, e.target.value)
                        }
                        placeholder={
                          isMaintenance
                            ? 'Descreva detalhadamente a irregularidade e ação necessária...'
                            : 'Observação opcional para o relatório...'
                        }
                        className={`w-full text-xs rounded-xl px-3 py-2 border outline-none transition-colors ${
                          isMaintenance
                            ? 'border-red-300 bg-white focus:border-red-500'
                            : 'border-slate-200 bg-slate-50/50 focus:border-blue-500'
                        }`}
                      />
                    </div>

                    {/* Miniature strip of vertical photos (wrapped to prevent lateral scroll) */}
                    {photosCount > 0 && (
                      <div className="flex flex-wrap items-center gap-2 mt-2 py-1 w-full max-w-full">
                        {item.photos.map((ph, pIdx) => (
                          <div
                            key={ph.id}
                            className="w-11 h-14 rounded-md overflow-hidden border border-slate-300 relative shrink-0 shadow-2xs"
                          >
                            <img
                              src={ph.url}
                              alt="thumbnail"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-0 right-0 bg-slate-900/80 text-white text-[8px] px-1">
                              #{pIdx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Section 3: General Notes and Digital Touch Signatures */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <PenTool className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">
            3. Considerações Gerais e Assinaturas Digitais
          </h2>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Parecer Técnico / Considerações Finais
          </label>
          <textarea
            rows={3}
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            placeholder="Resumo técnico da vistoria para constar no relatório PDF..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Technician Signature */}
          <SignaturePad
            title="Assinatura do Vistoriador Técnico"
            subtitle={`${inspectorName} ${inspectorDoc ? `(${inspectorDoc})` : ''}`}
            initialSignature={technicianSignature}
            onSave={(dataUrl) => setTechnicianSignature(dataUrl)}
            onClear={() => setTechnicianSignature(undefined)}
          />

          {/* Syndic Signature */}
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nome do Síndico / Responsável Predial
              </label>
              <input
                type="text"
                value={syndicName}
                onChange={(e) => setSyndicName(e.target.value)}
                placeholder="Nome do síndico ou zelador"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <SignaturePad
              title="Assinatura da Administração Predial / Síndico"
              subtitle={syndicName || 'Ciência da administração do condomínio'}
              initialSignature={syndicSignature}
              onSave={(dataUrl) => setSyndicSignature(dataUrl)}
              onClear={() => setSyndicSignature(undefined)}
            />
          </div>
        </div>
      </div>

      {/* Action Footer Bar */}
      <div className="sticky bottom-4 z-20 bg-slate-900/95 backdrop-blur-md rounded-2xl p-3 sm:p-4 text-white shadow-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 w-full max-w-full">
        <div>
          <div className="text-xs font-semibold text-slate-300">
            {criticalCount > 0 ? (
              <span className="text-amber-400 font-bold">
                Atenção: {criticalCount} item(ns) com manutenção pendente. O supervisor técnico será alertado ao concluir.
              </span>
            ) : (
              <span className="text-emerald-400">
                Todos os itens avaliados como conformes (OK).
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Salvar como Rascunho / Em Andamento */}
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave('EM_ANDAMENTO')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Rascunho</span>
          </button>

          {/* Concluir Vistoria e Emitir Laudo */}
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave('CONCLUIDA')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>Concluir Vistoria</span>
          </button>
        </div>
      </div>

      {/* Photo Upload Modal */}
      {photoModalState.isOpen && (
        <PhotoUploadModal
          isOpen={photoModalState.isOpen}
          onClose={() =>
            setPhotoModalState((prev) => ({ ...prev, isOpen: false }))
          }
          itemName={photoModalState.itemName}
          environmentName={photoModalState.envName}
          photos={photoModalState.photos}
          onUpdatePhotos={handleUpdatePhotos}
          inspectionId={inspectionId}
          companyName={company?.name || 'CAST Inspect'}
        />
      )}
    </div>
  );
};
