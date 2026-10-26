import { Location } from '@angular/common';
import { DOCUMENT, Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import Keycloak, { type KeycloakError } from 'keycloak-js';

import { RUNTIME_CONFIG } from '../config/runtime-config';
import { HOME_URL } from './return-url';
import { type UserProfile, matchingRoles, toUserProfile } from './user-profile';

/** The keycloak-js adapter, behind a token so tests can swap in a fake. */
export const KEYCLOAK = new InjectionToken<Keycloak>('KEYCLOAK', {
  providedIn: 'root',
  factory: () => {
    const { keycloak } = inject(RUNTIME_CONFIG);
    return new Keycloak({ url: keycloak.url, realm: keycloak.realm, clientId: keycloak.clientId });
  },
});

/**
 * - `loading`: startup has not finished checking for an SSO session yet.
 * - `unavailable`: Keycloak could not be reached or is misconfigured; see `error`.
 */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'unavailable';

export interface SessionTimes {
  /** When the current access token expires (epoch ms, browser clock). */
  tokenExpiresAt: number;
  /** When the user last signed in at Keycloak (epoch ms), if the token says. */
  signedInAt: number | null;
}

/** How long startup may wait for Keycloak before the sign-in page shows an error instead. */
export const INIT_TIMEOUT_MS = 15_000;

/** Access tokens with less time left than this are refreshed before use. */
const MIN_TOKEN_VALIDITY_SECONDS = 30;

/**
 * Signs admins in with Keycloak (authorization code flow with PKCE) and exposes the session as
 * signals. Tokens live in memory only; after a reload, a silent SSO check restores the session.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly keycloak = inject(KEYCLOAK);
  private readonly config = inject(RUNTIME_CONFIG);
  private readonly location = inject(Location);
  private readonly document = inject(DOCUMENT);

  private readonly statusState = signal<AuthStatus>('loading');
  private readonly errorState = signal<string | null>(null);
  private readonly userState = signal<UserProfile | null>(null);
  private readonly sessionState = signal<SessionTimes | null>(null);

  readonly status = this.statusState.asReadonly();
  /** Why the last sign-in attempt or startup check failed, for the sign-in page. */
  readonly error = this.errorState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly session = this.sessionState.asReadonly();

  readonly isAuthenticated = computed(() => this.status() === 'authenticated');
  readonly adminRoles = this.config.adminRoles;
  /** The accepted admin roles this user holds; empty means no access to the admin. */
  readonly grantedAdminRoles = computed(() => {
    const user = this.user();
    return user ? matchingRoles(user, this.adminRoles) : [];
  });
  readonly isAdmin = computed(() => this.grantedAdminRoles().length > 0);

  /** Keycloak's account console, where users manage their password, 2FA and sessions. */
  readonly accountConsoleUrl = computed(() =>
    this.isAuthenticated()
      ? this.keycloak.createAccountUrl({ redirectUri: this.absoluteUrl('/account') })
      : null,
  );

  /** Runs once at startup: completes a sign-in redirect, or silently checks for an SSO session. */
  async init(): Promise<void> {
    const keycloak = this.keycloak;
    keycloak.onAuthRefreshSuccess = () => this.syncFromTokens();
    // Keycloak rejected the refresh token: the SSO session has ended.
    keycloak.onAuthLogout = () => this.endSession();
    keycloak.onTokenExpired = () => {
      keycloak.updateToken(MIN_TOKEN_VALIDITY_SECONDS).catch(() => {
        // An ended session triggers onAuthLogout; network errors are retried before the next API call.
      });
    };

    try {
      const authenticated = await withTimeout(
        keycloak.init({
          onLoad: 'check-sso',
          silentCheckSsoRedirectUri: this.absoluteUrl('/silent-check-sso.html'),
          pkceMethod: 'S256',
          checkLoginIframe: false,
        }),
        INIT_TIMEOUT_MS,
      );

      if (authenticated) {
        this.syncFromTokens();
      } else {
        this.statusState.set('unauthenticated');
      }
    } catch (error) {
      if (isKeycloakError(error)) {
        // Keycloak sent the browser back with an OAuth error, e.g. a cancelled sign-in.
        this.errorState.set(`Sign-in didn't complete: ${error.error_description || error.error}.`);
        this.statusState.set('unauthenticated');
      } else {
        this.errorState.set(
          describeStartupError(error, this.config.keycloak.url, this.document.location.origin),
        );
        this.statusState.set('unavailable');
      }
    }
  }

  /** Sends the browser to the Keycloak sign-in page, which returns to `returnUrl` afterwards. */
  login(returnUrl = HOME_URL, options: { forceLoginForm?: boolean } = {}): Promise<void> {
    return this.keycloak.login({
      redirectUri: this.absoluteUrl(returnUrl),
      prompt: options.forceLoginForm ? 'login' : undefined,
    });
  }

  /** Ends the SSO session at Keycloak, which then returns to the sign-in page. */
  logout(): Promise<void> {
    return this.keycloak.logout({ redirectUri: this.absoluteUrl('/login?signedOut=1') });
  }

  /** A valid access token for API calls, refreshed first when it is about to expire. */
  async getToken(): Promise<string | null> {
    if (!this.keycloak.authenticated) {
      return null;
    }
    try {
      await this.keycloak.updateToken(MIN_TOKEN_VALIDITY_SECONDS);
    } catch {
      // Ended session (onAuthLogout has fired) or Keycloak unreachable: send what we have.
    }
    return this.keycloak.token ?? null;
  }

  /** Fetches a new token now, e.g. to pick up roles granted since sign-in. */
  async refreshSession(): Promise<void> {
    await this.keycloak.updateToken(-1);
  }

  private syncFromTokens(): void {
    const { tokenParsed, idTokenParsed, timeSkew } = this.keycloak;
    if (!tokenParsed) {
      this.endSession();
      return;
    }

    const skewMs = (timeSkew ?? 0) * 1000;
    this.userState.set(toUserProfile(tokenParsed, idTokenParsed));
    this.sessionState.set({
      tokenExpiresAt: (tokenParsed.exp ?? 0) * 1000 + skewMs,
      signedInAt: tokenParsed.auth_time ? tokenParsed.auth_time * 1000 + skewMs : null,
    });
    this.errorState.set(null);
    this.statusState.set('authenticated');
  }

  private endSession(): void {
    this.userState.set(null);
    this.sessionState.set(null);
    this.statusState.set('unauthenticated');
  }

  /** Turns an app path into an absolute URL that respects <base href>. */
  private absoluteUrl(path: string): string {
    return new URL(this.location.prepareExternalUrl(path), this.document.location.origin).href;
  }
}

