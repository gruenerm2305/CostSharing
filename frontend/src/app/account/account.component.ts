import { Component } from "@angular/core";
import { AuthService, User } from "../core/services/auth.service";
import { TranslatePipe } from "../core/i18n/translate.pipe";
import { TranslationService } from "../core/i18n/translation.service";


@Component({
    selector: 'app-account',
    imports: [TranslatePipe],
    templateUrl: './account.html',
    styleUrl: './account.scss'
})
export class AccountComponent {
  currentUser: User | null;

  constructor(
    private readonly authService: AuthService,
    private readonly translationService: TranslationService
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  defaultUserLabel(): string {
    return this.translationService.translate('account.defaultUserName');
  }

  copyUserId(): void {
    if (this.currentUser?.id) {
      navigator.clipboard.writeText(this.currentUser.id);
    }
  }
}