import React, { useState } from 'react';

interface JsonViewerProps {
    data: any;
    level?: number;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data, level = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels

    if (data === null || data === undefined) {
        return <span className="text-slate-400">null</span>;
    }

    if (typeof data !== 'object') {
        // Primitive values
        if (typeof data === 'string') {
            // Check if it's a URL
            if (data.startsWith('http://') || data.startsWith('https://')) {
                return (
                    <a
                        href={data}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline"
                    >
                        "{data}"
                    </a>
                );
            }
            // Check if it contains HTML
            if (data.includes('<') && data.includes('>')) {
                return (
                    <span className="text-green-400">
                        <HtmlRenderer html={data} />
                    </span>
                );
            }
            return <span className="text-green-400">"{data}"</span>;
        }
        if (typeof data === 'number') {
            return <span className="text-yellow-400">{data}</span>;
        }
        if (typeof data === 'boolean') {
            return <span className="text-purple-400">{data.toString()}</span>;
        }
        return <span className="text-slate-300">{String(data)}</span>;
    }

    const isArray = Array.isArray(data);
    const entries = isArray ? data : Object.entries(data);
    const isEmpty = isArray ? data.length === 0 : Object.keys(data).length === 0;

    if (isEmpty) {
        return <span className="text-slate-400">{isArray ? '[]' : '{}'}</span>;
    }

    const indent = '  '.repeat(level);
    const childIndent = '  '.repeat(level + 1);

    return (
        <div className="inline">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
            >
                <span className="inline-flex items-center gap-1">
                    <svg
                        className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
                    </svg>
                    <span>{isArray ? '[' : '{'}</span>
                </span>
            </button>

            {isExpanded && (
                <div className="ml-4">
                    {isArray ? (
                        data.map((item: any, index: number) => (
                            <div key={index} className="leading-relaxed">
                                <JsonViewer data={item} level={level + 1} />
                                {index < data.length - 1 && <span className="text-slate-400">,</span>}
                            </div>
                        ))
                    ) : (
                        Object.entries(data).map(([key, value], index, arr) => (
                            <div key={key} className="leading-relaxed">
                                <span className="text-blue-300">"{key}"</span>
                                <span className="text-slate-400">: </span>
                                <JsonViewer data={value} level={level + 1} />
                                {index < arr.length - 1 && <span className="text-slate-400">,</span>}
                            </div>
                        ))
                    )}
                </div>
            )}

            {isExpanded && (
                <div>
                    <span className="text-slate-400">{isArray ? ']' : '}'}</span>
                </div>
            )}

            {!isExpanded && (
                <span className="text-slate-500">
                    {isArray ? `...${data.length} items]` : `...${Object.keys(data).length} properties}`}
                </span>
            )}
        </div>
    );
};

// Component to render HTML content safely
const HtmlRenderer: React.FC<{ html: string }> = ({ html }) => {
    // Strip HTML tags but preserve links
    const linkRegex = /<a\s+href="([^"]*)"(?:\s+title="[^"]*")?>(.*?)<\/a>/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
        // Add text before the link
        if (match.index > lastIndex) {
            const textBefore = html.slice(lastIndex, match.index).replace(/<[^>]+>/g, '');
            if (textBefore) parts.push(textBefore);
        }

        // Add the link
        parts.push(
            <a
                key={match.index}
                href={match[1]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
            >
                {match[2]}
            </a>
        );

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < html.length) {
        const remaining = html.slice(lastIndex).replace(/<[^>]+>/g, '');
        if (remaining) parts.push(remaining);
    }

    return <>{parts}</>;
};
