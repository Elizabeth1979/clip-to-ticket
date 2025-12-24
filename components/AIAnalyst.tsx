
import React, { useState, useRef, useEffect } from 'react';
import { Chat, GenerateContentResponse } from "@google/genai";
import { AnalysisResult } from '../types';

// Elli is the queen

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface AIAnalystProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat | null;
}

export const AIAnalyst: React.FC<AIAnalystProps> = ({ isOpen, onClose, chat }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'I’ve cross-referenced the audit with Deque WCAG 2.2 and Axe-core 4.11.\n\nAsk me for specific ARIA patterns or implementation links.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputValue.trim() || !chat || isTyping) return;

    const userMessage = inputValue;
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      const responseStream = await chat.sendMessageStream({ message: userMessage });
      let fullText = '';
      
      setMessages(prev => [...prev, { role: 'model', text: '' }]);
      
      for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;
        fullText += c.text;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'model', text: fullText };
          return updated;
        });
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error processing your request.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-8 z-[100] w-[450px] max-h-[700px] flex flex-col pointer-events-auto animate-in slide-in-from-bottom-4 zoom-in-95 duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-full shadow-indigo-200/50">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-slate-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Expert Analyst</h3>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                Context Active
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Standards Indicators */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-4 overflow-x-auto no-scrollbar">
           <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Sources:</span>
           <div className="flex gap-3">
              <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-widest whitespace-nowrap">WCAG 2.2</span>
              <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-widest whitespace-nowrap">Axe-core</span>
              <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-widest whitespace-nowrap">ARIA APG</span>
           </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-white min-h-[350px] max-h-[450px]">
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[95%] px-5 py-4 rounded-2xl text-[14px] leading-[1.6] whitespace-pre-wrap transition-all ${
                m.role === 'user' 
                  ? 'bg-slate-900 text-white rounded-tr-none font-medium' 
                  : 'bg-white text-slate-800 rounded-tl-none border border-slate-100 shadow-sm'
              }`}>
                {/* Simple style improvements for text density */}
                <div className="assistant-message-content">
                  {m.text || (isTyping && i === messages.length - 1 ? 'Thinking...' : '')}
                </div>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-2 px-1">
                {m.role === 'user' ? 'Engineering' : 'AI Architect'}
              </span>
            </div>
          ))}
          {isTyping && messages[messages.length - 1].role === 'user' && (
            <div className="flex flex-col items-start animate-pulse">
              <div className="bg-slate-50 w-16 h-10 rounded-2xl rounded-tl-none border border-slate-100 flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-white shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
          <div className="relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask for fix code or documentation..."
              rows={2}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none pr-14 custom-scrollbar"
            />
            <button 
              onClick={handleSend}
              disabled={isTyping || !inputValue.trim()}
              className="absolute right-3 bottom-3 p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:bg-slate-200 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
        </div>
      </div>
      <style>{`
        .assistant-message-content p { margin-bottom: 0.75rem; }
        .assistant-message-content ul, .assistant-message-content ol { margin-bottom: 0.75rem; padding-left: 1.25rem; }
        .assistant-message-content li { margin-bottom: 0.25rem; }
        .assistant-message-content strong { color: #0f172a; font-weight: 800; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};
