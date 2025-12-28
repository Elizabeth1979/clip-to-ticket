import React, { useRef, useCallback } from 'react';
import { ImageItem } from '../types';

interface ImageUploadSectionProps {
    images: ImageItem[];
    onImagesChange: (images: ImageItem[]) => void;
    disabled?: boolean;
    compact?: boolean;
    showAddButton?: boolean;
    onTriggerAdd?: () => void;
}

export const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({
    images,
    onImagesChange,
    disabled = false,
    compact = false,
    showAddButton = false,
    onTriggerAdd
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const triggerFilePicker = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // Expose trigger function to parent if callback provided
    React.useEffect(() => {
        if (onTriggerAdd === undefined) return;
        // Store the trigger function reference
    }, [onTriggerAdd, triggerFilePicker]);

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

    // Compact mode - simplified layout for side-by-side view
    if (compact) {
        return (
            <>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                    multiple
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                    disabled={disabled}
                />

                {images.length === 0 ? (
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-amber-400 hover:bg-amber-50/30 transition-all cursor-pointer min-h-[180px] flex flex-col items-center justify-center"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <svg className="w-10 h-10 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-slate-600">Drop screenshots or click to browse</span>
                        <span className="text-xs text-slate-400 mt-1">Add images to highlight specific issues</span>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            {images.map((image, index) => (
                                <div key={image.id} className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden group">
                                    <img src={image.url} alt={`Screenshot ${index + 1}`} className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => removeImage(image.id)}
                                        disabled={disabled}
                                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                                        aria-label={`Remove screenshot ${index + 1}`}
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-xs rounded backdrop-blur-sm">
                                        {index + 1}
                                    </span>
                                </div>
                            ))}

                            {/* Add more button */}
                            <div
                                onClick={() => !disabled && fileInputRef.current?.click()}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                className={`aspect-video border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-amber-400 hover:bg-amber-50/30 cursor-pointer'}`}
                            >
                                <svg className="w-6 h-6 text-slate-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                                <span className="text-xs text-slate-400">Add more</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 text-center">
                            {images.length} screenshot{images.length !== 1 ? 's' : ''} ready
                        </p>
                    </div>
                )}
            </>
        );
    }

    // Full layout (non-compact)
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
