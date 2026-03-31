import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
    constructor(
        private readonly router: Router
    ) {}
    canActivate(): boolean {
        if(true) {
            return true;
        }
        this.router.navigate(['/login']);
        return false;
    }
}