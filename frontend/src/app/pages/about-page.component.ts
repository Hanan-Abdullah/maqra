import { BreadcrumbsComponent } from '../layout/breadcrumbs.component';
import { Component } from '@angular/core';

/** «عن مَقرأ»: also the home page, so someone opening the site without a text link learns what it is. */
@Component({
  imports: [BreadcrumbsComponent],
  selector: 'app-about-page',
  template: `
    <section class="hero hero-sm" aria-labelledby="about-title">
      <div class="container"><app-breadcrumbs current="عن مَقرأ" /><h1 id="about-title">عن مَقرأ</h1></div>
    </section>
    <div class="container">
      <article class="about">
        <p>مَقرأ أداةٌ من مجمع الملك سلمان العالمي للغة العربية، تُعين القارئ على قراءة النصوص العربية وفهمها بيُسر.</p>
        <p>يحلِّل مَقرأ النصَّ بالذكاء الاصطناعي، فيقسِّمه إلى وحداتٍ قرائية قصيرة، لكلٍّ منها عنوانٌ وملخص، ويستخلص أفكاره الرئيسية، ويشرح مصطلحاته بذكر معناها ومثالٍ يوضّحها، ويميِّز جُمَله المهمة، ويختم كلَّ وحدة بسؤالٍ يتحقّق به القارئ من فهمه.</p>
        <p>ويقوم مَقرأ على مبدأٍ ثابت، هو أنّ كلام الكاتب لا يتغيّر؛ فكلُّ جملةٍ في الصفحة هي جملة الكاتب نفسها بلا زيادةٍ ولا نقص، وما يضيفه التحليل من ملخصاتٍ وشروح يظهر منفصلًا عن النص حتى يميّزه القارئ.</p>
        <p>ويعرض مَقرأ النصَّ في ثلاثة أنماطٍ يتنقّل القارئ بينها متى شاء: «النص الأصلي» كما كتبه صاحبه، و«العرض الميسّر» الذي يجمع النص وتحليله في وحداتٍ متتابعة، و«النص والحواشي» الذي يضع الشروح بجانب مواضعها من النص.</p>
      </article>
    </div>`,
  styles: `
    .about { max-width: 45rem; padding-block: 2.5rem 0; }
    .about p { margin: 0 0 1.25rem; font-size: 1.25rem; line-height: 2.25rem; color: var(--text-default); }`,
})
export class AboutPageComponent {}
