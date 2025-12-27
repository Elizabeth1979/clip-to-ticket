
import React, { useState, useMemo } from 'react';
import { A11yIssue, Severity } from '../types';
import { InfoTooltip } from './InfoTooltip';
import { getWCAGLink, parseWCAGStandards } from '../utils/wcagUtils';
import { parseAPGPatterns } from '../services/apgPatternsService';

interface TableViewProps {
  issues: A11yIssue[];
  onSeek: (timestamp: string) => void;
}

type SortKey = 'timestamp' | 'issue_title' | 'severity' | 'wcag_reference' | 'axe_rule_id' | 'ease_of_fix' | 'priority';
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
 * Calculate RICE Priority Score
 * Formula: (Severity² × Confidence) / Effort
 * 
 * - Severity: 1-4 based on severity level (Critical=4, Serious=3, Moderate=2, Minor=1)
 * - Impact: Severity² to emphasize critical issues (1, 4, 9, or 16)
 * - Confidence: 1.0 for axe-core rules, 0.7 for manual verification
 * - Effort: 1 (Easy), 2 (Moderate), 3 (Hard)
 * 
 * Returns: Score from 0-16, where higher = higher priority
 */
const calculatePriority = (issue: A11yIssue): number => {
  // Get severity value (1-4) - handle both string and enum values
  const severityKey = String(issue.severity);
  const severity = severityValue[severityKey] ?? 1;

  // Calculate impact (severity squared)
  const impact = severity * severity;

  // Determine confidence based on detection method
  // APG patterns can still have high confidence if they also have axe rules
  const isManual = !issue.axe_rule_id ||
    issue.axe_rule_id.toLowerCase().includes('manual') ||
    issue.axe_rule_id.toLowerCase().includes('none') ||
    issue.axe_rule_id === 'no-axe-rule';
  const confidence = isManual ? 0.7 : 1.0;

  // Get effort from ease of fix
  const easeOfFix = getEaseOfFix(issue);
  const effort = easeOfFix.order; // 1 (Easy), 2 (Moderate), 3 (Hard)

  // Calculate RICE score
  const score = (impact * confidence) / effort;

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

export const TableView: React.FC<TableViewProps> = ({ issues, onSeek }) => {
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [direction, setDirection] = useState<SortDirection>('desc');

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
                  <button onClick={() => handleSort('issue_title')} className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                    Issue & Context {sortKey === 'issue_title' && (direction === 'asc' ? '↑' : '↓')}
                  </button>
                  <InfoTooltip content="Description of the accessibility barrier detected by AI analysis of your video" position="top" />
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
                        <div><strong>RICE Score:</strong> (Severity² × Confidence) / Effort</div>
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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sortedIssues.map((issue, idx) => {
              const isManual = !issue.axe_rule_id ||
                issue.axe_rule_id.toLowerCase().includes('manual') ||
                issue.axe_rule_id.toLowerCase().includes('none') ||
                issue.axe_rule_id === 'no-axe-rule';

              return (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors align-top">
                  <td className="px-8 py-6">
                    <button
                      onClick={() => onSeek(issue.timestamp)}
                      className="text-sm text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-600 transition-colors whitespace-nowrap"
                    >
                      {issue.timestamp}
                    </button>
                  </td>
                  <td className="px-8 py-6 min-w-[350px]">
                    <div className="space-y-2">
                      <p className="text-sm text-slate-900 leading-snug">{issue.issue_title}</p>
                      <p className="text-sm text-slate-600 leading-relaxed">{issue.issue_description}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`text-sm px-2.5 py-1 rounded-md border tracking-widest whitespace-nowrap ${getSeverityBadge(issue.severity).color}`}>
                      {getSeverityBadge(issue.severity).label}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`text-sm px-2.5 py-1 rounded-md border tracking-widest whitespace-nowrap ${getEaseOfFix(issue).color}`}>
                      {getEaseOfFix(issue).label}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                      <span className={`text-sm px-2.5 py-1 rounded-md border tracking-widest whitespace-nowrap ${getPriorityBadge(calculatePriority(issue)).color}`}>
                        {getPriorityBadge(calculatePriority(issue)).label}
                      </span>
                      <span className="text-xs text-slate-400 tracking-wider">
                        Score: {calculatePriority(issue).toFixed(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 min-w-[200px]">
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
                  </td>
                  <td className="px-8 py-6">
                    {isManual ? (
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
                  <td className="px-8 py-6">
                    {issue.apg_pattern ? (
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
                  <td className="px-8 py-6 min-w-[300px]">
                    <p className="text-sm text-slate-900 leading-relaxed">{issue.suggested_fix}</p>
                  </td>
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
