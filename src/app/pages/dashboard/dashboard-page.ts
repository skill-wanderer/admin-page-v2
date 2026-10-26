import type { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { type ApiProblem, describeApiError } from '../../api/api-error';
import { type ApiUser, MeApi } from '../../api/me-api';
import { AuthService } from '../../auth/auth.service';
import { RUNTIME_CONFIG } from '../../config/runtime-config';
import { Icon } from '../../shared/icon';
import { PageHeader } from '../../shared/page-header';

type ApiCheck =
  | { state: 'off' }
  | { state: 'checking' }
  | { state: 'ok'; user: ApiUser }
  | ({ state: 'failed' } & ApiProblem);

@Component({
  selector: 'app-dashboard-page',
  imports: [Icon, PageHeader, RouterLink],
  templateUrl: './dashboard-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  protected readonly auth = inject(AuthService);
  protected readonly apiBaseUrl = inject(RUNTIME_CONFIG).apiBaseUrl;
  protected readonly apiCheck = signal<ApiCheck>({ state: 'off' });

  private readonly meApi = inject(MeApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly appOrigin = inject(DOCUMENT).location.origin;
  private readonly now = signal(Date.now());

  protected readonly welcome = computed(
    () => `Welcome back, ${this.auth.user()?.firstName ?? 'admin'}!`,
  );

  /** Time left on the access token as m:ss; keycloak-js renews the token when it runs out. */
  protected readonly tokenTimeLeft = computed(() => {
    const expiresAt = this.auth.session()?.tokenExpiresAt ?? 0;
    const seconds = Math.max(0, Math.round((expiresAt - this.now()) / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  });

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
    this.checkApi();
  }

  protected checkApi(): void {
    if (!this.apiBaseUrl) {
      return;
    }
    const apiBaseUrl = this.apiBaseUrl;

    this.apiCheck.set({ state: 'checking' });
    this.meApi
      .getMe()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => this.apiCheck.set({ state: 'ok', user }),
        error: (error: HttpErrorResponse) =>
          this.apiCheck.set({
            state: 'failed',
            ...describeApiError(error, apiBaseUrl, this.appOrigin),
          }),
      });
  }
}
