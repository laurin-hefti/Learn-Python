// Shared localStorage helpers: quiz progress + best scores.
// All functions are safe no-ops when localStorage is unavailable.

const PROGRESS_PREFIX = 'pymaster-progress-';
const BEST_PREFIX = 'pymaster-best-';
const READ_PREFIX = 'pymaster-read-';

function safeGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
}

function safeRemove(key) {
  try { localStorage.removeItem(key); } catch (e) {}
}

// ── Progress ─────────────────────────────────────────────────────────────────

function saveProgress(quizId, data) {
  safeSet(PROGRESS_PREFIX + quizId, JSON.stringify(data));
}

function loadProgress(quizId) {
  const raw = safeGet(PROGRESS_PREFIX + quizId);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function clearProgress(quizId) {
  safeRemove(PROGRESS_PREFIX + quizId);
}

// ── Best scores ──────────────────────────────────────────────────────────────

function getBest(quizId) {
  const raw = safeGet(BEST_PREFIX + quizId);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function saveBest(quizId, percent) {
  const current = getBest(quizId);
  if (current === null || percent > current) {
    safeSet(BEST_PREFIX + quizId, String(percent));
  }
}

// ── Completed quizzes ────────────────────────────────────────────────────────

// A quiz counts as completed once it has a saved best score.
function isQuizCompleted(quizId) {
  return getBest(quizId) !== null;
}

function countCompletedQuizzes() {
  try {
    return Object.keys(localStorage).filter(k => k.indexOf(BEST_PREFIX) === 0).length;
  } catch (e) {
    return 0;
  }
}

// ── In-progress attempts ─────────────────────────────────────────────────────

// Returns an object mapping quizId -> { current, answers } for every quiz that
// has a saved in-progress attempt, so a dashboard can offer "Resume" links.
function listInProgress() {
  const out = {};
  try {
    Object.keys(localStorage).forEach(k => {
      if (k.indexOf(PROGRESS_PREFIX) !== 0) return;
      const quizId = k.slice(PROGRESS_PREFIX.length);
      const data = loadProgress(quizId);
      if (data && data.answers && Object.keys(data.answers).length > 0) {
        out[quizId] = { current: data.current || 0, answers: data.answers };
      }
    });
  } catch (e) { /* ignore */ }
  return out;
}

// ── Theory completion (read topics) ──────────────────────────────────────────

function markTheoryRead(topicId) {
  if (!topicId) return;
  safeSet(READ_PREFIX + topicId, '1');
}

function isTheoryRead(topicId) {
  return safeGet(READ_PREFIX + topicId) !== null;
}

function countTheoryRead() {
  try {
    return Object.keys(localStorage).filter(k => k.indexOf(READ_PREFIX) === 0).length;
  } catch (e) {
    return 0;
  }
}

// ── Reset all progress ───────────────────────────────────────────────────────

// Clears every saved quiz attempt and best score for all quizzes.
function resetAllProgressStorage() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (k.indexOf(PROGRESS_PREFIX) === 0 || k.indexOf(BEST_PREFIX) === 0 || k.indexOf(READ_PREFIX) === 0) {
        localStorage.removeItem(k);
      }
    });
    return true;
  } catch (e) {
    return false;
  }
}
