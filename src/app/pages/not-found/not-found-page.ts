import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-not-found-page',
  imports: [Icon, RouterLink],
  template: `
    <section
      class="card empty-state mx-auto max-w-[560px] animate-fade-in-up"
      aria-labelledby="not-found-title"
    >
      <span class="icon-badge"><app-icon name="compass" [size]="26" /></span>
      <p class="eyebrow">404</p>
      <h1 id="not-found-title" class="auth-title text-gradient">This path isn't on the map</h1>
      <p class="max-w-[420px]">
        The page you're looking for doesn't exist or has moved. Let's get you back on the trail.
      </p>
      <a routerLink="/dashboard" class="btn btn-primary btn-sm mt-2">Back to the dashboard</a>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {}
