import type { KeycloakTokenParsed } from 'keycloak-js';

import { hasAnyRole, listRoles, matchingRoles, toUserProfile } from './user-profile';

const accessToken: KeycloakTokenParsed = {
  sub: '8d1f0c2e',
  preferred_username: 'ada',
  name: 'Ada Lovelace',
  given_name: 'Ada',
  family_name: 'Lovelace',
  email: 'ada@example.com',
  email_verified: true,
  realm_access: { roles: ['admin', 'offline_access'] },
  resource_access: { 'client-portal-api': { roles: ['tenants:write'] } },
};

describe('toUserProfile', () => {
  it('maps the standard Keycloak claims', () => {
    expect(toUserProfile(accessToken)).toEqual({
      id: '8d1f0c2e',
      username: 'ada',
      name: 'Ada Lovelace',
      firstName: 'Ada',
      email: 'ada@example.com',
      emailVerified: true,
      initials: 'AL',
      realmRoles: ['admin', 'offline_access'],
      clientRoles: { 'client-portal-api': ['tenants:write'] },
    });
  });

  it('prefers profile claims from the ID token', () => {
    const user = toUserProfile(accessToken, {
      name: 'Countess Ada',
      email: 'countess@example.com',
    });

    expect(user.name).toBe('Countess Ada');
    expect(user.email).toBe('countess@example.com');
    expect(user.realmRoles).toEqual(['admin', 'offline_access']);
  });

  it('falls back to the username when the token has no name claims', () => {
    const user = toUserProfile({ sub: '1', preferred_username: 'quan.nguyen' });

    expect(user.name).toBe('quan.nguyen');
    expect(user.firstName).toBe('quan.nguyen');
    expect(user.initials).toBe('QN');
    expect(user.email).toBeNull();
    expect(user.realmRoles).toEqual([]);
    expect(user.clientRoles).toEqual({});
  });
});

describe('role matching', () => {
  const user = toUserProfile(accessToken);

  it('matches realm roles by name', () => {
    expect(hasAnyRole(user, ['admin'])).toBe(true);
    expect(hasAnyRole(user, ['CRM'])).toBe(false);
  });

  it('matches client roles written as client:role', () => {
    expect(matchingRoles(user, ['client-portal-api:tenants:write', 'other-client:admin'])).toEqual([
      'client-portal-api:tenants:write',
    ]);
  });

  it('does not treat a client role as a realm role', () => {
    expect(hasAnyRole(user, ['tenants:write'])).toBe(false);
  });
});

describe('listRoles', () => {
  it('lists roles in ADMIN_ROLES notation without Keycloak built-ins', () => {
    const user = toUserProfile({
      sub: '1',
      realm_access: { roles: ['default-roles-client-portal', 'offline_access', 'admin'] },
      resource_access: {
        account: { roles: ['manage-account', 'view-profile'] },
        'client-portal-api': { roles: ['tenants:write'] },
      },
    });

    expect(listRoles(user)).toEqual(['admin', 'client-portal-api:tenants:write']);
  });
});
