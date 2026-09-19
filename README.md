# 🐍 Python Quiz Master

A **fully static** website for Python quizzes with a built-in Python playground that runs code directly in the browser using **Pyodide** (WebAssembly). It requires **no server** — just HTML, CSS, and JavaScript.

## Features

- **Interactive Quizzes** with 5 question types:
  - Multiple Choice
  - True / False
  - Fill in the Blank
  - Code Output Prediction
  - Write Code (Output Graded) — students write Python code that runs in the browser via Pyodide; it's graded by comparing the program's output to the expected output, so the exact code doesn't have to match.
- **Python Playground** — a dedicated page (`playground.html`) where you can write and run Python code right in the browser (fully sandboxed via Pyodide, no server-side execution). A quick-access **🐍 Code** button is also available on quiz pages.
- **Theory pages** — learn the concepts first, then test yourself. Theory is data-driven and fully extensible.
- **Dark mode** — a toggle in the navigation bar. Follows your system preference by default, remembers your choice.
- **Client-side grading** — Answers are compared in the browser, no server round-trip
- **Easy content creation** — Use the visual builder at `admin.html` to generate JSON for quizzes **or** theory pages, then drop them into the data files.

## How to Run

Since this uses `fetch()` to load quiz data, you can't just double-click `index.html` (the `file://` protocol blocks JSON loading). Serve the folder with any static server:

```bash
# Option 1: Python
python -m http.server 8000

# Option 2: Node
npx serve .

# Option 3: PHP
php -S localhost:8000
```

Then open http://localhost:8000 in your browser.

You can also deploy it to any static host: **GitHub Pages**, **Netlify**, **Vercel**, etc.

## How Quizzes Work

All quizzes are stored in one file: `data/quizzes.json`.

The homepage (`index.html`) loads and lists them. Each quiz has a unique `id` used in the URL:
```
quiz.html#python-basics
```

### JSON format

```json
{
  "id": "my-quiz",
  "title": "My Quiz",
  "description": "Optional description",
  "questions": [
    {
      "type": "mc",
      "text": "Which keyword defines a function?",
      "options": ["func", "def", "function", "define"],
      "answer": "def",
      "explanation": "Optional explanation"
    },
    {
      "type": "tf",
      "text": "Lists are immutable in Python.",
      "answer": "false"
    },
    {
      "type": "fill",
      "text": "What keyword exits a loop?",
      "answer": "break"
    },
    {
      "type": "code_predict",
      "text": "What does this print?",
      "code": "print(2 ** 3)",
      "answer": "8"
    },
    {
      "type": "code_output",
      "text": "Write code that prints the numbers 1 to 5.",
      "starter": "for i in range(1, 6):\n    print(i)",
      "expected": "1\n2\n3\n4\n5",
      "explanation": "Any code producing that output is correct."
    }
  ]
}
```

### Question types

| Type          | Description                                   | `answer` field       |
|---------------|-----------------------------------------------|----------------------|
| `mc`          | Multiple choice                               | Exact option text    |
| `tf`          | True / False                                  | `true` or `false`    |
| `fill`        | Free text answer                              | Exact text           |
| `code_predict`| Predict code output (has code snippet)        | Exact output text    |
| `code_output` | Student writes code, run in browser, graded by output (`starter` + `expected` fields, no `answer`) | Output is compared |

> Answers are compared case-insensitively and trimmed, so `"True"`, `"TRUE"`, `"true"` all work for TF questions.

For `code_output` questions there is **no `answer` field**. Instead use:
- `starter` (optional): code the student starts from and edits.
- `expected`: the exact printed output the program must produce.
- The student's code is executed in the browser with Pyodide and its printed output is compared to `expected` (normalized: leading/trailing whitespace and blank lines are ignored, case-insensitive). The exact code text does not need to match — only the output. Requires internet the first time (Pyodide downloads a Python runtime).

## Adding Content (Easy Way)

Open `admin.html` — it has two tabs:

### Quizzes
1. Fill in the quiz ID, title, and description.
2. Click **"+ Add Question"** to add questions — pick the type, options, correct answer, and explanation.
3. Click **"Download JSON"** (or **"🧩 Merge & Download"** to keep existing items).
4. To **remove** an existing quiz or theory topic, use the **"🗑️ Manage & Delete"** section at the bottom — pick the item and confirm. It downloads the updated file to replace.
4. Merge the output into the `"quizzes": [...]` array in `data/quizzes.json`.

