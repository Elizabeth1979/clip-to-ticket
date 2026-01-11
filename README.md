# ClipToTicket

<div align="center">

**Narrate barriers. Ship tickets.**

An AI-powered accessibility QA tool that transforms narrated screen recordings into structured, WCAG 2.2 compliant accessibility reports.

[![WCAG 2.2](https://img.shields.io/badge/WCAG-2.2%20AA-blue)](https://www.w3.org/WAI/WCAG22/quickref/)
[![Axe-core](https://img.shields.io/badge/Axe--core-4.11-purple)](https://dequeuniversity.com/rules/axe/4.11)
[![Powered by Gemini](https://img.shields.io/badge/AI-Google%20Gemini%202.5-orange)](https://ai.google.dev/)

</div>

---

## 🎯 Overview

ClipToTicket revolutionizes accessibility testing by combining AI-powered video analysis with industry-standard compliance frameworks. Record your screen while testing with **screen readers, keyboard navigation, and expert narration**, and ClipToTicket generates a comprehensive audit report with:

- **Verbatim transcripts** with speaker diarization and timestamps
- **Complete WCAG 2.2 coverage** - detects ALL success criteria (A, AA, AAA) through multimodal analysis
- **Axe-core rule references** with code examples for automated validation
- **Severity classification** (Critical, Serious, Moderate, Minor)
- **Actionable remediation code** following ARIA APG patterns
- **Interactive AI analyst** for technical implementation guidance

### What Makes ClipToTicket Unique?

Unlike traditional automated tools that only scan static HTML, ClipToTicket analyzes **comprehensive accessibility testing** including:
- 👁️ **Visual inspection** - color contrast, focus indicators, layout, responsive design
- 🔊 **Screen reader output** - NVDA, JAWS, VoiceOver announcements and behavior
- ⌨️ **Keyboard navigation** - tab order, focus management, keyboard traps
- 💬 **Expert commentary** - your narration explaining barriers and context

This multimodal approach enables detection of **all WCAG 2.2 Success Criteria**, not just what automated scanners can find.

---

## ✨ Key Features

### 🎥 Video Analysis
- Upload MP4, WebM, or MOV screen recordings
- AI-powered transcription with automatic speaker detection
- Frame-by-frame visual accessibility analysis
- Synchronized video playback with live captions

### 📊 Comprehensive Reporting
- **Table View**: Sortable, filterable issue grid
- **List View**: Grouped by severity with detailed cards
- **Export Options**: JSON, CSV, or Markdown formats
- Real-time progress tracking with status updates

### 🤖 AI-Powered Assistant
- Context-aware chat with audit data
- Direct links to WCAG, ARIA APG, and Deque documentation
- Code-level fix suggestions
- Google Search integration for latest best practices

### 🎨 Professional UX
- Modern, accessible interface design
- Theater mode for distraction-free video review
- Live transcript following with auto-scroll
- Speaker renaming and transcript editing
- Responsive layout optimized for all screen sizes

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **Gemini API Key** ([Get one here](https://ai.google.dev/))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd clip-to-ticket
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   
   Create a `.env.local` file in the project root:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:3000`

---

## 📖 How to Use

### 1. Record Your Comprehensive Audit

ClipToTicket analyzes **all aspects** of your accessibility testing. Here's how to create effective recordings:

**Basic Setup:**
- Use your preferred screen recording tool (QuickTime, OBS, Loom, etc.)
- Enable audio recording to capture screen reader output and your narration
- Recommended: Use a headset to clearly capture screen reader announcements

**Testing Workflow Examples:**

**Example 1: Screen Reader Testing**
```
1. Start screen reader (NVDA, JAWS, or VoiceOver)
2. Begin recording
3. Navigate through the application
4. Narrate issues: "The screen reader announces 'button' without a label here"
5. Demonstrate the problem with keyboard navigation
```

**Example 2: Keyboard Navigation Testing**
```
1. Begin recording
2. Use only keyboard (Tab, Shift+Tab, Arrow keys, Enter)
3. Narrate: "Focus indicator is invisible on this button"
4. Show the visual issue
5. Explain the WCAG criteria violated
```

**Example 3: Visual + Commentary**
```
1. Begin recording
2. Zoom in on low contrast text
3. Narrate: "This text has insufficient color contrast, likely violating 1.4.3"
4. Show the element in context
```

### 2. Upload & Analyze
- Drag and drop your video into ClipToTicket
- Click "Analyze Narrated Recording"
- Wait for AI processing (typically 20-40 seconds)

### 3. Review Results
- Watch the video with synchronized transcript
- Review identified issues in Table or List view
- Click timestamps to jump to specific moments
- Edit speaker names for clarity

### 4. Get AI Assistance
- Click the AI Assistant button (bottom-right)
- Ask for implementation details, ARIA patterns, or documentation links
- Get code-level fixes for specific issues

### 5. Export Report
- Choose your format: JSON, CSV, or Markdown
- Share with development team or import into Jira/GitHub

---

## 🏗️ Technology Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | React 19, TypeScript, Vite |
| **Styling** | TailwindCSS, Custom CSS |
| **AI/ML** | Google Gemini 2.5 Flash |
| **Standards** | WCAG 2.2 AA, Axe-core 4.11, ARIA APG |
| **Build Tool** | Vite 6 |

---

## 📁 Project Structure

```
clip-to-ticket/
├── components/
│   ├── AIAnalyst.tsx       # AI chat interface
│   ├── ExportSection.tsx   # Export functionality
│   ├── IssueCard.tsx       # Individual issue display
│   └── TableView.tsx       # Tabular issue view
├── services/
│   └── geminiService.ts    # Gemini API integration
├── App.tsx                 # Main application component
├── types.ts                # TypeScript type definitions
├── documentation.ts        # WCAG & Axe-core references
├── index.tsx               # Application entry point
├── index.html              # HTML template
├── vite.config.ts          # Vite configuration
└── package.json            # Dependencies
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Your Google Gemini API key | ✅ Yes |

### Vite Configuration

The application uses Vite for fast development and optimized builds. Key configurations:

- **Port**: 3000 (configurable in `vite.config.ts`)
- **Host**: 0.0.0.0 (allows network access)
- **Environment**: Loads `.env.local` for API keys

---

## 🎨 Design Philosophy

ClipToTicket follows **W3C Web Content Accessibility Guidelines** and modern UX principles:

- **Semantic HTML**: Proper heading hierarchy, landmarks, and ARIA labels
- **Keyboard Navigation**: Full keyboard accessibility for all interactive elements
- **Color Contrast**: WCAG AA compliant contrast ratios (4.5:1 minimum)
- **Focus Management**: Clear focus indicators and logical tab order
- **Responsive Design**: Mobile-first approach with flexible layouts
- **Performance**: Optimized video handling and lazy loading

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **Deque Systems** for WCAG checklists and Axe-core rules
- **W3C** for WCAG 2.2 and ARIA APG standards
- **Google** for Gemini AI capabilities
- **Accessibility community** for continuous guidance and feedback

---

## 📞 Support

For questions, issues, or feature requests:

- 📧 Email: [Your contact email]
- 🐛 Issues: [GitHub Issues](your-repo-url/issues)
- 💬 Discussions: [GitHub Discussions](your-repo-url/discussions)

---

<div align="center">

**Made with ❤️ for the accessibility community**

*ClipToTicket v1.5.0*

</div>
