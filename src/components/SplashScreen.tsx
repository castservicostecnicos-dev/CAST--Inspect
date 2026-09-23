import React from 'react';
import { ClipboardCheck, Loader2 } from 'lucide-react';

interface SplashScreenProps {
  message?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  message = 'Iniciando CAST Inspect...',
}) => {
  return (
    <div
      id="splash-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white px-4 select-none"
    >
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-950/30 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-xs animate-fadeIn">
        {/* Brand Icon */}
        <div className="relative mb-5 group">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-2xl shadow-blue-600/40 ring-1 ring-blue-400/30 transition-transform duration-300">
            <ClipboardCheck className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          {/* Subtle pulsating glow */}
          <div className="absolute -inset-1 rounded-2xl sm:rounded-3xl bg-blue-500/20 blur-sm -z-10 animate-pulse" />
        </div>

        {/* Brand Typography */}
        <div className="flex items-center justify-center gap-2 mb-1.5">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            CAST
          </h1>
          <span className="text-[11px] sm:text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30">
            INSPECT
          </span>
        </div>

        <p className="text-xs text-slate-400 font-medium tracking-wide mb-8">
          Vistorias Técnicas Periódicas
        </p>

        {/* Loading Indicator */}
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/90 border border-slate-800 shadow-inner">
          <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
          <span className="text-xs font-medium text-slate-300 tracking-wide">
            {message}
          </span>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-6 text-center text-[10px] text-slate-500 tracking-widest uppercase">
        Segurança e Conformidade Técnica
      </div>
    </div>
  );
};
