
import React, { useState } from 'react';
import { AnalysisMetadata } from '../types';
import { CostDisplay } from './CostDisplay';

interface TransparencyPanelProps {
    metadata: AnalysisMetadata;
    issueCount: number;
}

export const TransparencyPanel: React.FC<TransparencyPanelProps> = ({ metadata, issueCount }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<'prompt' | 'cost' | 'timeline'>('cost');

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    const getStageIcon = (status: string) => {
        switch (status) {
            case 'complete':
                return (
                    <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                );
            case 'running':
                return (
                    <svg className="w-4 h-4 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                );
            case 'error':
                return (
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-4 h-4 text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                    </svg>
                );
        }
    };

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
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">
                            Developer Transparency
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                            View prompts, costs, and processing details
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
                            className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors border-b-2 ${activeTab === 'cost'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            Cost Breakdown
                        </button>
                        <button
                            onClick={() => setActiveTab('timeline')}
                            className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors border-b-2 ${activeTab === 'timeline'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            Processing Timeline
                        </button>
                        <button
                            onClick={() => setActiveTab('prompt')}
                            className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors border-b-2 ${activeTab === 'prompt'
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

                        {activeTab === 'timeline' && (
                            <div className="animate-in fade-in duration-300 space-y-4">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">
                                            Processing Stages
                                        </h4>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Total time: {formatDuration(metadata.processingTimeMs)}
                                        </p>
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        Model: <span className="font-bold text-slate-600">{metadata.model}</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {metadata.stages.map((stage, idx) => {
                                        const duration = stage.endTime ? stage.endTime - stage.startTime : 0;
                                        return (
                                            <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                                                {getStageIcon(stage.status)}
                                                <div className="flex-1">
                                                    <div className="text-sm font-bold text-slate-900">{stage.name}</div>
                                                    {stage.endTime && (
                                                        <div className="text-xs text-slate-500 mt-0.5">
                                                            {formatDuration(duration)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${stage.status === 'complete' ? 'bg-emerald-100 text-emerald-700' :
                                                        stage.status === 'running' ? 'bg-indigo-100 text-indigo-700' :
                                                            stage.status === 'error' ? 'bg-red-100 text-red-700' :
                                                                'bg-slate-200 text-slate-500'
                                                    }`}>
                                                    {stage.status}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {activeTab === 'prompt' && (
                            <div className="animate-in fade-in duration-300">
                                <div className="mb-4 flex items-center justify-between">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">
                                        System Instruction
                                    </h4>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(metadata.systemPrompt)}
                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors"
                                    >
                                        Copy
                                    </button>
                                </div>
                                <div className="bg-slate-900 rounded-xl p-6 overflow-x-auto max-h-96 overflow-y-auto custom-scrollbar">
                                    <pre className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                                        {metadata.systemPrompt}
                                    </pre>
                                </div>
                                <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                                    <div className="flex items-start gap-2">
                                        <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        <p className="text-xs text-amber-900 leading-relaxed">
                                            This prompt contains comprehensive WCAG 2.2 and Axe-core rule data to ensure accurate accessibility analysis.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
