import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Company, UserRole } from '../types';
import { FirestoreService } from '../lib/firestoreSync';

interface AuthContextType {
  user: User | null;
  company: Company | null;
  availableCompanies: Company[];
  token: string | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  switchCompany: (companyId: string) => void;
  canManageUsers: boolean;
  canManageCompanies: boolean;
  canManageCondos: boolean;
  canExecuteInspection: boolean;
  canApproveOrSupervise: boolean;
  isDev: boolean;
  canSwitchRoles: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUserStr = localStorage.getItem('cast_inspect_user');
      return savedUserStr ? JSON.parse(savedUserStr) : null;
    } catch {
      return null;
    }
  });
  const [company, setCompany] = useState<Company | null>(() => {
    try {
      const savedCompanyStr = localStorage.getItem('cast_inspect_company');
      return savedCompanyStr ? JSON.parse(savedCompanyStr) : null;
    } catch {
      return null;
    }
  });
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('cast_inspect_token') || null;
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [originalRole, setOriginalRole] = useState<UserRole | null>(() => {
    return (localStorage.getItem('cast_inspect_orig_role') as UserRole) || null;
  });

  // Background refresh of available companies and session validation
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const resComp = await fetch('/api/companies');
        if (resComp.ok && isMounted) {
          const comps = await resComp.json();
          if (Array.isArray(comps)) {
            setAvailableCompanies(comps);
          }
        }
      } catch (err) {
        console.warn('[Auth] Aviso ao buscar empresas em segundo plano:', err);
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao realizar login.');
      }

      const data = await res.json();
      setUser(data.user);
      setCompany(data.company);
      setToken(data.token);
      setOriginalRole(data.user.role);

      localStorage.setItem('cast_inspect_user', JSON.stringify(data.user));
      localStorage.setItem('cast_inspect_company', JSON.stringify(data.company));
      localStorage.setItem('cast_inspect_token', data.token);
      localStorage.setItem('cast_inspect_orig_role', data.user.role);
      return true;
    } catch (err: any) {
      console.warn('Login error:', err.message);
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    setCompany(null);
    setToken(null);
    setOriginalRole(null);
    localStorage.removeItem('cast_inspect_user');
    localStorage.removeItem('cast_inspect_company');
    localStorage.removeItem('cast_inspect_token');
    localStorage.removeItem('cast_inspect_orig_role');
  };

  // Switch role directly (strictly reserved for DEV user to test permissions across roles)
  const switchRole = (newRole: UserRole) => {
    if (!user) return;
    if (originalRole !== 'DEV') {
      console.warn('Operação bloqueada: A alternância rápida de perfis é restrita exclusivamente ao acesso de Desenvolvedor (Dev).');
      return;
    }
    let newName = user.name;
    let newDoc = user.docRegistration;

    if (newRole === 'DEV') {
      newName = user.email === 'ale11062@gmail.com' ? user.name : 'Equipe de Desenvolvimento (Dev)';
      newDoc = undefined;
    } else if (newRole === 'GERENTE') {
      newName = 'Eng. Carlos Eduardo Castilho';
      newDoc = 'CREA-SP 5069213890/D';
    } else if (newRole === 'SUPERVISOR') {
      newName = 'Engª. Mariana Souza Ramos';
      newDoc = 'CREA-SP 5078129910/D';
    } else if (newRole === 'TECNICO') {
      newName = 'Téc. Lucas Silva Ferreira';
      newDoc = 'CFT-SP 209381920';
    } else if (newRole === 'ADM_PREDIAL') {
      newName = 'Roberto Andrade (Síndico)';
      newDoc = undefined;
    }

    const updated: User = {
      ...user,
      role: newRole,
      name: newName,
      docRegistration: newDoc,
      email: newRole === 'DEV' ? (user.id === 'usr_dev_ale' || user.email === 'ale11062@gmail.com' ? 'ale11062@gmail.com' : 'dev@castinspect.com.br') : `${newRole.toLowerCase()}@${company?.tradeName?.toLowerCase().includes('alpha') ? 'alpha.com.br' : 'cast.com.br'}`,
    };

    setUser(updated);
    localStorage.setItem('cast_inspect_user', JSON.stringify(updated));
  };

  // Switch company (demonstrating multi-empresa data isolation)
  const switchCompany = (newCompanyId: string) => {
    const targetComp = availableCompanies.find((c) => c.id === newCompanyId);
    if (!targetComp) return;

    setCompany(targetComp);
    localStorage.setItem('cast_inspect_company', JSON.stringify(targetComp));

    if (user) {
      const updatedUser: User = {
        ...user,
        companyId: newCompanyId,
        companyName: targetComp.name,
      };
      setUser(updatedUser);
      localStorage.setItem('cast_inspect_user', JSON.stringify(updatedUser));
    }
  };

  // Permission flags based on role
  const isDev = user?.role === 'DEV';
  // A alternância rápida de perfis só é permitida se o acesso original foi autenticado como DEV
  const canSwitchRoles = originalRole === 'DEV';
  const canManageUsers = user?.role === 'GERENTE';
  const canManageCompanies = user?.role === 'GERENTE' || user?.role === 'DEV';
  const canManageCondos = user?.role === 'GERENTE' || user?.role === 'SUPERVISOR';
  const canExecuteInspection = user?.role === 'TECNICO' || user?.role === 'SUPERVISOR' || user?.role === 'GERENTE';
  const canApproveOrSupervise = user?.role === 'SUPERVISOR' || user?.role === 'GERENTE';

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        availableCompanies,
        token,
        loading,
        login,
        logout,
        switchRole,
        switchCompany,
        canManageUsers,
        canManageCompanies,
        canManageCondos,
        canExecuteInspection,
        canApproveOrSupervise,
        isDev,
        canSwitchRoles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
