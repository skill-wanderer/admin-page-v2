// Writes public/runtime-config.js from environment variables, falling back to .env.
// The app reads window.__env at startup, so one build can be pointed at any environment
// by replacing this file at deploy time.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const KEYS = [
  'KEYCLOAK_URL',
  'KEYCLOAK_REALM',
  'KEYCLOAK_CLIENT_ID',
  'ADMIN_ROLES',
  'API_BASE_URL',
];
const REQUIRED = ['KEYCLOAK_URL', 'KEYCLOAK_REALM', 'KEYCLOAK_CLIENT_ID'];

const envFile = new URL('../.env', import.meta.url);
const outputFile = new URL('../public/runtime-config.js', import.meta.url);

const fileEnv = existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')) : {};
const runtimeEnv = {};

for (const key of KEYS) {
  const value = (process.env[key] ?? fileEnv[key] ?? '').trim();
  if (value) {
    runtimeEnv[key] = value;
  }
}

const missing = REQUIRED.filter((key) => !runtimeEnv[key]);
if (missing.length > 0) {
  console.error(
    `Missing ${missing.join(', ')}. Copy .env.example to .env, or set them in the environment.`,
  );
  process.exit(1);
}

writeFileSync(outputFile, `window.__env = ${JSON.stringify(runtimeEnv, null, 2)};\n`, 'utf8');
console.log('Wrote public/runtime-config.js');
