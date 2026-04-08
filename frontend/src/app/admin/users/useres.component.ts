import { ChangeDetectorRef, Component, ElementRef, HostListener, OnInit } from "@angular/core";
import { AuthService, User, UserRole } from "../../core/services/auth.service";
import { UserAdminService } from "../../core/services/user-admin.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { CommonModule } from "@angular/common";

@Component({
  selector: 'app-user-management',
  imports: [CommonModule],
  templateUrl: './users.html',
  styleUrl: './users.scss'
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  isLoading = false;
  openRoleMenuUserId: string | null = null;
  readonly userRole = UserRole;

  constructor(
    private readonly userAdminService: UserAdminService,
    private readonly authService: AuthService,
    private readonly snackBar: MatSnackBar,
    private readonly cdr: ChangeDetectorRef,
    private readonly elementRef: ElementRef<HTMLElement>
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
        this.snackBar.open('Unable to load users', 'Close', { duration: 3000 });
      },
    });
  }

  canManageRoles(): boolean {
    return this.authService.hasRole(UserRole.OWNER);
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

    if (user.role === role) {
      return;
    }

    this.userAdminService.updateUserRole(user.id, role).subscribe({
      next: (updatedUser: User) => {
        this.users = this.users.map((candidate) =>
          candidate.id === updatedUser.id ? updatedUser : candidate,
        );
        this.loadUsers();
        this.snackBar.open('Role updated', 'Close', { duration: 1800 });
      },
      error: () => {
        this.snackBar.open('Could not update role', 'Close', { duration: 2500 });
        this.loadUsers();
      },
    });
  }

  roleLabel(role: UserRole): string {
    return role;
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
        this.snackBar.open('User deleted', 'Close', { duration: 1800 });
      },
      error: () => {
        this.snackBar.open('Could not delete user', 'Close', { duration: 2500 });
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
      return 'Unknown';
    }

    const date = new Date(value);
    const diffMs = Date.now() - date.getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < hour) {
      const minutes = Math.max(1, Math.floor(diffMs / minute));
      return `${minutes} min ago`;
    }

    if (diffMs < day) {
      const hours = Math.floor(diffMs / hour);
      return `${hours} hours ago`;
    }

    const days = Math.floor(diffMs / day);
    return `${days} days ago`;
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
