import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';
import { RuntimeConfigError, parseRuntimeConfig } from './app/config/runtime-config';

try {
  bootstrapApplication(App, appConfig(parseRuntimeConfig(window.__env))).catch((error) =>
    console.error(error),
  );
} catch (error) {
  if (!(error instanceof RuntimeConfigError)) {
    throw error;
  }
  showConfigError(error.problems);
}

/** Without valid settings the admin can't reach Keycloak, so say what to fix instead of showing a blank page. */
function showConfigError(problems: readonly string[]): void {
  const element = (tag: string, className: string, text = '') => {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  };

  const list = element('ul', 'notice notice-error flex-col gap-1');
  list.append(...problems.map((problem) => element('li', '', problem)));

  const card = element('section', 'auth-card');
  card.setAttribute('role', 'alert');
  card.append(
    element('h1', 'auth-title text-gradient', 'Admin is not configured'),
    element(
      'p',
      'auth-lead',
      'public/runtime-config.js is missing or incomplete. Set these values in .env (see .env.example), then run npm start or npm run build again.',
    ),
    list,
  );

  const screen = element('main', 'auth-screen bg-brand-pattern');
  screen.append(card);
  document.querySelector('app-root')?.replaceChildren(screen);
}
