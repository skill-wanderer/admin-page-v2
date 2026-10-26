import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { RUNTIME_CONFIG, type RuntimeConfig } from '../config/runtime-config';
import { authInterceptor, isUnderBaseUrl } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('isUnderBaseUrl', () => {
  const resolveAgainst = 'http://localhost:4200/';

  it.each([
    ['http://localhost:5080/api/v1/me', 'http://localhost:5080', true],
    ['http://localhost:5080', 'http://localhost:5080', true],
    ['https://example.com/api/v1/me', 'https://example.com/api', true],
    ['https://example.com/api', 'https://example.com/api/', true],
    ['https://example.com/apiary', 'https://example.com/api', false],
    ['https://example.com/other', 'https://example.com/api', false],
    ['http://localhost:5081/api', 'http://localhost:5080', false],
    ['https://localhost:5080/api', 'http://localhost:5080', false],
    ['http://localhost:5080.evil.dev/api', 'http://localhost:5080', false],
    ['http://localhost:5080@evil.dev/api', 'http://localhost:5080', false],
    ['/api/v1/me', 'http://localhost:4200/api', true],
    ['/api/v1/me', 'http://localhost:5080', false],
  ])('%s under %s → %s', (url, baseUrl, expected) => {
    expect(isUnderBaseUrl(url, baseUrl, resolveAgainst)).toBe(expected);
  });
});

describe('authInterceptor', () => {
  const config: RuntimeConfig = {
    keycloak: { url: 'http://localhost:8080', realm: 'client-portal', clientId: 'admin' },
    adminRoles: ['admin'],
    apiBaseUrl: 'http://localhost:5080',
  };
  let getToken: ReturnType<typeof vi.fn>;
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    getToken = vi.fn().mockResolvedValue('access-token');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: RUNTIME_CONFIG, useValue: config },
        { provide: AuthService, useValue: { getToken } },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('adds the access token to API requests', async () => {
    const response = firstValueFrom(http.get('http://localhost:5080/api/v1/me'));

    const request = await vi.waitFor(() => backend.expectOne('http://localhost:5080/api/v1/me'));
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');
    request.flush({});
    await response;
  });

  it('never sends the token to other hosts', async () => {
    const response = firstValueFrom(http.get('https://cdn.example.com/data.json'));

    const request = backend.expectOne('https://cdn.example.com/data.json');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(getToken).not.toHaveBeenCalled();
    request.flush({});
    await response;
  });

  it('sends API requests without a header when there is no session', async () => {
    getToken.mockResolvedValue(null);
    const response = firstValueFrom(http.get('http://localhost:5080/api/v1/me'));

    const request = await vi.waitFor(() => backend.expectOne('http://localhost:5080/api/v1/me'));
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
    await response;
  });
});
