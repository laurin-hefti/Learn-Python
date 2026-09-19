// Admin page: quiz builder + theory builder, both export JSON.

let questionCount = 0;
let sectionCount = 0;

const types = [
  ['mc', 'Multiple Choice'],
  ['tf', 'True / False'],
  ['fill', 'Fill in the Blank'],
  ['code_predict', 'Code Output Prediction'],
  ['code_contains', 'Code (Must Contain Lines)'],
  ['code_output', 'Write Code (Output Graded)'],
  ['big', 'Big Question'],
];

const sectionTypes = [
  ['heading', 'Heading'],
  ['paragraph', 'Paragraph'],
  ['formula', 'Formula (LaTeX)'],
  ['code', 'Code Block'],
  ['list', 'List'],
  ['image', 'Image'],
  ['animation', 'Animation'],
];

// ── Tab switching ────────────────────────────────────────────────────────────

function switchTab(tab) {
  const panels = { quiz: 'tabQuiz', theory: 'tabTheory', mdtheory: 'tabMdTheory' };
  const btns = { quiz: 'tabQuizBtn', theory: 'tabTheoryBtn', mdtheory: 'tabMdTheoryBtn' };
  Object.keys(panels).forEach(key => {
    document.getElementById(panels[key]).style.display = tab === key ? 'block' : 'none';
    document.getElementById(btns[key]).classList.toggle('active', tab === key);
  });
  // Resize any textareas in the now-visible panel (repairs fields that were
  // collapsed while their panel was hidden, e.g. by autoGrow).
  const panel = document.getElementById(panels[tab]);
  if (panel) panel.querySelectorAll('textarea').forEach(el => autoGrow(el));
}

// ── Quiz builder ─────────────────────────────────────────────────────────────

