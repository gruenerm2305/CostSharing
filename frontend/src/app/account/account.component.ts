import { Component } from "@angular/core";
import { AuthService, User } from "../core/services/auth.service";


@Component({
    selector: 'app-account',
    templateUrl: './account.html',
    styleUrl: './account.scss'
})
export class AccountComponent {
  currentUser: User | null;

  constructor(private readonly authService: AuthService) {
    this.currentUser = this.authService.getCurrentUser();
  }

  copyUserId(): void {
    if (this.currentUser?.id) {
      navigator.clipboard.writeText(this.currentUser.id);
    }
  }
}