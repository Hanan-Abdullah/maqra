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
- `samples/`: test texts with their analyses, for trying things without a Claude chat. Most analyses are older and have no comprehension questions; `short` (92 words, one unit) is current and has them.
- `design/`: the approved design of the reading page as one self-contained HTML prototype (`page.html` + `build.js`), the reference for the Angular page. See `design/README.md`.
- `compose.yaml`: the local MongoDB container `maqra-db` on `127.0.0.1:27018`.
- `backend/`: Node.js (Express 5 and mongodb 7, requires Node 20.19 or newer).
  - `src/server.js`: connects to the database and starts the server. If the connection fails it exits with a clear message (on the server, the container restarts it).
  - `src/db.js`: the connection and the `documents` collection.
  - `src/app.js`: the routes.
  - `src/record.js`: the shape of the stored record.
  - `src/pages.js`: the temporary reading page and the "not found" page.
  - `.env.example`: required settings (PORT, MONGO_URL, MONGO_DB, PUBLIC_URL). `.env` is never committed.
- `frontend/`: Angular, the reading page (being built from `design/`).
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
4. The Angular page: `cd frontend && npm start`, then `http://localhost:4200/read/<id>` (it proxies `/api` to the backend on 3010). Restart it after any change to `angular.json`.
5. While testing from Claude, `backend/.env` has `PUBLIC_URL=https://turret-each-tipping.ngrok-free.dev`.
6. In Claude's settings: Allow network egress on, domain allowlist "Package managers only", plus `turret-each-tipping.ngrok-free.dev` in additional allowed domains.

To browse the data: MongoDB Compass at `mongodb://127.0.0.1:27018`.

## Technical decisions

- **Backend:** Node.js. It uses `segmenter.js` and `merge.js` as they are, never rewrites them.
- **Database:** MongoDB. The document is stored in the same shape as the skill's `document.json`, together with the original text.
- **Frontend:** Angular, with the official Platforms Code web components. Its built files are served by the backend from the same container.
- **Deployment:** two containers. `maqra` for the backend and pages, `maqra-db` for MongoDB.
- **Analysis in the Claude chat, not through the API:** the skill sends the result to the backend. Every user must allow Maqra's domain in their Claude settings; the likely solution at deployment is a connector.
- **Repository:** in the developer's personal GitHub account for now; it moves to the organisation account (`ksaa-nlp`) before deployment on the organisation's server.
- **Development machine:** macOS with Docker. The production server is Ubuntu with Podman, and Nginx maps the domain to the container.
- **Reserved ports on the development machine:** 8061 and 6060 are used by another project; do not use them.

## Platforms Code (كود المنصات) compliance

