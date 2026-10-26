import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { Icon, type IconName } from '../shared/icon';

interface NavGroup {
  label: string;
  items: readonly { label: string; path: string; icon: IconName }[];
}

/** The sidebar navigation. Add new admin sections here and as child routes in app.routes.ts. */
const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: 'layout-dashboard' },
      { label: 'Your account', path: '/account', icon: 'circle-user-round' },
    ],
  },
  {
    label: 'Developer',
    items: [{ label: 'UI kit', path: '/ui-kit', icon: 'palette' }],
  },
];

/**
 * Layout of every signed-in admin page: a sidebar on desktop, and below 1024px the site's
 * fixed top bar whose menu button slides the same navigation down as a panel.
 */
@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closeMenu(true)' },
})
export class AdminShell {
  protected readonly auth = inject(AuthService);
  protected readonly navGroups = NAV_GROUPS;
  protected readonly menuOpen = signal(false);

  private readonly router = inject(Router);
  private readonly menuToggle = viewChild.required<ElementRef<HTMLButtonElement>>('menuToggle');
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  constructor() {
    const document = inject(DOCUMENT);
    const destroyRef = inject(DestroyRef);

    // Close the mobile menu once one of its links has been followed.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuOpen.set(false));

    // Keep the page behind the open menu from scrolling.
    effect(() => document.body.classList.toggle('scroll-locked', this.menuOpen()));
    destroyRef.onDestroy(() => document.body.classList.remove('scroll-locked'));

    // The menu only exists below the desktop breakpoint; close it if the window grows past it.
    const desktop = document.defaultView?.matchMedia?.('(min-width: 64rem)');
    const closeOnDesktop = (event: MediaQueryListEvent) =>
      event.matches && this.menuOpen.set(false);
    desktop?.addEventListener('change', closeOnDesktop);
    destroyRef.onDestroy(() => desktop?.removeEventListener('change', closeOnDesktop));

    // Leave the admin when Keycloak ends the session, e.g. after signing out in another app.
    effect(() => {
      if (this.auth.status() === 'unauthenticated') {
        untracked(() =>
          this.router.navigate(['/login'], {
            queryParams: { reason: 'expired', returnUrl: this.router.url },
          }),
        );
      }
    });
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(restoreFocus = false): void {
    if (!this.menuOpen()) {
      return;
    }
    this.menuOpen.set(false);
    if (restoreFocus) {
      this.menuToggle().nativeElement.focus();
    }
  }

  /** The skip link focuses <main> directly; a plain #main link would resolve against <base href>. */
  protected skipToContent(event: Event): void {
    event.preventDefault();
    this.main().nativeElement.focus();
  }

  protected signOut(): void {
    void this.auth.logout();
  }
}
