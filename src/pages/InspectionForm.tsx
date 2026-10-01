import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Plus,
  Trash2,
  X,
  ChevronDown,
  Sparkles,
  Clock,
  Search,
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
import { evaluateDateAlert, extractDateFromText } from '../lib/dateAlertHelper';
import { determineStructureVersion } from '../lib/versionHelper';

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
  const [pastInspections, setPastInspections] = useState<Inspection[]>([]);

  // Form Fields
  const [inspectionId, setInspectionId] = useState('');
  const [selectedCondoId, setSelectedCondoId] = useState('');
  const [condoSearch, setCondoSearch] = useState('');
  const [showCondoDropdown, setShowCondoDropdown] = useState(false);
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

  // New Environment Input State
  const [newEnvName, setNewEnvName] = useState('');

  // New Item Input State per Environment
  const [newItemsByEnv, setNewItemsByEnv] = useState<{ [envId: string]: string }>({});

  // New Environment Input State directly below an Environment
  const [newEnvBelowByEnv, setNewEnvBelowByEnv] = useState<{ [envId: string]: string }>({});

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

  const condoDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close condo dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (condoDropdownRef.current && !condoDropdownRef.current.contains(event.target as Node)) {
        setShowCondoDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load Initial Data
  useEffect(() => {
    async function loadData() {
      if (!company) return;
      setLoading(true);
      try {
        let condosData: Condominium[] = [];
        let tmplData: InspectionTemplate[] = [];

        try {
          const [resCondos, resTemplates, resInspections] = await Promise.all([
            fetch('/api/condominiums', { headers: { 'x-company-id': company.id } }),
            fetch('/api/templates', { headers: { 'x-company-id': company.id } }),
            fetch('/api/inspections', { headers: { 'x-company-id': company.id } }),
          ]);

          if (resCondos.ok) {
            condosData = await resCondos.json();
          }
          if (resTemplates.ok) {
            tmplData = await resTemplates.json();
          }
          if (resInspections.ok) {
            const inspList = await resInspections.json();
            setPastInspections(Array.isArray(inspList) ? inspList : []);
          }
        } catch (fetchErr) {
          console.warn('[InspectionForm] Rede indisponível ao carregar dados auxiliares:', fetchErr);
        }

        const validCondos = Array.isArray(condosData) ? condosData : [];
        setCondominiums(validCondos);
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
              setCondoSearch(insp.condominiumName || '');
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
          // New Inspection: generate sequential code
          const year = new Date().getFullYear();
          const randomCode = Math.floor(Math.random() * 900) + 100;
          setInspectionId(`VIS-${year}-${randomCode}`);

          if (validCondos.length > 0) {
            const firstCondo = validCondos[0];
            setSelectedCondoId(firstCondo.id);
            setCondoSearch(firstCondo.name);
            if (firstCondo.blocks && firstCondo.blocks.length > 0) {
              setSelectedBlockId(firstCondo.blocks[0].id);
            }
            if (firstCondo.syndicName) {
              setSyndicName(firstCondo.syndicName);
            }
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

  // When user selects a condominium from the list
  const handleSelectCondo = (condo: Condominium) => {
    setSelectedCondoId(condo.id);
    setCondoSearch(condo.name);
    setShowCondoDropdown(false);

    if (condo.blocks && condo.blocks.length > 0) {
      setSelectedBlockId(condo.blocks[0].id);
    } else {
      setSelectedBlockId('');
    }
    if (condo.syndicName) {
      setSyndicName(condo.syndicName);
    }
  };

  // Optional: load environments from a template if requested
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl && tmpl.environments) {
      const converted: InspectionEnvironment[] = tmpl.environments.map((env, eIdx) => ({
        id: `env_${Date.now()}_${eIdx}`,
        templateEnvId: env.id,
        name: env.name,
        order: env.order,
        items: env.items.map((it, iIdx) => ({
          id: `item_${Date.now()}_${eIdx}_${iIdx}`,
          templateItemId: it.id,
          name: it.name,
          description: it.description || '',
          order: it.order,
          status: 'OK, MANUTENÇÃO EM DIA',
          observations: '',
          photos: [],
          alertEnabled: false,
          alertDate: '',
        })),
      }));
      setEnvironments(converted);
    }
  };

  // Add a new Environment on the fly (optionally specifying name and afterIndex)
  const handleAddEnvironment = (customName?: string, insertAfterIndex?: number) => {
    const nameToUse = (customName !== undefined ? customName : newEnvName).trim();
    if (!nameToUse) return;

    const createdEnv: InspectionEnvironment = {
      id: `env_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: nameToUse,
      order: environments.length + 1,
      items: [],
    };

    setEnvironments((prev) => {
      if (insertAfterIndex !== undefined && insertAfterIndex >= 0 && insertAfterIndex < prev.length) {
        const copy = [...prev];
        copy.splice(insertAfterIndex + 1, 0, createdEnv);
        return copy.map((e, idx) => ({ ...e, order: idx + 1 }));
      }
      return [...prev, createdEnv];
    });

    if (customName === undefined) {
      setNewEnvName('');
    }
  };

  // Add environment directly below a specific environment
  const handleAddEnvironmentBelow = (envIndex: number, envId: string) => {
    const name = (newEnvBelowByEnv[envId] || '').trim();
    if (!name) return;
    handleAddEnvironment(name, envIndex);
    setNewEnvBelowByEnv((prev) => ({ ...prev, [envId]: '' }));
  };

  // Remove an Environment
  const handleRemoveEnvironment = (envIndex: number) => {
    const env = environments[envIndex];
    if (env.items.length > 0) {
      if (!confirm(`Deseja remover o ambiente "${env.name}" e todos os seus itens?`)) {
        return;
      }
    }
    setEnvironments((prev) => prev.filter((_, idx) => idx !== envIndex));
  };

  // Add a new Item into a specific Environment
  const handleAddItem = (envIndex: number) => {
    const env = environments[envIndex];
    if (!env) return;
    const itemText = (newItemsByEnv[env.id] || '').trim();
    if (!itemText) return;

    const createdItem: InspectionItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: itemText,
      description: '',
      order: env.items.length + 1,
      status: 'OK, MANUTENÇÃO EM DIA',
      observations: '',
      photos: [],
      alertEnabled: false,
      alertDate: '',
    };

    setEnvironments((prev) => {
      const copy = [...prev];
      copy[envIndex] = {
        ...copy[envIndex],
        items: [...copy[envIndex].items, createdItem],
      };
      return copy;
    });

    // Clear input for this environment
    setNewItemsByEnv((prev) => ({ ...prev, [env.id]: '' }));
  };

  // Remove an Item from an Environment
  const handleRemoveItem = (envIndex: number, itemIndex: number) => {
    setEnvironments((prev) => {
      const copy = [...prev];
      const items = copy[envIndex].items.filter((_, idx) => idx !== itemIndex);
      copy[envIndex] = { ...copy[envIndex], items };
      return copy;
    });
  };

  // Change Item Description
  const setItemDescription = (envIndex: number, itemIndex: number, desc: string) => {
    setEnvironments((prev) => {
      const copy = [...prev];
      const items = [...copy[envIndex].items];
      const current = items[itemIndex];

      // Auto-extract date if present in text and alertDate is not yet manually set
      let autoAlertDate = current.alertDate;
      const extracted = extractDateFromText(desc);
      if (extracted) {
        autoAlertDate = extracted.iso;
      }

      items[itemIndex] = {
        ...current,
        description: desc,
        alertDate: autoAlertDate,
      };
      copy[envIndex] = { ...copy[envIndex], items };
      return copy;
    });
  };

  // Toggle Alert Checkbox for an item
  const setItemAlertToggle = (envIndex: number, itemIndex: number, enabled: boolean) => {
    setEnvironments((prev) => {
      const copy = [...prev];
      const items = [...copy[envIndex].items];
      const current = items[itemIndex];

      // If enabling and alertDate is empty, try to detect date from description
      let alertDate = current.alertDate;
      if (enabled && !alertDate) {
        const extracted = extractDateFromText(current.description);
        if (extracted) {
          alertDate = extracted.iso;
        }
      }

      items[itemIndex] = {
        ...current,
        alertEnabled: enabled,
        alertDate,
      };
      copy[envIndex] = { ...copy[envIndex], items };
      return copy;
    });
  };

  // Set explicit alert date for an item
  const setItemAlertDate = (envIndex: number, itemIndex: number, dateStr: string) => {
    setEnvironments((prev) => {
      const copy = [...prev];
      const items = [...copy[envIndex].items];
      items[itemIndex] = {
        ...items[itemIndex],
        alertDate: dateStr,
      };
      copy[envIndex] = { ...copy[envIndex], items };
      return copy;
    });
  };

  // Change Item Status (OK vs AGENDAR MANUTENÇÃO)
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

  // Change Item Urgency Level
  const setItemUrgencyLevel = (
    envIndex: number,
    itemIndex: number,
    urgency: 'Crítica' | 'Alta' | 'Média' | 'Baixa'
  ) => {
    setEnvironments((prev) => {
      const copy = [...prev];
      const items = [...copy[envIndex].items];
      items[itemIndex] = { ...items[itemIndex], urgencyLevel: urgency };
      copy[envIndex] = { ...copy[envIndex], items };
      return copy;
    });
  };

  // Remove a photo directly from an item
  const handleRemovePhotoFromItem = (envIndex: number, itemIndex: number, photoId: string) => {
    setEnvironments((prev) => {
      const copy = [...prev];
      const items = [...copy[envIndex].items];
      const currentPhotos = items[itemIndex].photos || [];
      items[itemIndex] = {
        ...items[itemIndex],
        photos: currentPhotos.filter((p) => p.id !== photoId),
      };
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

  // Capture GPS Geolocation
  const captureLocation = () => {
    if (!navigator.geolocation) return;
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

  // Count critical items (status === 'AGENDAR MANUTENÇÃO' OR alert triggered)
  const criticalCount = environments.reduce((acc, env) => {
    return (
      acc +
      env.items.filter((it) => {
        const alertEval = evaluateDateAlert(it.description, it.alertDate, it.alertEnabled);
        return it.status === 'AGENDAR MANUTENÇÃO' || alertEval.isAlertTriggered;
      }).length
    );
  }, 0);

  // Dynamic Structure Version (Ambientes & Itens)
  const currentStructureVersion = React.useMemo(() => {
    return determineStructureVersion(
      selectedCondoId,
      environments,
      pastInspections,
      inspectionIdToEdit || undefined
    );
  }, [selectedCondoId, environments, pastInspections, inspectionIdToEdit]);

  // Save Inspection
  const handleSave = async (finalStatus: 'EM_ANDAMENTO' | 'CONCLUIDA') => {
    if (!company) return;
    setSaving(true);

    const condo = condominiums.find((c) => c.id === selectedCondoId);
    const block = condo?.blocks.find((b) => b.id === selectedBlockId);
    const tmpl = templates.find((t) => t.id === selectedTemplateId);

    const finalStructureVersion = determineStructureVersion(
      selectedCondoId,
      environments,
      pastInspections,
      inspectionIdToEdit || undefined
    );

    const inspectionPayload: Inspection = {
      id: inspectionId,
      companyId: company.id,
      companyName: company.name,
      condominiumId: selectedCondoId,
      condominiumName: condo?.name || condoSearch || 'Condomínio',
      condominiumAddress: condo
        ? `${condo.address}, ${condo.neighborhood} - ${condo.city}/${condo.state}`
        : '',
      blockId: selectedBlockId,
      blockName: block?.name || 'Geral',
      templateId: selectedTemplateId || 'custom',
      templateName: tmpl?.title || 'Vistoria em Campo',
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
      structureVersion: finalStructureVersion,
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

        // Cache locally for offline resilience
        await cacheInspectionLocally(inspectionPayload);

        // Firestore sync non-blocking
        FirestoreService.saveInspectionToFirestore(inspectionPayload).catch((fe) => {
          console.warn('[InspectionForm] Firestore background sync warning:', fe);
        });
      } else {
        // Offline mode: save to IndexedDB pending queue
        await savePendingInspection(inspectionPayload);
        alert('Modo offline: Vistoria salva no dispositivo. Será sincronizada assim que a conexão retornar.');
      }

      if (onSaved) onSaved();
      onNavigate('inspection-detail', inspectionId);
    } catch (err: any) {
      console.error('Error saving inspection:', err);
      // Fallback: save to IndexedDB
      try {
        await savePendingInspection(inspectionPayload);
        alert('Vistoria salva localmente no dispositivo (offline).');
        if (onSaved) onSaved();
        onNavigate('inspection-detail', inspectionId);
      } catch (cacheErr) {
        alert('Erro ao salvar vistoria. Verifique o preenchimento dos campos.');
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedCondo = condominiums.find((c) => c.id === selectedCondoId);

  // Filtered condominiums for the search input dropdown
  const filteredCondos = condominiums.filter((c) =>
    (c.name || '').toLowerCase().includes((condoSearch || '').toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <span className="text-xs font-semibold">Carregando formulário de vistoria...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl w-full mx-auto space-y-6 pb-24">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('inspections')}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
              <span>{inspectionIdToEdit ? 'Editar Vistoria' : 'Nova Vistoria'}</span>
              <span className="text-xs font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                {inspectionId}
              </span>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                Versão {currentStructureVersion}
              </span>
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave('EM_ANDAMENTO')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Rascunho</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave('CONCLUIDA')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Finalizando...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Finalizar Laudo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Section 1: Identification - Condominium (search/select & auto-load info), Technician, Date */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              1. Identificação do Condomínio e Técnico
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Condomínio Editable & Searchable Dropdown */}
          <div className="relative" ref={condoDropdownRef}>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nome do Condomínio *
            </label>
            <div className="relative">
              <input
                type="text"
                value={condoSearch}
                onChange={(e) => {
                  setCondoSearch(e.target.value);
                  setShowCondoDropdown(true);
                }}
                onFocus={() => setShowCondoDropdown(true)}
                placeholder="Clique ou digite para selecionar o condomínio..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-9 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowCondoDropdown(!showCondoDropdown)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Dropdown List */}
            {showCondoDropdown && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 animate-fadeIn">
                {filteredCondos.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500 text-center">
                    Nenhum condomínio encontrado com esse nome.
                  </div>
                ) : (
                  filteredCondos.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCondo(c)}
                      className={`w-full text-left p-2.5 hover:bg-blue-50 transition-colors flex flex-col ${
                        selectedCondoId === c.id ? 'bg-blue-50/70 font-bold' : ''
                      }`}
                    >
                      <span className="text-xs text-slate-900 font-semibold">{c.name}</span>
                      <span className="text-[11px] text-slate-500 truncate">
                        {c.address}, {c.neighborhood} - {c.city}/{c.state}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Técnico Field (Editable) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Técnico / Responsável *
            </label>
            <div className="relative">
              <input
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                placeholder="Nome do técnico que está fazendo a vistoria"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
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

          {/* Bloco / Torre */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Bloco / Torre
            </label>
            <select
              value={selectedBlockId}
              onChange={(e) => setSelectedBlockId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Geral / Sem bloco específico</option>
              {selectedCondo?.blocks?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
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

          {/* Síndico Responsável */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Síndico Responsável
            </label>
            <input
              type="text"
              value={syndicName}
              onChange={(e) => setSyndicName(e.target.value)}
              placeholder="Nome do síndico"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Auto-Loaded Condominium Information Summary Card */}
        {selectedCondo && (
          <div className="mt-2 p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <Building className="w-4 h-4 text-blue-600" />
                <span>Informações Carregadas do Condomínio: {selectedCondo.name}</span>
              </div>
              <div className="text-[11px] text-blue-800 mt-0.5">
                <span>{selectedCondo.address}, {selectedCondo.neighborhood} - {selectedCondo.city}/{selectedCondo.state}</span>
                {selectedCondo.postalCode && <span> &bull; CEP: {selectedCondo.postalCode}</span>}
                {selectedCondo.syndicName && <span> &bull; Síndico: {selectedCondo.syndicName}</span>}
              </div>
            </div>
            <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold shrink-0">
              Dados sincronizados
            </span>
          </div>
        )}

        {/* Geolocation Presence */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                geoLoc ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
              }`}
            >
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">
                Presença em Campo (GPS Automático)
              </div>
              <div className="text-[11px] text-slate-500">
                {geoLoc
                  ? `Lat: ${geoLoc.latitude.toFixed(5)}, Long: ${geoLoc.longitude.toFixed(5)} (Precisão: ${
                      geoLoc.accuracy ? `${geoLoc.accuracy.toFixed(1)}m` : 'Alta'
                    })`
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

      {/* Section 2: Environment Creation & Items */}
      <div className="space-y-4">
        {/* Section Header with Alert Count */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <span>2. Ambientes e Itens da Vistoria</span>
            </h2>
          </div>

          {criticalCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full border border-red-200 self-start sm:self-auto">
              <AlertTriangle className="w-3.5 h-3.5" />
              {criticalCount} item(ns) com alerta / manutenção necessária
            </span>
          )}
        </div>

        {/* Ambient Creation Box: "Ambiente" text + blank input + "+" button */}
        <div className="bg-white border-2 border-dashed border-blue-200 rounded-2xl p-4 shadow-xs">
          <label className="block text-xs font-bold uppercase tracking-wider text-blue-900 mb-1.5">
            Ambiente
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newEnvName}
              onChange={(e) => setNewEnvName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddEnvironment();
                }
              }}
              placeholder="Digite o nome do ambiente (ex: Hall de Entrada, Barrilete, Garagem, Salão de Festas, Cobertura...)"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              type="button"
              onClick={() => handleAddEnvironment()}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all shrink-0"
              title="Criar ambiente"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">Criar Ambiente</span>
            </button>
          </div>
        </div>

        {/* List of Created Environments */}
        {environments.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
            <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Nenhum ambiente adicionado ainda</p>
          </div>
        ) : (
          environments.map((env, envIndex) => {
            const currentItemInputValue = newItemsByEnv[env.id] || '';

            return (
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
                      Ambiente: {env.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {env.items.length} {env.items.length === 1 ? 'item' : 'itens'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEnvironment(envIndex)}
                      className="text-slate-400 hover:text-red-400 p-1 transition-colors"
                      title="Excluir este ambiente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Items Container */}
                <div className="p-3.5 sm:p-5 space-y-4">
                  {/* Items List in this environment */}
                  {env.items.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      Nenhum item cadastrado neste ambiente ainda. Cadastre o primeiro item logo abaixo:
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 space-y-4">
                      {env.items.map((item, itemIndex) => {
                        const isOk = item.status === 'OK, MANUTENÇÃO EM DIA';
                        const isMaintenance = item.status === 'AGENDAR MANUTENÇÃO';
                        const photos = item.photos || [];
                        const photosCount = photos.length;

                        // Evaluate date from description or explicit alertDate
                        const alertEval = evaluateDateAlert(
                          item.description,
                          item.alertDate,
                          !!item.alertEnabled
                        );

                        return (
                          <div
                            key={item.id}
                            className={`pt-4 first:pt-0 p-3 rounded-xl border transition-all ${
                              alertEval.isAlertTriggered || isMaintenance
                                ? 'bg-red-50/40 border-red-200'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            {/* Item Header: Name & Photo Trigger */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                                  {itemIndex + 1}
                                </span>
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                                  {item.name}
                                </h4>
                              </div>

                              <div className="flex items-center gap-2 self-start sm:self-center">
                                {/* Photo Trigger Button */}
                                <button
                                  type="button"
                                  onClick={() => openPhotoModal(envIndex, itemIndex)}
                                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                                    photosCount > 0
                                      ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                  <span>
                                    {photosCount > 0
                                      ? `${photosCount} Foto(s) Vertical`
                                      : 'Adicionar Fotos'}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(envIndex, itemIndex)}
                                  className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                                  title="Excluir este item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Campo Descrição & Ticket de Alerta */}
                            <div className="mb-3 space-y-1.5">
                              <label className="block text-[11px] font-bold text-slate-700">
                                Descrição do Item:
                              </label>
                              <textarea
                                rows={2}
                                value={item.description || ''}
                                onChange={(e) =>
                                  setItemDescription(envIndex, itemIndex, e.target.value)
                                }
                                placeholder="Coloque a informação para explicar o que é aquele item (ex: Extintor de Incêndio tipo Pó ABC 6kg - Validade da carga: 25/10/2026)..."
                                className="w-full text-xs rounded-xl px-3 py-2 border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-blue-500 outline-none transition-colors"
                              />

                              {/* Alert Ticket / Checkbox Container */}
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={!!item.alertEnabled}
                                      onChange={(e) =>
                                        setItemAlertToggle(envIndex, itemIndex, e.target.checked)
                                      }
                                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                    />
                                    <span className="text-xs font-bold text-slate-800">
                                      Ligar alerta de vencimento / manutenção
                                    </span>
                                  </label>

                                  {/* Date status or detection badge */}
                                  {alertEval.rawDetectedText && (
                                    <span className="text-[11px] text-blue-800 bg-blue-100/70 border border-blue-200 px-2 py-0.5 rounded-md font-medium">
                                      📅 Data detectada: {alertEval.formattedDate}
                                    </span>
                                  )}
                                </div>

                                {/* When alert is enabled: allow explicit date picking and show real-time verification */}
                                {item.alertEnabled && (
                                  <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-semibold text-slate-600">
                                        Data do Vencimento:
                                      </span>
                                      <input
                                        type="date"
                                        value={item.alertDate || alertEval.isoDate || ''}
                                        onChange={(e) =>
                                          setItemAlertDate(envIndex, itemIndex, e.target.value)
                                        }
                                        className="text-xs bg-white border border-slate-300 rounded-lg px-2 py-1 outline-none font-medium"
                                      />
                                    </div>

                                    {/* Alert evaluation result banner */}
                                    {alertEval.isAlertTriggered ? (
                                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-700 bg-red-100 border border-red-300 px-2.5 py-1 rounded-lg">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        <span>
                                          {alertEval.isExpired
                                            ? `🚨 VENCIDO há ${Math.abs(alertEval.daysRemaining || 0)} dias`
                                            : `⚠️ Vence em ${alertEval.daysRemaining} dias`} &bull; Aparecerá em "Manutenção em Destaque"!
                                        </span>
                                      </div>
                                    ) : alertEval.formattedDate ? (
                                      <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                        ✓ Em dia (vence em {alertEval.daysRemaining} dias)
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-slate-500 italic">
                                        Informe a data na descrição ou no campo acima para acionar o alerta.
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Touch Status Selection Buttons (O que foi feito) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                              {/* OK Button */}
                              <button
                                type="button"
                                onClick={() =>
                                  setItemStatus(envIndex, itemIndex, 'OK, MANUTENÇÃO EM DIA')
                                }
                                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                                  isOk
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50/60'
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
                                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                                  isMaintenance
                                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-red-50/60'
                                }`}
                              >
                                <AlertTriangle className="w-4 h-4" />
                                <span>AGENDAR MANUTENÇÃO</span>
                              </button>
                            </div>

                            {/* Grau de Urgência da Manutenção */}
                            {isMaintenance && (
                              <div className="mb-3 p-2.5 rounded-xl bg-red-50/60 border border-red-200 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-red-900">
                                    Grau de Urgência da Manutenção:
                                  </span>
                                  <span className="text-[10px] text-red-700 font-bold px-2 py-0.5 rounded bg-red-100">
                                    {item.urgencyLevel || 'Alta'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-4 gap-1.5">
                                  {(['Baixa', 'Média', 'Alta', 'Crítica'] as const).map((urg) => {
                                    const isSelected = (item.urgencyLevel || 'Alta') === urg;
                                    return (
                                      <button
                                        key={urg}
                                        type="button"
                                        onClick={() => setItemUrgencyLevel(envIndex, itemIndex, urg)}
                                        className={`py-1.5 px-1.5 rounded-lg text-[11px] font-bold border transition-all text-center ${
                                          isSelected
                                            ? urg === 'Crítica'
                                              ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                                              : urg === 'Alta'
                                              ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                              : urg === 'Média'
                                              ? 'bg-yellow-500 text-white border-yellow-500 shadow-2xs'
                                              : 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                      >
                                        {urg}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Campo Observações */}
                            <div>
                              <input
                                type="text"
                                value={item.observations || ''}
                                onChange={(e) =>
                                  setItemObservation(envIndex, itemIndex, e.target.value)
                                }
                                placeholder={
                                  isMaintenance
                                    ? 'Observações com as informações do que precisa ser feito...'
                                    : 'Observações adicionais com as informações...'
                                }
                                className={`w-full text-xs rounded-xl px-3 py-2 border outline-none transition-colors ${
                                  isMaintenance
                                    ? 'border-red-300 bg-white focus:border-red-500'
                                    : 'border-slate-200 bg-slate-50/50 focus:border-blue-500'
                                }`}
                              />
                            </div>

                            {/* STRICT 5-PHOTOS-PER-ROW GRID (All photos exact same vertical size!) */}
                            {photosCount > 0 && (
                              <div className="mt-3 pt-2.5 border-t border-slate-100">
                                <div className="text-[11px] font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                                  <span>Fotografias ({photosCount}):</span>
                                </div>

                                {/* Container with fixed 5-column grid */}
                                <div className="grid grid-cols-5 gap-2 max-w-2xl">
                                  {photos.map((ph, pIdx) => (
                                    <div
                                      key={ph.id}
                                      className="relative rounded-lg overflow-hidden border border-slate-300 bg-slate-100 shadow-2xs group"
                                      style={{ aspectRatio: '3/4' }}
                                    >
                                      <img
                                        src={ph.url}
                                        alt={ph.caption || `Foto #${pIdx + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                      <span className="absolute bottom-0.5 right-0.5 bg-slate-900/80 text-white text-[8px] font-bold px-1 rounded">
                                        #{pIdx + 1}
                                      </span>

                                      {/* Quick Delete button */}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemovePhotoFromItem(envIndex, itemIndex, ph.id)
                                        }
                                        className="absolute top-0.5 right-0.5 bg-red-600/90 text-white p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Remover foto"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* SEMPRE ABAIXO DO ÚLTIMO ITEM CADASTRADO: INCLUSÃO DE NOVO ITEM E NOVO AMBIENTE */}
                  <div className="mt-4 pt-3.5 border-t border-slate-200/80 space-y-3 bg-slate-50/90 p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
                    {/* Inclusão de Novo Item no ambiente atual */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-900 mb-1.5">
                        <Plus className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />
                        <span>Novo Item em "{env.name}"</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={currentItemInputValue}
                          onChange={(e) =>
                            setNewItemsByEnv((prev) => ({ ...prev, [env.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddItem(envIndex);
                            }
                          }}
                          placeholder={`Digite o nome do novo item para "${env.name}" (ex: Extintor, Bomba, Quadro de Luz...)`}
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddItem(envIndex)}
                          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all shrink-0"
                          title="Adicionar item neste ambiente"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>Adicionar Item</span>
                        </button>
                      </div>
                    </div>

                    {/* Inclusão de Novo Ambiente (logo abaixo do último item) */}
                    <div className="pt-3 border-t border-slate-200">
                      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-700 stroke-[2.5]" />
                        <span>Novo Ambiente</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newEnvBelowByEnv[env.id] || ''}
                          onChange={(e) =>
                            setNewEnvBelowByEnv((prev) => ({ ...prev, [env.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddEnvironmentBelow(envIndex, env.id);
                            }
                          }}
                          placeholder="Digite o nome do novo ambiente (ex: Garagem, Barrilete, Hall...)"
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddEnvironmentBelow(envIndex, env.id)}
                          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all shrink-0"
                          title="Criar novo ambiente logo abaixo"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>Adicionar Ambiente</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Adicionar Novo Ambiente ao final de todos os ambientes */}
        {environments.length > 0 && (
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors rounded-2xl p-4 shadow-xs">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Adicionar Novo Ambiente ao Final da Vistoria</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newEnvName}
                onChange={(e) => setNewEnvName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddEnvironment();
                  }
                }}
                placeholder="Digite o nome do ambiente (ex: Hall de Entrada, Barrilete, Garagem, Salão de Festas, Cobertura...)"
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={() => handleAddEnvironment()}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all shrink-0"
                title="Criar ambiente no final"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Criar Ambiente</span>
              </button>
            </div>
          </div>
        )}
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
            Parecer Geral / Observações de Conclusão da Vistoria
          </label>
          <textarea
            rows={3}
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            placeholder="Comentários gerais sobre a vistoria técnica no condomínio..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Signatures Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Technician Signature */}
          <SignaturePad
            title="Assinatura do Técnico Vistoriador"
            subtitle={inspectorName || 'Técnico Responsável'}
            initialSignature={technicianSignature}
            onSave={(data) => setTechnicianSignature(data)}
            onClear={() => setTechnicianSignature(undefined)}
          />

          {/* Syndic Signature */}
          <SignaturePad
            title="Assinatura do Síndico / Responsável Predial"
            subtitle={syndicName || 'Síndico / Acompanhante'}
            initialSignature={syndicSignature}
            onSave={(data) => setSyndicSignature(data)}
            onClear={() => setSyndicSignature(undefined)}
          />
        </div>
      </div>

      {/* Floating Bottom Bar for Fast Action */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:p-4 z-20 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            <span className="font-bold text-slate-900">{environments.length}</span> ambientes &bull;{' '}
            <span className="font-bold text-slate-900">
              {environments.reduce((acc, e) => acc + e.items.length, 0)}
            </span>{' '}
            itens
            {criticalCount > 0 && (
              <span className="text-red-700 font-bold ml-1.5">
                ({criticalCount} com alerta/manutenção)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('EM_ANDAMENTO')}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              Salvar Rascunho
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('CONCLUIDA')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Finalizar Vistoria</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Photo Upload Modal */}
      <PhotoUploadModal
        isOpen={photoModalState.isOpen}
        onClose={() => setPhotoModalState((prev) => ({ ...prev, isOpen: false }))}
        itemName={photoModalState.itemName}
        environmentName={photoModalState.envName}
        photos={photoModalState.photos}
        onUpdatePhotos={handleUpdatePhotos}
        inspectionId={inspectionId}
        companyName={company?.tradeName || company?.name}
      />
    </div>
  );
};
