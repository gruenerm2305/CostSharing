import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { AuthService } from "../../core/services/auth.service";
import { Router, RouterLink } from "@angular/router";
import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: 'register.html',
  styleUrl: 'register.scss'
})

export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  submitAttempted = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  onSubmit(): void {
    if (!this.registerForm.valid) {
      this.submitAttempted = true;
      this.registerForm.markAllAsTouched();
      return;
    }

    this.submitAttempted = false;
    if (this.registerForm.valid) {
      this.loading = true;
      this.error = null;
      this.successMessage = null;

      const { username, password, firstName, lastName } = this.registerForm.value;

      this.authService.register(username, password, firstName, lastName).subscribe({
        next: () => {
          this.successMessage = 'Registrierung erfolgreich! Sie werden zur Anmeldeseite weitergeleitet...';
          this.loading = false;
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (err) => {
          console.error('Registration error:', err);
          if (err.status === 409) {
             this.error = 'Ein Benutzer mit dieser Email-Adresse existiert bereits.';
           } else if (err.error?.message) {
             this.error = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
          } else {
             this.error = 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.';
          }
          this.loading = false;
        }
      });
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    return !!control && control.invalid && (control.touched || this.submitAttempted);
  }
}
