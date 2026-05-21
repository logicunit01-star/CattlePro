import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, ExternalLink } from 'lucide-react';
import { isVideoUrl } from '../services/uploadService';

export function MediaPreviewModal({
    url,
    title,
    onClose,
}: {
    url: string;
    title?: string;
    onClose: () => void;
}) {
    const video = isVideoUrl(url);

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.72)' }}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Media preview'}
        >
            <div
                className="relative flex flex-col w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close preview"
                    className="absolute top-3 right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                    <X size={22} strokeWidth={2.5} />
                </button>

                <div className="flex items-center justify-between gap-4 px-5 py-4 pr-16 border-b border-slate-200 bg-slate-50 shrink-0">
                    <p className="text-sm sm:text-base font-bold text-slate-800 truncate">
                        {title || (video ? 'Video preview' : 'Image preview')}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Open in new tab"
                        >
                            <ExternalLink size={18} />
                        </a>
                        <a
                            href={url}
                            download
                            className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Download"
                        >
                            <Download size={18} />
                        </a>
                        <button
                            type="button"
                            onClick={onClose}
                            className="hidden sm:inline-flex items-center gap-1.5 ml-1 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 transition-colors"
                        >
                            <X size={14} /> Close
                        </button>
                    </div>
                </div>

                <div className="flex-1 min-h-[240px] flex items-center justify-center bg-slate-100 p-5 sm:p-8 overflow-auto">
                    <div className="inline-flex max-w-full max-h-full items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-2 shadow-inner">
                        {video ? (
                            <video
                                src={url}
                                controls
                                playsInline
                                className="block max-w-full max-h-[min(68vh,680px)] w-auto h-auto rounded-lg"
                            >
                                Your browser does not support video playback.
                            </video>
                        ) : (
                            <img
                                src={url}
                                alt={title || 'Preview'}
                                className="block max-w-full max-h-[min(68vh,680px)] w-auto h-auto rounded-lg object-contain select-none"
                                draggable={false}
                            />
                        )}
                    </div>
                </div>

                <div className="px-5 py-3 border-t border-slate-200 bg-white shrink-0 flex justify-end sm:hidden">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2.5 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
