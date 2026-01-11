/**
 * Prompt Template Module
 * 
 * Extracts the system prompt building logic for testability and customization.
 * Settings can be customized by users in the PromptSettings component.
 */

import { ARIA_APG_REFERENCE, WCAG22_QUICKREF } from "../documentation";
import wcag22Full from "../data/wcag22-full.json";
import { AxeRulesService } from "./axeRulesService";
import { getFormattedPatternsForAI, getAPGPatternCount, getAPGPracticeCount } from "./apgPatternsService";

// Focus areas that users can select
export const FOCUS_AREAS = {
    keyboard: { id: 'keyboard', label: 'Keyboard Navigation', instruction: 'keyboard accessibility, focus management, and tab order' },
    screenReader: { id: 'screenReader', label: 'Screen Reader Compatibility', instruction: 'screen reader announcements, ARIA labels, and semantic HTML' },
    contrast: { id: 'contrast', label: 'Color Contrast', instruction: 'color contrast ratios and visual distinction' },
    forms: { id: 'forms', label: 'Form Accessibility', instruction: 'form labels, error messages, and input validation' },
    touchTargets: { id: 'touchTargets', label: 'Touch Target Size', instruction: 'touch target sizing and spacing for mobile users' },
    cognitive: { id: 'cognitive', label: 'Cognitive/Reading Level', instruction: 'cognitive load, reading level, and content clarity' },
} as const;

export type FocusAreaId = keyof typeof FOCUS_AREAS;

// Severity emphasis modes
export type SeverityMode = 'all' | 'critical' | 'quickWins';

export const SEVERITY_MODES = {
    all: { id: 'all', label: 'Report all issues', instruction: '' },
    critical: { id: 'critical', label: 'Focus on Critical/Serious only', instruction: 'PRIORITY: Focus primarily on CRITICAL and SERIOUS severity issues. Minor issues can be noted but prioritize blockers.' },
    quickWins: { id: 'quickWins', label: 'Focus on Quick Wins', instruction: 'PRIORITY: Focus on issues with "Quick Win" or "Easy" ease_of_fix ratings. Highlight low-effort, high-impact improvements.' },
} as const;

// User-customizable prompt settings
export interface PromptSettings {
    focusAreas: FocusAreaId[];
    severityMode: SeverityMode;
    customInstructions: string;
    useAdvancedMode: boolean;
    advancedPrompt?: string;
}

// Default settings
export const DEFAULT_PROMPT_SETTINGS: PromptSettings = {
    focusAreas: [],
    severityMode: 'all',
    customInstructions: '',
    useAdvancedMode: false,
};

// Media context for building the prompt
export interface MediaContext {
    videoCount: number;
    audioCount: number;
    imageCount: number;
    pdfCount: number;
    targetLanguage: string;
}

/**
 * Builds the language instruction based on target language.
 */
export function buildLanguageInstruction(targetLanguage: string): string {
    if (targetLanguage === 'Original') {
        return "TRANSCRIPT: Generate a full verbatim diarized transcript of any audio content in its ORIGINAL language (do not translate). Detect and report the language code in 'detected_language'.";
    }
    return `TRANSCRIPT: Generate a full diarized transcript of any audio content and TRANSLATE it into ${targetLanguage}. Report the ORIGINAL detected source language code in 'detected_language'.`;
}

/**
 * Builds the focus areas instruction if any are selected.
 */
export function buildFocusInstruction(focusAreas: FocusAreaId[]): string {
    if (focusAreas.length === 0) return '';

    const focusDescriptions = focusAreas
        .map(id => FOCUS_AREAS[id].instruction)
        .join(', ');

    return `\nPRIORITY FOCUS: Pay special attention to ${focusDescriptions}. These areas are of particular importance for this audit.\n`;
}

/**
 * Builds the complete system prompt for AI analysis.
 */
