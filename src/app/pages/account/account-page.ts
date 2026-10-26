import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { AuthService } from '../../auth/auth.service';
import { listRoles } from '../../auth/user-profile';
import { RUNTIME_CONFIG } from '../../config/runtime-config';
import { Icon } from '../../shared/icon';
import { PageHeader } from '../../shared/page-header';

@Component({
  selector: 'app-account-page',
  imports: [DatePipe, Icon, PageHeader],
  templateUrl: './account-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPage {
  protected readonly auth = inject(AuthService);
  protected readonly keycloak = inject(RUNTIME_CONFIG).keycloak;

  protected readonly roles = computed(() => {
    const user = this.auth.user();
    return user ? listRoles(user) : [];
  });

  protected signOut(): void {
    void this.auth.logout();
  }
}
