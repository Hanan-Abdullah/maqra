# Maqra (مَقرأ): project guide for Claude

> An Arabic translation for the developer lives in `docs/CLAUDE.ar.md`. It is local only (ignored by Git, never committed). Keep both files in sync: whenever this file changes, update the Arabic copy too.

## What the project is

Maqra turns any Arabic text into an easy-reading page with:
- an overall summary and key points
- reading units with titles and summaries
- terms with their meaning, explanation and example
- importance highlighting of sentences
- one comprehension question per unit
- a table of contents
- a button to view the original text

Core principle: **the author's words never change.** Every sentence on the page is a sentence from the original text, verbatim. The analysis points to sentences by code only; it never copies or rewrites the text.

## How it works

1. The user runs the `arabic-easy-reading` skill in a Claude chat and sends a text.
2. Claude, in the chat, analyses the text following the rule files and writes `analysis.json`.
3. The skill's code validates the analysis and builds a fallback HTML page.
4. The skill sends the original text and the analysis to the backend.
5. The backend validates the analysis again, builds the document, stores it in MongoDB and returns its id.
6. Claude gives the user a link such as `/read/<id>`. If sending fails, it delivers the fallback page as a file.
7. The reading page shows the document. For now it is the skill's HTML template; later it will be the Angular page.

The analysis happens in the Claude chat, **not** through the API, so the backend needs no Claude key.

## Repository layout

- `skill/arabic-easy-reading/`: the skill as uploaded to Claude.
  - `SKILL.md`: the skill's steps (in Arabic).
  - `rules/`: the seven rule files. They are the reference for everything Claude writes in the analysis.
  - `config.json`: the backend URL the skill sends to.
  - `scripts/segmenter.js`: splits the text into blocks and sentences with stable codes (h1, p3, p3.s2, l1, l1.i4).
  - `scripts/merge.js`: validates the analysis and merges it with the text into the display document.
  - `scripts/build.js`: runs merge and builds the HTML page.
  - `scripts/extract.py`: extracts text from files (docx, pdf, html, …).
  - `scripts/publish.js`: sends the text and analysis to the backend and prints `LINK:` or `PUBLISH_FAILED:`. It sends with `curl` because Claude's sandbox routes outside connections through a proxy (`HTTPS_PROXY`) that Node's `fetch` ignores.
  - `scripts/meta.js`: writes `meta.json` next to `input.txt`: start time (prepare.js), number of builds (build.js), file name and type (extract.py).
  - `templates/reading-page.html`: the current reading page. It is the reference for the Angular page's design and behaviour.
- `samples/`: test texts with their analyses, for trying things without a Claude chat. Their analyses are older and have no comprehension questions.
- `compose.yaml`: the local MongoDB container `maqra-db` on `127.0.0.1:27018`.
- `backend/`: Node.js (Express 5 and mongodb 7, requires Node 20.19 or newer).
  - `src/server.js`: connects to the database and starts the server. If the connection fails it exits with a clear message (on the server, the container restarts it).
  - `src/db.js`: the connection and the `documents` collection.
  - `src/app.js`: the routes.
  - `src/record.js`: the shape of the stored record.
  - `src/pages.js`: the temporary reading page and the "not found" page.
  - `.env.example`: required settings (PORT, MONGO_URL, MONGO_DB, PUBLIC_URL). `.env` is never committed.
- `frontend/`: (later) Angular, the reading page.
- `docs/CLAUDE.ar.md`: Arabic copy of this guide, local only (in `.gitignore`).

## Backend

