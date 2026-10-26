import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../auth/auth.service';
import { HOME_URL } from '../../auth/return-url';
import { listRoles } from '../../auth/user-profile';
import { Icon } from '../../shared/icon';

/** Shown to signed-in users whose account has none of the accepted admin roles. */
@Component({
  selector: 'app-access-denied-page',
  imports: [Icon],
  templateUrl: './access-denied-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessDeniedPage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly roles = computed(() => {
    const user = this.auth.user();
    return user ? listRoles(user) : [];
  });
  protected readonly checking = signal(false);
  protected readonly stillDenied = signal(false);

  /** Gets a fresh token, which carries any role granted since sign-in. */
  protected async checkAgain(): Promise<void> {
    this.checking.set(true);
    this.stillDenied.set(false);
    try {
      await this.auth.refreshSession();
    } catch {
      // Judged on the current token below; an ended session sends the user to sign in.
    }
    this.checking.set(false);

    if (!this.auth.isAuthenticated()) {
      await this.router.navigate(['/login'], { queryParams: { reason: 'expired' } });
    } else if (this.auth.isAdmin()) {
      await this.router.navigateByUrl(HOME_URL);
    } else {
      this.stillDenied.set(true);
    }
  }

  protected useAnotherAccount(): void {
    void this.auth.login(HOME_URL, { forceLoginForm: true });
  }

  protected signOut(): void {
    void this.auth.logout();
  }
}
