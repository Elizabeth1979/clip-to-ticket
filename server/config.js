/**
 * Centralized Gemini model configuration
 * 
 * Update model versions here to apply across the entire application.
 */
export const GEMINI_MODELS = {
    // Primary model for video/media analysis (multimodal)
    // Using preview for better formatting compliance and lower cost
    ANALYSIS: 'gemini-2.5-flash-preview-09-2025',

    // Model for AI chat/analyst features
    CHAT: 'gemini-2.5-flash-preview-09-2025',
};

/**
 * Pricing per 1M tokens (for cost estimation)
 * Update when model pricing changes.
 */
export const GEMINI_PRICING = {
    'gemini-2.5-flash-preview-09-2025': {
        inputPer1M: 0.15,
        outputPer1M: 0.60,
    },
    'gemini-2.5-flash': {
        inputPer1M: 0.30,
        outputPer1M: 2.50,
    },
    'gemini-3-flash-preview': {
        inputPer1M: 0.50,
        outputPer1M: 3.00,
    },
    'gemini-3-pro-preview': {
        inputPer1M: 2.50,
        outputPer1M: 10.00,
    },
};

/**
 * Get pricing for a specific model
 * Falls back to gemini-2.5-flash pricing if model not found
 */
export function getModelPricing(model) {
    return GEMINI_PRICING[model] || GEMINI_PRICING['gemini-2.5-flash'];
}
