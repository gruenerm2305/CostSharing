import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService, UserRole } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot): boolean => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const expectedRoles = (route.data['roles'] ?? []) as UserRole[];
  const currentUser = authService.getCurrentUser();

  if (!currentUser) {
    router.navigate(['/login']);
    return false;
  }

  if (expectedRoles.length === 0 || expectedRoles.includes(currentUser.role)) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
