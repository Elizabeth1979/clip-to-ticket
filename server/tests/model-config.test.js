/**
 * Model Configuration Validation Tests
 * 
 * These tests validate that the configured Gemini models exist and are accessible.
 * Run before deployment to catch invalid model names early.
 */

import { GEMINI_MODELS } from '../config.js';
import { GoogleGenAI } from '@google/genai';

// Skip these tests if no API key is configured (CI without secrets)
const SKIP_API_TESTS = !process.env.GEMINI_API_KEY;

describe('Model Configuration', () => {
    // Unit tests - always run
    describe('Config file validation', () => {
        test('GEMINI_MODELS exports required keys', () => {
            expect(GEMINI_MODELS).toHaveProperty('ANALYSIS');
            expect(GEMINI_MODELS).toHaveProperty('CHAT');
        });

        test('Model names are non-empty strings', () => {
            expect(typeof GEMINI_MODELS.ANALYSIS).toBe('string');
            expect(GEMINI_MODELS.ANALYSIS.length).toBeGreaterThan(0);
            expect(typeof GEMINI_MODELS.CHAT).toBe('string');
            expect(GEMINI_MODELS.CHAT.length).toBeGreaterThan(0);
        });

        test('Model names follow Gemini naming convention', () => {
            // Gemini models should start with 'gemini-'
            expect(GEMINI_MODELS.ANALYSIS).toMatch(/^gemini-/);
            expect(GEMINI_MODELS.CHAT).toMatch(/^gemini-/);
        });

        test('Model names do not contain obvious typos', () => {
            // Check for common typos in version numbers
            const validVersionPatterns = [
                /gemini-\d+\.\d+/,  // e.g., gemini-2.5
                /gemini-\d+\.\d+-flash/,  // e.g., gemini-2.5-flash
                /gemini-\d+\.\d+-pro/,  // e.g., gemini-2.5-pro
            ];

            const analysisModel = GEMINI_MODELS.ANALYSIS;
            const chatModel = GEMINI_MODELS.CHAT;

            const matchesPattern = (model) => validVersionPatterns.some(pattern => pattern.test(model));

            expect(matchesPattern(analysisModel)).toBe(true);
            expect(matchesPattern(chatModel)).toBe(true);
        });
    });

    // API tests - only run if API key is available
    describe('API model validation', () => {
        let genAI;

        beforeAll(() => {
            if (!SKIP_API_TESTS) {
                genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            }
        });

        test.skipIf(SKIP_API_TESTS)('ANALYSIS model exists and is accessible', async () => {
            // Make a minimal API call to verify the model exists
            try {
                const response = await genAI.models.generateContent({
                    model: GEMINI_MODELS.ANALYSIS,
                    contents: { parts: [{ text: 'Say "ok" and nothing else.' }] },
                });

                // If we get here, the model exists
                expect(response).toBeDefined();
                expect(response.text).toBeDefined();
            } catch (error) {
                // Check if the error is specifically about model not found
                if (error.message?.includes('not found') || error.message?.includes('not supported')) {
                    throw new Error(
                        `Model "${GEMINI_MODELS.ANALYSIS}" is not valid. ` +
                        `Error: ${error.message}`
                    );
                }
                // Re-throw other errors (rate limits, etc.)
                throw error;
            }
        }, 30000); // 30 second timeout

        test.skipIf(SKIP_API_TESTS)('CHAT model exists and is accessible', async () => {
            try {
                const response = await genAI.models.generateContent({
                    model: GEMINI_MODELS.CHAT,
                    contents: { parts: [{ text: 'Say "ok" and nothing else.' }] },
                });

                expect(response).toBeDefined();
                expect(response.text).toBeDefined();
            } catch (error) {
                if (error.message?.includes('not found') || error.message?.includes('not supported')) {
                    throw new Error(
                        `Model "${GEMINI_MODELS.CHAT}" is not valid. ` +
                        `Error: ${error.message}`
                    );
                }
                throw error;
            }
        }, 30000);
    });
});
