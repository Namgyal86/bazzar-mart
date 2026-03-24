import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  action?: React.ReactNode;
}

let toastCount = 0;
const listeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

function dispatch(toast: Toast) {
  toasts = [...toasts, toast];
  listeners.forEach((l) => l(toasts));
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== toast.id);
    listeners.forEach((l) => l(toasts));
  }, 5000);
}

export function toast(options: Omit<Toast, 'id'>) {
  dispatch({ ...options, id: String(++toastCount) });
}

export function useToast() {
  const [localToasts, setLocalToasts] = useState<Toast[]>(toasts);

  const subscribe = useCallback(() => {
    const listener = (t: Toast[]) => setLocalToasts([...t]);
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  // Auto-subscribe on mount
  if (typeof window !== 'undefined') {
    // Only run on client
  }

  return { toasts: localToasts, toast, subscribe };
}
