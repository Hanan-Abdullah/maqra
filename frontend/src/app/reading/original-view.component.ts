import { Component, CUSTOM_ELEMENTS_SCHEMA, computed, input } from '@angular/core';
import { ReadingDocument, authorSections, titleBlock } from '../core/reading-document';

/** «النص الأصلي»: the author's text exactly as written, nothing from the analysis. */
@Component({
  selector: 'app-original-view',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="layout" [class.solo]="!sections().length">
      @if (sections().length) {
        <div class="toc">
          <dga-table-of-content [title]="tocTitle()" sub-title="المحتويات" [sections]="sections()" [rtl]="true"></dga-table-of-content>
        </div>
      }
      <article class="doc">
        @for (b of blocks(); track b.id) {
          @switch (b.type) {
            @case ('heading') { <h2 [id]="'sec-' + b.id">{{ b.text }}</h2> }
            @case ('list') {
              @if (b.ordered) {
                <ol class="plain">@for (it of b.items; track it.id) { <li>{{ it.text }}</li> }</ol>
              } @else {
                <ul class="plain">@for (it of b.items; track it.id) { <li>{{ it.text }}</li> }</ul>
              }
            }
            @default { <p>{{ b.text }}</p> }
          }
        }
      </article>
    </div>`,
  styleUrl: './original-view.component.css',
})
export class OriginalViewComponent {
  readonly doc = input.required<ReadingDocument>();

  // The title is already in the green band, so the text starts after it.
  protected readonly blocks = computed(() => {
    const title = titleBlock(this.doc());
    return this.doc().text.blocks.filter((b) => b !== title);
  });
  protected readonly sections = computed(() => authorSections(this.doc()).map((h) => ({ Name: h.text ?? '', Target: 'sec-' + h.id })));
  protected readonly tocTitle = computed(() => titleBlock(this.doc())?.text ?? 'المحتويات');
}
