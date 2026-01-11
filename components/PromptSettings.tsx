/**
 * PromptSettings Component
 * 
 * Allows users to customize AI analysis settings before running the audit.
 * Settings are persisted to localStorage with Save button.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    PromptSettings as PromptSettingsType,
    FocusAreaId,
    SeverityMode,
    FOCUS_AREAS,
    SEVERITY_MODES,
    DEFAULT_PROMPT_SETTINGS,
    loadPromptSettings,
    savePromptSettings,
    clearPromptSettings,
    buildSystemPrompt,
    MediaContext,
} from '../services/promptTemplate';

interface PromptSettingsProps {
    mediaContext: MediaContext;
    settings: PromptSettingsType;
    onSettingsChange: (settings: PromptSettingsType) => void;
    disabled?: boolean;
}

export const PromptSettings: React.FC<PromptSettingsProps> = ({
    mediaContext,
    settings,
    onSettingsChange,
    disabled = false,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showPromptPreview, setShowPromptPreview] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    // Check if settings differ from defaults
    const hasChanges = useMemo(() => {
        return JSON.stringify(settings) !== JSON.stringify(DEFAULT_PROMPT_SETTINGS);
    }, [settings]);

    // Build preview of prompt
    const promptPreview = useMemo(() => {
        return buildSystemPrompt(mediaContext, settings);
    }, [mediaContext, settings]);

    // Character count for custom instructions
    const customInstructionsLength = settings.customInstructions.length;
    const MAX_CUSTOM_LENGTH = 500;

    const handleFocusAreaToggle = (areaId: FocusAreaId) => {
        const newFocusAreas = settings.focusAreas.includes(areaId)
            ? settings.focusAreas.filter(id => id !== areaId)
            : [...settings.focusAreas, areaId];
        onSettingsChange({ ...settings, focusAreas: newFocusAreas });
    };

    const handleSeverityModeChange = (mode: SeverityMode) => {
        onSettingsChange({ ...settings, severityMode: mode });
    };

    const handleCustomInstructionsChange = (value: string) => {
        if (value.length <= MAX_CUSTOM_LENGTH) {
            onSettingsChange({ ...settings, customInstructions: value });
        }
    };

    const handleSave = () => {
        savePromptSettings(settings);
        setSaveMessage('Settings saved!');
        setTimeout(() => setSaveMessage(null), 2000);
    };

    const handleReset = () => {
        clearPromptSettings();
        onSettingsChange(DEFAULT_PROMPT_SETTINGS);
        setSaveMessage('Reset to defaults');
        setTimeout(() => setSaveMessage(null), 2000);
    };

    const handleAdvancedPromptChange = (value: string) => {
        onSettingsChange({ ...settings, advancedPrompt: value });
    };

    const toggleAdvancedMode = () => {
        if (!settings.useAdvancedMode) {
            // Entering advanced mode - copy current built prompt
            onSettingsChange({
                ...settings,
                useAdvancedMode: true,
                advancedPrompt: promptPreview,
            });
        } else {
            // Exiting advanced mode
            onSettingsChange({
                ...settings,
                useAdvancedMode: false,
                advancedPrompt: undefined,
            });
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header - Always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                disabled={disabled}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <h3 className="text-base font-semibold text-slate-900">
                            Analysis Settings
                            {hasChanges && (
                                <span className="ml-2 text-xs font-normal text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                                    Customized
                                </span>
                            )}
                        </h3>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Customize focus areas, severity, and add context
                        </p>
                    </div>
                </div>
                <svg
                    className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Expandable Content */}
            {isExpanded && (
                <div className="border-t border-slate-100 px-6 py-5 space-y-6 animate-in slide-in-from-top-2 duration-200">

                    {/* Focus Areas */}
                    <div>
                        <h4 className="text-sm font-medium text-slate-900 mb-3">Priority Focus Areas</h4>
                        <p className="text-xs text-slate-500 mb-3">Select areas to emphasize in the analysis</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {(Object.keys(FOCUS_AREAS) as FocusAreaId[]).map((areaId) => {
                                const area = FOCUS_AREAS[areaId];
                                const isSelected = settings.focusAreas.includes(areaId);
                                return (
                                    <label
                                        key={areaId}
                                        className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                                                ? 'border-purple-300 bg-purple-50 text-purple-700'
                                                : 'border-slate-200 hover:border-slate-300 text-slate-700'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleFocusAreaToggle(areaId)}
                                            className="sr-only"
                                        />
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-purple-600 border-purple-600' : 'border-slate-300 bg-white'
                                            }`}>
                                            {isSelected && (
                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="text-sm">{area.label}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Severity Mode */}
                    <div>
                        <h4 className="text-sm font-medium text-slate-900 mb-3">Severity Emphasis</h4>
                        <div className="space-y-2">
                            {(Object.keys(SEVERITY_MODES) as SeverityMode[]).map((mode) => {
                                const modeConfig = SEVERITY_MODES[mode];
                                const isSelected = settings.severityMode === mode;
                                return (
                                    <label
                                        key={mode}
                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                                                ? 'border-purple-300 bg-purple-50'
                                                : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="severityMode"
                                            value={mode}
                                            checked={isSelected}
                                            onChange={() => handleSeverityModeChange(mode)}
                                            className="sr-only"
                                        />
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-purple-600' : 'border-slate-300'
                                            }`}>
                                            {isSelected && <div className="w-2 h-2 rounded-full bg-purple-600" />}
                                        </div>
                                        <span className={`text-sm ${isSelected ? 'text-purple-700' : 'text-slate-700'}`}>
                                            {modeConfig.label}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Custom Instructions */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-slate-900">Custom Instructions</h4>
                            <span className={`text-xs ${customInstructionsLength > MAX_CUSTOM_LENGTH * 0.9 ? 'text-amber-600' : 'text-slate-400'}`}>
                                {customInstructionsLength}/{MAX_CUSTOM_LENGTH}
                            </span>
                        </div>
                        <textarea
                            value={settings.customInstructions}
                            onChange={(e) => handleCustomInstructionsChange(e.target.value)}
                            placeholder="E.g., 'This app is for elderly users, prioritize large touch targets' or 'Focus on mobile accessibility'"
                            className="w-full h-24 px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Advanced Mode Toggle */}
                    <div className="pt-4 border-t border-slate-100">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                        >
                            <svg className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                            Advanced: Edit Full Prompt
                        </button>

                        {showAdvanced && (
                            <div className="mt-4 space-y-3">
                                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                                    <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <p className="text-xs text-amber-800">
                                        Editing the full prompt may break the expected output format. Use with caution.
                                    </p>
                                </div>

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.useAdvancedMode}
                                        onChange={toggleAdvancedMode}
                                        className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-sm text-slate-700">Enable advanced prompt editing</span>
                                </label>

                                {settings.useAdvancedMode && (
                                    <textarea
                                        value={settings.advancedPrompt || ''}
                                        onChange={(e) => handleAdvancedPromptChange(e.target.value)}
                                        className="w-full h-64 px-4 py-3 rounded-xl border border-slate-200 text-xs text-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Prompt Preview */}
                    <div className="pt-4 border-t border-slate-100">
                        <button
                            onClick={() => setShowPromptPreview(!showPromptPreview)}
                            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                        >
                            <svg className={`w-3 h-3 transition-transform ${showPromptPreview ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                            View Full Prompt Preview
                        </button>

                        {showPromptPreview && (
                            <div className="mt-4 bg-slate-50 rounded-xl p-4 max-h-64 overflow-y-auto">
                                <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono leading-relaxed">
                                    {settings.useAdvancedMode ? settings.advancedPrompt : promptPreview}
                                </pre>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <button
                            onClick={handleReset}
                            disabled={!hasChanges}
                            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Reset to Defaults
                        </button>

                        <div className="flex items-center gap-3">
                            {saveMessage && (
                                <span className="text-sm text-green-600 animate-in fade-in duration-200">
                                    {saveMessage}
                                </span>
                            )}
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                Save Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PromptSettings;
