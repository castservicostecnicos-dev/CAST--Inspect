import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Building,
  FileCheck2,
  Users,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavigationTabsProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  currentView,
  onNavigate,
}) => {
  const { user, canManageUsers, canManageCompanies, canExecuteInspection } = useAuth();

  // DEV role has its own dedicated dashboard with only company management and password recovery
  if (user?.role === 'DEV') {
    return null;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inspections', label: 'Vistorias', icon: ClipboardList },
    ...(canExecuteInspection
      ? [{ id: 'new-inspection', label: 'Iniciar Vistoria', icon: PlusCircle, highlight: true }]
      : []),
    { id: 'condominiums', label: 'Condomínios', icon: Building },
    { id: 'templates', label: 'Modelos de Vistoria', icon: FileCheck2 },
    ...(canManageUsers ? [{ id: 'users', label: 'Usuários', icon: Users }] : []),
    ...(canManageCompanies ? [{ id: 'companies', label: 'Empresas', icon: Briefcase }] : []),
  ];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-16 z-30 shadow-xs w-full">
      <div className="max-w-7xl w-full mx-auto px-2.5 sm:px-6">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none w-full max-w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-150 shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : item.highlight
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-white' : item.highlight ? 'text-blue-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
