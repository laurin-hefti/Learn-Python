let currentQuestion = 0;
let totalQuestions = 0;
let quizData = null;
let questions = [];
let relatedTheory = null;
let shuffleEnabled = false;
const answers = {};
let studentId = null; // stores quiz id for storage keys

// ── Load Quiz (client-side from data/quizzes.json) ───────────────────────────

async function loadQuiz() {
    const area = document.getElementById('quizArea');
    const quizId = decodeURIComponent(window.location.hash.replace('#', ''));
    studentId = quizId;
    try {
        const [quizRes, theoryRes] = await Promise.all([
            fetch('data/quizzes.json'),
            fetch('data/theory.json'),
        ]);
        if (!quizRes.ok) throw new Error('Failed to load');
        const quizDataAll = await quizRes.json();
        quizData = (quizDataAll.quizzes || []).find(q => q.id === quizId);
        if (!quizData) throw new Error('Quiz not found');

        let theoryAll = { topics: [] };
        if (theoryRes.ok) theoryAll = await theoryRes.json();
        relatedTheory = (theoryAll.topics || []).find(t => t.id === quizId) || null;

        totalQuestions = quizData.questions.length;
        questions = quizData.questions;
        shuffleEnabled = quizData.shuffle === true;

        // Shuffle question order + MCQ options on every fresh attempt. If the
        // student is resuming a saved attempt, keep the original order so the
        // saved answers still map to the right questions.
        shuffleForFreshAttempt();

        document.title = `${quizData.title} - Python Quiz Master`;
        area.innerHTML = renderQuizHTML(quizData);
        renderMath();
        highlightCodeBlocks(area);
        initQuiz();
        maybeShowResumeBanner();
    } catch (err) {
        area.innerHTML = `<p class="error-msg">Could not load quiz. <a href="index.html">Back to quizzes</a></p>`;
    }
}

// Fisher–Yates shuffle returning a new array (does not mutate input).
function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Reorder questions (and their MCQ options) for a brand-new attempt. Only runs
// when shuffling is enabled AND there is no saved in-progress attempt, so
// resuming an existing attempt keeps the original order intact.
function shuffleForFreshAttempt() {
    const saved = studentId ? loadProgress(studentId) : null;
    const hasProgress = saved && saved.answers && Object.keys(saved.answers).length > 0;
    if (!shuffleEnabled || hasProgress) return;

    const order = shuffleArray(questions.map((_, i) => i));
    questions = order.map(i => questions[i]);

    // Shuffle the option list of each multiple-choice question.
    questions.forEach(q => {
        if (q && q.type === 'mc' && Array.isArray(q.options)) {
            q.options = shuffleArray(q.options);
        }
    });
}

