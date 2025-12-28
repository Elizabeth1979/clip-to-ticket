
import React, { useState, useMemo, useCallback } from 'react';
import { A11yIssue, Severity } from '../types';
import { InfoTooltip } from './InfoTooltip';
import { getWCAGLink, parseWCAGStandards } from '../utils/wcagUtils';
import { parseAPGPatterns } from '../services/apgPatternsService';

interface TableViewProps {
  issues: A11yIssue[];
  onSeek: (timestamp: string) => void;
  onUpdateIssue?: (index: number, updatedIssue: A11yIssue) => void;
  onDeleteIssue?: (index: number) => void;
}

type SortKey = 'timestamp' | 'severity' | 'wcag_reference' | 'axe_rule_id' | 'ease_of_fix' | 'priority';
type SortDirection = 'asc' | 'desc';

const severityOrder = { [Severity.CRITICAL]: 0, [Severity.SERIOUS]: 1, [Severity.MODERATE]: 2, [Severity.MINOR]: 3 };
// Map severity strings to numeric values for RICE calculation
const severityValue: Record<string, number> = {
  'Critical': 4,
  'Serious': 3,
  'Moderate': 2,
  'Minor': 1
};

const getSeverityBadge = (severity: Severity | string): { label: string; color: string; order: number } => {
  // Normalize severity to handle both old (lowercase) and new (capitalized) formats
  const normalizedSeverity = typeof severity === 'string'
    ? severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase()
    : severity;

  switch (normalizedSeverity) {
    case Severity.CRITICAL:
    case 'Critical':
      return { label: 'Critical', color: 'bg-red-50 text-red-600 border-red-100', order: 0 };
    case Severity.SERIOUS:
    case 'Serious':
      return { label: 'Serious', color: 'bg-orange-50 text-orange-600 border-orange-100', order: 1 };
    case Severity.MODERATE:
    case 'Moderate':
      return { label: 'Moderate', color: 'bg-amber-50 text-amber-600 border-amber-100', order: 2 };
    case Severity.MINOR:
    case 'Minor':
      return { label: 'Minor', color: 'bg-slate-50 text-slate-600 border-slate-100', order: 3 };
    default:
      // Fallback for any unrecognized values
      console.warn('Unrecognized severity value:', severity);
      return { label: String(severity) || 'Unknown', color: 'bg-slate-50 text-slate-600 border-slate-100', order: 99 };
  }
};

