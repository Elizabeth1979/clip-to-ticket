import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    primaryAction?: {
        label: string;
        onClick: () => void;
        variant?: 'primary' | 'danger';
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    primaryAction,
    secondaryAction,
}) => {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md bg-white rounded-2xl shadow-xl transform transition-all animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <h2 id="modal-title" className="text-xl font-semibold text-slate-900 mb-2">
                        {title}
                    </h2>
                    <div className="text-slate-600 mb-6">
                        {children}
                    </div>

                    <div className="flex justify-end gap-3">
                        {secondaryAction && (
                            <button
                                onClick={secondaryAction.onClick}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                            >
                                {secondaryAction.label}
                            </button>
                        )}
                        {primaryAction && (
                            <button
                                onClick={primaryAction.onClick}
                                className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${primaryAction.variant === 'danger'
                                        ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                                        : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                                    }`}
                            >
                                {primaryAction.label}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
