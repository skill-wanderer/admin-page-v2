import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import { Icon } from '../../shared/icon';
import { PageHeader } from '../../shared/page-header';

type ClientStatus = 'active' | 'trial' | 'paused';

interface SampleClient {
  name: string;
  contact: string;
  plan: string;
  status: ClientStatus;
  updated: string;
}

const SAMPLE_CLIENTS: readonly SampleClient[] = [
  {
    name: 'Lantern Bakery',
    contact: 'mai@lantern.example',
    plan: 'Website',
    status: 'active',
    updated: '2026-10-21',
  },
  {
    name: 'Ridgeway Physio',
    contact: 'tom@ridgeway.example',
    plan: 'AI assistant',
    status: 'trial',
    updated: '2026-10-18',
  },
  {
    name: 'Kettle & Co.',
    contact: 'hello@kettle.example',
    plan: 'Website',
    status: 'paused',
    updated: '2026-09-30',
  },
  {
    name: 'Open Trail Tutors',
    contact: 'an@opentrail.example',
    plan: 'Website + AI',
    status: 'active',
    updated: '2026-10-25',
  },
];

/** Living reference of the shared classes in styles.css, for building new admin screens. */
@Component({
  selector: 'app-ui-kit-page',
  imports: [DatePipe, Icon, PageHeader],
  templateUrl: './ui-kit-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiKitPage {
  protected readonly query = signal('');
  protected readonly clients = computed(() => {
    const query = this.query().trim().toLowerCase();
    return SAMPLE_CLIENTS.filter(
      (client) =>
        client.name.toLowerCase().includes(query) || client.contact.toLowerCase().includes(query),
    );
  });

  protected readonly statusBadge: Record<ClientStatus, string> = {
    active: 'badge-success',
    trial: 'badge-info',
    paused: 'badge-warning',
  };
}
