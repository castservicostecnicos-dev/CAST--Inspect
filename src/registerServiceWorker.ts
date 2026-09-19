/**
 * Garante a desinstalação de qualquer Service Worker legado e limpeza de cache
 * para garantir que o app sempre carregue a versão mais recente diretamente.
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;

  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().catch(() => {});
        }
      }).catch(() => {});
    }

    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          caches.delete(name).catch(() => {});
        }
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('[PWA] Limpeza de cache/SW:', err);
  }
}

