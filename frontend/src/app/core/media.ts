import { DestroyRef, Signal, inject, signal } from '@angular/core';

/** A signal that follows a CSS media query (call inside an injection context, e.g. a field initialiser). */
export function mediaSignal(query: string): Signal<boolean> {
  const list = matchMedia(query);
  const value = signal(list.matches);
  const onChange = (e: MediaQueryListEvent) => value.set(e.matches);
  list.addEventListener('change', onChange);
  inject(DestroyRef).onDestroy(() => list.removeEventListener('change', onChange));
  return value.asReadonly();
}
