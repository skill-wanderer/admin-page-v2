import type { KeycloakTokenParsed } from 'keycloak-js';

export interface UserProfile {
  /** Keycloak user id (`sub`). */
  id: string;
  username: string;
  /** Full name, falling back to the username. */
  name: string;
  firstName: string;
  email: string | null;
  emailVerified: boolean;
  initials: string;
  realmRoles: readonly string[];
  /** Client roles keyed by client id, from `resource_access`. */
  clientRoles: Readonly<Record<string, readonly string[]>>;
}

/**
 * Builds the signed-in user from the access token, which carries the roles. Profile claims
 * prefer the ID token, since realms can leave name and email out of access tokens.
 */
export function toUserProfile(
  accessToken: KeycloakTokenParsed,
  idToken?: KeycloakTokenParsed,
): UserProfile {
  const claim = (key: string): string | undefined => {
    const value: unknown = idToken?.[key] ?? accessToken[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  };

  const username = claim('preferred_username') ?? claim('email') ?? accessToken.sub ?? 'unknown';
  const givenName = claim('given_name');
  const familyName = claim('family_name');
  const name = claim('name') ?? ([givenName, familyName].filter(Boolean).join(' ') || username);

  return {
    id: accessToken.sub ?? '',
    username,
    name,
    firstName: givenName ?? name.split(/\s+/)[0],
    email: claim('email') ?? null,
    emailVerified: (idToken?.['email_verified'] ?? accessToken['email_verified']) === true,
    initials: initialsOf(name),
    realmRoles: accessToken.realm_access?.roles ?? [],
    clientRoles: Object.fromEntries(
      Object.entries(accessToken.resource_access ?? {}).map(([client, access]) => [
        client,
        access.roles,
      ]),
    ),
  };
}

/**
 * Returns the accepted roles the user holds. `role` matches a realm role; `client:role` matches
 * a role on that client.
 */
export function matchingRoles(user: UserProfile, acceptedRoles: readonly string[]): string[] {
  return acceptedRoles.filter((role) => {
    if (user.realmRoles.includes(role)) {
      return true;
    }
    const separator = role.indexOf(':');
    if (separator <= 0) {
      return false;
    }
    const client = role.slice(0, separator);
    return user.clientRoles[client]?.includes(role.slice(separator + 1)) ?? false;
  });
}

export function hasAnyRole(user: UserProfile, acceptedRoles: readonly string[]): boolean {
  return matchingRoles(user, acceptedRoles).length > 0;
}

/** The user's roles in ADMIN_ROLES notation (`role`, `client:role`), without Keycloak's built-ins. */
export function listRoles(user: UserProfile): string[] {
  return [
    ...user.realmRoles.filter((role) => !isBuiltInRole(role)),
    ...Object.entries(user.clientRoles).flatMap(([client, roles]) =>
      roles.filter((role) => !isBuiltInRole(role, client)).map((role) => `${client}:${role}`),
    ),
  ];
}

/** Roles every Keycloak user gets; they never grant admin access, so lists leave them out. */
function isBuiltInRole(role: string, client?: string): boolean {
  return (
    client === 'account' ||
    role === 'offline_access' ||
    role === 'uma_authorization' ||
    role.startsWith('default-roles-')
  );
}

function initialsOf(name: string): string {
  const words = name.split(/[\s._@-]+/).filter(Boolean);
  const letters =
    words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}
