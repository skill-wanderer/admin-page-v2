import { InjectionToken } from '@angular/core';

/** Keys of `window.__env`, which public/runtime-config.js defines before the app starts. */
export type RuntimeEnvKey =
  'KEYCLOAK_URL' | 'KEYCLOAK_REALM' | 'KEYCLOAK_CLIENT_ID' | 'ADMIN_ROLES' | 'API_BASE_URL';

export type RuntimeEnv = Partial<Record<RuntimeEnvKey, string>>;

declare global {
  interface Window {
    __env?: RuntimeEnv;
  }
}

export interface RuntimeConfig {
  keycloak: {
    /** Keycloak server URL without the realm path, e.g. https://sso.skill-wanderer.com */
    url: string;
    realm: string;
    clientId: string;
  };
  /** Roles that may open the admin. `role` is a realm role; `client:role` a role on that client. */
  adminRoles: readonly string[];
  /** Base URL of the backend API, or null when there is none. Only requests under it get the access token. */
  apiBaseUrl: string | null;
}

/** The realm role Skill-Wanderer admins hold in the skill-wanderer-admin realm. */
export const DEFAULT_ADMIN_ROLES: readonly string[] = ['CRM'];

export const RUNTIME_CONFIG = new InjectionToken<RuntimeConfig>('RUNTIME_CONFIG');

export class RuntimeConfigError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`Invalid runtime configuration. ${problems.join(' ')}`);
    this.name = 'RuntimeConfigError';
  }
}

/** Validates `window.__env`, reporting every problem at once so a broken deploy is fixed in one pass. */
export function parseRuntimeConfig(env: RuntimeEnv | undefined): RuntimeConfig {
  const problems: string[] = [];
  const read = (key: RuntimeEnvKey) => env?.[key]?.trim() ?? '';

  const required = (key: RuntimeEnvKey) => {
    const value = read(key);
    if (!value) {
      problems.push(`${key} is not set.`);
    }
    return value;
  };

  const url = (key: RuntimeEnvKey, value: string) => {
    if (value && !isHttpUrl(value)) {
      problems.push(`${key} must be an http(s) URL, got "${value}".`);
    }
    return value.replace(/\/+$/, '');
  };

  const keycloakUrl = url('KEYCLOAK_URL', required('KEYCLOAK_URL'));
  const realm = required('KEYCLOAK_REALM');
  const clientId = required('KEYCLOAK_CLIENT_ID');
  const apiBaseUrl = url('API_BASE_URL', read('API_BASE_URL'));
  const adminRoles = parseList(read('ADMIN_ROLES'));

  if (problems.length > 0) {
    throw new RuntimeConfigError(problems);
  }

  return {
    keycloak: { url: keycloakUrl, realm, clientId },
    adminRoles: adminRoles.length > 0 ? adminRoles : DEFAULT_ADMIN_ROLES,
    apiBaseUrl: apiBaseUrl || null,
  };
}

function parseList(value: string): string[] {
  return [
    ...new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}
