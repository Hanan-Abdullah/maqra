import { Routes } from '@angular/router';

export const routes: Routes = [
  // The home page shows «عن مَقرأ»: readers normally arrive through a text link.
  { path: '', title: 'مَقرأ', loadComponent: () => import('./pages/about-page.component').then((m) => m.AboutPageComponent) },
  { path: 'about', redirectTo: '' },
  {
    path: 'read/:id',
    loadComponent: () => import('./reading/reading-page.component').then((m) => m.ReadingPageComponent),
  },
  { path: '**', title: 'الصفحة غير موجودة · مَقرأ', loadComponent: () => import('./pages/not-found-page.component').then((m) => m.NotFoundPageComponent) },
];
