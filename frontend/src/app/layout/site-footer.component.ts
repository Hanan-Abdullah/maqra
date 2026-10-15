import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ACADEMY, SOCIAL } from '../core/academy';

/** Green footer: Maqra's name, page links, the academy's accounts and the rights line. */
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.css',
})
export class SiteFooterComponent {
  protected readonly academy = ACADEMY;
  protected readonly social = SOCIAL;
}
