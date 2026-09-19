// Markdown → theory sections converter + preview renderer.
// Exposes: mdToTheorySections(md) and renderMarkdownPreview(sections).
// Output sections match the data/theory.json schema so the normal theory
// renderer (js/theory.js) can display them unchanged.

function mdToTheorySections(md) {
  const sections = [];
  let para = [];
  let codeLines = null;
  let listItems = null;
  let mathLines = null;

  const flushPara = () => {
    if (para.length > 0) {
      sections.push({ type: 'paragraph', text: para.join(' ') });
      para = [];
    }
  };
  const flushList = () => {
    if (listItems) {
      sections.push({ type: 'list', items: listItems });
      listItems = null;
    }
  };

  const lines = String(md == null ? '' : md).replace(/\r\n/g, '\n').split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // ── Fenced code blocks ────────────────────────────────────────────────
    if (/^```/.test(trimmed)) {
      if (codeLines !== null) {
        sections.push({ type: 'code', code: codeLines.join('\n') });
        codeLines = null;
      } else {
        flushPara(); flushList();
        codeLines = [];
      }
      continue;
    }
    if (codeLines !== null) { codeLines.push(line); continue; }

    // ── Display math ($$...$$) ────────────────────────────────────────────
    if (mathLines !== null) {
      if (trimmed === '$$') {
        sections.push({ type: 'formula', latex: mathLines.join(' ').trim() });
        mathLines = null;
      } else {
        mathLines.push(line);
      }
      continue;
    }
    if (/^\$\$/.test(trimmed)) {
      flushPara(); flushList();
      const rest = trimmed.slice(2);
      if (rest.endsWith('$$')) {
        sections.push({ type: 'formula', latex: rest.slice(0, -2).trim() });
      } else {
        mathLines = [rest];
      }
      continue;
    }

    // ── Headings (#, ##, ...) ─────────────────────────────────────────────
    const h = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      flushPara(); flushList();
      sections.push({ type: 'heading', text: mdInlineImport(h[2]) });
      continue;
    }

    // ── Unordered + ordered lists ─────────────────────────────────────────
    const bullet = trimmed.match(/^\s*[-*+]\s+(.+)$/);
    const order = trimmed.match(/^\s*\d+[.)]\s+(.+)$/);
    const item = (bullet || order) && mdInlineImport((bullet || order)[1]);
    if (item) {
      if (!listItems) { flushPara(); listItems = []; }
      listItems.push(item);
      continue;
    }
    flushList();

    // ── Images ![alt](url) ────────────────────────────────────────────────
    const img = trimmed.match(/^!\[([^\]]*)\]\((\S+?)\)\s*$/);
    if (img) {
      flushPara();
      const imgSec = { type: 'image', src: img[2] };
      const alt = img[1].trim();
      if (alt) imgSec.caption = alt;
      sections.push(imgSec);
      continue;
    }

    // ── Horizontal rules (ignored) ────────────────────────────────────────
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(trimmed)) { flushPara(); continue; }

    // ── Animation directive: @animation:id ─────────────────────────────────
    const anim = trimmed.match(/^@animation\s*[:=]\s*([\w-]+)/);
    if (anim) {
      flushPara(); flushList();
      sections.push({ type: 'animation', animation: anim[1] });
      continue;
    }

    // ── Indented code blocks (4 spaces or a tab) ──────────────────────────
    if (/^( {4}|\t)/.test(line)) {
      flushPara();
      const buf = [line.replace(/^( {4}|\t)/, '')];
      while (i + 1 < lines.length) {
        const next = lines[i + 1];
        if (/^( {4}|\t)/.test(next)) {
          buf.push(next.replace(/^( {4}|\t)/, ''));
          i++;
        } else if (next.trim() === '') {
          if (i + 2 < lines.length && /^( {4}|\t)/.test(lines[i + 2])) {
            buf.push('');
            i++;
          } else {
            break;
          }
        } else {
          break;
        }
      }
      sections.push({ type: 'code', code: buf.join('\n') });
      continue;
    }

    // ── Paragraph text / blank lines ──────────────────────────────────────
    if (trimmed === '') { flushPara(); continue; }
    para.push(mdInlineImport(trimmed));
  }

  flushPara(); flushList();
  if (codeLines !== null) sections.push({ type: 'code', code: codeLines.join('\n') });
  if (mathLines !== null) sections.push({ type: 'formula', latex: mathLines.join(' ').trim() });

  return sections;
}

function mdInlineImport(text) {
  return String(text)
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

function mdEscapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function mdInlineFormat(text) {
  return String(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

// Renders the section list as theory-styled HTML (used for the live preview).
function renderMarkdownPreview(sections) {
  const body = (sections || []).map(s => {
    if (s.type === 'heading') {
      return `<h2 class="theory-heading">${mdInlineFormat(mdEscapeHtml(s.text))}</h2>`;
    }
    if (s.type === 'paragraph') {
      return `<p class="theory-paragraph math">${mdInlineFormat(mdEscapeHtml(s.text))}</p>`;
    }
    if (s.type === 'code') {
      return `<div class="code-block"><div class="code-header">Python</div><pre><code>${mdEscapeHtml(s.code)}</code></pre></div>`;
    }
    if (s.type === 'formula') {
      return `<div class="theory-formula">${mdEscapeHtml(s.latex)}</div>`;
    }
    if (s.type === 'list') {
      const items = s.items.map(i => `<li>${mdEscapeHtml(i)}</li>`).join('');
      return `<ul class="theory-list">${items}</ul>`;
    }
    if (s.type === 'image') {
      const caption = s.caption ? `<figcaption class="theory-caption">${mdEscapeHtml(s.caption)}</figcaption>` : '';
      return `<figure class="theory-figure"><img class="theory-image" src="${mdEscapeHtml(s.src)}" alt="${mdEscapeHtml(s.caption || '')}">${caption}</figure>`;
    }
    if (s.type === 'animation') {
      return `<div class="theory-animation">
        <div class="animation-player" data-animation="${mdEscapeHtml(s.animation)}"></div>
      </div>`;
    }
    return '';
  }).join('');

  return `<div class="theory-body">${body}</div>`;
}