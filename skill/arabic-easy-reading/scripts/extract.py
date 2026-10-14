#!/usr/bin/env python3
"""extract.py — turns an uploaded file into plain text the numbering code understands.

Usage: python3 scripts/extract.py <file> <output.txt>

Output format (same as pasted text):
  - one paragraph per line, a blank line between paragraphs
  - headings start with "# ", list items start with "- "
Exit 0: text written, a one-line report printed ("OK — ...").
Exit 2: prints "REJECTED: <Arabic message>".

Supported: .txt .md .docx .odt .rtf .doc .html .htm .pdf (text PDFs, not scanned).
Only the Python standard library is required; pdftotext / pdfplumber / pypdf,
pandoc and LibreOffice are used when present.
"""
import os
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
import zipfile
import xml.etree.ElementTree as ET

ARABIC = re.compile(r'[ء-ي]')


def reject(msg):
    print('REJECTED: ' + msg)
    sys.exit(2)


def blocks_to_text(blocks):
    """blocks: list of (kind, text) with kind in heading / para / item."""
    out, prev = [], None
    for kind, text in blocks:
        text = re.sub(r'\s+', ' ', text).strip()
        if not text:
            continue
        line = ('# ' + text) if kind == 'heading' else ('- ' + text) if kind == 'item' else text
        # consecutive list items stay together; everything else is separated by a blank line
        if out and not (kind == 'item' and prev == 'item'):
            out.append('')
        out.append(line)
        prev = kind
    return '\n'.join(out) + '\n'


# ---------- plain text ----------
def read_text_file(path):
    raw = open(path, 'rb').read()
    for enc in ('utf-8-sig', 'utf-16'):
        try:
            text = raw.decode(enc)
            if enc == 'utf-16' and not raw[:2] in (b'\xff\xfe', b'\xfe\xff'):
                raise UnicodeError
            return text
        except UnicodeError:
            pass
    try:
        return raw.decode('cp1256')  # Arabic Windows encoding, common in older files
    except UnicodeError:
        return raw.decode('utf-8', errors='replace')


def from_markdown(text):
    lines = []
    for line in text.splitlines():
        s = line.strip()
        s = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', s)          # images
        s = re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', s)       # links -> text
        if re.match(r'^\*\*[^*]+\*\*$', s):                   # whole bold line = heading
            s = '# ' + s.strip('*').strip()
        elif not re.match(r'^#{1,6}\s', s):
            s = re.sub(r'\*\*([^*]+)\*\*', r'\1', s)
        s = re.sub(r'^#{1,6}\s+', '# ', s)
        lines.append(s)
    return '\n'.join(lines)


# ---------- Word (.docx) ----------
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'


def from_docx(path):
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read('word/document.xml'))
        styles = {}
        if 'word/styles.xml' in z.namelist():
            for st in ET.fromstring(z.read('word/styles.xml')).iter(W + 'style'):
                sid = st.get(W + 'styleId')
                name = st.find(W + 'name')
                styles[sid] = (name.get(W + 'val') if name is not None else sid or '').lower()
    blocks = []
    body = root.find(W + 'body')
    for p in body.iter(W + 'p'):
        text = ''.join((t.text or '') if t.tag == W + 't' else ' ' for t in p.iter() if t.tag in (W + 't', W + 'tab', W + 'br'))
        ppr = p.find(W + 'pPr')
        kind = 'para'
        if ppr is not None:
            ps = ppr.find(W + 'pStyle')
            style = styles.get(ps.get(W + 'val'), ps.get(W + 'val').lower()) if ps is not None else ''
            if style.startswith('heading') or style == 'title' or 'عنوان' in style:
                kind = 'heading'
            elif ppr.find(W + 'numPr') is not None or 'list' in style:
                kind = 'item'
        blocks.append((kind, text))
    return blocks_to_text(blocks)


# ---------- OpenDocument (.odt) ----------
TX = '{urn:oasis:names:tc:opendocument:xmlns:text:1.0}'


