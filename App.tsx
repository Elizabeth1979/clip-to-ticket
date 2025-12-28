
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { GeminiService } from './services/geminiService';
import { A11yIssue, GroupedReport, Severity, AnalysisResult, TranscriptLine, ImageItem } from './types';
import { ExportSection } from './components/ExportSection';
import { TableView } from './components/TableView';
import { AIAnalyst } from './components/AIAnalyst';
import { TransparencyPanel } from './components/TransparencyPanel';
import { InfoTooltip } from './components/InfoTooltip';
import { RICEExplainer } from './components/RICEExplainer';
import { ImageUploadSection } from './components/ImageUploadSection';
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
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
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

  const [showCaptions, setShowCaptions] = useState(true);
  const [captionTrackUrl, setCaptionTrackUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCaptionSettings, setShowCaptionSettings] = useState(false);

  // Caption customization settings
  const [captionFontSize, setCaptionFontSize] = useState(20);
  const [captionTextColor, setCaptionTextColor] = useState('#FFFFFF');
  const [captionBgColor, setCaptionBgColor] = useState('#000000');
  const [captionBgOpacity, setCaptionBgOpacity] = useState(0.8);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const geminiService = useMemo(() => new GeminiService(), []);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  useEffect(() => {
    if (result?.transcript) {
      setEditedTranscript(result.transcript);
      // Initialize AI Chat when results arrive
      const chat = geminiService.createAnalystChat(result);
      setAnalystChat(chat);
    }
  }, [result, geminiService]);

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
        const pattern = /^([^\[\n:]+)\s\[(\d{1,2}:\d{2})\]:\s*(.*)$/;
        const match = line.match(pattern);
        if (match) {
          const [, speaker, ts, message] = match;
          return {
            speaker,
            timestamp: ts,
            seconds: parseTimestamp(ts),
            message
          };
        }
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
  useEffect(() => {
    if (videoRef.current && videoRef.current.textTracks.length > 0) {
      const track = videoRef.current.textTracks[0];
      // Show native captions only in fullscreen mode when captions are enabled
      track.mode = (isFullscreen && showCaptions) ? 'showing' : 'hidden';
    }
  }, [isFullscreen, showCaptions]);



  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    setCurrentTime(e.currentTarget.currentTime);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type.startsWith('video/')) {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setFile(selected);
      setVideoUrl(URL.createObjectURL(selected));
      setError(null);
      setResult(null);
      setEditedTranscript("");
      setProgress(0);
      setCurrentTime(0);
      setAnalystChat(null);
    } else if (selected) {
      setError("Invalid File Format: The selected file is not a supported video format. Please choose a video file with one of these extensions: MP4, WebM, MOV, or MKV.");
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

      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setFile(exampleFile);
      setVideoUrl(URL.createObjectURL(exampleFile));
      setError(null);
      setResult(null);
      setEditedTranscript("");
      setProgress(0);
      setCurrentTime(0);
      setAnalystChat(null);
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
    if (!file && images.length === 0) {
      setError("No Media Selected: Please upload a video file or screenshots before starting the analysis.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);
    setButtonLabel("Processing media...");

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
      // Prepare video data if present
      const videoData = file ? {
        base64: await convertToBase64(file),
        mimeType: file.type
      } : undefined;

      // Prepare images data if present
      const imagesData = images.length > 0 ? await Promise.all(
        images.map(async (img) => ({
          base64: await convertToBase64(img.file),
          mimeType: img.file.type,
          comment: img.comment
        }))
      ) : undefined;

      const analysis = await geminiService.analyzeMedia(videoData, imagesData);
      clearInterval(interval);
      setProgress(100);
      setStatusMessage("Audit complete. Ready for review!");
      setResult(analysis);
    } catch (err: any) {
      clearInterval(interval);
      setError(err.message || "Media Analysis Failed: An unexpected error occurred while processing your media. Please try again or check the browser console for technical details.");
    } finally {
      setIsProcessing(false);
      setButtonLabel("Generate an accessibility report from media");
    }
  };

  const seekTo = (timestamp: string) => {
    if (videoRef.current) {
      const seconds = parseTimestamp(timestamp);
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <header className="bg-white border-b border-slate-200 py-4 px-8 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl tracking-tight text-slate-900 leading-none">MediaToTicket</h1>
              <p className="text-sm text-slate-400 tracking-[0.15em] mt-1">Narrate barriers. Ship tickets.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {result && (
              <button onClick={() => { setResult(null); setFile(null); setVideoUrl(null); setImages([]); setEditedTranscript(""); setCurrentTime(0); }} className="text-sm tracking-widest text-slate-500 hover:text-slate-900 px-4 py-2 transition-colors">
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

      <main className="max-w-[1600px] mx-auto p-6 pb-24 flex-1">
        {!result && (
          <div className="max-w-5xl mx-auto py-6">
            <div className="text-center mb-6">
              <h2 className="text-3xl text-slate-900 tracking-tight mb-2">Transform media into actionable reports.</h2>
              <p className="text-base text-slate-500">Upload video recordings, screenshots, or both for a WCAG-compliant audit.</p>
            </div>

            {/* Two Column Layout for Upload Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Video Upload Card */}
              <section className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200 overflow-hidden h-full">
                <div className="p-6 flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-slate-900">Video Recording</h3>
                      <p className="text-sm text-slate-400">MP4, WebM, or MOV</p>
                    </div>
                  </div>

                  <div className="flex-1">
                    {!file ? (
                      <label className="flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-slate-200 rounded-xl p-6 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all h-full min-h-[180px]">
                        <input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska" onChange={handleFileChange} className="hidden" />
                        <svg className="w-10 h-10 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        <span className="text-sm text-slate-600">Drop video here or click to browse</span>
                      </label>
                    ) : (
                      <div className="space-y-3">
                        <div className="aspect-video rounded-xl overflow-hidden bg-slate-900 shadow-lg border border-slate-800">
                          <video ref={previewVideoRef} src={videoUrl || ""} className="w-full h-full object-contain" controls />
                        </div>
                        <div className="flex items-center justify-between bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                          <span className="text-sm text-slate-700 truncate max-w-[200px]">{file.name}</span>
                          <button onClick={() => { setFile(null); setVideoUrl(null); }} className="text-sm text-red-500 hover:text-red-700 transition-colors">Remove</button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={loadExampleVideo}
                    className="w-full mt-auto px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Load Example Video
                  </button>
                </div>
              </section>

              {/* Screenshots Upload Card */}
              <section className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200 overflow-hidden h-full">
                <div className="p-6 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                      <div>
                        <h3 className="text-base font-medium text-slate-900">Screenshots</h3>
                        <p className="text-sm text-slate-400">PNG, JPG, WebP, GIF</p>
                      </div>
                    </div>
                    <label className="ml-4 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:border-amber-500 hover:text-amber-600 transition-all cursor-pointer flex items-center gap-2 flex-shrink-0">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                        multiple
                        onChange={(e) => {
                          const files = e.target.files;
                          if (!files) return;
                          const newImages = Array.from(files)
                            .filter((f: File) => f.type.startsWith('image/'))
                            .map((file: File) => ({
                              id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                              file,
                              url: URL.createObjectURL(file),
                              comment: ''
                            }));
                          if (newImages.length > 0) setImages(prev => [...prev, ...newImages]);
                          e.target.value = '';
                        }}
                        className="hidden"
                        disabled={isProcessing}
                      />
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                      Add Image
                    </label>
                  </div>

                  <div className="flex-1">
                    <ImageUploadSection
                      images={images}
                      onImagesChange={setImages}
                      disabled={isProcessing}
                      compact={true}
                    />
                  </div>

                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/examples/iframe.png');
                        if (!response.ok) return;
                        const blob = await response.blob();
                        const exampleFile = new File([blob], 'iframe.png', { type: 'image/png' });
                        const newImage = {
                          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                          file: exampleFile,
                          url: URL.createObjectURL(exampleFile),
                          comment: ''
                        };
                        setImages(prev => [...prev, newImage]);
                      } catch (err) {
                        console.error('Failed to load example image:', err);
                      }
                    }}
                    className="w-full mt-auto px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-amber-500 hover:text-amber-600 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Load Example Image
                  </button>
                </div>
              </section>
            </div>

            {/* Analyze Button - Below Both Cards */}
            {(file || images.length > 0) && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={processMedia}
                  disabled={isProcessing}
                  className={`px-10 py-4 rounded-2xl text-lg transition-all active:scale-[0.98] shadow-xl ${isProcessing ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-indigo-700 shadow-indigo-200'}`}
                >
                  {isProcessing ? "Analyzing..." : file && images.length > 0 ? `Analyze Video + ${images.length} Screenshot${images.length > 1 ? 's' : ''}` : file ? "Analyze Video Recording" : `Analyze ${images.length} Screenshot${images.length > 1 ? 's' : ''}`}
                </button>
              </div>
            )}

            {/* Progress Bar */}
            {isProcessing && (
              <div className="mt-6 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-slate-900">{statusMessage}</span>
                  <span className="text-sm text-indigo-600 font-medium">{progress}%</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 transition-all duration-700 ease-out rounded-full" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {error && (
              <div className="mt-8 p-6 bg-white rounded-2xl border-l-4 border-amber-500 shadow-xl shadow-slate-200/50 animate-in slide-in-from-top-2">
                <p className="text-slate-900 text-base">{error}</p>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="space-y-8 animate-in fade-in duration-1000">
            {/* Action Bar */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
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
                  {videoUrl && (
                    <video ref={videoRef} src={videoUrl} onTimeUpdate={handleTimeUpdate} controls className="w-full h-full object-contain">
                      {captionTrackUrl && (
                        <track
                          kind="captions"
                          src={captionTrackUrl}
                          srcLang="en"
                          label="English"
                        />
                      )}
                    </video>
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
              </div>

              {/* Transcript Panel (Scrollable) */}
              {isTranscriptVisible && (
                <div className="lg:w-[450px] w-full flex-shrink-0 bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-right-8 duration-500">
                  <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex flex-col">
                      <span className="text-sm tracking-widest text-slate-900">Narrative Analysis</span>
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
              />
            </div>

            {/* Product Transparency Section */}
            {result?.metadata && (
              <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div id="product-transparency" className="scroll-mt-24 mb-6 flex items-center gap-4">
                  <h3 className="text-sm tracking-[0.25em] text-slate-900 uppercase">Product Transparency</h3>
                  <InfoTooltip
                    content="Detailed technical breakdown of the AI analysis pipeline and the RICE priority scoring system."
                    position="right"
                  />
                  <div className="h-px flex-1 bg-slate-200"></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  <TransparencyPanel metadata={result.metadata} issueCount={result.issues.length} />
                  <RICEExplainer />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating AI Assistant Trigger & Component */}
      {result && (
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
      )}

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
    </div>
  );
};

export default App;