/** Explains a failed startup in terms an admin setting up Keycloak can act on. */
export function describeStartupError(
  error: unknown,
  keycloakUrl: string,
  appOrigin: string,
): string {
  if (
    error instanceof TimeoutError ||
    (error instanceof Error && error.message.startsWith('Timeout'))
  ) {
    return (
      `Skill-Wanderer SSO at ${keycloakUrl} didn't answer in time. Check that Keycloak is running ` +
      `and that ${appOrigin}/* is a valid redirect URI of this client.`
    );
  }
  if (error instanceof TypeError) {
    // fetch() fails this way on network errors and on CORS rejections.
    return (
      `Couldn't reach Skill-Wanderer SSO at ${keycloakUrl}. If it is running, ` +
      `add ${appOrigin} to the client's Web origins.`
    );
  }
  const status = (error as { response?: { status?: unknown } } | null)?.response?.status;
  if (typeof status === 'number') {
    return `Skill-Wanderer SSO rejected the sign-in (HTTP ${status}). Check the client settings in Keycloak.`;
  }
  return `Couldn't start sign-in: ${error instanceof Error ? error.message : String(error)}`;
}

class TimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(`Timed out after ${ms} ms.`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function isKeycloakError(error: unknown): error is KeycloakError {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as Partial<KeycloakError>).error === 'string'
  );
}
