import { describe, it, expect } from '@jest/globals';
import { UsersService } from '../src/users/users.service';
import { UserRole } from '../src/users/entities/user.entity';

describe('UsersService.getRolePermissions', () => {
  it('returns owner permissions', () => {
    const service = new UsersService({} as any);
    const perms = service.getRolePermissions(UserRole.Owner);

    expect(perms.role).toBe(UserRole.Owner);
    expect(perms.canListUsers).toBe(true);
    expect(perms.deletableRoles).toEqual([UserRole.Admin, UserRole.User]);
  });

  it('returns admin permissions', () => {
    const service = new UsersService({} as any);
    const perms = service.getRolePermissions(UserRole.Admin);

    expect(perms.role).toBe(UserRole.Admin);
    expect(perms.canListUsers).toBe(true);
    expect(perms.deletableRoles).toEqual([UserRole.User]);
  });

  it('returns user permissions', () => {
    const service = new UsersService({} as any);
    const perms = service.getRolePermissions(UserRole.User);

    expect(perms.role).toBe(UserRole.User);
    expect(perms.canListUsers).toBe(false);
    expect(perms.deletableRoles).toEqual([]);
    expect(perms.canDeleteSelf).toBe(true);
  });
});