export function buildSystemPrompt(
    mediaContext: MediaContext,
    settings: PromptSettings = DEFAULT_PROMPT_SETTINGS
): string {
    // If advanced mode with custom prompt, use that directly
    if (settings.useAdvancedMode && settings.advancedPrompt) {
        return settings.advancedPrompt;
    }

    const { videoCount, audioCount, imageCount, pdfCount, targetLanguage } = mediaContext;
    const hasTimeBasedMedia = videoCount > 0 || audioCount > 0;

    const languageInstruction = buildLanguageInstruction(targetLanguage);
    const focusInstruction = buildFocusInstruction(settings.focusAreas);
    const severityInstruction = SEVERITY_MODES[settings.severityMode].instruction;

    // Build main prompt
    let prompt = `
You are a Senior Accessibility QA Architect analyzing a collection of media files for accessibility issues.
The files include:
${videoCount > 0 ? `- ${videoCount} Video recording(s) (screen captures with narration)` : ''}
${audioCount > 0 ? `- ${audioCount} Audio recording(s)` : ''}
${imageCount > 0 ? `- ${imageCount} Screenshot(s)` : ''}
${pdfCount > 0 ? `- ${pdfCount} PDF Document(s)` : ''}
${focusInstruction}${severityInstruction ? `\n${severityInstruction}\n` : ''}
${hasTimeBasedMedia ? `AUDIO/VIDEO ANALYSIS:
- Listen to ALL narration and dialogue from EVERY video/audio file completely.
- ${languageInstruction}
- IMPORTANT: Every time a different person speaks, or after a short pause, start a NEW LINE.

CRITICAL TRANSCRIPT FORMAT REQUIREMENT:
Each line of the transcript MUST follow this EXACT format:
SpeakerName [MM:SS]: Message text here

Examples of CORRECT format:
- Narrator [00:05]: Welcome to this accessibility demo.
- User [00:12]: I'm going to test the keyboard navigation.
- ScreenReader [01:30]: Button, Submit Order

Examples of WRONG format (DO NOT USE):
- Welcome to this accessibility demo (missing speaker and timestamp)
- [00:05]: Welcome to this demo (missing speaker name)
- Narrator: Welcome to this demo (missing timestamp)

${videoCount > 1 ? `MULTIPLE VIDEOS: You are analyzing ${videoCount} separate video files.
- Return a SEPARATE transcript for EACH video in the "transcripts" array.
- The array must have exactly ${videoCount} elements, one per video in order.
- Each video's transcript starts fresh at [00:00].` : `SINGLE VIDEO: Return ONE transcript starting at [00:00].`}

- Ignore filler words (um, uh, like) and off-topic commentary. Focus on accessibility insights.` : 'Since there is no time-based media, leave the transcript field empty.'}

${videoCount > 0 ? `VIDEO VISUAL ANALYSIS:
- Inspect visual UI (color, layout, focus indicators, responsive design).
- Analyze screen reader output if captured.
- Observe keyboard navigation demonstrations.
${videoCount > 1 ? `- For each issue, set video_index to indicate which video (0-based: 0 for Video 1, 1 for Video 2, etc.)` : ''}` : ''}

${imageCount > 0 ? `SCREENSHOT ANALYSIS:
- Analyze each image for visual accessibility issues (contrast, labels, touch targets).
- Use "Screenshot X" or the filename as context reference.` : ''}

${pdfCount > 0 ? `PDF DOCUMENT ANALYSIS:
- Analyze document structure (headings, reading order, tables).
- Check for tagging and semantic structure.
- Evaluate color contrast and text alternatives within the document.` : ''}

Through this multimodal analysis, you can detect ALL WCAG 2.2 Success Criteria.

COMPREHENSIVE WCAG 2.2 REFERENCE:
${JSON.stringify(wcag22Full, null, 2)}

COMPLETE AXE-CORE RULES (${AxeRulesService.getRuleCount()} rules):
${AxeRulesService.getFormattedRulesForAI()}

ARIA APG (${getAPGPatternCount()} patterns + ${getAPGPracticeCount()} practices):
${getFormattedPatternsForAI()}

QUICK REFERENCE LINKS:
- WCAG 2.2 Quick Reference: ${WCAG22_QUICKREF}
- ARIA APG Patterns: ${ARIA_APG_REFERENCE}

ANALYSIS PIPELINE:
1. TRANSCRIPT (if audio/video present).
   - Transcribe ALL content from ALL videos completely.
   ${videoCount > 1 ? '- Include video number in timestamps.' : ''}
   
2. ISSUE INTERPRETATION: For each accessibility barrier you observe:
   - Describe what the issue is (e.g., "Link text is not descriptive")
   - Identify which WCAG 2.2 criteria it violates
   - Note the context and severity of impact
   - Explicitly mention which file the issue was found in (Filename or Type).
   ${videoCount > 1 ? '- Set video_index (0-based) to indicate which video the issue is from.' : ''}
   
3. AXE RULE & APG PATTERN MATCHING: For each issue identified above:
   - First, check if this is an ARIA APG design pattern issue
   - If it's an APG pattern, set apg_pattern to the pattern ID
   - If it's NOT an APG pattern, search Axe-core rules for a match
   - IMPORTANT: Do not force a match - it's better to leave fields empty than provide incorrect values
   
4. SEVERITY ASSIGNMENT:
   - If you provided an axe_rule_id (not "none"): The system will use that rule's impact level automatically
   - Otherwise: Use AI heuristics based on WCAG conformance level and user impact

5. EASE OF FIX ASSESSMENT: Classify the difficulty to fix this issue (Quick Win, Easy, Moderate, Hard).

6. REMEDIATION: Provide code-level fixes using ARIA APG patterns where applicable.

FORMATTING: JSON ONLY. Use actual newline characters in the transcript string.
`;

    // Append custom instructions if provided
    if (settings.customInstructions.trim()) {
        prompt += `\nADDITIONAL USER CONTEXT:\n${settings.customInstructions.trim()}\n`;
    }

    return prompt;
}

// LocalStorage key for persisting settings
export const PROMPT_SETTINGS_STORAGE_KEY = 'mediatoticket_prompt_settings';

/**
 * Load saved prompt settings from localStorage.
 */
export function loadPromptSettings(): PromptSettings {
    try {
        const saved = localStorage.getItem(PROMPT_SETTINGS_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return { ...DEFAULT_PROMPT_SETTINGS, ...parsed };
        }
    } catch (e) {
        console.warn('Failed to load prompt settings from localStorage:', e);
    }
    return DEFAULT_PROMPT_SETTINGS;
}

/**
 * Save prompt settings to localStorage.
 */
export function savePromptSettings(settings: PromptSettings): void {
    try {
        localStorage.setItem(PROMPT_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
        console.warn('Failed to save prompt settings to localStorage:', e);
    }
}

/**
 * Clear saved prompt settings from localStorage.
 */
export function clearPromptSettings(): void {
    try {
        localStorage.removeItem(PROMPT_SETTINGS_STORAGE_KEY);
    } catch (e) {
        console.warn('Failed to clear prompt settings from localStorage:', e);
    }
}
