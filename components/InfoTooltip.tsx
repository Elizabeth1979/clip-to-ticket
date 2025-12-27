
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
    const [actualPosition, setActualPosition] = useState(position);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isVisible && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const tooltipOffset = 8;
            const padding = 16; // padding from viewport edges

            // Estimate tooltip size (will be refined after render)
            const estimatedTooltipWidth = 448; // max-w-md
            const estimatedTooltipHeight = 100; // approximate

            // Determine best position based on available space
            let bestPosition = position;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Check if preferred position fits
            const spaceAbove = rect.top;
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceLeft = rect.left;
            const spaceRight = viewportWidth - rect.right;

            // Auto-adjust position if it would go off-screen
            if (position === 'top' && spaceAbove < estimatedTooltipHeight + tooltipOffset + padding) {
                bestPosition = spaceBelow > spaceAbove ? 'bottom' : 'top';
            } else if (position === 'bottom' && spaceBelow < estimatedTooltipHeight + tooltipOffset + padding) {
                bestPosition = spaceAbove > spaceBelow ? 'top' : 'bottom';
            } else if (position === 'left' && spaceLeft < estimatedTooltipWidth + tooltipOffset + padding) {
                bestPosition = spaceRight > spaceLeft ? 'right' : 'left';
            } else if (position === 'right' && spaceRight < estimatedTooltipWidth + tooltipOffset + padding) {
                bestPosition = spaceLeft > spaceRight ? 'left' : 'right';
            }

            setActualPosition(bestPosition);

            let style: React.CSSProperties = {};

            switch (bestPosition) {
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

            // Fine-tune position after tooltip renders
            setTimeout(() => {
                if (tooltipRef.current) {
                    const tooltipRect = tooltipRef.current.getBoundingClientRect();
                    let adjustedStyle = { ...style };

                    // Adjust horizontal position if needed
                    if (tooltipRect.right > viewportWidth - padding) {
                        const overflow = tooltipRect.right - (viewportWidth - padding);
                        adjustedStyle.left = (style.left as number) - overflow;
                    } else if (tooltipRect.left < padding) {
                        const overflow = padding - tooltipRect.left;
                        adjustedStyle.left = (style.left as number) + overflow;
                    }

                    // Adjust vertical position if needed
                    if (tooltipRect.bottom > viewportHeight - padding) {
                        const overflow = tooltipRect.bottom - (viewportHeight - padding);
                        adjustedStyle.top = (style.top as number) - overflow;
                    } else if (tooltipRect.top < padding) {
                        const overflow = padding - tooltipRect.top;
                        adjustedStyle.top = (style.top as number) + overflow;
                    }

                    setTooltipStyle(adjustedStyle);
                }
            }, 0);
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
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors cursor-pointer"
                    aria-label="More information"
                    aria-expanded={isVisible}
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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
                        ref={tooltipRef}
                        role="tooltip"
                        className="fixed z-[9999] pointer-events-auto"
                        style={tooltipStyle}
                    >
                        <div className="relative bg-slate-900 text-white text-sm px-5 py-4 rounded-xl shadow-2xl max-w-md whitespace-normal leading-relaxed">
                            {content}
                            <div className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`} />
                        </div>
                    </div>
                </>
            )}
        </>
    );
};
