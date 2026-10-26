import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, throwError } from 'rxjs';

import { RUNTIME_CONFIG } from '../config/runtime-config';

/** The signed-in user as the API sees them (`GET /api/v1/me` in client-portal-v3-be). */
export interface ApiUser {
  id: string | null;
  userName: string | null;
  email: string | null;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class MeApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(RUNTIME_CONFIG).apiBaseUrl;

  /** Checks the whole chain: Keycloak token, audience mapper, CORS and the API itself. */
  getMe(): Observable<ApiUser> {
    if (!this.baseUrl) {
      return throwError(() => new Error('API_BASE_URL is not set.'));
    }
    return this.http.get<ApiUser>(`${this.baseUrl}/api/v1/me`);
  }
}
