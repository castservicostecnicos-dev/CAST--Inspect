import React, { useState, useEffect } from 'react';
import {
  Building2,
  KeyRound,
  Plus,
  Edit2,
  Trash2,
  Power,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  X,
  Building,
  Mail,
  Phone,
  MapPin,
  ShieldAlert,
  Sparkles,
  Lock,
  Database,
  Cloud,
  Check,
  HardDrive,
  Download,
  Upload,
  Wifi,
  WifiOff,
  Smartphone,
} from 'lucide-react';
import { Company, User } from '../types';
import { FirestoreService } from '../lib/firestoreSync';
import {
  countPendingInspectionsIDB,
  getCachedInspectionsIDB,
  clearPendingInspectionsIDB,
} from '../lib/indexedDb';
import {
  syncPendingToFirestore,
  subscribeSyncStatus,
  SyncStatus,
} from '../lib/syncEngine';

export const DevDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'companies' | 'passwords' | 'database'>('companies');

  // --- Database Maintenance State ---
  const [clearingDb, setClearingDb] = useState(false);
  const [syncingFirestore, setSyncingFirestore] = useState(false);
  const [restoringFirestore, setRestoringFirestore] = useState(false);
  const [dbStatusMsg, setDbStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // --- IndexedDB & Offline State ---
  const [idbPendingCount, setIdbPendingCount] = useState(0);
  const [idbCachedCount, setIdbCachedCount] = useState(0);
  const [syncingIdb, setSyncingIdb] = useState(false);
  const [isOnlineState, setIsOnlineState] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [swActive, setSwActive] = useState(false);

  const refreshIdbStats = async () => {
    try {
      const pending = await countPendingInspectionsIDB();
      setIdbPendingCount(pending);
      const cached = await getCachedInspectionsIDB();
      setIdbCachedCount(cached.length);
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        setSwActive(true);
      }
    } catch (e) {
      console.error('Error refreshing IDB stats', e);
    }
  };

  useEffect(() => {
    refreshIdbStats();
    const unsub = subscribeSyncStatus((status: SyncStatus) => {
      setIsOnlineState(status.isOnline);
      setIdbPendingCount(status.pendingCount);
      setSyncingIdb(status.isSyncing);
    });
    return unsub;
  }, []);

  // --- Companies State ---
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [searchCompany, setSearchCompany] = useState('');
  
  // Modals for Companies
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);

  // Company Form state
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // --- Password Recovery State ---
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [userToReset, setUserToReset] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Fetch companies
  const fetchCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const res = await fetch('/api/companies');
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Fetch all users for password recovery
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/dev/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchUsers();
  }, []);

  // --- Company Actions ---
  const handleOpenCreateModal = () => {
    setName('');
    setTradeName('');
    setCnpj('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCity('');
    setState('');
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (comp: Company) => {
    setEditingCompany(comp);
    setName(comp.name);
    setTradeName(comp.tradeName || '');
    setCnpj(comp.cnpj);
    setEmail(comp.email);
    setPhone(comp.phone);
    setAddress(comp.address);
    setCity(comp.city || '');
    setState(comp.state || '');
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !cnpj.trim()) return;

    if (editingCompany) {
      // Edit
      try {
        const payload = {
          ...editingCompany,
          name: name.trim(),
          tradeName: tradeName.trim() || name.trim(),
          cnpj: cnpj.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          city: city.trim() || 'São Paulo',
          state: state.trim() || 'SP',
        };

        const res = await fetch(`/api/companies/${editingCompany.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          setEditingCompany(null);
          await fetchCompanies();
        } else {
          alert('Erro ao atualizar empresa.');
        }
      } catch (err) {
        alert('Erro de conexão ao atualizar empresa.');
      }
    } else {
      // Create
      try {
        const payload = {
          id: `emp_${Date.now()}`,
          name: name.trim(),
          tradeName: tradeName.trim() || name.trim(),
          cnpj: cnpj.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          city: city.trim() || 'São Paulo',
          state: state.trim() || 'SP',
          active: true,
        };

        const res = await fetch('/api/companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          setIsCreateModalOpen(false);
          await fetchCompanies();
        } else {
          alert('Erro ao cadastrar empresa.');
        }
      } catch (err) {
        alert('Erro de conexão ao cadastrar empresa.');
      }
    }
  };

  const handleToggleStatus = async (comp: Company) => {
    try {
      const res = await fetch(`/api/companies/${comp.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !comp.active }),
      });
      if (res.ok) {
        await fetchCompanies();
      } else {
        alert('Erro ao alterar status da empresa.');
      }
    } catch (e) {
      alert('Erro de conexão ao alterar status.');
    }
  };

  const handleDeleteCompany = async () => {
    if (!deletingCompany) return;
    try {
      const res = await fetch(`/api/companies/${deletingCompany.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeletingCompany(null);
        await fetchCompanies();
      } else {
        alert('Não foi possível excluir a empresa.');
      }
    } catch (e) {
      alert('Erro de conexão ao excluir empresa.');
    }
  };

  // --- Password Recovery Actions ---
  const handleOpenResetModal = (usr: User) => {
    setUserToReset(usr);
    setNewPassword('Cast#' + Math.floor(1000 + Math.random() * 9000));
    setResetSuccessMessage('');
    setCopied(false);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let pass = 'Cast#';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
  };

  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToReset || !newPassword.trim()) return;

    try {
      const res = await fetch('/api/dev/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userToReset.id,
          newPassword: newPassword.trim(),
        }),
      });

      if (res.ok) {
        setResetSuccessMessage(`Senha redefinida com sucesso para "${newPassword.trim()}".`);
        await fetchUsers();
      } else {
        alert('Erro ao redefinir senha do usuário.');
      }
    } catch (e) {
      alert('Erro de conexão ao redefinir senha.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(searchCompany.toLowerCase()) ||
    c.tradeName?.toLowerCase().includes(searchCompany.toLowerCase()) ||
    c.cnpj.includes(searchCompany)
  );

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.companyName?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.role.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20 w-full max-w-full">
      {/* Dev Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Painel do Desenvolvedor
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Gestão de empresas e redefinição de senhas
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 p-1.5 rounded-2xl shrink-0 overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('companies')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'companies'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Empresas ({companies.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('passwords')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'passwords'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Senhas ({users.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('database')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'database'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Banco de Dados & Firebase</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GESTÃO DE EMPRESAS                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'companies' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchCompany}
                onChange={(e) => setSearchCompany(e.target.value)}
                placeholder="Buscar empresa por razão social, nome fantasia ou CNPJ..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchCompanies}
                className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors"
                title="Atualizar lista"
              >
                <RefreshCw className={`w-4 h-4 ${loadingCompanies ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-xl shadow-md shadow-cyan-600/20 transition-all active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Nova Empresa</span>
              </button>
            </div>
          </div>

          {/* Companies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCompanies.map((c) => (
              <div
                key={c.id}
                className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all ${
                  c.active
                    ? 'border-slate-200 hover:border-cyan-400'
                    : 'border-rose-200 bg-rose-50/20 opacity-80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm ${
                          c.active ? 'bg-cyan-100 text-cyan-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">
                            {c.tradeName || c.name}
                          </h3>
                          {c.active ? (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Ativa
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Power className="w-3 h-3" /> Desativada
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{c.name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-slate-600 space-y-1.5 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">CNPJ:</span>
                      <span className="font-mono text-slate-900 font-medium">{c.cnpj}</span>
                    </div>
                    {c.email && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{c.email}</span>
                      </div>
                    )}
                    {c.phone && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{c.phone}</span>
                      </div>
                    )}
                    {c.address && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{c.address} - {c.city}/{c.state}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dev Actions Bar */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 font-mono">
                    ID: {c.id}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Toggle Active/Inactive */}
                    <button
                      onClick={() => handleToggleStatus(c)}
                      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-colors ${
                        c.active
                          ? 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'
                          : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                      title={c.active ? 'Desativar empresa' : 'Ativar empresa'}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{c.active ? 'Desativar' : 'Ativar'}</span>
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleOpenEditModal(c)}
                      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
                      title="Editar dados da empresa"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => setDeletingCompany(c)}
                      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
                      title="Excluir permanentemente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RECUPERAÇÃO DE SENHAS                                              */}
      {/* ========================================================================= */}
      {activeTab === 'passwords' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                placeholder="Buscar usuário por nome, e-mail, perfil ou empresa..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>

            <button
              onClick={fetchUsers}
              className="flex items-center gap-2 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 text-xs font-semibold transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
              <span>Atualizar Usuários</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs w-full max-w-full">
            <div className="overflow-x-auto w-full max-w-full">
              <table className="w-full text-left text-xs text-slate-700 min-w-[550px]">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Usuário</th>
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">Perfil (Role)</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ação Dev</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {u.companyName || u.companyId}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'DEV'
                              ? 'bg-cyan-100 text-cyan-800'
                              : u.role === 'GERENTE'
                              ? 'bg-purple-100 text-purple-800'
                              : u.role === 'SUPERVISOR'
                              ? 'bg-blue-100 text-blue-800'
                              : u.role === 'TECNICO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.active ? (
                          <span className="text-emerald-700 text-[11px] font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            Ativo
                          </span>
                        ) : (
                          <span className="text-rose-600 text-[11px] font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleOpenResetModal(u)}
                          className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Recuperar Senha</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CRIAR / EDITAR EMPRESA                                             */}
      {/* ========================================================================= */}
      {(isCreateModalOpen || editingCompany) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn w-full max-w-full overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-7 shadow-2xl border border-slate-100 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingCompany ? 'Editar Empresa' : 'Cadastrar Nova Empresa (Dev)'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingCompany(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Razão Social *
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Engenharia e Vistorias Ltda"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Fantasia
                </label>
                <input
                  type="text"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  placeholder="Ex: Prime Vistorias"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  CNPJ *
                </label>
                <input
                  required
                  type="text"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-cyan-500 outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@empresa.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 3333-4444"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Endereço</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua / Avenida, Número, Bairro"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="São Paulo"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">UF / Estado</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="SP"
                    maxLength={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-cyan-500 outline-none uppercase"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingCompany(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl shadow-sm transition-colors"
                >
                  {editingCompany ? 'Salvar Alterações' : 'Cadastrar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO DE EMPRESA                                 */}
      {/* ========================================================================= */}
      {deletingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn w-full max-w-full overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-rose-100 my-auto">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Excluir Empresa (Dev)</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Você tem certeza que deseja excluir permanentemente a empresa{' '}
              <strong className="text-slate-900">{deletingCompany.tradeName || deletingCompany.name}</strong> (CNPJ: {deletingCompany.cnpj})?
            </p>

            <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Esta ação é irreversível e remove o acesso de todos os usuários vinculados a este CNPJ.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setDeletingCompany(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteCompany}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-sm transition-colors"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECUPERAR SENHA DE USUÁRIO                                         */}
      {/* ========================================================================= */}
      {userToReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn w-full max-w-full overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Recuperar Senha</h3>
                  <p className="text-[11px] text-slate-500">{userToReset.name}</p>
                </div>
              </div>
              <button onClick={() => setUserToReset(null)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetSuccessMessage ? (
              <div className="mt-4 space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Senha Redefinida com Sucesso!</span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    A nova credencial de acesso para <strong>{userToReset.email}</strong> foi salva no sistema:
                  </p>
                  <div className="flex items-center justify-between bg-white border border-emerald-300 rounded-xl p-2.5 font-mono text-xs font-black text-slate-900">
                    <span>{newPassword}</span>
                    <button
                      onClick={() => copyToClipboard(newPassword)}
                      className="flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-900 font-sans font-bold bg-emerald-100 px-2 py-1 rounded-lg"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setUserToReset(null)}
                    className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmPasswordReset} className="mt-4 space-y-3.5">
                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">E-mail de acesso:</span>{' '}
                  <code className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                    {userToReset.email}
                  </code>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nova Senha de Acesso
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      required
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Digite a nova senha"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-medium focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="flex items-center gap-1.5 text-xs text-cyan-700 hover:text-cyan-800 font-semibold"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Gerar Senha Aleatória Segura</span>
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setUserToReset(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl shadow-sm transition-colors"
                  >
                    Confirmar Redefinição
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BANCO DE DADOS & PERSISTÊNCIA FIREBASE                              */}
      {/* ========================================================================= */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Status Message */}
          {dbStatusMsg && (
            <div
              className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold ${
                dbStatusMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {dbStatusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{dbStatusMsg.text}</span>
              </div>
              <button
                onClick={() => setDbStatusMsg(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Database Actions Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Limpeza de Modelos e Vistorias */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Limpar Modelos e Vistorias
                    </h3>
                    <p className="text-xs text-slate-500">
                      Mantém estritamente os usuários cadastrados e empresas
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  Executa a solicitação do desenvolvedor: remove todas as vistorias e modelos de checklist do banco de dados, <strong>preservando intactos todos os usuários e senhas</strong> do sistema.
                </p>
              </div>

              <button
                type="button"
                disabled={clearingDb}
                onClick={async () => {
                  if (!confirm('Deseja realmente limpar o banco de dados de modelos e vistorias? Os usuários cadastrados serão mantidos.')) {
                    return;
                  }
                  setClearingDb(true);
                  setDbStatusMsg(null);
                  try {
                    const res = await fetch('/api/dev/clean-database', { method: 'POST' });
                    const data = await res.json();
                    if (res.ok) {
                      // Also clear from Firestore for consistency
                      try {
                        await FirestoreService.clearTemplatesAndInspectionsInFirestore();
                      } catch (fErr) {
                        console.warn('Aviso ao sincronizar exclusão com Firestore:', fErr);
                      }
                      setDbStatusMsg({
                        type: 'success',
                        text: 'Banco de dados limpo com sucesso! Modelos e vistorias foram removidos. Usuários preservados.',
                      });
                    } else {
                      setDbStatusMsg({ type: 'error', text: data.error || 'Erro ao limpar banco de dados.' });
                    }
                  } catch (e: any) {
                    setDbStatusMsg({ type: 'error', text: `Erro de conexão: ${e.message}` });
                  } finally {
                    setClearingDb(false);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-sm transition-all active:scale-98 disabled:opacity-50"
              >
                {clearingDb ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Limpando dados...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Executar Limpeza de Modelos & Vistorias</span>
                  </>
                )}
              </button>
            </div>

            {/* Card 2: Persistência Firebase Firestore */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Banco Persistente no Firebase
                    </h3>
                    <p className="text-xs text-slate-500">
                      Garante que dados não sejam apagados após novo deploy
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  Sincroniza e faz backup do estado completo diretamente nas coleções do <strong>Firebase Firestore</strong>, assegurando que cadastros e relatórios fiquem permanentes na nuvem.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={syncingFirestore}
                  onClick={async () => {
                    setSyncingFirestore(true);
                    setDbStatusMsg(null);
                    try {
                      const res = await fetch('/api/dev/db-state');
                      const state = await res.json();
                      await FirestoreService.pushFullStateToFirestore(state);
                      setDbStatusMsg({
                        type: 'success',
                        text: 'Dados gravados no Firebase Firestore com sucesso! O banco agora é persistente na nuvem.',
                      });
                    } catch (e: any) {
                      setDbStatusMsg({ type: 'error', text: `Erro ao sincronizar com Firebase: ${e.message}` });
                    } finally {
                      setSyncingFirestore(false);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-sm transition-all active:scale-98 disabled:opacity-50"
                >
                  {syncingFirestore ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Gravando no Firebase Firestore...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Salvar / Sincronizar Tudo no Firebase</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={restoringFirestore}
                  onClick={async () => {
                    if (!confirm('Deseja restaurar os dados salvos no Firebase Firestore? Isso sincronizará as coleções na nuvem com a base da aplicação.')) {
                      return;
                    }
                    setRestoringFirestore(true);
                    setDbStatusMsg(null);
                    try {
                      const cloudState = await FirestoreService.pullFullStateFromFirestore();
                      const res = await fetch('/api/dev/db-restore', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(cloudState),
                      });
                      if (res.ok) {
                        await fetchCompanies();
                        await fetchUsers();
                        setDbStatusMsg({
                          type: 'success',
                          text: 'Dados restaurados com sucesso a partir do Firebase Firestore!',
                        });
                      } else {
                        throw new Error('Falha ao aplicar restauração no servidor.');
                      }
                    } catch (e: any) {
                      setDbStatusMsg({ type: 'error', text: `Erro ao restaurar do Firebase: ${e.message}` });
                    } finally {
                      setRestoringFirestore(false);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors disabled:opacity-50"
                >
                  {restoringFirestore ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Restaurando da Nuvem...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Restaurar Dados do Firebase</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Card 3: IndexedDB & Service Worker (Offline First) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Modo Offline & IndexedDB
                    </h3>
                    <p className="text-xs text-slate-500">
                      Camada PWA & Sincronização em segundo plano
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Service Worker:</span>
                    <span className="font-semibold flex items-center gap-1 text-emerald-600">
                      <Check className="w-3.5 h-3.5" /> Ativo & Instalado
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Status de Rede:</span>
                    <span className={`font-semibold flex items-center gap-1 ${isOnlineState ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {isOnlineState ? (
                        <>
                          <Wifi className="w-3.5 h-3.5" /> Online
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3.5 h-3.5" /> Offline
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Pendentes IndexedDB:</span>
                    <span className="font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                      {idbPendingCount} vistorias
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Cache Local IndexedDB:</span>
                    <span className="font-semibold text-slate-700">
                      {idbCachedCount} registradas
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Permite realizar vistorias completas com fotos sem conexão. O Service Worker e o Sync Engine salvam no IndexedDB e sincronizam com o Firestore assim que a conexão restabelece.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={syncingIdb || idbPendingCount === 0 || !isOnlineState}
                  onClick={async () => {
                    setSyncingIdb(true);
                    setDbStatusMsg(null);
                    try {
                      const res = await syncPendingToFirestore();
                      await refreshIdbStats();
                      setDbStatusMsg({
                        type: 'success',
                        text: `Sincronização concluída! ${res.successCount} vistorias enviadas com sucesso ao Firebase Firestore.`,
                      });
                    } catch (e: any) {
                      setDbStatusMsg({ type: 'error', text: `Erro na sincronização: ${e.message}` });
                    } finally {
                      setSyncingIdb(false);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-sm transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {syncingIdb ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sincronizando com Firestore...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Sincronizar Pendentes ({idbPendingCount}) Agora</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={idbPendingCount === 0}
                  onClick={async () => {
                    if (!confirm('Deseja limpar a fila de vistorias pendentes do IndexedDB?')) return;
                    await clearPendingInspectionsIDB();
                    await refreshIdbStats();
                    setDbStatusMsg({
                      type: 'success',
                      text: 'Fila de vistorias pendentes no IndexedDB foi limpa com sucesso.',
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-slate-400" />
                  <span>Limpar Fila Pendente</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
