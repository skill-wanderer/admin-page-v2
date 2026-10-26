import { APP_BASE_HREF } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import type { KeycloakInitOptions, KeycloakTokenParsed } from 'keycloak-js';

import { RUNTIME_CONFIG, type RuntimeConfig } from '../config/runtime-config';
import { AuthService, INIT_TIMEOUT_MS, KEYCLOAK, describeStartupError } from './auth.service';

const config: RuntimeConfig = {
  keycloak: {
    url: 'https://sso.skill-wanderer.com',
    realm: 'skill-wanderer-admin',
    clientId: 'skill-wanderer-admin',
  },
  adminRoles: ['CRM'],
  apiBaseUrl: 'http://localhost:5080',
};

const adminClaims: KeycloakTokenParsed = {
  sub: 'user-1',
  preferred_username: 'admin',
  name: 'Ada Admin',
  email: 'admin@example.com',
  exp: 1_700_000_300,
  auth_time: 1_700_000_000,
  realm_access: { roles: ['CRM'] },
};

/** The parts of keycloak-js that AuthService uses. */
class FakeKeycloak {
  authenticated = false;
  token?: string;
  tokenParsed?: KeycloakTokenParsed;
  idTokenParsed?: KeycloakTokenParsed;
  timeSkew: number | null = 0;
  onAuthRefreshSuccess?: () => void;
  onAuthLogout?: () => void;
  onTokenExpired?: () => void;

  init = vi.fn<(options: KeycloakInitOptions) => Promise<boolean>>();
  login = vi.fn().mockResolvedValue(undefined);
  logout = vi.fn().mockResolvedValue(undefined);
  updateToken = vi.fn().mockResolvedValue(false);
  createAccountUrl = vi.fn(
    () => 'https://sso.skill-wanderer.com/realms/skill-wanderer-admin/account',
  );

  signIn(claims: KeycloakTokenParsed): void {
    this.authenticated = true;
    this.token = 'access-token';
    this.tokenParsed = claims;
  }
}

describe('AuthService', () => {
  let keycloak: FakeKeycloak;
  let auth: AuthService;
  let origin: string;

  beforeEach(() => {
    keycloak = new FakeKeycloak();
    TestBed.configureTestingModule({
      providers: [
        { provide: KEYCLOAK, useValue: keycloak },
        { provide: RUNTIME_CONFIG, useValue: config },
        { provide: APP_BASE_HREF, useValue: '/' },
      ],
    });
    auth = TestBed.inject(AuthService);
    origin = window.location.origin;
  });

  afterEach(() => vi.useRealTimers());

  it('restores an existing SSO session at startup', async () => {
    keycloak.init.mockImplementation(async () => {
      keycloak.signIn(adminClaims);
      return true;
    });

    await auth.init();

    expect(keycloak.init).toHaveBeenCalledWith({
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: `${origin}/silent-check-sso.html`,
      pkceMethod: 'S256',
      checkLoginIframe: false,
    });
    expect(auth.status()).toBe('authenticated');
    expect(auth.user()?.name).toBe('Ada Admin');
    expect(auth.isAdmin()).toBe(true);
    expect(auth.session()).toEqual({
      tokenExpiresAt: 1_700_000_300_000,
      signedInAt: 1_700_000_000_000,
    });
  });

  it('starts signed out when there is no SSO session', async () => {
    keycloak.init.mockResolvedValue(false);

    await auth.init();

    expect(auth.status()).toBe('unauthenticated');
    expect(auth.user()).toBeNull();
    expect(auth.error()).toBeNull();
  });

  it('gives up on an unresponsive Keycloak instead of hanging on the splash screen', async () => {
    vi.useFakeTimers();
    keycloak.init.mockReturnValue(new Promise(() => {}));

    const started = auth.init();
    await vi.advanceTimersByTimeAsync(INIT_TIMEOUT_MS);
    await started;

    expect(auth.status()).toBe('unavailable');
    expect(auth.error()).toContain("didn't answer in time");
  });

  it('shows an OAuth error from Keycloak and still offers sign-in', async () => {
    keycloak.init.mockRejectedValue({
      error: 'access_denied',
      error_description: 'User cancelled',
    });

    await auth.init();

    expect(auth.status()).toBe('unauthenticated');
    expect(auth.error()).toBe("Sign-in didn't complete: User cancelled.");
  });

  it('signs out locally when Keycloak ends the session', async () => {
    keycloak.init.mockImplementation(async () => {
      keycloak.signIn(adminClaims);
      return true;
    });
    await auth.init();

    keycloak.onAuthLogout?.();

    expect(auth.status()).toBe('unauthenticated');
    expect(auth.user()).toBeNull();
  });

  it('denies the admin to users without an accepted role', async () => {
    keycloak.init.mockImplementation(async () => {
      keycloak.signIn({ ...adminClaims, realm_access: { roles: ['offline_access'] } });
      return true;
    });

    await auth.init();

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.isAdmin()).toBe(false);
  });

  it('refreshes a token that is about to expire before handing it out', async () => {
    keycloak.signIn(adminClaims);

    await expect(auth.getToken()).resolves.toBe('access-token');
    expect(keycloak.updateToken).toHaveBeenCalledWith(30);
  });

  it('returns to the requested page after signing in at Keycloak', async () => {
    await auth.login('/account?tab=roles');

    expect(keycloak.login).toHaveBeenCalledWith({
      redirectUri: `${origin}/account?tab=roles`,
      prompt: undefined,
    });
  });

  it('signs out at Keycloak and comes back to the sign-in page', async () => {
    await auth.logout();

    expect(keycloak.logout).toHaveBeenCalledWith({
      redirectUri: `${origin}/login?signedOut=1`,
    });
  });
});

describe('describeStartupError', () => {
  it('points at Web origins when the token request is blocked', () => {
    expect(
      describeStartupError(
        new TypeError('Failed to fetch'),
        'http://localhost:8080',
        'http://localhost:4200',
      ),
    ).toContain("add http://localhost:4200 to the client's Web origins");
  });

  it('reports HTTP errors from Keycloak', () => {
    expect(
      describeStartupError({ response: { status: 400 } }, 'http://localhost:8080', 'http://x'),
    ).toBe(
      'Skill-Wanderer SSO rejected the sign-in (HTTP 400). Check the client settings in Keycloak.',
    );
  });
});