Maqra will run on a government entity's server, so the interface must follow the Digital Government Authority's unified design system, **Platforms Code** (https://design.dga.gov.sa). The DGA evaluates platforms against a 56-point checklist, kept in `docs/platforms-code-checklist.xlsx`.

**Decisions:**
- **Official library:** `@platformscode/core` (Stencil web components, published by the same maintainers as the official `platformscode-new-react`). Used directly in Angular as custom elements. Do **not** use `platformscode-new-angular` or other third-party wrappers. Pin the exact version (0.0.53); upgrade only after testing, because it is still pre-1.0.
- **Tokens:** colours, spacing and radius come only from the library's `dist/core/core.css` (light theme in `:root`, dark theme in `[data-theme=dark]`). Never hard-code colours or spacing, and never modify or replace a token.
- **Font:** IBM Plex Sans Arabic for everything, including the reading text (bundled with the library). Sizes from the typography tokens: display-md 36/44, display-sm 30/38, display-xs 24/32, text-xl 20/30, text-lg 18/28, text-md 16/24, text-sm 14/20, text-xs 12/18. Reading text uses text-xl.
- **Icons:** from the official icon set (`@platformscode/icons`), not text symbols such as ✓ ✗ ☰ ×.
- **Dark mode:** supported, using the official dark tokens only.
- **Accessibility:** WCAG AA contrast (4.5:1 for text under 24px), touch targets at least 44×44px, real `<button>` elements, visible focus, Esc closes overlays, focus stays inside open overlays, text resizable to 200% (use `rem`). Importance highlighting must not rely on colour alone: add a non-colour cue and visually hidden text for screen readers.

**Our components mapped to Platforms Code components (checklist number):**
- "Finish" and quiz action buttons → Button (12)
- Toolbar on/off toggles → Switch (23)
- Term card → Modal / Drawer (19)
- Quiz options → Radio button (22)
- Folding reading units → Accordion (15)
- Summary and unit cards → Card (28)
- Loading state → Loading (46)

**Applies later:** Footer (27), Navigation header (29) and Digital stamp (11) once the organisation confirms its requirements and logo; a user feedback mechanism (40), which makes the `feedback` collection required; a visible privacy notice on the page (41).

**Not applicable for now** (Maqra is a single reading page): page templates (7–10), file upload (20), table (35), date picker (36), sitemap (37).

**UX principles (42–56)** apply to every piece: consistency, clear error handling, visual hierarchy, few steps.

## Reading page design (`design/`)

Approved with the developer. The Angular page must reproduce it.

**Page parts:**
- Gray accessibility bar (zoom out/in, light/dark), white header (Maqra mark and name, academy logo), green hero, mode switcher, the mode panel, "was this page helpful?" (yes/no), analysis date, green footer.
- Hero:
  - mode badge; share, print and report buttons
  - title
  - one line describing the mode
  - number cards: text length (words) always; reading units only when there is more than one unit; terms only when there are terms.

**Three reading modes on one page, switched by tabs:**
1. **«النص الأصلي»:** the author's text only, no analysis. Author headings feed the contents list; without headings the text is a single centred column.
2. **«العرض الميسّر»:**
   - The summary («الخلاصة») with key points that jump to their unit.
   - A sticky toolbar of switches, in this order: «المصطلحات», «تمييز المهم», «ملخصات الوحدات», «اختبر فهمي».
   - A colour legend, and reading progress «قرأت X من Y» with open/close all.
   - Unit cards: unit summary, then the text, then the quiz, then the «انتهيت، الوحدة التالية» button (marks the unit read and folds it).
   - Terms open a side panel (a bottom sheet on phones).
3. **«النص والحواشي»** (annotated, magazine style):
   - The summary and a numbered list «الأفكار الرئيسية» linking to units.
   - A sticky bar of chips: «المصطلحات», «تمييز المهم», «ملخصات الوحدات», «اختبر فهمي». On is shown by a tick, off is gray, with no strike-through.
   - Each unit: an eight-point star divider, a big faint number, the title, the first two words in bold (default text colour, never green), the text, and the quiz.
   - Margin notes are cards with an accent bar facing the text:
     - Wide screens (≥1280px) have two margins: unit summaries on the right; terms on the left, moving to the right when the left is taken at that height. A term card still pushed more than about 96px from its word is shortened to the term and its translation.
     - 960–1279px has one margin on the left.
     - Phones have no margins: summaries sit under the unit title, and terms open the side panel.
   - Notes glide in as their paragraph reaches the screen; leader lines appear only on hover or focus.
   - A reading thread with one dot per unit fills as the reader scrolls.
   - Clicking a term (word or card) opens the same side panel as in the easy mode.

**Colours, the same in every mode:** terms green, importance gold, unit summaries blue, comprehension questions purple. Quiz sources are highlighted purple; the "correct answer" box stays success green. Importance looks the same in both analysis modes: primary sentences have a gold background with an underline, secondary sentences are faded to 30%.

**Follow the display settings of the document** (`display.showImportance`, `showSectionSummaries`, `showTerms`, `showQuestions`, a unit's `showSummary`) in both analysis modes. A feature the text does not have is left out, not shown disabled. The line under the title is built from what is actually shown (e.g. «النص مع شرح للمصطلحات وسؤال لاختبار الفهم.»).

**A unit whose title equals its leading author heading** (rules v8) shows the heading once, in the unit head, not again in the text or the contents list.

**Other pages (same header and footer):**
- «تواصل معنا» (`#contact`, linked from the footer): breadcrumb, then cards for email `info@ksaa.gov.sa`, phone `+966 11 520 7777` and address «حي الورود، الرياض 12251، المملكة العربية السعودية».
  - Then «تابعنا» with the academy's accounts: X `KSGAFAL`, Instagram `ksgafal`, Facebook `KSGAFAL`, YouTube `@ksgafal`, LinkedIn `ksgafal`, the WhatsApp channel, and email. The footer shows the same icons.
  - Then «موقع المجمع» with an embedded Google map.
- «عن مَقرأ» (`#about`): four paragraphs approved by the developer (see `design/page.html`).

**Report dialog («إبلاغ», hero button):**
- Reports a mistake in the analysis.
- Fields, all required and marked with a red asterisk: name, email (validated, with an error shown when the field is left), report type (a dropdown: شرح مصطلح، ملخص وحدة، الخلاصة أو الأفكار الرئيسية، تمييز المهم، سؤال «اختبر فهمي»، أخرى), and message.
- «إرسال البلاغ» stays disabled until all fields are valid.
- The text link, current mode and unit are attached automatically, and the dialog says so.
- It is stored in the `feedback` collection.

**Share and print:** share uses the system share sheet and falls back to copying the link. Embedded viewers may block printing, so the page says to open it in a browser.

## Angular frontend (`frontend/`)

Angular 19, standalone components and signals. Built piece by piece from `design/`.

**Routes:** `''` → «عن مَقرأ» (the home page, `about` redirects to it), `read/:id` → the reading page, `**` → not found. Scroll goes to the top on every navigation.

**Reading page:**
- The mode is in the address, `?mode=original|easy|margin`, and remembered on the device (`maqra:mode`); the default is `easy`. Changing the mode navigates (merge), so Back returns to the previous mode.
- What a text shows follows its analysis (`display`, `showSummary`, `question.show`): a missing feature is hidden, never shown disabled. `hasUnitSummaries()` / `hasQuestions()` in `core/reading-document.ts` decide whether a switch appears at all (short units hide their summary and question).
- A term's "first appearance" is counted after the text's title (the title is in the green band).
- Device storage: `maqra:theme`, `maqra:zoom`, `maqra:mode`, `maqra:prefs` (easy switches), `maqra:prefs:margin` (margin toolbar), `maqra:done:<id>` (units marked read).
- Files: `reading/reading-page` (states, hero, mode tabs, term drawer), `original-view`, `easy-view` (summary, switches, units list, unit cards, progress), `margin-view` (article, notes, leader lines, reading thread), `quiz` (shared by both modes), `term-drawer`, `text-parts.ts` (sentences split around terms).

**Platforms Code library in Angular (0.0.53) — what we learned:**
- Each component is registered on its own in `core/platforms-code.ts` (`defineCustomElement` from `@platformscode/core/components/<name>.js`). `setAssetPath` is imported from the runtime chunk `dist/components/p-BfuyVjJ2.js`: importing the components index pulls about 1 MB (charts). The chunk name is tied to the pinned version.
- Icons: only the icons used are copied by `angular.json` (a glob of `*-stroke.svg` names) to `assets/svg`. **Add a new icon's name to that list**, or it shows nothing (a 404 in the console).
- Static attributes must be kebab-case (`icon-type`, `lead-icon-type`, `sub-title`); camelCase attributes do not reach the props. Property bindings (`[iconOnly]`, `[leadIconType]`) are fine.
- `dga-switch` reports changes only through an `onChange` callback; Angular forbids binding `on*` properties in development (the page stops rendering). Use `SwitchChangeDirective`: `<dga-switch (switchChange)="...">`. Bind both `[checked]` and `[isChecked]` (it reads `checked` before Angular sets it).
- `dga-radio-button` is light DOM: its native `change` event reaches the host. Disabled radios fade the text, so a checked quiz shows its options as plain text.
- Mode tabs: `dga-tabs-v2` + `dga-tab` (not `dga-content-switcher`: no ARIA state, no initial value, unreadable in dark mode). `overflow="scroll"`, otherwise phones hide the last tab behind «…». Styled as filled segments through `::part(base)` and the reflected `selected` attribute.
- Term panel: `dga-drawer-v2` (backdrop, Esc, focus trap and focus return built in); `placement` end on wide screens, bottom on phones.
- Not used: `dga-table-of-content` in the easy view (its links are not keyboard reachable and cannot show read units), so the units list is our own, built with the tokens. `dga-chip` (one colour for all): the margin view's toolbar is our own coloured toggle buttons (`aria-pressed`, a tick when on, the feature's icon in grey when off), as in the design.

**Testing:** run `ng serve` (development mode) as well as a build: some library errors appear only in development.

## Remaining work

1. The Angular page: the three reading modes are done. Next: the contact page (`/contact`, map) and the report dialog, then the `feedback` collection (reports and "was this page helpful?") and the `events` reading log; then the backend serves the built Angular files in place of the skill's template.
2. Before deployment: a shared secret between the skill and the backend, request rate limiting, the `maqra` container, a database password, and deletion of a text at its owner's request.
   - **Privacy:** users are told that their text is stored **before** they use the skill (in its description or the message it is distributed with), not in every reply. The report dialog collects a name and email, so a privacy notice on the page is required before launch. The wording will be written together with the developer. Check the organisation's policy and the Saudi Personal Data Protection Law.
3. Deployment: move the repository to the organisation, coordinate with the server administrator (subdomain and Nginx), and change `config.json`. Ask the organisation about header, footer and digital stamp requirements.
4. Later: related topics, text classification, accounts, raising the 1500-word limit, recording the extraction method.

**Waiting on the developer:** the academy's map coordinates, to pin the map exactly (it now searches by name).

**Optional design touches, postponed:** the current unit's title kept visible in the margin; leader lines drawn with motion.

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
