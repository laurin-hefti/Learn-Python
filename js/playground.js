// Shared Python playground using Pyodide (runs fully in the browser).

let pyodide = null;

async function getPyodide() {
  const status = document.getElementById('pyStatus');
  if (pyodide) return pyodide;
  if (status) status.textContent = '⏳ Loading Python engine...';
  pyodide = await globalThis.loadPyodide();
  if (status) status.textContent = '✅ Python ready!';
  return pyodide;
}

async function runPython() {
  const code = document.getElementById('pythonEditor');
  const output = document.getElementById('pythonOutput');
  const btn = document.getElementById('runBtn');
  const status = document.getElementById('pyStatus');

  if (!code || !output) return;
  btn.disabled = true;
  btn.textContent = 'Running...';
  if (status) status.textContent = '';

  try {
    const py = await getPyodide();
    py.setStdout({ batched: (text) => { appendOutput(text, false); }});
    py.setStderr({ batched: (text) => { appendOutput('[Error] ' + text, true); }});
    output.textContent = '';
    await py.runPythonAsync(code.value);
  } catch (error) {
    appendOutput('[Error] ' + error.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = '▶ Run Code';
  }
}

function appendOutput(text, isError) {
  const output = document.getElementById('pythonOutput');
  if (!output) return;
  const span = document.createElement('span');
  span.textContent = text + '\n';
  if (isError) span.className = 'error-output';
  output.appendChild(span);
}

function clearOutput() {
  const output = document.getElementById('pythonOutput');
  if (output) output.textContent = '';
}

function loadExample() {
  const editor = document.getElementById('pythonEditor');
  if (editor) {
    editor.value = 'for i in range(1, 6):\n    print(f"{i} squared = {i**2}")';
    if (typeof editor.dispatchEvent === 'function') editor.dispatchEvent(new Event('input'));
    clearOutput();
  }
}

function openIDE() {
  const modal = document.getElementById('ideModal');
  if (modal) modal.style.display = 'flex';
  const output = document.getElementById('pythonOutput');
  if (output) output.textContent = '';
  // The quiz modal editor is hidden at page load, so its highlight wrapper
  // may be empty/zero-sized. Re-render now that the modal is visible.
  const editor = document.getElementById('pythonEditor');
  if (editor && typeof editor.dispatchEvent === 'function') {
    editor.dispatchEvent(new Event('input'));
    editor.dispatchEvent(new Event('scroll'));
  }
}

function closeIDE() {
  const modal = document.getElementById('ideModal');
  if (modal) modal.style.display = 'none';
}

// Wraps a textarea with a transparent-text editor layered over a syntax
// highlighted <pre>, plus line numbers. Reuses highlightPython() so the same
// tok-* color palette applies in both light and dark themes.
function initSyntaxHighlight(editor) {
  if (!editor || editor.dataset.highlightWrap) return;

  const parent = editor.parentNode;
  const wrap = document.createElement('div');
  wrap.className = 'editor-wrap';

  const gutter = document.createElement('div');
  gutter.className = 'editor-gutter';
  wrap.appendChild(gutter);

  const pre = document.createElement('pre');
  pre.className = 'editor-highlight';
  pre.setAttribute('aria-hidden', 'true');
  wrap.appendChild(pre);

  editor.parentNode.insertBefore(wrap, editor);
  wrap.appendChild(editor);

  const render = () => {
    pre.innerHTML = (typeof highlightPython === 'function')
      ? highlightPython(editor.value)
      : wrapText(editor.value);
    editor.style.color = 'transparent';
    editor.style.caretColor = 'var(--code-fg)';
    syncScroll();
    renderGutter();
  };

  const escText = (text) => {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  };

  // Escape the code without highlightPython() (fallback, e.g. no script loaded).
  function wrapText(text) {
    return escText(text);
  }

  const renderGutter = () => {
    const count = (editor.value.match(/\n/g) || []).length + 1;
    gutter.innerHTML = Array.from({ length: count }, (_, i) => `<span>${i + 1}</span>`).join('');
  };

  const syncScroll = () => {
    pre.scrollTop = editor.scrollTop;
    pre.scrollLeft = editor.scrollLeft;
    gutter.scrollTop = editor.scrollTop;
  };

  editor.addEventListener('input', render);
  editor.addEventListener('scroll', syncScroll);

  render();
  editor.dataset.highlightWrap = '1';
}

function initPlaygroundEditor() {
  const editor = document.getElementById('pythonEditor');
  if (!editor) return;
  initSyntaxHighlight(editor);

  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = editor.selectionStart;
      editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(editor.selectionEnd);
      editor.selectionStart = editor.selectionEnd = start + 4;
      editor.dispatchEvent(new Event('input'));
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runPython();
    }
  });
}

document.addEventListener('DOMContentLoaded', initPlaygroundEditor);
