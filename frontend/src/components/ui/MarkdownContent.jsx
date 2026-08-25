import React from 'react';
import { ExternalLink } from 'lucide-react';

/**
 * Pure React Markdown renderer for scientific research output.
 * Renders headings, bold/italics, bullet lists, numbered lists, tables,
 * code blocks, inline code, blockquotes, links, and clickable citation badges
 * without raw Markdown artifacts.
 */

// Helper to extract clean query term for PubMed link
function extractPubMedTerm(citationText) {
  const match = citationText.match(/(?:PMC\d+|PMID[:\s]*\d+|\d{7,8})/i);
  if (match) {
    return match[0].replace(/PMID[:\s]*/i, '').trim();
  }
  return citationText.replace(/[【】\[\]()]/g, '').trim();
}

// Format inline tokens: **bold**, *italics*, `code`, [text](url), and 【PMC...】/ [PMC...] / (PMCID...) citations
function renderInline(text) {
  if (!text) return null;

  // Token patterns:
  // 1. Bold: `**...**`
  // 2. Italics: `*...*` or `_..._`
  // 3. Inline code: `` `...` ``
  // 4. Markdown links: `[text](url)`
  // 5. Citations: 【...】, [PMC...], (PMCID: ...), PMCID: ..., PMID: ...
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)]+\)|【[^】]+】|\[PMC[0-9A-Za-z]+\]|\(PMCID[:\s]+[0-9A-Za-z]+\)|PMCID[:\s]+[0-9A-Za-z]+|PMID[:\s]+[0-9A-Za-z]+)/g;

  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-bold text-surface-50">
          {renderInline(part.slice(2, -2))}
        </strong>
      );
    }

    // Italics: *text* or _text_
    if (
      ((part.startsWith('*') && part.endsWith('*')) ||
        (part.startsWith('_') && part.endsWith('_'))) &&
      part.length >= 2
    ) {
      return (
        <em key={index} className="italic text-surface-200">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Inline Code: `text`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-surface-900 border border-surface-700 text-[#0F9D8A] font-semibold"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Link: [text](url)
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        return (
          <a
            key={index}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0F9D8A] hover:text-[#0c8474] underline underline-offset-2 font-medium inline-flex items-center gap-0.5"
          >
            {match[1]}
            <ExternalLink size={10} className="inline opacity-70" />
          </a>
        );
      }
    }

    // Citations: 【PMC...】, [PMC...], PMCID: ..., PMID: ...
    if (
      part.startsWith('【') ||
      part.startsWith('[PMC') ||
      part.includes('PMCID') ||
      part.includes('PMID')
    ) {
      const term = extractPubMedTerm(part);
      const cleanLabel = part.replace(/[【】]/g, '');
      return (
        <a
          key={index}
          href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(term)}`}
          target="_blank"
          rel="noopener noreferrer"
          title={`View on PubMed: ${term}`}
          className="inline-flex items-center mx-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E8F7F4] dark:bg-surface-800 text-[#0F9D8A] border border-[#0F9D8A]/30 hover:border-[#0F9D8A] hover:bg-[#0F9D8A]/10 transition-colors align-baseline"
        >
          {cleanLabel}
        </a>
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
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines = [];

  function flushList() {
    if (currentList) {
      if (listType === 'ul') {
        elements.push(
          <ul key={`ul-${elements.length}`} className="space-y-1.5 my-2.5 pl-1">
            {currentList.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-surface-200">
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
              <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-surface-200">
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
        <div
          key={`table-${elements.length}`}
          className="overflow-x-auto my-3 rounded-lg border border-surface-700 bg-surface-900/50"
        >
          <table className="w-full text-left text-xs border-collapse min-w-[320px]">
            <thead>
              <tr className="bg-surface-800 border-b border-surface-700 font-bold text-surface-50">
                {headerRow.map((cell, cIdx) => (
                  <th key={cIdx} className="py-2 px-3 whitespace-nowrap">
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/60">
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-surface-800/40 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="py-2 px-3 text-surface-200">
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

  function flushCodeBlock() {
    if (inCodeBlock) {
      elements.push(
        <div
          key={`code-${elements.length}`}
          className="my-3 rounded-lg border border-surface-700 overflow-hidden bg-surface-950"
        >
          {codeBlockLang && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-surface-800/80 border-b border-surface-700">
              <span className="text-[10px] font-mono font-bold text-accent-400 uppercase tracking-wider">
                {codeBlockLang}
              </span>
            </div>
          )}
          <pre className="overflow-x-auto p-3 text-[11px] font-mono text-surface-200 leading-relaxed whitespace-pre">
            <code>{codeBlockLines.join('\n')}</code>
          </pre>
        </div>
      );
      codeBlockLines = [];
      codeBlockLang = '';
      inCodeBlock = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // ── Fenced code blocks: ```lang ──────────────────────────────────────────
    if (trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        flushList();
        flushTable();
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
      } else {
        flushCodeBlock();
      }
      continue;
    }
    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    // ── Blank line ─────────────────────────────────────────────────────────
    if (!trimmed) {
      flushList();
      flushTable();
      continue;
    }

    // ── Markdown Tables: | col1 | col2 | ───────────────────────────────────
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      // Skip markdown alignment row: |---|---|
      const rawContent = trimmed.slice(1, -1).replace(/[|\-\s:]/g, '');
      if (rawContent.length === 0) continue;
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

    // ── Blockquotes: > quote text ──────────────────────────────────────────
    if (trimmed.startsWith('> ') || trimmed === '>') {
      flushList();
      const quoteText = trimmed.startsWith('> ') ? trimmed.slice(2) : '';
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-2 border-[#0F9D8A] bg-[#0F9D8A]/5 dark:bg-surface-800/50 pl-3 py-1.5 my-2.5 rounded-r-lg text-xs italic text-surface-300 leading-relaxed"
        >
          {renderInline(quoteText)}
        </blockquote>
      );
      continue;
    }

    // ── Dividers: --- or *** ───────────────────────────────────────────────
    if (/^(\*\*\*|---|___)$/.test(trimmed)) {
      flushList();
      elements.push(<hr key={`hr-${i}`} className="border-t border-surface-700 my-4" />);
      continue;
    }

    // ── Headings ───────────────────────────────────────────────────────────
    if (trimmed.startsWith('#### ')) {
      flushList();
      elements.push(
        <h5
          key={`h5-${i}`}
          className="text-xs font-bold text-surface-50 uppercase tracking-wider mt-3.5 mb-1.5"
        >
          {renderInline(trimmed.slice(5))}
        </h5>
      );
      continue;
    }
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4
          key={`h4-${i}`}
          className="text-sm font-bold text-surface-50 mt-4 mb-2 flex items-center gap-1.5"
        >
          {renderInline(trimmed.slice(4))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-base font-bold text-surface-50 mt-4 mb-2 border-b border-surface-700/60 pb-1"
        >
          {renderInline(trimmed.slice(3))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-lg font-extrabold text-surface-50 mt-4 mb-2"
        >
          {renderInline(trimmed.slice(2))}
        </h2>
      );
      continue;
    }

    // ── Unordered List: - item, * item, • item ─────────────────────────────
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

    // ── Ordered List: 1. item, 2. item ─────────────────────────────────────
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

    // ── Regular Paragraph ──────────────────────────────────────────────────
    flushList();
    elements.push(
      <p key={`p-${i}`} className="text-xs leading-relaxed text-surface-200 my-1.5">
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList();
  flushTable();
  flushCodeBlock();

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}