function renderQuizHTML(quiz) {
    const relatedLink = relatedTheory
        ? `<a class="related-link" href="theory.html#${encodeURIComponent(relatedTheory.id)}">📚 Read related theory: ${escapeHtml(relatedTheory.title)} →</a>`
        : '';

    const header = `
        <div class="quiz-header">
            <h1>${escapeHtml(quiz.title)}</h1>
            <p>${escapeHtml(quiz.description || '')}</p>
            ${relatedLink}
            <div class="quiz-progress"><div class="progress-bar" id="progressBar"></div></div>
            <p class="progress-text" id="progressText">1 / ${questions.length}</p>
        </div>
        <div id="quizContainer">
    `;

    const cards = questions.map((q, i) => {
        let answerArea = '';

        if (q.type === 'mc') {
            answerArea = `
                <div class="options-list">
                    ${q.options.map(opt => `
                        <label class="option">
                            <input type="radio" name="q${i}" value="${escapeHtml(opt)}" class="answer-input" data-q="${i}">
                            <span class="option-text">${escapeHtml(opt)}</span>
                        </label>`).join('')}
                </div>`;
        } else if (q.type === 'tf') {
            answerArea = `
                <div class="options-list">
                    <label class="option">
                        <input type="radio" name="q${i}" value="true" class="answer-input" data-q="${i}">
                        <span class="option-text">True</span>
                    </label>
                    <label class="option">
                        <input type="radio" name="q${i}" value="false" class="answer-input" data-q="${i}">
                        <span class="option-text">False</span>
                    </label>
                </div>`;
        } else if (q.type === 'fill' || q.type === 'code_predict') {
            // Multi-line free-text answer: graded line-by-line (leading/trailing
            // whitespace and extra blank lines don't matter), so multi-line
            // snippets and outputs can be entered and still match.
            answerArea = `
                <div class="code-output-area">
                    <textarea class="fill-input answer-input" data-q="${i}" rows="${q.rows || (q.type === 'code_predict' ? 4 : 2)}" spellcheck="false" placeholder="Type your answer...">${escapeHtml(q.starter || '')}</textarea>
                </div>`;
        } else if (q.type === 'code_contains') {
            // The student writes a snippet which must contain the required
            // lines/snippets. The required lines are grading criteria and are
            // NOT shown here (they would spoil the question) — they appear in
            // the results/explanation after grading.
            answerArea = `
                <div class="code-output-area">
                    <label class="big-answer-label">Write your code snippet:</label>
                    <textarea class="code-input answer-input" data-q="${i}" rows="${q.rows || 6}" spellcheck="false" placeholder="Type your code...">${escapeHtml(q.starter || '')}</textarea>
                    <div class="code-output-hint">Your answer must contain the required line(s) — extra lines are fine.</div>
                    ${q.minMatches != null && q.minMatches > 0
                        ? `<div class="code-output-hint">At least ${q.minMatches} of the required lines/snippets must match.</div>`
                        : ''}
                </div>`;
        } else if (q.type === 'code_output') {
            answerArea = `
                <div class="code-output-area">
                    <label class="big-answer-label">Write your Python code below:</label>
                    <textarea class="code-input answer-input" data-q="${i}" rows="8" spellcheck="false" placeholder="print('Hello, world!')">${escapeHtml(q.starter || '')}</textarea>
                    <div class="code-output-hint">Your code is graded by comparing its output to the expected result (exact code doesn't matter).</div>
                </div>`;
        } else if (q.type === 'big') {
            answerArea = (q.answers || []).map((a, p) => `
                <div class="big-answer-field">
                    <label class="big-answer-label">${escapeHtml(a.label || ('Answer ' + (p + 1)))}</label>
                    <input type="text" class="fill-input answer-input" data-q="${i}" data-part="${p}" placeholder="Type your answer...">
                </div>`).join('');
        }

        const codeBlock = q.code
            ? `<div class="code-block"><div class="code-header">Python Code</div><pre><code>${escapeHtml(q.code)}</code></pre></div>`
            : '';

        const imageBlock = q.image
            ? `<img class="question-image" src="${escapeHtml(q.image)}" alt="${escapeHtml(q.text || 'Question image')}">`
            : '';

        const textHtml = q.type === 'big'
            ? `<div class="question-text">${sanitizeHtml(q.text)}</div>`
            : `<h2 class="question-text">${escapeHtml(q.text)}</h2>`;

        const sectionsHtml = renderQuestionSections(q);

        return `
            <div class="question-card" data-index="${i}" style="display:none;">
                <div class="question-number">Question ${i + 1} of ${questions.length}</div>
                ${textHtml}
                ${imageBlock}
                ${codeBlock}
                ${sectionsHtml}
                <div class="answer-area">${answerArea}</div>
            </div>`;
    }).join('');

    return header + cards + `</div>
        <div class="quiz-nav-buttons">
            <button id="prevBtn" class="btn btn-secondary" onclick="prevQuestion()" style="visibility:hidden;">← Previous</button>
            <span id="navSpacer"></span>
            <button id="nextBtn" class="btn btn-primary" onclick="nextQuestion()">Next →</button>
            <button id="submitBtn" class="btn btn-success" style="display:none;" onclick="submitQuiz()">Submit Quiz ✓</button>
        </div>`;
}

function initQuiz() {
    showQuestion(0);
    buildNavigator();
    document.querySelectorAll('input[type="text"].fill-input').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); nextQuestion(); }
        });
    });
    document.addEventListener('change', onAnswerChange);
}

// ── Answer handling & progress ───────────────────────────────────────────────

