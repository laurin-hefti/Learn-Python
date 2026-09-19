// Loads the list of quizzes + related theory from data files and renders the homepage.

async function loadQuizzes() {
    const grid = document.getElementById('quizGrid');
    try {
        const [quizRes, theoryRes] = await Promise.all([
            fetch('data/quizzes.json'),
            fetch('data/theory.json'),
        ]);
        if (!quizRes.ok) throw new Error('Failed to load quizzes');
        const data = await quizRes.json();
        const quizzes = data.quizzes || [];

        let topics = [];
        if (theoryRes.ok) topics = (await theoryRes.json()).topics || [];

        if (quizzes.length === 0) {
            grid.innerHTML = '<p class="empty-state">No quizzes yet. <a href="admin.html">Create one!</a></p>';
            return;
        }

        renderCompletionStats(quizzes.length, countCompletedQuizzes());

        const categories = {};
        quizzes.forEach(q => {
            const cat = q.category || 'General';
            (categories[cat] = categories[cat] || []).push(q);
        });

        grid.innerHTML = Object.entries(categories).map(([cat, list]) => `
            <section class="theory-category">
                <h2 class="theory-cat-title">${escapeHtml(cat)}</h2>
                <div class="quiz-grid">
                    ${list.map(quiz => {
                        const best = getBest(quiz.id);
                        const bestBadge = best !== null ? `<span class="badge best">🏆 Best: ${best}%</span>` : '';
                        const hasTheory = topics.some(t => t.id === quiz.id);
                        const theoryLink = hasTheory
                            ? `<a href="theory.html#${encodeURIComponent(quiz.id)}" class="btn btn-sm btn-secondary">📚 Theory</a>`
                            : '';
                        return `
                            <div class="quiz-card">
                                <div class="quiz-card-body">
                                    <h3>${escapeHtml(quiz.title)}</h3>
                                    <p>${escapeHtml(quiz.description || '')}</p>
                                    <div class="quiz-meta">
                                        <span class="badge">${quiz.questions.length} questions</span>
                                        ${bestBadge}
                                    </div>
                                </div>
                                <div class="quiz-card-actions">
                                    <a href="quiz.html#${encodeURIComponent(quiz.id)}" class="btn btn-primary">Start Quiz →</a>
                                    ${theoryLink}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </section>
        `).join('');
    } catch (err) {
        grid.innerHTML = '<p class="error-msg">Could not load quizzes. Make sure you are serving this site over HTTP (e.g. <code>python -m http.server</code>), not opening the file directly.</p>';
    }
}

// Fill in the completed-quizzes counter on the hero and animate the number up.
function renderCompletionStats(total, completed) {
    const stats = document.getElementById('completionStats');
    if (!stats) return;
    stats.style.display = 'flex';
    document.getElementById('totalQuizzes').textContent = total;

    const fill = document.getElementById('completionFill');
    if (fill) fill.style.width = total > 0 ? `${(completed / total) * 100}%` : '0%';

    const el = document.getElementById('completedCount');
    if (el && completed > 0) animateCountUp(el, completed);
    else if (el) el.textContent = '0';
}

function animateCountUp(el, target, duration = 700) {
    const start = performance.now();
    const from = 0;
    function frame(now) {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(from + (target - from) * eased);
        if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Reset all saved quiz progress and best scores.
function resetAllProgress() {
    if (!confirm('Reset ALL progress?\n\nThis clears every quiz attempt and best score saved on this device. This cannot be undone.')) {
        return;
    }
    const ok = resetAllProgressStorage();
    const status = document.getElementById('resetStatus');
    if (ok) {
        status.textContent = '✅ All progress reset.';
        loadQuizzes();
    } else {
        status.textContent = '⚠️ Could not reset progress.';
    }
}

loadQuizzes();
