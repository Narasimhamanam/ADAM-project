import React from 'react';

/**
 * Pure React Markdown renderer for scientific research output.
 * Renders headings, bold/italics, bullet lists, numbered lists, tables,
 * inline code, and citation badges without raw Markdown artifacts.
 */

// Format inline tokens: **bold**, *italics*, `code`, and 【PMC...】/ [PMC...] / (PMCID...) citations
function renderInline(text) {
  if (!text) return null;

  // Regex splitting by inline patterns
  // 1: Bold `**...**`
  // 2: Italics `*...*` or `_..._`
  // 3: Inline code `` `...` ``
  // 4: Citations: 【...】, [PMCID/PMC/PMID...], (PMCID: ...)
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`|【[^】]+】|\[PMC[0-9A-Za-z]+\]|\(PMCID[:\s]+[0-9A-Za-z]+\)|PMCID[:\s]+[0-9A-Za-z]+|PMID[:\s]+[0-9A-Za-z]+)/g;

  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-surface-50">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italics: *text* or _text_
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return (
        <em key={index} className="italic text-surface-200">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Code: `text`
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-surface-800 border border-surface-700 text-[#0F9D8A] font-semibold"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Citations: 【PMC...】, [PMC...], PMCID: ..., PMID: ...
    if (
      part.startsWith('【') ||
      part.startsWith('[PMC') ||
      part.includes('PMCID') ||
      part.includes('PMID')
    ) {
      return (
        <span
          key={index}
          className="inline-flex items-center mx-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#E8F7F4] dark:bg-surface-800 text-[#0F9D8A] border border-[#0F9D8A]/30 align-baseline"
        >
          {part}
        </span>
      );
    }

    return part;
  });
}

export default function MarkdownContent({ content, className = '' }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let currentList = null;
  let listType = null; // 'ul' or 'ol'
  let tableRows = [];
  let inTable = false;

  function flushList() {
    if (currentList) {
      if (listType === 'ul') {
        elements.push(
          <ul key={`ul-${elements.length}`} className="space-y-1.5 my-2.5 pl-1">
            {currentList.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-surface-300">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0F9D8A] shrink-0 mt-1.5" />
                <span className="flex-1">{renderInline(item)}</span>
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${elements.length}`} className="space-y-1.5 my-2.5 pl-1">
            {currentList.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-surface-300">
                <span className="text-[11px] font-mono font-bold text-[#0F9D8A] shrink-0 w-4">
                  {i + 1}.
                </span>
                <span className="flex-1">{renderInline(item)}</span>
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
      listType = null;
    }
  }

  function flushTable() {
    if (tableRows.length > 0) {
      const headerRow = tableRows[0];
      const bodyRows = tableRows.slice(1);

      elements.push(
        <div key={`table-${elements.length}`} className="overflow-x-auto my-3 rounded-lg border border-surface-700">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-800 border-b border-surface-700 font-bold text-surface-50">
                {headerRow.map((cell, cIdx) => (
                  <th key={cIdx} className="py-2 px-3">
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-surface-800/50">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="py-2 px-3 text-surface-300">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      flushTable();
      continue;
    }

    // Check for Markdown Table Rows: `| ... |`
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      // Skip separator rows like `|---|---|`
      const rawContent = trimmed.slice(1, -1).replace(/[|\-\s:]/g, '');
      if (rawContent.length === 0) {
        continue;
      }
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());
      tableRows.push(cells);
      inTable = true;
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Check for Dividers: `---` or `***`
    if (/^(\*\*\*|---|___)$/.test(trimmed)) {
      flushList();
      elements.push(<hr key={`hr-${i}`} className="border-t border-surface-700 my-4" />);
      continue;
    }

    // Check for Headings: `### `, `## `, `# `, `#### `
    if (trimmed.startsWith('#### ')) {
      flushList();
      elements.push(
        <h5 key={`h5-${i}`} className="text-xs font-bold text-surface-50 uppercase tracking-wider mt-3 mb-1.5">
          {renderInline(trimmed.slice(5))}
        </h5>
      );
      continue;
    }
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={`h4-${i}`} className="text-sm font-bold text-surface-50 mt-4 mb-2 flex items-center gap-1.5">
          {renderInline(trimmed.slice(4))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${i}`} className="text-base font-bold text-surface-50 mt-4 mb-2 border-b border-surface-700/60 pb-1">
          {renderInline(trimmed.slice(3))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h2 key={`h2-${i}`} className="text-lg font-extrabold text-surface-50 mt-4 mb-2">
          {renderInline(trimmed.slice(2))}
        </h2>
      );
      continue;
    }

    // Check for Unordered List items: `- `, `* `, `• `
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      const itemText = trimmed.replace(/^[-*•]\s+/, '');
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
        currentList = [];
      }
      currentList.push(itemText);
      continue;
    }

    // Check for Ordered List items: `1. `, `2. `, etc.
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      const itemText = orderedMatch[2];
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
        currentList = [];
      }
      currentList.push(itemText);
      continue;
    }

    // Regular paragraph line
    flushList();
    elements.push(
      <p key={`p-${i}`} className="text-xs leading-relaxed text-surface-300 my-1.5">
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList();
  flushTable();

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}
