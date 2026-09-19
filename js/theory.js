// Theory pages: loads from data/theory.json and renders either the topic index
// or a single topic (via URL hash, e.g. theory.html#python-basics).

async function loadTheory() {
  const area = document.getElementById('theoryArea');
  try {
    const [theoryRes, quizRes, mdTheoryRes] = await Promise.all([
      fetch('data/theory.json'),
      fetch('data/quizzes.json'),
      fetch('data/theory-md.json'),
    ]);
    if (!theoryRes.ok) throw new Error('Failed to load');
    const data = await theoryRes.json();
    let topics = data.topics || [];

    // Merge topics authored with the Markdown builder. They live in their own
    // file so the two builder tools can't overwrite each other; if an ID ever
    // collides anyway, the structured theory.json version wins.
    if (mdTheoryRes.ok) {
      const mdData = await mdTheoryRes.json();
      const seen = new Set(topics.map(t => t && t.id));
      (mdData.topics || []).forEach(t => {
        if (t && t.id && !seen.has(t.id)) {
          topics.push(t);
          seen.add(t.id);
        }
      });
    }

    let quizzes = [];
    if (quizRes.ok) quizzes = (await quizRes.json()).quizzes || [];

    const topicId = decodeURIComponent(window.location.hash.replace('#', ''));

    if (topicId) {
      const topic = topics.find(t => t.id === topicId);
      if (topic) {
        document.title = `${topic.title} - Python Quiz Master`;
        markTheoryRead(topic.id);
        const relatedQuiz = quizzes.find(q => q.id === topicId) || null;
        area.innerHTML = renderTopic(topic, relatedQuiz);
        renderMath(area);
        highlightCodeBlocks(area);
        if (typeof initAnimationPlayers === 'function') initAnimationPlayers(area);
      } else {
        area.innerHTML = `<p class="error-msg">Topic not found. <a href="theory.html">Back to theory</a></p>`;
      }
    } else {
      document.title = `Theory - Python Quiz Master`;
      area.innerHTML = renderIndex(topics);
    }
  } catch (err) {
    area.innerHTML = `<p class="error-msg">Could not load theory. Make sure you are serving this site over HTTP.</p>`;
  }
}

// Re-render when the URL hash changes (e.g. navigating between topics without a full page reload).
window.addEventListener('hashchange', loadTheory);

function renderIndex(topics) {
  if (topics.length === 0) {
    return `<p class="empty-state">No theory yet. <a href="admin.html">Create one!</a></p>`;
  }

  // Group by category
  const categories = {};
  topics.forEach(t => {
    const cat = t.category || 'General';
    (categories[cat] = categories[cat] || []).push(t);
  });

  const cards = Object.entries(categories).map(([cat, list]) => `
    <section class="theory-category">
      <h2 class="theory-cat-title">${escapeHtml(cat)}</h2>
      <div class="quiz-grid">
        ${list.map(t => {
          const done = isTheoryRead(t.id);
          return `
          <div class="quiz-card">
            <div class="quiz-card-body">
              <h3>${escapeHtml(t.title)} ${done ? '<span class="badge done" title="Bereits gelesen">✓ gelesen</span>' : ''}</h3>
              <p>${escapeHtml(t.description || '')}</p>
            </div>
            <a href="theory.html#${encodeURIComponent(t.id)}" class="btn btn-primary">${done ? 'Read again →' : 'Read →'}</a>
          </div>`;
        }).join('')}
      </div>
    </section>
  `).join('');

  const read = countTheoryRead();
  return `
    <div class="quiz-header">
      <h1>📚 Python Theory</h1>
      <p>Learn the concepts, then test yourself with the quizzes.</p>
      <p class="theory-progress">✅ ${read} Topics read${topics.length ? ' / ' + topics.length : ''}</p>
    </div>
    ${cards}
  `;
}

function renderTopic(topic, relatedQuiz) {
  const sections = (topic.sections || []).map((s, i) => renderSection(s, i)).join('');

  const quizButton = relatedQuiz
    ? `<a href="quiz.html#${encodeURIComponent(relatedQuiz.id)}" class="btn btn-primary">🎯 Practice: Take the quiz →</a>`
    : `<a href="quiz.html" class="btn btn-secondary">Take a quiz →</a>`;

  return `
    <div class="theory-topic">
      <div class="theory-nav">
        <a href="theory.html" class="btn btn-secondary">← All topics</a>
        ${quizButton}
      </div>
      <h1 class="theory-title">${escapeHtml(topic.title)}</h1>
      ${topic.category ? `<span class="badge">${escapeHtml(topic.category)}</span>` : ''}
      <div class="theory-body">${sections}</div>
      <div class="theory-nav">
        <a href="playground.html" class="btn btn-secondary">🐍 Open Playground</a>
      </div>
    </div>
  `;
}

function renderSection(s, i) {
  switch (s.type) {
    case 'heading':
      return `<h2 class="theory-heading">${formatText(escapeHtml(s.text))}</h2>`;
    case 'paragraph':
      return `<p class="theory-paragraph math">${formatText(escapeHtml(s.text))}</p>`;
    case 'formula':
      return `<div class="theory-formula math">${escapeHtml(s.latex)}</div>`;
    case 'code':
      return `
        <div class="code-block">
          <div class="code-header">Python</div>
          <pre><code>${escapeHtml(s.code)}</code></pre>
        </div>`;
    case 'list':
      return `
        <ul class="theory-list">
          ${s.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>`;
    case 'image':
      return `
        <figure class="theory-figure">
          <img class="theory-image" src="${escapeHtml(s.src)}" alt="${escapeHtml(s.alt || '')}">
          ${s.caption ? `<figcaption class="theory-caption">${escapeHtml(s.caption)}</figcaption>` : ''}
        </figure>`;
    case 'animation':
      return `
        <div class="theory-animation">
          ${s.caption ? `<p class="theory-caption">${escapeHtml(s.caption)}</p>` : ''}
          <div class="animation-player" data-animation="${escapeHtml(s.animation)}"></div>
        </div>`;
    default:
      return '';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}

function formatText(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

// Render LaTeX math. Inline math ($...$) works inside paragraphs; the
// "formula" section type renders as display math using its raw LaTeX.
function renderMath(root) {
  if (!root || typeof katex === 'undefined') return;

  // Display formulas.
  root.querySelectorAll('.theory-formula').forEach(el => {
    try {
      el.innerHTML = katex.renderToString(el.textContent, {
        displayMode: true,
        throwOnError: false,
      });
    } catch (e) {
      el.textContent = el.textContent.trim();
    }
  });

  // Inline math inside paragraphs.
  const paragraphs = Array.from(root.querySelectorAll('.theory-paragraph.math'));
  if (paragraphs.length && window.renderMathInElement) {
    paragraphs.forEach(p => {
      try {
        window.renderMathInElement(p, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
          ],
          throwOnError: false,
        });
      } catch (e) { /* leave as-is */ }
    });
  }
}

loadTheory();
