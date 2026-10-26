import { HttpErrorResponse } from '@angular/common/http';

import { describeApiError } from './api-error';

const explain = (status: number, statusText = '') =>
  describeApiError(
    new HttpErrorResponse({ status, statusText, url: 'http://localhost:5080/api/v1/me' }),
    'http://localhost:5080',
    'http://localhost:4200',
  );

describe('describeApiError', () => {
  it('points at CORS when the browser gets no response', () => {
    expect(explain(0).detail).toContain(
      'http://localhost:4200 is listed in its Cors:AllowedOrigins',
    );
  });

  it('points at the audience mapper when the API rejects the token', () => {
    expect(explain(401)).toEqual(expect.objectContaining({ title: 'The API rejected your token' }));
    expect(explain(401).detail).toContain('Audience mapper');
  });

  it('names the missing endpoint', () => {
    expect(explain(404).detail).toBe(
      "http://localhost:5080/api/v1/me doesn't exist. Check API_BASE_URL.",
    );
  });

  it('reports server errors with their status', () => {
    expect(explain(503, 'Service Unavailable').detail).toBe(
      'It answered 503 Service Unavailable. The API logs will have the details.',
    );
  });
});
