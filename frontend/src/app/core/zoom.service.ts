import { Injectable, computed, signal } from '@angular/core';

const STEPS = [100, 112.5, 125, 137.5, 150];
const KEY = 'maqra:zoom';

/** Text size. Everything is sized in rem, so changing the root font size scales the whole page. */
@Injectable({ providedIn: 'root' })
export class ZoomService {
  private readonly step = signal(this.restore());
  readonly canZoomIn = computed(() => this.step() < STEPS.length - 1);
  readonly canZoomOut = computed(() => this.step() > 0);

  constructor() { this.apply(); }

  zoomIn(): void { if (this.canZoomIn()) { this.step.update((s) => s + 1); this.apply(); } }
  zoomOut(): void { if (this.canZoomOut()) { this.step.update((s) => s - 1); this.apply(); } }

  private apply(): void {
    const size = STEPS[this.step()];
    document.documentElement.style.fontSize = size + '%';
    try { localStorage.setItem(KEY, String(size)); } catch { /* not saved */ }
  }

  private restore(): number {
    let saved: string | null = null;
    try { saved = localStorage.getItem(KEY); } catch { /* not available */ }
    const i = STEPS.indexOf(Number(saved));
    return i < 0 ? 0 : i;
  }
}
