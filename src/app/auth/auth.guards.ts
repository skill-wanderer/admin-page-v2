import { inject } from '@angular/core';
import { type CanActivateChildFn, type CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { HOME_URL, safeReturnUrl } from './return-url';

/**
 * Guards the admin area. Signed-out visitors go to the sign-in page (and return here afterwards);
 * signed-in users without an admin role see the access-denied page.
 * Runs after AuthService.init(), so the session state is already known.
 */
export const adminGuard: CanActivateFn & CanActivateChildFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    const queryParams = state.url === HOME_URL ? {} : { returnUrl: state.url };
    return router.createUrlTree(['/login'], { queryParams });
  }
  return auth.isAdmin() || router.createUrlTree(['/access-denied']);
};

/** For pages that need a signed-in user but no admin role, such as access denied. */
export const signedInGuard: CanActivateFn = () =>
  inject(AuthService).isAuthenticated() || inject(Router).createUrlTree(['/login']);

/** Keeps signed-in users off the sign-in page by sending them where they were going. */
export const signedOutGuard: CanActivateFn = (route) =>
  !inject(AuthService).isAuthenticated() ||
  inject(Router).parseUrl(safeReturnUrl(route.queryParamMap.get('returnUrl')));
