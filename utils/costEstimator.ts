
import { CostBreakdown } from '../types';

// Gemini 3 Flash pricing (per 1M tokens) - as of Dec 2024
const PRICING = {
    FLASH_INPUT_PER_1M: 0.075,
    FLASH_OUTPUT_PER_1M: 0.30,
    PRO_INPUT_PER_1M: 1.25,
    PRO_OUTPUT_PER_1M: 5.00,
    VIDEO_PER_SECOND: 0.002,
};

export class CostEstimator {
    /**
     * Estimate tokens for text (rough approximation: 1 token ≈ 4 characters)
     */
    static estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }

    /**
     * Calculate cost for video analysis using Gemini Flash
     */
    static calculateVideoCost(
        inputTokens: number,
        outputTokens: number,
        videoSeconds: number = 0
    ): CostBreakdown {
        const inputCost = (inputTokens / 1_000_000) * PRICING.FLASH_INPUT_PER_1M;
        const outputCost = (outputTokens / 1_000_000) * PRICING.FLASH_OUTPUT_PER_1M;
        const videoCost = videoSeconds * PRICING.VIDEO_PER_SECOND;

        return {
            inputTokens,
            outputTokens,
            videoSeconds,
            inputCost,
            outputCost,
            videoCost,
            totalCost: inputCost + outputCost + videoCost,
        };
    }

    /**
     * Calculate cost for chat using Gemini Pro
     */
    static calculateChatCost(inputTokens: number, outputTokens: number): CostBreakdown {
        const inputCost = (inputTokens / 1_000_000) * PRICING.PRO_INPUT_PER_1M;
        const outputCost = (outputTokens / 1_000_000) * PRICING.PRO_OUTPUT_PER_1M;

        return {
            inputTokens,
            outputTokens,
            inputCost,
            outputCost,
            videoCost: 0,
            totalCost: inputCost + outputCost,
        };
    }

    /**
     * Format cost as currency string
     */
    static formatCost(cost: number): string {
        if (cost < 0.01) {
            return `< $0.01`;
        }
        return `$${cost.toFixed(2)}`;
    }

    /**
     * Format token count with thousands separator
     */
    static formatTokens(tokens: number): string {
        return tokens.toLocaleString();
    }

    /**
     * Get cost per issue metric
     */
    static getCostPerIssue(totalCost: number, issueCount: number): string {
        if (issueCount === 0) return '$0.00';
        const costPerIssue = totalCost / issueCount;
        return this.formatCost(costPerIssue);
    }
}
