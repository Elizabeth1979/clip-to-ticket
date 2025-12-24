# ClipToTicket

<div align="center">

**Narrate barriers. Ship tickets.**

An AI-powered accessibility QA tool that transforms narrated screen recordings into structured, WCAG 2.2 compliant accessibility reports.

[![WCAG 2.2](https://img.shields.io/badge/WCAG-2.2%20AA-blue)](https://www.w3.org/WAI/WCAG22/quickref/)
[![Axe-core](https://img.shields.io/badge/Axe--core-4.11-purple)](https://dequeuniversity.com/rules/axe/4.11)
[![Powered by Gemini](https://img.shields.io/badge/AI-Google%20Gemini-orange)](https://ai.google.dev/)

</div>

---

## 🎯 Overview

ClipToTicket revolutionizes accessibility testing by combining AI-powered video analysis with industry-standard compliance frameworks. Simply record your screen while narrating accessibility issues, and ClipToTicket generates a comprehensive audit report with:

- **Verbatim transcripts** with speaker diarization and timestamps
- **WCAG 2.2 compliance mapping** for each identified issue
- **Axe-core rule references** for automated validation
- **Severity classification** (Critical, Serious, Moderate, Minor)
- **Actionable remediation code** following ARIA APG patterns
- **Interactive AI analyst** for technical implementation guidance

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

### 1. Record Your Audit
- Use your preferred screen recording tool (QuickTime, OBS, Loom, etc.)
- Navigate through the application you're testing
- **Narrate accessibility issues as you find them**
- Include timestamps, WCAG criteria, and descriptions

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
| **AI/ML** | Google Gemini 3 (Flash & Pro) |
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
