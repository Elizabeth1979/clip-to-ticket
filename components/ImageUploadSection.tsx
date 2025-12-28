import React, { useRef, useCallback } from 'react';
import { ImageItem } from '../types';

interface ImageUploadSectionProps {
    images: ImageItem[];
    onImagesChange: (images: ImageItem[]) => void;
    disabled?: boolean;
}

export const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({
    images,
    onImagesChange,
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
        <div className="mt-8 pt-8 border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm text-slate-900">Screenshots</h3>
                        <p className="text-sm text-slate-400">Add images of accessibility issues (optional)</p>
                    </div>
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:border-amber-500 hover:text-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Images
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

            {images.length === 0 ? (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-amber-400 hover:bg-amber-50/30 transition-all cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                            <p className="text-sm text-slate-600">Drop screenshots here or click to browse</p>
                            <p className="text-sm text-slate-400 mt-1">PNG, JPG, WebP, GIF supported</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {images.map((image, index) => (
                        <div
                            key={image.id}
                            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                        >
                            {/* Image Preview */}
                            <div className="relative aspect-video bg-slate-100">
                                <img
                                    src={image.url}
                                    alt={`Screenshot ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    onClick={() => removeImage(image.id)}
                                    disabled={disabled}
                                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-colors shadow-lg disabled:opacity-50"
                                    aria-label={`Remove screenshot ${index + 1}`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                                <span className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-sm rounded-lg backdrop-blur-sm">
                                    {index + 1}
                                </span>
                            </div>

                            {/* Comment Input */}
                            <div className="p-3">
                                <label className="sr-only" htmlFor={`comment-${image.id}`}>
                                    Describe accessibility issue in screenshot {index + 1}
                                </label>
                                <textarea
                                    id={`comment-${image.id}`}
                                    value={image.comment}
                                    onChange={(e) => updateComment(image.id, e.target.value)}
                                    placeholder="Describe the accessibility issue (optional)..."
                                    disabled={disabled}
                                    rows={2}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>
                    ))}

                    {/* Add More Card */}
                    <div
                        onClick={() => !disabled && fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className={`border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center min-h-[200px] transition-all ${disabled
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:border-amber-400 hover:bg-amber-50/30 cursor-pointer'
                            }`}
                    >
                        <svg className="w-8 h-8 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-sm text-slate-400">Add more</span>
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
