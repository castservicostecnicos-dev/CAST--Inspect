import React, { useState, useEffect } from 'react';
import {
  Building,
  Plus,
  Trash2,
  Edit2,
  Layers,
  MapPin,
  User,
  Phone,
  Mail,
  X,
  Check,
  PlusCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Condominium, CondominiumBlock } from '../types';

interface CondominiumsProps {
  onNavigate: (view: string, param?: string) => void;
}

export const Condominiums: React.FC<CondominiumsProps> = ({ onNavigate }) => {
  const { company, canManageUsers, canExecuteInspection } = useAuth();
  const [condos, setCondos] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCondo, setEditingCondo] = useState<Condominium | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('São Paulo');
  const [state, setState] = useState('SP');
  const [zipCode, setZipCode] = useState('');
  const [syndicName, setSyndicName] = useState('');
  const [syndicPhone, setSyndicPhone] = useState('');
  const [syndicEmail, setSyndicEmail] = useState('');
  const [blocks, setBlocks] = useState<CondominiumBlock[]>([]);
  const [newBlockName, setNewBlockName] = useState('');

  const fetchCondos = async () => {
    if (!company) return;
    setLoading(true);
    try {
      const res = await fetch('/api/condominiums', {
        headers: { 'x-company-id': company.id },
      });
      if (res.ok) {
        const data = await res.json();
        setCondos(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCondos();
  }, [company]);

  const openNewModal = () => {
    setEditingCondo(null);
    setName('');
    setCnpj('');
    setAddress('');
    setNeighborhood('');
    setCity('São Paulo');
    setState('SP');
    setZipCode('');
    setSyndicName('');
    setSyndicPhone('');
    setSyndicEmail('');
    setBlocks([
      { id: `blk_${Date.now()}_1`, name: 'Torre A', description: 'Edifício Residencial' },
      { id: `blk_${Date.now()}_2`, name: 'Áreas Comuns', description: 'Guarita, Lazer e Garagem' },
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (c: Condominium) => {
    setEditingCondo(c);
    setName(c.name);
    setCnpj(c.cnpj || '');
    setAddress(c.address);
    setNeighborhood(c.neighborhood);
    setCity(c.city);
    setState(c.state);
    setZipCode(c.zipCode);
    setSyndicName(c.syndicName || '');
    setSyndicPhone(c.syndicPhone || '');
    setSyndicEmail(c.syndicEmail || '');
    setBlocks(c.blocks || []);
    setIsModalOpen(true);
  };

  const handleAddBlock = () => {
    if (!newBlockName.trim()) return;
    setBlocks([
      ...blocks,
      {
        id: `blk_${Date.now()}`,
        name: newBlockName.trim(),
        description: 'Estrutura predial',
      },
    ]);
    setNewBlockName('');
  };

  const handleRemoveBlock = (blockId: string) => {
    setBlocks(blocks.filter((b) => b.id !== blockId));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    const payload: Partial<Condominium> = {
      companyId: company.id,
      name,
      cnpj,
      address,
      neighborhood,
      city,
      state,
      zipCode,
      syndicName,
      syndicPhone,
      syndicEmail,
      blocks: blocks.length > 0 ? blocks : [{ id: 'blk_1', name: 'Bloco Único' }],
    };

    try {
      const method = editingCondo ? 'PUT' : 'POST';
      const url = editingCondo
        ? `/api/condominiums/${editingCondo.id}`
        : '/api/condominiums';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': company.id,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchCondos();
      }
    } catch (err) {
      alert('Erro ao salvar condomínio.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este condomínio?')) return;
    try {
      const res = await fetch(`/api/condominiums/${id}`, {
        method: 'DELETE',
        headers: { 'x-company-id': company?.id || '' },
      });
      if (res.ok) {
        fetchCondos();
      }
    } catch (e) {
      alert('Erro ao excluir condomínio.');
    }
  };

  return (
    <div className="space-y-6 pb-16 w-full max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">
            Condomínios e Blocos/Torres
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Cadastro de empreendimentos imobiliários e estruturação de torres para vistorias.
          </p>
        </div>

        {canManageUsers && (
          <button
            onClick={openNewModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Condomínio</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <span className="text-xs font-semibold">Carregando condomínios...</span>
        </div>
      ) : condos.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <Building className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">Nenhum condomínio cadastrado</p>
          <p className="text-xs text-slate-500 mt-1">
            Cadastre seu primeiro condomínio para iniciar as vistorias técnicas periódicas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {condos.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{c.name}</h3>
                    {c.cnpj && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        CNPJ: {c.cnpj}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {canManageUsers && (
                      <>
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-600 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {c.address}, {c.neighborhood} &bull; {c.city}/{c.state}
                    </span>
                  </div>

                  {c.syndicName && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Síndico(a): {c.syndicName}</span>
                    </div>
                  )}

                  {c.syndicPhone && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{c.syndicPhone}</span>
                    </div>
                  )}
                </div>

                {/* Blocos / Torres Cadastrados */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    <span>Blocos / Torres ({c.blocks?.length || 0})</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {c.blocks?.map((b) => (
                      <span
                        key={b.id}
                        className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200"
                      >
                        {b.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {canExecuteInspection && (
                <div className="mt-5 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => onNavigate('new-inspection')}
                    className="w-full flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold py-2 rounded-xl border border-blue-200 transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Realizar Vistoria neste Condomínio</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Condominium Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn w-full max-w-full overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {editingCondo ? 'Editar Condomínio' : 'Novo Condomínio'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Condomínio *
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Condomínio Residencial Jardins"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CEP</label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="00000-000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Endereço Completo *
                </label>
                <input
                  required
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Av. Paulista, 1500"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bairro</label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Bela Vista"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">UF</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Síndico Data */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800 block mb-2">
                  Dados da Administração Predial / Síndico
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                      Nome Síndico(a)
                    </label>
                    <input
                      type="text"
                      value={syndicName}
                      onChange={(e) => setSyndicName(e.target.value)}
                      placeholder="Nome do síndico"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                      Telefone
                    </label>
                    <input
                      type="text"
                      value={syndicPhone}
                      onChange={(e) => setSyndicPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Blocos / Torres */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800 block mb-2">
                  Blocos / Torres Inclusos
                </span>

                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newBlockName}
                    onChange={(e) => setNewBlockName(e.target.value)}
                    placeholder="Nome da nova torre (ex: Torre Sul)"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddBlock}
                    className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-slate-700 transition-colors"
                  >
                    Adicionar
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {blocks.map((b) => (
                    <span
                      key={b.id}
                      className="bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5"
                    >
                      <span>{b.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBlock(b.id)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
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
                  Salvar Condomínio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
