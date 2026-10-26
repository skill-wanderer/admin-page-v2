import { ChangeDetectionStrategy, Component, DOCUMENT, inject, input, signal } from '@angular/core';

import { AuthService } from '../../auth/auth.service';
import { safeReturnUrl } from '../../auth/return-url';
import { RUNTIME_CONFIG } from '../../config/runtime-config';
import { Icon } from '../../shared/icon';

/** The gate in front of the admin: hands off to Skill-Wanderer SSO (Keycloak) to sign in. */
@Component({
  selector: 'app-login-page',
  imports: [Icon],
  templateUrl: './login-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  protected readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);

  // Query parameters, bound by withComponentInputBinding().
  readonly returnUrl = input<string>();
  readonly signedOut = input<string>();
  readonly reason = input<string>();

  protected readonly redirecting = signal(false);
  protected readonly ssoHost = new URL(inject(RUNTIME_CONFIG).keycloak.url).host;

  protected signIn(): void {
    this.redirecting.set(true);
    this.auth.login(safeReturnUrl(this.returnUrl())).catch(() => this.redirecting.set(false));
  }

  protected retry(): void {
    this.document.location.reload();
  }
}
