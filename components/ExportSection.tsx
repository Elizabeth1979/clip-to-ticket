
import React from 'react';
import { A11yIssue, GroupedReport } from '../types';

interface ExportSectionProps {
  issues: A11yIssue[];
  grouped: GroupedReport;
}

export const ExportSection: React.FC<ExportSectionProps> = ({ issues, grouped }) => {
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    downloadFile(JSON.stringify(grouped, null, 2), 'a11y_lens_report.json', 'application/json');
  };

  const exportCSV = () => {
    const headers = ['Summary', 'Description', 'Severity', 'WCAG Reference', 'Axe Rule', 'Suggested Fix', 'Timestamp', 'Alt Text', 'Status'];
    const rows = issues.map(i => [
      i.issue_title,
      i.issue_description,
      i.severity,
      i.wcag_reference,
      i.axe_rule_id,
      i.suggested_fix,
      i.timestamp,
      i.generated_alt_text || '',
      i.status
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    downloadFile(csvContent, 'a11y_lens_jira.csv', 'text/csv');
  };

  const exportMarkdown = () => {
    let md = '# Accessibility Audit Report\n\n';
    (Object.entries(grouped) as [string, A11yIssue[]][]).forEach(([groupName, groupIssues]) => {
      md += `## ${groupName}\n\n`;
      groupIssues.forEach(i => {
        md += `### ${i.issue_title}\n`;
        md += `- **Description**: ${i.issue_description}\n`;
        md += `- **Severity**: ${i.severity}\n`;
        md += `- **WCAG**: ${i.wcag_reference}\n`;
        md += `- **Axe Rule**: ${i.axe_rule_id}\n`;
        md += `- **Timestamp**: ${i.timestamp}\n`;
        md += `- **Suggested Fix**: ${i.suggested_fix}\n`;
        if (i.generated_alt_text) md += `- **Generated Alt Text**: ${i.generated_alt_text}\n`;
        md += `- **Disclaimer**: ${i.disclaimer}\n\n`;
      });
    });
    downloadFile(md, 'a11y_lens_report.md', 'text/markdown');
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={exportJSON}
        className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm"
      >
        JSON
      </button>
      <button
        onClick={exportCSV}
        className="px-4 py-2.5 bg-white text-slate-900 border border-slate-200 rounded-xl text-xs font-black tracking-widest hover:border-slate-900 transition-all flex items-center gap-2 shadow-sm"
      >
        Jira CSV
      </button>
      <button
        onClick={exportMarkdown}
        className="px-4 py-2.5 bg-white text-slate-900 border border-slate-200 rounded-xl text-xs font-black tracking-widest hover:border-slate-900 transition-all flex items-center gap-2 shadow-sm"
      >
        Markdown
      </button>
    </div>
  );
};
