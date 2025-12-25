
import React, { useState, useRef, useEffect } from 'react';

interface InfoTooltipProps {
    content: string | React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
    content,
    position = 'top',
    className = ''
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (isVisible && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const tooltipOffset = 8; // spacing from button

            let style: React.CSSProperties = {};

            switch (position) {
                case 'top':
                    style = {
                        left: rect.left + rect.width / 2,
                        top: rect.top - tooltipOffset,
                        transform: 'translate(-50%, -100%)'
                    };
                    break;
                case 'bottom':
                    style = {
                        left: rect.left + rect.width / 2,
                        top: rect.bottom + tooltipOffset,
                        transform: 'translate(-50%, 0)'
                    };
                    break;
                case 'left':
                    style = {
                        left: rect.left - tooltipOffset,
                        top: rect.top + rect.height / 2,
                        transform: 'translate(-100%, -50%)'
                    };
                    break;
                case 'right':
                    style = {
                        left: rect.right + tooltipOffset,
                        top: rect.top + rect.height / 2,
                        transform: 'translate(0, -50%)'
                    };
                    break;
            }

            setTooltipStyle(style);
        }
    }, [isVisible, position]);

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-slate-900',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-slate-900',
        left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-slate-900',
        right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-slate-900',
    };

    return (
        <>
            <div className={`relative inline-flex ${className}`}>
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsVisible(!isVisible);
                    }}
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                    aria-label="More information"
                    aria-expanded={isVisible}
                >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            {isVisible && (
                <>
                    {/* Backdrop to close tooltip when clicking outside */}
                    <div
                        className="fixed inset-0 z-[9998]"
                        onClick={() => setIsVisible(false)}
                    />
                    <div
                        role="tooltip"
                        className="fixed z-[9999] pointer-events-auto animate-in fade-in duration-200"
                        style={tooltipStyle}
                    >
                        <div className="relative bg-slate-900 text-white text-sm font-medium px-5 py-4 rounded-xl shadow-2xl max-w-md whitespace-normal leading-relaxed">
                            {content}
                            <div className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`} />
                        </div>
                    </div>
                </>
            )}
        </>
    );
};
