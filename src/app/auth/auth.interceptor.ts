import { DOCUMENT, inject } from '@angular/core';
import type { HttpInterceptorFn } from '@angular/common/http';
import { from, switchMap } from 'rxjs';

import { RUNTIME_CONFIG } from '../config/runtime-config';
import { AuthService } from './auth.service';

/**
 * Adds the Keycloak access token to requests for the configured API, refreshing it first when
 * it is about to expire. Other requests (Keycloak, CDNs, third parties) never see the token.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const { apiBaseUrl } = inject(RUNTIME_CONFIG);
  const baseUri = inject(DOCUMENT).baseURI;

  if (!apiBaseUrl || !isUnderBaseUrl(request.url, apiBaseUrl, baseUri)) {
    return next(request);
  }

  return from(inject(AuthService).getToken()).pipe(
    switchMap((token) =>
      next(token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request),
    ),
  );
};

/**
 * True when `url` has the same origin as `baseUrl` and a path at or below it. URLs are parsed,
 * not prefix-matched, so https://api.example.com.evil.dev never matches https://api.example.com.
 */
export function isUnderBaseUrl(url: string, baseUrl: string, resolveAgainst: string): boolean {
  let target: URL;
  let base: URL;
  try {
    target = new URL(url, resolveAgainst);
    base = new URL(baseUrl);
  } catch {
    return false;
  }

  if (target.origin !== base.origin) {
    return false;
  }
  const basePath = base.pathname.replace(/\/+$/, '');
  return target.pathname === basePath || target.pathname.startsWith(`${basePath}/`);
}