function onAnswerChange(e) {
    const el = e.target;
    if (!el.classList.contains('answer-input')) return;
    const idx = el.getAttribute('data-q');
    const part = el.getAttribute('data-part');
    if (el.type === 'radio') {
        if (el.checked) { answers[idx] = el.value; updateNavigator(); autosave(); }
    } else if ((el.type === 'text' || el.tagName === 'TEXTAREA') && part !== null) {
        if (!answers[idx] || typeof answers[idx] !== 'object') answers[idx] = {};
        answers[idx][part] = el.value;
        updateNavigator();
        autosave();
    } else if (el.type === 'text' || el.tagName === 'TEXTAREA') {
        answers[idx] = el.value;
        updateNavigator();
        autosave();
    }
}

function autosave() {
    if (studentId) saveProgress(studentId, { current: currentQuestion, answers: answers });
}

// ── Question Navigator ───────────────────────────────────────────────────────

function buildNavigator() {
    const grid = document.getElementById('navGrid');
    const total = document.getElementById('navTotal');
    const answered = document.getElementById('navAnswered');
    if (!grid || !total) return;
    total.textContent = totalQuestions;

    grid.innerHTML = questions.map((_, i) => `
        <button class="nav-btn" data-nav="${i}" onclick="jumpToQuestion(${i})">${i + 1}</button>
    `).join('');

    updateNavigator();
}

function isAnswered(i) {
    const v = answers[i];
    if (v === undefined) return false;
    if (typeof v === 'object') {
        const q = questions[i];
        const n = q && q.type === 'big' && q.answers ? q.answers.length : 0;
        if (n === 0) return false;
        return q.answers.every((_, p) => String(v[p] || '').trim() !== '');
    }
    return String(v).trim() !== '';
}

function answeredCount() {
    return questions.reduce((n, _, i) => n + (isAnswered(i) ? 1 : 0), 0);
}

function updateNavigator() {
    const navBtns = document.querySelectorAll('#navGrid .nav-btn');
    const answered = document.getElementById('navAnswered');
    if (answered) answered.textContent = answeredCount();
    navBtns.forEach(btn => {
        const i = Number(btn.getAttribute('data-nav'));
        btn.classList.toggle('answered', isAnswered(i));
        btn.classList.toggle('current', i === currentQuestion);
    });
}

function jumpToQuestion(i) {
    if (i >= 0 && i < totalQuestions) {
        currentQuestion = i;
        showQuestion(i);
        updateNavigator();
        toggleNavigator(false);
        autosave();
    }
}

function toggleNavigator(force) {
    const nav = document.getElementById('navigator');
    const overlay = document.getElementById('navOverlay');
    const open = force !== undefined ? force : !nav.classList.contains('open');
    nav.classList.toggle('open', open);
    overlay.style.display = open ? 'block' : 'none';
}

// ── Quiz Navigation ──────────────────────────────────────────────────────────

function showQuestion(idx) {
    document.querySelectorAll('.question-card').forEach((card, i) => {
        card.style.display = i === idx ? 'block' : 'none';
    });
    const pct = ((idx + 1) / totalQuestions) * 100;
    document.getElementById('progressBar').style.width = pct + '%';
    document.getElementById('progressText').textContent = `${idx + 1} / ${totalQuestions}`;
    document.getElementById('prevBtn').style.visibility = idx === 0 ? 'hidden' : 'visible';
    document.getElementById('nextBtn').style.display = idx === totalQuestions - 1 ? 'none' : 'inline-block';
    document.getElementById('submitBtn').style.display = idx === totalQuestions - 1 ? 'inline-block' : 'none';
    updateNavigator();
}

function nextQuestion() {
    if (currentQuestion < totalQuestions - 1) {
        currentQuestion++;
        showQuestion(currentQuestion);
        autosave();
    }
}

function prevQuestion() {
    if (currentQuestion > 0) {
        currentQuestion--;
        showQuestion(currentQuestion);
        autosave();
    }
}

// ── Resume / Restart ─────────────────────────────────────────────────────────

function maybeShowResumeBanner() {
    const saved = loadProgress(studentId);
    if (saved && saved.answers && Object.keys(saved.answers).length > 0) {
        document.getElementById('resumeBanner').style.display = 'block';
    }
}

