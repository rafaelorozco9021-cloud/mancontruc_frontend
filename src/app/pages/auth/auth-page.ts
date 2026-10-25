import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { apiErrorMessage } from '../../core/http-error';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmation = group.get('confirmPassword')?.value;
  return password === confirmation ? null : { mismatch: true };
}

@Component({
  selector: 'app-auth-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './auth-page.html',
  styleUrl: './auth-page.scss'
})
export class AuthPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly mode: 'login' | 'register' =
    this.route.snapshot.data['mode'] === 'register' ? 'register' : 'login';
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly expired = signal(this.route.snapshot.queryParamMap.get('expired') === '1');

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  readonly registerForm = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      companyName: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: passwordsMatch }
  );

  submitLogin(): void {
    this.error.set(null);
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.busy.set(true);
    this.auth.login(this.loginForm.getRawValue()).subscribe({
      next: () => {
        this.busy.set(false);
        void this.router.navigate(['/']);
      },
      error: (cause: unknown) => {
        this.busy.set(false);
        this.error.set(apiErrorMessage(cause));
      }
    });
  }

  submitRegister(): void {
    this.error.set(null);
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const value = this.registerForm.getRawValue();
    this.busy.set(true);
    this.auth
      .register({
        email: value.email,
        fullName: value.fullName,
        companyName: value.companyName,
        password: value.password
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          void this.router.navigate(['/']);
        },
        error: (cause: unknown) => {
          this.busy.set(false);
          this.error.set(apiErrorMessage(cause));
        }
      });
  }
}