def from_odt(path):
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read('content.xml'))
    blocks = []

    def walk(el, in_list=False):
        for ch in el:
            if ch.tag == TX + 'h':
                blocks.append(('heading', ''.join(ch.itertext())))
            elif ch.tag == TX + 'p':
                blocks.append(('item' if in_list else 'para', ''.join(ch.itertext())))
            elif ch.tag == TX + 'list':
                walk(ch, True)
            else:
                walk(ch, in_list)
    walk(root)
    return blocks_to_text(blocks)


# ---------- HTML ----------
def from_html(path):
    html = read_text_file(path)
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        BeautifulSoup = None
    if BeautifulSoup is None:
        html = re.sub(r'(?is)<(script|style|nav|footer|header|aside)[^>]*>.*?</\1>', '', html)
        html = re.sub(r'(?i)<h[1-6][^>]*>', '\n\n# ', html)
        html = re.sub(r'(?i)<li[^>]*>', '\n- ', html)
        html = re.sub(r'(?i)</(p|div|h[1-6]|li)>|<br\s*/?>', '\n\n', html)
        text = re.sub(r'<[^>]+>', '', html)
        import html as h
        return re.sub(r'\n{3,}', '\n\n', h.unescape(text))
    soup = BeautifulSoup(html, 'html.parser')
    for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'form', 'noscript']):
        tag.decompose()
    main = soup.find('article') or soup.find('main') or soup.body or soup
    blocks = []
    for el in main.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li']):
        if el.name == 'p' and el.find_parent('li'):
            continue
        kind = 'heading' if el.name[0] == 'h' else 'item' if el.name == 'li' else 'para'
        blocks.append((kind, el.get_text()))
    return blocks_to_text(blocks)