function resumeAttempt() {
    const saved = loadProgress(studentId);
    document.getElementById('resumeBanner').style.display = 'none';
    if (!saved) return;
    Object.assign(answers, saved.answers || {});
    // Reflect answers into the DOM
    Object.entries(saved.answers || {}).forEach(([i, val]) => {
        const inputs = document.querySelectorAll(`[data-q="${i}"]`);
        inputs.forEach(inp => {
            const isTextLike = inp.type === 'text' || inp.tagName === 'TEXTAREA';
            if (inp.type === 'radio') { inp.checked = inp.value === val; }
            else if (isTextLike && typeof val === 'object') {
                const part = inp.getAttribute('data-part');
                if (part !== null) inp.value = val[part] || '';
            }
            else if (isTextLike) { inp.value = val; }
        });
    });
    const target = (typeof saved.current === 'number' && saved.current >= 0 && saved.current < totalQuestions)
        ? saved.current : 0;
    currentQuestion = target;
    showQuestion(target);
    updateNavigator();
}

function restartAttempt() {
    document.getElementById('resumeBanner').style.display = 'none';
    clearProgress(studentId);
    // Reload so a fresh attempt is generated — for shuffled quizzes this
    // produces a new question/option order; for others it simply resets.
    window.location.reload();
}

// ── Quiz Grading (client-side) ───────────────────────────────────────────────

function submitQuiz() {
    const skipped = questions.map((_, i) => i).filter(i => !isAnswered(i));
    if (skipped.length > 0) {
        showReviewModal(skipped);
        return;
    }
    grade();
}

function showReviewModal(skipped) {
    document.getElementById('skippedCount').textContent = skipped.length;
    const list = document.getElementById('skippedList');
    list.innerHTML = skipped.map(i => `
        <button class="skipped-chip" onclick="jumpToSkipped()">Question ${i + 1}</button>
    `).join('') || '<p class="empty-state">None</p>';
    document.getElementById('reviewModal').style.display = 'flex';
}

function jumpToSkipped() {
    const skipped = questions.map((_, i) => i).filter(i => !isAnswered(i));
    if (skipped.length > 0) {
        document.getElementById('reviewModal').style.display = 'none';
        jumpToQuestion(skipped[0]);
        toggleNavigator(true);
    }
}

function forceSubmit() {
    document.getElementById('reviewModal').style.display = 'none';
    grade();
}

// Normalize output for comparison: ignore leading/trailing whitespace per line,
// drop fully blank lines, and ignore case. So paste-exact code is NOT required.
function normalizeOutput(text) {
    return String(text == null ? '' : text)
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n')
        .toLowerCase();
}

// Same normalization as normalizeOutput but for free-text answers & required
// snippets. Used so that multi-line answers slice correctly and whitespace/
// casing does not cause false negatives.
function normalizeMultiLine(text) {
    return normalizeOutput(text);
}

// Run student code in Pyodide and capture stdout (+ stderr for visible errors).
async function runCodeAndCapture(code) {
    const py = await getPyodide();
    let out = '';
    py.setStdout({ batched: (text) => { out += text + '\n'; } });
    py.setStderr({ batched: (text) => { out += '[Error] ' + text + '\n'; } });
    await py.runPythonAsync(code);
    return out;
}

function grade() {
    const results = [];
    const codeIdx = [];
    const codeSource = [];
    let score = 0;

    questions.forEach((q, i) => {
        let isCorrect = false;
        let userAnswer = (answers[i] || '').toString().trim();
        let correctAnswer;

        if (q.type === 'big') {
            const given = (typeof answers[i] === 'object' && answers[i]) || {};
            userAnswer = (q.answers || []).map((a, p) => `${a.label || (p + 1)}: ${given[p] || ''}`).join('; ');
            correctAnswer = (q.answers || []).map(a => `${a.label || ''}: ${a.value}`).join('; ');
            isCorrect = (q.answers || []).every((a, p) =>
                String(given[p] || '').trim().toLowerCase() === String(a.value).trim().toLowerCase());
        } else if (q.type === 'code_output') {
            // Graded asynchronously below after running the code.
            codeIdx.push(i);
            codeSource.push((answers[i] || '').toString());
            correctAnswer = q.expected;
        } else if (q.type === 'code_contains') {
            // Contains-grading: the submitted snippet must include each required
            // line/snippet (after line normalization). By default every required
            // snippet must be present; `minMatches` lowers that threshold.
            userAnswer = (answers[i] || '').toString().trim();
            const submitted = normalizeMultiLine(answers[i]);
            const required = (q.required || []).map(r => normalizeMultiLine(r)).filter(r => r.length > 0);
            const minMatches = (typeof q.minMatches === 'number' && q.minMatches > 0)
                ? q.minMatches
                : required.length;
            const matched = required.filter(r => submitted.includes(r)).length;
            isCorrect = required.length > 0 && matched >= minMatches;
            correctAnswer = (q.required || []).join('  —  ');
        } else if (q.type === 'fill' || q.type === 'code_predict') {
            userAnswer = (answers[i] || '').toString().trim();
            // Multi-line tolerant comparison: trim each line, drop blank lines,
            // ignore case — so line-splitting and whitespace don't cause false fails.
            const correct = q.answer.toString();
            isCorrect = q.answer !== undefined && normalizeMultiLine(userAnswer) === normalizeMultiLine(correct);
            correctAnswer = q.answer;
        } else {
            userAnswer = (answers[i] || '').toString().trim();
            const correct = q.answer.toString().trim().toLowerCase();
            isCorrect = userAnswer.toString().trim().toLowerCase() === correct;
            correctAnswer = q.answer;
        }

        if (isCorrect) score++;
        results[i] = { question: q, index: i, correct: isCorrect, correct_answer: correctAnswer, actual_output: null, user_answer: q.type === 'code_contains' ? (answers[i] || '').toString() : undefined };
    });

    if (codeIdx.length === 0) {
        finishGrading(score, results);
    } else {
        gradeCodeQuestions(codeIdx, codeSource, results, score);
    }
}

