/**
 * CDM Renderer — Produces clean markdown from the Canonical Document Model
 *
 * Walks the CDM section tree and renders:
 * - Sections → markdown headings
 * - Forms → `| Field | Value |` tables or definition lists
 * - Tables → HTML tables from normalized grids (stitched, deduped headers)
 * - Pseudo-tables → markdown tables
 * - Paragraphs/lists → as-is
 *
 * The garbage disappears because the CDM is clean — not because of
 * output-side patches. This replaces reconstruction.stage.js when
 * CDM_RENDERER !== 'legacy'.
 */

/**
 * Renders a CDM document to markdown.
 *
 * @param {Object} cdm - CDM document (from cdm-builder)
 * @returns {string} Clean markdown
 */
function render(cdm) {
  if (!cdm || !cdm.sections) return '';

  const parts = [];
  renderSections(cdm.sections, parts);
  return parts.join('\n\n').trim() + '\n';
}

function renderSections(sections, parts) {
  for (const section of sections) {
    // Render section heading (skip the synthetic root "Preamble")
    if (section.id !== '0' && section.title) {
      const prefix = '#'.repeat(Math.min(section.level + 1, 6));
      // Restore the numbering dot (id "3" / "2.1" -> "3." / "2.1").
      const num = /\.\d/.test(section.id) ? section.id : `${section.id}.`;
      parts.push(`${prefix} ${num} ${section.title}`);
    }

    // Render blocks
    for (const block of section.blocks || []) {
      const rendered = renderBlock(block);
      if (rendered) parts.push(rendered);
    }

    // Render children
    if (section.children && section.children.length > 0) {
      renderSections(section.children, parts);
    }
  }
}

function renderBlock(block) {
  if (!block) return '';

  switch (block.type) {
    case 'heading':
      return renderHeading(block);
    case 'paragraph':
      return renderParagraph(block);
    case 'list':
      return renderList(block);
    case 'form':
      return renderForm(block);
    case 'table':
      return renderTable(block);
    case 'pseudo-table':
      return renderPseudoTable(block);
    default:
      if (block.content) return block.content.trim();
      return '';
  }
}

function renderHeading(block) {
  const level = block.level || block['heading level'] || 2;
  const prefix = '#'.repeat(Math.min(level, 6));
  return `${prefix} ${(block.content || '').trim()}`;
}

function renderParagraph(block) {
  return (block.content || '').trim();
}

function renderList(block) {
  const items = block.items || block['list items'] || [];
  const isOrdered = (block.numberingStyle || block['numbering style']) === 'arabic numbers';

  return items.map((item, idx) => {
    const prefix = isOrdered ? `${idx + 1}. ` : '- ';
    const content = (item.content || '').trim();
    return `${prefix}${content}`;
  }).join('\n');
}

function renderForm(block) {
  if (!block.fields || block.fields.length === 0) return '';

  // Decide table vs definition list
  const useTable = block.fields.every((f) =>
    !f.value.includes('\n') && f.value.length < 100
  );

  if (useTable) {
    let md = '| Field | Value |\n|---|---|\n';
    for (const field of block.fields) {
      const safeLabel = field.label.replace(/\|/g, '\\|');
      const safeValue = (field.value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
      const extras = field.extras && field.extras.length > 0
        ? ' ' + field.extras.join(', ')
        : '';
      md += `| ${safeLabel} | ${safeValue}${extras} |\n`;
    }
    return md;
  }

  let md = '';
  for (const field of block.fields) {
    md += `**${field.label}:**\n${field.value}\n\n`;
  }
  return md.trim();
}

function renderTable(block) {
  // If normalized table with columns and rows, render from the clean grid
  if (block.columns && block.rows) {
    return renderNormalizedTable(block);
  }

  // Raw table fallback (shouldn't happen after P3)
  if (block.rowCount !== undefined) {
    return `[Table with ${block.rowCount} rows]`;
  }

  return '';
}

function renderNormalizedTable(block) {
  const { columns, headerTree, rows, notes } = block;

  let html = '<table>\n';

  // Render header band
  if (headerTree && headerTree.length > 0) {
    for (const headerRow of headerTree) {
      html += '  <tr>\n';
      for (const cell of headerRow) {
        html += `    <th>${escapeHtml(cell)}</th>\n`;
      }
      html += '  </tr>\n';
    }
  } else if (columns.length > 0) {
    html += '  <tr>\n';
    for (const col of columns) {
      html += `    <th>${escapeHtml(col)}</th>\n`;
    }
    html += '  </tr>\n';
  }

  // Render data rows
  for (const row of rows) {
    html += '  <tr>\n';
    for (const col of columns) {
      const value = row.cells[col] || '';
      html += `    <td>${escapeHtml(value)}</td>\n`;
    }
    html += '  </tr>\n';
  }

  html += '</table>';

  // Append notes if any
  if (notes && notes.length > 0) {
    html += '\n\n' + notes.map((n) => `*${n}*`).join('\n');
  }

  return html;
}

function renderPseudoTable(block) {
  if (!block.headers || block.headers.length === 0) return '';

  let md = '| ' + block.headers.map(escapeHtml).join(' | ') + ' |\n';
  md += '|' + block.headers.map(() => '---').join('|') + '|\n';

  for (const row of block.dataRows || []) {
    const cells = block.headers.map((_, i) => escapeHtml(row[i] || ''));
    md += '| ' + cells.join(' | ') + ' |\n';
  }

  return md;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = { render };
