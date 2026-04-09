import { ChangeDetectorRef, Component, ElementRef, HostListener, OnInit } from "@angular/core";
import { AuthService, User, UserRole } from "../../core/services/auth.service";
import { UserAdminService } from "../../core/services/user-admin.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { CommonModule } from "@angular/common";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { TranslationService } from "../../core/i18n/translation.service";

@Component({
  selector: 'app-user-management',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './users.html',
  styleUrl: './users.scss'
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  isLoading = false;
  openRoleMenuUserId: string | null = null;
  readonly userRole = UserRole;
  readonly ownerRoleOptions: UserRole[] = [UserRole.USER, UserRole.ADMIN, UserRole.OWNER];
  readonly adminRoleOptions: UserRole[] = [UserRole.ADMIN];

  constructor(
    private readonly userAdminService: UserAdminService,
    private readonly authService: AuthService,
    private readonly snackBar: MatSnackBar,
    private readonly cdr: ChangeDetectorRef,
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userAdminService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open(
          this.translationService.translate('admin.users.errors.loadFailed'),
          this.translationService.translate('common.buttons.close'),
          { duration: 3000 }
        );
      },
    });
  }

  canManageRoles(): boolean {
    return this.authService.hasAnyRole([UserRole.OWNER, UserRole.ADMIN]);
  }

  canEditRole(user: User): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !this.canManageRoles()) {
      return false;
    }

    if (currentUser.role === UserRole.OWNER) {
      return true;
    }

    return user.role === UserRole.USER;
  }

  roleOptionsFor(user: User): UserRole[] {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return [];
    }

    if (currentUser.role === UserRole.OWNER) {
      return this.ownerRoleOptions;
    }

    if (currentUser.role === UserRole.ADMIN && user.role === UserRole.USER) {
      return this.adminRoleOptions;
    }

    return [];
  }

  isRoleMenuOpen(userId: string): boolean {
    return this.openRoleMenuUserId === userId;
  }

  toggleRoleMenu(userId: string): void {
    this.openRoleMenuUserId = this.openRoleMenuUserId === userId ? null : userId;
  }

  closeRoleMenu(): void {
    this.openRoleMenuUserId = null;
  }

  selectRole(user: User, role: UserRole): void {
    this.closeRoleMenu();

    if (!this.canEditRole(user)) {
      return;
    }

    if (user.role === role) {
      return;
    }

    this.userAdminService.updateUserRole(user.id, role).subscribe({
      next: (updatedUser: User) => {
        this.users = this.users.map((candidate) =>
          candidate.id === updatedUser.id ? updatedUser : candidate,
        );
        this.loadUsers();
        this.snackBar.open(
          this.translationService.translate('admin.users.messages.roleUpdated'),
          this.translationService.translate('common.buttons.close'),
          { duration: 1800 }
        );
      },
      error: () => {
        this.snackBar.open(
          this.translationService.translate('admin.users.errors.updateRoleFailed'),
          this.translationService.translate('common.buttons.close'),
          { duration: 2500 }
        );
        this.loadUsers();
      },
    });
  }

  roleLabel(role: UserRole): string {
    switch (role) {
      case UserRole.OWNER:
        return this.translationService.translate('admin.roles.owner');
      case UserRole.ADMIN:
        return this.translationService.translate('admin.roles.admin');
      default:
        return this.translationService.translate('admin.roles.user');
    }
  }

  roleTriggerAriaLabel(displayName: string): string {
    return `${this.translationService.translate('admin.users.aria.changeRoleFor')} ${displayName}`;
  }

  roleTone(role: UserRole): string {
    switch (role) {
      case UserRole.OWNER:
        return 'owner';
      case UserRole.ADMIN:
        return 'admin';
      default:
        return 'user';
    }
  }

  canDelete(user: User): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return false;
    }

    if (currentUser.id === user.id || user.role === UserRole.OWNER) {
      return false;
    }

    return currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.OWNER;
  }

  deleteUser(user: User): void {
    this.userAdminService.deleteUser(user.id).subscribe({
      next: () => {
        this.users = this.users.filter((candidate) => candidate.id !== user.id);
        this.cdr.detectChanges();
        this.snackBar.open(
          this.translationService.translate('admin.users.messages.userDeleted'),
          this.translationService.translate('common.buttons.close'),
          { duration: 1800 }
        );
      },
      error: () => {
        this.snackBar.open(
          this.translationService.translate('admin.users.errors.deleteFailed'),
          this.translationService.translate('common.buttons.close'),
          { duration: 2500 }
        );
      },
    });
  }

  displayName(user: User): string {
    return this.authService.getUserDisplayName(user);
  }

  initials(user: User): string {
    const name = this.displayName(user).trim();
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return name.slice(0, 2).toUpperCase();
  }

  relativeTime(value?: string | Date): string {
    if (!value) {
      return this.translationService.translate('admin.users.time.unknown');
    }

    const date = new Date(value);
    const diffMs = Date.now() - date.getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < hour) {
      const minutes = Math.max(1, Math.floor(diffMs / minute));
      return `${minutes} ${this.translationService.translate('admin.users.time.minAgo')}`;
    }

    if (diffMs < day) {
      const hours = Math.floor(diffMs / hour);
      return `${hours} ${this.translationService.translate('admin.users.time.hoursAgo')}`;
    }

    const days = Math.floor(diffMs / day);
    return `${days} ${this.translationService.translate('admin.users.time.daysAgo')}`;
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;

    if (!target || this.elementRef.nativeElement.contains(target)) {
      return;
    }

    this.closeRoleMenu();
  }
}