function finishGrading(score, results) {
    const total = totalQuestions;
    const pct = Math.round((score / total) * 100);
    if (studentId) {
        saveBest(studentId, pct);
        clearProgress(studentId);
    }
    const data = { score, total, pct, results };
    showResults(data);
    return data;
}

async function gradeCodeQuestions(codeIdx, codeSource, results, startScore = 0) {
    let score = startScore;
    const finalResults = results.slice();

    for (let k = 0; k < codeIdx.length; k++) {
        const i = codeIdx[k];
        const source = codeSource[k];
        const q = results[i].question;
        let isCorrect = false;
        let actual = '';
        try {
            actual = await runCodeAndCapture(source);
            const actualNorm = normalizeOutput(actual);
            const expectedNorm = normalizeOutput(q.expected);
            isCorrect = source.trim() !== '' && actualNorm === expectedNorm;
        } catch (e) {
            actual = '[Error] ' + (e && e.message ? e.message : String(e));
        }
        finalResults[i] = Object.assign({}, results[i], {
            correct: isCorrect,
            actual_output: actual.trim(),
        });
        if (isCorrect) score++;
    }

    finishGrading(score, finalResults);
}

// Confetti celebration shown when a quiz is completed with 100%.
function celebrate() {
    const colors = ['#4f8cff', '#22c55e', '#ef4444', '#f59e0b', '#a855f7', '#ec4899'];
    const pieces = 70;
    for (let i = 0; i < pieces; i++) {
        const p = document.createElement('div');
        p.className = 'confetti';
        p.style.left = (Math.random() * 100) + 'vw';
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.width = (6 + Math.random() * 6) + 'px';
        p.style.height = (10 + Math.random() * 8) + 'px';
        p.style.animationDuration = (1.6 + Math.random() * 1.4) + 's';
        p.style.animationDelay = (Math.random() * 0.5) + 's';
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 4200);
    }
}