const getEaseOfFix = (issue: A11yIssue): { label: string; color: string; order: number } => {
  // Use AI-provided ease_of_fix if available
  if (issue.ease_of_fix) {
    const easeMap: Record<string, { label: string; color: string; order: number }> = {
      'Easy': { label: 'Easy', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', order: 1 },
      'Moderate': { label: 'Moderate', color: 'bg-amber-50 text-amber-600 border-amber-100', order: 2 },
      'Hard': { label: 'Hard', color: 'bg-red-50 text-red-600 border-red-100', order: 3 }
    };
    const result = easeMap[issue.ease_of_fix];
    if (result) {
      return result;
    }
    console.warn('Unrecognized ease_of_fix value:', issue.ease_of_fix);
  }

  // Fallback to heuristic calculation
  // APG patterns are not "manual" - they're design pattern references
  const isManual = !issue.axe_rule_id ||
    issue.axe_rule_id.toLowerCase().includes('manual') ||
    issue.axe_rule_id.toLowerCase().includes('none') ||
    issue.axe_rule_id === 'no-axe-rule';

  // Manual verification issues are typically harder
  if (isManual) {
    if (issue.severity === Severity.CRITICAL || issue.severity === Severity.SERIOUS) {
      return { label: 'Hard', color: 'bg-red-50 text-red-600 border-red-100', order: 3 };
    }
    return { label: 'Moderate', color: 'bg-amber-50 text-amber-600 border-amber-100', order: 2 };
  }

  // Automated issues with axe rules
  if (issue.severity === Severity.CRITICAL) {
    return { label: 'Moderate', color: 'bg-amber-50 text-amber-600 border-amber-100', order: 2 };
  }
  if (issue.severity === Severity.MINOR || issue.severity === Severity.MODERATE) {
    return { label: 'Easy', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', order: 1 };
  }
  return { label: 'Moderate', color: 'bg-amber-50 text-amber-600 border-amber-100', order: 2 };
};

/**
 * Calculate Priority Score
 * Formula: Severity² / Effort
 * 
 * - Severity: 1-4 based on severity level (Critical=4, Serious=3, Moderate=2, Minor=1)
 * - Impact: Severity² to emphasize critical issues (1, 4, 9, or 16)
 * - Effort: 1 (Easy), 2 (Moderate), 3 (Hard)
 * 
 * Returns: Score from 0.33-16, where higher = higher priority
 */
const calculatePriority = (issue: A11yIssue): number => {
  // Get severity value (1-4) - handle both string and enum values
  const severityKey = String(issue.severity);
  const severity = severityValue[severityKey] ?? 1;

  // Calculate impact (severity squared)
  const impact = severity * severity;

  // Get effort from ease of fix
  const easeOfFix = getEaseOfFix(issue);
  const effort = easeOfFix.order; // 1 (Easy), 2 (Moderate), 3 (Hard)

  // Calculate priority score
  const score = impact / effort;

  return score;
};

const getPriorityBadge = (score: number): { label: string; color: string } => {
  if (score >= 10) {
    return { label: 'P0 - Critical', color: 'bg-red-50 text-red-700 border-red-200' };
  } else if (score >= 6) {
    return { label: 'P1 - High', color: 'bg-orange-50 text-orange-700 border-orange-200' };
  } else if (score >= 3) {
    return { label: 'P2 - Medium', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  } else {
    return { label: 'P3 - Low', color: 'bg-slate-50 text-slate-600 border-slate-200' };
  }
};

export const TableView: React.FC<TableViewProps> = ({ issues, onSeek, onUpdateIssue, onDeleteIssue }) => {
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [direction, setDirection] = useState<SortDirection>('desc');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<A11yIssue | null>(null);

  // Find original index of an issue (before sorting) for update callbacks
  const getOriginalIndex = (issue: A11yIssue): number => {
    return issues.findIndex(i =>
      i.issue_title === issue.issue_title &&
      i.timestamp === issue.timestamp &&
      i.wcag_reference === issue.wcag_reference
    );
  };

  const handleStartEdit = (issue: A11yIssue, sortedIdx: number) => {
    setEditingIndex(sortedIdx);
    setEditForm({ ...issue });
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const handleSaveEdit = (originalIssue: A11yIssue) => {
    if (editForm && onUpdateIssue) {
      const originalIdx = getOriginalIndex(originalIssue);
      if (originalIdx !== -1) {
        onUpdateIssue(originalIdx, editForm);
      }
    }
    setEditingIndex(null);
    setEditForm(null);
  };

  const handleDeleteIssue = (issue: A11yIssue) => {
    if (onDeleteIssue) {
      const originalIdx = getOriginalIndex(issue);
      if (originalIdx !== -1) {
        onDeleteIssue(originalIdx);
      }
    }
    setEditingIndex(null);
    setEditForm(null);
  };

  const handleFormChange = (field: keyof A11yIssue, value: any) => {
    if (editForm) {
      setEditForm({ ...editForm, [field]: value });
    }
  };

  // Auto-resize textarea to fit content
  const autoResize = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  // Initialize textarea height on focus
  const initResize = useCallback((textarea: HTMLTextAreaElement | null) => {
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, []);

  const sortedIssues = useMemo(() => {
    const sorted = [...issues].sort((a, b) => {
      let valA: any = a[sortKey];
      let valB: any = b[sortKey];

      if (sortKey === 'severity') {
        valA = severityOrder[a.severity as Severity] ?? 99;
        valB = severityOrder[b.severity as Severity] ?? 99;
      }

      if (sortKey === 'ease_of_fix') {
        valA = getEaseOfFix(a).order;
        valB = getEaseOfFix(b).order;
      }

      if (sortKey === 'priority') {
        valA = calculatePriority(a);
        valB = calculatePriority(b);
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [issues, sortKey, direction]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setDirection(direction === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setDirection('asc');
    }
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse table-auto">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-8 py-5 text-sm text-slate-400 tracking-widest whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <button onClick={() => handleSort('timestamp')} className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                    Time {sortKey === 'timestamp' && (direction === 'asc' ? '↑' : '↓')}
                  </button>
                  <InfoTooltip content="Click timestamp to jump to this moment in the video" position="top" />
                </div>
              </th>
              <th className="px-8 py-5 text-sm text-slate-400 tracking-widest">
                <div className="flex items-center gap-3">
                  <span className="text-sm">Issue</span>
                  <InfoTooltip content="Title of the accessibility barrier detected" position="top" />
                </div>
              </th>
              <th className="px-8 py-5 text-sm text-slate-400 tracking-widest">
                <div className="flex items-center gap-3">
                  <span className="text-sm">Description</span>
                  <InfoTooltip content="Detailed context about the accessibility issue" position="top" />
                </div>
              </th>
              <th className="px-8 py-5 text-sm text-slate-400 tracking-widest whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <button onClick={() => handleSort('severity')} className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                    Impact {sortKey === 'severity' && (direction === 'asc' ? '↑' : '↓')}
                  </button>
                  <InfoTooltip
                    content={
                      <div className="space-y-1">
                        <div><strong>Critical:</strong> Blocks access completely</div>
                        <div><strong>Serious:</strong> Major barrier to access</div>
                        <div><strong>Moderate:</strong> Noticeable difficulty</div>
                        <div><strong>Minor:</strong> Inconvenience but accessible</div>
                      </div>
                    }
                    position="top"
                  />
                </div>
              </th>
              <th className="px-8 py-5 text-sm text-slate-400 tracking-widest whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <button onClick={() => handleSort('ease_of_fix')} className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                    Ease of Fix {sortKey === 'ease_of_fix' && (direction === 'asc' ? '↑' : '↓')}
                  </button>
                  <InfoTooltip content="Estimated difficulty to resolve this issue. Based on severity and whether automated testing is available." position="top" />
                </div>
              </th>
              <th className="px-8 py-5 text-sm text-slate-400 tracking-widest whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <button onClick={() => handleSort('priority')} className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                    Priority {sortKey === 'priority' && (direction === 'asc' ? '↑' : '↓')}
                  </button>
                  <InfoTooltip
                    content={
                      <div className="space-y-2">
                        <div><strong>Priority Score:</strong> Impact² / Effort</div>
                        <div className="text-xs space-y-1 mt-2 pt-2 border-t border-slate-200">
                          <div><strong>P0 (10+):</strong> Critical priority - fix immediately</div>
                          <div><strong>P1 (6-10):</strong> High priority - fix soon</div>
                          <div><strong>P2 (3-6):</strong> Medium priority - schedule fix</div>
                          <div><strong>P3 (&lt;3):</strong> Low priority - backlog</div>
                        </div>
                      </div>
                    }
                    position="top"
                  />
                </div>
              </th>
              <th className="px-8 py-5 text-sm text-slate-400 tracking-widest">
                <div className="flex items-center gap-3">
                  <button onClick={() => handleSort('wcag_reference')} className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                    Standards {sortKey === 'wcag_reference' && (direction === 'asc' ? '↑' : '↓')}
                  </button>
                  <InfoTooltip content="WCAG 2.2 Success Criteria violated. Click to view official documentation." position="top" />
                </div>
              </th>
              <th className="px-8 py-5 text-sm text-slate-400 tracking-widest">
                <div className="flex items-center gap-3">
                  <button onClick={() => handleSort('axe_rule_id')} className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                    Axe Rule {sortKey === 'axe_rule_id' && (direction === 'asc' ? '↑' : '↓')}
                  </button>
                  <InfoTooltip content="Axe-core rule ID for automated testing. Links to Deque University documentation." position="top" />
                </div>
              </th>
              <th className="px-8 py-5 text-sm text-slate-400 tracking-widest">
                <div className="flex items-center gap-3">
                  <span className="text-sm">APG Pattern</span>
                  <InfoTooltip content="ARIA Authoring Practices Guide pattern reference for design implementation guidance." position="top" />
                </div>
              </th>
              <th className="px-8 py-5 text-sm text-slate-400 tracking-widest">
                <div className="flex items-center gap-3">
                  <span className="text-sm">Fix Path</span>
                  <InfoTooltip content="Recommended steps to resolve this accessibility issue." position="top" />
                </div>
              </th>
              {onUpdateIssue && (
                <th className="px-8 py-5 text-sm text-slate-400 tracking-widest sticky right-0 bg-slate-50">
                  <span className="text-sm">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sortedIssues.map((issue, idx) => {
              const isEditing = editingIndex === idx;
              const currentIssue = isEditing && editForm ? editForm : issue;
              const isManual = !currentIssue.axe_rule_id ||
                currentIssue.axe_rule_id.toLowerCase().includes('manual') ||
                currentIssue.axe_rule_id.toLowerCase().includes('none') ||
                currentIssue.axe_rule_id === 'no-axe-rule';

              return (
                <tr key={idx} className={`transition-colors align-top ${isEditing ? 'bg-indigo-50/50' : 'hover:bg-slate-50/50'}`}>
                  {/* Timestamp (not editable) */}
                  <td className="px-8 py-6">
                    <button
                      onClick={() => onSeek(issue.timestamp)}
                      className="text-sm text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-600 transition-colors whitespace-nowrap"
                    >
                      {issue.timestamp}
                    </button>
                  </td>

                  {/* Issue Title */}
                  <td className="px-8 py-6 min-w-[250px]">
                    {isEditing ? (
                      <textarea
                        ref={initResize}
                        value={editForm?.issue_title || ''}
                        onChange={(e) => handleFormChange('issue_title', e.target.value)}
                        onInput={autoResize}
                        className="w-full text-base font-semibold text-slate-900 bg-white px-3 py-2 rounded-lg border border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none min-h-[44px] overflow-hidden"
                      />
                    ) : (
                      <p className="text-base font-semibold text-slate-900 leading-snug">{issue.issue_title}</p>
                    )}
                  </td>

                  {/* Description */}
                  <td className="px-8 py-6 min-w-[300px]">
                    {isEditing ? (
                      <textarea
                        ref={initResize}
                        value={editForm?.issue_description || ''}
                        onChange={(e) => handleFormChange('issue_description', e.target.value)}
                        onInput={autoResize}
                        className="w-full text-sm text-slate-700 bg-white px-3 py-2 rounded-lg border border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none min-h-[80px] overflow-hidden"
                      />
                    ) : (
                      <p className="text-sm text-slate-500 leading-relaxed">{issue.issue_description}</p>
                    )}
                  </td>

                  {/* Impact/Severity */}
                  <td className="px-8 py-6">
                    {isEditing ? (
                      <select
                        value={editForm?.severity || ''}
                        onChange={(e) => handleFormChange('severity', e.target.value as Severity)}
                        className="text-sm bg-white px-3 py-2 rounded-lg border border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                      >
                        <option value="Critical">Critical</option>
                        <option value="Serious">Serious</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Minor">Minor</option>
                      </select>
                    ) : (
                      <span className={`text-sm px-2.5 py-1 rounded-md border tracking-widest whitespace-nowrap ${getSeverityBadge(issue.severity).color}`}>
                        {getSeverityBadge(issue.severity).label}
                      </span>
                    )}
                  </td>

                  {/* Ease of Fix */}
                  <td className="px-8 py-6">
                    {isEditing ? (
                      <select
                        value={editForm?.ease_of_fix || ''}
                        onChange={(e) => handleFormChange('ease_of_fix', e.target.value as 'Easy' | 'Moderate' | 'Hard')}
                        className="text-sm bg-white px-3 py-2 rounded-lg border border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Hard">Hard</option>
                      </select>
                    ) : (
                      <span className={`text-sm px-2.5 py-1 rounded-md border tracking-widest whitespace-nowrap ${getEaseOfFix(issue).color}`}>
                        {getEaseOfFix(issue).label}
                      </span>
                    )}
                  </td>

                  {/* Priority (read-only - calculated) */}
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                      <span className={`text-sm px-2.5 py-1 rounded-md border tracking-widest whitespace-nowrap ${getPriorityBadge(calculatePriority(currentIssue)).color}`}>
                        {getPriorityBadge(calculatePriority(currentIssue)).label}
                      </span>
                      <span className="text-xs text-slate-400 tracking-wider">
                        Score: {calculatePriority(currentIssue).toFixed(1)}
                      </span>
                    </div>
                  </td>

                  {/* WCAG Reference */}
                  <td className="px-8 py-6 min-w-[200px]">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm?.wcag_reference || ''}
                        onChange={(e) => handleFormChange('wcag_reference', e.target.value)}
                        placeholder="e.g., 1.3.1, 2.4.1"
                        className="w-full text-sm text-slate-700 bg-white px-3 py-2 rounded-lg border border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                      />
                    ) : (
                      <div className="flex flex-col gap-2">
                        {parseWCAGStandards(issue.wcag_reference).map((standard, stdIdx) => (
                          <a
                            key={stdIdx}
                            href={getWCAGLink(standard.number)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/link flex flex-col gap-1 underline"
                          >
                            <span className="text-sm text-indigo-600 tracking-widest">
                              {standard.number}
                            </span>
                            {stdIdx === 0 && standard.name && (
                              <span className="text-sm text-slate-400 group-hover/link:text-slate-900 transition-colors">
                                {standard.name}
                              </span>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Axe Rule */}
                  <td className="px-8 py-6">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm?.axe_rule_id || ''}
                        onChange={(e) => handleFormChange('axe_rule_id', e.target.value)}
                        placeholder="e.g., color-contrast"
                        className="w-full text-sm text-slate-700 bg-white px-3 py-2 rounded-lg border border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                      />
                    ) : isManual ? (
                      <span className="text-sm text-slate-300 tracking-widest italic">
                        Manual Verification
                      </span>
                    ) : (
                      <a
                        href={`https://dequeuniversity.com/rules/axe/4.1/${issue.axe_rule_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 tracking-widest underline whitespace-nowrap"
                      >
                        {issue.axe_rule_id}
                      </a>
                    )}
                  </td>

                  {/* APG Pattern */}
                  <td className="px-8 py-6">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm?.apg_pattern || ''}
                        onChange={(e) => handleFormChange('apg_pattern', e.target.value)}
                        placeholder="e.g., toolbar, menubar"
                        className="w-full text-sm text-slate-700 bg-white px-3 py-2 rounded-lg border border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                      />
                    ) : issue.apg_pattern ? (
                      <div className="flex flex-col gap-2">
                        {parseAPGPatterns(issue.apg_pattern).map((pattern, patIdx) => (
                          <a
                            key={patIdx}
                            href={pattern.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-purple-600 tracking-widest underline whitespace-nowrap"
                            title={`ARIA APG: ${pattern.name}`}
                          >
                            {pattern.id}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-300">-</span>
                    )}
                  </td>

                  {/* Suggested Fix */}
                  <td className="px-8 py-6 min-w-[300px]">
                    {isEditing ? (
                      <textarea
                        ref={initResize}
                        value={editForm?.suggested_fix || ''}
                        onChange={(e) => handleFormChange('suggested_fix', e.target.value)}
                        onInput={autoResize}
                        className="w-full text-sm text-slate-700 bg-white px-3 py-2 rounded-lg border border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none min-h-[80px] overflow-hidden"
                      />
                    ) : (
                      <p className="text-sm text-slate-900 leading-relaxed">{issue.suggested_fix}</p>
                    )}
                  </td>

                  {/* Actions */}
                  {onUpdateIssue && (
                    <td className="px-8 py-6 sticky right-0 bg-white">
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleSaveEdit(issue)}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleStartEdit(issue, idx)}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm rounded-lg transition-colors border border-indigo-200"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          {onDeleteIssue && (
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this issue?')) {
                                  handleDeleteIssue(issue);
                                }
                              }}
                              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm rounded-lg transition-colors border border-red-200"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sortedIssues.length === 0 && (
        <div className="p-20 text-center">
          <p className="text-slate-400 text-sm tracking-[0.2em]">No audit data present</p>
          <p className="text-slate-300 text-sm mt-2 italic">Upload and process a recording to generate insights</p>
        </div>
      )}
    </div>
  );
};
