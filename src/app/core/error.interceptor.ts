import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        auth.isAuthenticated() &&
        !request.url.includes('/api/auth/login')
      ) {
        auth.logout(false);
        void router.navigate(['/entrar'], { queryParams: { expired: '1' } });
      }

      return throwError(() => error);
    })
  );
};
