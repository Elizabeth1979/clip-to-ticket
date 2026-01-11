import React, { useRef, useCallback } from 'react';
import { MediaItem } from '../types';

interface UnifiedMediaUploadProps {
    mediaItems: MediaItem[];
    onMediaItemsChange: (items: MediaItem[]) => void;
    disabled?: boolean;
}

export const UnifiedMediaUpload: React.FC<UnifiedMediaUploadProps> = ({
    mediaItems,
    onMediaItemsChange,
    disabled = false
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getMediaType = (file: File): 'video' | 'image' | 'audio' | 'pdf' | null => {
        if (file.type.startsWith('image/')) return 'image';
        if (file.type.startsWith('video/')) return 'video';
        if (file.type.startsWith('audio/')) return 'audio';
        if (file.type === 'application/pdf') return 'pdf';
        return null;
    };

    const handleFileSelect = useCallback((files: FileList | null) => {
        if (!files || disabled) return;

        const newItems: MediaItem[] = [];
        Array.from(files).forEach(file => {
            const type = getMediaType(file);
            if (type) {
                newItems.push({
                    id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    file,
                    type,
                    url: URL.createObjectURL(file),
                    comment: ''
                });
            }
        });

        if (newItems.length > 0) {
            onMediaItemsChange([...mediaItems, ...newItems]);
        }
    }, [mediaItems, onMediaItemsChange, disabled]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleFileSelect(e.dataTransfer.files);
    }, [handleFileSelect]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const removeMedia = useCallback((id: string) => {
        const itemToRemove = mediaItems.find(item => item.id === id);
        if (itemToRemove) {
            URL.revokeObjectURL(itemToRemove.url);
        }
        onMediaItemsChange(mediaItems.filter(item => item.id !== id));
    }, [mediaItems, onMediaItemsChange]);

    const updateComment = useCallback((id: string, comment: string) => {
        onMediaItemsChange(mediaItems.map(item =>
            item.id === id ? { ...item, comment } : item
        ));
    }, [mediaItems, onMediaItemsChange]);

    return (
        <div className="w-full">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*,application/pdf"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
                disabled={disabled}
            />

            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => !disabled && fileInputRef.current?.click()}
                className={`border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center transition-all cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-400 hover:bg-indigo-50/10'
                    }`}
            >
                <div className="flex flex-col items-center gap-4">
                    <div className="flex gap-2 text-slate-300">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-slate-700">Drop files here or click to upload</h3>
                        <p className="text-sm text-slate-500 mt-1">Support for Video, Audio, Images, and PDF documents</p>
                    </div>
                </div>
            </div>

            {mediaItems.length > 0 && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mediaItems.map((item, index) => (
                        <div key={item.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col group">
                            {/* Media Preview / Thumbnail Area */}
                            <div className="relative aspect-video bg-slate-100 border-b border-slate-100 flex items-center justify-center overflow-hidden">
                                {item.type === 'image' ? (
                                    <img src={item.url} alt="Preview" className="w-full h-full object-cover" />
                                ) : item.type === 'video' ? (
                                    <div className="w-full h-full relative">
                                        <video
                                            src={item.url}
                                            className="w-full h-full object-cover"
                                            muted
                                            preload="metadata"
                                            onMouseOver={e => e.currentTarget.play()}
                                            onMouseOut={e => {
                                                e.currentTarget.pause();
                                                e.currentTarget.currentTime = 0;
                                            }}
                                        />
                                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/10 group-hover:bg-transparent transition-colors">
                                            <div className="bg-black/40 rounded-full p-2 backdrop-blur-sm">
                                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                            </div>
                                        </div>
                                        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 text-white text-[10px] uppercase font-bold rounded tracking-wider backdrop-blur-sm">
                                            Video
                                        </span>
                                    </div>
                                ) : item.type === 'audio' ? (
                                    <div className="flex flex-col items-center gap-2 p-4 w-full">
                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                                            <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                        </div>
                                        <audio
                                            src={item.url}
                                            controls
                                            className="w-4/5 h-8 mt-2"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">PDF Document</span>
                                    </div>
                                )}

                                {/* Remove Button (Overlay) */}
                                <button
                                    onClick={() => removeMedia(item.id)}
                                    className="absolute top-2 right-2 w-7 h-7 bg-white/90 hover:bg-white text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center shadow-sm backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                                    title="Remove file"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {/* Card Content */}
                            <div className="p-4 flex flex-col gap-3 flex-1">
                                <div>
                                    <h4 className="font-medium text-slate-900 text-sm truncate" title={item.file.name}>{item.file.name}</h4>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>
                                </div>

                                <div className="mt-auto">
                                    <input
                                        type="text"
                                        placeholder={
                                            item.type === 'image' ? "Describe the issue..." :
                                                item.type === 'pdf' ? "Describe context..." :
                                                    "Add a note..."
                                        }
                                        value={item.comment}
                                        onChange={(e) => updateComment(item.id, e.target.value)}
                                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                                        disabled={disabled}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
