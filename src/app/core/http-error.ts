import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (typeof error.error?.message === 'string' && error.error.message.trim()) {
      return error.error.message;
    }

    if (error.status === 0) {
      return 'No se pudo conectar con el servidor de ManConstruc. Verifica que la API esté en marcha.';
    }

    if (error.status === 401) {
      return 'Tu sesión expiró o las credenciales no son válidas.';
    }

    if (error.status === 404) {
      return 'No encontramos lo que buscabas.';
    }
  }

  return 'Ocurrió un error inesperado. Intenta nuevamente.';
}
