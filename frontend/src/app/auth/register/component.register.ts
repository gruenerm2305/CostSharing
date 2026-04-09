import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { AuthService } from "../../core/services/auth.service";
import { Router, RouterLink } from "@angular/router";
import { Component, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { LanguagePreference, TranslationService } from '../../core/i18n/translation.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, CommonModule, RouterLink, TranslatePipe],
  templateUrl: 'register.html',
  styleUrl: 'register.scss'
})

export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  submitAttempted = false;
  isLanguageMenuOpen = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly translationService: TranslationService
  ) {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  languagePreference() {
    return this.translationService.languagePreference();
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
          this.successMessage = this.translationService.translate('auth.registerSuccess');
          this.loading = false;
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (err) => {
          console.error('Registration error:', err);
          if (err.status === 409) {
             this.error = this.translationService.translate('auth.errors.registerConflict');
           } else if (err.error?.message) {
             this.error = Array.isArray(err.error.message) ? err.error.message.join(', ') : err.error.message;
          } else {
             this.error = this.translationService.translate('auth.errors.registerFailed');
          }
          this.loading = false;
        }
      });
    }
  }

  onLanguagePreferenceChange(preference: string): void {
    if (!this.isValidLanguagePreference(preference)) {
      return;
    }

    this.isLanguageMenuOpen = false;
    this.error = null;
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
    const control = this.registerForm.get(fieldName);
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
