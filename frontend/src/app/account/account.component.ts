import { Component, ChangeDetectorRef, OnInit } from "@angular/core";
import { AuthService, User, UserRole } from "../core/services/auth.service";
import { TranslatePipe } from "../core/i18n/translate.pipe";
import { UserAdminService } from "../core/services/user-admin.service";
import { Router } from "@angular/router";
import { TranslationService } from "../core/i18n/translation.service";


@Component({
    selector: 'app-account',
    imports: [TranslatePipe],
    templateUrl: './account.html',
    styleUrl: './account.scss'
})
export class AccountComponent implements OnInit {
  currentUser: User | null;
  usernameDraft = '';
  newPassword = '';
  confirmPassword = '';

  usernameSaving = false;
  passwordSaving = false;
  deleteSaving = false;

  usernameErrorKey: string | null = null;
  passwordErrorKey: string | null = null;
  deleteErrorKey: string | null = null;
  usernameSuccessKey: string | null = null;
  passwordSuccessKey: string | null = null;
  canDeleteSelf = false;

  constructor(
    private readonly authService: AuthService,
    private readonly userAdminService: UserAdminService,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
    private readonly translationService: TranslationService
  ) {
    this.currentUser = this.authService.getCurrentUser();
    this.usernameDraft = this.currentUser?.username ?? '';
  }

  ngOnInit(): void {
    this.loadDeletePermission();
  }

  private loadDeletePermission(): void {
    if (!this.currentUser) {
      this.canDeleteSelf = false;
      return;
    }

    this.userAdminService.getMyPermissions().subscribe({
      next: (permissions) => {
        this.canDeleteSelf = permissions.canDeleteSelf;
        this.cdr.detectChanges();
      },
      error: () => {
        this.canDeleteSelf = false;
        this.cdr.detectChanges();
      }
    });
  }

  getDisplayName(user: User): string {
    const parts = [user.firstName, user.lastName].filter(
      (part): part is string => !!part && part.trim().length > 0,
    );

    return parts.length > 0 ? parts.join(' ') : '';
  }

  copyUserId(): void {
    if (this.currentUser?.id) {
      navigator.clipboard.writeText(this.currentUser.id);
    }
  }

  canSaveUsername(): boolean {
    const trimmed = this.usernameDraft.trim();
    return !!this.currentUser && trimmed.length > 0 && trimmed !== this.currentUser.username && !this.usernameSaving;
  }

  canSavePassword(): boolean {
    return (
      !!this.currentUser
      && this.newPassword.length > 0
      && this.confirmPassword.length > 0
      && !this.passwordSaving
    );
  }

  canDeleteOwnAccount(): boolean {
    return !!this.currentUser && this.canDeleteSelf && !this.deleteSaving;
  }

  deleteAccountTooltip(): string | null {
    if (this.currentUser?.role === UserRole.OWNER && !this.canDeleteSelf) {
      return this.translationService.translate('account.delete.ownerDisabledTooltip');
    }

    return null;
  }

  saveUsername(): void {
    if (!this.currentUser) {
      return;
    }

    const trimmedUsername = this.usernameDraft.trim();
    this.usernameErrorKey = null;
    this.usernameSuccessKey = null;

    if (!trimmedUsername) {
      this.usernameErrorKey = 'account.errors.usernameRequired';
      return;
    }

    if (trimmedUsername === this.currentUser.username) {
      this.usernameSuccessKey = 'account.messages.usernameUnchanged';
      return;
    }

    this.usernameSaving = true;
    this.userAdminService.updateUsername(this.currentUser.id, trimmedUsername).subscribe({
      next: () => {
        if (!this.currentUser) {
          return;
        }
        const updatedUser: User = { ...this.currentUser, username: trimmedUsername };
        this.currentUser = updatedUser;
        this.authService.setCurrentUser(updatedUser);
        this.usernameDraft = trimmedUsername;
        this.usernameSuccessKey = 'account.messages.usernameSaved';
        this.usernameSaving = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.usernameErrorKey = 'account.errors.usernameSaveFailed';
        this.usernameSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  savePassword(): void {
    if (!this.currentUser) {
      return;
    }

    this.passwordErrorKey = null;
    this.passwordSuccessKey = null;

    if (!this.newPassword || !this.confirmPassword) {
      this.passwordErrorKey = 'account.errors.passwordRequired';
      return;
    }

    if (this.newPassword.length < 6 || this.confirmPassword.length < 6) {
      this.passwordErrorKey = 'account.errors.passwordTooShort';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.passwordErrorKey = 'account.errors.passwordMismatch';
      return;
    }

    this.passwordSaving = true;
    this.userAdminService.updatePassword(this.currentUser.id, this.newPassword).subscribe({
      next: () => {
        this.newPassword = '';
        this.confirmPassword = '';
        this.passwordSuccessKey = 'account.messages.passwordSaved';
        this.passwordSaving = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.passwordErrorKey = 'account.errors.passwordSaveFailed';
        this.passwordSaving = false;
      }
    });
  }

  deleteOwnAccount(): void {
    if (!this.currentUser || !this.canDeleteSelf || this.deleteSaving) {
      return;
    }

    const shouldDelete = window.confirm(this.translationService.translate('account.delete.confirm'));
    if (!shouldDelete) {
      return;
    }

    this.deleteSaving = true;
    this.deleteErrorKey = null;

    this.userAdminService.deleteUser(this.currentUser.id).subscribe({
      next: () => {
        this.authService.logout();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.deleteErrorKey = 'account.errors.deleteAccountFailed';
        this.deleteSaving = false;
        this.cdr.detectChanges();
      }
    });
  }
}