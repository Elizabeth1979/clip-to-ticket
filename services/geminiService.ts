
import { Type } from "@google/genai";
import { A11yIssue, Severity, AnalysisResult } from "../types";
import { ARIA_APG_REFERENCE, WCAG22_QUICKREF } from "../documentation";
import wcag22Full from "../data/wcag22-full.json";
import { AxeRulesService } from "./axeRulesService";
import { getFormattedPatternsForAI, getAPGPatternCount, getAPGPracticeCount } from "./apgPatternsService";

// Elli is the queen

// Use Render backend in production, localhost in development
const API_BASE_URL = import.meta.env.PROD
  ? 'https://mediatoticket-backend.onrender.com'
  : 'http://localhost:3001';

export class GeminiService {
  async analyzeVideo(videoBase64: string, mimeType: string, signal?: AbortSignal): Promise<AnalysisResult> {
    const systemInstruction = `
      You are a Senior Accessibility QA Architect analyzing comprehensive screen recordings that include:
      - Visual UI inspection (color, layout, focus indicators, responsive design)
      - Screen reader output (NVDA, JAWS, VoiceOver, etc.)
      - Keyboard navigation demonstrations
      - Expert commentary and narration on accessibility barriers
      
      Through this multimodal analysis, you can detect ALL WCAG 2.2 Success Criteria.
      
      CONTENT FOCUS: When analyzing audio/narration, focus on actionable accessibility insights.
      - Ignore filler words (um, uh, like, you know), false starts, and verbal tics
      - Disregard off-topic commentary unrelated to accessibility barriers
      - Prioritize statements that describe specific UI issues, user frustrations, or WCAG violations
      - Extract the core meaning even from rambling or repetitive explanations
      
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
      1. TRANSCRIPT: Generate a full verbatim diarized transcript.
         IMPORTANT: Every time a different person speaks, or after a short pause, start a NEW LINE.
         FORMAT: Speaker Name [MM:SS]: Message content here.
         
      2. ISSUE INTERPRETATION: For each accessibility barrier you observe:
         - Describe what the issue is (e.g., "Link text is not descriptive")
         - Identify which WCAG 2.2 criteria it violates
         - Note the context and severity of impact
         
      3. AXE RULE & APG PATTERN MATCHING: For each issue identified above:
         - First, check if this is an ARIA APG design pattern issue (e.g., toolbar, menubar, dialog)
         - If it's an APG pattern:
           * Set apg_pattern to the pattern ID (e.g., "toolbar", "menubar")
           * You can provide MULTIPLE patterns separated by commas (e.g., "button, link")
           * Set axe_rule_id to "none"
           * The severity will be determined by AI heuristics (not axe-core)
         - If it's NOT an APG pattern:
           * Search the Axe-core rules for a rule that matches THIS SPECIFIC issue
           * If you find a confident match, provide the axe_rule_id and leave apg_pattern empty
           * If no clear match exists, leave both axe_rule_id and apg_pattern empty
         - IMPORTANT: Do not force a match - it's better to leave fields empty than to provide incorrect values
         
      4. SEVERITY ASSIGNMENT:
         - If you provided an axe_rule_id (not "none"): The system will use that rule's impact level automatically
         - If you provided an apg_pattern OR axe_rule_id is empty: Use AI heuristics based on:
           * WCAG conformance level (Level A → Critical, Level AA → Serious)
           * User impact (blocks access → Critical, major barrier → Serious)
           * Best practices → Moderate
           * Minor issues → Minor
      
      5. EASE OF FIX ASSESSMENT: Classify the difficulty to fix this issue:
         - Easy: Static attributes (adding aria-label, aria-hidden, role, alt text, etc.)
         - Moderate: Focus management, dynamic ARIA (aria-expanded, aria-checked, aria-live)
         - Hard: Complex keyboard implementation (tabs, modal dialogs, custom widgets)
      
      6. REMEDIATION: Provide code-level fixes using:
         - Examples from the Axe-core rules above
         - ARIA APG patterns where applicable
         - Specific, actionable code snippets
      
      COMMON APG PRACTICE REFERENCES:
      - For button-name, image-alt, label issues → Use "names-and-descriptions" practice
      - For keyboard navigation issues → Use "keyboard-interface" practice  
      - For landmark/region issues → Use "landmark-regions" practice
      - For table/grid ARIA properties → Use "grid-and-table-properties" practice
      - For role='presentation' issues → Use "hiding-semantics" practice
      - For slider/progress bar properties → Use "range-related-properties" practice
      - For heading/list/article roles → Use "structural-roles" practice
      - For specific widget patterns → Use the pattern name (e.g., "toolbar", "menubar")
      
      ACCURACY REQUIREMENTS:
      - Use EXACT WCAG criteria numbers from the comprehensive reference
      - Use EXACT Axe-core rule IDs from the enhanced rules
      - Base suggestions on the code examples provided in the knowledge base
      - Include links to official documentation
      
      FORMATTING: JSON ONLY. Use actual newline characters in the transcript string.
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        transcript: { type: Type.STRING },
        issues: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              issue_title: { type: Type.STRING },
              issue_description: { type: Type.STRING },
              wcag_reference: { type: Type.STRING },
              axe_rule_id: { type: Type.STRING },
              apg_pattern: { type: Type.STRING },
              severity: { type: Type.STRING, enum: Object.values(Severity) },
              ease_of_fix: { type: Type.STRING, enum: ['Easy', 'Moderate', 'Hard'] },
              suggested_fix: { type: Type.STRING },
              generated_alt_text: { type: Type.STRING },
              timestamp: { type: Type.STRING },
              status: { type: Type.STRING },
              disclaimer: { type: Type.STRING }
            },
            required: ["issue_title", "issue_description", "wcag_reference", "axe_rule_id", "severity", "ease_of_fix", "suggested_fix", "timestamp", "status", "disclaimer"]
          }
        }
      },
      required: ["transcript", "issues"]
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoBase64,
          mimeType,
          systemInstruction,
          responseSchema
        }),
        signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Backend Analysis Request Failed: The server at ${API_BASE_URL} returned an error (${response.status} ${response.statusText}). This could indicate: (1) Backend service is down or restarting, (2) Invalid API request format, or (3) Server resource limits exceeded. Please wait a moment and try again.`);
      }

      const data = await response.json();
      const parsedData = JSON.parse(data.text || '{}');

      // Helper function to capitalize impact values from Axe rules
      const capitalizeImpact = (impact: string): string => {
        return impact.charAt(0).toUpperCase() + impact.slice(1);
      };

      // Post-process issues to enforce Axe-core impact levels
      const issues = (parsedData.issues || []).map((issue: any) => {
        // If AI provided an APG pattern, use AI heuristics for severity
        if (issue.apg_pattern && issue.apg_pattern.trim() !== '') {
          return {
            ...issue,
            impact_source: 'apg-pattern-heuristic'
          };
        }

        // If AI provided an Axe rule ID (and it's not "none"), enforce that rule's impact
        if (issue.axe_rule_id && issue.axe_rule_id.trim() !== '' && issue.axe_rule_id.toLowerCase() !== 'none') {
          const axeRule = AxeRulesService.getRuleById(issue.axe_rule_id);
          if (axeRule?.impact) {
            return {
              ...issue,
              severity: capitalizeImpact(axeRule.impact),
              impact_source: 'axe-core'
            };
          }
        }

        // Otherwise trust AI's WCAG-based assessment
        return {
          ...issue,
          impact_source: 'wcag-heuristic'
        };
      });

      return {
        transcript: parsedData.transcript || "No transcript generated.",
        issues,
        metadata: data.metadata // Include metadata from backend
      };
    } catch (err: any) {
      // Re-throw abort errors so they can be handled properly by the caller
      if (err.name === 'AbortError' || signal?.aborted) {
        const abortError = new Error('Analysis cancelled');
        abortError.name = 'AbortError';
        throw abortError;
      }
      console.error("Failed to analyze video:", err);
      throw new Error(err.message || `Video Analysis Pipeline Error: Unable to complete the analysis process. Common causes include: (1) Backend server unreachable at ${API_BASE_URL}, (2) Network connectivity issues, (3) Video encoding not supported, or (4) Response parsing failure. Check your network connection and ensure the backend server is running.`);
    }
  }

  // New method to analyze mixed media (video + images)
  async analyzeMedia(
    video?: { base64: string; mimeType: string },
    images?: { base64: string; mimeType: string; comment?: string }[],
    signal?: AbortSignal
  ): Promise<AnalysisResult> {
    // If only video provided, use the existing analyzeVideo method
    if (video && (!images || images.length === 0)) {
      return this.analyzeVideo(video.base64, video.mimeType, signal);
    }

    const hasVideo = !!video;
    const imageCount = images?.length || 0;

    const systemInstruction = `
      You are a Senior Accessibility QA Architect analyzing ${hasVideo ? 'a screen recording' : ''}${hasVideo && imageCount > 0 ? ' and ' : ''}${imageCount > 0 ? `${imageCount} screenshot${imageCount > 1 ? 's' : ''}` : ''} for accessibility issues.
      
      ${hasVideo ? `The video includes:
      - Visual UI inspection (color, layout, focus indicators, responsive design)
      - Screen reader output (NVDA, JAWS, VoiceOver, etc.)
      - Keyboard navigation demonstrations
      - Expert commentary and narration on accessibility barriers` : ''}
      
      ${imageCount > 0 ? `For screenshots:
      - Analyze each image for visual accessibility issues
      - If a description is provided with the image, use it as context
      - If no description is provided, infer issues from visual inspection
      - Common issues to look for: color contrast, missing labels, focus indicators, touch targets, text alternatives` : ''}
      
      Through this multimodal analysis, you can detect ALL WCAG 2.2 Success Criteria.
      
      CONTENT FOCUS: When analyzing audio/narration, focus on actionable accessibility insights.
      - Ignore filler words (um, uh, like, you know), false starts, and verbal tics
      - Disregard off-topic commentary unrelated to accessibility barriers
      - Prioritize statements that describe specific UI issues, user frustrations, or WCAG violations
      - Extract the core meaning even from rambling or repetitive explanations
      
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
      1. TRANSCRIPT: ${hasVideo ? 'Generate a full verbatim diarized transcript from the video.' : 'Since there is no video, leave the transcript field empty or provide a brief summary of what you analyzed.'}
         ${hasVideo ? `IMPORTANT: Every time a different person speaks, or after a short pause, start a NEW LINE.
         FORMAT: Speaker Name [MM:SS]: Message content here.` : ''}
         
      2. ISSUE INTERPRETATION: For each accessibility barrier you observe:
         - Describe what the issue is (e.g., "Link text is not descriptive")
         - Identify which WCAG 2.2 criteria it violates
         - Note the context and severity of impact
         ${imageCount > 0 ? '- For screenshot issues, use "Screenshot X" as the timestamp reference' : ''}
         
      3. AXE RULE & APG PATTERN MATCHING: For each issue identified above:
         - First, check if this is an ARIA APG design pattern issue
         - If it's an APG pattern, set apg_pattern to the pattern ID
         - If it's NOT an APG pattern, search Axe-core rules for a match
         - IMPORTANT: Do not force a match - it's better to leave fields empty than provide incorrect values
         
      4. SEVERITY ASSIGNMENT:
         - If you provided an axe_rule_id (not "none"): The system will use that rule's impact level automatically
         - Otherwise: Use AI heuristics based on WCAG conformance level and user impact
      
      5. EASE OF FIX ASSESSMENT: Classify the difficulty to fix this issue:
         - Easy: Static attributes (adding aria-label, aria-hidden, role, alt text, etc.)
         - Moderate: Focus management, dynamic ARIA (aria-expanded, aria-checked, aria-live)
         - Hard: Complex keyboard implementation (tabs, modal dialogs, custom widgets)
      
      6. REMEDIATION: Provide code-level fixes using ARIA APG patterns where applicable.
      
      ACCURACY REQUIREMENTS:
      - Use EXACT WCAG criteria numbers from the comprehensive reference
      - Use EXACT Axe-core rule IDs from the enhanced rules
      - Include links to official documentation
      
      FORMATTING: JSON ONLY. Use actual newline characters in the transcript string.
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        transcript: { type: Type.STRING },
        issues: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              issue_title: { type: Type.STRING },
              issue_description: { type: Type.STRING },
              wcag_reference: { type: Type.STRING },
              axe_rule_id: { type: Type.STRING },
              apg_pattern: { type: Type.STRING },
              severity: { type: Type.STRING, enum: Object.values(Severity) },
              ease_of_fix: { type: Type.STRING, enum: ['Easy', 'Moderate', 'Hard'] },
              suggested_fix: { type: Type.STRING },
              generated_alt_text: { type: Type.STRING },
              timestamp: { type: Type.STRING },
              status: { type: Type.STRING },
              disclaimer: { type: Type.STRING }
            },
            required: ["issue_title", "issue_description", "wcag_reference", "axe_rule_id", "severity", "ease_of_fix", "suggested_fix", "timestamp", "status", "disclaimer"]
          }
        }
      },
      required: ["transcript", "issues"]
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze-media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video: video || null,
          images: images || [],
          systemInstruction,
          responseSchema
        }),
        signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Backend Analysis Request Failed: The server at ${API_BASE_URL} returned an error (${response.status} ${response.statusText}).`);
      }

      const data = await response.json();
      const parsedData = JSON.parse(data.text || '{}');

      // Helper function to capitalize impact values from Axe rules
      const capitalizeImpact = (impact: string): string => {
        return impact.charAt(0).toUpperCase() + impact.slice(1);
      };

      // Post-process issues to enforce Axe-core impact levels
      const issues = (parsedData.issues || []).map((issue: any) => {
        if (issue.apg_pattern && issue.apg_pattern.trim() !== '') {
          return { ...issue, impact_source: 'apg-pattern-heuristic' };
        }

        if (issue.axe_rule_id && issue.axe_rule_id.trim() !== '' && issue.axe_rule_id.toLowerCase() !== 'none') {
          const axeRule = AxeRulesService.getRuleById(issue.axe_rule_id);
          if (axeRule?.impact) {
            return { ...issue, severity: capitalizeImpact(axeRule.impact), impact_source: 'axe-core' };
          }
        }

        return { ...issue, impact_source: 'wcag-heuristic' };
      });

      return {
        transcript: parsedData.transcript || (hasVideo ? "No transcript generated." : "Screenshot analysis - no video transcript."),
        issues,
        metadata: data.metadata
      };
    } catch (err: any) {
      // Re-throw abort errors so they can be handled properly by the caller
      if (err.name === 'AbortError' || signal?.aborted) {
        const abortError = new Error('Analysis cancelled');
        abortError.name = 'AbortError';
        throw abortError;
      }
      console.error("Failed to analyze media:", err);
      throw new Error(err.message || `Media Analysis Pipeline Error: Unable to complete the analysis process.`);
    }
  }

  createAnalystChat(result: AnalysisResult): ProxyChat {
    const context = `
      You are the MediaToTicket AI Analyst. You provide ultra-concise, technical support for fixing accessibility barriers.
      
      STRICT RESPONSE GUIDELINES:
      1. BREVITY: Never use 50 words when 10 will do. Use bullet points for all lists.
      2. STRUCTURE: 
         - **Summary**: 1 sentence summary.
         - **Key Action**: 1-3 bulleted steps.
         - **Documentation**: Provide direct URLs to WCAG, Deque, or ARIA APG.
      3. LINKS: Always share relevant documentation links (URLs) from:
         - W3C WCAG (${WCAG22_QUICKREF})
         - ARIA APG Patterns (${ARIA_APG_REFERENCE})
         - Deque University Axe Rules (https://dequeuniversity.com/rules/axe/4.11/)
      
      CURRENT AUDIT DATA:
      - Issues: ${result.issues.length}
      - Findings: ${result.issues.map(i => i.issue_title).join(', ')}
      
      Note: You have access to comprehensive WCAG 2.2 data, all ${AxeRulesService.getRuleCount()} axe-core rules, and ${getAPGPatternCount()} ARIA APG patterns + ${getAPGPracticeCount()} practices from the video analysis context.
      
      Do not repeat the audit findings in full. Focus on answering the user's specific technical question.
    `;

    return new ProxyChat(context);
  }
}

