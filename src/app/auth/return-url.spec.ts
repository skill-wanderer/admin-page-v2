import { HOME_URL, safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it('keeps paths inside the app, including query and fragment', () => {
    expect(safeReturnUrl('/account?tab=roles#session')).toBe('/account?tab=roles#session');
  });

  it.each([
    [undefined],
    [null],
    [''],
    ['dashboard'],
    ['https://evil.example/phish'],
    ['//evil.example'],
    ['/\\evil.example'],
    ['javascript:alert(1)'],
    ['/login?returnUrl=/account'],
  ])('falls back to the dashboard for %j', (value) => {
    expect(safeReturnUrl(value)).toBe(HOME_URL);
  });
});
