import { Component, CUSTOM_ELEMENTS_SCHEMA, computed, input, output, signal } from '@angular/core';
import { ReadingDocument, authorSections, documentTitle } from '../core/reading-document';
import { count } from '../core/arabic';
import { MODES, Mode, leadFor } from './modes';

interface MetaCard { icon: string; tone: 'green' | 'gold' | 'lavender'; value: string; label: string; }

/** The green band of the reading page: mode badge, share and print, title, the mode's line, number cards. */
@Component({
  selector: 'app-reading-hero',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './reading-hero.component.html',
  styleUrl: './reading-hero.component.css',
})
export class ReadingHeroComponent {
  readonly doc = input.required<ReadingDocument>();
  readonly mode = input.required<Mode>();
  /** The reader wants to report a mistake in the analysis. */
  readonly report = output<void>();

  protected readonly modeInfo = computed(() => MODES.find((m) => m.id === this.mode())!);
  protected readonly title = computed(() => documentTitle(this.doc(), this.mode() === 'original'));
  protected readonly lead = computed(() => leadFor(this.mode(), this.doc()));

  // A card only for what this text has: units when it is split, terms when there are any, author sections in the original.
  protected readonly cards = computed<MetaCard[]>(() => {
    const doc = this.doc();
    const cards: MetaCard[] = [
      { icon: 'file-01', tone: 'green', value: count(doc.text.wordCount, 'كلمة واحدة', 'كلمتان', 'كلمات', 'كلمة'), label: 'طول النص' },
    ];
    if (this.mode() === 'original') {
      const sections = authorSections(doc).length;
      if (sections) cards.push({ icon: 'layers-01', tone: 'lavender', value: count(sections, 'قسم واحد', 'قسمان', 'أقسام', 'قسمًا', 'قسم'), label: 'في هذا النص' });
      return cards;
    }
    const units = doc.analysis.readingUnits.length;
    if (units > 1) cards.push({ icon: 'layers-01', tone: 'gold', value: count(units, 'وحدة واحدة', 'وحدتان', 'وحدات', 'وحدة'), label: 'وحدات القراءة' });
    const terms = doc.analysis.terms.length;
    if (terms && doc.display?.showTerms !== false) {
      cards.push({
        icon: 'translation', tone: 'lavender',
        value: count(terms, 'مصطلح واحد', 'مصطلحان', 'مصطلحات', 'مصطلحًا', 'مصطلح'),
        label: terms === 1 ? 'مشروح في النص' : terms === 2 ? 'مشروحان في النص' : 'مشروحة في النص',
      });
    }
    return cards;
  });

  protected readonly toast = signal('');
  private toastTimer?: ReturnType<typeof setTimeout>;

  share(): void {
    const data = { title: document.title, text: this.title(), url: location.href };
    if (navigator.share) {
      // The reader closing the share sheet is not an error; anything else (blocked, unsupported) falls back to copying.
      navigator.share(data).catch((err: unknown) => { if (!(err instanceof DOMException && err.name === 'AbortError')) this.copyLink(); });
      return;
    }
    this.copyLink();
  }

  print(): void {
    let embedded = true;
    try { embedded = window.self !== window.top; } catch { /* cross-origin parent */ }
    if (embedded) this.showToast('إن لم تظهر نافذة الطباعة، افتح الصفحة في المتصفح ثم اطبعها');
    window.print();
  }

  private copyLink(): void {
    const url = location.href;
    const legacy = () => {
      const ta = document.createElement('textarea');
      ta.value = url; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { /* not allowed */ }
      ta.remove();
      this.showToast(ok ? 'نُسخ رابط الصفحة' : 'تعذّر نسخ الرابط، انسخه من شريط العنوان');
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(() => this.showToast('نُسخ رابط الصفحة'), legacy);
    else legacy();
  }

  private showToast(message: string): void {
    this.toast.set(message);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(''), 2500);
  }
}
