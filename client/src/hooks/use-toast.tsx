import { useState, useCallback } from 'react';
import { ToastAndroid } from 'react-native';

type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  duration?: number;
  position?: 'top' | 'bottom';
}

interface ToastProps {
  message: string;
  type: ToastType;
  options?: ToastOptions;
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  dismiss: () => void;
  update: (props: any) => void;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((
    props: ToastProps
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    
    ToastAndroid.showWithGravity(
      props.message,
      props.options?.duration || ToastAndroid.SHORT,
      props.options?.position === 'top' ? ToastAndroid.TOP : ToastAndroid.BOTTOM
    );

    const newToast: Toast = {
      id,
      message: props.message,
      type: props.type,
      dismiss: () => {
        setToasts(prev => prev.filter(t => t.id !== id));
      },
      update: (props: any) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, ...props } : t));
      }
    };

    setToasts(prev => [...prev, newToast]);
    return newToast;
  }, []);

  const dismiss = useCallback((toastId?: string) => {
    if (toastId) {
      setToasts(prev => prev.filter(t => t.id !== toastId));
    } else {
      setToasts([]);
    }
  }, []);

  return {
    toast,
    dismiss,
    toasts,
  };
} 