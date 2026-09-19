import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Plus,
  Trash2,
  Edit2,
  Layers,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { InspectionTemplate, TemplateEnvironment, TemplateItem } from '../types';

interface TemplatesProps {
  onNavigate: (view: string, param?: string) => void;
}

export const Templates: React.FC<TemplatesProps> = ({ onNavigate }) => {
  const { company, canManageUsers } = useAuth();
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTmpl, setExpandedTmpl] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const fetchTemplates = async () => {
    if (!company) return;
    setLoading(true);
    try {
      const res = await fetch('/api/templates', {
        headers: { 'x-company-id': company.id },
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
        if (data.length > 0 && !expandedTmpl) {
          setExpandedTmpl(data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [company]);

  const toggleExpand = (id: string) => {
    setExpandedTmpl(expandedTmpl === id ? null : id);
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !title.trim()) return;

    const newTemplate: InspectionTemplate = {
      id: `tmpl_${Date.now()}`,
      companyId: company.id,
      title: title.trim(),
      description: description.trim() || 'Modelo de inspeção predial',
      active: true,
      createdAt: new Date().toISOString(),
      environments: [
        {
          id: `tenv_${Date.now()}_1`,
          name: 'ÁREAS EXTERNAS E FACHADAS',
          order: 1,
          items: [
            { id: `tit_${Date.now()}_1`, name: 'Pintura e Revestimento de Fachada', description: 'Fissuras, descolamento de pastilhas ou trincas', order: 1 },
            { id: `tit_${Date.now()}_2`, name: 'Calçadas e Acessibilidade', description: 'Piso tátil, rampas e grelhas pluviais', order: 2 },
          ],
        },
        {
          id: `tenv_${Date.now()}_2`,
          name: 'SISTEMA DE COMBATE A INCÊNDIO',
          order: 2,
          items: [
            { id: `tit_${Date.now()}_3`, name: 'Extintores de Incêndio', description: 'Validade de carga, lacre e sinalização fotoluminescente', order: 1 },
            { id: `tit_${Date.now()}_4`, name: 'Portas Corta-Fogo e Hidrantes', description: 'Fechamento automático, mangueiras e esguichos', order: 2 },
          ],
        },
      ],
    };

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': company.id,
        },
        body: JSON.stringify(newTemplate),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setTitle('');
        setDescription('');
        fetchTemplates();
      }
    } catch (err) {
      alert('Erro ao criar modelo');
    }
  };

  return (
    <div className="space-y-6 pb-16 w-full max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">
            Modelos de Vistoria
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Checklists padronizados de ambientes e itens estruturais para vistorias técnicas periódicas.
          </p>
        </div>

        {canManageUsers && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Modelo</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <span className="text-xs font-semibold">Carregando modelos...</span>
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">Nenhum modelo cadastrado</p>
          <p className="text-xs text-slate-500 mt-1">
            Crie um checklist estruturado de ambientes para orientar os vistoriadores em campo.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((tmpl) => {
            const isExpanded = expandedTmpl === tmpl.id;
            const totalItems = tmpl.environments.reduce(
              (acc, e) => acc + (e.items?.length || 0),
              0
            );

            return (
              <div
                key={tmpl.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
              >
                {/* Accordion Header */}
                <div
                  onClick={() => toggleExpand(tmpl.id)}
                  className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">
                        {tmpl.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {tmpl.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                      {tmpl.environments.length} Ambientes &bull; {totalItems} Itens
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Accordion Content: Hierarchy of Environments & Items */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-6 space-y-4">
                    {tmpl.environments.map((env, eIdx) => (
                      <div
                        key={env.id}
                        className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs"
                      >
                        <div className="bg-slate-800 text-white px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                          <span>
                            {eIdx + 1}. {env.name}
                          </span>
                          <span className="text-[10px] text-slate-300 font-normal">
                            {env.items.length} itens cadastrados
                          </span>
                        </div>

                        <div className="p-3 divide-y divide-slate-100 text-xs">
                          {env.items.map((it, iIdx) => (
                            <div
                              key={it.id}
                              className="py-2 first:pt-1 last:pb-1 flex items-start justify-between gap-2"
                            >
                              <div>
                                <span className="font-semibold text-slate-800">
                                  {iIdx + 1}. {it.name}
                                </span>
                                {it.description && (
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    {it.description}
                                  </p>
                                )}
                              </div>
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium shrink-0">
                                Padrão CAST
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Template Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn w-full max-w-full overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Novo Modelo de Vistoria</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título do Modelo *
                </label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Vistoria Predial Periódica Completa"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descrição do Checklist
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objetivo da inspeção e escopo técnico..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-sm transition-colors"
                >
                  Criar Modelo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
