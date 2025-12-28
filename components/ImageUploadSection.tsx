import React, { useRef, useCallback } from 'react';
import { ImageItem } from '../types';

interface ImageUploadSectionProps {
    images: ImageItem[];
    onImagesChange: (images: ImageItem[]) => void;
    onLoadExample?: () => void;
    disabled?: boolean;
}

export const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({
    images,
    onImagesChange,
    onLoadExample,
    disabled = false
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const generateId = () => `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const handleFileSelect = useCallback((files: FileList | null) => {
        if (!files || disabled) return;

        const newImages: ImageItem[] = [];
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                newImages.push({
                    id: generateId(),
                    file,
                    url: URL.createObjectURL(file),
                    comment: ''
                });
            }
        });

        if (newImages.length > 0) {
            onImagesChange([...images, ...newImages]);
        }
    }, [images, onImagesChange, disabled]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleFileSelect(e.dataTransfer.files);
    }, [handleFileSelect]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const removeImage = useCallback((id: string) => {
        const imageToRemove = images.find(img => img.id === id);
        if (imageToRemove) {
            URL.revokeObjectURL(imageToRemove.url);
        }
        onImagesChange(images.filter(img => img.id !== id));
    }, [images, onImagesChange]);

    const updateComment = useCallback((id: string, comment: string) => {
        onImagesChange(images.map(img =>
            img.id === id ? { ...img, comment } : img
        ));
    }, [images, onImagesChange]);

    return (
        <div className="mt-2 h-full flex flex-col items-center justify-center">
            {images.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-4 w-full h-full">
                    <label className="flex flex-col items-center justify-center cursor-pointer group w-full">
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                            multiple
                            onChange={(e) => handleFileSelect(e.target.files)}
                            className="hidden"
                            disabled={disabled}
                        />
                        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4 text-amber-600 group-hover:bg-amber-100 group-hover:scale-105 transition-all">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <span className="text-lg font-medium text-slate-900 mb-1">Add screenshots</span>
                        <span className="text-sm text-slate-400">PNG, JPG, or WebP</span>
                    </label>

                    {onLoadExample && (
                        <div className="mt-6">
                            <button
                                onClick={onLoadExample}
                                className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:border-amber-600 hover:text-amber-600 transition-all shadow-sm hover:shadow-md active:scale-[0.98] flex items-center gap-2"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Load Example
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="w-full">
                    <div className="flex items-center justify-between mb-3 w-full">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Screenshots</h3>
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={disabled}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:border-amber-500 hover:text-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Add
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                            multiple
                            onChange={(e) => handleFileSelect(e.target.files)}
                            className="hidden"
                            disabled={disabled}
                        />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {images.map((image, index) => (
                            <div
                                key={image.id}
                                className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                            >
                                {/* Image Preview */}
                                <div className="relative aspect-video bg-slate-50">
                                    <img
                                        src={image.url}
                                        alt={`Screenshot ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        onClick={() => removeImage(image.id)}
                                        disabled={disabled}
                                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-md flex items-center justify-center transition-colors shadow-sm disabled:opacity-50"
                                        aria-label={`Remove screenshot ${index + 1}`}
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Comment Input */}
                                <div className="p-2">
                                    <textarea
                                        id={`comment-${image.id}`}
                                        value={image.comment}
                                        onChange={(e) => updateComment(image.id, e.target.value)}
                                        placeholder="Add comment..."
                                        disabled={disabled}
                                        rows={1}
                                        className="w-full px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] text-slate-600 placeholder:text-slate-300 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        ))}

                        {/* Add More Card */}
                        <div
                            onClick={() => !disabled && fileInputRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            className={`border-2 border-dashed border-slate-50 rounded-xl flex flex-col items-center justify-center aspect-video transition-all ${disabled
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:border-amber-400 hover:bg-amber-50/20 cursor-pointer'
                                }`}
                        >
                            <svg className="w-5 h-5 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                    </div>
                </div>
            )}

            {images.length > 0 && (
                <p className="mt-3 text-sm text-slate-400 text-center">
                    {images.length} screenshot{images.length !== 1 ? 's' : ''} ready for analysis
                    {images.filter(img => img.comment.trim()).length > 0 && (
                        <span> • {images.filter(img => img.comment.trim()).length} with descriptions</span>
                    )}
                </p>
            )}
        </div>
    );
};
