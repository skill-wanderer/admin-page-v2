import type { Routes } from '@angular/router';

import { adminGuard, signedInGuard, signedOutGuard } from './auth/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in',
    canActivate: [signedOutGuard],
    loadComponent: () => import('./pages/login/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'access-denied',
    title: 'Access denied',
    canActivate: [signedInGuard],
    loadComponent: () =>
      import('./pages/access-denied/access-denied-page').then((m) => m.AccessDeniedPage),
  },
  {
    // Everything else is the admin itself: signed in, with an admin role.
    path: '',
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    loadComponent: () => import('./layout/admin-shell').then((m) => m.AdminShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'account',
        title: 'Your account',
        loadComponent: () => import('./pages/account/account-page').then((m) => m.AccountPage),
      },
      {
        path: 'ui-kit',
        title: 'UI kit',
        loadComponent: () => import('./pages/ui-kit/ui-kit-page').then((m) => m.UiKitPage),
      },
      {
        path: '**',
        title: 'Page not found',
        loadComponent: () => import('./pages/not-found/not-found-page').then((m) => m.NotFoundPage),
      },
    ],
  },
];
