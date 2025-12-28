
import React, { useState, useMemo } from 'react';
import { AnalysisMetadata } from '../types';
import { CostDisplay } from './CostDisplay';
import { JsonViewer } from './JsonViewer';
import wcag22Full from '../data/wcag22-full.json';
import { AxeRulesService } from '../services/axeRulesService';

interface TransparencyPanelProps {
    metadata: AnalysisMetadata;
    issueCount: number;
}

// Parse the system prompt into structured sections
const parseSystemPrompt = (prompt: string) => {
    // Convert escaped newlines
    const unescaped = prompt.replace(/\\n/g, '\n');

    // Find the split points
    const jsonStart = unescaped.indexOf('COMPREHENSIVE WCAG 2.2 REFERENCE:');
    const pipelineStart = unescaped.indexOf('ANALYSIS PIPELINE:');

    // Extract intro and pipeline, skipping the JSON blocks in the middle
    let introText = jsonStart > 0 ? unescaped.substring(0, jsonStart) : unescaped;
    let pipelineText = pipelineStart > 0 ? unescaped.substring(pipelineStart) : '';

    // Combine them while cleaning up leading whitespace from template literal indentation
    const instructionText = (introText + '\n' + pipelineText)
        .split('\n')
        .map(line => line.trim())
        .join('\n');

    let wcagData = null;
    let axeRulesData = null;

    if (jsonStart > 0) {
        // Try to extract WCAG JSON
        try {
            const wcagMatch = unescaped.match(/COMPREHENSIVE WCAG 2\.2 REFERENCE:\s*([\s\S]*?)\s*COMPLETE AXE-CORE RULES/);
            if (wcagMatch && wcagMatch[1]) {
                wcagData = JSON.parse(wcagMatch[1].trim());
            }
        } catch (e) {
            console.error('Failed to parse WCAG data:', e);
        }

        // Try to extract Axe Rules JSON
        try {
            const axeRowMatch = unescaped.match(/COMPLETE AXE-CORE RULES[^:]*:\s*([\s\S]*?)\s*QUICK REFERENCE/);
            if (axeRowMatch && axeRowMatch[1]) {
                axeRulesData = JSON.parse(axeRowMatch[1].trim());
            }
        } catch (e) {
            console.error('Failed to parse Axe rules data:', e);
        }
    }

    // Format the instruction text to be more readable
    const formattedInstructions = instructionText
        .replace(/You are a Senior Accessibility QA Architect/g, '🎯 YOUR ROLE:\nYou\'re an accessibility expert')
        .replace(/analyzing (?:a screen recording|comprehensive screen recordings).*?for accessibility issues\./g, 'reviewing media to find barriers that prevent people with disabilities.\n\n📹 WHAT YOU\'RE WATCHING:')
        .replace(/analyzing comprehensive screen recordings that include:/g, 'reviewing screen recordings to find barriers that prevent people with disabilities from using websites and apps.\n\n📹 WHAT YOU\'RE WATCHING:')
        .replace(/The video includes:/g, '📹 VIDEO ANALYSIS:')
        .replace(/For screenshots:/g, '\n📸 SCREENSHOT ANALYSIS:')
        .replace(/- Visual UI inspection \(color, layout, focus indicators, responsive design\)/g, '• How the website/app looks visually (colors, layout, buttons, text)')
        .replace(/- Screen reader output \(NVDA, JAWS, VoiceOver, etc\.\)/g, '• What screen readers announce to blind users (NVDA, JAWS, VoiceOver)')
        .replace(/- Keyboard navigation demonstrations/g, '• How someone navigates using only a keyboard (no mouse)')
        .replace(/- Expert commentary and narration on accessibility barriers/g, '• Expert narration explaining what\'s wrong and why it matters')
        .replace(/Through this multimodal analysis, you can detect ALL WCAG 2\.2 Success Criteria\./g, '\n📚 YOUR KNOWLEDGE BASE:\nYou have access to the complete WCAG 2.2 accessibility guidelines and automated testing rules.')
        .replace(/ANALYSIS PIPELINE:/g, '\n🔍 HOW TO ANALYZE THE MEDIA:')
        .replace(/1\. TRANSCRIPT:/g, '\n📝 Step 1 - Create a Transcript:')
        .replace(/2\. ISSUE INTERPRETATION:/g, '\n🎯 Step 2 - Find Accessibility Problems:')
        .replace(/3\. AXE RULE & APG PATTERN MATCHING:/g, '\n📋 Step 3 - Match Problems to Standards:')
        .replace(/4\. SEVERITY ASSIGNMENT:/g, '\n⚠️ Step 4 - Rate How Serious It Is:')
        .replace(/5\. EASE OF FIX ASSESSMENT:/g, '\n🔧 Step 5 - Assess Ease of Fix:')
        .replace(/6\. REMEDIATION:/g, '\n✅ Step 6 - Explain How to Fix It:')
        .replace(/COMMON APG PRACTICE REFERENCES:/g, '\n📘 ARIA APG BEST PRACTICES:')
        .replace(/ACCURACY REQUIREMENTS:/g, '\n✅ ACCURACY IS CRITICAL:')
        .replace(/FORMATTING: JSON ONLY[\s\S]*$/g, '\n💾 OUTPUT FORMAT:\nRespond with JSON only.')
        .replace(/\* WCAG conformance level \(Level A → Critical, Level AA → Serious\)/g, '• Level A issues → Critical priority')
        .replace(/\* User impact \(blocks access → Critical, major barrier → Serious\)/g, '• Issues that block access → Critical, major barriers → Serious')
        .replace(/\* Best practices → Moderate/g, '• Best practice issues → Moderate priority')
        .replace(/\* Minor issues → Minor/g, '• Minor issues → Low priority');

    return {
        instructions: formattedInstructions,
        wcagData: wcagData || wcag22Full,
        axeRulesData: axeRulesData || AxeRulesService.getAllRules()
    };
};

