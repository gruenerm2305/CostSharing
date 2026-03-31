import { Component, signal, Signal } from "@angular/core";
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import { AuthService } from "../../core/services/auth.service";
import { Router, RouterLink } from "@angular/router";
import { CommonModule } from "@angular/common";

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: 'login.html',
  styleUrl: 'login.scss'
})
export class LoginComponent {
    loginForm: FormGroup;
    loading = signal(false);
    error: Signal<string|null> = signal(null);
    submitAttempted = false;
    constructor(
        private readonly fb: FormBuilder,
        private readonly authService: AuthService,
        private readonly router: Router
    ) {
        this.loginForm = this.fb.group({
            username: ['',[Validators.required, Validators.maxLength(100)]],
            password: ['',[Validators.required, Validators.minLength(6), Validators.maxLength(100)]]
        });
    }
    onSubmit(): void {
        if (!this.loginForm.valid) {
        this.submitAttempted = true;
        this.loginForm.markAllAsTouched();
        return;
        }
        if(this.loginForm.valid) {
            this.submitAttempted = false;
            this.loading = signal(true);
            this.error = signal(null);
            const { username, password } = this.loginForm.value;

      this.authService.login(username, password).subscribe({
        next: () => {
            // Check if there's a return URL saved
          const returnUrl = localStorage.getItem('returnUrl');
          if (returnUrl) {
            localStorage.removeItem('returnUrl');
            this.router.navigateByUrl(returnUrl);
          } else {
            this.router.navigate(['/dashboard']);
          }
        },
            error: (err) => {
                
                // errorhandling !!!To implement !!
            
            console.error('Login error:', err);
            if (err.status === 401) {
                this.error = signal('Ungültige Email oder Passwort.');
            } else if (err.error?.message) {
                this.error = signal(Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message);
            } else {
                this.error = signal('Login fehlgeschlagen. Bitte versuchen Sie es erneut.');
            }
            this.loading.set(false);
            }
        });
        }
    }
        
    isFieldInvalid(fieldName: string): boolean {
        const control = this.loginForm.get(fieldName);
        return !!control && control.invalid && (control.touched || this.submitAttempted);
    }
}