function addQuestion(type = 'mc') {
  const container = document.getElementById('questionsContainer');
  const div = document.createElement('div');
  div.className = 'question-builder';
  div.id = `qb_${questionCount}`;

  let optionsHtml = '';
  if (type === 'mc') {
    optionsHtml = `
      <div class="form-group" id="options_group_${questionCount}">
        <label>Options</label>
        ${[0,1,2,3].map((j, idx) => `
          <input type="text" name="q_${questionCount}_opt_${j}" placeholder="Option ${String.fromCharCode(65+idx)}" class="option-input">
        `).join('')}
      </div>`;
  }

  let bigHtml = '';
  if (type === 'big') {
    bigHtml = bigAreaContents(questionCount);
  }

  div.innerHTML = `
    <div class="question-builder-header">
      <span class="q-number">Question ${questionCount + 1}</span>
      <button type="button" class="btn btn-sm btn-danger" onclick="removeQuestion(${questionCount})">Remove</button>
    </div>
    <div class="form-group">
      <label>Type</label>
      <select name="q_${questionCount}_type" onchange="changeType(${questionCount}, this.value)">
        ${types.map(([v, l]) => `<option value="${v}" ${v === type ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Question Text *</label>
      <textarea name="q_${questionCount}_text" rows="2" placeholder="Enter your question..."></textarea>
    </div>
    <div id="options_area_${questionCount}">${optionsHtml}</div>
    <div id="big_area_${questionCount}" class="big-area">${bigHtml}</div>
    <div class="form-group" id="code_area_${questionCount}" style="display:${type === 'code_predict' ? 'block' : 'none'}">
      <label>Code Snippet</label>
      <textarea name="q_${questionCount}_code" rows="4" placeholder="Enter the Python code shown with this question..." class="code-textarea"></textarea>
    </div>
    <div id="code_contains_area_${questionCount}" class="code-output-area" style="display:${type === 'code_contains' ? 'block' : 'none'}">
      <div class="form-group">
        <label>Required Lines / Snippets *</label>
        <textarea name="q_${questionCount}_required" rows="4" placeholder="One required line/snippet per line. Every line must appear in the student's answer (unless a minimum is set below)." class="code-textarea"></textarea>
      </div>
      <div class="form-group">
        <label>Min matching lines (optional, default = all required)</label>
        <input type="number" name="q_${questionCount}_minmatches" min="1" placeholder="e.g. 2">
      </div>
      <div class="form-group">
        <label>Starter Code (optional)</label>
        <textarea name="q_${questionCount}_contains_starter" rows="3" placeholder="Code the student starts with (optional)..." class="code-textarea"></textarea>
      </div>
    </div>
    <div id="code_output_area_${questionCount}" class="code-output-area" style="display:${type === 'code_output' ? 'block' : 'none'}">
      <div class="form-group">
        <label>Starter Code (optional)</label>
        <textarea name="q_${questionCount}_starter" rows="4" placeholder="Code the student starts with (they edit/finish it)..." class="code-textarea"></textarea>
      </div>
      <div class="form-group">
        <label>Expected Output *</label>
        <textarea name="q_${questionCount}_expected" rows="3" placeholder="The exact printed output the student's code must produce..."></textarea>
      </div>
    </div>
    <div class="form-group">
      <label>Correct Answer *</label>
      <input type="text" name="q_${questionCount}_correct" id="correct_${questionCount}"
        placeholder="For MC, enter the exact option text; for TF enter 'true' or 'false'">
    </div>
    <div class="form-group">
      <label>Explanation (optional)</label>
      <textarea name="q_${questionCount}_explanation" rows="2" placeholder="Shown after answering..."></textarea>
    </div>
    <div class="form-group">
      <label>Additional Content Sections (optional — text, code, formula, list, image)</label>
      <div class="form-group">
        <button type="button" class="btn btn-sm btn-secondary" onclick="addQuestionSection(${questionCount}, 'text')">+ Text</button>
        <button type="button" class="btn btn-sm btn-secondary" onclick="addQuestionSection(${questionCount}, 'code')">+ Code</button>
        <button type="button" class="btn btn-sm btn-secondary" onclick="addQuestionSection(${questionCount}, 'formula')">+ Formula</button>
        <button type="button" class="btn btn-sm btn-secondary" onclick="addQuestionSection(${questionCount}, 'list')">+ List</button>
        <button type="button" class="btn btn-sm btn-secondary" onclick="addQuestionSection(${questionCount}, 'image')">+ Image</button>
      </div>
      <div id="q_sections_${questionCount}" class="q-sections-area"></div>
    </div>
  `;

  container.appendChild(div);
  questionCount++;
}

function removeQuestion(idx) {
  const el = document.getElementById(`qb_${idx}`);
  if (el) el.remove();
}

function changeType(idx, type) {
  const optsArea = document.getElementById(`options_area_${idx}`);
  const codeArea = document.getElementById(`code_area_${idx}`);
  const correct = document.getElementById(`correct_${idx}`);

  if (type === 'mc') {
    optsArea.innerHTML = `
      <div class="form-group">
        <label>Options</label>
        ${[0,1,2,3].map((j, jidx) =>
          `<input type="text" name="q_${idx}_opt_${j}" placeholder="Option ${String.fromCharCode(65+jidx)}" class="option-input">`
        ).join('')}
      </div>`;
    optsArea.style.display = 'block';
    correct.placeholder = "Enter the exact option text";
  } else {
    optsArea.innerHTML = '';
    optsArea.style.display = 'none';
    correct.placeholder = type === 'tf' ? "Enter 'true' or 'false'" : "Enter the exact answer";
  }
  codeArea.style.display = type === 'code_predict' ? 'block' : 'none';

  const codeOutputArea = document.getElementById(`code_output_area_${idx}`);
  if (codeOutputArea) codeOutputArea.style.display = type === 'code_output' ? 'block' : 'none';

  const codeContainsArea = document.getElementById(`code_contains_area_${idx}`);
  if (codeContainsArea) codeContainsArea.style.display = type === 'code_contains' ? 'block' : 'none';

  const bigArea = document.getElementById(`big_area_${idx}`);
  if (bigArea) {
    const hasBig = type === 'big';
    bigArea.style.display = hasBig ? 'block' : 'none';
    if (hasBig && bigArea.innerHTML.trim() === '') {
      bigArea.innerHTML = bigAreaContents(idx);
    }
  }

  const correctGroup = correct && correct.closest('.form-group');
  if (correctGroup) correctGroup.style.display = (type === 'big' || type === 'code_output' || type === 'code_contains') ? 'none' : 'block';
}

let bigCounter = 0;

function bigAreaContents(qIdx) {
  return `
    <div class="form-group">
      <label>Image URL (optional)</label>
      <input type="text" name="q_${qIdx}_image" placeholder="e.g. images/equation.png">
    </div>
    <div class="form-group">
      <label>Question Text supports HTML — use &lt;img&gt; or math / formulas directly.</label>
    </div>
    <div class="form-group">
      <label>Answer Sections (all must be answered correctly to score)</label>
      <div id="big_answers_${qIdx}" class="big-answers">
        ${[0,1].map(j => bigAnswerRow(qIdx, j)).join('')}
      </div>
      <button type="button" class="btn btn-sm btn-secondary" onclick="addBigAnswer(${qIdx})">+ Add answer section</button>
    </div>`;
}

function bigAnswerRow(qIdx, aIdx) {
  return `
    <div class="big-answer-row" id="big_row_${qIdx}_${aIdx}">
      <input type="text" name="q_${qIdx}_big_label_${aIdx}" class="big-label" placeholder="Label (e.g. x₁)">
      <input type="text" name="q_${qIdx}_big_value_${aIdx}" class="big-value" placeholder="Correct value">
      <button type="button" class="btn btn-sm btn-danger" onclick="removeBigAnswer(${qIdx}, ${aIdx})">×</button>
    </div>`;
}

function addBigAnswer(qIdx) {
  const container = document.getElementById(`big_answers_${qIdx}`);
  const n = container.children.length;
  container.insertAdjacentHTML('beforeend', bigAnswerRow(qIdx, n));
}

function removeBigAnswer(qIdx, aIdx) {
  const row = document.getElementById(`big_row_${qIdx}_${aIdx}`);
  if (row) row.remove();
}

// ── Question content sections (text, code, formula, list, image) ─────────────

let questionSectionCounter = 0;

function addQuestionSection(qIdx, type = 'text') {
  const container = document.getElementById(`q_sections_${qIdx}`);
  if (!container) return;
  const idx = questionSectionCounter++;
  const id = `qs_${qIdx}_${idx}`;

  const typeLabel = {
    text: 'Text Section',
    code: 'Code Section',
    formula: 'Formula Section',
    list: 'List Section',
    image: 'Image Section',
  }[type];

  container.insertAdjacentHTML('beforeend', `
    <div class="q-section-builder" id="${id}" data-qstype="${type}">
      <div class="q-section-builder-header">
        <span class="q-section-type">${typeLabel}</span>
        <button type="button" class="btn btn-sm btn-danger" onclick="removeQuestionSection('${id}')">×</button>
      </div>
      <div class="form-group" data-field="text" style="display:${type === 'text' ? 'block' : 'none'}">
        <label>Text *</label>
        <textarea name="qs_${qIdx}_text_${idx}" rows="3" placeholder="Section text (supports HTML, $...$ math)..."></textarea>
      </div>
      <div class="form-group" data-field="code" style="display:${type === 'code' ? 'block' : 'none'}">
        <label>Code *</label>
        <textarea name="qs_${qIdx}_code_${idx}" rows="4" placeholder="Python code..." class="code-textarea"></textarea>
      </div>
      <div class="form-group" data-field="formula" style="display:${type === 'formula' ? 'block' : 'none'}">
        <label>Formula (LaTeX) *</label>
        <textarea name="qs_${qIdx}_latex_${idx}" rows="2" placeholder="e.g. x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"></textarea>
      </div>
      <div class="form-group" data-field="list" style="display:${type === 'list' ? 'block' : 'none'}">
        <label>List Items (one per line) *</label>
        <textarea name="qs_${qIdx}_items_${idx}" rows="4" placeholder="item one&#10;item two&#10;item three"></textarea>
      </div>
      <div class="form-group" data-field="image" style="display:${type === 'image' ? 'block' : 'none'}">
        <label>Image URL *</label>
        <input type="text" name="qs_${qIdx}_src_${idx}" placeholder="e.g. images/diagram.png">
        <label style="margin-top:10px">Caption (optional)</label>
        <input type="text" name="qs_${qIdx}_caption_${idx}" placeholder="Short description shown under the image">
      </div>
    </div>
  `);

  const el = document.getElementById(id);
  el.querySelectorAll('textarea').forEach(ta => autoGrow(ta));
}

function removeQuestionSection(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function buildQuizObject() {
  const id = document.getElementById('quizId').value.trim();
  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const category = document.getElementById('quizCategory').value.trim();
  const shuffle = document.getElementById('quizShuffle').checked;

  if (!id) throw new Error('Please provide a quiz ID.');
  if (!title) throw new Error('Please provide a quiz title.');

  const questions = [];
  const builders = document.querySelectorAll('#tabQuiz .question-builder');

  builders.forEach((b) => {
    const typeEl = b.querySelector('select[name$="_type"]');
    if (!typeEl) return;
    const type = typeEl.value;
    const text = b.querySelector('textarea[name$="_text"]').value.trim();
    const correct = b.querySelector('input[name$="_correct"]').value.trim();
    const explanation = b.querySelector('textarea[name$="_explanation"]').value.trim();
    const code = b.querySelector('textarea[name$="_code"]');

    if (!text) throw new Error('Every question needs text.');
    if (type !== 'big' && type !== 'code_output' && type !== 'code_contains' && !correct) throw new Error('Every question needs a correct answer.');

    const q = { type, text };
    if (type === 'code_output') {
      const expected = b.querySelector('textarea[name$="_expected"]');
      const idx = Number((b.id.match(/qb_(\d+)/) || [])[1]);
      // Exact name match: `q_${idx}_starter`. The suffix selector `name$="_starter"`
      // would also match `q_${idx}_contains_starter`, which is earlier in the DOM.
      const starter = b.querySelector(`textarea[name="q_${idx}_starter"]`);
      const expectedVal = expected ? expected.value.trim() : '';
      const starterVal = starter ? starter.value.trim() : '';
      if (!expectedVal) throw new Error(`Code question "${text}" needs expected output.`);
      q.expected = expectedVal;
      if (starterVal) q.starter = starterVal;
    } else if (type === 'big') {
      const image = b.querySelector('input[name$="_image"]');
      const imageVal = image && image.value.trim();
      if (imageVal) q.image = imageVal;

      const answers = [];
      b.querySelectorAll('input[name*="_big_value_"]').forEach(inp => {
        const v = inp.value.trim();
        if (!v) return;
        const row = inp.closest('.big-answer-row');
        const labelInput = row && row.querySelector('input[name*="_big_label_"]');
        answers.push({
          label: (labelInput && labelInput.value.trim()) || `Answer ${answers.length + 1}`,
          value: v
        });
      });
      if (answers.length < 1) throw new Error(`Big question "${text}" needs at least one answer section.`);
      q.answers = answers;
    } else if (type === 'code_contains') {
      const requiredRaw = b.querySelector('textarea[name$="_required"]');
      const required = (requiredRaw ? requiredRaw.value : '')
        .split('\n').map(s => s.trim()).filter(Boolean);
      if (required.length < 1) throw new Error(`Code "must contain" question "${text}" needs at least one required line.`);
      q.required = required;

      const minEl = b.querySelector('input[name$="_minmatches"]');
      const minVal = minEl && minEl.value.trim();
      if (minVal && Number(minVal) > 0) q.minMatches = Number(minVal);

      const starterEl = b.querySelector('textarea[name$="_contains_starter"]');
      const starterVal = starterEl ? starterEl.value.trim() : '';
      if (starterVal) q.starter = starterVal;
    } else {
      q.answer = correct;
    }

    const sections = [];
    b.querySelectorAll('.q-section-builder').forEach(sec => {
      const secType = sec.getAttribute('data-qstype');
      if (!secType) return;
      const textV = ((sec.querySelector('textarea[name*="_text_"]')) || {}).value || '';
      const codeV = ((sec.querySelector('textarea[name*="_code_"]')) || {}).value || '';
      const latexV = ((sec.querySelector('textarea[name*="_latex_"]')) || {}).value || '';
      const itemsVal = ((sec.querySelector('textarea[name*="_items_"]')) || {}).value || '';
      const srcVal = ((sec.querySelector('input[name*="_src_"]')) || {}).value || '';
      const captionVal = ((sec.querySelector('input[name*="_caption_"]')) || {}).value || '';

      if (secType === 'text') {
        if (!textV.trim()) return;
        sections.push({ type: 'text', text: textV.trim() });
      } else if (secType === 'code') {
        if (!codeV.trim()) return;
        sections.push({ type: 'code', code: codeV.trim() });
      } else if (secType === 'formula') {
        if (!latexV.trim()) return;
        sections.push({ type: 'formula', latex: latexV.trim() });
      } else if (secType === 'list') {
        const items = itemsVal.split('\n').map(s => s.trim()).filter(Boolean);
        if (items.length === 0) return;
        sections.push({ type: 'list', items });
      } else if (secType === 'image') {
        if (!srcVal.trim()) return;
        const img = { type: 'image', src: srcVal.trim() };
        if (captionVal.trim()) img.caption = captionVal.trim();
        sections.push(img);
      }
    });
    if (sections.length > 0) q.sections = sections;
    if (explanation) q.explanation = explanation;

    if (type === 'mc') {
      const options = [];
      b.querySelectorAll('input[name*="_opt_"]').forEach(inp => {
        const v = inp.value.trim();
        if (v) options.push(v);
      });
      if (options.length < 1) throw new Error(`MC question "${text}" needs at least one option.`);
      q.options = options;
    }

    if (type === 'code_predict') {
      const cv = code && code.value.trim();
      if (cv) q.code = cv;
    }

    if (type === 'tf') {
      const lower = correct.toLowerCase();
      if (lower !== 'true' && lower !== 'false') {
        throw new Error(`True/False question "${text}" answer must be 'true' or 'false'.`);
      }
      q.answer = lower;
    }

    questions.push(q);
  });

  if (questions.length === 0) throw new Error('Add at least one question.');

  const quiz = { id, title, description, category: category || undefined, questions };
  if (shuffle) quiz.shuffle = true;
  return quiz;
}

function generateQuizJSON(download) {
  const status = document.getElementById('quizStatus');
  status.textContent = '';
  try {
    const quiz = buildQuizObject();
    const json = JSON.stringify(quiz, null, 2);
    document.getElementById('quizOutput').value = json;
    downloadOrCopy(json, download, `${quiz.id}.json`, status, 'Downloaded! Merge into data/quizzes.json.');
  } catch (err) {
    status.textContent = `⚠️ ${err.message}`;
  }
}

function clearQuizForm() {
  ['quizId', 'title', 'description', 'quizCategory'].forEach(id => document.getElementById(id).value = '');
  const shuffleEl = document.getElementById('quizShuffle');
  if (shuffleEl) shuffleEl.checked = false;
  document.getElementById('questionsContainer').innerHTML = '';
  document.getElementById('quizOutput').value = '';
  document.getElementById('quizStatus').textContent = '';
  questionCount = 0;
  questionSectionCounter = 0;
  addQuestion();
}

// ── Theory builder ───────────────────────────────────────────────────────────

function addSection(type = 'paragraph') {
  const container = document.getElementById('sectionsContainer');
  const div = document.createElement('div');
  div.className = 'question-builder';
  div.id = `sec_${sectionCount}`;

  div.innerHTML = `
    <div class="question-builder-header">
      <span class="q-number">Section ${sectionCount + 1}</span>
      <button type="button" class="btn btn-sm btn-danger" onclick="removeSection(${sectionCount})">Remove</button>
    </div>
    <div class="form-group">
      <label>Type</label>
      <select name="sec_${sectionCount}_type" onchange="changeSectionType(${sectionCount}, this.value)">
        ${sectionTypes.map(([v, l]) => `<option value="${v}" ${v === type ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
    </div>
    <div class="form-group" id="sec_text_group_${sectionCount}">
      <label>Text *</label>
      <textarea name="sec_${sectionCount}_text" rows="2" placeholder="Heading or paragraph text... (use $...$ for math, **bold**, *italic*)"></textarea>
    </div>
    <div class="form-group" id="sec_formula_group_${sectionCount}" style="display:${type === 'formula' ? 'block' : 'none'}">
      <label>Formula (LaTeX) *</label>
      <textarea name="sec_${sectionCount}_latex" rows="2" placeholder="e.g. x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"></textarea>
    </div>
    <div class="form-group" id="sec_code_group_${sectionCount}" style="display:${type === 'code' ? 'block' : 'none'}">
      <label>Code</label>
      <textarea name="sec_${sectionCount}_code" rows="4" placeholder="Python code..." class="code-textarea"></textarea>
    </div>
    <div class="form-group" id="sec_items_group_${sectionCount}" style="display:${type === 'list' ? 'block' : 'none'}">
      <label>List Items (one per line) *</label>
      <textarea name="sec_${sectionCount}_items" rows="4" placeholder="item one&#10;item two&#10;item three"></textarea>
    </div>
    <div class="form-group" id="sec_image_group_${sectionCount}" style="display:${type === 'image' ? 'block' : 'none'}">
      <label>Image URL *</label>
      <input type="text" name="sec_${sectionCount}_src" placeholder="e.g. images/diagram.png">
      <label style="margin-top:10px">Caption (optional)</label>
      <input type="text" name="sec_${sectionCount}_alt" placeholder="Short description shown under the image">
    </div>
    <div class="form-group" id="sec_animation_group_${sectionCount}" style="display:${type === 'animation' ? 'block' : 'none'}">
      <label>Animation ID *</label>
      <input type="text" name="sec_${sectionCount}_animation" placeholder="e.g. recursion">
      <label style="margin-top:10px">Animation caption (optional)</label>
      <input type="text" name="sec_${sectionCount}_anim_caption" placeholder="Short description shown above the animation">
    </div>
  `;

  container.appendChild(div);
  sectionCount++;
}

function removeSection(idx) {
  const el = document.getElementById(`sec_${idx}`);
  if (el) el.remove();
}

function changeSectionType(idx, type) {
  const textGroup = document.getElementById(`sec_text_group_${idx}`);
  const formulaGroup = document.getElementById(`sec_formula_group_${idx}`);
  const codeGroup = document.getElementById(`sec_code_group_${idx}`);
  const itemsGroup = document.getElementById(`sec_items_group_${idx}`);
  const imageGroup = document.getElementById(`sec_image_group_${idx}`);
  const animationGroup = document.getElementById(`sec_animation_group_${idx}`);

  const showOnly = (el) => {
    [textGroup, formulaGroup, codeGroup, itemsGroup, imageGroup, animationGroup].forEach(g => {
      if (g) g.style.display = (g === el) ? 'block' : 'none';
    });
  };

  if (type === 'heading' || type === 'paragraph') {
    showOnly(textGroup);
    textGroup.querySelector('label').textContent = type === 'heading' ? 'Heading Text *' : 'Paragraph Text *';
  } else if (type === 'formula') {
    showOnly(formulaGroup);
  } else if (type === 'code') {
    showOnly(codeGroup);
  } else if (type === 'list') {
    showOnly(itemsGroup);
  } else if (type === 'image') {
    showOnly(imageGroup);
  } else if (type === 'animation') {
    showOnly(animationGroup);
  }
}

function buildTheoryObject() {
  const id = document.getElementById('topicId').value.trim();
  const title = document.getElementById('topicTitle').value.trim();
  const category = document.getElementById('topicCategory').value.trim();
  const description = document.getElementById('topicDescription').value.trim();

  if (!id) throw new Error('Please provide a topic ID.');
  if (!title) throw new Error('Please provide a topic title.');

  const sections = [];
  document.querySelectorAll('#tabTheory .question-builder').forEach((b) => {
    const type = b.querySelector('select[name$="_type"]').value;
    const text = b.querySelector('textarea[name$="_text"]').value.trim();
    const latex = b.querySelector('textarea[name$="_latex"]');
    const code = b.querySelector('textarea[name$="_code"]').value.trim();
    const items = b.querySelector('textarea[name$="_items"]').value;

    if (type === 'formula') {
      const trimmed = latex ? latex.value.trim() : '';
      if (!trimmed) throw new Error('Formula sections need LaTeX content.');
      sections.push({ type, latex: trimmed });
    } else if (type === 'code') {
      if (!code) throw new Error('Code sections need code content.');
      sections.push({ type, code });
    } else if (type === 'list') {
      const list = items.split('\n').map(s => s.trim()).filter(Boolean);
      if (list.length === 0) throw new Error('List sections need at least one item.');
      sections.push({ type, items: list });
    } else if (type === 'image') {
      const src = b.querySelector('input[name$="_src"]').value.trim();
      const alt = b.querySelector('input[name$="_alt"]').value.trim();
      if (!src) throw new Error('Image sections need an image URL.');
      const img = { type, src };
      if (alt) img.caption = alt;
      sections.push(img);
    } else if (type === 'animation') {
      const anim = b.querySelector('input[name$="_animation"]').value.trim();
      const caption = b.querySelector('input[name$="_anim_caption"]').value.trim();
      if (!anim) throw new Error('Animation sections need an animation ID.');
      const sec = { type, animation: anim };
      if (caption) sec.caption = caption;
      sections.push(sec);
    } else {
      if (!text) throw new Error(`Each ${type} section needs text.`);
      sections.push({ type, text });
    }
  });

  if (sections.length === 0) throw new Error('Add at least one section.');

  const topic = { id, title, sections };
  if (category) topic.category = category;
  if (description) topic.description = description;
  return topic;
}

function generateTheoryJSON(download) {
  const status = document.getElementById('theoryStatus');
  status.textContent = '';
  try {
    const topic = buildTheoryObject();
    const json = JSON.stringify(topic, null, 2);
    document.getElementById('theoryOutput').value = json;
    downloadOrCopy(json, download, `${topic.id}.json`, status, 'Downloaded! Merge into data/theory.json (inside the "topics" array).');
  } catch (err) {
    status.textContent = `⚠️ ${err.message}`;
  }
}

function clearTheoryForm() {
  ['topicId', 'topicTitle', 'topicCategory', 'topicDescription'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('sectionsContainer').innerHTML = '';
  document.getElementById('theoryOutput').value = '';
  document.getElementById('theoryStatus').textContent = '';
  sectionCount = 0;
  addSection();
}

// ── Merge & Download (append to existing data file) ──────────────────────────

async function mergeAndDownload(kind) {
  const isQuiz = kind === 'quiz';
  const status = document.getElementById(isQuiz ? 'quizStatus' : 'theoryStatus');
  status.textContent = '';

  let item;
  try {
    item = isQuiz ? buildQuizObject() : buildTheoryObject();
  } catch (err) {
    status.textContent = `⚠️ ${err.message}`;
    return;
  }

  const file = isQuiz ? 'data/quizzes.json' : 'data/theory.json';
  const key = isQuiz ? 'quizzes' : 'topics';
  const outputId = isQuiz ? 'quizOutput' : 'theoryOutput';

  try {
    let res;
    try {
      res = await fetch(file);
    } catch (e) {
      res = null;
    }
    if (!res || !res.ok) {
      throw new Error('Could not read ' + file + '. Make sure the site is served over HTTP (e.g. localhost:8000), not opened as file://.');
    }

    const data = await res.json();
    if (!data || !Array.isArray(data[key])) {
      throw new Error('Unexpected structure in ' + file + ' (expected a "' + key + '" array).');
    }

    const list = data[key];
    const existingIdx = list.findIndex(x => x && x.id === item.id);
    if (existingIdx !== -1) {
      const choice = confirm(
        `An item with ID "${item.id}" already exists in ${file}.\n\n` +
        'OK  = Replace the existing one\n' +
        'Cancel = Abort (nothing is changed)'
      );
      if (!choice) {
        status.textContent = `ℹ️ Merge cancelled — "${item.id}" already exists.`;
        return;
      }
      list[existingIdx] = item;
    } else {
      list.push(item);
    }

    const json = JSON.stringify(data, null, 2);
    document.getElementById(outputId).value = json;

    const action = existingIdx !== -1 ? 'Replaced' : 'Added';
    const filename = file.split('/')[1];
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    status.textContent = `✅ ${action} item "${item.id}". Download the full ${filename} and replace the file in the data/ folder.`;
    clearEditing();
  } catch (err) {
    status.textContent = `⚠️ ${err.message}`;
  }
}

// ── Markdown Theory builder ───────────────────────────────────────────────────

function buildMarkdownTheoryObject() {
  const id = document.getElementById('topicMdId').value.trim();
  const title = document.getElementById('topicMdTitle').value.trim();
  const category = document.getElementById('topicMdCategory').value.trim();
  const description = document.getElementById('topicMdDescription').value.trim();
  const md = document.getElementById('topicMdMarkdown').value;

  if (!id) throw new Error('Please provide a topic ID.');
  if (!title) throw new Error('Please provide a topic title.');
  if (!md.trim()) throw new Error('Write some markdown content.');

  const sections = mdToTheorySections(md);
  if (sections.length === 0) throw new Error('No supported markdown found. Write a heading, paragraph, code block, list, ...');

  const topic = { id, title, sections };
  if (category) topic.category = category;
  if (description) topic.description = description;
  return topic;
}

function buildMarkdownSectionsOnly() {
  return mdToTheorySections(document.getElementById('topicMdMarkdown').value);
}

function generateMarkdownJSON(download) {
  const status = document.getElementById('mdTheoryStatus');
  if (status) status.textContent = '';
  try {
    const topic = buildMarkdownTheoryObject();
    const json = JSON.stringify(topic, null, 2);
    document.getElementById('mdTheoryOutput').value = json;
    downloadOrCopy(json, download, `${topic.id}.markdown.json`, status, 'Downloaded! Merge into data/theory-md.json (inside the "topics" array).');
  } catch (err) {
    if (status) status.textContent = `⚠️ ${err.message}`;
  }
}

function clearMarkdownForm() {
  ['topicMdId', 'topicMdTitle', 'topicMdCategory', 'topicMdDescription'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const md = document.getElementById('topicMdMarkdown');
  if (md) md.value = '';
  const out = document.getElementById('mdTheoryOutput');
  if (out) out.value = '';
  const preview = document.getElementById('mdPreview');
  if (preview) preview.innerHTML = '<p class="empty-state">The rendered topic will appear here as you type.</p>';
  const status = document.getElementById('mdTheoryStatus');
  if (status) status.textContent = '';
}

let mdPreviewRaf = 0;
function refreshMarkdownPreview() {
  if (mdPreviewRaf) return;
  mdPreviewRaf = requestAnimationFrame(() => {
    mdPreviewRaf = 0;
    const md = document.getElementById('topicMdMarkdown');
    const preview = document.getElementById('mdPreview');
    if (!md || !preview) return;
    try {
      preview.innerHTML = renderMarkdownPreview(buildMarkdownSectionsOnly());
      if (typeof highlightCodeBlocks === 'function') highlightCodeBlocks(preview);
      if (typeof initAnimationPlayers === 'function') initAnimationPlayers(preview);
    } catch (err) {
      const status = document.getElementById('mdTheoryStatus');
      if (status) status.textContent = `Preview: ${err.message}`;
    }
  });
}

// Merge a markdown topic into data/theory-md.json. This file is completely
// separate from data/theory.json, so the markdown and structured builders can
// never overwrite each other. Cross-file duplicate IDs are rejected outright.
async function mergeMarkdownDownload() {
  const status = document.getElementById('mdTheoryStatus');
  if (status) status.textContent = '';

  let item;
  try {
    item = buildMarkdownTheoryObject();
  } catch (err) {
    if (status) status.textContent = `⚠️ ${err.message}`;
    return;
  }

  const file = 'data/theory-md.json';
  try {
    let mainRes = null;
    let mdRes = null;
    try {
      [mainRes, mdRes] = await Promise.all([
        fetch('data/theory.json'),
        fetch(file),
      ]);
    } catch (e) {
      mainRes = null;
      mdRes = null;
    }
    if (!mdRes || !mdRes.ok) {
      throw new Error('Could not read ' + file + '. Make sure the site is served over HTTP (e.g. localhost:8000), not opened as file://.');
    }

    // Collision guard against the structured Theory Builder's file.
    if (mainRes && mainRes.ok) {
      try {
        const main = await mainRes.json();
        const conflict = (main.topics || []).some(t => t && t.id === item.id);
        if (conflict) {
          if (status) status.textContent =
            `⚠️ ID "${item.id}" already exists in data/theory.json (Theory Builder). Choose a different ID to keep the two pages collision-free.`;
          return;
        }
      } catch (e) { /* ignore malformed theory.json */ }
    }

    const data = await mdRes.json();
    if (!data || !Array.isArray(data.topics)) {
      throw new Error('Unexpected structure in ' + file + ' (expected a "topics" array).');
    }

    const list = data.topics;
    const existingIdx = list.findIndex(x => x && x.id === item.id);
    if (existingIdx !== -1) {
      const choice = confirm(
        `A markdown topic with ID "${item.id}" already exists in ${file}.\n\n` +
        'OK  = Replace the existing one\n' +
        'Cancel = Abort (nothing is changed)'
      );
      if (!choice) {
        if (status) status.textContent = `ℹ️ Merge cancelled — "${item.id}" already exists.`;
        return;
      }
      list[existingIdx] = item;
    } else {
      list.push(item);
    }

    const json = JSON.stringify(data, null, 2);
    document.getElementById('mdTheoryOutput').value = json;

    const action = existingIdx !== -1 ? 'Replaced' : 'Added';
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'theory-md.json';
    a.click();
    URL.revokeObjectURL(url);

    if (status) status.textContent = `✅ ${action} topic "${item.id}". Download the full theory-md.json and replace the file in the data/ folder.`;
    clearEditing();
  } catch (err) {
    if (status) status.textContent = `⚠️ ${err.message}`;
  }
}

// ── Manage & Delete ──────────────────────────────────────────────────────────

// Working copies of the data files so multiple deletions can accumulate before
// the user downloads the final updated file (similar to the build-and-download flow).
let manageQuizData = null;
let manageTheoryData = null;

// Fetch the current data files from the server into memory, then render.
async function loadManageList() {
  const area = document.getElementById('manageArea');
  if (!area) {
    manageQuizData = null;
    manageTheoryData = null;
    return;
  }
  area.innerHTML = '<p class="loading">Loading existing content...</p>';

  try {
    const [quizRes, theoryRes] = await Promise.all([
      fetch('data/quizzes.json'),
      fetch('data/theory.json'),
    ]);
    if (!quizRes.ok) throw new Error('Could not read data/quizzes.json. Serve over HTTP.');
    manageQuizData = await quizRes.json();
    manageTheoryData = { topics: [] };
    if (theoryRes.ok) manageTheoryData = await theoryRes.json();
  } catch (err) {
    area.innerHTML = `<p class="error-msg">⚠️ ${err.message}</p>`;
    return;
  }

  renderManageList();
}

// Render the list from the current in-memory data (does NOT re-fetch, so
// deletions made on the page are preserved instead of being reverted).
function renderManageList() {
  const area = document.getElementById('manageArea');
  if (!area) return;

  const quizzes = (manageQuizData && manageQuizData.quizzes) || [];
  const topics = (manageTheoryData && manageTheoryData.topics) || [];

  const quizItems = quizzes.length
    ? quizzes.map(q => `
        <div class="manage-row">
          <span class="manage-title">${escapeHtml(q.title || q.id)}<span class="manage-id">${escapeHtml(q.id)} · ${(q.questions || []).length} questions</span></span>
          <div class="manage-actions">
            <button type="button" class="btn btn-sm btn-secondary" onclick="editItem('quiz', '${escapeAttr(q.id)}')">Edit</button>
            <button type="button" class="btn btn-sm btn-danger" onclick="deleteItem('quiz', '${escapeAttr(q.id)}')">Delete</button>
          </div>
        </div>`).join('')
    : '<p class="empty-state">No quizzes found.</p>';

  const theoryItems = topics.length
    ? topics.map(t => `
        <div class="manage-row">
          <span class="manage-title">${escapeHtml(t.title || t.id)}<span class="manage-id">${escapeHtml(t.id)} · ${(t.sections || []).length} sections</span></span>
          <div class="manage-actions">
            <button type="button" class="btn btn-sm btn-secondary" onclick="editItem('theory', '${escapeAttr(t.id)}')">Edit</button>
            <button type="button" class="btn btn-sm btn-danger" onclick="deleteItem('theory', '${escapeAttr(t.id)}')">Delete</button>
          </div>
        </div>`).join('')
    : '<p class="empty-state">No theory topics found.</p>';

  area.innerHTML = `
    <div class="manage-list">
      <h4>Quizzes</h4>
      ${quizItems}
      <h4>Theory Topics</h4>
      ${theoryItems}
    </div>`;

  refreshManageOutput();
}

function escapeAttr(text) {
  return String(text == null ? '' : text)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}

function deleteItem(kind, id) {
  const label = kind === 'quiz' ? 'Quiz' : 'Theory topic';
  const data = kind === 'quiz' ? manageQuizData : manageTheoryData;
  const key = kind === 'quiz' ? 'quizzes' : 'topics';

  if (!data || !Array.isArray(data[key])) {
    setManageStatus(`⚠️ Could not find ${label} data. Click "↻ Refresh" first.`);
    return;
  }
  if (!confirm(`Delete ${label} "${id}"?\n\nIt will be removed from the preview below. Click Download when done to get the updated file.`)) {
    return;
  }

  const idx = data[key].findIndex(x => x && x.id === id);
  if (idx === -1) {
    setManageStatus(`⚠️ No ${label.toLowerCase()} with ID "${id}" found.`);
    return;
  }

  data[key].splice(idx, 1);
  renderManageList();
  setManageStatus(`✅ Deleted "${id}". Preview updated — click Download to save the new file.`);
}

let editingId = null;

async function editItem(kind, id) {
  const isQuiz = kind === 'quiz';
  const data = isQuiz ? manageQuizData : manageTheoryData;
  const key = isQuiz ? 'quizzes' : 'topics';

  if (!data || !Array.isArray(data[key])) {
    setManageStatus('⚠️ Data not loaded. Click "↻ Refresh" first.');
    try {
      const [quizRes, theoryRes] = await Promise.all([
        fetch('data/quizzes.json'),
        fetch('data/theory.json'),
      ]);
      if (quizRes.ok) manageQuizData = await quizRes.json();
      manageTheoryData = theoryRes.ok ? await theoryRes.json() : { topics: [] };
    } catch (e) {
      setManageStatus('⚠️ Could not load data. Serve over HTTP.');
      return;
    }
  }

  const src = isQuiz ? manageQuizData : manageTheoryData;
  const item = (src[key] || []).find(x => x && x.id === id);
  if (!item) {
    setManageStatus(`⚠️ ${isQuiz ? 'Quiz' : 'Theory topic'} "${id}" not found.`);
    return;
  }

  editingId = id;
  if (isQuiz) loadQuizIntoForm(item);
  else loadTheoryIntoForm(item);

  updateEditingIndicator(isQuiz ? 'quiz' : 'theory');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setManageStatus(`✏️ Editing "${id}" — modify in the ${isQuiz ? 'Quiz' : 'Theory'} Builder above, then Merge & Download.`);
}

function loadQuizIntoForm(quiz) {
  clearQuizForm();
  switchTab('quiz');

  document.getElementById('quizId').value = quiz.id || '';
  document.getElementById('title').value = quiz.title || '';
  document.getElementById('description').value = quiz.description || '';
  document.getElementById('quizCategory').value = quiz.category || '';
  const shuffleEl = document.getElementById('quizShuffle');
  if (shuffleEl) shuffleEl.checked = quiz.shuffle === true;

  document.getElementById('questionsContainer').innerHTML = '';
  questionCount = 0;

  (quiz.questions || []).forEach(q => {
    const idx = questionCount;
    addQuestion(q.type || 'mc');

    const builder = document.getElementById(`qb_${idx}`);
    if (!builder) return;

    const textEl = builder.querySelector(`textarea[name="q_${idx}_text"]`);
    if (textEl) textEl.value = q.text || '';

    const typeEl = builder.querySelector(`select[name="q_${idx}_type"]`);
    if (typeEl) typeEl.value = q.type || 'mc';

    changeType(idx, q.type || 'mc');

    if (q.type === 'mc') {
      (q.options || []).forEach((opt, j) => {
        const input = builder.querySelector(`input[name="q_${idx}_opt_${j}"]`);
        if (input) input.value = opt;
      });
    }

    if (q.type === 'mc' || q.type === 'tf' || q.type === 'fill' || q.type === 'code_predict') {
      const correct = builder.querySelector(`input[name="q_${idx}_correct"]`);
      if (correct) correct.value = q.answer || '';
    }

    if (q.type === 'code_predict' && q.code) {
      const code = builder.querySelector(`textarea[name="q_${idx}_code"]`);
      if (code) code.value = q.code;
    }

    if (q.type === 'code_output') {
      const starter = builder.querySelector(`textarea[name="q_${idx}_starter"]`);
      const expected = builder.querySelector(`textarea[name="q_${idx}_expected"]`);
      if (starter) starter.value = q.starter || '';
      if (expected) expected.value = q.expected || '';
    }

    if (q.type === 'code_contains') {
      const required = builder.querySelector(`textarea[name="q_${idx}_required"]`);
      const minMatches = builder.querySelector(`input[name="q_${idx}_minmatches"]`);
      const starter = builder.querySelector(`textarea[name="q_${idx}_contains_starter"]`);
      if (required) required.value = (q.required || []).join('\n');
      if (minMatches && q.minMatches) minMatches.value = q.minMatches;
      if (starter) starter.value = q.starter || '';
    }

    if (q.type === 'big') {
      const image = builder.querySelector(`input[name="q_${idx}_image"]`);
      if (image) image.value = q.image || '';

      const answersContainer = document.getElementById(`big_answers_${idx}`);
      if (answersContainer) {
        answersContainer.innerHTML = '';
        (q.answers || []).forEach((ans, j) => {
          answersContainer.insertAdjacentHTML('beforeend', bigAnswerRow(idx, j));
          const row = document.getElementById(`big_row_${idx}_${j}`);
          if (row) {
            const labelInput = row.querySelector(`input[name="q_${idx}_big_label_${j}"]`);
            const valueInput = row.querySelector(`input[name="q_${idx}_big_value_${j}"]`);
            if (labelInput) labelInput.value = ans.label || '';
            if (valueInput) valueInput.value = ans.value || '';
          }
        });
      }
    }

    const explanation = builder.querySelector(`textarea[name="q_${idx}_explanation"]`);
    if (explanation) explanation.value = q.explanation || '';

    (q.sections || []).forEach(sec => {
      const secType = sec.type;
      addQuestionSection(idx, secType);
      const secEls = containerSections(idx);
      const last = secEls[secEls.length - 1];
      if (!last) return;
      if (secType === 'text') {
        const f = last.querySelector(`textarea[name*="_text_"]`);
        if (f) f.value = sec.text || '';
      } else if (secType === 'code') {
        const f = last.querySelector(`textarea[name*="_code_"]`);
        if (f) f.value = sec.code || '';
      } else if (secType === 'formula') {
        const f = last.querySelector(`textarea[name*="_latex_"]`);
        if (f) f.value = sec.latex || '';
      } else if (secType === 'list') {
        const f = last.querySelector(`textarea[name*="_items_"]`);
        if (f) f.value = (sec.items || []).join('\n');
      } else if (secType === 'image') {
        const src = last.querySelector(`input[name*="_src_"]`);
        const cap = last.querySelector(`input[name*="_caption_"]`);
        if (src) src.value = sec.src || '';
        if (cap) cap.value = sec.caption || '';
      }
      last.querySelectorAll('textarea').forEach(el => autoGrow(el));
    });

    builder.querySelectorAll('textarea').forEach(el => autoGrow(el));
  });
}

function containerSections(qIdx) {
  return Array.from(document.querySelectorAll(`#q_sections_${qIdx} .q-section-builder`));
}

function loadTheoryIntoForm(topic) {
  clearTheoryForm();
  switchTab('theory');

  document.getElementById('topicId').value = topic.id || '';
  document.getElementById('topicTitle').value = topic.title || '';
  document.getElementById('topicCategory').value = topic.category || '';
  document.getElementById('topicDescription').value = topic.description || '';

  document.getElementById('sectionsContainer').innerHTML = '';
  sectionCount = 0;

  (topic.sections || []).forEach(sec => {
    const idx = sectionCount;
    addSection(sec.type || 'paragraph');

    changeSectionType(idx, sec.type || 'paragraph');

    if (sec.type === 'heading' || sec.type === 'paragraph') {
      const textEl = document.querySelector(`textarea[name="sec_${idx}_text"]`);
      if (textEl) textEl.value = sec.text || '';
    } else if (sec.type === 'formula') {
      const latexEl = document.querySelector(`textarea[name="sec_${idx}_latex"]`);
      if (latexEl) latexEl.value = sec.latex || '';
    } else if (sec.type === 'code') {
      const codeEl = document.querySelector(`textarea[name="sec_${idx}_code"]`);
      if (codeEl) codeEl.value = sec.code || '';
    } else if (sec.type === 'list') {
      const itemsEl = document.querySelector(`textarea[name="sec_${idx}_items"]`);
      if (itemsEl) itemsEl.value = (sec.items || []).join('\n');
    } else if (sec.type === 'image') {
      const srcEl = document.querySelector(`input[name="sec_${idx}_src"]`);
      const altEl = document.querySelector(`input[name="sec_${idx}_alt"]`);
      if (srcEl) srcEl.value = sec.src || '';
      if (altEl) altEl.value = sec.caption || '';
    } else if (sec.type === 'animation') {
      const animEl = document.querySelector(`input[name="sec_${idx}_animation"]`);
      const capEl = document.querySelector(`input[name="sec_${idx}_anim_caption"]`);
      if (animEl) animEl.value = sec.animation || '';
      if (capEl) capEl.value = sec.caption || '';
    }

    document.querySelectorAll('#sectionsContainer textarea').forEach(el => autoGrow(el));
  });
}

function updateEditingIndicator(kind) {
  const indicator = document.getElementById('editingIndicator');
  if (indicator && editingId) {
    const label = kind === 'quiz' ? 'Quiz' : 'Theory';
    indicator.textContent = `✏️ Editing ${label}: "${editingId}"`;
    indicator.style.display = 'block';
  }
}

function clearEditing() {
  editingId = null;
  const indicator = document.getElementById('editingIndicator');
  if (indicator) {
    indicator.textContent = '';
    indicator.style.display = 'none';
  }
}

// Show the current (possibly edited) file content in the preview textareas.
function refreshManageOutput() {
  const quizOut = document.getElementById('manageQuizOutput');
  const theoryOut = document.getElementById('manageTheoryOutput');
  if (quizOut && manageQuizData) quizOut.value = JSON.stringify(manageQuizData, null, 2);
  if (theoryOut && manageTheoryData) theoryOut.value = JSON.stringify(manageTheoryData, null, 2);
}

function downloadManageFile(kind) {
  const data = kind === 'quiz' ? manageQuizData : manageTheoryData;
  const filename = kind === 'quiz' ? 'quizzes.json' : 'theory.json';

  if (!data) {
    setManageStatus('⚠️ No data loaded yet. Click "↻ Refresh" first.');
    return;
  }

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  setManageStatus(`✅ Downloading ${filename}. Replace the file in the data/ folder with it.`);
}

function resetManageOutput() {
  manageQuizData = null;
  manageTheoryData = null;
  setManageStatus('');
  loadManageList();
}

function setManageStatus(msg) {
  const status = document.getElementById('manageStatus');
  if (status) status.textContent = msg;
}

// ── Shared utils ─────────────────────────────────────────────────────────────

function downloadOrCopy(json, download, filename, status, doneMsg) {
  if (download) {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    status.textContent = `✅ ${doneMsg}`;
  } else {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(json).then(() => {
        status.textContent = '✅ Copied to clipboard!';
      }).catch(() => {});
    }
  }
}

// ── Auto-growing textareas ────────────────────────────────────────────────────

function autoGrow(el) {
  // Hidden panels (display:none) report scrollHeight as 0 and would collapse
  // the field to ~0px. Skip them; heights get fixed when the tab is shown.
  if (!el || el.offsetParent === null) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

function initAutoGrow() {
  document.querySelectorAll('#tabQuiz textarea, #tabTheory textarea, #tabMdTheory textarea').forEach(el => {
    el.addEventListener('input', () => autoGrow(el));
    autoGrow(el);
  });
}

// ── Tab = indent in code textareas ──────────────────────────────────────────────

function bindCodeTextareaTab(ta) {
  if (!ta || ta.dataset.tabIndent) return;
  ta.dataset.tabIndent = '1';
  ta.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const start = ta.selectionStart;
    ta.value = ta.value.substring(0, start) + '    ' + ta.value.substring(ta.selectionEnd);
    ta.selectionStart = ta.selectionEnd = start + 4;
  });
}

function initCodeTextareaTab() {
  document.querySelectorAll('.code-textarea').forEach(bindCodeTextareaTab);
}

// ── MutationObserver to auto-grow textareas added dynamically ─────────────────

const autoGrowObserver = new MutationObserver(mutations => {
  mutations.forEach(m => {
    m.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      const textareas = node.matches && node.matches('textarea')
        ? [node]
        : (node.querySelectorAll ? Array.from(node.querySelectorAll('textarea')) : []);
      textareas.forEach(el => {
        el.addEventListener('input', () => autoGrow(el));
        autoGrow(el);
        if (el.classList && el.classList.contains('code-textarea')) bindCodeTextareaTab(el);
      });
    });
  });
});

autoGrowObserver.observe(document.getElementById('questionsContainer'), { childList: true, subtree: true });
autoGrowObserver.observe(document.getElementById('sectionsContainer'), { childList: true, subtree: true });
document.querySelectorAll('.q-sections-area').forEach(area => {
  autoGrowObserver.observe(area, { childList: true, subtree: true });
});

// Init
addQuestion();
addSection();
loadManageList();
initAutoGrow();
initCodeTextareaTab();
