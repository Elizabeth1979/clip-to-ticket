
import { Type } from "@google/genai";
import { A11yIssue, Severity, AnalysisResult } from "../types";
import { ARIA_APG_REFERENCE, WCAG22_QUICKREF } from "../documentation";
import wcag22Full from "../data/wcag22-full.json";
import { AxeRulesService } from "./axeRulesService";

// Elli is the queen

// Use Render backend in production, localhost in development
const API_BASE_URL = import.meta.env.PROD
  ? 'https://cliptoticket-backend.onrender.com'
  : 'http://localhost:3001';

export class GeminiService {
  async analyzeVideo(videoBase64: string, mimeType: string): Promise<AnalysisResult> {
    const systemInstruction = `
      You are a Senior Accessibility QA Architect analyzing comprehensive screen recordings that include:
      - Visual UI inspection (color, layout, focus indicators, responsive design)
      - Screen reader output (NVDA, JAWS, VoiceOver, etc.)
      - Keyboard navigation demonstrations
      - Expert commentary and narration on accessibility barriers
      
      Through this multimodal analysis, you can detect ALL WCAG 2.2 Success Criteria.
      
      COMPREHENSIVE WCAG 2.2 REFERENCE:
      ${JSON.stringify(wcag22Full, null, 2)}
      
      COMPLETE AXE-CORE RULES (${AxeRulesService.getRuleCount()} rules):
      ${AxeRulesService.getFormattedRulesForAI()}
      
      
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
         
      3. AXE RULE MATCHING: For each issue identified above:
         - Search the Axe-core rules for a rule that matches THIS SPECIFIC issue
         - The rule description must align with your issue description
         - If you find a confident match, provide the axe_rule_id
         - If no clear match exists, leave axe_rule_id empty
         - IMPORTANT: Do not force a match - it's better to leave it empty than to provide an incorrect rule
         
      4. SEVERITY ASSIGNMENT:
         - If you provided an axe_rule_id: The system will use that rule's impact level automatically
         - If axe_rule_id is empty: Use WCAG conformance level as your guide:
           * WCAG Level A violations → Critical (blocks basic access)
           * WCAG Level AA violations → Serious (significant barriers)
           * Best practices → Moderate (usability issues)
           * Minor issues → Minor
      
      5. EASE OF FIX ASSESSMENT: Classify the difficulty to fix this issue:
         - Easy: Static attributes (adding aria-label, aria-hidden, role, alt text, etc.)
         - Moderate: Focus management, dynamic ARIA (aria-expanded, aria-checked, aria-live)
         - Hard: Complex keyboard implementation (tabs, modal dialogs, custom widgets)
      
      6. REMEDIATION: Provide code-level fixes using:
         - Examples from the Axe-core rules above
         - ARIA APG patterns where applicable
         - Specific, actionable code snippets
      
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
        })
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
        // If AI provided an Axe rule ID, enforce that rule's impact
        if (issue.axe_rule_id && issue.axe_rule_id.trim() !== '') {
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
      console.error("Failed to analyze video:", err);
      throw new Error(err.message || `Video Analysis Pipeline Error: Unable to complete the analysis process. Common causes include: (1) Backend server unreachable at ${API_BASE_URL}, (2) Network connectivity issues, (3) Video encoding not supported, or (4) Response parsing failure. Check your network connection and ensure the backend server is running.`);
    }
  }

  createAnalystChat(result: AnalysisResult): ProxyChat {
    const context = `
      You are the ClipToTicket AI Analyst. You provide ultra-concise, technical support for fixing accessibility barriers.
      
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
      
      Note: You have access to comprehensive WCAG 2.2 data and all ${AxeRulesService.getRuleCount()} axe-core rules from the video analysis context.
      
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
