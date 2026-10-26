import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Eyebrow, gradient title and intro of a page, as on skill-wanderer.com. Projected content becomes the page actions. */
@Component({
  selector: 'app-page-header',
  template: `
    <div class="min-w-0">
      <p class="eyebrow">{{ eyebrow() }}</p>
      <h1 class="title text-gradient">{{ heading() }}</h1>
      @if (description(); as text) {
        <p class="description">{{ text }}</p>
      }
    </div>
    <div class="actions"><ng-content /></div>
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 20px 32px;
      margin-bottom: 40px;
    }

    .title {
      /* Sized to the text, so the orange-to-yellow gradient spans the words. */
      width: fit-content;
      margin-top: 8px;
      font-size: clamp(1.9rem, 4vw, 2.6rem);
      font-weight: 800;
      line-height: 1.15;
      text-wrap: balance;
    }

    .description {
      max-width: 720px;
      margin-top: 12px;
      font-size: clamp(1rem, 1.6vw, 1.1rem);
      line-height: 1.75;
      opacity: 0.85;
    }

    .actions:empty {
      display: none;
    }

    @media (max-width: 768px) {
      :host {
        margin-bottom: 28px;
      }

      .actions {
        width: 100%;
      }
    }
  `,
  host: { class: 'animate-fade-in-up' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
  readonly eyebrow = input.required<string>();
  readonly heading = input.required<string>();
  readonly description = input<string>();
}
