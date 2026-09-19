// Dashboard: unified view of quiz best-scores, theory read status, and
// in-progress attempts, so students can see their overall learning progress.

async function loadDashboard() {
  const area = document.getElementById('dashboardArea');
  try {
    const [quizRes, theoryRes, mdTheoryRes] = await Promise.all([
      fetch('data/quizzes.json'),
      fetch('data/theory.json'),
      fetch('data/theory-md.json'),
    ]);

    const quizzes = quizRes.ok ? ((await quizRes.json()).quizzes || []) : [];

    let topics = [];
    if (theoryRes.ok) topics = (await theoryRes.json()).topics || [];
    if (mdTheoryRes.ok) {
      const mdTopics = (await mdTheoryRes.json()).topics || [];
      const seen = new Set(topics.map(t => t && t.id));
      mdTopics.forEach(t => {
        if (t && t.id && !seen.has(t.id)) { topics.push(t); seen.add(t.id); }
      });
    }

    renderDashboard(quizzes, topics);
  } catch (err) {
    area.innerHTML = '<p class="error-msg">Could not load your dashboard. Make sure you are serving this site over HTTP.</p>';
  }
}

function renderDashboard(quizzes, topics) {
  const area = document.getElementById('dashboardArea');
  const completed = quizzes.filter(q => isQuizCompleted(q.id)).length;
  const readTopics = topics.filter(t => isTheoryRead(t.id)).length;
  const inProgress = listInProgress();

  // ── Overall stats ──────────────────────────────────────────────────────────
  const quizPct = quizzes.length ? Math.round((completed / quizzes.length) * 100) : 0;
  const theoryPct = topics.length ? Math.round((readTopics / topics.length) * 100) : 0;
  const allDone = quizzes.length + topics.length;
  const allRead = completed + readTopics;
  const overallPct = allDone ? Math.round((allRead / allDone) * 100) : 0;

  const statsHtml = `
    <section class="dashboard-stats">
      <div class="stat-card">
        <div class="stat-value">${completed}<span class="stat-sep">/</span>${quizzes.length}</div>
        <div class="stat-label">Quizzes completed</div>
        <div class="stat-bar"><div class="stat-fill" style="width:${quizPct}%"></div></div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${readTopics}<span class="stat-sep">/</span>${topics.length}</div>
        <div class="stat-label">Theory topics read</div>
        <div class="stat-bar"><div class="stat-fill" style="width:${theoryPct}%"></div></div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${allRead}<span class="stat-sep">/</span>${allDone}</div>
        <div class="stat-label">Overall progress</div>
        <div class="stat-bar"><div class="stat-fill accent" style="width:${overallPct}%"></div></div>
      </div>
    </section>
  `;

  // ── In-progress attempts ───────────────────────────────────────────────────
  let inProgressHtml = '';
  const progList = Object.entries(inProgress).filter(([id]) => quizzes.some(q => q.id === id));
  if (progList.length > 0) {
    inProgressHtml = `
      <section class="dash-section">
        <h2 class="dash-title">⏳ In progress — pick up where you left off</h2>
        <div class="dash-list">
          ${progList.map(([id]) => {
            const q = quizzes.find(qq => qq.id === id);
            const answered = Object.keys(inProgress[id].answers).length;
            return `
              <div class="dash-row">
                <div class="dash-row-main">
                  <span class="dash-label">${escapeHtml(q ? q.title : id)}</span>
                  <span class="dash-sub">${answered} / ${(q && q.questions) ? q.questions.length : '?'} answered</span>
                </div>
                <a href="quiz.html#${encodeURIComponent(id)}" class="btn btn-sm btn-primary">Resume →</a>
              </div>`;
          }).join('')}
        </div>
      </section>`;
  }

  // ── Quizzes ────────────────────────────────────────────────────────────────
  const quizRows = quizzes.length
    ? quizzes.map(q => {
        const best = getBest(q.id);
        const startLabel = best !== null ? 'Retake →' : 'Start →';
        const completedBadge = best !== null
          ? `<span class="badge best">🏆 ${best}%</span>`
          : (inProgress[q.id] ? '<span class="badge">⏳ In progress</span>' : '<span class="badge">Not started</span>');
        const cat = q.category || 'General';
        return `
          <div class="dash-row">
            <div class="dash-row-main">
              <span class="dash-label">${escapeHtml(q.title)}</span>
              <span class="dash-sub">${escapeHtml(cat)} · ${(q.questions || []).length} questions</span>
            </div>
            <div class="dash-row-actions">
              ${completedBadge}
              <a href="quiz.html#${encodeURIComponent(q.id)}" class="btn btn-sm btn-primary">${startLabel}</a>
            </div>
          </div>`;
      }).join('')
    : '<p class="empty-state">No quizzes yet. <a href="admin.html">Create one!</a></p>';

  // ── Theory ─────────────────────────────────────────────────────────────────
  const theoryRows = topics.length
    ? topics.map(t => {
        const read = isTheoryRead(t.id);
        const badge = read ? '<span class="badge done">✓ Read</span>' : '<span class="badge">Not read</span>';
        const cat = t.category || 'General';
        return `
          <div class="dash-row">
            <div class="dash-row-main">
              <span class="dash-label">${escapeHtml(t.title)}</span>
              <span class="dash-sub">${escapeHtml(cat)}</span>
            </div>
            <div class="dash-row-actions">
              ${badge}
              <a href="theory.html#${encodeURIComponent(t.id)}" class="btn btn-sm btn-secondary">${read ? 'Read again →' : 'Read →'}</a>
            </div>
          </div>`;
      }).join('')
    : '<p class="empty-state">No theory yet. <a href="admin.html">Create one!</a></p>';

  area.innerHTML = `
    <div class="dash-header">${statsHtml}</div>
    ${inProgressHtml}
    <section class="dash-section">
      <h2 class="dash-title">📝 Quizzes</h2>
      <div class="dash-list">${quizRows}</div>
    </section>
    <section class="dash-section">
      <h2 class="dash-title">📚 Theory</h2>
      <div class="dash-list">${theoryRows}</div>
    </section>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}

loadDashboard();
