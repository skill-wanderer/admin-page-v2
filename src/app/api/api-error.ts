import type { HttpErrorResponse } from '@angular/common/http';

export interface ApiProblem {
  title: string;
  detail: string;
}

/** Explains a failed API call, naming the setup step that usually fixes it. */
export function describeApiError(
  error: HttpErrorResponse,
  apiBaseUrl: string,
  appOrigin: string,
): ApiProblem {
  const answered = `${error.status}${error.statusText ? ` ${error.statusText}` : ''}`;

  if (error.status === 0) {
    return {
      title: "Couldn't reach the API",
      detail: `No response from ${apiBaseUrl}. Check that the API is running and that ${appOrigin} is listed in its Cors:AllowedOrigins.`,
    };
  }
  if (error.status === 401) {
    return {
      title: 'The API rejected your token',
      detail:
        "Keycloak signed you in, but the API didn't accept the access token. Check that the API's " +
        'Keycloak:Authority is this realm, and that this client has an Audience mapper for the ' +
        "API's Keycloak client (client-portal-api).",
    };
  }
  if (error.status === 403) {
    return {
      title: 'The API refused access',
      detail: 'Your token was accepted, but it lacks a role this endpoint requires.',
    };
  }
  if (error.status === 404) {
    return {
      title: 'Endpoint not found',
      detail: `${error.url ?? apiBaseUrl} doesn't exist. Check API_BASE_URL.`,
    };
  }
  if (error.status >= 500) {
    return {
      title: 'The API ran into a problem',
      detail: `It answered ${answered}. The API logs will have the details.`,
    };
  }
  return { title: 'Unexpected response', detail: `The API answered ${answered}.` };
}
