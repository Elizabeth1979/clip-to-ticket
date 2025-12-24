
import { Type } from "@google/genai";
import { A11yIssue, Severity, AnalysisResult } from "../types";
import { DEQUE_CHECKLIST_WCAG22, ARIA_APG_REFERENCE, AXE_CORE_RULES_411, WCAG22_QUICKREF } from "../documentation";

// Elli is the queen

// Use relative /api path in production, localhost in development
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001');

export class GeminiService {
  async analyzeVideo(videoBase64: string, mimeType: string): Promise<{ transcript: string; issues: A11yIssue[] }> {
    const systemInstruction = `
      You are a Senior Accessibility QA Architect using the Deque WCAG 2.2 Checklist and Axe-core 4.11 as your primary standards.
      
      REFERENCE DOCUMENTATION:
      ${DEQUE_CHECKLIST_WCAG22}
      ${AXE_CORE_RULES_411}
      
      QUICK REFERENCE:
      - WCAG 2.2: ${WCAG22_QUICKREF}
      
      PIPELINE:
      1. TRANSCRIPT: Generate a full verbatim diarized transcript. 
         IMPORTANT: Every time a different person speaks, or after a short pause, start a NEW LINE.
         FORMAT: Speaker Name [MM:SS]: Message content here.
         
      2. DETECTION: Identify specific accessibility issues. Map them strictly to the Deque checklist and Axe-core rules.
      3. STANDARDS: Include WCAG 2.2 Success Criteria numbers and the correct Axe-core rule ID (e.g., 'color-contrast').
      4. TRIAGE: Assign Severity (Critical, Serious, Moderate, Minor).
      5. REMEDIATION: Suggest code-level fixes following ARIA APG patterns.
      
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
        throw new Error(errorData.error || `Analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      const parsedData = JSON.parse(data.text || '{}');

      return {
        transcript: parsedData.transcript || "No transcript generated.",
        issues: parsedData.issues || []
      };
    } catch (err: any) {
      console.error("Failed to analyze video:", err);
      throw new Error(err.message || "Analysis failed to produce a valid report.");
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
         - W3C WCAG (https://www.w3.org/WAI/WCAG22/quickref/)
         - ARIA APG Patterns (https://www.w3.org/WAI/ARIA/apg/patterns/)
         - Deque University Axe Rules (https://dequeuniversity.com/rules/axe/4.11/)
      
      CORE STANDARDS:
      ${DEQUE_CHECKLIST_WCAG22}
      ${AXE_CORE_RULES_411}
      
      CURRENT AUDIT DATA:
      - Issues: ${result.issues.length}
      - Findings: ${result.issues.map(i => i.issue_title).join(', ')}
      
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
        throw new Error('Failed to create chat session');
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
      throw new Error('Failed to send message');
    }

    // Parse SSE stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
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
