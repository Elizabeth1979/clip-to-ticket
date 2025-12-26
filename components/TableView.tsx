
import React, { useState, useMemo } from 'react';
import { A11yIssue, Severity } from '../types';
import { InfoTooltip } from './InfoTooltip';

interface TableViewProps {
  issues: A11yIssue[];
  onSeek: (timestamp: string) => void;
}

type SortKey = 'timestamp' | 'issue_title' | 'severity' | 'wcag_reference' | 'axe_rule_id' | 'ease_of_fix';
type SortDirection = 'asc' | 'desc';

const severityOrder = { [Severity.CRITICAL]: 0, [Severity.SERIOUS]: 1, [Severity.MODERATE]: 2, [Severity.MINOR]: 3 };

const getSeverityBadge = (severity: Severity) => {
  switch (severity) {
    case Severity.CRITICAL: return 'bg-red-50 text-red-600 border-red-100';
    case Severity.SERIOUS: return 'bg-orange-50 text-orange-600 border-orange-100';
    case Severity.MODERATE: return 'bg-indigo-50 text-indigo-600 border-indigo-100';
    case Severity.MINOR: return 'bg-slate-50 text-slate-600 border-slate-100';
    default: return 'bg-slate-50 text-slate-600 border-slate-100';
  }
};

const getEaseOfFix = (issue: A11yIssue): { label: string; color: string; order: number } => {
  const isManual = !issue.axe_rule_id ||
    issue.axe_rule_id.toLowerCase().includes('manual') ||
    issue.axe_rule_id.toLowerCase().includes('none') ||
    issue.axe_rule_id === 'no-axe-rule';

  // Manual verification issues are typically harder
  if (isManual) {
    if (issue.severity === Severity.CRITICAL || issue.severity === Severity.SERIOUS) {
      return { label: 'Hard', color: 'bg-red-50 text-red-600 border-red-100', order: 3 };
    }
    return { label: 'Medium', color: 'bg-amber-50 text-amber-600 border-amber-100', order: 2 };
  }

  // Automated issues with axe rules
  if (issue.severity === Severity.CRITICAL) {
    return { label: 'Medium', color: 'bg-amber-50 text-amber-600 border-amber-100', order: 2 };
  }
  if (issue.severity === Severity.MINOR || issue.severity === Severity.MODERATE) {
    return { label: 'Easy', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', order: 1 };
  }
  return { label: 'Medium', color: 'bg-amber-50 text-amber-600 border-amber-100', order: 2 };
};

const getWCAGLink = (reference: string) => {
  const match = reference.match(/\d+\.\d+\.\d+\s+(.*)/);
  if (match && match[1]) {
    const slug = match[1].toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `https://www.w3.org/WAI/WCAG21/Understanding/${slug}.html`;
  }
  return `https://www.w3.org/WAI/WCAG21/Understanding/`;
};

export const TableView: React.FC<TableViewProps> = ({ issues, onSeek }) => {
  const [sortKey, setSortKey] = useState<SortKey>('severity');
  const [direction, setDirection] = useState<SortDirection>('asc');

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
              <th className="px-8 py-5 text-sm text-slate-400 tracking-widest cursor-pointer group whitespace-nowrap" onClick={() => handleSort('timestamp')}>
                <div className="flex items-center gap-2">
                  Time {sortKey === 'timestamp' && (direction === 'asc' ? '↑' : '↓')}
                  <InfoTooltip content="Click timestamp to jump to this moment in the video" position="top" />
                </div>
              </th>
              <th className="px-8 py-5 text-sm text-slate-400 tracking-widest cursor-pointer group" onClick={() => handleSort('issue_title')}>
                <div className="flex items-center gap-2">
                  Issue & Context {sortKey === 'issue_title' && (direction === 'asc' ? '↑' : '↓')}
                  <InfoTooltip content="Description of the accessibility barrier detected by AI analysis of your video" position="top" />
                </div>
              </th>
              <th className="px-8 py-5 text-sm text-slate-400 tracking-widest cursor-pointer group whitespace-nowrap" onClick={() => handleSort('severity')}>
                <div className="flex items-center gap-2">
                  Impact {sortKey === 'severity' && (direction === 'asc' ? '↑' : '↓')}
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
              <th className="px-8 py-5 text-sm text-slate-400 tracking-widest cursor-pointer group" onClick={() => handleSort('wcag_reference')}>
                <div className="flex items-center gap-2">
                  Standards {sortKey === 'wcag_reference' && (direction === 'asc' ? '↑' : '↓')}
                  <InfoTooltip content="WCAG 2.2 Success Criteria violated. Click to view official documentation." position="top" />
                </div>
              </th>
              <th className="px-8 py-5 text-sm text-slate-400 tracking-widest cursor-pointer group" onClick={() => handleSort('axe_rule_id')}>
                <div className="flex items-center gap-2">
                  Axe Rule {sortKey === 'axe_rule_id' && (direction === 'asc' ? '↑' : '↓')}
                  <InfoTooltip content="Axe-core rule ID for automated testing. 'Manual Verification' means this requires human review." position="top" />
                </div>
              </th>
              <th className="px-8 py-5 text-sm text-slate-400 tracking-widest cursor-pointer group whitespace-nowrap" onClick={() => handleSort('ease_of_fix')}>
                <div className="flex items-center gap-2">
                  Ease of Fix {sortKey === 'ease_of_fix' && (direction === 'asc' ? '↑' : '↓')}
                  <InfoTooltip content="Estimated difficulty to resolve this issue. Based on severity and whether automated testing is available." position="top" />
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
                      <div className="pt-2 border-t border-slate-50 mt-2">
                        <span className="text-sm tracking-widest text-slate-400">Fix Path:</span>
                        <p className="text-sm text-slate-900 mt-1">{issue.suggested_fix}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`text-sm px-2.5 py-1 rounded-md border tracking-widest whitespace-nowrap ${getSeverityBadge(issue.severity)}`}>
                      {issue.severity}
                    </span>
                  </td>
                  <td className="px-8 py-6 min-w-[200px]">
                    <a
                      href={getWCAGLink(issue.wcag_reference)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/link flex flex-col gap-1 underline"
                    >
                      <span className="text-sm text-indigo-600 tracking-widest">
                        {issue.wcag_reference.split(' ')[0]}
                      </span>
                      <span className="text-sm text-slate-400 group-hover/link:text-slate-900 transition-colors">
                        {issue.wcag_reference.split(' ').slice(1).join(' ')}
                      </span>
                    </a>
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
                    <span className={`text-sm px-2.5 py-1 rounded-md border tracking-widest whitespace-nowrap ${getEaseOfFix(issue).color}`}>
                      {getEaseOfFix(issue).label}
                    </span>
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