### Theory pages
1. Fill in the topic ID, title, category, and description.
2. Click **"+ Add Section"** to add sections (heading, paragraph, code, or list).
3. Click **"Download JSON"**.
4. Merge the output into the `"topics": [...]` array in `data/theory.json`.

Or just hand-edit the JSON files following the formats below.

## Theory Pages

All theory is stored in `data/theory.json`. The `theory.html` page lists topics (grouped by category); clicking one opens it via URL hash (`theory.html#topic-id`).

### Theory JSON format

```json
{
  "id": "python-functions",
  "title": "Python Functions",
  "category": "Functions",
  "description": "Learn how to write reusable functions.",
  "sections": [
    { "type": "heading", "text": "Defining Functions" },
    { "type": "paragraph", "text": "For a quadratic $ax^2 + bx + c$, the roots are $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$." },
    { "type": "formula", "latex": "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" },
    { "type": "code", "code": "def greet(name):\n    print('Hello', name)" },
    { "type": "list", "items": ["item one", "item two"] },
    { "type": "image", "src": "images/diagram.png", "caption": "Function call diagram" }
  ]
}
```

### Section types

| Type       | Field(s)        | Description                         |
|------------|-----------------|-------------------------------------|
| `heading`  | `text`          | A section heading                   |
| `paragraph`| `text`          | A paragraph of text                 |
| `formula`  | `latex`         | A display formula rendered with KaTeX (LaTeX) |
| `code`     | `code`          | A Python code block                 |
| `list`     | `items` (array) | A bulleted list of items            |
| `image`    | `src`, `caption` (optional) | An image, optionally with a caption |

Formulas are rendered with [KaTeX](https://katex.org), **bundled locally** in the `katex/` folder (no server or internet required — it also works when opening the site as `file://`). In a `paragraph`, wrap math in `$...$` for inline math and `$$...$$` for display math. Use a `formula` section for standalone display math. Note: `\` must be escaped as `\\` in JSON.

## Python Playground

- **Dedicated page:** open `playground.html` from the navigation for a full Python editor.
- **Quick access:** on quiz pages, click the **🐍 Code** button in the bottom-right corner.

Write code, press **▶ Run** or `Ctrl+Enter`, and see the output. The code runs entirely in your browser using [Pyodide](https://pyodide.org) (CPython compiled to WebAssembly). Nothing ever touches a server, so there's no security risk.

## Dark Mode

Use the **🌙 / ☀️** toggle in the navigation bar on any page. Your choice is remembered in your browser. By default it follows your operating system's light/dark preference.

## Resetting Progress

Quiz progress and best scores are stored locally in your browser (localStorage). To clear them for **all** quizzes at once, open the homepage and click **"🗑️ Reset all progress"** — it removes every saved attempt and best score. This only affects your own browser, not the site's data files.

## Project Structure

```
python_cours/
├── index.html       # Homepage (lists quizzes)
├── quiz.html        # Quiz taking page (loads via URL hash, grades in JS)
├── theory.html      # Theory pages (loads via URL hash)
├── playground.html  # Python playground page
├── admin.html       # Visual builder for quizzes and theory (exports JSON)
├── css/
│   └── style.css    # Styling (includes dark mode)
├── js/
│   ├── quizzes.js   # Loads and renders the quiz list
│   ├── quiz.js      # Quiz logic + client-side grading
│   ├── theory.js    # Loads and renders theory pages
│   ├── playground.js# Shared Pyodide runner (used by quiz + playground)
│   ├── admin.js     # Quiz + theory JSON export logic
│   └── theme.js     # Dark mode toggle + persistence
└── data/
    ├── quizzes.json # All quiz data
    └── theory.json  # All theory data
```

## Notes

- **Answers are visible in `data/quizzes.json`**, which any visitor could view. This is fine for self-learning but not for secure exams.
- Pyodide is loaded from a CDN. For fully offline use, download `pyodide.js` and the pyodide wasm files and reference them locally.
- Everything runs client-side — there is no backend, no database, no admin accounts. Anyone who can edit the JSON files can add content.
