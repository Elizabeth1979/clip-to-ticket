
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
         
      2. DETECTION: Identify specific accessibility issues by analyzing:
         - Visual elements (contrast, focus, layout, spacing)
         - Audio content (screen reader announcements, keyboard sounds, narration)
         - Behavioral patterns (navigation flow, interactions, error handling)
         
      3. STANDARDS MAPPING: 
         - Map each issue to exact WCAG 2.2 Success Criteria (use the comprehensive reference above)
         - Include correct Axe-core rule ID from the enhanced rules (e.g., 'color-contrast')
         - Reference specific techniques and examples from the knowledge base
         
      4. TRIAGE: Assign accurate Severity based on impact:
         - Critical: Blocks access completely
         - Serious: Significant barrier to access
         - Moderate: Noticeable difficulty
         - Minor: Inconvenience but accessible
         
      5. REMEDIATION: Provide code-level fixes using:
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
              suggested_fix: { type: Type.STRING },
              generated_alt_text: { type: Type.STRING },
              timestamp: { type: Type.STRING },
              status: { type: Type.STRING },
              disclaimer: { type: Type.STRING }
            },
            required: ["issue_title", "issue_description", "wcag_reference", "axe_rule_id", "severity", "suggested_fix", "timestamp", "status", "disclaimer"]
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

      return {
        transcript: parsedData.transcript || "No transcript generated.",
        issues: parsedData.issues || [],
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
