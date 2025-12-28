# MediaToTicket - AI Context Document

## Project Identity

**Name**: MediaToTicket  
**Tagline**: Narrate barriers. Ship tickets.  
**Version**: 1.5.0  
**Type**: AI-powered accessibility QA tool

---

## Core Functionality

### What It Does
MediaToTicket analyzes video recordings of accessibility audits where QA engineers narrate issues as they navigate an application. The AI extracts:
1. Verbatim transcripts with speaker diarization and timestamps
2. Structured accessibility issues mapped to WCAG 2.2 and Axe-core 4.11
3. Severity classifications (Critical, Serious, Moderate, Minor)
4. Actionable remediation suggestions with code examples
5. Interactive AI assistance for implementation guidance

### How It Works
1. **Upload**: User uploads MP4/WebM/MOV screen recording
2. **Analysis**: Gemini 3 Flash processes video (audio + visual frames)
3. **Extraction**: AI generates transcript and identifies accessibility barriers
4. **Mapping**: Issues are mapped to WCAG criteria and Axe-core rules
5. **Review**: User reviews results in synchronized video + transcript interface
6. **Export**: Generate JSON/CSV/Markdown reports for ticketing systems

---

## Technical Architecture

### Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: TailwindCSS (via CDN) + custom CSS
- **AI**: Google Gemini 3 (Flash for analysis, Pro for chat)
- **Standards**: WCAG 2.2 AA, Axe-core 4.11, ARIA APG

### Key Files
- `App.tsx` (525 lines): Main application logic, state management, UI rendering
- `services/geminiService.ts`: Gemini API integration with structured schema
- `components/AIAnalyst.tsx`: Streaming chat interface for AI assistance
- `components/TableView.tsx`: Sortable/filterable issue table
- `components/IssueCard.tsx`: Individual issue card with WCAG links
- `components/ExportSection.tsx`: JSON/CSV/Markdown export functionality
- `types.ts`: TypeScript interfaces for A11yIssue, AnalysisResult, etc.
- `documentation.ts`: Embedded WCAG 2.2 and Axe-core reference documentation

### Data Flow
```
Video File → Base64 Encoding → Gemini API → JSON Response → State Management → UI Rendering
                                    ↓
                          System Instruction (WCAG + Axe-core context)
                                    ↓
                          Structured Schema (Type.OBJECT validation)
```

---

## Key Features

### 1. Video Analysis
- Accepts video/mp4, video/webm, video/quicktime, video/x-matroska
- Converts to base64 for Gemini API submission
- Progress tracking with 8-stage status messages
- Synchronized video playback with transcript highlighting

### 2. Transcript Management
- Automatic speaker diarization (Speaker Name [MM:SS]: Message)
- Editable transcript with speaker renaming
- Click-to-seek functionality (jump to timestamp in video)
- Live caption overlay during playback
- Auto-scroll with toggle control
- Copy-to-clipboard functionality

### 3. Issue Detection
- AI identifies accessibility barriers from narration + visual analysis
- Maps to WCAG 2.2 Success Criteria (e.g., 1.4.3, 2.4.7)
- References Axe-core rule IDs (e.g., color-contrast, aria-required-attr)
- Assigns severity: Critical, Serious, Moderate, Minor
- Generates suggested fixes with code examples
- Includes AI disclaimer for all findings

### 4. Reporting Views
- **Table View**: Sortable columns, severity badges, WCAG links, timestamp navigation
- **List View**: Grouped by severity, card-based layout, visual hierarchy
- **Theater Mode**: Hide transcript for full-screen video review
- Export to JSON (structured data), CSV (spreadsheet), Markdown (documentation)

### 5. AI Analyst
- Context-aware chat initialized with audit results
- Streaming responses for real-time feedback
- Direct documentation links (WCAG, ARIA APG, Deque)
- Google Search integration for latest best practices
- Ultra-concise technical responses (bullets, summaries, action steps)

---

## User Experience Patterns

### Visual Design
- **Color Palette**: Slate grays, indigo accents, severity-based colors (red/amber/blue)
- **Typography**: Inter font family, bold uppercase tracking for labels
- **Spacing**: Generous padding (p-6, p-8), rounded corners (rounded-2xl)
- **Shadows**: Layered shadows for depth (shadow-2xl, shadow-indigo-200)
- **Animations**: Smooth transitions, fade-in effects, pulse indicators

