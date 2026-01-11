
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { GeminiService } from './services/geminiService';
import { A11yIssue, GroupedReport, Severity, AnalysisResult, TranscriptLine, ImageItem, MediaItem } from './types';
import { ExportSection } from './components/ExportSection';
import { TableView } from './components/TableView';
import { AIAnalyst } from './components/AIAnalyst';
import { TransparencyPanel } from './components/TransparencyPanel';
import { InfoTooltip } from './components/InfoTooltip';
import { RICEExplainer } from './components/RICEExplainer';
import { UnifiedMediaUpload } from './components/UnifiedMediaUpload';
import { Chat } from '@google/genai';

// Elli is the queen



const STATUS_MESSAGES = [
  "Initializing assistant...",
  "Transcribing narration...",
  "Analyzing visual frames...",
  "Mapping WCAG criteria...",
  "Checking axe-core rules...",
  "Calculating severity...",
  "Generating fixes...",
  "Finalizing report..."
];

const App: React.FC = () => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeVideoIndex, setActiveVideoIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [editedTranscript, setEditedTranscript] = useState<string>("");
  const [isEditingSpeakers, setIsEditingSpeakers] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [buttonLabel, setButtonLabel] = useState("Generate an accessibility report from media");

  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isTranscriptVisible, setIsTranscriptVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);

  const [isAnalystOpen, setIsAnalystOpen] = useState(false);
  const [analystChat, setAnalystChat] = useState<Chat | null>(null);

  // Transcription language state
  const [targetLanguage, setTargetLanguage] = useState('Original');

  const [showCaptions, setShowCaptions] = useState(true);
  const [captionTrackUrl, setCaptionTrackUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCaptionSettings, setShowCaptionSettings] = useState(false);

  // Caption customization settings
  const [captionFontSize, setCaptionFontSize] = useState(20);
  const [captionTextColor, setCaptionTextColor] = useState('#FFFFFF');
  const [captionBgColor, setCaptionBgColor] = useState('#000000');
  const [captionBgOpacity, setCaptionBgOpacity] = useState(0.8);

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const geminiService = useMemo(() => new GeminiService(), []);

  useEffect(() => {
    return () => {
      // Cleanup object URLs when items are removed
      mediaItems.forEach(item => URL.revokeObjectURL(item.url));
    };
  }, []); // Only run on unmount? Or we need to be careful about revocation.
  // Actually UnifiedMediaUpload handles revocation on remove.
  // We just need to handle activeVideoUrl if it differs.

  useEffect(() => {
    if (result?.transcript) {
      // Debug: log transcript format
      console.log('[Transcript Debug] Raw transcript:', result.transcript?.substring(0, 500));
      console.log('[Transcript Debug] Transcripts array:', result.transcripts);

      // Use per-video transcript if available, otherwise use combined transcript
      if (result.transcripts && result.transcripts.length > activeVideoIndex) {
        setEditedTranscript(result.transcripts[activeVideoIndex]);
      } else {
        setEditedTranscript(result.transcript);
      }
      // Initialize AI Chat when results arrive
      const chat = geminiService.createAnalystChat(result);
      setAnalystChat(chat);
    }
  }, [result, geminiService]);

  // Switch transcript when active video changes
  useEffect(() => {
    if (result?.transcripts && result.transcripts.length > activeVideoIndex) {
      setEditedTranscript(result.transcripts[activeVideoIndex]);
    }
  }, [activeVideoIndex, result?.transcripts]);

  const parseTimestamp = (ts: string): number => {
    const clean = ts.replace(/[\[\]s]/g, '').trim();
    if (clean.includes(':')) {
      const parts = clean.split(':').map(Number);
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return parseFloat(clean) || 0;
  };

  const parsedLines = useMemo((): TranscriptLine[] => {
    if (!editedTranscript) return [];
    return editedTranscript.split('\n')
      .filter(line => line.trim())
      .map(line => {
        // Try multiple patterns to handle different AI transcript formats
        // Pattern 1: "Speaker [MM:SS]: Message" (original format)
        // Pattern 2: "Speaker [M:SS]: Message" (single digit minutes)
        // Pattern 3: "Speaker [HH:MM:SS]: Message" (with hours)
        // Pattern 4: "[MM:SS] Speaker: Message" (timestamp first)
        // Pattern 5: "Speaker (MM:SS): Message" (parentheses instead of brackets)

        // Original pattern: Speaker Name [MM:SS]: Message
        const pattern1 = /^([^\[\n]+?)\s*\[(\d{1,2}:\d{2}(?::\d{2})?)\]:\s*(.*)$/;
        const match1 = line.match(pattern1);
        if (match1) {
          const [, speaker, ts, message] = match1;
          return {
            speaker: speaker.trim(),
            timestamp: ts,
            seconds: parseTimestamp(ts),
            message
          };
        }

        // Pattern 2: [MM:SS] Speaker: Message
        const pattern2 = /^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^:]+):\s*(.*)$/;
        const match2 = line.match(pattern2);
        if (match2) {
          const [, ts, speaker, message] = match2;
          return {
            speaker: speaker.trim(),
            timestamp: ts,
            seconds: parseTimestamp(ts),
            message
          };
        }

        // Pattern 3: Speaker (MM:SS): Message (parentheses)
        const pattern3 = /^([^(\n]+?)\s*\((\d{1,2}:\d{2}(?::\d{2})?)\):\s*(.*)$/;
        const match3 = line.match(pattern3);
        if (match3) {
          const [, speaker, ts, message] = match3;
          return {
            speaker: speaker.trim(),
            timestamp: ts,
            seconds: parseTimestamp(ts),
            message
          };
        }

        // Fallback: treat line as system message
        return { speaker: 'System', timestamp: '00:00', seconds: 0, message: line };
      });
  }, [editedTranscript]);

  const activeLineIndex = useMemo(() => {
    let index = -1;
    for (let i = 0; i < parsedLines.length; i++) {
      if (parsedLines[i].seconds <= currentTime) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  }, [parsedLines, currentTime]);

  useEffect(() => {
    if (autoScroll && activeLineRef.current && transcriptContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeLineIndex, autoScroll]);

  // Generate WebVTT captions for fullscreen support
  useEffect(() => {
    if (parsedLines.length === 0) {
      setCaptionTrackUrl(null);
      return;
    }

    const formatTime = (seconds: number): string => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 1000);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    };

    let vttContent = 'WEBVTT\n\n';
    parsedLines.forEach((line, index) => {
      const startTime = line.seconds;
      const endTime = index < parsedLines.length - 1 ? parsedLines[index + 1].seconds : startTime + 5;

      vttContent += `${index + 1}\n`;
      vttContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
      vttContent += `${line.speaker}: ${line.message}\n\n`;
    });

    const blob = new Blob([vttContent], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);

    if (captionTrackUrl) {
      URL.revokeObjectURL(captionTrackUrl);
    }

    setCaptionTrackUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [parsedLines]);

  // Detect fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Control native caption visibility based on fullscreen and showCaptions state
  // Control native caption visibility based on fullscreen and showCaptions state
  useEffect(() => {
    const activeVideo = videoRefs.current[activeVideoIndex];
    if (activeVideo && activeVideo.textTracks.length > 0) {
      const track = activeVideo.textTracks[0];
      // Show native captions only in fullscreen mode when captions are enabled
      track.mode = (isFullscreen && showCaptions) ? 'showing' : 'hidden';
    }
  }, [isFullscreen, showCaptions, activeVideoIndex]);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    // Only update time if this event comes from the active video
    if (e.currentTarget === videoRefs.current[activeVideoIndex]) {
      setCurrentTime(e.currentTarget.currentTime);
    }
  };

  const loadExampleVideo = async () => {
    try {
      const response = await fetch('/examples/wix-video.mp4');
      if (!response.ok) {
        setError("Example Video Not Found: Unable to locate 'wix-video.mp4'. Expected location: /public/examples/wix-video.mp4. Please verify the file exists in your project's public/examples directory.");
        return;
      }
      const blob = await response.blob();
      const exampleFile = new File([blob], 'wix-video.mp4', { type: 'video/mp4' });

      const newItem: MediaItem = {
        id: `media_${Date.now()}_video`,
        file: exampleFile,
        type: 'video',
        url: URL.createObjectURL(exampleFile),
        comment: ''
      };

      setMediaItems(prev => [...prev, newItem]);
      setError(null);
      setResult(null);
      setEditedTranscript("");
      setProgress(0);
      setCurrentTime(0);
      setAnalystChat(null);
      setTargetLanguage('Original');
    } catch (err) {
      setError("Failed to Load Example Video: An error occurred while loading 'wix-video.mp4' from /public/examples/. This could be due to: (1) File not found in the expected location, (2) Network error, or (3) File permissions issue. Please check the browser console for more details.");
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const processMedia = async () => {
    if (mediaItems.length === 0) {
      setError("No Media Selected: Please upload a file (Video, Audio, Image, or PDF) before starting the analysis.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Create a new AbortController for this analysis
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);
    setButtonLabel("Processing media...");

    // Find first video to set as active for playback
    const videoItems = mediaItems.filter(item => item.type === 'video');
    if (videoItems.length > 0) {
      setActiveVideoUrl(videoItems[0].url);
      setActiveVideoIndex(0);
    } else {
      setActiveVideoUrl(null);
      setActiveVideoIndex(0);
    }

    const startTime = Date.now();
    const totalEstimatedMs = 30000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(98, Math.floor((elapsed / totalEstimatedMs) * 100));
      setProgress(newProgress);
      const msgIndex = Math.min(STATUS_MESSAGES.length - 1, Math.floor((elapsed / totalEstimatedMs) * STATUS_MESSAGES.length));
      setStatusMessage(STATUS_MESSAGES[msgIndex]);
    }, 200);

    try {
      const mediaData = await Promise.all(
        mediaItems.map(async (item) => ({
          base64: await convertToBase64(item.file),
          mimeType: item.file.type,
          type: item.type,
          comment: item.comment,
          filename: item.file.name
        }))
      );

      const analysis = await geminiService.analyzeMedia(mediaData, targetLanguage, abortController.signal);
      clearInterval(interval);
      setProgress(100);
      setStatusMessage("Audit complete. Ready for review!");
      setResult(analysis);
    } catch (err: any) {
      clearInterval(interval);
      // Check if the error was due to an abort
      if (err.name === 'AbortError') {
        setStatusMessage("Analysis cancelled.");
        setProgress(0);
      } else {
        setError(err.message || "Media Analysis Failed: An unexpected error occurred while processing your media. Please try again or check the browser console for technical details.");
      }
    } finally {
      setIsProcessing(false);
      setButtonLabel("Generate an accessibility report from media");
      abortControllerRef.current = null;
    }
  };

  const stopAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort('User cancelled the analysis');
    }
  };

  const seekTo = (timestamp: string, videoIdx?: number) => {
    const targetIndex = videoIdx !== undefined ? videoIdx : activeVideoIndex;

    // Switch to the target video if not already active
    if (targetIndex !== activeVideoIndex) {
      setActiveVideoIndex(targetIndex);
      const videoItems = mediaItems.filter(item => item.type === 'video');
      if (videoItems[targetIndex]) {
        setActiveVideoUrl(videoItems[targetIndex].url);
      }
    }

    // Seek in the target video
    const videoEl = videoRefs.current[targetIndex];
    if (videoEl) {
      const seconds = parseTimestamp(timestamp);
      videoEl.currentTime = seconds;
      videoEl.play();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const copyTranscript = () => {
    navigator.clipboard.writeText(editedTranscript);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const speakers = useMemo(() => {
    if (!editedTranscript) return [];
    const speakerRegex = /^([^\[\n:]+)(?=\s\[\d{1,2}:\d{2}\])/gm;
    const found = editedTranscript.match(speakerRegex);
    if (!found) return [];
    return Array.from(new Set(found.map(s => s.trim())));
  }, [editedTranscript]);

  const handleRenameSpeaker = (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;
    const escapedOldName = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escapedOldName}(?=\\s\\[\\d{1,2}:\\d{2}\\])`, 'gm');
    setEditedTranscript(prev => prev.replace(regex, newName.trim()));
  };

  const groupedIssues = useMemo(() => {
    if (!result) return {};
    const grouped: GroupedReport = {
      'Critical - Blockers': [],
      'Serious - Major': [],
      'Moderate - Moderate': [],
      'Minor - Minor': [],
    };
    result.issues.forEach((issue) => {
      const key = issue.severity === Severity.CRITICAL ? 'Critical - Blockers' :
        issue.severity === Severity.SERIOUS ? 'Serious - Major' :
          issue.severity === Severity.MODERATE ? 'Moderate - Moderate' :
            'Minor - Minor';
      grouped[key].push(issue);
    });
    return grouped;
  }, [result]);

  const handleUpdateIssue = useCallback((index: number, updatedIssue: A11yIssue) => {
    if (!result) return;
    const newIssues = [...result.issues];
    newIssues[index] = updatedIssue;
    setResult({ ...result, issues: newIssues });
  }, [result]);

  const handleDeleteIssue = useCallback((index: number) => {
    if (!result) return;
    const newIssues = result.issues.filter((_, i) => i !== index);
    setResult({ ...result, issues: newIssues });
  }, [result]);


  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col w-full max-w-[100vw]">
      <header className="bg-white border-b border-slate-200 py-4 px-4 lg:px-8 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200 shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl tracking-tight text-slate-900 leading-none">MediaToTicket</h1>
              <p className="text-sm text-slate-400 tracking-[0.15em] mt-1">Narrate barriers. Ship tickets.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {result && (
              <button onClick={() => {
                setResult(null);
                setMediaItems([]);
                setActiveVideoUrl(null);
                setEditedTranscript("");
                setCurrentTime(0);
              }} className="text-sm tracking-widest text-slate-500 hover:text-slate-900 px-4 py-2 transition-colors">
                New Audit
              </button>
            )}
            <span className="flex items-center gap-2 text-sm tracking-widest px-3 py-1 bg-indigo-50/50 text-indigo-600 rounded-full border border-indigo-100 shadow-sm">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              AI Assistant • WCAG 2.2 & Axe-Core Verified
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 lg:px-12 py-6 pb-24 flex-1 w-full">
        {!result && (
          <div className="max-w-5xl mx-auto py-6">
            <div className="text-center mb-6">
              <h2 className="text-3xl text-slate-900 tracking-tight mb-2">Transform media into actionable reports.</h2>
              <p className="text-base text-slate-500">Upload video recordings, screenshots, or both for a WCAG-compliant audit.</p>
            </div>

            {/* Unified Upload Section */}
            <div className="w-full">
              < UnifiedMediaUpload
                mediaItems={mediaItems}
                onMediaItemsChange={setMediaItems}
                disabled={isProcessing}
              />

              {mediaItems.length === 0 && (
                <div className="flex justify-center gap-4 mt-4">
                  <button
                    onClick={loadExampleVideo}
                    className="px-4 py-2 text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Load Example Video
                  </button>
                </div>
              )}
            </div>

            {/* Language Selector */}
            {
              (mediaItems.length > 0) && (
                <div className="mt-8 flex justify-center">
                  <div className="bg-white px-6 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                    <div className="flex items-center gap-2 text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                      <span className="text-sm font-medium">Output Language:</span>
                    </div>
                    <select
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      disabled={isProcessing}
                      className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
                    >
                      <option value="Original">Original (Auto-detect)</option>
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                      <option value="Hebrew">Hebrew</option>
                      <option value="Japanese">Japanese</option>
                      <option value="Chinese">Chinese</option>
                    </select>
                  </div>
                </div>
              )
            }

            {/* Analyze Button - Below Cards */}
            {
              (mediaItems.length > 0) && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={processMedia}
                    disabled={isProcessing}
                    className={`px-10 py-4 rounded-2xl text-lg transition-all active:scale-[0.98] shadow-xl ${isProcessing ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-indigo-700 shadow-indigo-200'}`}
                  >
                    {isProcessing ? "Analyzing..." : `Analyze ${mediaItems.length} File${mediaItems.length > 1 ? 's' : ''}`}
                  </button>
                </div>
              )
            }

            {/* Progress Bar */}
            {
              isProcessing && (
                <div className="mt-6 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-slate-900">{statusMessage}</span>
                    <span className="text-sm text-indigo-600 font-medium">{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all duration-700 ease-out rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                  <button
                    onClick={stopAnalysis}
                    className="mt-4 w-full px-4 py-2.5 bg-white border border-red-200 rounded-xl text-sm text-red-600 hover:bg-red-50 hover:border-red-400 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Stop Analysis
                  </button>
                </div>
              )
            }

            {
              error && (
                <div className="mt-8 p-6 bg-white rounded-2xl border-l-4 border-amber-500 shadow-xl shadow-slate-200/50 animate-in slide-in-from-top-2">
                  <p className="text-slate-900 text-base">{error}</p>
                </div>
              )
            }
          </div >
        )}

        {
          result && (
            <div className="space-y-8 animate-in fade-in duration-1000">
              {/* Action Bar */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-4 lg:p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div>
                    <h2 className="text-lg text-slate-900">Analysis Complete</h2>
                    <p className="text-red-600 text-sm mt-0.5">
                      {result.issues.length} issues detected – <a
                        href="#issues-table"
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById('issues-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="underline hover:text-red-800 transition-colors"
                      >see the table below</a>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      const element = document.getElementById('product-transparency');
                      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="flex items-center gap-1.5 text-sm tracking-widest text-indigo-600 hover:text-indigo-700 underline decoration-indigo-300 hover:decoration-indigo-500 underline-offset-4 transition-all"
                  >
                    Product Transparency
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13l-3 3m0 0l-3-3m3 3V8" />
                    </svg>
                  </button>
                  <ExportSection issues={result.issues} grouped={groupedIssues} />
                </div>
              </div>

              {/* Top Section: Video & Transcript Side-by-Side */}
              <div className="flex flex-col lg:flex-row gap-8 items-stretch h-auto lg:h-[600px]">
                {/* Video Panel */}
                <div className={`flex-grow bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden border border-slate-800 transition-all duration-500 relative ${isTranscriptVisible ? 'lg:w-2/3' : 'lg:w-full'}`}>
                  <div className="w-full h-full relative bg-black flex items-center justify-center">
                    {/* Render ALL videos but only show the active one */}
                    {mediaItems.filter(item => item.type === 'video').length > 0 ? (
                      mediaItems.filter(item => item.type === 'video').map((video, idx) => (
                        <video
                          key={video.id || idx}
                          ref={(el) => {
                            if (el) videoRefs.current[idx] = el;
                          }}
                          src={video.url}
                          onTimeUpdate={handleTimeUpdate}
                          controls
                          className={`w-full h-full object-contain ${idx === activeVideoIndex ? 'block' : 'hidden'}`}
                          style={{ display: idx === activeVideoIndex ? 'block' : 'none' }}
                        >
                          {captionTrackUrl && (
                            <track
                              kind="captions"
                              src={captionTrackUrl}
                              srcLang="en"
                              label="English"
                            />
                          )}
                        </video>
                      ))
                    ) : (
                      <div className="text-slate-500">No video selected</div>
                    )}

                    {/* Custom Caption Overlay - YouTube Style (only in normal mode) */}
                    {!isFullscreen && showCaptions && activeLineIndex !== -1 && parsedLines[activeLineIndex] && (
                      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 pointer-events-none px-4 w-full flex justify-center">
                        <div className="inline-block max-w-[90%]">
                          <p className="leading-tight text-center px-2 py-1 rounded"
                            style={{
                              fontSize: `${captionFontSize}px`,
                              color: captionTextColor,
                              backgroundColor: `${captionBgColor}${Math.round(captionBgOpacity * 255).toString(16).padStart(2, '0')}`,
                              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.9), -1px -1px 2px rgba(0, 0, 0, 0.9)',
                              letterSpacing: '0.01em'
                            }}>
                            <span style={{ opacity: 0.8, fontSize: `${Math.max(14, captionFontSize * 0.85)}px` }}>{parsedLines[activeLineIndex].speaker}: </span>
                            {parsedLines[activeLineIndex].message}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Video Controls */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      {/* Theater Mode Toggle */}
                      <button
                        onClick={() => setIsTranscriptVisible(!isTranscriptVisible)}
                        className="w-10 h-10 bg-black/60 hover:bg-black/80 rounded-lg flex items-center justify-center transition-all backdrop-blur-sm border border-white/10"
                        title={isTranscriptVisible ? "Theater mode (hide transcript)" : "Show transcript"}
                      >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {isTranscriptVisible ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          )}
                        </svg>
                      </button>

                      {/* Caption Settings Button */}
                      <button
                        onClick={() => setShowCaptionSettings(!showCaptionSettings)}
                        className="w-10 h-10 bg-black/60 hover:bg-black/80 rounded-lg flex items-center justify-center transition-all backdrop-blur-sm border border-white/10"
                        title="Caption settings"
                      >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>

                      {/* Caption Toggle Button */}
                      <button
                        onClick={() => setShowCaptions(!showCaptions)}
                        className="w-10 h-10 bg-black/60 hover:bg-black/80 rounded-lg flex items-center justify-center transition-all backdrop-blur-sm border border-white/10"
                        title={showCaptions ? "Hide captions" : "Show captions"}
                      >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {showCaptions ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          )}
                        </svg>
                      </button>
                    </div>

                    {/* Caption Settings Panel */}
                    {showCaptionSettings && (
                      <div className="absolute top-16 right-4 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-10">
                        <h3 className="text-sm text-slate-900 mb-4">Caption Settings</h3>

                        <div className="space-y-4">
                          {/* Font Size */}
                          <div>
                            <label className="text-sm text-slate-700 mb-2 block">
                              Font Size: {captionFontSize}px
                            </label>
                            <input
                              type="range"
                              min="14"
                              max="32"
                              value={captionFontSize}
                              onChange={(e) => setCaptionFontSize(Number(e.target.value))}
                              className="w-full"
                            />
                          </div>

                          {/* Text Color */}
                          <div>
                            <label className="text-sm text-slate-700 mb-2 block">
                              Text Color
                            </label>
                            <input
                              type="color"
                              value={captionTextColor}
                              onChange={(e) => setCaptionTextColor(e.target.value)}
                              className="w-full h-10 rounded border border-slate-300"
                            />
                          </div>

                          {/* Background Color */}
                          <div>
                            <label className="text-sm text-slate-700 mb-2 block">
                              Background Color
                            </label>
                            <input
                              type="color"
                              value={captionBgColor}
                              onChange={(e) => setCaptionBgColor(e.target.value)}
                              className="w-full h-10 rounded border border-slate-300"
                            />
                          </div>

                          {/* Background Opacity */}
                          <div>
                            <label className="text-sm text-slate-700 mb-2 block">
                              Background Opacity: {Math.round(captionBgOpacity * 100)}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={captionBgOpacity}
                              onChange={(e) => setCaptionBgOpacity(Number(e.target.value))}
                              className="w-full"
                            />
                          </div>

                          {/* Reset Button */}
                          <button
                            onClick={() => {
                              setCaptionFontSize(20);
                              setCaptionTextColor('#FFFFFF');
                              setCaptionBgColor('#000000');
                              setCaptionBgOpacity(0.8);
                            }}
                            className="w-full py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-700 transition-colors"
                          >
                            Reset to Defaults
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Video Gallery Thumbnails - shown when multiple videos */}
                  {(() => {
                    const videoItems = mediaItems.filter(item => item.type === 'video');
                    if (videoItems.length > 1) {
                      return (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-4 py-3">
                          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                            {videoItems.map((video, idx) => (
                              <button
                                key={video.id}
                                onClick={() => {
                                  // Pause the currently playing video
                                  const currentVideo = videoRefs.current[activeVideoIndex];
                                  if (currentVideo) {
                                    currentVideo.pause();
                                  }
                                  setActiveVideoIndex(idx);
                                  setActiveVideoUrl(video.url);
                                }}
                                className={`relative flex-shrink-0 w-24 h-14 rounded-lg overflow-hidden border-2 transition-all ${idx === activeVideoIndex
                                  ? 'border-indigo-500 ring-2 ring-indigo-400/50'
                                  : 'border-white/20 hover:border-white/50'
                                  }`}
                              >
                                <video
                                  src={video.url}
                                  className="w-full h-full object-cover"
                                  muted
                                  preload="metadata"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <span className="text-white text-xs font-medium bg-black/60 px-2 py-0.5 rounded">
                                    {idx + 1}
                                  </span>
                                </div>
                                {idx === activeVideoIndex && (
                                  <div className="absolute top-1 right-1">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                          <div className="text-center mt-1">
                            <span className="text-white/70 text-xs">
                              Video {activeVideoIndex + 1} of {videoItems.length}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Transcript Panel (Scrollable) */}
                {isTranscriptVisible && (
                  <div className="lg:w-[450px] w-full flex-shrink-0 bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-right-8 duration-500">
                    <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div className="flex flex-col">
                        <span className="text-sm tracking-widest text-slate-900">Narrative Analysis</span>
                        {result?.detected_language && (
                          <span className="text-[10px] text-slate-400 mt-0.5">Language: <span className="uppercase">{result.detected_language}</span></span>
                        )}
                      </div>
                      <button
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={`text-sm tracking-wider mt-0.5 flex items-center gap-1.5 transition-colors ${autoScroll ? 'text-indigo-600' : 'text-slate-400'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${autoScroll ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'}`}></div>
                        Live Follow {autoScroll ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={copyTranscript} className={`px-3 py-1.5 rounded-lg text-sm tracking-widest transition-all ${copyFeedback ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-600'}`}>{copyFeedback ? 'Copied' : 'Copy'}</button>
                      <button onClick={() => setIsEditingSpeakers(!isEditingSpeakers)} className={`px-3 py-1.5 rounded-lg text-sm tracking-widest transition-all ${isEditingSpeakers ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-600'}`}>{isEditingSpeakers ? 'Exit' : 'Speakers'}</button>
                    </div>


                    {isEditingSpeakers && (
                      <div className="p-6 bg-slate-50 border-b border-slate-100 space-y-4 max-h-[200px] overflow-y-auto custom-scrollbar">
                        <p className="text-sm tracking-widest text-slate-400">Speaker Dictionary</p>
                        <div className="space-y-2">
                          {speakers.map((s) => (
                            <div key={s} className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder={s}
                                className="flex-1 text-sm px-3 py-2 bg-white border border-slate-200 rounded-lg"
                                onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSpeaker(s, e.currentTarget.value); }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div ref={transcriptContainerRef} className="flex-1 p-4 overflow-y-auto custom-scrollbar bg-white scroll-smooth">
                      <div className="space-y-1">
                        {parsedLines.map((line, i) => {
                          const isActive = i === activeLineIndex;
                          return (
                            <div
                              key={i}
                              ref={isActive ? activeLineRef : null}
                              className={`group flex flex-col gap-2 p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${isActive
                                ? 'bg-indigo-50 border-indigo-200 shadow-sm scale-[1.02] z-10'
                                : 'bg-white border-transparent hover:bg-slate-50'
                                }`}
                              onClick={() => seekTo(line.timestamp)}
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <span className={`text-sm tracking-widest transition-colors ${isActive ? 'text-indigo-700' : 'text-slate-400'}`}>
                                  {line.speaker}
                                </span>
                                <div className="flex items-center gap-2">
                                  {isActive && <span className="text-sm text-indigo-500 tracking-widest animate-pulse">Now Playing</span>}
                                  <span className={`text-sm px-2 py-0.5 rounded-md transition-all ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 group-hover:text-indigo-600'}`}>
                                    [{line.timestamp}]
                                  </span>
                                </div>
                              </div>
                              <p className={`text-sm leading-relaxed transition-colors ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>
                                {line.message}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Section: Full Width Issues Table/List */}
              <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                <div id="issues-table" className="scroll-mt-24 mb-6 flex items-center gap-4">
                  <h3 className="text-sm tracking-[0.25em] text-slate-900">Detailed Findings</h3>
                  <InfoTooltip
                    content="These accessibility barriers were detected by AI analysis of your video, including visual inspection, screen reader output, and expert narration."
                    position="right"
                  />
                  <div className="h-px flex-1 bg-slate-200"></div>
                </div>
                <TableView
                  issues={result.issues}
                  onSeek={seekTo}
                  onUpdateIssue={handleUpdateIssue}
                  onDeleteIssue={handleDeleteIssue}
                  totalVideoCount={mediaItems.filter(item => item.type === 'video').length}
                />
              </div>

              {/* Product Transparency Section */}
              {
                result?.metadata && (
                  <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div id="product-transparency" className="scroll-mt-24 mb-6 flex items-center gap-4">
                      <h3 className="text-sm tracking-[0.25em] text-slate-900 uppercase">Product Transparency</h3>
                      <InfoTooltip
                        content="Detailed technical breakdown of the AI analysis pipeline and the RICE priority scoring system."
                        position="right"
                      />
                      <div className="h-px flex-1 bg-slate-200"></div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start w-full">
                      <TransparencyPanel metadata={result.metadata} issueCount={result.issues.length} />
                      <RICEExplainer />
                    </div>
                  </div>
                )
              }
            </div >
          )
        }
      </main >

      {/* Floating AI Assistant Trigger & Component */}
      {
        result && (
          <>
            <AIAnalyst
              isOpen={isAnalystOpen}
              onClose={() => setIsAnalystOpen(false)}
              chat={analystChat}
            />
            <button
              onClick={() => setIsAnalystOpen(!isAnalystOpen)}
              className={`fixed bottom-8 right-8 z-[110] w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-2xl active:scale-95 group ${isAnalystOpen ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'}`}
              aria-label="Toggle Assistant"
            >
              {isAnalystOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <div className="relative">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z" /></svg>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-indigo-600 rounded-full"></span>
                </div>
              )}
              <div className="absolute right-full mr-4 px-3 py-2 bg-slate-900 text-white text-sm tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-xl">
                Open Assistant
              </div>
            </button>
          </>
        )
      }

      <footer className="max-w-[1600px] mx-auto p-8 border-t border-slate-100 mt-auto">
        <p className="text-center text-slate-600 text-sm tracking-widest">
          made with ❤️ by e11i
        </p>
      </footer>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; } 
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } 
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; } 
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
        
        /* Native caption styling for fullscreen mode */
        video::cue {
          font-size: ${captionFontSize}px;
          line-height: 1.3;
          background-color: ${captionBgColor}${Math.round(captionBgOpacity * 255).toString(16).padStart(2, '0')};
          color: ${captionTextColor};
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.9), -1px -1px 2px rgba(0, 0, 0, 0.9);
        }
      `}</style>
    </div >
  );
};

export default App;
