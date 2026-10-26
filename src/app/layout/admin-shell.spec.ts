import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthService, type AuthStatus } from '../auth/auth.service';
import type { UserProfile } from '../auth/user-profile';
import { AdminShell } from './admin-shell';

const user: UserProfile = {
  id: 'user-1',
  username: 'admin',
  name: 'Ada Admin',
  firstName: 'Ada',
  email: 'admin@example.com',
  emailVerified: true,
  initials: 'AA',
  realmRoles: ['admin'],
  clientRoles: {},
};

describe('AdminShell', () => {
  let status: ReturnType<typeof signal<AuthStatus>>;

  async function render() {
    status = signal<AuthStatus>('authenticated');
    TestBed.configureTestingModule({
      imports: [AdminShell],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { status, user: signal(user), logout: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(AdminShell);
    await fixture.whenStable();
    const shell = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      shell,
      toggle: shell.querySelector<HTMLButtonElement>('.nav-toggle')!,
      sidebar: shell.querySelector<HTMLElement>('.sidebar')!,
    };
  }

  afterEach(() => document.body.classList.remove('scroll-locked'));

  it('shows the navigation and the signed-in admin', async () => {
    const { shell } = await render();

    const links = [...shell.querySelectorAll('.nav-item')].map((link) => link.textContent?.trim());
    expect(links).toEqual(['Dashboard', 'Your account', 'UI kit']);
    expect(shell.querySelector('.user-name')?.textContent).toBe('Ada Admin');
  });

  it('opens the mobile menu and closes it with Escape, returning focus to the button', async () => {
    const { fixture, toggle, sidebar } = await render();

    toggle.click();
    await fixture.whenStable();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Close menu');
    expect(sidebar.classList).toContain('is-open');
    expect(document.body.classList).toContain('scroll-locked');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(sidebar.classList).not.toContain('is-open');
    expect(document.body.classList).not.toContain('scroll-locked');
    expect(document.activeElement).toBe(toggle);
  });

  it('leaves the admin for the sign-in page when the SSO session ends', async () => {
    const { fixture } = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    status.set('unauthenticated');
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { reason: 'expired', returnUrl: '/' },
    });
  });
});