### Interaction Patterns
- **File Upload**: Drag-and-drop zone with visual feedback
- **Progress**: Real-time percentage + status messages during analysis
- **Video Controls**: Native HTML5 controls + custom timestamp navigation
- **Transcript**: Click line to seek, hover effects, active state highlighting
- **AI Chat**: Streaming text, typing indicators, keyboard shortcuts (Enter to send)
- **Export**: Dropdown menu with format selection

### Accessibility Features
- Semantic HTML structure (header, main, footer, sections)
- ARIA labels for icon buttons
- Keyboard navigation support
- Focus management (auto-scroll to active transcript line)
- Color contrast compliance (WCAG AA)
- Responsive layout (mobile-first approach)

---

## AI Integration Details

### Gemini 3 Flash (Video Analysis)
- **Model**: `gemini-3-flash-preview`
- **Input**: Base64 video + analysis prompt
- **System Instruction**: Embedded WCAG 2.2 + Axe-core 4.11 documentation
- **Output Schema**: Structured JSON with transcript + issues array
- **Response Format**: `application/json` with strict type validation

### Gemini 3 Pro (AI Analyst)
- **Model**: `gemini-3-pro-preview`
- **Mode**: Streaming chat with context
- **System Instruction**: Ultra-concise technical support, documentation links
- **Tools**: Google Search integration
- **Context**: Audit results (issue count, titles, severity distribution)

### Schema Definition
```typescript
{
  transcript: string,
  issues: Array<{
    issue_title: string,
    issue_description: string,
    wcag_reference: string,      // e.g., "1.4.3 Contrast (Minimum)"
    axe_rule_id: string,          // e.g., "color-contrast"
    severity: "Critical" | "Serious" | "Moderate" | "Minor",
    suggested_fix: string,
    generated_alt_text?: string,
    timestamp: string,            // e.g., "02:34"
    status: "Open" | "Resolved" | "Triaged",
    disclaimer: string
  }>
}
```

---

## State Management

### React Hooks Used
- `useState`: File, video URL, processing state, results, transcript, UI toggles
- `useRef`: Video element, transcript container, active line (for scrolling)
- `useEffect`: Cleanup, transcript initialization, auto-scroll behavior
- `useMemo`: Parsed transcript lines, grouped issues, speaker list
- `useCallback`: Not currently used (potential optimization)

### Key State Variables
- `file`: Uploaded video file object
- `videoUrl`: Object URL for video preview
- `isProcessing`: Boolean for loading state
- `result`: AnalysisResult (transcript + issues)
- `editedTranscript`: User-editable transcript string
- `currentTime`: Video playback position (seconds)
- `viewMode`: 'table' | 'list'
- `isTranscriptVisible`: Theater mode toggle
- `analystChat`: Gemini Chat instance

---

## Standards Compliance

### WCAG 2.2 Coverage
- **Perceivable**: Alt text generation, color contrast analysis, captions
- **Operable**: Keyboard navigation, focus management, target size
- **Understandable**: Consistent navigation, error identification, labels
- **Robust**: ARIA compliance, semantic markup, compatibility

### Axe-core 4.11 Rules
- ARIA attributes, roles, states
- Color contrast (4.5:1, 7:1)
- Form labels and names
- Keyboard accessibility
- Language attributes
- Image alternatives
- Structural semantics

### ARIA APG Patterns
- Referenced for remediation suggestions
- Links to W3C ARIA Authoring Practices Guide
- Pattern-based fix recommendations (e.g., accordion, dialog, tabs)

---

## Development Workflow

### Local Development
```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (port 3000)
npm run build        # Production build
npm run preview      # Preview production build
```

### Environment Setup
- Create `.env.local` with `GEMINI_API_KEY`
- Vite loads environment variables at build time
- API key injected via `process.env.API_KEY`

### Build Configuration
- **Vite**: Fast HMR, optimized bundling
- **TypeScript**: Strict mode enabled
- **React**: Fast Refresh for instant updates
- **TailwindCSS**: JIT compilation via CDN (not ideal for production)

---

## Known Limitations & Considerations

