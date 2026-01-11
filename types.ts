
export enum Severity {
  CRITICAL = 'Critical',
  SERIOUS = 'Serious',
  MODERATE = 'Moderate',
  MINOR = 'Minor'
}

// Uploaded image with optional comment describing the accessibility issue
export interface ImageItem {
  id: string;
  file: File;
  url: string;          // Object URL for preview
  comment: string;      // Description of the issue (can be empty)
}

export interface MediaItem {
  id: string;
  file: File;
  type: 'video' | 'image' | 'audio' | 'pdf';
  url: string;
  comment: string;
}

export interface A11yIssue {
  issue_title: string;
  issue_description: string;
  wcag_reference: string;
  axe_rule_id: string;
  apg_pattern?: string; // APG pattern ID (e.g., "toolbar", "menubar") for patterns without axe rules
  severity: Severity;
  ease_of_fix?: 'Easy' | 'Moderate' | 'Hard';
  suggested_fix: string;
  generated_alt_text?: string;
  timestamp: string;
  video_index?: number; // Which video (0-based) this issue was found in (for multi-video uploads)
  screenshot_context?: string; // Base64 or description of visual
  status: 'Open' | 'Resolved' | 'Triaged';
  disclaimer: string;
  impact_source?: 'axe-core' | 'wcag-heuristic';
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

export interface CostBreakdown {
  inputTokens: number;
  outputTokens: number;
  videoSeconds?: number;
  imageCount?: number;    // Number of images analyzed
  inputCost: number;
  outputCost: number;
  videoCost: number;
  totalCost: number;
}

export interface ProcessingStage {
  name: string;
  startTime: number;
  endTime?: number;
  status: 'pending' | 'running' | 'complete' | 'error';
}

export interface AnalysisMetadata {
  systemPrompt: string;
  model: string;
  processingTimeMs: number;
  costBreakdown: CostBreakdown;
  stages: ProcessingStage[];
  timestamp: string;
}

export interface AnalysisResult {
  transcript: string;
  transcripts?: string[]; // Per-video transcripts (for multi-video uploads)
  detected_language?: string;
  issues: A11yIssue[];
  metadata?: AnalysisMetadata;
}