
import React from 'react';
import { A11yIssue, Severity } from '../types';
import { InfoTooltip } from './InfoTooltip';

interface IssueCardProps {
  issue: A11yIssue;
  onSeek?: () => void;
}

const getSeverityStyles = (severity: Severity) => {
  switch (severity) {
    case Severity.CRITICAL: return 'bg-red-50 text-red-700 border-red-100 font-bold';
    case Severity.SERIOUS: return 'bg-orange-50 text-orange-700 border-orange-100 font-bold';
    case Severity.MODERATE: return 'bg-indigo-50 text-indigo-700 border-indigo-100 font-bold';
    case Severity.MINOR: return 'bg-slate-50 text-slate-700 border-slate-100 font-bold';
    default: return 'bg-slate-50 text-slate-700 border-slate-100 font-bold';
  }
};

const getSeverityExplanation = (severity: Severity) => {
  switch (severity) {
    case Severity.CRITICAL: return 'Critical issues completely block access for users with disabilities. These must be fixed immediately.';
    case Severity.SERIOUS: return 'Serious issues create major barriers that significantly impact accessibility. High priority for remediation.';
    case Severity.MODERATE: return 'Moderate issues cause noticeable difficulty but workarounds may exist. Should be addressed soon.';
    case Severity.MINOR: return 'Minor issues are inconveniences that don\'t prevent access. Address when possible to improve UX.';
    default: return 'Severity indicates the impact level of this accessibility barrier.';
  }
};

const getWCAGLink = (reference: string) => {
  const match = reference.match(/\d+\.\d+\.\d+\s+(.*)/);
  if (match && match[1]) {
    const slug = match[1].toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `https://www.w3.org/WAI/WCAG21/Understanding/${slug}.html`;
  }
  return `https://www.w3.org/WAI/WCAG21/Understanding/`;
};

export const IssueCard: React.FC<IssueCardProps> = ({ issue, onSeek }) => {
  const isManual = issue.axe_rule_id.toLowerCase().includes('manual') ||
    issue.axe_rule_id.toLowerCase().includes('none') ||
    issue.axe_rule_id === 'no-axe-rule';

  const axeLink = `https://dequeuniversity.com/rules/axe/4.1/${issue.axe_rule_id}`;
  const wcagLink = getWCAGLink(issue.wcag_reference);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:border-slate-300 hover:shadow-md transition-all group">
      <div className="p-6 border-b border-slate-50 flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={onSeek}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              {issue.timestamp}
            </button>
            <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-md border uppercase tracking-widest ${getSeverityStyles(issue.severity)}`}>
                {issue.severity}
              </span>
              <InfoTooltip content={getSeverityExplanation(issue.severity)} position="top" />
            </div>
          </div>
          <h3 className="font-bold text-slate-900 text-lg leading-snug">
            {issue.issue_title}
          </h3>
        </div>
        <div className="text-right flex items-center gap-1.5">
          {isManual ? (
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              Manual Audit
            </span>
          ) : (
            <a
              href={axeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"
            >
              {issue.axe_rule_id}
            </a>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <p className="text-sm text-slate-600 leading-relaxed font-medium">{issue.issue_description}</p>
          <div className="pt-2">
            <a
              href={wcagLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors"
            >
              <span className="uppercase tracking-widest text-[10px] text-slate-300">Reference:</span> {issue.wcag_reference}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {issue.generated_alt_text && (
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 flex flex-col justify-center">
              <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">Proposed Alt Text</h4>
              <p className="text-sm text-emerald-900 font-bold italic">"{issue.generated_alt_text}"</p>
            </div>
          )}

          <div className={`p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-center ${!issue.generated_alt_text ? 'md:col-span-2' : ''}`}>
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Actionable Fix</h4>
            <p className="text-sm text-slate-900 font-bold">{issue.suggested_fix}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-slate-50/30 border-t border-slate-50 flex justify-between items-center">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          {issue.disclaimer}
        </p>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {issue.status}
          </span>
        </div>
      </div>
    </div>
  );
};
