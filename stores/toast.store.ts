import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info' | 'warning';
type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

interface ToastAction {
  label: string;
  onPress: () => void;
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
}

interface ToastPayload {
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
  position?: ToastPosition;
  highlightTitle?: boolean;
  action?: ToastAction;
  onDismiss?: () => void;
}

interface Toast {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  duration: number;
  position: ToastPosition;
  highlightTitle?: boolean;
  action?: ToastAction;
  onDismiss?: () => void;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string | ToastPayload, type?: ToastType, duration?: number) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  show: (input, fallbackType = 'info', fallbackDuration = 3000) => {
    const payload =
      typeof input === 'string'
        ? {
            message: input,
            type: fallbackType,
            duration: fallbackDuration,
          }
        : {
            ...input,
            type: input.type ?? fallbackType,
            duration: input.duration ?? fallbackDuration,
          };

    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id,
          title: payload.title,
          message: payload.message,
          type: payload.type ?? 'info',
          duration: payload.duration ?? 3000,
          position: payload.position ?? 'top-right',
          highlightTitle: payload.highlightTitle,
          action: payload.action,
          onDismiss: payload.onDismiss,
        },
      ],
    }));

    if ((payload.duration ?? 3000) > 0) {
      setTimeout(() => {
        payload.onDismiss?.();
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, payload.duration ?? 3000);
    }
  },

  dismiss: (id) => {
    set((state) => {
      const toast = state.toasts.find((t) => t.id === id);
      toast?.onDismiss?.();
      return {
        toasts: state.toasts.filter((t) => t.id !== id),
      };
    });
  },

  clear: () => set({ toasts: [] }),
}));
