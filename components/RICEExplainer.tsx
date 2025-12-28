import React, { useState } from 'react';

export const RICEExplainer: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-8 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <h3 className="text-base font-semibold text-slate-900">
                            RICE Priority Scoring
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            How we calculate issue priority
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
                <div className="border-t border-slate-100 p-8 animate-in slide-in-from-top-4 duration-300">

                    {/* Formula */}
                    <div className="bg-indigo-50 rounded-xl p-6 mb-6 border border-indigo-100">
                        <div className="text-center">
                            <p className="text-sm text-slate-600 mb-2">Formula</p>
                            <p className="text-2xl text-slate-900 mb-1">
                                Priority Score = <span className="text-indigo-600">Impact² / Effort</span>
                            </p>
                            <p className="text-sm text-slate-500 mt-3">Higher score = Higher priority</p>
                        </div>
                    </div>

                    {/* Components */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Impact (Severity Squared) */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <h3 className="text-sm text-slate-900 mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 bg-red-100 text-red-600 rounded-lg flex items-center justify-center text-xs">I²</span>
                                Impact (Severity²)
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Critical (4)</span>
                                    <span className="text-slate-900">→ 16</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Serious (3)</span>
                                    <span className="text-slate-900">→ 9</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Moderate (2)</span>
                                    <span className="text-slate-900">→ 4</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Minor (1)</span>
                                    <span className="text-slate-900">→ 1</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-3 italic">Squaring emphasizes critical issues</p>
                        </div>

                        {/* Effort */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <h3 className="text-sm text-slate-900 mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center text-xs">E</span>
                                Effort (Ease of Fix)
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Easy</span>
                                    <span className="text-slate-900">÷ 1</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Moderate</span>
                                    <span className="text-slate-900">÷ 2</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Hard</span>
                                    <span className="text-slate-900">÷ 3</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-3 italic">Lower effort = higher priority</p>
                        </div>
                    </div>

                    {/* Priority Tiers */}
                    <div className="border-t border-slate-200 pt-6">
                        <h3 className="text-sm text-slate-900 mb-4">Priority Tiers</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">🔥</span>
                                    <span className="text-sm text-red-700">P0 - Critical</span>
                                </div>
                                <p className="text-xs text-slate-600 mb-1">Score ≥ 10</p>
                                <p className="text-xs text-slate-500">Fix immediately</p>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">⚡</span>
                                    <span className="text-sm text-orange-700">P1 - High</span>
                                </div>
                                <p className="text-xs text-slate-600 mb-1">Score 6-10</p>
                                <p className="text-xs text-slate-500">Fix soon</p>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">📋</span>
                                    <span className="text-sm text-amber-700">P2 - Medium</span>
                                </div>
                                <p className="text-xs text-slate-600 mb-1">Score 3-6</p>
                                <p className="text-xs text-slate-500">Schedule fix</p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">📝</span>
                                    <span className="text-sm text-slate-600">P3 - Low</span>
                                </div>
                                <p className="text-xs text-slate-600 mb-1">Score &lt; 3</p>
                                <p className="text-xs text-slate-500">Backlog</p>
                            </div>
                        </div>
                    </div>

                    {/* Examples */}
                    <div className="border-t border-slate-200 pt-6 mt-6">
                        <h3 className="text-sm text-slate-900 mb-4">Example Calculations</h3>
                        <div className="space-y-3">
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <p className="text-sm text-slate-900">Missing button label</p>
                                        <p className="text-xs text-slate-500 mt-1">Critical + Easy fix</p>
                                    </div>
                                    <span className="text-sm px-2.5 py-1 rounded-md border bg-red-50 text-red-700 border-red-200 whitespace-nowrap">P0 - Critical</span>
                                </div>
                                <div className="bg-white rounded-lg p-3 text-xs space-y-1">
                                    <p className="text-slate-600">Impact: Critical (4)² = <strong className="text-slate-900">16</strong></p>
                                    <p className="text-slate-600">Effort: Easy = <strong className="text-slate-900">1</strong></p>
                                    <p className="text-indigo-600 mt-2">Score: 16 / 1 = <strong className="text-lg">16.0</strong></p>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <p className="text-sm text-slate-900">Color contrast issue</p>
                                        <p className="text-xs text-slate-500 mt-1">Serious + Easy fix</p>
                                    </div>
                                    <span className="text-sm px-2.5 py-1 rounded-md border bg-orange-50 text-orange-700 border-orange-200 whitespace-nowrap">P1 - High</span>
                                </div>
                                <div className="bg-white rounded-lg p-3 text-xs space-y-1">
                                    <p className="text-slate-600">Impact: Serious (3)² = <strong className="text-slate-900">9</strong></p>
                                    <p className="text-slate-600">Effort: Easy = <strong className="text-slate-900">1</strong></p>
                                    <p className="text-indigo-600 mt-2">Score: 9 / 1 = <strong className="text-lg">9.0</strong></p>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <p className="text-sm text-slate-900">Complex keyboard navigation</p>
                                        <p className="text-xs text-slate-500 mt-1">Critical + Hard fix</p>
                                    </div>
                                    <span className="text-sm px-2.5 py-1 rounded-md border bg-orange-50 text-orange-700 border-orange-200 whitespace-nowrap">P1 - High</span>
                                </div>
                                <div className="bg-white rounded-lg p-3 text-xs space-y-1">
                                    <p className="text-slate-600">Impact: Critical (4)² = <strong className="text-slate-900">16</strong></p>
                                    <p className="text-slate-600">Effort: Hard = <strong className="text-slate-900">3</strong></p>
                                    <p className="text-indigo-600 mt-2">Score: 16 / 3 = <strong className="text-lg">5.3</strong></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Why RICE */}
                    <div className="border-t border-slate-200 pt-6 mt-6">
                        <h3 className="text-sm text-slate-900 mb-3">Why RICE Scoring?</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex gap-3">
                                <span className="text-emerald-600 flex-shrink-0">✓</span>
                                <div>
                                    <p className="text-slate-900">Prioritizes quick wins</p>
                                    <p className="text-xs text-slate-500 mt-1">Easy fixes with high impact get top priority</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <span className="text-emerald-600 flex-shrink-0">✓</span>
                                <div>
                                    <p className="text-slate-900">Balances effort vs. impact</p>
                                    <p className="text-xs text-slate-500 mt-1">Hard critical issues may rank below easy serious ones</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <span className="text-emerald-600 flex-shrink-0">✓</span>
                                <div>
                                    <p className="text-slate-900">Transparent calculation</p>
                                    <p className="text-xs text-slate-500 mt-1">Priority derived from visible Impact and Effort columns</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <span className="text-emerald-600 flex-shrink-0">✓</span>
                                <div>
                                    <p className="text-slate-900">Non-linear impact</p>
                                    <p className="text-xs text-slate-500 mt-1">Critical issues (16) are 4× more important than Moderate (4)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