// Proxy chat class that communicates with backend
class ProxyChat {
  private sessionId: string | null = null;
  private systemInstruction: string;

  constructor(systemInstruction: string) {
    this.systemInstruction = systemInstruction;
  }

  async sendMessageStream({ message }: { message: string }): Promise<AsyncIterable<{ text: string }>> {
    // Create session if not exists
    if (!this.sessionId) {
      const response = await fetch(`${API_BASE_URL}/api/create-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemInstruction: this.systemInstruction })
      });

      if (!response.ok) {
        throw new Error(`Chat Session Creation Failed: Unable to establish a chat session with the backend at ${API_BASE_URL}. The server may be unavailable or experiencing high load. Please try again in a moment.`);
      }

      const data = await response.json();
      this.sessionId = data.sessionId;
    }

    // Send message and stream response
    const response = await fetch(`${API_BASE_URL}/api/chat/${this.sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      throw new Error(`Chat Message Send Failed: Unable to send your message to the AI assistant. The chat session (ID: ${this.sessionId}) may have expired or the backend connection was lost. Please refresh the page and start a new analysis.`);
    }

    // Parse SSE stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Chat Response Stream Error: The server response did not include a readable stream. This indicates a backend communication issue. Please try sending your message again.');
    }

    const decoder = new TextDecoder();
    const chunks: { text: string }[] = [];

    return {
      async *[Symbol.asyncIterator]() {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                return;
              }
              try {
                const parsed = JSON.parse(data);
                yield parsed;
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    };
  }
}
