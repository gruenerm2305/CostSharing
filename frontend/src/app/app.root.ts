import { Component, HostListener } from "@angular/core";
import { AuthService, UserRole } from './core/services/auth.service';
import { NavigationEnd, Router, RouterLink, RouterModule} from "@angular/router";
import { filter } from "rxjs";
import { CommonModule } from "@angular/common";
import { LanguagePreference, TranslationService } from './core/i18n/translation.service';
import { TranslatePipe } from './core/i18n/translate.pipe';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterModule, RouterLink, TranslatePipe],
  standalone: true,
  templateUrl: 'sidebar/sidebar.html',
  styleUrl: 'sidebar/sidebar.scss'
})
export class App {
  currentUrl = '';
  isSidebarLanguageMenuOpen = false;

   constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly translationService: TranslationService
  ) {
    this.currentUrl = this.router.url;
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => {
      this.currentUrl = event.urlAfterRedirects;
    });
  }

  languagePreference() {
    return this.translationService.languagePreference();
  }

  onLanguagePreferenceChange(preference: string): void {
    if (!this.isValidLanguagePreference(preference)) {
      return;
    }

    this.isSidebarLanguageMenuOpen = false;
    void this.translationService.setLanguagePreference(preference);
  }

  toggleSidebarLanguageMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isSidebarLanguageMenuOpen = !this.isSidebarLanguageMenuOpen;
  }

  selectedLanguageLabelKey(): string {
    return this.languagePreference() === 'de' ? 'common.languageGerman' : 'common.languageEnglish';
  }

  isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  showNavigation(): boolean {
    if (!this.isLoggedIn()) {
      return false;
    }

    return !this.currentUrl.startsWith('/share/');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
  canAccessAdminPanel(): boolean {
    return this.authService.hasAnyRole([UserRole.ADMIN, UserRole.OWNER]);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.language-dropdown')) {
      this.isSidebarLanguageMenuOpen = false;
    }
  }

  private isValidLanguagePreference(preference: string): preference is LanguagePreference {
    return preference === 'en' || preference === 'de';
  }
}