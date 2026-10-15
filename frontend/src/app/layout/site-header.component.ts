import { Component, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../core/theme.service';
import { ZoomService } from '../core/zoom.service';

/** Gray accessibility bar (text size, theme) and the white header with Maqra's and the academy's logos. */
@Component({
  selector: 'app-site-header',
  imports: [RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.css',
})
export class SiteHeaderComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly zoom = inject(ZoomService);
}
