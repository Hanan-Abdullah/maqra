import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteHeaderComponent } from './layout/site-header.component';
import { SiteFooterComponent } from './layout/site-footer.component';
import { PageFeedbackComponent } from './layout/page-feedback.component';
import { LastTextService } from './core/last-text.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeaderComponent, SiteFooterComponent, PageFeedbackComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  // started with the app so it sees every navigation (the breadcrumbs need the page the reader came from)
  private readonly lastText = inject(LastTextService);

  // With routing, "#main" would change the address; move the focus to the content instead.
  skipToMain(event: Event): void {
    event.preventDefault();
    const main = document.getElementById('main');
    main?.focus();
    main?.scrollIntoView();
  }
}
