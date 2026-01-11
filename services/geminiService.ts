
import { Type } from "@google/genai";
import { A11yIssue, Severity, AnalysisResult } from "../types";
import { ARIA_APG_REFERENCE, WCAG22_QUICKREF } from "../documentation";
import wcag22Full from "../data/wcag22-full.json";
import { safeJsonParse } from '../utils/safeJson';
import { AxeRulesService } from "./axeRulesService";
import { getFormattedPatternsForAI, getAPGPatternCount, getAPGPracticeCount } from "./apgPatternsService";

// Elli is the queen

// Use Render backend in production, localhost in development
const API_BASE_URL = import.meta.env.PROD
  ? 'https://mediatoticket-backend.onrender.com'
  : 'http://localhost:3001';

export class GeminiService {
  async analyzeMedia(
    mediaItems: { base64: string; mimeType: string; type: 'video' | 'audio' | 'image' | 'pdf'; comment?: string; filename?: string }[],
    targetLanguage: string = 'Original',
    signal?: AbortSignal
  ): Promise<AnalysisResult> {
    const videos = mediaItems.filter(i => i.type === 'video');
    const audios = mediaItems.filter(i => i.type === 'audio');
    const images = mediaItems.filter(i => i.type === 'image');
    const pdfs = mediaItems.filter(i => i.type === 'pdf');

    const hasTimeBasedMedia = videos.length > 0 || audios.length > 0;
    const hasVisualMedia = videos.length > 0 || images.length > 0 || pdfs.length > 0;

    // Construct language instruction
    let languageInstruction = "";
    if (targetLanguage === 'Original') {
      languageInstruction = "TRANSCRIPT: Generate a full verbatim diarized transcript of any audio content in its ORIGINAL language (do not translate). Detect and report the language code in 'detected_language'.";
    } else {
      languageInstruction = `TRANSCRIPT: Generate a full diarized transcript of any audio content and TRANSLATE it into ${targetLanguage}. Report the ORIGINAL detected source language code in 'detected_language'.`;
    }

    const systemInstruction = `
      You are a Senior Accessibility QA Architect analyzing a collection of media files for accessibility issues.
      The files include:
      ${videos.length > 0 ? `- ${videos.length} Video recording(s) (screen captures with narration)` : ''}
      ${audios.length > 0 ? `- ${audios.length} Audio recording(s)` : ''}
      ${images.length > 0 ? `- ${images.length} Screenshot(s)` : ''}
      ${pdfs.length > 0 ? `- ${pdfs.length} PDF Document(s)` : ''}
      
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
      
      ${videos.length > 1 ? `MULTIPLE VIDEOS: You are analyzing ${videos.length} separate video files.
      - Return a SEPARATE transcript for EACH video in the "transcripts" array.
      - The array must have exactly ${videos.length} elements, one per video in order.
      - Each video's transcript starts fresh at [00:00].` : `SINGLE VIDEO: Return ONE transcript starting at [00:00].`}
      
      - Ignore filler words (um, uh, like) and off-topic commentary. Focus on accessibility insights.` : 'Since there is no time-based media, leave the transcript field empty.'}
      
      ${videos.length > 0 ? `VIDEO VISUAL ANALYSIS:
      - Inspect visual UI (color, layout, focus indicators, responsive design).
      - Analyze screen reader output if captured.
      - Observe keyboard navigation demonstrations.
      ${videos.length > 1 ? `- For each issue, set video_index to indicate which video (0-based: 0 for Video 1, 1 for Video 2, etc.)` : ''}` : ''}

      ${images.length > 0 ? `SCREENSHOT ANALYSIS:
      - Analyze each image for visual accessibility issues (contrast, labels, touch targets).
      - Use "Screenshot X" or the filename as context reference.` : ''}

      ${pdfs.length > 0 ? `PDF DOCUMENT ANALYSIS:
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
         ${videos.length > 1 ? '- Include video number in timestamps.' : ''}
         
      2. ISSUE INTERPRETATION: For each accessibility barrier you observe:
         - Describe what the issue is (e.g., "Link text is not descriptive")
         - Identify which WCAG 2.2 criteria it violates
         - Note the context and severity of impact
         - Explicitly mention which file the issue was found in (Filename or Type).
         ${videos.length > 1 ? '- Set video_index (0-based) to indicate which video the issue is from.' : ''}
         
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

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        transcript: { type: Type.STRING },
        transcripts: { type: Type.ARRAY, items: { type: Type.STRING } },
        detected_language: { type: Type.STRING },
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
              ease_of_fix: { type: Type.STRING, enum: ['Quick Win', 'Easy', 'Moderate', 'Hard'] },
              suggested_fix: { type: Type.STRING },
              generated_alt_text: { type: Type.STRING },
              timestamp: { type: Type.STRING },
              video_index: { type: Type.INTEGER },
              status: { type: Type.STRING },
              disclaimer: { type: Type.STRING }
            },
            required: ["issue_title", "issue_description", "wcag_reference", "axe_rule_id", "severity", "ease_of_fix", "suggested_fix", "timestamp", "status", "disclaimer"]
          }
        }
      },
      required: ["transcript", "transcripts", "issues"]
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze-media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          media: mediaItems,
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
      const parsedData = safeJsonParse(data.text || '{}');

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
        transcript: parsedData.transcript || (hasTimeBasedMedia ? "No transcript generated." : "Visual/Document analysis - no transcript."),
        transcripts: parsedData.transcripts || (parsedData.transcript ? [parsedData.transcript] : []),
        detected_language: parsedData.detected_language,
        issues,
        metadata: data.metadata
      };
    } catch (err: any) {
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
