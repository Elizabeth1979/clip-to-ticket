/**
 * Centralized Gemini model configuration
 * 
 * Update model versions here to apply across the entire application.
 * This file is used by Vercel API routes.
 */
export const GEMINI_MODELS = {
    // Primary model for video/media analysis (multimodal)
    // Using preview for better formatting compliance and lower cost
    ANALYSIS: 'gemini-2.5-flash-preview-09-2025',

    // Model for AI chat/analyst features
    CHAT: 'gemini-2.5-flash-preview-09-2025',
};
