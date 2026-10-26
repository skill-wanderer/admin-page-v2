import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  type ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';
import { AuthService } from './auth/auth.service';
import { RUNTIME_CONFIG, type RuntimeConfig } from './config/runtime-config';
import { PageTitleStrategy } from './shared/page-title-strategy';

export function appConfig(runtimeConfig: RuntimeConfig): ApplicationConfig {
  return {
    providers: [
      provideBrowserGlobalErrorListeners(),
      { provide: RUNTIME_CONFIG, useValue: runtimeConfig },
      provideRouter(
        routes,
        withComponentInputBinding(),
        withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
      ),
      { provide: TitleStrategy, useClass: PageTitleStrategy },
      provideHttpClient(withInterceptors([authInterceptor])),
      // Finish any sign-in redirect and check for an SSO session before the first route's guards run.
      provideAppInitializer(() => inject(AuthService).init()),
    ],
  };
}
