import { Component } from "@angular/core";
import { AuthService } from './core/services/auth.service';
import { NavigationEnd, Router, RouterModule} from "@angular/router";
import { filter } from "rxjs";
import { CommonModule } from "@angular/common";

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterModule],
  standalone: true,
  templateUrl: 'sidebar/sidebar.html',
  styleUrl: 'sidebar/sidebar.scss'
})
export class App {
  currentUrl = '';
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    this.currentUrl = this.router.url;
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => {
      this.currentUrl = event.urlAfterRedirects;
    });
  }
  isLoggedIn(): boolean {
    return false;
  }
  showNavigation(): boolean {
    return this.isLoggedIn() && !this.currentUrl.startsWith('/login');
  }
  logout(): void {
    //this.authService.logout();
    this.router.navigate(['/login']);
  }
}