**Routes:**
- `POST /api/documents`: receives `{ text, analysis, source, processing }`. Validates with `merge.js`, and also rejects an analysis without reading units or without a summary. Stores it and returns `{ id, url, warnings }`. Errors: 400 for a malformed request, 422 for an invalid analysis.
- `GET /api/documents/:id`: returns only the display document (`document`), no internal data.
- `GET /read/:id`: the temporary reading page (the skill's template) until the Angular page replaces it.
- `GET /health`

**Id:** 10 random `base64url` characters. The link is not stored; it is built from `PUBLIC_URL` + `/read/` + id.

**`documents` record:**
- `_id`, `title` (the author's title, otherwise the first unit's title), `wordCount`
- `source`: `{ type: paste | file | url, fileName?, url? }`
- `versions`: `{ skill, schema, segmenter, rules }`
- `stats`: units, key points, terms, questions, importance shares
- `quality`: `{ warnings, attempts }`
- `textProfile`: headings, paragraphs, sentences, lists, list items, `hasAuthorTitle`
- `processing`: `{ fileType, extractionMethod (not recorded yet), reviewed, durationMs }`
- `originalText`, `analysis` (as Claude wrote it), `document` (ready to display), `createdAt`

The numbers in `stats` and `textProfile` are computed by the backend from the document, never taken from the request.

**Later collections:** `events` (reading log, with the Angular page), `users` and `progress` (with sign-in), `feedback` (optional).

## Running locally

1. `docker compose up -d` (database).
2. `cd backend && npm start`.
3. `ngrok http --url=turret-each-tipping.ngrok-free.dev 3010` (a fixed public URL so Claude can reach the backend).
4. While testing from Claude, `backend/.env` has `PUBLIC_URL=https://turret-each-tipping.ngrok-free.dev`.
5. In Claude's settings: Allow network egress on, domain allowlist "Package managers only", plus `turret-each-tipping.ngrok-free.dev` in additional allowed domains.

To browse the data: MongoDB Compass at `mongodb://127.0.0.1:27018`.

## Technical decisions

- **Backend:** Node.js. It uses `segmenter.js` and `merge.js` as they are, never rewrites them.
- **Database:** MongoDB. The document is stored in the same shape as the skill's `document.json`, together with the original text.
- **Frontend:** Angular. Its built files are served by the backend from the same container.
- **Deployment:** two containers. `maqra` for the backend and pages, `maqra-db` for MongoDB.
- **Analysis in the Claude chat, not through the API:** the skill sends the result to the backend. Every user must allow Maqra's domain in their Claude settings; the likely solution at deployment is a connector.
- **Repository:** in the developer's personal GitHub account for now; it moves to the organisation account (`ksaa-nlp`) before deployment on the organisation's server.
- **Development machine:** macOS with Docker. The production server is Ubuntu with Podman, and Nginx maps the domain to the container.
- **Reserved ports on the development machine:** 8061 and 6060 are used by another project; do not use them.

## Remaining work

1. The Angular reading page with all features of the current page, then a redesign of the visual identity, then the `events` reading log.
2. Before deployment: a shared secret between the skill and the backend, request rate limiting, the `maqra` container, a database password, and deletion of a text at its owner's request.
   - **Privacy:** users are told that their text is stored **before** they use the skill (in its description or the message it is distributed with), not in every reply. The wording will be written together with the developer. Check the organisation's policy and the Saudi Personal Data Protection Law.
3. Deployment: move the repository to the organisation, coordinate with the server administrator (subdomain and Nginx), and change `config.json`.
4. Later: related topics, text classification, accounts, raising the 1500-word limit, recording the extraction method.

## Working rules

- **Language:** the developer speaks Arabic. Explain in Arabic, and do not mix English words into Arabic sentences except file names and commands. Code, code comments and commit messages are in English. Text shown to end users is in Arabic.
- **Step by step:** one step at a time. Explain the problem with an example before any change, and give your opinion.
- **Questions:** in the form «**السؤال الأول:** …», with your recommendation.
- **Piece by piece:** explain the piece, discuss its decisions with the developer, then write it; it is tested and committed before the next one.
- **Commit messages:** English, Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`), a short title and detail bullets.
- **No secrets in code:** passwords and database URLs go in `.env`, which is excluded from Git. Put an example without real values in `.env.example`.
- **segmenter.js and merge.js are sensitive:** any change requires rebuilding every text in `samples/` and checking that the codes did not change, because stored analyses depend on them.
- **The rule files are approved:** change them only on explicit request, and bump the version number at the top of the file on any change.
- **Keep the guide current:** update this file and `docs/CLAUDE.ar.md` after each phase or decision.

## Useful commands

Build a page from a ready text and analysis:

```bash
node skill/arabic-easy-reading/scripts/build.js samples/ai.txt samples/ai.analysis.json /tmp/out
```

Then open `/tmp/out/reading-page.html` in the browser.
