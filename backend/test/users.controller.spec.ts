import { describe, it, expect, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { UsersController } from '../src/users/users.controller';
import { UserRole } from '../src/users/entities/user.entity';

describe('UsersController deleteUser', () => {
  it('owner can delete admin', async () => {
    const usersService = {
      findById: jest.fn((id: string) => {
        if (id === 'owner') return Promise.resolve({ id, role: UserRole.Owner });
        return Promise.resolve({ id, role: UserRole.Admin });
      }),
      removeById: jest.fn(),
    } as any;

    const controller = new UsersController(usersService);

    await controller.deleteUser({ user: { userId: 'owner' } }, 'admin');

    expect(usersService.removeById).toHaveBeenCalledWith('admin');
  });

  it('admin cannot delete admin', async () => {
    const usersService = {
      findById: jest.fn((id: string) => {
        if (id === 'admin') return Promise.resolve({ id, role: UserRole.Admin });
        return Promise.resolve({ id, role: UserRole.Admin });
      }),
      removeById: jest.fn(),
    } as any;

    const controller = new UsersController(usersService);

    await expect(controller.deleteUser({ user: { userId: 'admin' } }, 'admin2'))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('owner cannot delete another owner', async () => {
    const usersService = {
      findById: jest.fn((id: string) => Promise.resolve({ id, role: UserRole.Owner })),
      removeById: jest.fn(),
    } as any;

    const controller = new UsersController(usersService);

    await expect(controller.deleteUser({ user: { userId: 'owner1' } }, 'owner2'))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('user can delete self', async () => {
    const usersService = {
      findById: jest.fn((id: string) => Promise.resolve({ id, role: UserRole.User })),
      removeById: jest.fn(),
    } as any;

    const controller = new UsersController(usersService);

    await controller.deleteUser({ user: { userId: 'u1' } }, 'u1');

    expect(usersService.removeById).toHaveBeenCalledWith('u1');
  });

  it('user cannot delete other user', async () => {
    const usersService = {
      findById: jest.fn((id: string) => Promise.resolve({ id, role: UserRole.User })),
      removeById: jest.fn(),
    } as any;

    const controller = new UsersController(usersService);

    await expect(controller.deleteUser({ user: { userId: 'u1' } }, 'u2'))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});
