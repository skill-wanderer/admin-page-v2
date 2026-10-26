# Skill-Wanderer Admin (v2)

The admin console for [Skill-Wanderer](https://skill-wanderer.com). Admins sign in with Skill-Wanderer SSO (Keycloak) before they can open anything, and the console uses the same dark, orange-and-yellow design as skill-wanderer.com, the client portal and the SSO login page, on phones, tablets and desktops.

## Stack

- [Angular 21](https://angular.dev) (LTS): standalone components, signals, zoneless change detection, lazy-loaded routes
- [keycloak-js](https://www.keycloak.org/securing-apps/javascript-adapter) 26: authorization code flow with PKCE, wrapped in a small signal-based `AuthService`
- Tailwind CSS v4, with the Skill-Wanderer design tokens and components in [src/styles.css](src/styles.css)
- [Lucide](https://lucide.dev) icons (the site's icon set), inlined in [src/app/shared/icon.ts](src/app/shared/icon.ts)
- Vitest for unit tests

## Getting started

Needs Node.js 22.12 or newer. The admin signs in against Skill-Wanderer SSO (https://sso.skill-wanderer.com), so there is no Keycloak to run locally.

```bash
npm install
cp .env.example .env      # Skill-Wanderer SSO, skill-wanderer-admin realm
npm start                 # http://localhost:4200
```

Sign in with an account that has the `CRM` role in the `skill-wanderer-admin` realm. Accounts without it see the access-denied screen.

The dashboard can check a backend end to end by calling `GET /api/v1/me` (the [client-portal-v3-be](https://github.com/skill-wanderer/client-portal-v3-be) contract). Set `API_BASE_URL` to turn it on; that API must trust tokens from the `skill-wanderer-admin` realm and allow `http://localhost:4200` in its CORS settings.

## Configuration

The browser reads its settings from `public/runtime-config.js` (`window.__env`). `npm start`, `npm run build` and `npm run watch` generate that file from environment variables, falling back to `.env`. Because the settings are read at runtime, one build can serve every environment: replace `runtime-config.js` at deploy time.

| Variable | Example | Notes |
| --- | --- | --- |
| `KEYCLOAK_URL` | `https://sso.skill-wanderer.com` | Keycloak server, without `/realms/...`. Required. |
| `KEYCLOAK_REALM` | `skill-wanderer-admin` | Required. |
| `KEYCLOAK_CLIENT_ID` | `skill-wanderer-admin` | Public client this console signs in with. Required. |
| `ADMIN_ROLES` | `CRM` | Comma-separated roles that may open the admin. `role` is a realm role; `client:role` is a role on that client, e.g. `client-portal-api:admin`. Default: `CRM`. |
| `API_BASE_URL` | `https://api.example.com` | Backend API. Only requests to this URL get the access token. Optional. |

If a required value is missing, the app shows what to fix instead of a blank page.

## Keycloak setup

The admin uses the existing public client `skill-wanderer-admin` in the `skill-wanderer-admin` realm (the one v1 used). It already accepts `http://localhost:4200`, so local development needs no Keycloak changes. When the admin gets a new address, such as a staging or production host, add it to that client in the Keycloak admin console:

1. **Valid redirect URIs** and **Valid post logout redirect URIs**: `https://<admin host>/*`. The app signs in from any page, runs the silent check at `/silent-check-sso.html` and returns to `/login?signedOut=1` after signing out.
2. **Web origins**: `+` (or the admin host), so the browser can exchange the code for tokens.
3. *Advanced → Proof Key for Code Exchange Code Challenge Method*: `S256` is recommended; the app always sends PKCE.
4. **Role**: give admins the realm role `CRM`, or whatever `ADMIN_ROLES` names.

If an API checks the token's audience (client-portal-v3-be expects `client-portal-api`), add an *Audience* mapper for that client on the *Client scopes* tab of `skill-wanderer-admin`, under *skill-wanderer-admin-dedicated → Add mapper → By configuration → Audience*.

## How sign-in works

1. On startup, `AuthService` asks Keycloak whether the browser already has an SSO session. It does this silently in a hidden iframe ([public/silent-check-sso.html](public/silent-check-sso.html)) while a branded splash screen shows.
2. Every admin route is behind `adminGuard`. Signed-out visitors land on `/login`, a Skill-Wanderer sign-in page that hands off to Keycloak and comes back to the page they asked for.
3. Signed-in users without an accepted role see `/access-denied`, which lists the roles needed and can re-check after a role is granted.
4. Tokens stay in memory, never in `localStorage` or `sessionStorage`. After a reload, step 1 restores the session without a login form.
5. `authInterceptor` adds `Authorization: Bearer` only to requests under `API_BASE_URL`, and refreshes the token first when it has less than 30 seconds left.
6. When Keycloak ends the session (sign-out elsewhere, session timeout), the admin returns to the sign-in page. **Sign out** ends the SSO session at Keycloak.

Startup gives up after 15 seconds, so a misconfigured or unreachable Keycloak shows an error with a hint instead of an endless spinner.

## Design and responsive layout

The look follows the Skill-Wanderer design system: tokens such as `--color-primary` (#ff6b35), `--color-accent` (#ffd93d) and `--color-dark` (#1a1a1a), gradient headings, glass cards, pill buttons and subtle lift on hover. `styles.css` also keeps the variable names from the design system docs (`--primary-orange`, `--dark-bg`, ...).

- **Desktop (1024px and up):** sticky sidebar with the navigation and the signed-in user.
- **Below 1024px:** the site's fixed, blurred top bar. Its menu button turns into an orange X and slides the navigation down as a panel.
- **Phones:** grids stack to one column, button groups go full width, and data tables turn each row into a card.

The **UI kit** page (`/ui-kit`) shows every shared class: buttons, badges, notices, form controls, the data table, and loading states. Build new screens from those classes so they match.

## Adding a page

1. Create the component in `src/app/pages/<name>/` and start it with `<app-page-header>`.
2. Add it as a child route of the admin shell in [src/app/app.routes.ts](src/app/app.routes.ts). It is protected automatically.
3. Add it to `NAV_GROUPS` in [src/app/layout/admin-shell.ts](src/app/layout/admin-shell.ts).

## Project structure

```
src/
  index.html                 splash screen, loads runtime-config.js
  styles.css                 design tokens and shared component classes
  app/
    app.config.ts            providers; AuthService.init() runs before the first route
    app.routes.ts            /login, /access-denied, and the guarded admin shell
    auth/                    AuthService, guards, interceptor, user profile and roles
    api/                     backend clients and API error explanations
    config/runtime-config.ts reads and validates window.__env
    layout/                  admin shell: sidebar, top bar, mobile menu
    pages/                   login, access denied, dashboard, account, UI kit, not found
    shared/                  icon, page header, page titles
public/                      favicon, logo, silent-check-sso.html
scripts/                     writes public/runtime-config.js
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Development server on http://localhost:4200 |
| `npm run build` | Production build in `dist/admin-page-v2/browser` |
| `npm test` | Unit tests (Vitest) |
| `npm run config` | Regenerate `public/runtime-config.js` |

## Deploying

The build is a static site. The host must:

- serve `index.html` for unknown paths, so deep links like `/account` work;
- serve `runtime-config.js` with that environment's values;
- be listed in the Keycloak client's redirect URIs and web origins, and in the API's `Cors:AllowedOrigins`.

## Upgrading Angular

This project is on Angular 21, the LTS release that runs on the installed Node.js 24.13. Angular 22 needs Node.js 24.15 or newer; after upgrading Node, run `ng update @angular/core@22 @angular/cli@22`.

## License

[Apache License 2.0](LICENSE)
