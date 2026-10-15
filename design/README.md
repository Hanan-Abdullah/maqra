# Reading page design (prototype)

The approved design of Maqra's reading page, as one self-contained HTML page. It is the reference for the Angular page: layout, colours, behaviour and wording. It is not served by the backend.

## Build it with any analysed text

```bash
# 1. Build the display document from a text and its analysis (uses the skill's code)
node skill/arabic-easy-reading/scripts/build.js samples/short.txt samples/short.analysis.json design/out

# 2. Build the design page from that document
node design/build.js design/out/document.json design/out/maqra-design.html
```

Open `design/out/maqra-design.html` in Chrome or Safari (not inside Claude's file viewer, which blocks the map, printing and sharing). `design/out/` is ignored by Git.

`sample-document.json` is a ready document (the AI text, with questions): `node design/build.js design/sample-document.json design/out/maqra-design.html`.

## Files

- `page.html`: the page template: markup, styles and script in one file. `build.js` fills its placeholders.
- `build.js`: injects the fonts, tokens, icons, logo and the document into `page.html`.
- `tokens.css`: Platforms Code colour, spacing and radius tokens (from `@platformscode/core`, light and dark).
- `fonts.css`: IBM Plex Sans Arabic, embedded.
- `icons.json`: the official Platforms Code icons the page uses (`@platformscode/icons`, stroke style). To add one, take its `*-stroke.svg` from the package and set `class="ico"`, `aria-hidden="true"`.
- `logo.png`: the academy's logo.
