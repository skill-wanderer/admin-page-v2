import { DEFAULT_ADMIN_ROLES, RuntimeConfigError, parseRuntimeConfig } from './runtime-config';

const validEnv = {
  KEYCLOAK_URL: 'https://sso.skill-wanderer.com/',
  KEYCLOAK_REALM: 'skill-wanderer-admin',
  KEYCLOAK_CLIENT_ID: 'skill-wanderer-admin',
};

describe('parseRuntimeConfig', () => {
  it('reads the Keycloak settings and trims trailing slashes from URLs', () => {
    const config = parseRuntimeConfig({ ...validEnv, API_BASE_URL: ' http://localhost:5080// ' });

    expect(config.keycloak).toEqual({
      url: 'https://sso.skill-wanderer.com',
      realm: 'skill-wanderer-admin',
      clientId: 'skill-wanderer-admin',
    });
    expect(config.apiBaseUrl).toBe('http://localhost:5080');
  });

  it('defaults the admin roles and treats a missing API as optional', () => {
    const config = parseRuntimeConfig(validEnv);

    expect(config.adminRoles).toEqual(DEFAULT_ADMIN_ROLES);
    expect(DEFAULT_ADMIN_ROLES).toEqual(['CRM']);
    expect(config.apiBaseUrl).toBeNull();
  });

  it('splits ADMIN_ROLES on commas and drops blanks and duplicates', () => {
    const config = parseRuntimeConfig({
      ...validEnv,
      ADMIN_ROLES: 'admin, client-portal-api:admin,,admin ',
    });

    expect(config.adminRoles).toEqual(['admin', 'client-portal-api:admin']);
  });

  it('reports every problem at once', () => {
    let error: unknown;
    try {
      parseRuntimeConfig({ KEYCLOAK_URL: 'sso.skill-wanderer.com', API_BASE_URL: 'ftp://files' });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(RuntimeConfigError);
    expect((error as RuntimeConfigError).problems).toEqual([
      'KEYCLOAK_URL must be an http(s) URL, got "sso.skill-wanderer.com".',
      'KEYCLOAK_REALM is not set.',
      'KEYCLOAK_CLIENT_ID is not set.',
      'API_BASE_URL must be an http(s) URL, got "ftp://files".',
    ]);
  });

  it('fails when runtime-config.js did not load', () => {
    expect(() => parseRuntimeConfig(undefined)).toThrow(RuntimeConfigError);
  });
});
