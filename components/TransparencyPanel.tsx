
import React, { useState, useMemo } from 'react';
import { AnalysisMetadata } from '../types';
import { CostDisplay } from './CostDisplay';
import { JsonViewer } from './JsonViewer';

interface TransparencyPanelProps {
    metadata: AnalysisMetadata;
    issueCount: number;
}

// Parse the system prompt into structured sections
const parseSystemPrompt = (prompt: string) => {
    // Convert escaped newlines
    const unescaped = prompt.replace(/\\n/g, '\n');

    // Extract the main instruction text (before the JSON data)
    const jsonStartMatch = unescaped.match(/COMPREHENSIVE WCAG 2\.2 REFERENCE:\s*(\{|\[)/);
    const jsonStart = jsonStartMatch ? jsonStartMatch.index : -1;

    let instructionText = '';
    let wcagData = null;
    let axeRulesData = null;

    if (jsonStart > 0) {
        instructionText = unescaped.substring(0, jsonStart);

        // Try to extract WCAG JSON
        try {
            const wcagMatch = unescaped.match(/COMPREHENSIVE WCAG 2\.2 REFERENCE:\s*(\{[\s\S]*?\})\s*COMPLETE AXE-CORE RULES/);
            if (wcagMatch && wcagMatch[1]) {
                wcagData = JSON.parse(wcagMatch[1]);
            }
        } catch (e) {
            console.error('Failed to parse WCAG data:', e);
        }

        // Try to extract Axe Rules JSON
        try {
            const axeMatch = unescaped.match(/COMPLETE AXE-CORE RULES[^:]*:\s*(\{[\s\S]*?\})\s*QUICK REFERENCE/);
            if (axeMatch && axeMatch[1]) {
                axeRulesData = JSON.parse(axeMatch[1]);
            }
        } catch (e) {
            console.error('Failed to parse Axe rules data:', e);
        }
    } else {
        instructionText = unescaped;
    }

    // Format the instruction text to be more readable
    const formattedInstructions = instructionText
        .replace(/You are a Senior Accessibility QA Architect/g, '🎯 YOUR ROLE:\nYou\'re an accessibility expert')
        .replace(/analyzing comprehensive screen recordings that include:/g, 'reviewing screen recordings to find barriers that prevent people with disabilities from using websites and apps.\n\n📹 WHAT YOU\'RE WATCHING:')
        .replace(/- Visual UI inspection \(color, layout, focus indicators, responsive design\)/g, '• How the website/app looks visually (colors, layout, buttons, text)')
        .replace(/- Screen reader output \(NVDA, JAWS, VoiceOver, etc\.\)/g, '• What screen readers announce to blind users (NVDA, JAWS, VoiceOver)')
        .replace(/- Keyboard navigation demonstrations/g, '• How someone navigates using only a keyboard (no mouse)')
        .replace(/- Expert commentary and narration on accessibility barriers/g, '• Expert narration explaining what\'s wrong and why it matters')
        .replace(/Through this multimodal analysis, you can detect ALL WCAG 2\.2 Success Criteria\./g, '\n📚 YOUR KNOWLEDGE BASE:\nYou have access to the complete WCAG 2.2 accessibility guidelines and automated testing rules.')
        .replace(/ANALYSIS PIPELINE:/g, '\n🔍 HOW TO ANALYZE THE VIDEO:')
        .replace(/1\. TRANSCRIPT:/g, '\n📝 Step 1 - Create a Transcript:')
        .replace(/2\. DETECTION:/g, '\n🎯 Step 2 - Find Accessibility Problems:')
        .replace(/3\. STANDARDS MAPPING:/g, '\n📋 Step 3 - Match Problems to Standards:')
        .replace(/4\. TRIAGE:/g, '\n⚠️ Step 4 - Rate How Serious It Is:')
        .replace(/5\. REMEDIATION:/g, '\n🔧 Step 5 - Explain How to Fix It:')
        .replace(/ACCURACY REQUIREMENTS:/g, '\n✅ ACCURACY IS CRITICAL:')
        .replace(/FORMATTING: JSON ONLY\./g, '\n💾 OUTPUT FORMAT:\nRespond with JSON only.')
        .replace(/- Critical: Blocks access completely/g, '• Critical: Completely blocks someone from using the feature')
        .replace(/- Serious: Significant barrier to access/g, '• Serious: Creates a major barrier that\'s very difficult to work around')
        .replace(/- Moderate: Noticeable difficulty/g, '• Moderate: Causes noticeable difficulty but there\'s a workaround')
        .replace(/- Minor: Inconvenience but accessible/g, '• Minor: A small inconvenience but still accessible')
        .replace(/programmatically determined/g, 'detected by code')
        .replace(/assistive technology/g, 'screen readers and other accessibility tools');

    return {
        instructions: formattedInstructions,
        wcagData,
        axeRulesData
    };
};

export const TransparencyPanel: React.FC<TransparencyPanelProps> = ({ metadata, issueCount }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<'cost' | 'prompt'>('cost');

    // Parse the system prompt once
    const parsedPrompt = useMemo(() => parseSystemPrompt(metadata.systemPrompt), [metadata.systemPrompt]);

    return (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-8 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-black tracking-widest text-slate-900">
                            Developer Transparency
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                            View AI prompts and cost breakdown
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
                <div className="border-t border-slate-100 animate-in slide-in-from-top-4 duration-300">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-100 px-8 pt-4">
                        <button
                            onClick={() => setActiveTab('cost')}
                            className={`px-4 py-2 text-xs font-black tracking-widest transition-colors border-b-2 ${activeTab === 'cost'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            Cost Breakdown
                        </button>
                        <button
                            onClick={() => setActiveTab('prompt')}
                            className={`px-4 py-2 text-xs font-black tracking-widest transition-colors border-b-2 ${activeTab === 'prompt'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            System Prompt
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="p-8">
                        {activeTab === 'cost' && (
                            <div className="animate-in fade-in duration-300">
                                <CostDisplay costBreakdown={metadata.costBreakdown} issueCount={issueCount} />
                                <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                                    <div className="flex items-start gap-2">
                                        <svg className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            Costs are calculated based on Gemini API pricing. Video analysis uses <strong>Gemini 3 Flash</strong>
                                            ($0.075/1M input tokens, $0.30/1M output tokens). Chat uses <strong>Gemini 3 Pro</strong>
                                            ($1.25/1M input, $5.00/1M output).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'prompt' && (
                            <div className="animate-in fade-in duration-300 space-y-6">
                                {/* Instructions Section */}
                                <div>
                                    <h4 className="text-xs font-black tracking-widest text-slate-900 mb-3">
                                        AI Instructions
                                    </h4>
                                    <div className="bg-slate-50 rounded-xl p-6">
                                        <pre className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                                            {parsedPrompt.instructions}
                                        </pre>
                                    </div>
                                </div>

                                {/* WCAG Reference Data */}
                                {parsedPrompt.wcagData && (
                                    <div>
                                        <h4 className="text-xs font-black tracking-widest text-slate-900 mb-3">
                                            📖 WCAG 2.2 Reference Data
                                        </h4>
                                        <div className="bg-slate-900 rounded-xl p-6 overflow-x-auto max-h-96 overflow-y-auto custom-scrollbar">
                                            <div className="text-xs font-mono">
                                                <JsonViewer data={parsedPrompt.wcagData} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Axe Rules Data */}
                                {parsedPrompt.axeRulesData && (
                                    <div>
                                        <h4 className="text-xs font-black tracking-widest text-slate-900 mb-3">
                                            🔧 Axe-core Testing Rules
                                        </h4>
                                        <div className="bg-slate-900 rounded-xl p-6 overflow-x-auto max-h-96 overflow-y-auto custom-scrollbar">
                                            <div className="text-xs font-mono">
                                                <JsonViewer data={parsedPrompt.axeRulesData} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Copy Button */}
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => navigator.clipboard.writeText(metadata.systemPrompt)}
                                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black tracking-widest rounded-lg transition-colors"
                                    >
                                        Copy Full Prompt
                                    </button>
                                </div>

                                {/* Info Note */}
                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                    <div className="flex items-start gap-2">
                                        <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        <p className="text-xs text-amber-900 leading-relaxed">
                                            This prompt contains comprehensive WCAG 2.2 and Axe-core rule data. Click on the arrows to expand/collapse JSON sections and explore the reference materials.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }`}</style>
        </div>
    );
};
