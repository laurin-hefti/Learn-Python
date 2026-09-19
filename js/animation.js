// Animation player: renders data/animations/<id>.json as a step-by-step
// visualization with play/pause/step controls. Used by "animation" sections.
//
// Animation JSON schema:
//   {
//     id, title, subtitle, code (string, \n separated),
//     steps: [ { label, line (1-based number or array), calls: [string], text } ]
//   }
// "calls" is the call stack, newest/last frame on top. A frame like
// "fact(2) ← 1" shows the value just received while unwinding.

async function initAnimationPlayers(root) {
  root = root || document;
  const players = root.querySelectorAll('.animation-player[data-animation]');
  for (const el of players) {
    if (el.dataset.animLoaded) continue;
    el.dataset.animLoaded = '1';
    el.innerHTML = '<p class="empty-state">Animation wird geladen…</p>';
    try {
      const id = encodeURIComponent(el.dataset.animation);
      const res = await fetch('data/animations/' + id + '.json');
      if (!res.ok) throw new Error('not found');
      renderAnimationPlayer(el, await res.json());
    } catch (e) {
      el.innerHTML =
        '<p class="error-msg">Animation &quot;' + escapeHtml(el.dataset.animation) +
        '&quot; konnte nicht geladen werden.</p>';
    }
  }
}

function renderAnimationPlayer(el, anim) {
  const steps = Array.isArray(anim.steps) ? anim.steps : [];
  const codeLines = String(anim.code || '').replace(/\r\n/g, '\n').split('\n');
  if (steps.length === 0) {
    el.innerHTML = '<p class="error-msg">Animation ist leer.</p>';
    return;
  }

  const PLAY_MS = 1500;
  let current = 0;
  let timer = null;

  el.classList.add('anim-player');
  el.innerHTML = `
    <div class="anim-head">
      <div>
        <div class="anim-title">${escapeHtml(anim.title || '')}</div>
        ${anim.subtitle ? `<div class="anim-sub">${escapeHtml(anim.subtitle)}</div>` : ''}
      </div>
      <span class="anim-counter">1 / ${steps.length}</span>
    </div>
    <div class="anim-body">
      <div class="anim-code" data-code></div>
      <div class="anim-side">
        <div class="anim-stack-title">Call-Stack</div>
        <div class="anim-stack" data-stack></div>
        <p class="anim-text" data-text></p>
      </div>
    </div>
    <div class="anim-controls">
      <button type="button" class="btn btn-sm btn-secondary" data-reset title="Zurücksetzen">⟲</button>
      <button type="button" class="btn btn-sm btn-secondary" data-prev title="Vorheriger Schritt">◀</button>
      <button type="button" class="btn btn-sm btn-primary" data-play title="Abspielen">▶ Abspielen</button>
      <button type="button" class="btn btn-sm btn-secondary" data-next title="Nächster Schritt">▶</button>
      <span class="anim-speed">
        Tempo
        <input type="range" min="400" max="3000" step="100" value="${PLAY_MS}">
      </span>
    </div>
  `;

  const codeEl = el.querySelector('[data-code]');
  const stackEl = el.querySelector('[data-stack]');
  const textEl = el.querySelector('[data-text]');
  const counterEl = el.querySelector('.anim-counter');
  const playBtn = el.querySelector('[data-play]');
  const speedInput = el.querySelector('.anim-speed input');

  function activeLines(s) {
    const l = s && s.line;
    if (l == null) return [];
    return (Array.isArray(l) ? l : [l]).map(Number);
  }

  function stop() {
    if (timer !== null) { clearInterval(timer); timer = null; }
    playBtn.textContent = '▶ Abspielen';
  }

  function apply() {
    const s = steps[current] || {};
    const active = activeLines(s);
    codeEl.innerHTML = codeLines.map((line, i) =>
      `<div class="anim-code-line${active.includes(i + 1) ? ' active' : ''}">${escapeHtml(line)}</div>`
    ).join('');

    const frames = Array.isArray(s.calls) ? s.calls : [];
    stackEl.innerHTML = frames.length
      ? frames.map(f =>
          `<div class="anim-frame${/←/.test(f) ? ' returning' : ''}">${escapeHtml(f)}</div>`).join('')
      : '<div class="anim-frame-empty">— Stack ist leer —</div>';

    textEl.innerHTML = mdInlineHtml(s.text || '');
    counterEl.textContent = `${current + 1} / ${steps.length}`;
  }

  function next(forward) {
    if (forward) {
      if (current >= steps.length - 1) { stop(); return; }
      current++;
    } else {
      if (current <= 0) return;
      current--;
    }
    apply();
  }

  playBtn.addEventListener('click', () => {
    if (timer !== null) { stop(); return; }
    if (current >= steps.length - 1) current = 0;
    apply();
    timer = setInterval(() => {
      if (current >= steps.length - 1) { stop(); return; }
      current++;
      apply();
    }, Number(speedInput.value));
    playBtn.textContent = '⏸ Pause';
  });

  el.querySelector('[data-next]').addEventListener('click', () => next(true));
  el.querySelector('[data-prev]').addEventListener('click', () => next(false));
  el.querySelector('[data-reset]').addEventListener('click', () => {
    stop();
    current = 0;
    apply();
  });
  speedInput.addEventListener('input', () => {
    if (timer !== null) {
      stop();
      startPlay();
    }
  });

  function startPlay() {
    playBtn.click();
  }

  apply();
}

function mdInlineHtml(text) {
  return String(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}