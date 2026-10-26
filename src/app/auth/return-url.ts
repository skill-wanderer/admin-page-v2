/** Where signed-in admins land by default. */
export const HOME_URL = '/dashboard';

/**
 * Accepts only paths inside this app as a post-sign-in destination, so a crafted
 * `?returnUrl=//evil.example` link can't bounce an admin to another site.
 */
export function safeReturnUrl(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return HOME_URL;
  }
  return value.startsWith('/login') ? HOME_URL : value;
}