# ---------- conversions through other tools ----------
def convert_with_soffice(path, target):
    office = shutil.which('soffice') or shutil.which('libreoffice')
    if not office:
        return None
    out = tempfile.mkdtemp()
    subprocess.run([office, '--headless', '--convert-to', target, '--outdir', out, path],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
    for f in os.listdir(out):
        return os.path.join(out, f)
    return None


def from_rtf_or_doc(path, ext):
    converted = convert_with_soffice(path, 'docx')  # keeps headings and lists
    if converted:
        return from_docx(converted)
    if ext == '.rtf' and shutil.which('pandoc'):
        out = tempfile.mktemp(suffix='.docx')
        r = subprocess.run(['pandoc', path, '-o', out], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if r.returncode == 0 and os.path.exists(out):
            return from_docx(out)
    reject('لا أستطيع قراءة هذا النوع من ملفات وورد القديمة هنا. احفظ الملف بصيغة docx ثم ارفعه.')


# ---------- PDF ----------
def fix_pdf_text(text):
    # Arabic presentation forms (ﻻ ﺍ ...) -> normal letters
    text = unicodedata.normalize('NFKC', text)
    text = text.replace('ـ', '')  # tatweel used for justification
    text = re.sub('[‎‏‪-‮⁦-⁩]', '', text)  # direction marks
    text = re.sub(r'\(cid:\d+\)', '', text)
    text = re.sub('[\ud800-\udfff�]', '', text)
    lines = text.splitlines()
    # punctuation the PDF put at the start of a right-to-left line belongs at its end
    lines = [re.sub(r'^(\s*)([.،:؛!؟?]+)\s*(.+)$', r'\1\3\2', l) for l in lines]
    # " ،فهو" -> "، فهو": Arabic punctuation stuck to the next word instead of the previous one
    lines = [re.sub(r'\s([،.؛:!؟])(?=[ء-ي])', r'\1 ', l) for l in lines]
    # lam-alef ligature extracted in reverse: "اإلنسان" -> "الإنسان", "لإلنسان" -> "للإنسان"
    lines = [re.sub(r'(?<![ء-ي])([وفبك]?[ال])([أإآ])ل', r'\1ل\2', l) for l in lines]
    # the same ligature as a word on its own: "ال يمكن" -> "لا يمكن"
    lines = [re.sub(r'(?<![ء-ْ])ال(?![ء-ْ])', 'لا', l) for l in lines]
    # Some PDFs store Arabic in visual order (each line reversed). Detect it by how often
    # words end with "لا" (a reversed "ال") compared with how often they start with "ال".
    words = re.findall(r'[ء-ي]+', text)
    starts = sum(w.startswith('ال') for w in words)
    ends = sum(w.endswith('لا') for w in words)
    reversed_order = len(words) > 20 and ends > starts * 2
    if reversed_order:
        lines = [l[::-1] for l in lines]
    return '\n'.join(lines), reversed_order


def from_pdf(path):
    text = ''
    if shutil.which('pdftotext'):
        r = subprocess.run(['pdftotext', '-enc', 'UTF-8', path, '-'], capture_output=True)
        text = r.stdout.decode('utf-8', errors='replace')
    if len(ARABIC.findall(text)) < 20:
        try:
            import pdfplumber
            with pdfplumber.open(path) as pdf:
                text = '\n\n'.join((pg.extract_text() or '') for pg in pdf.pages)
        except Exception:
            try:
                from pypdf import PdfReader
                text = '\n\n'.join((pg.extract_text() or '') for pg in PdfReader(path).pages)
            except Exception:
                pass
    text = text.replace('\f', '\n\n')
    if len(re.sub(r'\s', '', text)) < 40:
        reject('هذا الملف صورة ممسوحة ضوئيًا وليس فيه نص يمكن نسخه. هذه النسخة تدعم ملفات PDF النصية فقط. جرّب نسخ النص ولصقه.')
    text, reversed_order = fix_pdf_text(text)
    # page numbers alone on a line
    text = re.sub(r'(?m)^\s*[\d٠-٩]{1,4}\s*$', '', text)
    return text, reversed_order


def write_meta(dst, src, ext):
    """Notes the file name and type next to the extracted text (meta.json), for publish.js."""
    meta_file = os.path.join(os.path.dirname(os.path.abspath(dst)), 'meta.json')
    try:
        with open(meta_file, encoding='utf-8') as f:
            meta = json.load(f)
    except (OSError, ValueError):
        meta = {}
    meta['source'] = {'type': 'file', 'fileName': os.path.basename(src)}
    meta['fileType'] = ext.lstrip('.') or 'txt'
    meta['reviewed'] = ext == '.pdf'
    try:
        with open(meta_file, 'w', encoding='utf-8') as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)
    except OSError:
        pass


def main():
    if len(sys.argv) != 3:
        print('Usage: python3 scripts/extract.py <file> <output.txt>')
        sys.exit(1)
    src, dst = sys.argv[1], sys.argv[2]
    ext = os.path.splitext(src)[1].lower()
    note = ''
    if ext in ('.txt', '.text', ''):
        text = read_text_file(src)
    elif ext in ('.md', '.markdown'):
        text = from_markdown(read_text_file(src))
    elif ext == '.docx':
        text = from_docx(src)
    elif ext == '.odt':
        text = from_odt(src)
    elif ext in ('.rtf', '.doc'):
        text = from_rtf_or_doc(src, ext)
    elif ext in ('.html', '.htm'):
        text = from_html(src)
    elif ext == '.pdf':
        text, reversed_order = from_pdf(src)
        note = ' — REVIEW: compare with the PDF and fix extraction errors only'
    elif ext in ('.png', '.jpg', '.jpeg', '.webp', '.gif', '.heic'):
        reject('الصور غير مدعومة في هذه النسخة. انسخ النص والصقه، أو ارفعه في ملف نصي أو وورد أو PDF.')
    else:
        reject('صيغة الملف غير مدعومة. الصيغ المدعومة: txt وmd وdocx وodt وrtf وdoc وhtml وpdf.')

    text = text.replace('\r\n', '\n').replace('\r', '\n')
    text = re.sub(r'\n{3,}', '\n\n', text).strip() + '\n'
    if not ARABIC.search(text):
        reject('لم أجد نصًا عربيًا في الملف.')
    with open(dst, 'w', encoding='utf-8') as f:
        f.write(text)
    write_meta(dst, src, ext)
    words = len(text.split())
    print(f'OK — {ext or "txt"} — {words} words{note}')


if __name__ == '__main__':
    main()