function showResults(data) {
    document.getElementById('resultsModal').style.display = 'flex';
    document.getElementById('scoreText').textContent = `${data.score} / ${data.total}`;
    document.getElementById('scorePercent').textContent = `${data.pct}%`;
    const best = studentId ? getBest(studentId) : null;
    const bestEl = document.getElementById('scoreBest');
    bestEl.textContent = best !== null ? `🏆 Best: ${best}%` : '';
    const completedEl = document.getElementById('scoreCompleted');
    if (completedEl) {
      const n = countCompletedQuizzes();
      completedEl.textContent = n === 1 ? '📚 1 quiz completed' : `📚 ${n} quizzes completed`;
    }
    const perfect = data.pct === 100;
    document.getElementById('resultTitle').textContent =
        perfect ? '🎉 Perfect score!' : data.pct >= 80 ? '🎉 Excellent!' : data.pct >= 50 ? '👍 Good effort!' : '📚 Keep practicing!';

    if (perfect) celebrate();

    if (perfect) {
        const pop = document.createElement('div');
        pop.className = 'score-perfect-pop';
        pop.textContent = '🏆';
        const display = document.querySelector('#resultsModal .score-display');
        if (display) display.insertBefore(pop, display.firstChild);
    }

    const details = document.getElementById('resultDetails');
    details.innerHTML = '';

    data.results.forEach(r => {
        const icon = r.correct ? '✅' : '❌';
        const box = document.createElement('div');
        box.className = `result-item ${r.correct ? 'correct' : 'wrong'}`;
        const isCode = r.question.type === 'code_output';
        const isContains = r.question.type === 'code_contains';
        const extra = isCode
            ? `
                <div class="result-exp">💡 Your output: <pre class="result-code${errorOutput(r.actual_output) ? ' error-output' : ''}">${escapeHtml(r.actual_output || '(none)')}</pre></div>
                <div class="result-exp">🎯 Expected output: <pre class="result-code">${escapeHtml(r.correct_answer)}</pre></div>
              `
            : isContains
            ? `
                <div class="result-exp">🔍 Required: <pre class="result-code">${escapeHtml((r.question.required || []).join('\n'))}</pre></div>
                <div class="result-exp">✍️ Your answer: <pre class="result-code">${escapeHtml(r.question.type === 'code_contains' && typeof r.user_answer === 'string' ? r.user_answer : '')}</pre></div>
              `
            : '';
        box.innerHTML = `
            <div class="result-q"><strong>${icon} Q${r.index + 1}:</strong> ${escapeHtml(r.question.text)}</div>
            ${(!r.correct && !isCode && !isContains) ? `<div class="result-ans">Correct answer: <strong>${escapeHtml(r.correct_answer)}</strong></div>` : ''}
            ${extra}
            ${r.question.explanation ? `<div class="result-exp">💡 ${escapeHtml(r.question.explanation)}</div>` : ''}
        `;
        details.appendChild(box);
    });
    renderMath();
}

// Close modals / navigator on backdrop click / escape
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        if (typeof toggleNavigator === 'function') toggleNavigator(false);
    }
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

function errorOutput(text) {
    return /^\[Error\]/.test(text == null ? '' : String(text));
}

// Render rich content sections inside questions (text, code, formula, list, image).
function renderQuestionSections(q) {
    if (!Array.isArray(q.sections) || q.sections.length === 0) return '';
    return q.sections.map(sec => {
        if (sec.type === 'text') {
            return `<div class="q-section q-section-text">${sanitizeHtml(sec.text || '')}</div>`;
        } else if (sec.type === 'code') {
            return `<div class="code-block"><div class="code-header">${escapeHtml(sec.label || 'Python Code')}</div><pre><code>${escapeHtml(sec.code || '')}</code></pre></div>`;
        } else if (sec.type === 'formula') {
            return `<div class="q-section q-section-formula" data-formula="${escapeHtml(sec.latex || '')}">$$${escapeHtml(sec.latex || '')}$$</div>`;
        } else if (sec.type === 'list') {
            const items = (sec.items || []).map(item => `<li>${sanitizeHtml(item)}</li>`).join('');
            return `<ul class="q-section q-section-list">${items}</ul>`;
        } else if (sec.type === 'image') {
            return `<div class="q-section q-section-image"><img src="${escapeHtml(sec.src || '')}" alt="${escapeHtml(sec.caption || '')}">${sec.caption ? `<div class="q-section-caption">${escapeHtml(sec.caption)}</div>` : ''}</div>`;
        }
        return '';
    }).join('');
}

// Render LaTeX math in question text using KaTeX (bundled locally).
function renderMath() {
    if (typeof window.renderMathInElement === 'undefined') return;
    document.querySelectorAll('.question-text, .result-q, .q-section-formula').forEach(el => {
        try {
            window.renderMathInElement(el, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                ],
                throwOnError: false,
            });
        } catch (e) { /* leave as-is */ }
    });
}

// Render author-provided HTML (formulas, images) for "big" questions while
// stripping anything that could execute scripts.
function sanitizeHtml(text) {
    return String(text == null ? '' : text)
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
        .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
        .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
        .replace(/href\s*=\s*"javascript:[^"]*"/gi, '')
        .replace(/href\s*=\s*'javascript:[^']*'/gi, '');
}

loadQuiz();
