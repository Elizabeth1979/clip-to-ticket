
import React, { useState, useMemo } from 'react';
import { AnalysisMetadata } from '../types';
import wcag22Full from '../data/wcag22-full.json';
import { AxeRulesService } from '../services/axeRulesService';
import { getAPGPatternCount, getAPGPracticeCount } from '../services/apgPatternsService';

interface TransparencyPanelProps {
    metadata: AnalysisMetadata;
    issueCount: number;
}

// Clean up the prompt for display (minimal processing - just whitespace cleanup)
const cleanPrompt = (prompt: string): string => {
    // Convert escaped newlines and clean up template literal indentation
    return prompt
        .replace(/\\n/g, '\n')
        .split('\n')
        .map(line => line.trim())
        .filter((line, idx, arr) => {
            // Remove consecutive empty lines
            if (line === '' && idx > 0 && arr[idx - 1] === '') return false;
            return true;
        })
        .join('\n')
        .trim();
};

// Extract just the instructions (skip the JSON data blocks)
const extractInstructions = (prompt: string): string => {
    const cleaned = cleanPrompt(prompt);

    // Find the boundaries of the JSON data sections
    const wcagStart = cleaned.indexOf('COMPREHENSIVE WCAG 2.2 REFERENCE:');
    const pipelineStart = cleaned.indexOf('ANALYSIS PIPELINE:');

    if (wcagStart === -1) {
        return cleaned; // No JSON data, return as-is
    }

    // Get intro (before WCAG data) and pipeline (analysis steps)
    const intro = cleaned.substring(0, wcagStart).trim();
    const pipeline = pipelineStart > 0 ? cleaned.substring(pipelineStart).trim() : '';

    return `${intro}\n\n[Reference data loaded - see summary below]\n\n${pipeline}`;
};

export const TransparencyPanel: React.FC<TransparencyPanelProps> = ({ metadata, issueCount }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Get reference data counts
    const wcagCount = useMemo(() => {
        // wcag22Full has principles > guidelines > successcriteria structure
        const data = wcag22Full as { principles: { guidelines: { successcriteria: unknown[] }[] }[] };
        let count = 0;
        for (const principle of data.principles) {
            for (const guideline of principle.guidelines) {
                count += guideline.successcriteria?.length || 0;
            }
        }
        return count;
    }, []);

    const axeRuleCount = AxeRulesService.getRuleCount();
    const apgPatternCount = getAPGPatternCount();
    const apgPracticeCount = getAPGPracticeCount();

    // Clean the prompt for display
    const displayPrompt = useMemo(() => extractInstructions(metadata.systemPrompt), [metadata.systemPrompt]);

    return (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-4 md:px-8 md:py-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <h3 className="text-base font-semibold text-slate-900">
                            System Prompt
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            View the exact instructions sent to the AI for this analysis
                        </p>
                    </div>
                </div>
                <svg
                    className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isExpanded && (
                <div className="border-t border-slate-100 animate-in slide-in-from-top-4 duration-300 max-w-full">
                    <div className="p-4 md:p-8 space-y-6 max-w-full">
                        {/* Reference Data Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                                <div className="text-2xl font-bold text-blue-700">{wcagCount}</div>
                                <div className="text-sm text-blue-600">WCAG 2.2 Criteria</div>
                            </div>
                            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                                <div className="text-2xl font-bold text-purple-700">{axeRuleCount}</div>
                                <div className="text-sm text-purple-600">Axe-core Rules</div>
                            </div>
                            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                                <div className="text-2xl font-bold text-emerald-700">{apgPatternCount + apgPracticeCount}</div>
                                <div className="text-sm text-emerald-600">APG Patterns & Practices</div>
                            </div>
                        </div>

                        {/* AI Instructions */}
                        <div>
                            <h4 className="text-sm tracking-widest text-slate-900 mb-3">
                                AI Instructions
                            </h4>
                            <div className="bg-slate-50 rounded-xl p-4 md:p-6 max-h-[500px] overflow-y-auto overflow-x-hidden custom-scrollbar max-w-full">
                                <pre className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words font-mono max-w-full">
                                    {displayPrompt}
                                </pre>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end">
                            <button
                                onClick={() => navigator.clipboard.writeText(metadata.systemPrompt)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm tracking-widest rounded-lg transition-colors"
                            >
                                Copy Full Prompt (with JSON data)
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }`}</style>
        </div>
    );
};
