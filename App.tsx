
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { GeminiService } from './services/geminiService';
import { A11yIssue, GroupedReport, Severity, AnalysisResult, TranscriptLine } from './types';
import { IssueCard } from './components/IssueCard';
import { ExportSection } from './components/ExportSection';
import { TableView } from './components/TableView';
import { AIAnalyst } from './components/AIAnalyst';
import { Chat } from '@google/genai';

// Elli is the queen

type ViewMode = 'list' | 'table';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [editedTranscript, setEditedTranscript] = useState<string>("");
  const [isEditingSpeakers, setIsEditingSpeakers] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [buttonLabel, setButtonLabel] = useState("Generate an accessibility report from media");
  const [viewMode, setViewMode] = useState('table');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isTranscriptVisible, setIsTranscriptVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  
  const [isAnalystOpen, setIsAnalystOpen] = useState(false);
  const [analystChat, setAnalystChat] = useState<Chat | null>(null);
  
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
      setError("Please select a valid video recording (MP4, WebM, or MOV) before starting the analysis.");
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

  const processVideo = async () => {
    if (!file) {
      setError("Media Required: Please select a video recording (MP4, WebM, or MOV) before starting the analysis.");
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
      const base64 = await convertToBase64(file);
      const analysis = await geminiService.analyzeVideo(base64, file.type);
      clearInterval(interval);
      setProgress(100);
      setStatusMessage("Audit complete. Ready for review!");
      setResult(analysis);
    } catch (err: any) {
      clearInterval(interval);
      setError(err.message || "An error occurred during analysis.");
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

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white border-b border-slate-200 py-4 px-8 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">ClipToTicket</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-1">Narrate barriers. Ship tickets.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {result && (
              <button onClick={() => { setResult(null); setFile(null); setVideoUrl(null); setEditedTranscript(""); setCurrentTime(0); }} className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 px-4 py-2 transition-colors">
                New Audit
              </button>
            )}
            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-indigo-50/50 text-indigo-600 rounded-full border border-indigo-100 shadow-sm">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              AI Assistant • WCAG 2.2 & Axe-Core Verified
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-8 pb-32">
        {!result && (
          <div className="max-w-4xl mx-auto py-12">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">Transform video into actionable reports.</h2>
              <p className="text-lg text-slate-500 font-medium">Upload your narrated screen recording to generate a WCAG-compliant audit.</p>
            </div>

            <section className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
              <div className={`p-10 transition-all ${file ? 'bg-white' : 'hover:bg-slate-50 cursor-pointer'}`}>
                {!file && (
                  <label className="flex flex-col items-center justify-center min-h-[400px] cursor-pointer">
                    <input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska" onChange={handleFileChange} className="hidden" />
                    <div className="w-20 h-20 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center mb-6 text-indigo-600">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    </div>
                    <span className="text-xl font-bold text-slate-900 mb-2">Drop media to begin</span>
                    <span className="text-slate-500 font-medium">MP4, WebM, or MOV supported</span>
                  </label>
                )}
                
                {file && (
                  <div className="flex flex-col items-center">
                    <div className="w-full max-w-2xl aspect-video rounded-2xl overflow-hidden bg-slate-900 mb-10 shadow-2xl relative border border-slate-800">
                      <video ref={previewVideoRef} src={videoUrl || ""} className="w-full h-full object-contain" controls />
                    </div>
                    <div className="flex items-center gap-4 mb-10 bg-slate-50 px-6 py-3 rounded-full border border-slate-100">
                      <span className="text-sm font-bold text-slate-700 max-w-sm truncate">{file.name}</span>
                      <button onClick={() => setFile(null)} className="text-xs font-black text-red-500 uppercase tracking-widest">Remove</button>
                    </div>
                    <div className="w-full max-w-lg">
                      <button onClick={processVideo} disabled={isProcessing} className={`w-full py-5 rounded-2xl font-bold text-lg transition-all active:scale-[0.98] shadow-xl ${isProcessing ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-indigo-700 shadow-indigo-200'}`}>
                        {isProcessing ? "Analyzing..." : "Analyze Narrated Recording"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {isProcessing && (
                <div className="p-10 bg-slate-50 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-bold text-slate-900 uppercase tracking-widest">{statusMessage}</span>
                    <span className="text-sm font-black text-indigo-700">{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all duration-700 ease-out rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </section>

            {error && (
              <div className="mt-8 p-6 bg-white rounded-2xl border-l-4 border-amber-500 shadow-xl shadow-slate-200/50 animate-in slide-in-from-top-2">
                <p className="text-slate-900 font-bold text-base">{error}</p>
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
                  <h2 className="text-lg font-bold text-slate-900">Analysis Complete</h2>
                  <div className="flex items-center gap-4 mt-0.5">
                    <p className="text-slate-500 text-xs font-medium">{result.issues.length} points of interest identified.</p>
                    <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200">
                      <button onClick={() => setViewMode('table')} className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md ${viewMode === 'table' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>Table</button>
                      <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}>List</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsTranscriptVisible(!isTranscriptVisible)}
                  className="px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-slate-900 transition-all shadow-sm"
                >
                  {isTranscriptVisible ? 'Theater Mode' : 'Show Transcript'}
                </button>
                <ExportSection issues={result.issues} grouped={groupedIssues} />
              </div>
            </div>

            {/* Top Section: Video & Transcript Side-by-Side */}
            <div className="flex flex-col lg:flex-row gap-8 items-stretch h-auto lg:h-[600px]">
              {/* Video Panel */}
              <div className={`flex-grow bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden border border-slate-800 transition-all duration-500 relative ${isTranscriptVisible ? 'lg:w-2/3' : 'lg:w-full'}`}>
                <div className="w-full h-full relative bg-black flex items-center justify-center">
                  {videoUrl && <video ref={videoRef} src={videoUrl} onTimeUpdate={handleTimeUpdate} controls className="w-full h-full object-contain" />}
                </div>
                
                {/* Live Caption Overlay */}
                {activeLineIndex !== -1 && (
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-2xl px-8 pointer-events-none">
                    <div className="bg-black/80 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10 shadow-2xl text-center">
                       <p className="text-white text-lg font-bold leading-relaxed">
                         <span className="text-indigo-400 font-black uppercase text-xs tracking-widest mr-2">{parsedLines[activeLineIndex].speaker}:</span>
                         {parsedLines[activeLineIndex].message}
                       </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Transcript Panel (Scrollable) */}
              {isTranscriptVisible && (
                <div className="lg:w-[450px] w-full flex-shrink-0 bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-right-8 duration-500">
                  <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Narrative Analysis</span>
                      <button 
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1.5 transition-colors ${autoScroll ? 'text-indigo-600' : 'text-slate-400'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${autoScroll ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'}`}></div>
                        Live Follow {autoScroll ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={copyTranscript} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${copyFeedback ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-600'}`}>{copyFeedback ? 'Copied' : 'Copy'}</button>
                       <button onClick={() => setIsEditingSpeakers(!isEditingSpeakers)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isEditingSpeakers ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-600'}`}>{isEditingSpeakers ? 'Exit' : 'Speakers'}</button>
                    </div>
                  </div>

                  {isEditingSpeakers && (
                    <div className="p-6 bg-slate-50 border-b border-slate-100 space-y-4 max-h-[200px] overflow-y-auto custom-scrollbar">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Speaker Dictionary</p>
                      <div className="space-y-2">
                        {speakers.map((s) => (
                          <div key={s} className="flex items-center gap-2">
                            <input 
                              type="text" 
                              placeholder={s} 
                              className="flex-1 text-[11px] px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none font-bold" 
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
                            className={`group flex flex-col gap-2 p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                              isActive 
                                ? 'bg-indigo-50 border-indigo-200 shadow-sm scale-[1.02] z-10' 
                                : 'bg-white border-transparent hover:bg-slate-50'
                            }`}
                            onClick={() => seekTo(line.timestamp)}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isActive ? 'text-indigo-700' : 'text-slate-400'}`}>
                                {line.speaker}
                              </span>
                              <div className="flex items-center gap-2">
                                {isActive && <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest animate-pulse">Now Playing</span>}
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 group-hover:text-indigo-600'}`}>
                                  [{line.timestamp}]
                                </span>
                              </div>
                            </div>
                            <p className={`text-sm leading-relaxed font-medium transition-colors ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>
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
              <div className="mb-6 flex items-center gap-4">
                <h3 className="text-xs font-black uppercase tracking-[0.25em] text-slate-900">Detailed Findings</h3>
                <div className="h-px flex-1 bg-slate-200"></div>
              </div>
              {viewMode === 'table' ? (
                <TableView issues={result.issues} onSeek={seekTo} />
              ) : (
                <div className="space-y-12">
                  {(Object.entries(groupedIssues) as [string, A11yIssue[]][]).map(([groupName, issues]) => (
                    issues.length > 0 && (
                      <div key={groupName} className="space-y-6">
                        <div className="flex items-center gap-4">
                          <h2 className={`text-[10px] font-black uppercase tracking-widest ${groupName.includes('Critical') ? 'text-red-500' : 'text-slate-500'}`}>{groupName}</h2>
                          <div className="h-px flex-1 bg-slate-100"></div>
                          <span className="text-[10px] font-black text-slate-300">{issues.length} Issues</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {issues.map((issue, idx) => (
                            <IssueCard key={idx} issue={issue} onSeek={() => seekTo(issue.timestamp)} />
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
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
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z"/></svg>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-indigo-600 rounded-full"></span>
              </div>
            )}
            <div className="absolute right-full mr-4 px-3 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-xl">
              Open Assistant
            </div>
          </button>
        </>
      )}

      <footer className="max-w-[1600px] mx-auto p-8 border-t border-slate-100">
        <p className="text-center text-slate-300 text-[10px] font-black uppercase tracking-widest">
          Professional Accessibility Analysis Pipeline • ClipToTicket v1.5.0
        </p>
      </footer>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }`}</style>
    </div>
  );
};

export default App;
