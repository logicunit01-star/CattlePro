import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmOptions {
    title?: string;
    message?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
}

export type PromptInputType = 'text' | 'number' | 'date' | 'textarea';

export interface PromptOption {
    value: string;
    label: string;
}

export interface PromptOptions {
    title?: string;
    label?: string;
    message?: React.ReactNode;
    defaultValue?: string;
    placeholder?: string;
    inputType?: PromptInputType;
    options?: PromptOption[];
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    allowEmpty?: boolean;
    validate?: (value: string) => string | null;
}

interface ConfirmContextValue {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    prompt: (options: PromptOptions) => Promise<string | null>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

type DialogState =
    | { kind: 'confirm'; id: string; options: ConfirmOptions; resolve: (v: boolean) => void }
    | { kind: 'prompt'; id: string; options: PromptOptions; resolve: (v: string | null) => void };

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [dialog, setDialog] = useState<DialogState | null>(null);

    const confirm = useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>(resolve => {
            setDialog({ kind: 'confirm', id: Math.random().toString(36).slice(2), options, resolve });
        });
    }, []);

    const prompt = useCallback((options: PromptOptions) => {
        return new Promise<string | null>(resolve => {
            setDialog({ kind: 'prompt', id: Math.random().toString(36).slice(2), options, resolve });
        });
    }, []);

    const close = useCallback((value: boolean | string | null) => {
        setDialog(current => {
            if (!current) return null;
            if (current.kind === 'confirm') current.resolve(Boolean(value));
            else current.resolve(typeof value === 'string' ? value : null);
            return null;
        });
    }, []);

    const value = useMemo<ConfirmContextValue>(() => ({ confirm, prompt }), [confirm, prompt]);

    return (
        <ConfirmContext.Provider value={value}>
            {children}
            {dialog?.kind === 'confirm' && (
                <ConfirmDialog
                    key={dialog.id}
                    options={dialog.options}
                    onResolve={ok => close(ok)}
                />
            )}
            {dialog?.kind === 'prompt' && (
                <PromptDialog
                    key={dialog.id}
                    options={dialog.options}
                    onResolve={val => close(val)}
                />
            )}
        </ConfirmContext.Provider>
    );
};

export function useConfirm(): ConfirmContextValue {
    const ctx = useContext(ConfirmContext);
    if (!ctx) {
        throw new Error('useConfirm must be used within a <ConfirmProvider>');
    }
    return ctx;
}

const Backdrop: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                {children}
            </div>
        </div>
    );
};

const DialogHeader: React.FC<{ title: string; danger?: boolean; onClose: () => void }> = ({ title, danger, onClose }) => (
    <div className="flex items-start justify-between px-6 pt-6">
        <div className="flex items-center gap-3">
            {danger && (
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                    <AlertTriangle size={20} />
                </div>
            )}
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        </div>
        <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-300 hover:text-slate-600 transition-colors"
        >
            <X size={18} />
        </button>
    </div>
);

const ConfirmDialog: React.FC<{ options: ConfirmOptions; onResolve: (ok: boolean) => void }> = ({ options, onResolve }) => {
    const {
        title = 'Are you sure?',
        message,
        confirmLabel = 'Confirm',
        cancelLabel = 'Cancel',
        danger = false,
    } = options;

    const cancel = useCallback(() => onResolve(false), [onResolve]);

    return (
        <Backdrop onClose={cancel}>
            <DialogHeader title={title} danger={danger} onClose={cancel} />
            {message && (
                <div className="px-6 pt-3 pb-2 text-sm text-slate-600 leading-relaxed">
                    {message}
                </div>
            )}
            <div className="px-6 py-4 mt-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <button
                    type="button"
                    onClick={cancel}
                    className="px-4 py-2 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-200 transition-colors"
                >
                    {cancelLabel}
                </button>
                <button
                    type="button"
                    onClick={() => onResolve(true)}
                    autoFocus
                    className={`px-4 py-2 rounded-lg font-bold text-sm text-white transition-colors ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                    {confirmLabel}
                </button>
            </div>
        </Backdrop>
    );
};

const PromptDialog: React.FC<{ options: PromptOptions; onResolve: (value: string | null) => void }> = ({ options, onResolve }) => {
    const {
        title = 'Enter a value',
        label,
        message,
        defaultValue = '',
        placeholder,
        inputType = 'text',
        options: choices,
        confirmLabel = 'Save',
        cancelLabel = 'Cancel',
        danger = false,
        allowEmpty = false,
        validate,
    } = options;

    const [value, setValue] = useState(defaultValue);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);

    useEffect(() => {
        const el = inputRef.current;
        if (el) {
            el.focus();
            if (el instanceof HTMLInputElement && (inputType === 'text' || inputType === 'number')) {
                el.select();
            }
        }
    }, [inputType]);

    const cancel = useCallback(() => onResolve(null), [onResolve]);

    const submit = () => {
        const trimmed = inputType === 'textarea' ? value : value.trim();
        if (!trimmed && !allowEmpty) {
            setError('This field is required.');
            return;
        }
        if (validate) {
            const err = validate(trimmed);
            if (err) {
                setError(err);
                return;
            }
        }
        onResolve(trimmed);
    };

    const onKeyDown: React.KeyboardEventHandler = e => {
        if (e.key === 'Enter' && inputType !== 'textarea') {
            e.preventDefault();
            submit();
        }
    };

    const inputClass = `w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''}`;

    return (
        <Backdrop onClose={cancel}>
            <DialogHeader title={title} danger={danger} onClose={cancel} />
            <div className="px-6 pt-3 pb-4">
                {message && <div className="text-sm text-slate-600 leading-relaxed mb-3">{message}</div>}
                {label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</label>}
                {choices && choices.length > 0 ? (
                    <select
                        ref={el => { inputRef.current = el; }}
                        value={value}
                        onChange={e => { setValue(e.target.value); setError(null); }}
                        onKeyDown={onKeyDown}
                        className={inputClass}
                    >
                        {!value && <option value="" disabled>{placeholder || 'Select...'}</option>}
                        {choices.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                ) : inputType === 'textarea' ? (
                    <textarea
                        ref={el => { inputRef.current = el; }}
                        value={value}
                        onChange={e => { setValue(e.target.value); setError(null); }}
                        placeholder={placeholder}
                        rows={4}
                        className={inputClass}
                    />
                ) : (
                    <input
                        ref={el => { inputRef.current = el; }}
                        type={inputType}
                        value={value}
                        onChange={e => { setValue(e.target.value); setError(null); }}
                        placeholder={placeholder}
                        onKeyDown={onKeyDown}
                        className={inputClass}
                    />
                )}
                {error && <p className="text-xs font-medium text-red-600 mt-1">{error}</p>}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={cancel} className="px-4 py-2 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-200 transition-colors">
                    {cancelLabel}
                </button>
                <button
                    type="button"
                    onClick={submit}
                    className={`px-4 py-2 rounded-lg font-bold text-sm text-white transition-colors ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                    {confirmLabel}
                </button>
            </div>
        </Backdrop>
    );
};
