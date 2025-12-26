
import React from 'react';
import { CostBreakdown } from '../types';
import { CostEstimator } from '../utils/costEstimator';

interface CostDisplayProps {
    costBreakdown: CostBreakdown;
    issueCount?: number;
    isProcessing?: boolean;
}

export const CostDisplay: React.FC<CostDisplayProps> = ({
    costBreakdown,
    issueCount = 0,
    isProcessing = false
}) => {
    return (
        <div className="bg-gradient-to-br from-emerald-50 to-indigo-50 rounded-2xl p-6 border border-emerald-100">
            <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-sm tracking-widest text-slate-900">
                    {isProcessing ? 'Estimated Cost' : 'Analysis Cost'}
                </h3>
            </div>

            <div className="mb-6">
                <div className="text-4xl text-slate-900 mb-1">
                    {CostEstimator.formatCost(costBreakdown.totalCost)}
                </div>
                {issueCount > 0 && (
                    <div className="text-sm text-slate-500">
                        {CostEstimator.getCostPerIssue(costBreakdown.totalCost, issueCount)} per issue
                    </div>
                )}
            </div>

            <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Input Tokens:</span>
                    <span className="text-slate-900">
                        {CostEstimator.formatTokens(costBreakdown.inputTokens)}
                        <span className="text-slate-400 ml-2">
                            {CostEstimator.formatCost(costBreakdown.inputCost)}
                        </span>
                    </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Output Tokens:</span>
                    <span className="text-slate-900">
                        {CostEstimator.formatTokens(costBreakdown.outputTokens)}
                        <span className="text-slate-400 ml-2">
                            {CostEstimator.formatCost(costBreakdown.outputCost)}
                        </span>
                    </span>
                </div>

                {costBreakdown.videoSeconds && costBreakdown.videoSeconds > 0 && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">Video Processing:</span>
                        <span className="text-slate-900">
                            {costBreakdown.videoSeconds}s
                            <span className="text-slate-400 ml-2">
                                {CostEstimator.formatCost(costBreakdown.videoCost)}
                            </span>
                        </span>
                    </div>
                )}

                <div className="pt-3 border-t border-slate-200">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-900 tracking-widest">Total:</span>
                        <span className="text-lg text-emerald-600">
                            {CostEstimator.formatCost(costBreakdown.totalCost)}
                        </span>
                    </div>
                </div>
            </div>

            {isProcessing && (
                <div className="mt-4 text-sm text-slate-400 italic text-center">
                    Final cost may vary based on actual token usage
                </div>
            )}
        </div>
    );
};
