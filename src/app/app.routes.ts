import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell').then((module) => module.Shell),
    children: [
      {
        path: '',
        title: 'Obras · ManConstruc',
        loadComponent: () => import('./pages/dashboard/dashboard').then((module) => module.DashboardPage)
      },
      {
        path: 'obras/nueva',
        title: 'Nueva obra · ManConstruc',
        loadComponent: () =>
          import('./pages/work-editor/work-editor').then((module) => module.WorkEditorPage)
      },
      {
        path: 'obras/:id',
        title: 'Editar obra · ManConstruc',
        loadComponent: () =>
          import('./pages/work-editor/work-editor').then((module) => module.WorkEditorPage)
      }
    ]
  },
  {
    path: 'entrar',
    title: 'Entrar · ManConstruc',
    canActivate: [guestGuard],
    data: { mode: 'login' },
    loadComponent: () => import('./pages/auth/auth-page').then((module) => module.AuthPage)
  },
  {
    path: 'registro',
    title: 'Crear cuenta · ManConstruc',
    canActivate: [guestGuard],
    data: { mode: 'register' },
    loadComponent: () => import('./pages/auth/auth-page').then((module) => module.AuthPage)
  },
  { path: '**', redirectTo: '' }
];