export const TransparencyPanel: React.FC<TransparencyPanelProps> = ({ metadata, issueCount }) => {
    const [isExpanded, setIsExpanded] = useState(false);

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
                        <h3 className="text-base font-semibold text-slate-900">
                            System Prompt
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            View the exact instructions and reference data used for this analysis
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
                    {/* Content */}
                    <div className="p-8 space-y-6">
                        {/* Instructions Section */}
                        <div>
                            <h4 className="text-sm tracking-widest text-slate-900 mb-3">
                                AI Instructions
                            </h4>
                            <div className="bg-slate-50 rounded-xl p-6">
                                <pre className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                                    {parsedPrompt.instructions}
                                </pre>
                            </div>
                        </div>

                        {/* WCAG Reference Data */}
                        {parsedPrompt.wcagData && (
                            <div>
                                <h4 className="text-sm tracking-widest text-slate-900 mb-3">
                                    📖 WCAG 2.2 Reference Data
                                </h4>
                                <div className="bg-slate-900 rounded-xl p-6 overflow-x-auto max-h-96 overflow-y-auto custom-scrollbar">
                                    <div className="text-sm font-mono">
                                        <JsonViewer data={parsedPrompt.wcagData} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Axe Rules Data */}
                        {parsedPrompt.axeRulesData && (
                            <div>
                                <h4 className="text-sm tracking-widest text-slate-900 mb-3">
                                    🔧 Axe-core Testing Rules
                                </h4>
                                <div className="bg-slate-900 rounded-xl p-6 overflow-x-auto max-h-96 overflow-y-auto custom-scrollbar">
                                    <div className="text-sm font-mono">
                                        <JsonViewer data={parsedPrompt.axeRulesData} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Copy Button */}
                        <div className="flex justify-end">
                            <button
                                onClick={() => navigator.clipboard.writeText(metadata.systemPrompt)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm tracking-widest rounded-lg transition-colors"
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
                                <p className="text-sm text-amber-900 leading-relaxed">
                                    This prompt contains comprehensive WCAG 2.2 and Axe-core rule data. Click on the arrows to expand/collapse JSON sections and explore the reference materials.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }`}</style>
        </div>
    );
};
