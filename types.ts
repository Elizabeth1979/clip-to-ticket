
export enum Severity {
  CRITICAL = 'Critical',
  SERIOUS = 'Serious',
  MODERATE = 'Moderate',
  MINOR = 'Minor'
}

export interface A11yIssue {
  issue_title: string;
  issue_description: string;
  wcag_reference: string;
  axe_rule_id: string;
  severity: Severity;
  suggested_fix: string;
  generated_alt_text?: string;
  timestamp: string;
  screenshot_context?: string; // Base64 or description of visual
  status: 'Open' | 'Resolved' | 'Triaged';
  disclaimer: string;
}

export interface GroupedReport {
  [key: string]: A11yIssue[];
}

export interface TranscriptLine {
  speaker: string;
  timestamp: string;
  seconds: number;
  message: string;
  isNarrator?: boolean;
}

export interface AnalysisResult {
  transcript: string;
  issues: A11yIssue[];
}