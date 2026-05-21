import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X, Loader2 } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

export interface ToastOptions {
    duration?: number;
    title?: string;
}

export interface ToastItem {
    id: string;
    type: ToastType;
    message: string;
    title?: string;
    duration: number;
}

interface ToastContextValue {
    toast: (message: string, type?: ToastType, options?: ToastOptions) => string;
    success: (message: string, options?: ToastOptions) => string;
    error: (message: string, options?: ToastOptions) => string;
    info: (message: string, options?: ToastOptions) => string;
    warning: (message: string, options?: ToastOptions) => string;
    loading: (message: string, options?: ToastOptions) => string;
    dismiss: (id: string) => void;
    update: (id: string, patch: Partial<Pick<ToastItem, 'type' | 'message' | 'title' | 'duration'>>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION: Record<ToastType, number> = {
    success: 3500,
    info: 3500,
    warning: 4500,
    error: 5000,
    loading: 0,
};

function makeId() {
    return Math.random().toString(36).slice(2, 9);
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const dismiss = useCallback((id: string) => {
        const t = timersRef.current.get(id);
        if (t) clearTimeout(t);
        timersRef.current.delete(id);
        setToasts(prev => prev.filter(x => x.id !== id));
    }, []);

    const scheduleDismiss = useCallback((id: string, duration: number) => {
        const existing = timersRef.current.get(id);
        if (existing) clearTimeout(existing);
        if (duration > 0) {
            const handle = setTimeout(() => dismiss(id), duration);
            timersRef.current.set(id, handle);
        }
    }, [dismiss]);

    const push = useCallback((message: string, type: ToastType = 'info', options?: ToastOptions) => {
        const id = makeId();
        const duration = options?.duration ?? DEFAULT_DURATION[type];
        const item: ToastItem = { id, type, message, title: options?.title, duration };
        setToasts(prev => [...prev, item]);
        scheduleDismiss(id, duration);
        return id;
    }, [scheduleDismiss]);

    const update = useCallback((id: string, patch: Partial<Pick<ToastItem, 'type' | 'message' | 'title' | 'duration'>>) => {
        setToasts(prev => prev.map(t => {
            if (t.id !== id) return t;
            const next = { ...t, ...patch };
            const dur = patch.duration ?? (patch.type ? DEFAULT_DURATION[patch.type] : t.duration);
            next.duration = dur;
            scheduleDismiss(id, dur);
            return next;
        }));
    }, [scheduleDismiss]);

    useEffect(() => () => {
        timersRef.current.forEach(t => clearTimeout(t));
        timersRef.current.clear();
    }, []);

    const value = useMemo<ToastContextValue>(() => ({
        toast: (m, t, o) => push(m, t, o),
        success: (m, o) => push(m, 'success', o),
        error: (m, o) => push(m, 'error', o),
        info: (m, o) => push(m, 'info', o),
        warning: (m, o) => push(m, 'warning', o),
        loading: (m, o) => push(m, 'loading', o),
        dismiss,
        update,
    }), [push, dismiss, update]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastViewport toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
};

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error('useToast must be used within a <ToastProvider>');
    }
    return ctx;
}

const styles: Record<ToastType, { bg: string; border: string; icon: React.ReactNode; iconWrap: string }> = {
    success: {
        bg: 'bg-white',
        border: 'border-emerald-200',
        iconWrap: 'bg-emerald-50 text-emerald-600',
        icon: <CheckCircle2 size={20} />,
    },
    error: {
        bg: 'bg-white',
        border: 'border-red-200',
        iconWrap: 'bg-red-50 text-red-600',
        icon: <XCircle size={20} />,
    },
    info: {
        bg: 'bg-white',
        border: 'border-sky-200',
        iconWrap: 'bg-sky-50 text-sky-600',
        icon: <Info size={20} />,
    },
    warning: {
        bg: 'bg-white',
        border: 'border-amber-200',
        iconWrap: 'bg-amber-50 text-amber-700',
        icon: <AlertTriangle size={20} />,
    },
    loading: {
        bg: 'bg-white',
        border: 'border-slate-200',
        iconWrap: 'bg-slate-100 text-slate-600',
        icon: <Loader2 size={20} className="animate-spin" />,
    },
};

const ToastViewport: React.FC<{ toasts: ToastItem[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => {
    if (toasts.length === 0) return null;
    return (
        <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-2 max-w-sm w-full pointer-events-none" role="region" aria-label="Notifications">
            {toasts.map(t => {
                const s = styles[t.type];
                return (
                    <div
                        key={t.id}
                        role={t.type === 'error' ? 'alert' : 'status'}
                        className={`pointer-events-auto ${s.bg} ${s.border} border rounded-xl shadow-lg shadow-slate-200/60 px-4 py-3 flex items-start gap-3 animate-fade-in`}
                    >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.iconWrap}`}>{s.icon}</div>
                        <div className="flex-1 min-w-0">
                            {t.title && <p className="text-sm font-bold text-slate-800 leading-tight">{t.title}</p>}
                            <p className={`text-sm ${t.title ? 'text-slate-500 mt-0.5' : 'text-slate-700 font-medium'} break-words`}>{t.message}</p>
                        </div>
                        {t.type !== 'loading' && (
                            <button
                                type="button"
                                onClick={() => onDismiss(t.id)}
                                aria-label="Dismiss notification"
                                className="text-slate-300 hover:text-slate-600 transition-colors flex-shrink-0"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
