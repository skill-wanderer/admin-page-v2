import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  type ActivatedRouteSnapshot,
  Router,
  type RouterStateSnapshot,
  UrlTree,
  convertToParamMap,
  provideRouter,
} from '@angular/router';

import { adminGuard, signedInGuard, signedOutGuard } from './auth.guards';
import { AuthService } from './auth.service';

function setup(session: { authenticated: boolean; admin: boolean }): Router {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: AuthService,
        useValue: {
          isAuthenticated: signal(session.authenticated),
          isAdmin: signal(session.admin),
        },
      },
    ],
  });
  return TestBed.inject(Router);
}

function runAdminGuard(url: string) {
  return TestBed.runInInjectionContext(() =>
    adminGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  );
}

function runSignedOutGuard(returnUrl?: string) {
  const route = { queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}) };
  return TestBed.runInInjectionContext(() =>
    signedOutGuard(route as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  );
}

const asUrl = (router: Router, result: unknown) => router.serializeUrl(result as UrlTree);

describe('adminGuard', () => {
  it('sends signed-out visitors to sign in and remembers where they were going', () => {
    const router = setup({ authenticated: false, admin: false });

    expect(asUrl(router, runAdminGuard('/account?tab=roles'))).toBe(
      '/login?returnUrl=%2Faccount%3Ftab%3Droles',
    );
  });

  it('keeps the sign-in URL clean for the default landing page', () => {
    const router = setup({ authenticated: false, admin: false });

    expect(asUrl(router, runAdminGuard('/dashboard'))).toBe('/login');
  });

  it('sends signed-in users without an admin role to access denied', () => {
    const router = setup({ authenticated: true, admin: false });

    expect(asUrl(router, runAdminGuard('/dashboard'))).toBe('/access-denied');
  });

  it('lets admins in', () => {
    setup({ authenticated: true, admin: true });

    expect(runAdminGuard('/dashboard')).toBe(true);
  });
});

describe('signedInGuard', () => {
  it('sends signed-out visitors to sign in', () => {
    const router = setup({ authenticated: false, admin: false });
    const result = TestBed.runInInjectionContext(() =>
      signedInGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

    expect(asUrl(router, result)).toBe('/login');
  });
});

describe('signedOutGuard', () => {
  it('shows the sign-in page to signed-out visitors', () => {
    setup({ authenticated: false, admin: false });

    expect(runSignedOutGuard('/account')).toBe(true);
  });

  it('sends signed-in users on to their return URL', () => {
    const router = setup({ authenticated: true, admin: true });

    expect(asUrl(router, runSignedOutGuard('/account'))).toBe('/account');
  });

  it('ignores return URLs that leave the app', () => {
    const router = setup({ authenticated: true, admin: true });

    expect(asUrl(router, runSignedOutGuard('//evil.example'))).toBe('/dashboard');
  });
});
