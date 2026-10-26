import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthService, type AuthStatus } from '../../auth/auth.service';
import { RUNTIME_CONFIG } from '../../config/runtime-config';
import { LoginPage } from './login-page';

async function render(
  status: AuthStatus,
  inputs: Partial<Record<'returnUrl' | 'signedOut' | 'reason', string>> = {},
  error: string | null = null,
) {
  const login = vi.fn().mockResolvedValue(undefined);
  TestBed.configureTestingModule({
    imports: [LoginPage],
    providers: [
      { provide: AuthService, useValue: { status: signal(status), error: signal(error), login } },
      {
        provide: RUNTIME_CONFIG,
        useValue: {
          keycloak: {
            url: 'https://sso.skill-wanderer.com',
            realm: 'client-portal',
            clientId: 'admin',
          },
          adminRoles: ['admin'],
          apiBaseUrl: null,
        },
      },
    ],
  });

  const fixture = TestBed.createComponent(LoginPage);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return { fixture, page: fixture.nativeElement as HTMLElement, login };
}

const button = (page: HTMLElement) => page.querySelector<HTMLButtonElement>('button.btn-primary')!;

describe('LoginPage', () => {
  it('signs in with SSO and comes back to the page the admin asked for', async () => {
    const { fixture, page, login } = await render('unauthenticated', { returnUrl: '/account' });

    expect(button(page).textContent).toContain('Sign in with SSO');
    expect(page.textContent).toContain('sso.skill-wanderer.com');

    button(page).click();
    await fixture.whenStable();

    expect(login).toHaveBeenCalledWith('/account');
    expect(button(page).disabled).toBe(true);
    expect(button(page).textContent).toContain('Redirecting');
  });

  it('ignores return URLs that leave the app', async () => {
    const { page, login } = await render('unauthenticated', { returnUrl: '//evil.example' });

    button(page).click();

    expect(login).toHaveBeenCalledWith('/dashboard');
  });

  it('offers a retry and explains why when SSO is unreachable', async () => {
    const { page, login } = await render(
      'unavailable',
      {},
      "Skill-Wanderer SSO didn't answer in time.",
    );

    expect(page.querySelector('[role="alert"]')?.textContent).toContain("didn't answer in time");
    expect(button(page).textContent).toContain('Try again');
    expect(login).not.toHaveBeenCalled();
  });

  it('confirms a sign-out', async () => {
    const { page } = await render('unauthenticated', { signedOut: '1' });

    expect(page.querySelector('[role="status"]')?.textContent).toContain("You've signed out");
  });
});
