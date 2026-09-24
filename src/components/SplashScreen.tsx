import React, { useState, useEffect, useRef } from 'react';
import {
  ClipboardCheck,
  Server,
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Activity,
  Zap,
  ShieldCheck,
  FileCheck2,
  TrendingUp,
  WifiOff,
  Building2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface SplashScreenProps {
  message?: string;
  onReady?: () => void;
  minDurationMs?: number;
}

interface SlideItem {
  id: string;
  tag: string;
  title: string;
  description: string;
  highlight: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeBg: string;
  borderGlow: string;
  dotColor: string;
}

const PRESENTATION_SLIDES: SlideItem[] = [
  {
    id: 'abnt',
    tag: 'Normas Técnicas ABNT',
    title: 'Inspeção Predial Conforme NBR 16747 & 5674',
    description:
      'Checklists estruturados rigorosamente para verificação do estado de conservação, segurança estrutural e manutenção preventiva das edificações.',
    highlight: 'Laudos com fundamentação técnica e jurídica',
    icon: ShieldCheck,
    accentColor: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    borderGlow: 'border-cyan-500/30 shadow-cyan-500/10',
    dotColor: 'bg-cyan-400',
  },
  {
    id: 'art',
    tag: 'Engenharia Diagnóstica',
    title: 'Laudos Periciais com Emissão de ART / RRT',
    description:
      'Gere relatórios completos em PDF com registro de responsabilidade técnica, fotos com timestamp, geolocalização e assinaturas profissionais.',
    highlight: 'Relatórios completos em PDF com 1 clique',
    icon: FileCheck2,
    accentColor: 'text-blue-400',
    badgeBg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    borderGlow: 'border-blue-500/30 shadow-blue-500/10',
    dotColor: 'bg-blue-400',
  },
  {
    id: 'gut',
    tag: 'Classificação de Risco',
    title: 'Matriz GUT e Priorização de Anomalias',
    description:
      'Classificação técnica por Gravidade, Urgência e Tendência. O sistema orienta síndicos e gestores nas manutenções mais críticas.',
    highlight: 'Foco prioritário na segurança da edificação',
    icon: TrendingUp,
    accentColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    borderGlow: 'border-emerald-500/30 shadow-emerald-500/10',
    dotColor: 'bg-emerald-400',
  },
  {
    id: 'offline',
    tag: 'Tecnologia PWA Offline',
    title: 'Vistorias em Campo 100% Sem Sinal',
    description:
      'Inspecione subsolos, garagens e casas de máquinas sem conexão. Todas as fotos e anotações são salvas localmente e sincronizam na nuvem.',
    highlight: 'Operação ininterrupta em qualquer ambiente',
    icon: WifiOff,
    accentColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    borderGlow: 'border-amber-500/30 shadow-amber-500/10',
    dotColor: 'bg-amber-400',
  },
  {
    id: 'sindico',
    tag: 'Gestão Condominial',
    title: 'Portal do Síndico & Plano de Manutenção',
    description:
      'Painel exclusivo para síndicos e administradoras acompanharem prazos de inspeções, planos de ação corretiva e notificações em tempo real.',
    highlight: 'Transparência e conformidade na gestão predial',
    icon: Building2,
    accentColor: 'text-purple-400',
    badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    borderGlow: 'border-purple-500/30 shadow-purple-500/10',
    dotColor: 'bg-purple-400',
  },
  {
    id: 'security',
    tag: 'Segurança & Nuvem Blindada',
    title: 'Ambiente Multitenant com Backup Contínuo',
    description:
      'Segregação total de dados por empresa e condomínio. Criptografia de ponta a ponta e redundância em nuvem de alta disponibilidade.',
    highlight: 'Conformidade LGPD e integridade de registros',
    icon: Lock,
    accentColor: 'text-teal-400',
    badgeBg: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    borderGlow: 'border-teal-500/30 shadow-teal-500/10',
    dotColor: 'bg-teal-400',
  },
];

export const SplashScreen: React.FC<SplashScreenProps> = ({
  message,
  onReady,
  minDurationMs = 800,
}) => {
  const [progress, setProgress] = useState<number>(10);
  const [statusText, setStatusText] = useState<string>(
    message || 'Conectando ao servidor seguro...'
  );
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [showRenderTip, setShowRenderTip] = useState<boolean>(false);
  const [hasTimeoutError, setHasTimeoutError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  // Rotating presentation slides state
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isSlideFading, setIsSlideFading] = useState<boolean>(false);

  const isMountedRef = useRef<boolean>(true);
  const serverHealthyRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(Date.now());

  // Automatic slide rotation every 4.2 seconds
  useEffect(() => {
    const slideInterval = setInterval(() => {
      if (!isMountedRef.current || serverHealthyRef.current) return;
      handleNextSlide();
    }, 4200);

    return () => {
      clearInterval(slideInterval);
    };
  }, [currentSlideIndex]);

  const changeSlide = (newIndex: number) => {
    setIsSlideFading(true);
    setTimeout(() => {
      if (!isMountedRef.current) return;
      setCurrentSlideIndex(newIndex);
      setIsSlideFading(false);
    }, 200);
  };

  const handleNextSlide = () => {
    const nextIdx = (currentSlideIndex + 1) % PRESENTATION_SLIDES.length;
    changeSlide(nextIdx);
  };

  const handlePrevSlide = () => {
    const prevIdx =
      (currentSlideIndex - 1 + PRESENTATION_SLIDES.length) %
      PRESENTATION_SLIDES.length;
    changeSlide(prevIdx);
  };

  // Timer counter for elapsed time
  useEffect(() => {
    isMountedRef.current = true;
    const timer = setInterval(() => {
      if (!isMountedRef.current || serverHealthyRef.current) return;
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);

      // Show Render.com explanation if taking more than 8 seconds (typical cold-start)
      if (elapsed >= 8) {
        setShowRenderTip(true);
      }

      // Show timeout warning and manual retry option after 65 seconds
      if (elapsed >= 65) {
        setHasTimeoutError(true);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  // Smooth running progress bar animation
  useEffect(() => {
    const progressInterval = setInterval(() => {
      if (!isMountedRef.current) return;

      if (serverHealthyRef.current) {
        // Accelerate quickly to 100%
        setProgress((prev) => {
          if (prev >= 100) return 100;
          return Math.min(100, prev + 15);
        });
        return;
      }

      // If server is not ready yet, advance smoothly and realistically:
      setProgress((prev) => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;

        let target = 20;
        if (elapsed > 2) target = 35;
        if (elapsed > 5) target = 55;
        if (elapsed > 12) target = 72;
        if (elapsed > 20) target = 84;
        if (elapsed > 35) target = 92;
        if (elapsed > 50) target = 96;

        if (prev < target) {
          const step = Math.max(0.5, (target - prev) * 0.1);
          return Math.min(target, Math.round((prev + step) * 10) / 10);
        }
        return prev;
      });

      // Update contextual text based on progress & elapsed time
      if (!message && !serverHealthyRef.current) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        if (elapsed < 3) {
          setStatusText('Iniciando aplicação CAST Inspect...');
        } else if (elapsed < 8) {
          setStatusText('Conectando aos serviços em nuvem...');
        } else if (elapsed < 20) {
          setStatusText('Despertando servidor em nuvem (Render.com)...');
        } else if (elapsed < 35) {
          setStatusText('Carregando banco de dados e APIs operacionais...');
        } else if (elapsed < 50) {
          setStatusText('Servidor em inicialização, aguarde alguns instantes...');
        } else {
          setStatusText('Finalizando inicialização do ambiente...');
        }
      }
    }, 120);

    return () => {
      clearInterval(progressInterval);
    };
  }, [message]);

  // Active Health Probe / Server Wake-up loop
  useEffect(() => {
    let checkTimeout: any = null;

    async function probeServer() {
      if (!isMountedRef.current || serverHealthyRef.current) return;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch('/api/health', {
          signal: controller.signal,
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });

        clearTimeout(timeoutId);

        if (res.ok && isMountedRef.current) {
          const data = await res.json().catch(() => ({}));
          if (data.status === 'ok' || res.status === 200) {
            handleServerReady();
            return;
          }
        }
      } catch (err) {
        // Expected during Render.com cold start while server boots
      }

      // If not yet ready, schedule next probe
      if (isMountedRef.current && !serverHealthyRef.current) {
        checkTimeout = setTimeout(probeServer, 1500);
      }
    }

    probeServer();

    return () => {
      if (checkTimeout) clearTimeout(checkTimeout);
    };
  }, [retryCount]);

  const handleServerReady = () => {
    if (serverHealthyRef.current) return;
    serverHealthyRef.current = true;
    setIsReady(true);
    setProgress(100);
    setStatusText('Servidor conectado com sucesso!');

    try {
      sessionStorage.setItem('cast_server_warmed_at', Date.now().toString());
    } catch {
      // ignore
    }

    const elapsedTotal = Date.now() - startTimeRef.current;
    const remainingToMin = Math.max(0, minDurationMs - elapsedTotal);

    // Wait a brief moment to show 100% completion before smooth fade-out
    setTimeout(() => {
      if (!isMountedRef.current) return;
      setIsFadingOut(true);

      setTimeout(() => {
        if (!isMountedRef.current) return;
        if (onReady) {
          onReady();
        }
      }, 450);
    }, remainingToMin + 350);
  };

  const handleManualRetry = () => {
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    setHasTimeoutError(false);
    setProgress(15);
    setStatusText('Tentando reconectar ao servidor...');
    setRetryCount((prev) => prev + 1);
  };

  const handleBypass = () => {
    handleServerReady();
  };

  const currentSlide = PRESENTATION_SLIDES[currentSlideIndex];
  const SlideIcon = currentSlide.icon;

  return (
    <div
      id="splash-screen"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-between bg-slate-950 text-white px-4 py-6 sm:py-8 overflow-y-auto select-none transition-all duration-500 ease-out ${
        isFadingOut
          ? 'opacity-0 scale-95 pointer-events-none'
          : 'opacity-100 scale-100'
      }`}
    >
      {/* Radiant Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Decorative Grid Mesh overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #38bdf8 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-col items-center text-center w-full max-w-md my-auto">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-4 sm:mb-5">
          {/* Brand Icon with Pulsing Halo */}
          <div className="relative mb-3">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 ring-1 ring-cyan-400/40 relative z-10 transition-transform duration-300">
              <ClipboardCheck className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-md" />
            </div>
            <div className="absolute -inset-1.5 rounded-2xl bg-cyan-500/20 blur-md animate-pulse -z-10" />
            <div className="absolute -inset-3 rounded-2xl bg-blue-600/15 blur-xl -z-20" />
          </div>

          {/* Typography */}
          <div className="flex items-center justify-center gap-2 mb-0.5">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-sans">
              CAST
            </h1>
            <span className="text-[10px] sm:text-[11px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-xs">
              INSPECT
            </span>
          </div>

          <p className="text-[11px] sm:text-xs text-slate-400 font-medium tracking-wide">
            Vistorias Técnicas Periódicas em Condomínios
          </p>
        </div>

        {/* ======================================================== */}
        {/* ROTATING PRESENTATION SLIDE CARD                         */}
        {/* ======================================================== */}
        <div className="w-full relative mb-4">
          <div
            className={`w-full bg-slate-900/90 rounded-2xl p-4 sm:p-5 border shadow-2xl backdrop-blur-md transition-all duration-300 text-left relative overflow-hidden ${currentSlide.borderGlow}`}
          >
            {/* Background Accent subtle glow */}
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

            <div
              className={`transition-all duration-200 ease-in-out ${
                isSlideFading
                  ? 'opacity-0 translate-y-1 scale-[0.98]'
                  : 'opacity-100 translate-y-0 scale-100'
              }`}
            >
              {/* Category Tag & Slide Counter */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${currentSlide.badgeBg}`}
                >
                  <SlideIcon className="w-3 h-3 shrink-0" />
                  <span>{currentSlide.tag}</span>
                </span>

                <span className="text-[10px] font-mono font-medium text-slate-400">
                  {currentSlideIndex + 1} / {PRESENTATION_SLIDES.length}
                </span>
              </div>

              {/* Slide Title */}
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug mb-1.5">
                {currentSlide.title}
              </h3>

              {/* Slide Description */}
              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed mb-3">
                {currentSlide.description}
              </p>

              {/* Value Proposition Highlight */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-[10px] sm:text-[11px] font-semibold text-slate-200">
                <Sparkles className={`w-3 h-3 ${currentSlide.accentColor}`} />
                <span>{currentSlide.highlight}</span>
              </div>
            </div>

            {/* Slide Navigation Controls */}
            <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-slate-800/80">
              {/* Dots */}
              <div className="flex items-center gap-1.5">
                {PRESENTATION_SLIDES.map((slide, idx) => (
                  <button
                    key={slide.id}
                    onClick={() => changeSlide(idx)}
                    title={`Ir para ${slide.title}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentSlideIndex
                        ? `w-5 ${currentSlide.dotColor} shadow-[0_0_8px_rgba(56,189,248,0.7)]`
                        : 'w-1.5 bg-slate-700 hover:bg-slate-500'
                    }`}
                  />
                ))}
              </div>

              {/* Prev / Next buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevSlide}
                  aria-label="Slide anterior"
                  className="p-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleNextSlide}
                  aria-label="Próximo slide"
                  className="p-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RUNNING PROGRESS BAR CARD ("corre uma barrinha")          */}
        {/* ======================================================== */}
        <div className="w-full bg-slate-900/90 rounded-2xl p-4 border border-slate-800/80 shadow-2xl backdrop-blur-md mb-3">
          {/* Header with status text & numeric percentage */}
          <div className="flex items-center justify-between gap-2 text-xs font-semibold mb-2.5">
            <div className="flex items-center gap-2 text-slate-300 truncate">
              {isReady ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
              )}
              <span className="truncate text-[12px] font-medium text-slate-200">
                {statusText}
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-cyan-400 tabular-nums shrink-0">
              {Math.round(progress)}%
            </span>
          </div>

          {/* Progress Bar Track */}
          <div className="relative w-full h-2.5 sm:h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden ${
                isReady
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]'
                  : 'bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-500 shadow-[0_0_14px_rgba(56,189,248,0.5)]'
              }`}
              style={{ width: `${Math.max(6, progress)}%` }}
            >
              {/* Shimmer light sweep across the bar */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent w-full -translate-x-full animate-[shimmer_1.8s_infinite]" />
            </div>
          </div>

          {/* Micro status footer under bar */}
          <div className="flex items-center justify-between mt-2.5 text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1 text-slate-400">
              <Server className="w-3 h-3 text-cyan-500" />
              Servidor Cloud
            </span>
            {elapsedSeconds > 0 && !isReady && (
              <span className="text-slate-400 font-mono text-[10px]">
                {elapsedSeconds}s decorridos
              </span>
            )}
            {isReady && (
              <span className="text-emerald-400 font-semibold text-[11px]">
                Conectado
              </span>
            )}
          </div>
        </div>

        {/* Render.com Cold Start Notice Card (shows after 8s) */}
        {showRenderTip && !isReady && (
          <div className="w-full bg-blue-950/40 border border-blue-800/40 rounded-xl p-3 text-left text-xs text-slate-300 backdrop-blur-xs space-y-1.5 animate-fadeIn mb-3">
            <div className="flex items-center gap-1.5 font-bold text-cyan-300 text-[11px]">
              <Cloud className="w-3.5 h-3.5 shrink-0" />
              <span>Inicialização do Servidor (Render.com)</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              O servidor gratuito do Render entra em modo de repouso após
              inatividade. O primeiro acesso leva cerca de <strong>30 a 50 segundos</strong> para
              despertar todos os serviços. As próximas operações serão imediatas.
            </p>
          </div>
        )}

        {/* Timeout Fallback Action if Render takes unusually long */}
        {hasTimeoutError && !isReady && (
          <div className="w-full bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 text-center text-xs space-y-2 animate-fadeIn mb-3">
            <div className="flex items-center justify-center gap-1.5 font-bold text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Servidor demorando para responder</span>
            </div>
            <p className="text-[11px] text-slate-300">
              O servidor ainda está concluindo o boot. Você pode forçar nova tentativa
              ou abrir o aplicativo diretamente.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={handleManualRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-xs font-bold transition-colors shadow-sm"
              >
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Tentar Novamente</span>
              </button>
              <button
                onClick={handleBypass}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-xs font-medium transition-colors"
              >
                <span>Continuar</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="relative z-10 text-center text-[10px] text-slate-400 tracking-widest uppercase flex items-center justify-center gap-1.5 font-semibold mt-4">
        <Zap className="w-3 h-3 text-cyan-400" />
        CAST Inspect — Segurança e Conformidade Técnica
      </div>
    </div>
  );
};
