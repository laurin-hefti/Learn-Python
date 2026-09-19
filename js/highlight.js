// Lightweight client-side Python syntax highlighter (no dependencies).
// Tokenizes plain text into <span class="tok-..."> elements. Safe to inject
// into innerHTML because every raw character is HTML-escaped on output.

(function () {
  const TOKEN_RULES = [
    [/[rRbBuUfF]{0,2}(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/, 'tok-string'],
    [/#[^\n]*/, 'tok-comment'],
    [/\b(?:0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/, 'tok-number'],
    [/\b(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|False|finally|for|from|global|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|try|while|with|yield)\b/, 'tok-keyword'],
    [/@[A-Za-z_]\w*/, 'tok-decorator'],
    [/\b[A-Za-z_]\w*(?=\s*\()/, 'tok-func'],
    [/\b(?:abs|bin|bool|bytes|chr|dict|enumerate|filter|float|format|frozenset|help|hex|input|int|isinstance|len|list|map|max|min|oct|ord|print|range|repr|reversed|round|set|slice|sorted|str|sum|super|tuple|type|zip)\b/, 'tok-builtin'],
    [/[+\-*/%<>=!&|^~]+/, 'tok-op'],
  ];

  const RE = new RegExp(TOKEN_RULES.map(([re]) => '(' + re.source + ')').join('|'), 'gm');

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text == null ? '' : text);
    return div.innerHTML;
  }

  // True for lines that read as Python error output: a traceback header,
  // a traceback frame, or an exception/error statement.
  function isErrorLine(line) {
    const t = String(line == null ? '' : line).trim();
    if (!t) return false;
    return /^Traceback \(most recent call last\):/.test(t)
      || /^File "/.test(t)
      || /^\[Error\]/.test(t)
      || /^[A-Za-z_.][\w.]*(?:Error|Exception|Warning|Interrupt)[\w.]*\s*:/.test(t);
  }

  // Wrap the highlighted HTML for any lines that look like error output in a
  // red span, so error messages inside code blocks stand out.
  function wrapErrorLines(html, code) {
    const errorIdx = new Set();
    String(code).split('\n').forEach((l, i) => {
      if (isErrorLine(l)) errorIdx.add(i);
    });

    let out = '';
    let line = 0;
    let inErr = errorIdx.has(0);
    if (inErr) out = '<span class="code-error-line">';

    for (let i = 0; i < html.length; i++) {
      const ch = html[i];
      if (ch === '\n') {
        if (inErr) { out += '</span>'; inErr = false; }
        out += ch;
        line++;
        if (errorIdx.has(line)) { out += '<span class="code-error-line">'; inErr = true; }
      } else {
        out += ch;
      }
    }
    if (inErr) out += '</span>';
    return out;
  }

  function highlightPython(code) {
    if (!code) return '';
    let html = '';
    let last = 0;
    let m;
    RE.lastIndex = 0;
    while ((m = RE.exec(code)) !== null) {
      if (m[0].length === 0) { RE.lastIndex++; continue; }
      if (m.index > last) html += escapeHtml(code.slice(last, m.index));
      let cls = 'tok-op';
      for (let i = 1; i < m.length; i++) {
        if (m[i] !== undefined) { cls = TOKEN_RULES[i - 1][1]; break; }
      }
      html += '<span class="' + cls + '">' + escapeHtml(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    html += escapeHtml(code.slice(last));
    return wrapErrorLines(html, code);
  }

  function highlightCodeBlocks(root) {
    root = root || document;
    root.querySelectorAll('.code-block pre code').forEach(el => {
      if (el.dataset.highlighted) return;
      el.innerHTML = highlightPython(el.textContent);
      el.dataset.highlighted = '1';
    });
  }

  window.highlightPython = highlightPython;
  window.highlightCodeBlocks = highlightCodeBlocks;
})();