### Current Constraints
1. **TailwindCSS via CDN**: Not optimal for production (large bundle, no tree-shaking)
2. **No Backend**: All processing happens client-side (API key exposed in bundle)
3. **Video Size**: Large files may cause memory issues (no chunking)
4. **Browser Compatibility**: Modern browsers only (ES modules, async/await)
5. **No Persistence**: Results lost on page refresh (no database)
6. **Single User**: No authentication or multi-user support

### Security Notes
- API key is embedded in client bundle (visible in DevTools)
- No rate limiting or usage tracking
- No input validation beyond file type checking
- No CORS protection (runs on localhost)

### Performance Notes
- Base64 encoding blocks main thread for large videos
- No lazy loading for issue cards
- No virtualization for long transcript lists
- Gemini API calls can take 20-40 seconds

---

## Future Enhancement Opportunities

See `PRODUCT_ROADMAP.md` for detailed feature proposals and prioritization.

### Quick Wins
- Move TailwindCSS to build-time compilation
- Add loading skeletons during analysis
- Implement local storage for draft reports
- Add keyboard shortcuts documentation

### Strategic Improvements
- Backend API for secure key management
- Video chunking for large file support
- Real-time collaboration features
- Integration with Jira/GitHub/Linear
- Batch processing for multiple videos

---

## Code Style & Conventions

### TypeScript
- Strict mode enabled
- Explicit return types for functions
- Interface-based type definitions
- Enums for fixed value sets (Severity)

### React
- Functional components with hooks
- Props interfaces for all components
- Memoization for expensive computations
- Ref forwarding for DOM access

### CSS
- TailwindCSS utility classes
- Custom CSS for scrollbar styling
- Inline styles for dynamic values (progress bar)
- Responsive breakpoints (lg:, md:)

### Naming
- PascalCase for components (App, IssueCard)
- camelCase for functions/variables (handleFileChange, videoUrl)
- SCREAMING_SNAKE_CASE for constants (STATUS_MESSAGES)
- Descriptive names (isProcessing, editedTranscript)

---

## Testing Recommendations

### Manual Testing Checklist
- [ ] Upload various video formats (MP4, WebM, MOV)
- [ ] Test with different video lengths (30s, 5min, 30min)
- [ ] Verify transcript accuracy with multiple speakers
- [ ] Check timestamp synchronization
- [ ] Test export in all formats (JSON, CSV, Markdown)
- [ ] Validate WCAG links open correctly
- [ ] Test AI chat with various queries
- [ ] Verify keyboard navigation
- [ ] Test on mobile devices
- [ ] Check browser compatibility (Chrome, Firefox, Safari, Edge)

### Automated Testing (Not Implemented)
- Unit tests for utility functions (parseTimestamp, grouping logic)
- Integration tests for Gemini API calls
- E2E tests for upload → analysis → export flow
- Accessibility tests with axe-core or Pa11y
- Visual regression tests for UI components

---

## Deployment Considerations

### Production Checklist
- [ ] Move API key to backend service
- [ ] Compile TailwindCSS at build time
- [ ] Add error boundary for React crashes
- [ ] Implement analytics (usage tracking)
- [ ] Add rate limiting for API calls
- [ ] Optimize video encoding/compression
- [ ] Set up CDN for static assets
- [ ] Configure proper CORS headers
- [ ] Add monitoring and logging
- [ ] Create user documentation/tutorials

### Hosting Options
- **Vercel/Netlify**: Easy deployment, serverless functions for API proxy
- **AWS S3 + CloudFront**: Static hosting with CDN
- **Google Cloud Run**: Containerized deployment with auto-scaling
- **Self-hosted**: Docker container on VPS

---

## Community & Support

### Target Audience
- Accessibility QA engineers
- Frontend developers
- Product managers
- UX designers
- Compliance teams

### Use Cases
- Manual accessibility audits
- WCAG compliance documentation
- Developer training materials
- Client deliverables
- Internal QA processes

---

## Metadata

**Created**: 2024  
**Last Updated**: 2025-12-24  
**Maintainer**: Elizabeth P.  
**License**: MIT  
**Repository**: [Add GitHub URL]  
**AI Studio Link**: https://ai.studio/apps/drive/1eezviKRxVG6b1a1GYh7Ri2J411BAd_zJ

---

*This document provides comprehensive context for AI assistants (Claude, ChatGPT, Gemini) working on the MediaToTicket codebase.*
