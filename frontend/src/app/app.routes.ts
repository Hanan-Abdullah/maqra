import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'read/:id',
    loadComponent: () => import('./reading/reading-page.component').then((m) => m.ReadingPageComponent),
  },
];
