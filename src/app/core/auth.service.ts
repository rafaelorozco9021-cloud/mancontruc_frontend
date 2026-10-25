import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { API_BASE } from './api';
import { LoginInput, RegisterInput, Session } from './models';

const STORAGE_KEY = 'manconstruc.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sessionState = signal<Session | null>(readSession());

  readonly session = this.sessionState.asReadonly();
  readonly user = computed(() => this.sessionState()?.user ?? null);
  readonly token = computed(() => this.sessionState()?.token ?? null);
  readonly isAuthenticated = computed(() => {
    const current = this.sessionState();
    return !!current && new Date(current.expiresAt).getTime() > Date.now();
  });

  register(input: RegisterInput): Observable<Session> {
    return this.http
      .post<Session>(`${API_BASE}/auth/register`, input)
      .pipe(tap((session) => this.setSession(session)));
  }

  login(input: LoginInput): Observable<Session> {
    return this.http
      .post<Session>(`${API_BASE}/auth/login`, input)
      .pipe(tap((session) => this.setSession(session)));
  }

  logout(navigate = true): void {
    this.sessionState.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Almacenamiento no disponible.
    }

    if (navigate) {
      void this.router.navigate(['/entrar']);
    }
  }

  private setSession(session: Session): void {
    this.sessionState.set(session);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // La sesión queda solo en memoria.
    }
  }
}

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const session = JSON.parse(raw) as Session;
    if (!session?.token || !session?.user || new Date(session.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    return null;
  }
}
