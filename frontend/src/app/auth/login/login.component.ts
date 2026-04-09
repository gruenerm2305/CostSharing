import { Component, HostListener, signal, WritableSignal } from "@angular/core";
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import { AuthService } from "../../core/services/auth.service";
import { Router, RouterLink } from "@angular/router";
import { CommonModule } from "@angular/common";
import { LanguagePreference, TranslationService } from '../../core/i18n/translation.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-login',
    imports: [ReactiveFormsModule, CommonModule, RouterLink, TranslatePipe],
  templateUrl: 'login.html',
  styleUrl: 'login.scss'
})
export class LoginComponent {
    loginForm: FormGroup;
    loading = signal(false);
    error: WritableSignal<string | null> = signal(null);
    submitAttempted = false;
    isLanguageMenuOpen = false;

    constructor(
        private readonly fb: FormBuilder,
        private readonly authService: AuthService,
        private readonly router: Router,
        private readonly translationService: TranslationService
    ) {
        this.loginForm = this.fb.group({
            username: ['',[Validators.required, Validators.maxLength(100)]],
            password: ['',[Validators.required, Validators.minLength(6), Validators.maxLength(100)]]
        });
    }

    languagePreference() {
        return this.translationService.languagePreference();
    }
    onSubmit(): void {
        if (!this.loginForm.valid) {
        this.submitAttempted = true;
        this.loginForm.markAllAsTouched();
        return;
        }
        if(this.loginForm.valid) {
            this.submitAttempted = false;
            this.loading.set(true);
            this.error.set(null);
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
                this.error.set(this.translationService.translate('auth.errors.loginUnauthorized'));
            } else if (err.error?.message) {
                this.error.set(Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message);
            } else {
                this.error.set(this.translationService.translate('auth.errors.loginFailed'));
            }
            this.loading.set(false);
            }
        });
        }
    }

    onLanguagePreferenceChange(preference: string): void {
        if (!this.isValidLanguagePreference(preference)) {
            return;
        }

        this.isLanguageMenuOpen = false;
        this.error.set(null);
        void this.translationService.setLanguagePreference(preference);
    }

    toggleLanguageMenu(event: MouseEvent): void {
        event.stopPropagation();
        this.isLanguageMenuOpen = !this.isLanguageMenuOpen;
    }

    selectedLanguageLabelKey(): string {
        return this.languagePreference() === 'de' ? 'common.languageGerman' : 'common.languageEnglish';
    }
        
    isFieldInvalid(fieldName: string): boolean {
        const control = this.loginForm.get(fieldName);
        return !!control && control.invalid && (control.touched || this.submitAttempted);
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        const target = event.target as HTMLElement | null;
        if (!target?.closest('.language-dropdown')) {
            this.isLanguageMenuOpen = false;
        }
    }

    private isValidLanguagePreference(preference: string): preference is LanguagePreference {
        return preference === 'en' || preference === 'de';
    }
}